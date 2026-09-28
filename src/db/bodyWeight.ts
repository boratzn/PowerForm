import { and, desc, eq } from 'drizzle-orm';

import { dateKey } from '../lib/calculations';
import { generateUuid } from '../lib/uuid';
import { db } from './client';
import { recordMutation } from './mutations';
import { bodyWeightLogs } from './schema';
import { drainSyncQueue } from './syncEngine';

export type BodyWeightLog = typeof bodyWeightLogs.$inferSelect;

export async function getTodayBodyWeight(userId: string): Promise<BodyWeightLog | undefined> {
  const today = dateKey(new Date());
  const rows = await db
    .select()
    .from(bodyWeightLogs)
    .where(and(eq(bodyWeightLogs.userId, userId), eq(bodyWeightLogs.loggedOn, today)))
    .limit(1);
  return rows[0];
}

// Günde tek kayıt (§12.3: (user_id, logged_on) UNIQUE, upsert) — bugün için zaten bir
// kayıt varsa üzerine yazar, yoksa ekler.
export async function logBodyWeight(userId: string, weightKg: number): Promise<void> {
  const existing = await getTodayBodyWeight(userId);
  if (existing) {
    await db.update(bodyWeightLogs).set({ weightKg }).where(eq(bodyWeightLogs.clientUuid, existing.clientUuid));
    await recordMutation('body_weight_logs', 'update', { client_uuid: existing.clientUuid, logged_on: existing.loggedOn, weight_kg: weightKg });
    drainSyncQueue().catch(() => {});
    return;
  }

  const clientUuid = generateUuid();
  const loggedOn = dateKey(new Date());
  await db.insert(bodyWeightLogs).values({ clientUuid, userId, loggedOn, weightKg });
  await recordMutation('body_weight_logs', 'insert', { client_uuid: clientUuid, logged_on: loggedOn, weight_kg: weightKg });
  drainSyncQueue().catch(() => {});
}

// Son N kayıt, en yeniden eskiye — "Bugün" ekranında geçen ölçüme göre değişimi (▲/▼)
// göstermek için.
export async function getRecentBodyWeights(userId: string, limit = 2): Promise<BodyWeightLog[]> {
  return db
    .select()
    .from(bodyWeightLogs)
    .where(eq(bodyWeightLogs.userId, userId))
    .orderBy(desc(bodyWeightLogs.loggedOn))
    .limit(limit);
}

export type WeightTrendPoint = {
  clientUuid?: string;
  dateStr: string;
  weightKg: number | null;
  movingAverage7d: number | null;
};

export type WeightTrendSummary = {
  points: WeightTrendPoint[];
  currentWeight: number | null;
  currentMA: number | null;
  weeklyChangeKg: number | null;
  minWeight: number;
  maxWeight: number;
};

// 7 günlük hareketli ortalama (7-day MA) ve kilo trendi (§13)
export async function getBodyWeightTrend(userId: string, limitDays = 30): Promise<WeightTrendSummary> {
  const allLogs = await db
    .select()
    .from(bodyWeightLogs)
    .where(eq(bodyWeightLogs.userId, userId))
    .orderBy(bodyWeightLogs.loggedOn); // Eskiden yeniye

  if (allLogs.length === 0) {
    return {
      points: [],
      currentWeight: null,
      currentMA: null,
      weeklyChangeKg: null,
      minWeight: 70,
      maxWeight: 80,
    };
  }

  // log haritası (tarih -> kilo)
  const weightByDate = new Map<string, { clientUuid: string; weightKg: number }>();
  for (const log of allLogs) {
    weightByDate.set(log.loggedOn, { clientUuid: log.clientUuid, weightKg: log.weightKg });
  }

  // Son `limitDays` günün her biri için 7 günlük MA hesapla
  const now = new Date();
  const points: WeightTrendPoint[] = [];

  const daysToShow = Math.min(limitDays, Math.max(14, allLogs.length + 7));
  const weightsCollected: number[] = [];

  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = dateKey(d);
    const current = weightByDate.get(key);

    // Son 7 günün ortalamasını al
    let sum = 0;
    let count = 0;
    for (let k = 0; k < 7; k++) {
      const pastDate = new Date(d.getTime() - k * 24 * 60 * 60 * 1000);
      const pastWeight = weightByDate.get(dateKey(pastDate));
      if (pastWeight) {
        sum += pastWeight.weightKg;
        count++;
      }
    }

    const ma = count > 0 ? Math.round((sum / count) * 10) / 10 : null;
    if (current) weightsCollected.push(current.weightKg);
    if (ma) weightsCollected.push(ma);

    // Sadece kilo girilmiş günleri veya MA olan günleri listeye ekle
    if (current || ma) {
      points.push({
        clientUuid: current?.clientUuid,
        dateStr: key,
        weightKg: current ? current.weightKg : null,
        movingAverage7d: ma,
      });
    }
  }

  const lastLog = allLogs[allLogs.length - 1];
  const lastMA = points.length > 0 ? points[points.length - 1].movingAverage7d : null;

  // 7 gün önceki MA ile karşılaştırarak haftalık değişim hızı hesapla
  let weeklyChangeKg: number | null = null;
  if (points.length >= 8) {
    const prevMA = points[points.length - 8].movingAverage7d;
    if (lastMA != null && prevMA != null) {
      weeklyChangeKg = Math.round((lastMA - prevMA) * 10) / 10;
    }
  }

  const minWeight = weightsCollected.length > 0 ? Math.floor(Math.min(...weightsCollected) - 1) : 70;
  const maxWeight = weightsCollected.length > 0 ? Math.ceil(Math.max(...weightsCollected) + 1) : 80;

  return {
    points,
    currentWeight: lastLog.weightKg,
    currentMA: lastMA,
    weeklyChangeKg,
    minWeight,
    maxWeight,
  };
}

export async function deleteBodyWeightLog(clientUuid: string): Promise<void> {
  const existing = await db
    .select({ loggedOn: bodyWeightLogs.loggedOn })
    .from(bodyWeightLogs)
    .where(eq(bodyWeightLogs.clientUuid, clientUuid))
    .limit(1);
  const loggedOn = existing[0]?.loggedOn;

  await db.delete(bodyWeightLogs).where(eq(bodyWeightLogs.clientUuid, clientUuid));
  await recordMutation('body_weight_logs', 'delete', { client_uuid: clientUuid, logged_on: loggedOn });
  drainSyncQueue().catch(() => {});
}
