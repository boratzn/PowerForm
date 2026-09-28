import type { Database } from '../types/database';

// profiles/exercises tablolarındaki Postgres enum'larının Türkçe etiketli seçenekleri.
// Birden fazla ekranda (onboarding formu, kütüphane filtresi) kullanıldığı için burada
// tek yerde tutuluyor.

export type Sex = Database['public']['Enums']['sex_type'];
export type Experience = Database['public']['Enums']['experience_level'];
export type Goal = Database['public']['Enums']['goal_type'];
export type Equipment = Database['public']['Enums']['equipment_type'];

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Erkek' },
  { value: 'female', label: 'Kadın' },
  { value: 'other', label: 'Diğer' },
  { value: 'unspecified', label: 'Belirtmek istemiyorum' },
];

export const EXPERIENCE_OPTIONS: { value: Experience; label: string }[] = [
  { value: 'beginner', label: 'Başlangıç' },
  { value: 'intermediate', label: 'Orta' },
  { value: 'advanced', label: 'İleri' },
];

export const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: 'hypertrophy', label: 'Kas kütlesi' },
  { value: 'strength', label: 'Güç' },
  { value: 'fat_loss', label: 'Yağ kaybı' },
  { value: 'recomp', label: 'Recomp (kas + yağ)' },
  { value: 'general_health', label: 'Genel sağlık' },
];

export const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'machine', label: 'Makine' },
  { value: 'cable', label: 'Kablo' },
  { value: 'bodyweight', label: 'Vücut ağırlığı' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'band', label: 'Direnç bandı' },
  { value: 'smith', label: 'Smith machine' },
  { value: 'other', label: 'Diğer' },
];

export const DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
