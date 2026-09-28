export type ProfileForTdee = {
  weightKg: number;
  heightCm: number;
  birthYear: number;
  sex: 'male' | 'female' | 'other' | 'unspecified';
  trainingDaysTarget?: number | null;
  goal?: 'hypertrophy' | 'strength' | 'fat_loss' | 'recomp' | 'general_health' | null;
};

export type MacroTarget = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  tdeeEstimate: number;
};

export function calculateTdeeAndMacros(profile: ProfileForTdee): MacroTarget {
  const currentYear = new Date().getFullYear();
  const age = Math.max(16, Math.min(90, currentYear - (profile.birthYear || 1995)));
  const weight = Math.max(30, Math.min(250, profile.weightKg || 75));
  const height = Math.max(120, Math.min(230, profile.heightCm || 175));

  // 1. Mifflin-St Jeor BMR
  let bmr: number;
  if (profile.sex === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    // male veya other için standart erkek formülü
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  }

  // 2. Aktivite Çarpanı
  const days = profile.trainingDaysTarget || 4;
  let activityMultiplier = 1.45;
  if (days <= 2) activityMultiplier = 1.35;
  else if (days <= 4) activityMultiplier = 1.5;
  else if (days <= 6) activityMultiplier = 1.65;
  else activityMultiplier = 1.75;

  const tdee = Math.round(bmr * activityMultiplier);

  // 3. Hedefe göre kalori
  let targetKcal = tdee;
  const goal = profile.goal || 'hypertrophy';
  if (goal === 'hypertrophy') {
    targetKcal = tdee + 300; // hafif kalori fazlası
  } else if (goal === 'strength') {
    targetKcal = tdee + 150;
  } else if (goal === 'fat_loss') {
    targetKcal = tdee - 400; // kontrollü açık
  }

  // Güvenlik tabanı (Spec §13.4 yeme bozukluğu koruması)
  const minKcal = profile.sex === 'female' ? 1300 : 1600;
  targetKcal = Math.max(minKcal, targetKcal);

  // 4. Makro Dağılımı (Bilimsel fitness oranları)
  // Protein: 2.0g / kg vücut ağırlığı
  const proteinG = Math.round(weight * 2.0);
  const proteinKcal = proteinG * 4;

  // Yağ: 0.9g / kg (hormon sağlığı için elzem)
  const fatG = Math.round(weight * 0.9);
  const fatKcal = fatG * 9;

  // Karbonhidrat: Kalan kaloriler
  const remainingKcal = Math.max(200, targetKcal - (proteinKcal + fatKcal));
  const carbsG = Math.round(remainingKcal / 4);

  return {
    kcal: targetKcal,
    proteinG,
    carbsG,
    fatG,
    tdeeEstimate: tdee,
  };
}
