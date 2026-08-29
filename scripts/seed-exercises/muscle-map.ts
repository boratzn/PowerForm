import type { EquipmentType, ExperienceLevel, MuscleGroupId } from './types';

// supabase/migrations/004_exercises.sql'deki muscle_groups tablosunun seed verisi.
// §5.3'teki search_exercises.primary_muscle enum sırasıyla birebir (display_order da ona göre).
export const MUSCLE_GROUPS_SEED: {
  id: MuscleGroupId;
  name_tr: string;
  name_en: string;
  region: 'upper_body' | 'lower_body' | 'core';
  display_order: number;
}[] = [
  { id: 'chest', name_tr: 'Göğüs', name_en: 'Chest', region: 'upper_body', display_order: 10 },
  { id: 'front_delt', name_tr: 'Ön Omuz', name_en: 'Front Delt', region: 'upper_body', display_order: 20 },
  { id: 'side_delt', name_tr: 'Yan Omuz', name_en: 'Side Delt', region: 'upper_body', display_order: 30 },
  { id: 'rear_delt', name_tr: 'Arka Omuz', name_en: 'Rear Delt', region: 'upper_body', display_order: 40 },
  { id: 'lats', name_tr: 'Kanat (Lat)', name_en: 'Lats', region: 'upper_body', display_order: 50 },
  { id: 'upper_back', name_tr: 'Üst Sırt', name_en: 'Upper Back', region: 'upper_body', display_order: 60 },
  { id: 'traps', name_tr: 'Trapez', name_en: 'Traps', region: 'upper_body', display_order: 70 },
  { id: 'biceps', name_tr: 'Biceps', name_en: 'Biceps', region: 'upper_body', display_order: 80 },
  { id: 'triceps', name_tr: 'Triceps', name_en: 'Triceps', region: 'upper_body', display_order: 90 },
  { id: 'forearms', name_tr: 'Ön Kol', name_en: 'Forearms', region: 'upper_body', display_order: 100 },
  { id: 'quads', name_tr: 'Ön Bacak (Quadriceps)', name_en: 'Quads', region: 'lower_body', display_order: 110 },
  { id: 'hamstrings', name_tr: 'Arka Bacak (Hamstring)', name_en: 'Hamstrings', region: 'lower_body', display_order: 120 },
  { id: 'glutes', name_tr: 'Kalça', name_en: 'Glutes', region: 'lower_body', display_order: 130 },
  { id: 'calves', name_tr: 'Baldır', name_en: 'Calves', region: 'lower_body', display_order: 140 },
  { id: 'abs', name_tr: 'Karın', name_en: 'Abs', region: 'core', display_order: 150 },
  { id: 'lower_back', name_tr: 'Bel (Alt Sırt)', name_en: 'Lower Back', region: 'core', display_order: 160 },
];

// free-exercise-db kas ismi -> bizim muscle_group id'si. Doğrudan/yakın eşleşenler.
// 'middle back' bizde ayrı bir grup değil; en yakını upper_back (yaklaşık eşleşme, raporlanır).
export const DIRECT_MUSCLE_MAP: Record<string, MuscleGroupId> = {
  abdominals: 'abs',
  biceps: 'biceps',
  calves: 'calves',
  chest: 'chest',
  forearms: 'forearms',
  glutes: 'glutes',
  hamstrings: 'hamstrings',
  lats: 'lats',
  'lower back': 'lower_back',
  'middle back': 'upper_back',
  quadriceps: 'quads',
  traps: 'traps',
  triceps: 'triceps',
};

// muscle_groups'ta karşılığı olmayan kaynak kas isimleri. Sessizce atlanmaz —
// index.ts bunları rapora yazar; bağlantı kurulmaz ama egzersizin kendisi yine de seed edilir.
export const UNMAPPED_MUSCLES = new Set(['abductors', 'adductors', 'neck']);

// free-exercise-db 'shoulders' der ama bizim şemamız ön/yan/arka omuzu ayırıyor
// (hipertrofi hacim takibinin can alıcı noktası — spec §1.2). Kaynakta bu ayrım yok,
// bu yüzden egzersiz adındaki anahtar kelimelerden çıkarım yapılıyor. Varsayılan
// side_delt'tir (belirtilmemiş "shoulder" izolasyon hareketlerinde en yaygın odak) —
// index.ts hangi egzersizlerin varsayılana düştüğünü raporlar, elle gözden geçirilmeli.
export function classifyShoulderRegion(exerciseName: string): {
  muscleGroupId: Extract<MuscleGroupId, 'front_delt' | 'side_delt' | 'rear_delt'>;
  matchedKeyword: boolean;
} {
  const n = exerciseName.toLowerCase();
  // Sıra önemli: daha spesifik kalıplar önce kontrol edilir (ör. "upright row" genel
  // "row" kuralına düşmeden önce side_delt'e yakalanmalı).
  if (/\bupright row\b/.test(n)) {
    return { muscleGroupId: 'side_delt', matchedKeyword: true };
  }
  if (/\b(rear|reverse|face pull|posterior|row|pull apart)\b/.test(n)) {
    return { muscleGroupId: 'rear_delt', matchedKeyword: true };
  }
  if (/\b(lateral|side raise)\b/.test(n)) {
    return { muscleGroupId: 'side_delt', matchedKeyword: true };
  }
  if (/\b(overhead|military|front raise|arnold|press|push|jerk|clean)\b/.test(n)) {
    // "press"/"push" geniş bir kural — bench/chest press gibi hareketlerde "shoulders"
    // genelde ikincil kastır ve o ikincil uyarım anterior delt'tir, bu yüzden makul.
    return { muscleGroupId: 'front_delt', matchedKeyword: true };
  }
  return { muscleGroupId: 'side_delt', matchedKeyword: false };
}

export const EQUIPMENT_MAP: Record<string, EquipmentType> = {
  bands: 'band',
  barbell: 'barbell',
  'body only': 'bodyweight',
  cable: 'cable',
  dumbbell: 'dumbbell',
  'e-z curl bar': 'other', // enum'da EZ bar karşılığı yok — yaklaşık eşleşme, raporlanır
  'exercise ball': 'other',
  'foam roll': 'other',
  kettlebells: 'kettlebell',
  machine: 'machine',
  'medicine ball': 'other',
  other: 'other',
};
export const EQUIPMENT_FALLBACK: EquipmentType = 'other'; // equipment NOT NULL, null gelirse

export const LEVEL_MAP: Record<RawLevel, ExperienceLevel> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  expert: 'advanced',
};
type RawLevel = 'beginner' | 'intermediate' | 'expert';

const UNILATERAL_RE = /\b(one[- ]arm|one[- ]leg|single[- ]arm|single[- ]leg|alternating|unilateral)\b/i;
export function inferUnilateral(name: string): boolean {
  return UNILATERAL_RE.test(name);
}

export function inferTrackingType(category: string, force: string | null): 'time' | 'weight_reps' {
  if (category === 'stretching' || category === 'cardio') return 'time';
  if (force === 'static') return 'time';
  return 'weight_reps';
}
