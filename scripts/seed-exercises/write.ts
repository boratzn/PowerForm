import { createClient } from '@supabase/supabase-js';

import { MUSCLE_GROUPS_SEED } from './muscle-map';
import type { MediaItem, MuscleLink, TransformedExercise } from './types';

const WRITE_BATCH_SIZE = 200;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// §15 Paket 2 madde 5: Supabase'e idempotent yazar (slug üzerinden upsert).
// NOT: is_custom=false / created_by=NULL sistem egzersizleri, supabase/migrations/012_rls.sql'deki
// write_custom_exercises politikasının kapsamı DIŞINDA (o politika sadece is_custom=true'ya izin
// verir) — bu yüzden bu fonksiyon SADECE service_role key ile çalışır, RLS'i bypass eder.
// Asla istemci koduna / anon key'e taşınmaz (bkz. CLAUDE.md "Güvenlik").
export async function writeToSupabase(input: {
  exercises: TransformedExercise[];
  muscleLinks: MuscleLink[];
  media: MediaItem[];
  supabaseUrl?: string;
  serviceRoleKey?: string;
}): Promise<void> {
  const supabaseUrl = input.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = input.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.log(
      '[write] EXPO_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY yok — Supabase yazma adımı atlanıyor.'
    );
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`[write] muscle_groups upsert (${MUSCLE_GROUPS_SEED.length} satır)`);
  const { error: mgError } = await supabase.from('muscle_groups').upsert(MUSCLE_GROUPS_SEED, { onConflict: 'id' });
  if (mgError) throw new Error(`muscle_groups upsert hatası: ${mgError.message}`);

  console.log(`[write] exercises upsert (${input.exercises.length} satır, ${WRITE_BATCH_SIZE}'lik batch'ler halinde)`);
  const slugToId = new Map<string, string>();
  for (const batch of chunk(input.exercises, WRITE_BATCH_SIZE)) {
    const rows = batch.map((e) => ({
      slug: e.slug,
      name_en: e.name_en,
      name_tr: e.name_tr,
      equipment: e.equipment,
      mechanic: e.mechanic,
      force: e.force,
      is_unilateral: e.is_unilateral,
      difficulty: e.difficulty,
      instructions_en: e.instructions_en,
      instructions_tr: e.instructions_tr,
      cues_tr: e.cues_tr,
      common_mistakes_tr: e.common_mistakes_tr,
      tracking_type: e.tracking_type,
      is_custom: e.is_custom,
      source: e.source,
    }));
    const { data, error } = await supabase.from('exercises').upsert(rows, { onConflict: 'slug' }).select('id, slug');
    if (error) throw new Error(`exercises upsert hatası: ${error.message}`);
    for (const row of data ?? []) slugToId.set(row.slug, row.id);
  }

  // exercise_muscles / exercise_media: exercise_id FK olduğu için önce mevcut satırları
  // sil, sonra yeniden ekle (idempotent) — upsert için doğal bir unique key yok.
  const exerciseIds = [...slugToId.values()];
  console.log('[write] exercise_muscles / exercise_media temizleniyor (yeniden çalıştırma güvenliği)');
  for (const idBatch of chunk(exerciseIds, WRITE_BATCH_SIZE)) {
    const { error: delMuscleErr } = await supabase.from('exercise_muscles').delete().in('exercise_id', idBatch);
    if (delMuscleErr) throw new Error(`exercise_muscles silme hatası: ${delMuscleErr.message}`);
    const { error: delMediaErr } = await supabase.from('exercise_media').delete().in('exercise_id', idBatch);
    if (delMediaErr) throw new Error(`exercise_media silme hatası: ${delMediaErr.message}`);
  }

  // (exercise_id, muscle_group_id) PRIMARY KEY'dir (bkz. 004_exercises.sql) — kaynak veride
  // aynı kas grubuna iki farklı ham kas adı eşleşebiliyor (örn. "middle back" ve "lats" ikisi
  // de upper_back'e), bu da aynı egzersiz için çakışan satır üretir. primary, secondary'den
  // önceliklidir (hacim hesabında daha yüksek katsayı taşıdığı için kaybolmamalı).
  console.log(`[write] exercise_muscles ekleniyor (${input.muscleLinks.length} satır, dedupe sonrası)`);
  const muscleRowMap = new Map<string, { exercise_id: string; muscle_group_id: string; role: string; volume_factor: number }>();
  for (const l of input.muscleLinks) {
    const exercise_id = slugToId.get(l.exercise_slug);
    if (!exercise_id) continue;
    const key = `${exercise_id}:${l.muscle_group_id}`;
    const existing = muscleRowMap.get(key);
    if (existing && existing.role === 'primary') continue; // primary zaten var, secondary'yi atla
    muscleRowMap.set(key, { exercise_id, muscle_group_id: l.muscle_group_id, role: l.role, volume_factor: l.volume_factor });
  }
  const muscleRows = [...muscleRowMap.values()];
  for (const batch of chunk(muscleRows, WRITE_BATCH_SIZE)) {
    const { error } = await supabase.from('exercise_muscles').insert(batch);
    if (error) throw new Error(`exercise_muscles insert hatası: ${error.message}`);
  }

  console.log(`[write] exercise_media ekleniyor (${input.media.length} satır)`);
  const mediaRows = input.media
    .map((m) => {
      const exercise_id = slugToId.get(m.exercise_slug);
      if (!exercise_id) return null;
      return {
        exercise_id,
        media_type: m.media_type,
        url: m.url,
        display_order: m.display_order,
        attribution: m.attribution,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  for (const batch of chunk(mediaRows, WRITE_BATCH_SIZE)) {
    const { error } = await supabase.from('exercise_media').insert(batch);
    if (error) throw new Error(`exercise_media insert hatası: ${error.message}`);
  }

  console.log('[write] Tamamlandı.');
}
