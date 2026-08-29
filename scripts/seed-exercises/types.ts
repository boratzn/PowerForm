// free-exercise-db (yuhonas/free-exercise-db) ham kayıt şekli.
// Kaynak: dist/exercises.json — 2026-08-29'da doğrulandı, 876 kayıt.
export type RawExercise = {
  name: string;
  force: 'push' | 'pull' | 'static' | null;
  level: 'beginner' | 'intermediate' | 'expert';
  mechanic: 'compound' | 'isolation' | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
  id: string;
};

export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'smith'
  | 'other';

export type MechanicType = 'compound' | 'isolation';
export type ForceType = 'push' | 'pull' | 'static';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type TrackingType = 'weight_reps' | 'reps_only' | 'time' | 'distance' | 'weighted_bodyweight';

// FITNESS_APP_SPEC.md §5.3 search_exercises.primary_muscle enum'uyla birebir —
// muscle_groups tablosunun id kümesi budur, script bunun dışına çıkmaz.
export const MUSCLE_GROUP_IDS = [
  'chest',
  'front_delt',
  'side_delt',
  'rear_delt',
  'lats',
  'upper_back',
  'traps',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'lower_back',
] as const;
export type MuscleGroupId = (typeof MUSCLE_GROUP_IDS)[number];

// exercises tablosuna 1:1 karşılık gelir (üretilen search_vector hariç).
export type TransformedExercise = {
  slug: string;
  name_en: string;
  name_tr: string | null; // §15 Paket 2 kuralı: isimler İngilizce kalır, çevrilmez
  equipment: EquipmentType;
  mechanic: MechanicType | null;
  force: ForceType | null;
  is_unilateral: boolean;
  difficulty: ExperienceLevel;
  instructions_en: string[];
  instructions_tr: string[] | null; // translate.ts doldurur
  cues_tr: string[] | null; // translate.ts doldurur
  common_mistakes_tr: string[] | null; // translate.ts doldurur
  tracking_type: TrackingType;
  is_custom: false;
  source: 'free-exercise-db';
};

export type MuscleLink = {
  exercise_slug: string;
  muscle_group_id: MuscleGroupId;
  role: 'primary' | 'secondary';
  volume_factor: number;
};

export type MediaItem = {
  exercise_slug: string;
  media_type: 'image';
  url: string;
  display_order: number;
  attribution: string;
};

export type MappingReport = {
  totalSource: number;
  totalTransformed: number;
  nullEquipmentCount: number;
  approximateEquipmentMappings: Record<string, number>; // 'e-z curl bar' -> 12 kez 'other'a yaklaşık eşlendi
  unmappedMuscles: Record<string, string[]>; // 'abductors' -> [exercise slug'ları]
  approximateMuscleMappings: Record<string, string[]>; // 'middle back' -> upper_back'e yaklaşık eşlenenler
  shoulderClassification: {
    matched: Record<string, string[]>; // 'front_delt' -> keyword ile eşleşen slug'lar
    fallbackDefault: string[]; // hiçbir anahtar kelime eşleşmedi, side_delt varsayıldı
  };
  emptyInstructionsSlugs: string[];
};
