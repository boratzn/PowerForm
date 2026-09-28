import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { MediaItem, MuscleLink, TransformedExercise } from './types';

// Paket 2'nin çeviri/Supabase yazma adımları credential eksikliğinden hâlâ atlanıyor
// (bkz. PROGRESS.md), ama transform.ts'in ürettiği .cache/*.json dosyaları zaten
// gerçek free-exercise-db verisiyle dolu ve doğrulanmış (876 egzersiz, jsdelivr CDN
// görselleri, muscle_groups eşlemesi). Bu script o cache'i src/db/seed-data/exercises.json'a
// (yerel SQLite'ın bundle-seed kaynağı) dönüştürür — kütüphane ekranının gerçek açıklama +
// görsel + çalışan kas göstermesi için Supabase beklemeye gerek yok.
const CACHE_DIR = path.join(import.meta.dirname, '.cache');
const OUT_FILE = path.join(import.meta.dirname, '../../src/db/seed-data/exercises.json');

async function readCache<T>(file: string): Promise<T> {
  const raw = await readFile(path.join(CACHE_DIR, file), 'utf-8');
  return JSON.parse(raw) as T;
}

async function main() {
  const transformed = await readCache<TransformedExercise[]>('transformed-exercises.json');
  const media = await readCache<MediaItem[]>('media.json');
  const links = await readCache<MuscleLink[]>('muscle-links.json');

  const mediaBySlug = new Map<string, MediaItem[]>();
  for (const m of media) {
    const list = mediaBySlug.get(m.exercise_slug) ?? [];
    list.push(m);
    mediaBySlug.set(m.exercise_slug, list);
  }

  const primaryMusclesBySlug = new Map<string, string[]>();
  for (const l of links) {
    if (l.role !== 'primary') continue;
    const list = primaryMusclesBySlug.get(l.exercise_slug) ?? [];
    list.push(l.muscle_group_id);
    primaryMusclesBySlug.set(l.exercise_slug, list);
  }

  const seed = transformed.map((e) => {
    const images = (mediaBySlug.get(e.slug) ?? []).sort((a, b) => a.display_order - b.display_order);
    return {
      id: e.slug,
      slug: e.slug,
      name_en: e.name_en,
      name_tr: e.name_tr,
      equipment: e.equipment,
      tracking_type: e.tracking_type,
      instructions_en: e.instructions_en,
      primary_muscles: primaryMusclesBySlug.get(e.slug) ?? [],
      image_url: images[0]?.url ?? null,
    };
  });

  await writeFile(OUT_FILE, JSON.stringify(seed, null, 2));
  console.log(`[build-local-seed] ${seed.length} egzersiz yazıldı: ${OUT_FILE}`);
}

main();
