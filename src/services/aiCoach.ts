import type { WeeklyCoachData } from '../db/coachAnalytics';

export type CheckInAnswers = {
  sleepRecoveryRating: number; // 1 - 5
  jointPainOrFatigue: 'none' | 'mild' | 'severe';
  nutritionAdherence: 'low' | 'medium' | 'high';
  userNotes?: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
};

// Sunucu yoğunluğuna (503/429) ve gecikmelere karşı en hızlı ve yüksek kapasiteli modeller sırası
const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

function getApiKey(): string {
  const key =
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    '';
  return key.trim();
}

async function callGeminiWithFallback(payload: any): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API anahtarı yapılandırılmamış.');
  }

  let lastStatus = 0;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        if (text) return text;
      }

      lastStatus = response.status;
      const errorText = await response.text();
      console.warn(`[aiCoach] ${model} denendi, başarısız (${response.status}):`, errorText);
    } catch (err) {
      console.warn(`[aiCoach] ${model} hatası:`, err);
    }
  }

  if (lastStatus === 503 || lastStatus === 429) {
    throw new Error('Yapay zeka sunucularında anlık yoğunluk var. Lütfen birkaç saniye sonra tekrar deneyin.');
  }

  throw new Error('Yapay zeka servisine ulaşılamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
}

export type WorkoutAction =
  | {
      type: 'create_workout';
      title: string;
      focus?: string;
      exercises: {
        name: string;
        targetSets: number;
        repMin: number;
        repMax: number;
        targetRir?: number;
        restSeconds?: number;
        notes?: string;
      }[];
    }
  | {
      type: 'replace_exercise';
      currentExerciseName: string;
      suggestedExerciseName: string;
      reason?: string;
    };

export function extractWorkoutAction(rawText: string): { cleanContent: string; action: WorkoutAction | null } {
  const match = rawText.match(/```json:workout_action\s*([\s\S]*?)\s*```/);
  if (!match) {
    return { cleanContent: rawText, action: null };
  }
  try {
    const parsed = JSON.parse(match[1]);
    const cleanContent = rawText.replace(match[0], '').trim();
    return { cleanContent, action: parsed as WorkoutAction };
  } catch (err) {
    console.warn('[extractWorkoutAction] JSON parse hatası:', err);
    return { cleanContent: rawText, action: null };
  }
}

export async function generateWeeklyCoachAnalysis(
  weeklyData: WeeklyCoachData,
  checkIn: CheckInAnswers,
  profile?: any
): Promise<string> {
  const systemPrompt = `Sen Powerform uygulamasının baş yapay zeka antrenörü ve spor bilimcisisin.
Görevin: Kullanıcının son haftalık antrenman seanslarını, egzersiz bazlı ağırlık/tekrar/1RM verilerini, vücut ağırlığı trendini ve beslenme durumunu analiz etmek; kullanıcının haftalık check-in yanıtlarıyla birleştirerek derinlemesine, kişiselleştirilmiş, motive edici ve bilimsel bir haftalık analiz raporu sunmak.

Kullanıcı Profili:
- Hedef: ${profile?.primary_goal ?? 'Hipertrofi / Kas Gelişimi'}
- Deneyim Seviyesi: ${profile?.experience ?? 'Orta Seviye'}
- Haftalık Hedef Seans: ${profile?.training_days_target ?? 4} gün

Analiz Kuralları:
1. Türkçe dilinde, profesyonel, samimi, net ve doğrudan konuş.
2. Ağırlığı artan egzersizleri ("progressing") takdir et ve progressive overload başarısını vurgula.
3. Ağırlığı veya tekrarı takılan/sabit kalan hareketleri ("plateau") ve gerileyenleri ("regressing") tek tek ele al:
   - Neden takılmış olabilir? (Toparlanma, yorgunluk, form, biomekanik)
   - Çözüm önerisi: Tekrar aralığını değiştirme (örn. 6-8 yerine 8-10 veya tersi), alternatif varyasyona geçiş (örn. Incline Dumbbell Press yerine Smith Machine Incline veya Cable Press), tempo/duraklatmalı tekrar veya deload.
4. Kullanıcının check-in yanıtlarını (uyku/toparlanma puanı, eklem ağrısı ve beslenme sadakati) doğrudan analize dahil et. Eğer eklem ağrısı varsa o eklemi zorlayan hareket için uyarı ve alternatif ver.
5. Vücut ağırlığı ve beslenme (protein/kalori) trendini hedefe göre değerlendir.
6. Yanıtını aşağıdaki Markdown başlıklarıyla düzenli ve görsel olarak zengin (emoji ve listelerle) sun:
   - 🏆 **Haftalık Özet & Güçlenen Hareketler**
   - 🔍 **Plato Analizi & Egzersiz Değişiklik Reçetesi**
   - ⚖️ **Kilo Trendi & Beslenme Uyumu**
   - 🎯 **Gelecek Hafta İçin Eylem Planı (3 Madde)**
7. ÖNEMLİ EYLEM: Eğer kullanıcının aktif programında değişmesini önerdiğin bir egzersiz varsa, raporunun EN SONUNA kullanıcı tek tıkla onaylasın diye TAM OLARAK şu formatta bir JSON bloğu ekle:
\`\`\`json:workout_action
{
  "type": "replace_exercise",
  "currentExerciseName": "Mevcut Takılan Hareket Adı",
  "suggestedExerciseName": "Önerilen Yeni Hareket Adı",
  "reason": "Omuz eklemini rahatlatmak ve üst göğüste daha iyi mekanik gerilim sağlamak için"
}
\`\`\``;

  const userContext = JSON.stringify(
    {
      weeklyData,
      checkIn: {
        sleepRecovery: `${checkIn.sleepRecoveryRating} / 5`,
        jointPainOrFatigue: checkIn.jointPainOrFatigue,
        nutritionAdherence: checkIn.nutritionAdherence,
        userNotes: checkIn.userNotes || 'Belirtilmedi',
      },
    },
    null,
    2
  );

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${systemPrompt}\n\nİşte kullanıcının bu haftaki gerçek verileri:\n${userContext}` },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  return await callGeminiWithFallback(payload);
}

export async function askCoachQuestion(
  question: string,
  history: ChatMessage[],
  weeklyContext?: WeeklyCoachData,
  profile?: any
): Promise<string> {
  const systemInstructions = `Sen Powerform uygulamasının kişisel yapay zeka fitness ve beslenme koçusun.
Kullanıcı seninle antrenmanları, hareket formları, takıldığı ağırlıklar, beslenme ve toparlanma hakkında sohbet ediyor.
Kullanıcının gerçek antrenman geçmişine, haftalık hacmine, platosuna ve kilosuna hakimsin.
Cevapların daima bilimsel, hipertrofi/kuvvet odaklı, uygulanabilir ve motive edici olsun.
Gereksiz uzunluktan kaçın, maddeler ve net talimatlarla konuş.

ÖZEL EYLEM KURALLARI (ÇOK ÖNEMLİ):
1. EĞER kullanıcı senden spesifik bir antrenman hazırlamanı isterse (örneğin "bana alt karın antrenmanı hazırla", "bana omuz idmanı yaz", "göğüs ve kol antrenmanı oluştur" gibi), antrenmanı güzelce anlatıp açıkladıktan sonra cevabının EN SONUNA kullanıcı tek tıkla şablonlarına kaydedebilsin diye TAM OLARAK şu JSON formatını ekle:
\`\`\`json:workout_action
{
  "type": "create_workout",
  "title": "Antrenman Adı (Örn: Alt Karın & Core Odaklı)",
  "focus": "Alt Karın, Core",
  "exercises": [
    { "name": "Hanging Leg Raise", "targetSets": 3, "repMin": 12, "repMax": 15, "restSeconds": 60, "notes": "Kalçayı yukarı yuvarlayarak kaldır" },
    { "name": "Reverse Crunch", "targetSets": 3, "repMin": 15, "repMax": 20, "restSeconds": 60 }
  ]
}
\`\`\`

2. EĞER bir hareketi değiştirmeyi önerirsen veya kullanıcı "bu hareketin yerine ne yapabilirim" derse:
\`\`\`json:workout_action
{
  "type": "replace_exercise",
  "currentExerciseName": "Mevcut Hareket Adı",
  "suggestedExerciseName": "Önerilen Yeni Hareket Adı",
  "reason": "Değiştirme gerekçesi"
}
\`\`\``;

  const contextSnippet = weeklyContext
    ? `\nKullanıcının Mevcut Durumu:\n- Bu hafta ${weeklyContext.workoutSummary.totalSessions} antrenman yaptı (${weeklyContext.workoutSummary.totalVolumeKg} kg hacim).\n- Takıldığı hareketler: ${weeklyContext.workoutSummary.plateauExercises.map((e) => e.nameTr || e.name).join(', ') || 'Yok'}.\n- Gelişen hareketler: ${weeklyContext.workoutSummary.progressingExercises.map((e) => `${e.nameTr || e.name} (+${e.deltaWeightKg}kg)`).join(', ') || 'Yok'}.\n- Vücut Ağırlığı: ${weeklyContext.weightSummary.currentWeekAvgKg ?? 'Bilinmiyor'} kg (Haftalık değişim: ${weeklyContext.weightSummary.weeklyChangeKg ?? '0'} kg).`
    : '';

  const messagesPayload = [
    {
      role: 'user',
      parts: [{ text: `${systemInstructions}${contextSnippet}\n\nKullanıcı sorusu: ${question}` }],
    },
  ];

  const payload = {
    contents: messagesPayload,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500,
    },
  };

  return await callGeminiWithFallback(payload);
}
