import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { dateKey } from '../lib/calculations';
import { generateUuid } from '../lib/uuid';
import { db, sqlite } from './client';
import { sleepLogs } from './schema';

export type SleepLog = typeof sleepLogs.$inferSelect;

export type SleepChartPoint = {
  date: string; // YYYY-MM-DD
  dayLabel: string; // 'Pzt', 'Sal', etc.
  dateLabel: string; // '8 Eki'
  durationMinutes: number;
  durationHours: number;
  bedtime: string; // '23:30'
  wakeTime: string; // '07:30'
  quality: number; // 1-5
  notes?: string | null;
  clientUuid?: string;
  hasData: boolean;
};

export type SleepPeriodSummary = {
  points: SleepChartPoint[];
  avgDurationMinutes: number;
  avgDurationHours: number;
  avgBedtime: string;
  avgWakeTime: string;
  avgQuality: number;
  loggedDaysCount: number;
  totalDays: number;
  consistencyScore: number; // %0 - 100
  targetMetDays: number; // 7-9 saat arası gün sayısı
  recoveryStatus: 'optimal' | 'moderate' | 'insufficient' | 'no_data';
};

/**
 * SQLite tablosunun ve indeksinin varlığını garanti eder
 */
export function ensureSleepLogsTable(): void {
  try {
    sqlite.execSync(
      'CREATE TABLE IF NOT EXISTS sleep_logs (client_uuid TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, date TEXT NOT NULL, bedtime TEXT NOT NULL, wake_time TEXT NOT NULL, duration_minutes INTEGER NOT NULL, quality INTEGER DEFAULT 3, notes TEXT, created_at INTEGER DEFAULT (unixepoch()) NOT NULL, updated_at INTEGER DEFAULT (unixepoch()) NOT NULL);'
    );
    sqlite.execSync(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON sleep_logs(user_id, date);'
    );
  } catch (err) {
    console.warn('[sleepLogs] ensureSleepLogsTable uyarısı:', err);
  }
}

/**
 * Yatış ve kalkış saatinden uyku süresini (dakika) hesaplar (gece yarısı geçişini destekler).
 * Örn: 23:30 -> 07:30 = 480 dk (8 saat)
 */
export function calculateSleepDurationMinutes(bedtime: string, wakeTime: string): number {
  const [bH, bM] = (bedtime || '23:00').split(':').map((x) => parseInt(x, 10));
  const [wH, wM] = (wakeTime || '07:00').split(':').map((x) => parseInt(x, 10));

  let startTotal = (bH || 0) * 60 + (bM || 0);
  let endTotal = (wH || 0) * 60 + (wM || 0);

  if (endTotal <= startTotal) {
    // Gece yarısını aştı (örn. 23:30 yatış, 07:00 kalkış)
    endTotal += 24 * 60;
  }

  return Math.max(0, endTotal - startTotal);
}

/**
 * Dakikayı "X sa Y dk" formatında metne çevirir
 */
export function formatSleepDuration(minutes: number, lang: string = 'tr'): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (lang === 'tr') {
    if (mins === 0) return `${hours} sa`;
    return `${hours} sa ${mins} dk`;
  }
  if (mins === 0) return `${hours} h`;
  return `${hours}h ${mins}m`;
}

/**
 * Uyku kaydı ekler veya günceller
 */
export async function logSleepRecord(params: {
  userId: string;
  date: string; // YYYY-MM-DD
  bedtime: string; // 'HH:MM'
  wakeTime: string; // 'HH:MM'
  durationMinutes?: number;
  quality?: number; // 1-5
  notes?: string;
}): Promise<SleepLog> {
  ensureSleepLogsTable();

  const durationMinutes =
    params.durationMinutes ?? calculateSleepDurationMinutes(params.bedtime, params.wakeTime);

  // Gün için mevcut kayıt var mı?
  const existing = await db
    .select()
    .from(sleepLogs)
    .where(and(eq(sleepLogs.userId, params.userId), eq(sleepLogs.date, params.date)))
    .limit(1);

  const nowSec = Math.floor(Date.now() / 1000);

  if (existing.length > 0) {
    const targetUuid = existing[0].clientUuid;
    await db
      .update(sleepLogs)
      .set({
        bedtime: params.bedtime,
        wakeTime: params.wakeTime,
        durationMinutes,
        quality: params.quality ?? existing[0].quality ?? 3,
        notes: params.notes !== undefined ? params.notes : existing[0].notes,
        updatedAt: nowSec,
      })
      .where(eq(sleepLogs.clientUuid, targetUuid));

    const updated = await db
      .select()
      .from(sleepLogs)
      .where(eq(sleepLogs.clientUuid, targetUuid))
      .limit(1);
    return updated[0];
  }

  const clientUuid = generateUuid();
  await db.insert(sleepLogs).values({
    clientUuid,
    userId: params.userId,
    date: params.date,
    bedtime: params.bedtime,
    wakeTime: params.wakeTime,
    durationMinutes,
    quality: params.quality ?? 3,
    notes: params.notes ?? null,
    createdAt: nowSec,
    updatedAt: nowSec,
  });

  const inserted = await db
    .select()
    .from(sleepLogs)
    .where(eq(sleepLogs.clientUuid, clientUuid))
    .limit(1);
  return inserted[0];
}

/**
 * Belirli bir tarihteki uyku kaydını getirir
 */
export async function getSleepRecordForDate(
  userId: string,
  dateStr: string
): Promise<SleepLog | undefined> {
  ensureSleepLogsTable();
  const rows = await db
    .select()
    .from(sleepLogs)
    .where(and(eq(sleepLogs.userId, userId), eq(sleepLogs.date, dateStr)))
    .limit(1);
  return rows[0];
}

/**
 * Bugünün uyku kaydını getirir
 */
export async function getTodaySleepRecord(userId: string): Promise<SleepLog | undefined> {
  const today = dateKey(new Date());
  return getSleepRecordForDate(userId, today);
}

/**
 * Son N güne ait tüm uyku kayıtlarını çeker
 */
export async function getRecentSleepLogs(userId: string, days: number = 30): Promise<SleepLog[]> {
  ensureSleepLogsTable();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const startStr = dateKey(startDate);

  return db
    .select()
    .from(sleepLogs)
    .where(and(eq(sleepLogs.userId, userId), gte(sleepLogs.date, startStr)))
    .orderBy(desc(sleepLogs.date));
}

/**
 * Uyku kaydını siler
 */
export async function deleteSleepRecord(clientUuid: string): Promise<void> {
  ensureSleepLogsTable();
  await db.delete(sleepLogs).where(eq(sleepLogs.clientUuid, clientUuid));
}

/**
 * Haftalık ve Aylık grafik verilerini ve istatistik özetini hesaplar
 */
export async function getSleepSummary(
  userId: string,
  mode: 'week' | 'month',
  lang: string = 'tr'
): Promise<SleepPeriodSummary> {
  ensureSleepLogsTable();
  const totalDays = mode === 'week' ? 7 : 30;
  const now = new Date();

  // Son totalDays günlük tarih dizisi (kronolojik: en eskiden en yeniye)
  const dateList: { dateStr: string; dateObj: Date }[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dateList.push({ dateStr: dateKey(d), dateObj: d });
  }

  const oldestDateStr = dateList[0].dateStr;
  const dbRows = await db
    .select()
    .from(sleepLogs)
    .where(and(eq(sleepLogs.userId, userId), gte(sleepLogs.date, oldestDateStr)))
    .orderBy(sleepLogs.date);

  const rowMap = new Map<string, SleepLog>();
  for (const r of dbRows) {
    rowMap.set(r.date, r);
  }

  const dayNamesTr = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNames = lang === 'tr' ? dayNamesTr : dayNamesEn;

  const monthsTr = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const months = lang === 'tr' ? monthsTr : monthsEn;

  const points: SleepChartPoint[] = dateList.map(({ dateStr, dateObj }) => {
    const row = rowMap.get(dateStr);
    const dayOfWeek = dateObj.getDay();
    const dayLabel = dayNames[dayOfWeek];
    const dateLabel = `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;

    if (!row) {
      return {
        date: dateStr,
        dayLabel,
        dateLabel,
        durationMinutes: 0,
        durationHours: 0,
        bedtime: '—',
        wakeTime: '—',
        quality: 0,
        notes: null,
        hasData: false,
      };
    }

    const durationHours = Number((row.durationMinutes / 60).toFixed(1));
    return {
      date: dateStr,
      dayLabel,
      dateLabel,
      durationMinutes: row.durationMinutes,
      durationHours,
      bedtime: row.bedtime,
      wakeTime: row.wakeTime,
      quality: row.quality ?? 3,
      notes: row.notes,
      clientUuid: row.clientUuid,
      hasData: true,
    };
  });

  const loggedPoints = points.filter((p) => p.hasData);
  const loggedDaysCount = loggedPoints.length;

  if (loggedDaysCount === 0) {
    return {
      points,
      avgDurationMinutes: 0,
      avgDurationHours: 0,
      avgBedtime: '—',
      avgWakeTime: '—',
      avgQuality: 0,
      loggedDaysCount: 0,
      totalDays,
      consistencyScore: 0,
      targetMetDays: 0,
      recoveryStatus: 'no_data',
    };
  }

  const totalMinutes = loggedPoints.reduce((acc, p) => acc + p.durationMinutes, 0);
  const avgDurationMinutes = Math.round(totalMinutes / loggedDaysCount);
  const avgDurationHours = Number((avgDurationMinutes / 60).toFixed(1));

  // Ortalama yatış ve kalkış dakikalarını hesapla
  let bedtimeMinutesSum = 0;
  let wakeTimeMinutesSum = 0;

  for (const p of loggedPoints) {
    const [bH, bM] = p.bedtime.split(':').map((x) => parseInt(x, 10));
    const [wH, wM] = p.wakeTime.split(':').map((x) => parseInt(x, 10));
    // Yatış saatinde 18:00 sonrası veya gece yarısı normalize
    let bTotal = (bH || 0) * 60 + (bM || 0);
    if (bTotal < 12 * 60) bTotal += 24 * 60; // gece yarısından sonra yatışları 24+ olarak say
    bedtimeMinutesSum += bTotal;
    wakeTimeMinutesSum += (wH || 0) * 60 + (wM || 0);
  }

  const avgBedtimeRaw = Math.round(bedtimeMinutesSum / loggedDaysCount) % (24 * 60);
  const avgBedH = String(Math.floor(avgBedtimeRaw / 60)).padStart(2, '0');
  const avgBedM = String(avgBedtimeRaw % 60).padStart(2, '0');
  const avgBedtime = `${avgBedH}:${avgBedM}`;

  const avgWakeRaw = Math.round(wakeTimeMinutesSum / loggedDaysCount);
  const avgWakeH = String(Math.floor(avgWakeRaw / 60)).padStart(2, '0');
  const avgWakeM = String(avgWakeRaw % 60).padStart(2, '0');
  const avgWakeTime = `${avgWakeH}:${avgWakeM}`;

  const totalQuality = loggedPoints.reduce((acc, p) => acc + p.quality, 0);
  const avgQuality = Number((totalQuality / loggedDaysCount).toFixed(1));

  // 7 - 9 saat arası optimum uyku hedefi
  const targetMetDays = loggedPoints.filter(
    (p) => p.durationMinutes >= 7 * 60 && p.durationMinutes <= 9 * 60
  ).length;

  // Tutarlılık puanı: loglanan gün oranı + hedef tutturma oranı
  const loggingConsistency = (loggedDaysCount / totalDays) * 50;
  const targetConsistency = (targetMetDays / loggedDaysCount) * 50;
  const consistencyScore = Math.min(100, Math.round(loggingConsistency + targetConsistency));

  let recoveryStatus: 'optimal' | 'moderate' | 'insufficient' = 'moderate';
  if (avgDurationHours >= 7.5 && avgDurationHours <= 9.5 && avgQuality >= 3.5) {
    recoveryStatus = 'optimal';
  } else if (avgDurationHours < 6.5 || avgQuality < 2.5) {
    recoveryStatus = 'insufficient';
  }

  return {
    points,
    avgDurationMinutes,
    avgDurationHours,
    avgBedtime,
    avgWakeTime,
    avgQuality,
    loggedDaysCount,
    totalDays,
    consistencyScore,
    targetMetDays,
    recoveryStatus,
  };
}
