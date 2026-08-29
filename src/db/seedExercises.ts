import { db } from './client';
import { exercises } from './schema';
import seedData from './seed-data/exercises.json';

// GEÇİCİ: Supabase bağlantısı kurulana kadar (bkz. PROGRESS.md) egzersiz kütüphanesi
// sadece bu 38 kayıtlık küratörlü bundle'dan gelir — scripts/seed-exercises/ pipeline'ının
// gerçek free-exercise-db çıktısından elle seçildi (Paket 2). Uygulama ilk açıldığında,
// tablo boşsa bir kereliğine yazılır. Gerçek Supabase senkronu geldiğinde bu fonksiyon
// "pull egzersiz kütüphanesi" mantığıyla değiştirilecek.
export async function seedLocalExercisesIfEmpty(): Promise<void> {
  const existing = await db.select({ id: exercises.id }).from(exercises).limit(1);
  if (existing.length > 0) return;

  await db.insert(exercises).values(
    seedData.map((e) => ({
      id: e.id,
      slug: e.slug,
      nameEn: e.name_en,
      nameTr: e.name_tr,
      equipment: e.equipment,
      trackingType: e.tracking_type as (typeof exercises.$inferInsert)['trackingType'],
    }))
  );
  console.log(`[seedLocalExercisesIfEmpty] ${seedData.length} egzersiz yerel DB'ye yazıldı.`);
}
