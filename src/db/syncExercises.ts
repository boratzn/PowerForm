import AsyncStorage from '@react-native-async-storage/async-storage';
import { sql } from 'drizzle-orm';

import { supabase } from '../lib/supabase';
import { db } from './client';
import { exercises } from './schema';

const LAST_SYNCED_AT_KEY = 'powerform:exercises:lastSyncedAt';
// Egzersiz kütüphanesi sık değişmiyor (yeni egzersiz eklemek manuel bir işlem) — günde
// bir kere yeterli, her açılışta 876+2481+1746 satırlık ağ isteği gereksiz.
const MIN_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
// Supabase REST'in sayfa başına azami satır sayısı; büyük tablolar (exercise_muscles,
// exercise_media) tek istekte sığmaz.
const PAGE_SIZE = 1000;
const WRITE_BATCH_SIZE = 200;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchAllExercises() {
  const out: NonNullable<Awaited<ReturnType<typeof fetchExercisePage>>['data']> = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchExercisePage(from);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return out;
}

function fetchExercisePage(from: number) {
  return supabase
    .from('exercises')
    .select(
      'id, slug, name_en, name_tr, equipment, tracking_type, instructions_en, instructions_tr, cues_tr, common_mistakes_tr'
    )
    .range(from, from + PAGE_SIZE - 1);
}

async function fetchAllPrimaryMuscles() {
  const byExerciseId = new Map<string, string[]>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('exercise_muscles')
      .select('exercise_id, muscle_group_id')
      .eq('role', 'primary')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const m of data) {
      const list = byExerciseId.get(m.exercise_id) ?? [];
      list.push(m.muscle_group_id);
      byExerciseId.set(m.exercise_id, list);
    }
    if (data.length < PAGE_SIZE) break;
  }
  return byExerciseId;
}

async function fetchFirstImagePerExercise() {
  const byExerciseId = new Map<string, string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('exercise_media')
      .select('exercise_id, url, display_order')
      .eq('media_type', 'image')
      .eq('is_active', true)
      .order('display_order')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const m of data) {
      if (!byExerciseId.has(m.exercise_id)) byExerciseId.set(m.exercise_id, m.url);
    }
    if (data.length < PAGE_SIZE) break;
  }
  return byExerciseId;
}

async function fetchFirstGifPerExercise() {
  const byExerciseId = new Map<string, string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('exercise_media')
      .select('exercise_id, url, display_order')
      .eq('media_type', 'gif')
      .eq('is_active', true)
      .order('display_order')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const m of data) {
      if (!byExerciseId.has(m.exercise_id)) byExerciseId.set(m.exercise_id, m.url);
    }
    if (data.length < PAGE_SIZE) break;
  }
  return byExerciseId;
}

// §12: uygulama açılışında Supabase'deki gerçek egzersiz kütüphanesini (1324 egzersiz,
// TR çevirileri, görseller ve GIF'ler) çekip yerel SQLite aynasını tazeler.
export async function syncExercisesFromSupabase(opts: { force?: boolean } = {}): Promise<{ synced: number } | null> {
  if (!opts.force) {
    const lastSyncedAt = await AsyncStorage.getItem(LAST_SYNCED_AT_KEY);
    if (lastSyncedAt && Date.now() - Number(lastSyncedAt) < MIN_SYNC_INTERVAL_MS) return null;
  }

  const exerciseRows = await fetchAllExercises();
  if (exerciseRows.length === 0) return null;

  const [primaryMusclesByExerciseId, firstImageByExerciseId, firstGifByExerciseId] = await Promise.all([
    fetchAllPrimaryMuscles(),
    fetchFirstImagePerExercise(),
    fetchFirstGifPerExercise(),
  ]);

  const rows = exerciseRows.map((e) => ({
    id: e.id,
    slug: e.slug,
    nameEn: e.name_en,
    nameTr: e.name_tr,
    equipment: e.equipment,
    trackingType: e.tracking_type as (typeof exercises.$inferInsert)['trackingType'],
    instructionsEn: e.instructions_en,
    instructionsTr: e.instructions_tr,
    cuesTr: e.cues_tr,
    commonMistakesTr: e.common_mistakes_tr,
    primaryMuscles: primaryMusclesByExerciseId.get(e.id) ?? [],
    imageUrl: firstImageByExerciseId.get(e.id) ?? null,
    gifUrl: firstGifByExerciseId.get(e.id) ?? null,
  }));

  // Çakışma anahtarı `id` DEĞİL `slug`: bundle-seed'deki geçici satırların id'si slug
  // string'iyken (bkz. seedExercises.ts) Supabase'in gerçek uuid'si farklıdır — slug
  // üzerinden eşleştirip id'yi de excluded.id ile güncelleyerek aynı egzersiz için iki
  // ayrı satır oluşmasını önlüyoruz.
  for (const batch of chunk(rows, WRITE_BATCH_SIZE)) {
    await db
      .insert(exercises)
      .values(batch)
      .onConflictDoUpdate({
        target: exercises.slug,
        set: {
          id: sql`excluded.id`,
          nameEn: sql`excluded.name_en`,
          nameTr: sql`excluded.name_tr`,
          equipment: sql`excluded.equipment`,
          trackingType: sql`excluded.tracking_type`,
          instructionsEn: sql`excluded.instructions_en`,
          instructionsTr: sql`excluded.instructions_tr`,
          cuesTr: sql`excluded.cues_tr`,
          commonMistakesTr: sql`excluded.common_mistakes_tr`,
          primaryMuscles: sql`excluded.primary_muscles`,
          imageUrl: sql`excluded.image_url`,
          gifUrl: sql`excluded.gif_url`,
        },
      });
  }

  await AsyncStorage.setItem(LAST_SYNCED_AT_KEY, String(Date.now()));
  console.log(`[syncExercisesFromSupabase] ${rows.length} egzersiz Supabase'den senkronize edildi.`);
  return { synced: rows.length };
}
