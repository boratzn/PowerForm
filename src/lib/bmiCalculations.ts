/**
 * Bilimsel BMI, Yaş & Cinsiyet Düzeltmeli Vücut Kompozisyonu Hesaplayıcı
 */

export type Sex = 'male' | 'female' | 'other' | 'unspecified';

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export type BmiAnalysis = {
  bmi: number;
  category: BmiCategory;
  categoryLabel: string;
  categoryColor: string;
  gaugePositionPct: number; // 0 - 100 (15 - 35 BMI sklasında)
  estimatedBodyFatPct: number; // Deurenberg formülü
  healthyBmiRange: [number, number];
  healthyWeightRange: [number, number];
  weightDeltaToHealthyKg: number; // 0 if inside healthy range
  age: number;
  sex: Sex;
  summaryText: string;
};

/**
 * Yaşa göre optimal sağlık BMI aralığını belirler (WHO & NRC kılavuzları)
 */
export function getAgeAdjustedHealthyBmiRange(age: number): [number, number] {
  if (age < 25) return [18.5, 24.9];
  if (age < 35) return [20.0, 25.0];
  if (age < 45) return [21.0, 26.0];
  if (age < 55) return [22.0, 27.0];
  if (age < 65) return [23.0, 28.0];
  return [24.0, 29.0];
}

/**
 * Kilo, boy, yaş ve cinsiyete göre kapsamlı modern BMI analizi yapar
 */
export function calculateModernBmi(params: {
  weightKg: number;
  heightCm: number;
  age?: number;
  sex?: Sex;
  lang?: string;
}): BmiAnalysis {
  const { weightKg, heightCm } = params;
  const age = Math.max(14, Math.min(100, params.age ?? 26));
  const sex = params.sex ?? 'male';
  const isFemale = sex === 'female';

  const safeHeightM = Math.max(0.8, heightCm / 100);
  const rawBmi = weightKg / (safeHeightM * safeHeightM);
  const bmi = Number(rawBmi.toFixed(1));

  // Yaşa göre dinamik ideal BMI aralığı
  const healthyBmiRange = getAgeAdjustedHealthyBmiRange(age);
  const [minBmi, maxBmi] = healthyBmiRange;

  // Deurenberg Formülü ile Tahmini Vücut Yağ Oranı (%)
  // Body Fat % = 1.20 * BMI + 0.23 * Age - 10.8 * sexFactor - 5.4 (sexFactor: 1 for male, 0 for female)
  const sexFactor = isFemale ? 0 : 1;
  const rawBodyFat = 1.2 * bmi + 0.23 * age - 10.8 * sexFactor - 5.4;
  const estimatedBodyFatPct = Number(Math.max(5, Math.min(55, rawBodyFat)).toFixed(1));

  // İdeal kilo aralığı (kg)
  const minHealthyWeight = Number((minBmi * safeHeightM * safeHeightM).toFixed(1));
  const maxHealthyWeight = Number((maxBmi * safeHeightM * safeHeightM).toFixed(1));

  const l = (params.lang || 'tr').toLowerCase();

  let category: BmiCategory = 'normal';
  let categoryColor = '#10B981'; // Emerald

  if (bmi < 18.5) {
    category = 'underweight';
    categoryColor = '#38BDF8';
  } else if (bmi <= maxBmi) {
    category = 'normal';
    categoryColor = '#10B981';
  } else if (bmi < 30.0) {
    category = 'overweight';
    categoryColor = '#F59E0B';
  } else {
    category = 'obese';
    categoryColor = '#EF4444';
  }

  const categoryLabels: Record<string, Record<BmiCategory, string>> = {
    tr: {
      underweight: 'Zayıf',
      normal: 'İdeal / Sağlıklı Aralık',
      overweight: 'Fazla Kilolu',
      obese: 'Yüksek BMI (Obezite)',
    },
    en: {
      underweight: 'Underweight',
      normal: 'Normal / Healthy Range',
      overweight: 'Overweight',
      obese: 'High BMI (Obesity)',
    },
    de: {
      underweight: 'Untergewicht',
      normal: 'Normalgewicht / Gesund',
      overweight: 'Übergewicht',
      obese: 'Hoher BMI (Adipositas)',
    },
    es: {
      underweight: 'Bajo peso',
      normal: 'Normal / Rango saludable',
      overweight: 'Sobrepeso',
      obese: 'IMC alto (Obesidad)',
    },
  };

  const currentDict = categoryLabels[l] || categoryLabels.en;
  const categoryLabel = currentDict[category];

  // 15 - 35 BMI aralığında gösterge yüzdesi
  const gaugePositionPct = Math.max(0, Math.min(100, ((bmi - 15) / (35 - 15)) * 100));

  // İdeal aralığa mesafe (kg)
  let weightDeltaToHealthyKg = 0;
  if (weightKg < minHealthyWeight) {
    weightDeltaToHealthyKg = Number((weightKg - minHealthyWeight).toFixed(1));
  } else if (weightKg > maxHealthyWeight) {
    weightDeltaToHealthyKg = Number((weightKg - maxHealthyWeight).toFixed(1));
  }

  const sexLabels: Record<string, { female: string; male: string }> = {
    tr: { female: 'Kadın', male: 'Erkek' },
    en: { female: 'Female', male: 'Male' },
    de: { female: 'Frau', male: 'Mann' },
    es: { female: 'Mujer', male: 'Hombre' },
  };
  const sLabel = (sexLabels[l] || sexLabels.en)[isFemale ? 'female' : 'male'];

  let summaryText = '';
  if (weightDeltaToHealthyKg > 0) {
    if (l === 'tr') summaryText = `İdeal aralık üst sınırına ulaşmak için: -${weightDeltaToHealthyKg} kg`;
    else if (l === 'de') summaryText = `Um die obere gesunde Grenze zu erreichen: -${weightDeltaToHealthyKg} kg`;
    else if (l === 'es') summaryText = `Para alcanzar el límite superior saludable: -${weightDeltaToHealthyKg} kg`;
    else summaryText = `To reach the healthy upper threshold: -${weightDeltaToHealthyKg} kg`;
  } else if (weightDeltaToHealthyKg < 0) {
    const absD = Math.abs(weightDeltaToHealthyKg);
    if (l === 'tr') summaryText = `İdeal aralık alt sınırına ulaşmak için: +${absD} kg`;
    else if (l === 'de') summaryText = `Um die untere gesunde Grenze zu erreichen: +${absD} kg`;
    else if (l === 'es') summaryText = `Para alcanzar el límite inferior saludable: +${absD} kg`;
    else summaryText = `To reach the healthy lower threshold: +${absD} kg`;
  } else {
    if (l === 'tr') summaryText = `${age} Yaş ${sLabel} için ideal aralıktasınız.`;
    else if (l === 'de') summaryText = `Du liegst im gesunden Bereich für ${age} Jahre (${sLabel}).`;
    else if (l === 'es') summaryText = `Estás en el rango saludable para ${sLabel} de ${age} años.`;
    else summaryText = `You are in the healthy range for ${age} y/o ${sLabel}.`;
  }

  return {
    bmi,
    category,
    categoryLabel,
    categoryColor,
    gaugePositionPct,
    estimatedBodyFatPct,
    healthyBmiRange,
    healthyWeightRange: [minHealthyWeight, maxHealthyWeight],
    weightDeltaToHealthyKg,
    age,
    sex,
    summaryText,
  };
}
