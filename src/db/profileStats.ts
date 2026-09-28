import { and, desc, eq, inArray } from 'drizzle-orm';

import { calculateVolume, computeStreakDays, dateKey, estimate1RM } from '../lib/calculations';
import { db } from './client';
import { exercises, sessionExercises, sessionSets, workoutSessions } from './schema';

export type LifetimeStats = {
  totalSessions: number;
  totalVolumeKg: number;
  totalDurationSeconds: number;
  streakDays: number;
  topPRs: {
    exerciseId: string;
    nameEn: string;
    nameTr: string | null;
    equipment: string;
    maxWeightKg: number;
    bestE1RM: number;
    reps: number;
    achievedAt: number;
  }[];
};

export async function getLifetimeStats(userId: string): Promise<LifetimeStats> {
  const completedSessions = await db
    .select({
      clientUuid: workoutSessions.clientUuid,
      startedAt: workoutSessions.startedAt,
      endedAt: workoutSessions.endedAt,
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, 'completed')))
    .orderBy(desc(workoutSessions.startedAt));

  if (completedSessions.length === 0) {
    return {
      totalSessions: 0,
      totalVolumeKg: 0,
      totalDurationSeconds: 0,
      streakDays: 0,
      topPRs: [],
    };
  }

  const sessionDateKeys = new Set(
    completedSessions.map((s) => dateKey(new Date(s.startedAt * 1000)))
  );
  const streakDays = computeStreakDays(sessionDateKeys);

  let totalDurationSeconds = 0;
  for (const s of completedSessions) {
    if (s.endedAt && s.endedAt > s.startedAt) {
      totalDurationSeconds += s.endedAt - s.startedAt;
    }
  }

  // Tüm tamamlanmış setleri çek
  const rows = await db
    .select({
      exerciseId: sessionExercises.exerciseId,
      weightKg: sessionSets.weightKg,
      reps: sessionSets.reps,
      rir: sessionSets.rir,
      completedAt: sessionSets.completedAt,
    })
    .from(sessionSets)
    .innerJoin(
      sessionExercises,
      eq(sessionExercises.clientUuid, sessionSets.sessionExerciseClientUuid)
    )
    .innerJoin(
      workoutSessions,
      eq(workoutSessions.clientUuid, sessionExercises.sessionClientUuid)
    )
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(sessionSets.isCompleted, true),
        eq(workoutSessions.status, 'completed')
      )
    );

  let totalVolumeKg = 0;
  const bestByExercise = new Map<
    string,
    { maxWeightKg: number; bestE1RM: number; reps: number; achievedAt: number }
  >();

  for (const r of rows) {
    totalVolumeKg += calculateVolume(r.weightKg, r.reps);

    if (r.weightKg == null || r.reps == null || r.weightKg <= 0 || r.reps <= 0) continue;
    const e1rm = estimate1RM(r.weightKg, r.reps, r.rir);
    const existing = bestByExercise.get(r.exerciseId);

    if (!existing || e1rm > existing.bestE1RM) {
      bestByExercise.set(r.exerciseId, {
        maxWeightKg: r.weightKg,
        bestE1RM: Math.round(e1rm * 10) / 10,
        reps: r.reps,
        achievedAt: r.completedAt,
      });
    }
  }

  const exIds = Array.from(bestByExercise.keys());
  let topPRs: LifetimeStats['topPRs'] = [];

  if (exIds.length > 0) {
    const exRows = await db
      .select({
        id: exercises.id,
        nameEn: exercises.nameEn,
        nameTr: exercises.nameTr,
        equipment: exercises.equipment,
      })
      .from(exercises)
      .where(inArray(exercises.id, exIds));

    topPRs = exRows
      .map((ex) => {
        const pr = bestByExercise.get(ex.id)!;
        return {
          exerciseId: ex.id,
          nameEn: ex.nameEn,
          nameTr: ex.nameTr,
          equipment: ex.equipment,
          maxWeightKg: pr.maxWeightKg,
          bestE1RM: pr.bestE1RM,
          reps: pr.reps,
          achievedAt: pr.achievedAt,
        };
      })
      .sort((a, b) => b.bestE1RM - a.bestE1RM)
      .slice(0, 8);
  }

  return {
    totalSessions: completedSessions.length,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalDurationSeconds,
    streakDays,
    topPRs,
  };
}
