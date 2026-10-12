import { and, desc, eq, gte, lte } from 'drizzle-orm';

import { dateKey } from '../lib/calculations';
import { generateUuid } from '../lib/uuid';
import { db, sqlite } from './client';
import { waterLogs } from './schema';

export type WaterLog = typeof waterLogs.$inferSelect;

/**
 * SQLite water_logs tablosunun varlığını garanti eder
 */
export function ensureWaterLogsTable(): void {
  try {
    sqlite.execSync(
      'CREATE TABLE IF NOT EXISTS water_logs (client_uuid TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, date TEXT NOT NULL, amount_ml INTEGER NOT NULL DEFAULT 0, target_ml INTEGER NOT NULL DEFAULT 2500, created_at INTEGER DEFAULT (unixepoch()) NOT NULL, updated_at INTEGER DEFAULT (unixepoch()) NOT NULL);'
    );
    sqlite.execSync(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs(user_id, date);'
    );
  } catch (err) {
    console.warn('[waterLogs] ensureWaterLogsTable uyarısı:', err);
  }
}

/**
 * Belirli bir tarihteki su tüketim kaydını döner
 */
export async function getWaterLogForDate(userId: string, date: string): Promise<WaterLog | null> {
  ensureWaterLogsTable();
  try {
    const rows = await db
      .select()
      .from(waterLogs)
      .where(and(eq(waterLogs.userId, userId), eq(waterLogs.date, date)))
      .limit(1);
    return rows[0] || null;
  } catch (err) {
    console.warn('[waterLogs] getWaterLogForDate hatası:', err);
    return null;
  }
}

/**
 * Su tüketim miktarını ayarlar (upsert)
 */
export async function logWaterIntake(
  userId: string,
  date: string,
  amountMl: number,
  targetMl: number = 2500
): Promise<WaterLog> {
  ensureWaterLogsTable();
  const safeAmount = Math.max(0, Math.min(15000, Math.round(amountMl)));
  const existing = await getWaterLogForDate(userId, date);

  if (existing) {
    await db
      .update(waterLogs)
      .set({
        amountMl: safeAmount,
        targetMl: targetMl || existing.targetMl,
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(waterLogs.clientUuid, existing.clientUuid));

    return {
      ...existing,
      amountMl: safeAmount,
      targetMl: targetMl || existing.targetMl,
      updatedAt: Math.floor(Date.now() / 1000),
    };
  }

  const clientUuid = generateUuid();
  const nowSec = Math.floor(Date.now() / 1000);
  const newRow: WaterLog = {
    clientUuid,
    userId,
    date,
    amountMl: safeAmount,
    targetMl,
    createdAt: nowSec,
    updatedAt: nowSec,
  };

  await db.insert(waterLogs).values(newRow);
  return newRow;
}

/**
 * Mevcut miktara delta ekler (örn: +250 ml veya -250 ml)
 */
export async function addWaterAmount(
  userId: string,
  date: string,
  deltaMl: number,
  targetMl: number = 2500
): Promise<WaterLog> {
  ensureWaterLogsTable();
  const existing = await getWaterLogForDate(userId, date);
  const currentAmount = existing ? existing.amountMl : 0;
  const newAmount = Math.max(0, currentAmount + deltaMl);
  return await logWaterIntake(userId, date, newAmount, existing?.targetMl || targetMl);
}

/**
 * Son N günün su kayıtlarını döner
 */
export async function getRecentWaterLogs(userId: string, limitDays: number = 7): Promise<WaterLog[]> {
  ensureWaterLogsTable();
  try {
    const rows = await db
      .select()
      .from(waterLogs)
      .where(eq(waterLogs.userId, userId))
      .orderBy(desc(waterLogs.date))
      .limit(limitDays);
    return rows;
  } catch (err) {
    console.warn('[waterLogs] getRecentWaterLogs hatası:', err);
    return [];
  }
}
