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

// Yerel takvim günü anahtarı (YYYY-MM-DD) — UTC'ye çevirmeden, cihazın saat dilimine göre.
// Sunucudaki `date` tipi (ör. body_weight_logs.logged_on) ile aynı anlam.
export function dateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Haftanın Pazartesi'si, saat 00:00 (yerel) — "bu hafta kaç seans" sayımı için.
export function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Pazar .. 6 = Cumartesi
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// "Bugün" ekranındaki seri (streak) sayacı: art arda antrenman yapılan gün sayısı.
// Bugün henüz antrenman yapılmadıysa (ama dün yapıldıysa) seri kesilmiş sayılmaz —
// kullanıcı güne henüz başlamamış olabilir. `now` test edilebilirlik için parametre.
export function computeStreakDays(sessionDateKeys: Set<string>, now = new Date()): number {
  const dayMs = 24 * 60 * 60 * 1000;
  let cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  if (!sessionDateKeys.has(dateKey(cursor))) {
    cursor = new Date(cursor.getTime() - dayMs);
    if (!sessionDateKeys.has(dateKey(cursor))) return 0;
  }

  let streak = 0;
  while (sessionDateKeys.has(dateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - dayMs);
  }
  return streak;
}

// Süreleri dile göre "X sa Y dk" veya "Xh Ym" şeklinde okunabilir metne dönüştürür
export function formatDurationHuman(seconds: number, lang: string = 'tr'): string {
  if (seconds <= 0) return lang === 'tr' ? '0 dk' : lang === 'de' ? '0 Min.' : lang === 'es' ? '0 min' : '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (lang === 'tr') {
    if (hours > 0) {
      return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`;
    }
    return `${minutes} dk`;
  }
  if (lang === 'de') {
    if (hours > 0) {
      return minutes > 0 ? `${hours} Std. ${minutes} Min.` : `${hours} Std.`;
    }
    return `${minutes} Min.`;
  }
  if (lang === 'es') {
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
    return `${minutes}min`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}
