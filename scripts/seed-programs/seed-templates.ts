import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

type RawTemplateExercise = {
  slug: string;
  order_index: number;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  target_rir: number;
  rest_seconds: number;
  notes?: string;
};

type RawTemplateDay = {
  day_index: number;
  name: string;
  focus?: string;
  notes?: string;
  exercises: RawTemplateExercise[];
};

type RawTemplateProgram = {
  name: string;
  description: string;
  goal: 'hypertrophy' | 'strength' | 'fat_loss' | 'recomp' | 'general_health';
  days_per_week: number;
  duration_weeks: number;
  days: RawTemplateDay[];
};

export const TEMPLATES: RawTemplateProgram[] = [
  {
    name: 'Üst Vücut Öncelikli — 5 Gün',
    description: 'Omuz, kol ve üst sırt hacmine öncelik veren orta seviye hipertrofi programı. Bacak koruma hacminde çalışır.',
    goal: 'hypertrophy',
    days_per_week: 5,
    duration_weeks: 8,
    days: [
      {
        day_index: 1,
        name: '1. Gün — İtiş',
        focus: 'Omuz + Göğüs + Triceps',
        exercises: [
          { slug: 'barbell-seated-overhead-press', order_index: 1, target_sets: 4, rep_min: 6, rep_max: 10, target_rir: 2, rest_seconds: 150 },
          { slug: 'barbell-incline-bench-press', order_index: 2, target_sets: 3, rep_min: 6, rep_max: 10, target_rir: 2, rest_seconds: 150 },
          { slug: 'barbell-bench-press', order_index: 3, target_sets: 3, rep_min: 8, rep_max: 12, target_rir: 1, rest_seconds: 120 },
          { slug: 'cable-lateral-raise', order_index: 4, target_sets: 4, rep_min: 12, rep_max: 20, target_rir: 1, rest_seconds: 60 },
          { slug: 'cable-pushdown-with-rope-attachment', order_index: 5, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 1, rest_seconds: 75 },
        ],
      },
      {
        day_index: 2,
        name: '2. Gün — Çekiş',
        focus: 'Sırt Kalınlığı + Arka Omuz + Biceps',
        exercises: [
          { slug: 'pull-up', order_index: 1, target_sets: 4, rep_min: 6, rep_max: 10, target_rir: 2, rest_seconds: 150 },
          { slug: 'barbell-bent-over-row', order_index: 2, target_sets: 3, rep_min: 8, rep_max: 12, target_rir: 2, rest_seconds: 150 },
          { slug: 'cable-standing-rear-delt-row-with-rope', order_index: 3, target_sets: 4, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
          { slug: 'barbell-biceps-curl-with-arm-blaster', order_index: 4, target_sets: 3, rep_min: 8, rep_max: 12, target_rir: 1, rest_seconds: 75 },
        ],
      },
      {
        day_index: 3,
        name: '3. Gün — Bacak + Karın',
        focus: 'Alt Vücut & Merkez Bölge',
        exercises: [
          { slug: 'barbell-full-squat', order_index: 1, target_sets: 3, rep_min: 5, rep_max: 8, target_rir: 2, rest_seconds: 180 },
          { slug: 'barbell-romanian-deadlift', order_index: 2, target_sets: 3, rep_min: 8, rep_max: 10, target_rir: 2, rest_seconds: 150 },
          { slug: 'lever-alternate-leg-press', order_index: 3, target_sets: 3, rep_min: 10, rep_max: 15, target_rir: 1, rest_seconds: 120 },
          { slug: 'lever-standing-calf-raise', order_index: 4, target_sets: 4, rep_min: 10, rep_max: 15, target_rir: 1, rest_seconds: 60 },
          { slug: '3-4-sit-up', order_index: 5, target_sets: 3, rep_min: 12, rep_max: 20, target_rir: 1, rest_seconds: 60 },
        ],
      },
      {
        day_index: 4,
        name: '4. Gün — Üst Sırt + Omuz',
        focus: 'Hipertrofi Öncelik Günü',
        exercises: [
          { slug: 'dumbbell-standing-overhead-press', order_index: 1, target_sets: 4, rep_min: 8, rep_max: 12, target_rir: 2, rest_seconds: 120 },
          { slug: 'dumbbell-shrug', order_index: 2, target_sets: 4, rep_min: 10, rep_max: 15, target_rir: 1, rest_seconds: 75 },
          { slug: 'cable-one-arm-lateral-raise', order_index: 3, target_sets: 4, rep_min: 12, rep_max: 15, target_rir: 0, rest_seconds: 60 },
        ],
      },
      {
        day_index: 5,
        name: '5. Gün — Göğüs + Kol',
        focus: 'Göğüs + Biceps + Triceps',
        exercises: [
          { slug: 'dumbbell-bench-press', order_index: 1, target_sets: 4, rep_min: 8, rep_max: 12, target_rir: 2, rest_seconds: 120 },
          { slug: 'barbell-close-grip-bench-press', order_index: 2, target_sets: 3, rep_min: 8, rep_max: 10, target_rir: 1, rest_seconds: 90 },
          { slug: 'ez-barbell-spider-curl', order_index: 3, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 1, rest_seconds: 75 },
          { slug: 'barbell-lying-triceps-extension-skull-crusher', order_index: 4, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 1, rest_seconds: 75 },
        ],
      },
    ],
  },
  {
    name: 'Push / Pull / Legs (PPL) — 6 Gün',
    description: 'Klasik ve en popüler hipertrofi spliti. Haftada iki kez her kas grubunu uyararak maksimum kas kazanımı hedefler.',
    goal: 'hypertrophy',
    days_per_week: 6,
    duration_weeks: 12,
    days: [
      {
        day_index: 1,
        name: '1. Gün — İtiş A',
        focus: 'Göğüs Ağırlıklı',
        exercises: [
          { slug: 'barbell-bench-press', order_index: 1, target_sets: 4, rep_min: 6, rep_max: 8, target_rir: 2, rest_seconds: 180 },
          { slug: 'barbell-incline-bench-press', order_index: 2, target_sets: 3, rep_min: 8, rep_max: 10, target_rir: 2, rest_seconds: 120 },
          { slug: 'dumbbell-standing-overhead-press', order_index: 3, target_sets: 3, rep_min: 8, rep_max: 12, target_rir: 2, rest_seconds: 120 },
          { slug: 'cable-lateral-raise', order_index: 4, target_sets: 4, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
          { slug: 'cable-pushdown-with-rope-attachment', order_index: 5, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 1, rest_seconds: 60 },
        ],
      },
      {
        day_index: 2,
        name: '2. Gün — Çekiş A',
        focus: 'Sırt Kalınlığı & Biceps',
        exercises: [
          { slug: 'barbell-deadlift', order_index: 1, target_sets: 3, rep_min: 5, rep_max: 5, target_rir: 2, rest_seconds: 240 },
          { slug: 'pull-up', order_index: 2, target_sets: 4, rep_min: 6, rep_max: 10, target_rir: 2, rest_seconds: 150 },
          { slug: 'barbell-bent-over-row', order_index: 3, target_sets: 3, rep_min: 8, rep_max: 10, target_rir: 2, rest_seconds: 120 },
          { slug: 'cable-standing-rear-delt-row-with-rope', order_index: 4, target_sets: 4, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
          { slug: 'barbell-biceps-curl-with-arm-blaster', order_index: 5, target_sets: 3, rep_min: 8, rep_max: 12, target_rir: 1, rest_seconds: 75 },
        ],
      },
      {
        day_index: 3,
        name: '3. Gün — Bacak A',
        focus: 'Quad (Ön Bacak) Odaklı',
        exercises: [
          { slug: 'barbell-full-squat', order_index: 1, target_sets: 4, rep_min: 6, rep_max: 8, target_rir: 2, rest_seconds: 180 },
          { slug: 'lever-alternate-leg-press', order_index: 2, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 2, rest_seconds: 120 },
          { slug: 'lever-standing-calf-raise', order_index: 3, target_sets: 4, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
          { slug: '3-4-sit-up', order_index: 4, target_sets: 3, rep_min: 15, rep_max: 20, target_rir: 1, rest_seconds: 60 },
        ],
      },
      {
        day_index: 4,
        name: '4. Gün — İtiş B',
        focus: 'Omuz & Üst Göğüs Odaklı',
        exercises: [
          { slug: 'barbell-seated-overhead-press', order_index: 1, target_sets: 4, rep_min: 6, rep_max: 8, target_rir: 2, rest_seconds: 180 },
          { slug: 'dumbbell-bench-press', order_index: 2, target_sets: 3, rep_min: 8, rep_max: 12, target_rir: 2, rest_seconds: 120 },
          { slug: 'cable-one-arm-lateral-raise', order_index: 3, target_sets: 4, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
          { slug: 'barbell-lying-triceps-extension-skull-crusher', order_index: 4, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 1, rest_seconds: 75 },
        ],
      },
      {
        day_index: 5,
        name: '5. Gün — Çekiş B',
        focus: 'Lat Genişliği & Biceps',
        exercises: [
          { slug: 'pull-up', order_index: 1, target_sets: 4, rep_min: 8, rep_max: 12, target_rir: 2, rest_seconds: 150 },
          { slug: 'dumbbell-shrug', order_index: 2, target_sets: 3, rep_min: 10, rep_max: 15, target_rir: 1, rest_seconds: 90 },
          { slug: 'ez-barbell-spider-curl', order_index: 3, target_sets: 3, rep_min: 8, rep_max: 12, target_rir: 1, rest_seconds: 75 },
        ],
      },
      {
        day_index: 6,
        name: '6. Gün — Bacak B',
        focus: 'Hamstring & Glute Odaklı',
        exercises: [
          { slug: 'barbell-romanian-deadlift', order_index: 1, target_sets: 4, rep_min: 8, rep_max: 10, target_rir: 2, rest_seconds: 150 },
          { slug: 'lever-alternate-leg-press', order_index: 2, target_sets: 3, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 90 },
          { slug: 'lever-standing-calf-raise', order_index: 3, target_sets: 4, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
        ],
      },
    ],
  },
  {
    name: 'Upper / Lower — 4 Gün',
    description: 'Haftada 4 gün çalışanlar için altın standart. İyileşme süresi ile antrenman sıklığını mükemmel dengeler.',
    goal: 'hypertrophy',
    days_per_week: 4,
    duration_weeks: 8,
    days: [
      {
        day_index: 1,
        name: '1. Gün — Üst Vücut A',
        focus: 'Güç & Bileşik Hareketler',
        exercises: [
          { slug: 'barbell-bench-press', order_index: 1, target_sets: 4, rep_min: 5, rep_max: 8, target_rir: 2, rest_seconds: 180 },
          { slug: 'pull-up', order_index: 2, target_sets: 4, rep_min: 6, rep_max: 8, target_rir: 2, rest_seconds: 150 },
          { slug: 'barbell-seated-overhead-press', order_index: 3, target_sets: 3, rep_min: 6, rep_max: 8, target_rir: 2, rest_seconds: 150 },
          { slug: 'barbell-biceps-curl-with-arm-blaster', order_index: 4, target_sets: 3, rep_min: 8, rep_max: 10, target_rir: 1, rest_seconds: 90 },
          { slug: 'cable-pushdown-with-rope-attachment', order_index: 5, target_sets: 3, rep_min: 8, rep_max: 10, target_rir: 1, rest_seconds: 90 },
        ],
      },
      {
        day_index: 2,
        name: '2. Gün — Alt Vücut A',
        focus: 'Squat & Quad Odaklı',
        exercises: [
          { slug: 'barbell-full-squat', order_index: 1, target_sets: 4, rep_min: 5, rep_max: 8, target_rir: 2, rest_seconds: 180 },
          { slug: 'barbell-romanian-deadlift', order_index: 2, target_sets: 3, rep_min: 8, rep_max: 10, target_rir: 2, rest_seconds: 150 },
          { slug: 'lever-alternate-leg-press', order_index: 3, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 2, rest_seconds: 120 },
          { slug: 'lever-standing-calf-raise', order_index: 4, target_sets: 4, rep_min: 10, rep_max: 15, target_rir: 1, rest_seconds: 60 },
        ],
      },
      {
        day_index: 3,
        name: '3. Gün — Üst Vücut B',
        focus: 'Hipertrofi & Hacim',
        exercises: [
          { slug: 'barbell-incline-bench-press', order_index: 1, target_sets: 4, rep_min: 8, rep_max: 12, target_rir: 2, rest_seconds: 120 },
          { slug: 'barbell-bent-over-row', order_index: 2, target_sets: 4, rep_min: 8, rep_max: 12, target_rir: 2, rest_seconds: 120 },
          { slug: 'cable-lateral-raise', order_index: 3, target_sets: 4, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
          { slug: 'ez-barbell-spider-curl', order_index: 4, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 1, rest_seconds: 60 },
          { slug: 'barbell-lying-triceps-extension-skull-crusher', order_index: 5, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 1, rest_seconds: 60 },
        ],
      },
      {
        day_index: 4,
        name: '4. Gün — Alt Vücut B',
        focus: 'Deadlift & Hamstring Odaklı',
        exercises: [
          { slug: 'barbell-deadlift', order_index: 1, target_sets: 3, rep_min: 5, rep_max: 5, target_rir: 2, rest_seconds: 240 },
          { slug: 'lever-alternate-leg-press', order_index: 2, target_sets: 4, rep_min: 10, rep_max: 12, target_rir: 2, rest_seconds: 120 },
          { slug: 'lever-standing-calf-raise', order_index: 3, target_sets: 4, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
          { slug: '3-4-sit-up', order_index: 4, target_sets: 3, rep_min: 15, rep_max: 20, target_rir: 1, rest_seconds: 60 },
        ],
      },
    ],
  },
  {
    name: 'Full Body — 3 Gün',
    description: 'Haftada 3 gün tüm vücudu dengeli şekilde çalıştırarak maksimum zaman verimliliği sağlar.',
    goal: 'general_health',
    days_per_week: 3,
    duration_weeks: 8,
    days: [
      {
        day_index: 1,
        name: '1. Gün — Tüm Vücut A',
        focus: 'Squat & Bench Odaklı',
        exercises: [
          { slug: 'barbell-full-squat', order_index: 1, target_sets: 3, rep_min: 6, rep_max: 8, target_rir: 2, rest_seconds: 180 },
          { slug: 'barbell-bench-press', order_index: 2, target_sets: 3, rep_min: 6, rep_max: 8, target_rir: 2, rest_seconds: 150 },
          { slug: 'barbell-bent-over-row', order_index: 3, target_sets: 3, rep_min: 8, rep_max: 10, target_rir: 2, rest_seconds: 120 },
          { slug: 'cable-lateral-raise', order_index: 4, target_sets: 3, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
          { slug: 'cable-pushdown-with-rope-attachment', order_index: 5, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 1, rest_seconds: 60 },
        ],
      },
      {
        day_index: 2,
        name: '2. Gün — Tüm Vücut B',
        focus: 'Deadlift & OHP Odaklı',
        exercises: [
          { slug: 'barbell-deadlift', order_index: 1, target_sets: 3, rep_min: 5, rep_max: 5, target_rir: 2, rest_seconds: 240 },
          { slug: 'barbell-seated-overhead-press', order_index: 2, target_sets: 3, rep_min: 6, rep_max: 8, target_rir: 2, rest_seconds: 150 },
          { slug: 'pull-up', order_index: 3, target_sets: 3, rep_min: 6, rep_max: 10, target_rir: 2, rest_seconds: 120 },
          { slug: 'barbell-biceps-curl-with-arm-blaster', order_index: 4, target_sets: 3, rep_min: 8, rep_max: 12, target_rir: 1, rest_seconds: 60 },
          { slug: '3-4-sit-up', order_index: 5, target_sets: 3, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
        ],
      },
      {
        day_index: 3,
        name: '3. Gün — Tüm Vücut C',
        focus: 'Incline Press & Hacim Odaklı',
        exercises: [
          { slug: 'lever-alternate-leg-press', order_index: 1, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 2, rest_seconds: 120 },
          { slug: 'barbell-romanian-deadlift', order_index: 2, target_sets: 3, rep_min: 8, rep_max: 10, target_rir: 2, rest_seconds: 120 },
          { slug: 'barbell-incline-bench-press', order_index: 3, target_sets: 3, rep_min: 8, rep_max: 10, target_rir: 2, rest_seconds: 120 },
          { slug: 'cable-standing-rear-delt-row-with-rope', order_index: 4, target_sets: 3, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
          { slug: 'lever-standing-calf-raise', order_index: 5, target_sets: 3, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
        ],
      },
    ],
  },
  {
    name: 'Güç Odaklı (Powerlifting) — 4 Gün',
    description: 'Squat, Bench Press ve Deadlift ana hareketlerinde maksimum kuvvet artışı için periyodize edilmiş güç programı.',
    goal: 'strength',
    days_per_week: 4,
    duration_weeks: 10,
    days: [
      {
        day_index: 1,
        name: '1. Gün — Squat Günü',
        focus: 'Ağır Squat & Bacak',
        exercises: [
          { slug: 'barbell-full-squat', order_index: 1, target_sets: 5, rep_min: 3, rep_max: 5, target_rir: 2, rest_seconds: 240 },
          { slug: 'lever-alternate-leg-press', order_index: 2, target_sets: 3, rep_min: 8, rep_max: 10, target_rir: 2, rest_seconds: 150 },
          { slug: '3-4-sit-up', order_index: 3, target_sets: 4, rep_min: 10, rep_max: 15, target_rir: 2, rest_seconds: 60 },
        ],
      },
      {
        day_index: 2,
        name: '2. Gün — Bench Günü',
        focus: 'Ağır Bench Press & İtiş',
        exercises: [
          { slug: 'barbell-bench-press', order_index: 1, target_sets: 5, rep_min: 3, rep_max: 5, target_rir: 2, rest_seconds: 240 },
          { slug: 'barbell-close-grip-bench-press', order_index: 2, target_sets: 3, rep_min: 6, rep_max: 8, target_rir: 2, rest_seconds: 150 },
          { slug: 'cable-pushdown-with-rope-attachment', order_index: 3, target_sets: 3, rep_min: 8, rep_max: 12, target_rir: 1, rest_seconds: 90 },
        ],
      },
      {
        day_index: 3,
        name: '3. Gün — Deadlift Günü',
        focus: 'Ağır Deadlift & Çekiş',
        exercises: [
          { slug: 'barbell-deadlift', order_index: 1, target_sets: 4, rep_min: 3, rep_max: 5, target_rir: 2, rest_seconds: 300 },
          { slug: 'barbell-bent-over-row', order_index: 2, target_sets: 4, rep_min: 6, rep_max: 8, target_rir: 2, rest_seconds: 150 },
          { slug: 'pull-up', order_index: 3, target_sets: 3, rep_min: 6, rep_max: 8, target_rir: 2, rest_seconds: 120 },
        ],
      },
      {
        day_index: 4,
        name: '4. Gün — OHP & Aksesuar',
        focus: 'Overhead Press & Genel Güç',
        exercises: [
          { slug: 'barbell-seated-overhead-press', order_index: 1, target_sets: 4, rep_min: 5, rep_max: 6, target_rir: 2, rest_seconds: 180 },
          { slug: 'barbell-romanian-deadlift', order_index: 2, target_sets: 3, rep_min: 6, rep_max: 8, target_rir: 2, rest_seconds: 150 },
          { slug: 'barbell-biceps-curl-with-arm-blaster', order_index: 3, target_sets: 3, rep_min: 6, rep_max: 8, target_rir: 1, rest_seconds: 90 },
        ],
      },
    ],
  },
  {
    name: 'Yeni Başlayan Temel Seviye — 3 Gün',
    description: 'Spora yeni başlayanlar için temel form adaptasyonu, eklem güçlendirme ve dengeli kas uyarımı sağlar.',
    goal: 'general_health',
    days_per_week: 3,
    duration_weeks: 6,
    days: [
      {
        day_index: 1,
        name: '1. Gün — Başlangıç A',
        focus: 'Temel İtiş & Bacak',
        exercises: [
          { slug: 'dumbbell-bench-press', order_index: 1, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 2, rest_seconds: 90 },
          { slug: 'lever-alternate-leg-press', order_index: 2, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 2, rest_seconds: 90 },
          { slug: 'cable-pushdown-with-rope-attachment', order_index: 3, target_sets: 3, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
          { slug: '3-4-sit-up', order_index: 4, target_sets: 2, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
        ],
      },
      {
        day_index: 2,
        name: '2. Gün — Başlangıç B',
        focus: 'Temel Çekiş & Omuz',
        exercises: [
          { slug: 'pull-up', order_index: 1, target_sets: 3, rep_min: 6, rep_max: 10, target_rir: 2, rest_seconds: 120 },
          { slug: 'dumbbell-standing-overhead-press', order_index: 2, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 2, rest_seconds: 90 },
          { slug: 'ez-barbell-spider-curl', order_index: 3, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 1, rest_seconds: 60 },
          { slug: 'lever-standing-calf-raise', order_index: 4, target_sets: 3, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
        ],
      },
      {
        day_index: 3,
        name: '3. Gün — Başlangıç C',
        focus: 'Tüm Vücut Adaptasyon',
        exercises: [
          { slug: 'barbell-romanian-deadlift', order_index: 1, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 2, rest_seconds: 120 },
          { slug: 'barbell-incline-bench-press', order_index: 2, target_sets: 3, rep_min: 10, rep_max: 12, target_rir: 2, rest_seconds: 90 },
          { slug: 'cable-lateral-raise', order_index: 3, target_sets: 3, rep_min: 12, rep_max: 15, target_rir: 1, rest_seconds: 60 },
        ],
      },
    ],
  },
];

async function loadEnv(): Promise<{ supabaseUrl: string; serviceRoleKey: string }> {
  const envFile = await readFile(path.join(import.meta.dirname, '../../.env'), 'utf-8');
  const parsed = Object.fromEntries(
    envFile
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => l.split('=').map((s) => s.trim()))
  );
  return {
    supabaseUrl: parsed.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL!,
    serviceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  };
}

async function main() {
  const { supabaseUrl, serviceRoleKey } = await loadEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('[seed-templates] Supabase exercises tablosundan slug -> id haritası alınıyor...');
  const slugToId = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const { data: exData, error: exErr } = await supabase
      .from('exercises')
      .select('id, slug')
      .range(from, from + 999);
    if (exErr) throw new Error(`exercises okunamadı: ${exErr.message}`);
    if (!exData || exData.length === 0) break;
    for (const ex of exData) {
      slugToId.set(ex.slug, ex.id);
    }
    if (exData.length < 1000) break;
  }
  console.log(`[seed-templates] ${slugToId.size} egzersiz slug'ı hazır.`);

  // Doğrulama: Tüm şablonlardaki slug'lar veritabanında var mı?
  for (const t of TEMPLATES) {
    for (const d of t.days) {
      for (const e of d.exercises) {
        if (!slugToId.has(e.slug)) {
          throw new Error(`Şablon egzersizi bulunamadı: ${e.slug} (Şablon: ${t.name}, Gün: ${d.name})`);
        }
      }
    }
  }
  console.log('[seed-templates] Tüm 6 şablonun egzersiz slug doğrulaması başarılı! ✅');

  // Supabase'deki eski şablonları temizle (CASCADE ile program_days ve program_exercises da silinir)
  console.log('[seed-templates] Eski şablonlar temizleniyor...');
  const { error: delErr } = await supabase.from('programs').delete().eq('is_template', true);
  if (delErr) throw new Error(`Eski şablon silme hatası: ${delErr.message}`);

  // Şablonları ekle
  for (const t of TEMPLATES) {
    console.log(`[seed-templates] Program ekleniyor: "${t.name}"`);
    const { data: progData, error: progErr } = await supabase
      .from('programs')
      .insert({
        name: t.name,
        description: t.description,
        goal: t.goal,
        days_per_week: t.days_per_week,
        duration_weeks: t.duration_weeks,
        status: 'draft',
        is_template: true,
        user_id: null,
      })
      .select('id')
      .single();

    if (progErr || !progData) throw new Error(`Program ekleme hatası (${t.name}): ${progErr?.message}`);
    const programId = progData.id;

    for (const d of t.days) {
      const { data: dayData, error: dayErr } = await supabase
        .from('program_days')
        .insert({
          program_id: programId,
          day_index: d.day_index,
          name: d.name,
          focus: d.focus ?? null,
          notes: d.notes ?? null,
        })
        .select('id')
        .single();

      if (dayErr || !dayData) throw new Error(`Program günü ekleme hatası: ${dayErr?.message}`);
      const dayId = dayData.id;

      const exRows = d.exercises.map((e) => ({
        program_day_id: dayId,
        exercise_id: slugToId.get(e.slug)!,
        order_index: e.order_index,
        target_sets: e.target_sets,
        rep_min: e.rep_min,
        rep_max: e.rep_max,
        target_rir: e.target_rir,
        rest_seconds: e.rest_seconds,
        notes: e.notes ?? null,
      }));

      const { error: pExErr } = await supabase.from('program_exercises').insert(exRows);
      if (pExErr) throw new Error(`Program egzersizleri ekleme hatası: ${pExErr.message}`);
    }
  }

  const localTemplatesFile = path.join(import.meta.dirname, '../../src/db/seed-data/templates.json');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(localTemplatesFile, JSON.stringify(TEMPLATES, null, 2));
  console.log(`[seed-templates] Yerel şablon seed dosyası güncellendi: ${localTemplatesFile}`);

  console.log('\n🎉 6 Hazır Şablon Program Supabase veritabanına ve yerel seed dosyasına başarıyla kaydedildi!');
}

main().catch((err) => {
  console.error('❌ Hata:', err);
  process.exit(1);
});
