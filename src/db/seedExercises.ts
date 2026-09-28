import { sql } from 'drizzle-orm';

import { db } from './client';
import { exercises } from './schema';
import seedData from './seed-data/exercises.json';

const WRITE_BATCH_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Çevrimdışı ilk açılışta egzersizlerin anında hazır olması için bundle seed verisini yükler.
// Çakışma anahtarı `slug`'dır — Supabase senkronu `id`'yi gerçek UUID ile güncellediğinde,
// `slug` üzerinden çakışma yakalanır ve mevcut UUID bozulmadan diğer alanlar güncellenir.
export async function seedLocalExercisesIfEmpty(): Promise<void> {
  const rows = seedData.map((e) => ({
    id: e.id,
    slug: e.slug,
    nameEn: e.name_en,
    nameTr: e.name_tr,
    equipment: e.equipment,
    trackingType: e.tracking_type as (typeof exercises.$inferInsert)['trackingType'],
    instructionsEn: e.instructions_en,
    instructionsTr: e.instructions_tr,
    primaryMuscles: e.primary_muscles,
    imageUrl: e.image_url,
    gifUrl: e.gif_url,
  }));

  for (const batch of chunk(rows, WRITE_BATCH_SIZE)) {
    await db
      .insert(exercises)
      .values(batch)
      .onConflictDoUpdate({
        target: exercises.slug,
        set: {
          nameEn: sql`excluded.name_en`,
          nameTr: sql`excluded.name_tr`,
          equipment: sql`excluded.equipment`,
          trackingType: sql`excluded.tracking_type`,
          instructionsEn: sql`excluded.instructions_en`,
          instructionsTr: sql`excluded.instructions_tr`,
          primaryMuscles: sql`excluded.primary_muscles`,
          imageUrl: sql`excluded.image_url`,
          gifUrl: sql`excluded.gif_url`,
        },
      });
  }
  console.log(`[seedLocalExercisesIfEmpty] ${seedData.length} egzersiz yerel DB'ye yazıldı/güncellendi.`);
}
