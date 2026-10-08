import { generateUuid } from '../lib/uuid';

export type DetectedFoodItem = {
  id: string;
  foodName: string;
  portionDescription: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type FoodVisionAnalysis = {
  dishTitle: string;
  description: string;
  items: DetectedFoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  confidenceNotes?: string;
};

const VISION_MODELS = [
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
];

function getApiKey(): string {
  const key =
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    '';
  return key.trim();
}

/**
 * Clean up base64 string if it contains data URI header
 */
function cleanBase64(base64Str: string): string {
  if (base64Str.includes('base64,')) {
    return base64Str.split('base64,')[1];
  }
  return base64Str;
}

/**
 * Analyzes a meal photo using Gemini Vision and extracts structured foods & macros
 */
export async function analyzeMealPhoto(
  base64Image: string,
  language: string = 'tr'
): Promise<FoodVisionAnalysis> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API anahtarı yapılandırılmamış.');
  }

  const cleanedData = cleanBase64(base64Image);

  const langPrompt =
    language === 'en'
      ? 'Respond with food names and descriptions in English.'
      : language === 'de'
      ? 'Antworte mit Lebensmittelbezeichnungen und Beschreibungen auf Deutsch.'
      : language === 'es'
      ? 'Responde con nombres de alimentos y descripciones en español.'
      : 'Besin isimlerini ve açıklamaları Türkçe olarak ver.';

  const prompt = `You are a certified sports nutritionist and expert computer vision system for fitness food tracking.
Analyze the provided plate/dish photo in detail.
${langPrompt}

Tasks:
1. Identify all distinct food items or ingredients present on the plate or in the meal (e.g. Grilled Chicken Breast, Jasmine Rice, Olive Oil Salad, Boiled Eggs, Oatmeal with Berries, etc.).
2. Visually estimate the portion size and realistic gram weight (grams) of each item based on typical meal proportions.
3. Calculate realistic nutrition values for each individual item:
   - calories (kcal)
   - protein (grams)
   - carbs (grams)
   - fat (grams)
4. Calculate total calories, total protein, total carbs, and total fat.

Output format requirement:
Respond ONLY with a single JSON object. No explanation text outside the JSON, no Markdown formatting other than optional \`\`\`json\`\`\` code fence.

JSON Schema:
{
  "dishTitle": "Short catchy title of the meal (e.g. Izgara Tavuk ve Basmati Pilav)",
  "description": "Brief 1-sentence description of what is in the dish",
  "items": [
    {
      "foodName": "Food name (e.g. Izgara Tavuk Göğsü)",
      "portionDescription": "Visual portion description (e.g. 1 orta boy göğüs fileto, ~180g)",
      "grams": 180,
      "calories": 297,
      "protein": 55.8,
      "carbs": 0.0,
      "fat": 6.5
    }
  ],
  "totalCalories": 297,
  "totalProtein": 55.8,
  "totalCarbs": 0.0,
  "totalFat": 6.5,
  "confidenceNotes": "Brief confidence estimation (e.g. Yüksek güvenilirlik - porsiyonlar net görünüyor)"
}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanedData,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  let lastStatus = 0;
  let lastError = '';

  for (const model of VISION_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = parseVisionResponse(text);
          if (parsed && parsed.items.length > 0) {
            return parsed;
          }
        }
      }

      lastStatus = response.status;
      lastError = await response.text();
      console.warn(`[foodVision] ${model} başarısız (${response.status}):`, lastError);
    } catch (err: any) {
      console.warn(`[foodVision] ${model} hatası:`, err?.message || err);
    }
  }

  if (lastStatus === 503 || lastStatus === 429) {
    throw new Error('Yapay zeka sunucularında anlık yoğunluk var. Lütfen birkaç saniye sonra tekrar deneyin.');
  }

  throw new Error('Fotoğraf analiz edilemedi. Lütfen tabağın daha net bir fotoğrafını çekmeyi deneyin.');
}

function parseVisionResponse(rawText: string): FoodVisionAnalysis | null {
  try {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const json = JSON.parse(clean);

    const items: DetectedFoodItem[] = Array.isArray(json.items)
      ? json.items.map((it: any) => ({
          id: generateUuid(),
          foodName: String(it.foodName || 'Besin'),
          portionDescription: String(it.portionDescription || `${it.grams || 100}g`),
          grams: Math.round(Number(it.grams) || 100),
          calories: Math.round(Number(it.calories) || 0),
          protein: Number((Number(it.protein) || 0).toFixed(1)),
          carbs: Number((Number(it.carbs) || 0).toFixed(1)),
          fat: Number((Number(it.fat) || 0).toFixed(1)),
        }))
      : [];

    const totalCalories =
      Number(json.totalCalories) ||
      items.reduce((sum, item) => sum + item.calories, 0);

    const totalProtein = Number(
      (
        Number(json.totalProtein) ||
        items.reduce((sum, item) => sum + item.protein, 0)
      ).toFixed(1)
    );

    const totalCarbs = Number(
      (
        Number(json.totalCarbs) ||
        items.reduce((sum, item) => sum + item.carbs, 0)
      ).toFixed(1)
    );

    const totalFat = Number(
      (
        Number(json.totalFat) ||
        items.reduce((sum, item) => sum + item.fat, 0)
      ).toFixed(1)
    );

    return {
      dishTitle: json.dishTitle || 'Tespit Edilen Öğün',
      description: json.description || '',
      items,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      confidenceNotes: json.confidenceNotes,
    };
  } catch (err) {
    console.warn('[foodVision] JSON parse hatası:', err, rawText);
    return null;
  }
}
