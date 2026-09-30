import { and, desc, eq } from 'drizzle-orm';

import { dateKey } from '../lib/calculations';
import { generateUuid } from '../lib/uuid';
import { db } from './client';
import { recordMutation } from './mutations';
import { bodyMeasurements } from './schema';
import { drainSyncQueue } from './syncEngine';

export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;

export type BodyMetricKey =
  | 'armLeftCm'
  | 'armRightCm'
  | 'chestCm'
  | 'waistCm'
  | 'hipCm'
  | 'thighCm'
  | 'calfCm'
  | 'shoulderCm'
  | 'forearmCm'
  | 'neckCm';

export type BodyMeasurementInput = {
  clientUuid?: string;
  loggedOn?: string;
  neckCm?: number | null;
  shoulderCm?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  armLeftCm?: number | null;
  armRightCm?: number | null;
  forearmCm?: number | null;
  thighCm?: number | null;
  calfCm?: number | null;
};

export async function getTodayBodyMeasurement(userId: string): Promise<BodyMeasurement | undefined> {
  const today = dateKey(new Date());
  const rows = await db
    .select()
    .from(bodyMeasurements)
    .where(and(eq(bodyMeasurements.userId, userId), eq(bodyMeasurements.loggedOn, today)))
    .limit(1);
  return rows[0];
}

export async function getBodyMeasurementByDate(userId: string, dateStr: string): Promise<BodyMeasurement | undefined> {
  const rows = await db
    .select()
    .from(bodyMeasurements)
    .where(and(eq(bodyMeasurements.userId, userId), eq(bodyMeasurements.loggedOn, dateStr)))
    .limit(1);
  return rows[0];
}

export async function getLatestBodyMeasurement(userId: string): Promise<BodyMeasurement | undefined> {
  const rows = await db
    .select()
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.userId, userId))
    .orderBy(desc(bodyMeasurements.loggedOn))
    .limit(1);
  return rows[0];
}

export async function getBodyMeasurementsHistory(userId: string, limit = 50): Promise<BodyMeasurement[]> {
  return db
    .select()
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.userId, userId))
    .orderBy(desc(bodyMeasurements.loggedOn))
    .limit(limit);
}

export async function saveBodyMeasurement(userId: string, input: BodyMeasurementInput): Promise<string> {
  const loggedOn = input.loggedOn || dateKey(new Date());

  // Mevcut kayıt var mı kontrol et
  const existing = await getBodyMeasurementByDate(userId, loggedOn);

  const payloadData = {
    neck_cm: input.neckCm !== undefined ? input.neckCm : null,
    shoulder_cm: input.shoulderCm !== undefined ? input.shoulderCm : null,
    chest_cm: input.chestCm !== undefined ? input.chestCm : null,
    waist_cm: input.waistCm !== undefined ? input.waistCm : null,
    hip_cm: input.hipCm !== undefined ? input.hipCm : null,
    arm_left_cm: input.armLeftCm !== undefined ? input.armLeftCm : null,
    arm_right_cm: input.armRightCm !== undefined ? input.armRightCm : null,
    forearm_cm: input.forearmCm !== undefined ? input.forearmCm : null,
    thigh_cm: input.thighCm !== undefined ? input.thighCm : null,
    calf_cm: input.calfCm !== undefined ? input.calfCm : null,
  };

  if (existing) {
    await db
      .update(bodyMeasurements)
      .set({
        neckCm: input.neckCm,
        shoulderCm: input.shoulderCm,
        chestCm: input.chestCm,
        waistCm: input.waistCm,
        hipCm: input.hipCm,
        armLeftCm: input.armLeftCm,
        armRightCm: input.armRightCm,
        forearmCm: input.forearmCm,
        thighCm: input.thighCm,
        calfCm: input.calfCm,
      })
      .where(eq(bodyMeasurements.clientUuid, existing.clientUuid));

    await recordMutation('body_measurements', 'update', {
      client_uuid: existing.clientUuid,
      logged_on: loggedOn,
      ...payloadData,
    });

    drainSyncQueue().catch(() => {});
    return existing.clientUuid;
  }

  const clientUuid = input.clientUuid || generateUuid();
  await db.insert(bodyMeasurements).values({
    clientUuid,
    userId,
    loggedOn,
    neckCm: input.neckCm,
    shoulderCm: input.shoulderCm,
    chestCm: input.chestCm,
    waistCm: input.waistCm,
    hipCm: input.hipCm,
    armLeftCm: input.armLeftCm,
    armRightCm: input.armRightCm,
    forearmCm: input.forearmCm,
    thighCm: input.thighCm,
    calfCm: input.calfCm,
  });

  await recordMutation('body_measurements', 'insert', {
    client_uuid: clientUuid,
    logged_on: loggedOn,
    ...payloadData,
  });

  drainSyncQueue().catch(() => {});
  return clientUuid;
}

export async function deleteBodyMeasurement(clientUuid: string): Promise<void> {
  const existing = await db
    .select({ loggedOn: bodyMeasurements.loggedOn })
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.clientUuid, clientUuid))
    .limit(1);

  const loggedOn = existing[0]?.loggedOn;

  await db.delete(bodyMeasurements).where(eq(bodyMeasurements.clientUuid, clientUuid));
  await recordMutation('body_measurements', 'delete', { client_uuid: clientUuid, logged_on: loggedOn });
  drainSyncQueue().catch(() => {});
}

export type MetricTrendPoint = {
  clientUuid: string;
  dateStr: string;
  value: number;
};

export type MetricTrendSummary = {
  points: MetricTrendPoint[];
  latestValue: number | null;
  previousValue: number | null;
  changeCm: number | null;
  minValue: number;
  maxValue: number;
};

export async function getBodyMetricTrend(
  userId: string,
  metricKey: BodyMetricKey
): Promise<MetricTrendSummary> {
  const allLogs = await db
    .select()
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.userId, userId))
    .orderBy(bodyMeasurements.loggedOn); // Eskiden yeniye

  const validPoints: MetricTrendPoint[] = [];
  const values: number[] = [];

  for (const log of allLogs) {
    const val = log[metricKey];
    if (val != null && typeof val === 'number' && !isNaN(val)) {
      validPoints.push({
        clientUuid: log.clientUuid,
        dateStr: log.loggedOn,
        value: val,
      });
      values.push(val);
    }
  }

  if (validPoints.length === 0) {
    return {
      points: [],
      latestValue: null,
      previousValue: null,
      changeCm: null,
      minValue: 20,
      maxValue: 100,
    };
  }

  const latestValue = validPoints[validPoints.length - 1].value;
  const previousValue = validPoints.length > 1 ? validPoints[validPoints.length - 2].value : null;
  const changeCm =
    previousValue != null ? Math.round((latestValue - previousValue) * 10) / 10 : null;

  const minValue = Math.floor(Math.min(...values) - 2);
  const maxValue = Math.ceil(Math.max(...values) + 2);

  return {
    points: validPoints,
    latestValue,
    previousValue,
    changeCm,
    minValue: Math.max(0, minValue),
    maxValue: Math.max(minValue + 5, maxValue),
  };
}
