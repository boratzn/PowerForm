import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { RawExercise } from './types';

const SOURCE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const CACHE_DIR = path.join(import.meta.dirname, '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'exercises-raw.json');

// free-exercise-db'yi indirir ve yerel önbelleğe alır (idempotent yeniden çalıştırma için —
// §15 Paket 2 madde 1). --refresh verilmedikçe önbellek varsa ağa hiç gidilmez.
export async function fetchRawExercises(opts: { forceRefresh?: boolean } = {}): Promise<RawExercise[]> {
  if (!opts.forceRefresh) {
    try {
      const cached = await readFile(CACHE_FILE, 'utf-8');
      const data = JSON.parse(cached) as RawExercise[];
      console.log(`[fetch] Önbellekten okundu: ${data.length} kayıt (${CACHE_FILE})`);
      return data;
    } catch {
      // önbellek yok, ağdan çek
    }
  }

  console.log(`[fetch] İndiriliyor: ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`free-exercise-db indirilemedi: HTTP ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as RawExercise[];

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(data, null, 2));
  console.log(`[fetch] İndirildi ve önbelleğe alındı: ${data.length} kayıt`);
  return data;
}
