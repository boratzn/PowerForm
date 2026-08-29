// Saf fonksiyonlar — §16.3: "Hesaplama fonksiyonları saf fonksiyon olarak yazılmalı ve
// %100 test kapsamına sahip olmalı. Bunlar yanlışsa kullanıcı yanlış ağırlık kaldırır."
// Formüller FITNESS_APP_SPEC.md §9.1'den birebir alındı.

// RIR-düzeltmeli tahmini 1RM. supabase/migrations/006_sessions.sql'deki session_sets.e1rm
// generated column'ı RIR'ı hesaba katmayan basit Epley kullanır (sunucu tarafı, kalıcı kayıt);
// bu fonksiyon istemcide anlık PR tespiti için §9.1'in "en doğrusu" dediği RIR-düzeltmeli
// versiyonu uygular. İkisinin arasındaki fark bilinçli — sunucudaki basit versiyon değiştirilemez
// (mevcut satırlarla geriye dönük tutarlı kalmalı), istemcideki daha isabetlidir.
export function estimate1RM(weightKg: number, reps: number, rir: number | null): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  const effectiveReps = reps + (rir ?? 0);
  if (effectiveReps <= 0) return weightKg;
  if (effectiveReps > 15) return weightKg * Math.pow(effectiveReps, 0.1); // Lombardi
  return weightKg * (1 + effectiveReps / 30); // Epley
}

export function calculateVolume(weightKg: number | null, reps: number | null): number {
  if (weightKg == null || reps == null) return 0;
  return weightKg * reps;
}

// Salonda gerçekten var olan plakalara yuvarla (§9.2)
export function roundToPlate(kg: number, smallestPlate = 1.25): number {
  return Math.round(kg / smallestPlate) * smallestPlate;
}
