import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { dateKey, estimate1RM } from '../lib/calculations';
import { db } from './client';
import {
  bodyWeightLogs,
  exercises,
  nutritionEntries,
  nutritionTargets,
  sessionExercises,
  sessionSets,
  workoutSessions,
} from './schema';

export type ExerciseProgressItem = {
  exerciseId: string;
  name: string;
  nameTr: string | null;
  equipment: string;
  currentWeekTopWeightKg: number;
  currentWeekTopReps: number;
  currentWeekEstimated1RM: number;
  currentWeekTotalSets: number;
  previousWeekTopWeightKg: number | null;
  previousWeekEstimated1RM: number | null;
  status: 'progressing' | 'plateau' | 'regressing' | 'new';
  deltaWeightKg: number;
  delta1RMKg: number;
};

export type WeeklyCoachData = {
  periodLabel: string;
  startDateStr: string;
  endDateStr: string;
  workoutSummary: {
    totalSessions: number;
    totalVolumeKg: number;
    totalSets: number;
    exercises: ExerciseProgressItem[];
    plateauExercises: ExerciseProgressItem[];
    progressingExercises: ExerciseProgressItem[];
  };
  weightSummary: {
    currentWeekAvgKg: number | null;
    previousWeekAvgKg: number | null;
    weeklyChangeKg: number | null;
    logsCount: number;
  };
  nutritionSummary: {
    targetKcal: number | null;
    targetProteinG: number | null;
    avgDailyKcal: number | null;
    avgDailyProteinG: number | null;
    loggedDaysCount: number;
  };
};

export async function getWeeklyCoachData(userId: string): Promise<WeeklyCoachData> {
  const now = new Date();
  const nowSec = Math.floor(now.getTime() / 1000);
  const sevenDaysAgoSec = nowSec - 7 * 24 * 60 * 60;
  const fourteenDaysAgoSec = nowSec - 14 * 24 * 60 * 60;

  const todayStr = dateKey(now);
  const sevenDaysAgoStr = dateKey(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
  const fourteenDaysAgoStr = dateKey(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000));

  // 1. Antrenman Seanslarını Çek (Son 14 gün)
  const allSessions = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, 'completed'),
        gte(workoutSessions.startedAt, fourteenDaysAgoSec)
      )
    )
    .orderBy(desc(workoutSessions.startedAt));

  const currentWeekSessions = allSessions.filter((s) => s.startedAt >= sevenDaysAgoSec);
  const previousWeekSessions = allSessions.filter(
    (s) => s.startedAt >= fourteenDaysAgoSec && s.startedAt < sevenDaysAgoSec
  );

  // Egzersiz performans haritası
  const exerciseMap: Record<
    string,
    {
      name: string;
      nameTr: string | null;
      equipment: string;
      currentSets: { weightKg: number; reps: number; e1RM: number }[];
      previousSets: { weightKg: number; reps: number; e1RM: number }[];
    }
  > = {};

  // Seans egzersizlerini ve setlerini topla
  const sessionIds = allSessions.map((s) => s.clientUuid);
  let totalVolumeKg = 0;
  let totalSets = 0;

  if (sessionIds.length > 0) {
    const sExercises = await db
      .select({
        sessionExClientUuid: sessionExercises.clientUuid,
        sessionClientUuid: sessionExercises.sessionClientUuid,
        exerciseId: sessionExercises.exerciseId,
        nameEn: exercises.nameEn,
        nameTr: exercises.nameTr,
        equipment: exercises.equipment,
      })
      .from(sessionExercises)
      .innerJoin(exercises, eq(sessionExercises.exerciseId, exercises.id));

    const sSets = await db
      .select()
      .from(sessionSets)
      .where(eq(sessionSets.isCompleted, true));

    const sessionStartMap: Record<string, number> = {};
    for (const s of allSessions) {
      sessionStartMap[s.clientUuid] = s.startedAt;
    }

    const setsByExerciseMap: Record<string, typeof sSets> = {};
    for (const st of sSets) {
      if (!setsByExerciseMap[st.sessionExerciseClientUuid]) {
        setsByExerciseMap[st.sessionExerciseClientUuid] = [];
      }
      setsByExerciseMap[st.sessionExerciseClientUuid].push(st);
    }

    for (const se of sExercises) {
      const sessionStartedAt = sessionStartMap[se.sessionClientUuid];
      if (!sessionStartedAt) continue;

      const isCurrentWeek = sessionStartedAt >= sevenDaysAgoSec;
      const sets = setsByExerciseMap[se.sessionExClientUuid] || [];

      if (!exerciseMap[se.exerciseId]) {
        exerciseMap[se.exerciseId] = {
          name: se.nameEn,
          nameTr: se.nameTr,
          equipment: se.equipment,
          currentSets: [],
          previousSets: [],
        };
      }

      for (const st of sets) {
        const w = st.weightKg || 0;
        const r = st.reps || 0;
        const e1RM = estimate1RM(w, r, st.rir ?? null);

        if (isCurrentWeek) {
          totalVolumeKg += w * r;
          totalSets += 1;
          exerciseMap[se.exerciseId].currentSets.push({ weightKg: w, reps: r, e1RM });
        } else {
          exerciseMap[se.exerciseId].previousSets.push({ weightKg: w, reps: r, e1RM });
        }
      }
    }
  }

  // Egzersiz bazlı gelişim & plato hesapla
  const exerciseProgressList: ExerciseProgressItem[] = [];

  for (const [exId, data] of Object.entries(exerciseMap)) {
    if (data.currentSets.length === 0) continue;

    // Bu haftaki en iyi set
    let curTopW = 0;
    let curTopR = 0;
    let curTopE1RM = 0;

    for (const s of data.currentSets) {
      if (s.e1RM > curTopE1RM) {
        curTopE1RM = s.e1RM;
        curTopW = s.weightKg;
        curTopR = s.reps;
      }
    }

    // Önceki haftaki en iyi set
    let prevTopW: number | null = null;
    let prevTopE1RM: number | null = null;

    if (data.previousSets.length > 0) {
      let pE1RM = 0;
      let pW = 0;
      for (const s of data.previousSets) {
        if (s.e1RM > pE1RM) {
          pE1RM = s.e1RM;
          pW = s.weightKg;
        }
      }
      prevTopW = pW;
      prevTopE1RM = pE1RM;
    }

    let status: 'progressing' | 'plateau' | 'regressing' | 'new' = 'new';
    let deltaW = 0;
    let delta1RM = 0;

    if (prevTopW !== null && prevTopE1RM !== null) {
      deltaW = Math.round((curTopW - prevTopW) * 10) / 10;
      delta1RM = Math.round((curTopE1RM - prevTopE1RM) * 10) / 10;

      if (delta1RM >= 1.5 || deltaW >= 1.5) {
        status = 'progressing';
      } else if (delta1RM <= -2.5 || deltaW <= -2.5) {
        status = 'regressing';
      } else {
        status = 'plateau';
      }
    }

    exerciseProgressList.push({
      exerciseId: exId,
      name: data.name,
      nameTr: data.nameTr,
      equipment: data.equipment,
      currentWeekTopWeightKg: curTopW,
      currentWeekTopReps: curTopR,
      currentWeekEstimated1RM: Math.round(curTopE1RM * 10) / 10,
      currentWeekTotalSets: data.currentSets.length,
      previousWeekTopWeightKg: prevTopW,
      previousWeekEstimated1RM: prevTopE1RM ? Math.round(prevTopE1RM * 10) / 10 : null,
      status,
      deltaWeightKg: deltaW,
      delta1RMKg: delta1RM,
    });
  }

  const progressingExercises = exerciseProgressList.filter((e) => e.status === 'progressing');
  const plateauExercises = exerciseProgressList.filter((e) => e.status === 'plateau');

  // 2. Kilo Verilerini Çek (Son 14 gün)
  const weightLogs = await db
    .select()
    .from(bodyWeightLogs)
    .where(
      and(
        eq(bodyWeightLogs.userId, userId),
        gte(bodyWeightLogs.loggedOn, fourteenDaysAgoStr)
      )
    )
    .orderBy(desc(bodyWeightLogs.loggedOn));

  const curWeights = weightLogs.filter((w) => w.loggedOn >= sevenDaysAgoStr);
  const prevWeights = weightLogs.filter(
    (w) => w.loggedOn >= fourteenDaysAgoStr && w.loggedOn < sevenDaysAgoStr
  );

  const curAvgWeight =
    curWeights.length > 0
      ? Math.round((curWeights.reduce((acc, c) => acc + c.weightKg, 0) / curWeights.length) * 10) / 10
      : null;

  const prevAvgWeight =
    prevWeights.length > 0
      ? Math.round((prevWeights.reduce((acc, c) => acc + c.weightKg, 0) / prevWeights.length) * 10) / 10
      : null;

  const weeklyChangeKg =
    curAvgWeight !== null && prevAvgWeight !== null
      ? Math.round((curAvgWeight - prevAvgWeight) * 10) / 10
      : null;

  // 3. Beslenme Verilerini Çek (Son 7 gün)
  const targetRow = await db
    .select()
    .from(nutritionTargets)
    .where(eq(nutritionTargets.userId, userId))
    .limit(1);

  const nutEntries = await db
    .select()
    .from(nutritionEntries)
    .where(
      and(
        eq(nutritionEntries.userId, userId),
        gte(nutritionEntries.loggedOn, sevenDaysAgoStr)
      )
    );

  const daysSet = new Set<string>();
  let totalKcal = 0;
  let totalProtein = 0;

  for (const n of nutEntries) {
    daysSet.add(n.loggedOn);
    totalKcal += n.kcal;
    totalProtein += n.proteinG;
  }

  const loggedDaysCount = daysSet.size;
  const avgDailyKcal = loggedDaysCount > 0 ? Math.round(totalKcal / loggedDaysCount) : null;
  const avgDailyProteinG = loggedDaysCount > 0 ? Math.round(totalProtein / loggedDaysCount) : null;

  return {
    periodLabel: `${sevenDaysAgoStr} – ${todayStr}`,
    startDateStr: sevenDaysAgoStr,
    endDateStr: todayStr,
    workoutSummary: {
      totalSessions: currentWeekSessions.length,
      totalVolumeKg: Math.round(totalVolumeKg),
      totalSets,
      exercises: exerciseProgressList,
      plateauExercises,
      progressingExercises,
    },
    weightSummary: {
      currentWeekAvgKg: curAvgWeight,
      previousWeekAvgKg: prevAvgWeight,
      weeklyChangeKg,
      logsCount: curWeights.length,
    },
    nutritionSummary: {
      targetKcal: targetRow[0]?.kcal ?? null,
      targetProteinG: targetRow[0]?.proteinG ?? null,
      avgDailyKcal,
      avgDailyProteinG,
      loggedDaysCount,
    },
  };
}
