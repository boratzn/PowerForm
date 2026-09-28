import { and, desc, eq, inArray, like, or } from 'drizzle-orm';

import { calculateVolume, computeStreakDays, dateKey, estimate1RM, startOfWeek } from '../lib/calculations';
import { db } from './client';
import { exercises, sessionExercises, sessionSets, workoutSessions } from './schema';

export type LocalExercise = typeof exercises.$inferSelect;

export async function searchLocalExercises(
  query: string,
  limit = 30,
  equipment?: string | null
): Promise<LocalExercise[]> {
  const q = query.trim();
  const textFilter = q ? or(like(exercises.nameEn, `%${q}%`), like(exercises.nameTr, `%${q}%`)) : undefined;
  const equipmentFilter = equipment ? eq(exercises.equipment, equipment) : undefined;
  const where = and(textFilter, equipmentFilter);

  return db
    .select()
    .from(exercises)
    .where(where)
    .limit(limit);
}

export async function getExerciseById(id: string): Promise<LocalExercise | undefined> {
  const rows = await db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
  return rows[0];
}

export type PastSet = { setIndex: number; weightKg: number | null; reps: number | null; rir: number | null };

// "Geçen sefer" placeholder verisi (§10.2 kural 3): bu egzersizin en son TAMAMLANMIŞ
// seansındaki normal setleri döner. İlk kullanımda (geçmiş yok) boş dizi döner —
// ekran bunu boş placeholder olarak gösterir, hata değildir.
export async function getLastPerformance(exerciseId: string): Promise<PastSet[]> {
  const lastSession = await db
    .select({ sessionExerciseClientUuid: sessionExercises.clientUuid, startedAt: workoutSessions.startedAt })
    .from(sessionExercises)
    .innerJoin(workoutSessions, eq(workoutSessions.clientUuid, sessionExercises.sessionClientUuid))
    .where(and(eq(sessionExercises.exerciseId, exerciseId), eq(workoutSessions.status, 'completed')))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);

  const match = lastSession[0];
  if (!match) return [];

  const sets = await db
    .select({ setIndex: sessionSets.setIndex, weightKg: sessionSets.weightKg, reps: sessionSets.reps, rir: sessionSets.rir })
    .from(sessionSets)
    .where(
      and(
        eq(sessionSets.sessionExerciseClientUuid, match.sessionExerciseClientUuid),
        eq(sessionSets.setType, 'normal'),
        eq(sessionSets.isCompleted, true)
      )
    )
    .orderBy(sessionSets.setIndex);

  return sets;
}

// Bu egzersiz için şimdiye kadarki en iyi e1RM (RIR-düzeltmeli, bkz. calculations.ts).
// PR anında kutlama (§10.2 kural 7) için: yeni set bunu geçerse PR'dır.
export async function getBestE1RM(exerciseId: string): Promise<number> {
  const rows = await db
    .select({ weightKg: sessionSets.weightKg, reps: sessionSets.reps, rir: sessionSets.rir })
    .from(sessionSets)
    .innerJoin(sessionExercises, eq(sessionExercises.clientUuid, sessionSets.sessionExerciseClientUuid))
    .innerJoin(workoutSessions, eq(workoutSessions.clientUuid, sessionExercises.sessionClientUuid))
    .where(
      and(
        eq(sessionExercises.exerciseId, exerciseId),
        eq(sessionSets.setType, 'normal'),
        eq(sessionSets.isCompleted, true)
      )
    );

  let best = 0;
  for (const r of rows) {
    if (r.weightKg == null || r.reps == null) continue;
    const e1rm = estimate1RM(r.weightKg, r.reps, r.rir);
    if (e1rm > best) best = e1rm;
  }
  return best;
}

export type ExerciseHistoryEntry = {
  sessionClientUuid: string;
  sessionName: string | null;
  startedAt: number;
  dateStr: string;
  maxWeightKg: number;
  totalVolumeKg: number;
  bestE1RM: number;
  setCount: number;
  sets: {
    setIndex: number;
    weightKg: number | null;
    reps: number | null;
    rir: number | null;
    e1rm: number;
  }[];
};

export async function getExerciseHistory(exerciseId: string, limit = 15): Promise<ExerciseHistoryEntry[]> {
  const sessions = await db
    .select({
      sessionClientUuid: workoutSessions.clientUuid,
      sessionName: workoutSessions.name,
      startedAt: workoutSessions.startedAt,
      sessionExerciseClientUuid: sessionExercises.clientUuid,
    })
    .from(sessionExercises)
    .innerJoin(workoutSessions, eq(workoutSessions.clientUuid, sessionExercises.sessionClientUuid))
    .where(and(eq(sessionExercises.exerciseId, exerciseId), eq(workoutSessions.status, 'completed')))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(limit);

  if (sessions.length === 0) return [];

  const results: ExerciseHistoryEntry[] = [];
  for (const s of sessions) {
    const sets = await db
      .select({
        setIndex: sessionSets.setIndex,
        weightKg: sessionSets.weightKg,
        reps: sessionSets.reps,
        rir: sessionSets.rir,
      })
      .from(sessionSets)
      .where(and(eq(sessionSets.sessionExerciseClientUuid, s.sessionExerciseClientUuid), eq(sessionSets.isCompleted, true)))
      .orderBy(sessionSets.setIndex);

    let maxWeight = 0;
    let volume = 0;
    let bestE1RM = 0;

    const formattedSets = sets.map((st) => {
      const w = st.weightKg ?? 0;
      const r = st.reps ?? 0;
      const vol = calculateVolume(st.weightKg, st.reps);
      const e1rm = estimate1RM(w, r, st.rir);
      if (w > maxWeight) maxWeight = w;
      volume += vol;
      if (e1rm > bestE1RM) bestE1RM = e1rm;
      return {
        setIndex: st.setIndex,
        weightKg: st.weightKg,
        reps: st.reps,
        rir: st.rir,
        e1rm: Math.round(e1rm * 10) / 10,
      };
    });

    results.push({
      sessionClientUuid: s.sessionClientUuid,
      sessionName: s.sessionName,
      startedAt: s.startedAt,
      dateStr: dateKey(new Date(s.startedAt * 1000)),
      maxWeightKg: maxWeight,
      totalVolumeKg: Math.round(volume),
      bestE1RM: Math.round(bestE1RM * 10) / 10,
      setCount: sets.length,
      sets: formattedSets,
    });
  }

  return results;
}

export type TodaySummary = {
  lastCompleted: { startedAt: number; endedAt: number | null; volumeKg: number; setCount: number } | null;
  streakDays: number;
  weekSessionCount: number;
};

// "Bugün" ekranının hero kartı ve istatistik şeridi için — SADECE tamamlanmış seanslara
// bakar (in_progress olan bir seansın "devam et" durumu useSessionStore'daki in-memory
// state'ten geliyor; uygulama öldürülüp açılsa bile useSessionStore.hydrateActiveSession
// bunu DB'den geri yükleyip store'u dolduruyor — bkz. app/_layout.tsx).
export async function getTodaySummary(userId: string): Promise<TodaySummary> {
  const completed = await db
    .select({ clientUuid: workoutSessions.clientUuid, startedAt: workoutSessions.startedAt, endedAt: workoutSessions.endedAt })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, 'completed')))
    .orderBy(desc(workoutSessions.startedAt));

  if (completed.length === 0) return { lastCompleted: null, streakDays: 0, weekSessionCount: 0 };

  const last = completed[0];
  const lastSets = await db
    .select({ weightKg: sessionSets.weightKg, reps: sessionSets.reps })
    .from(sessionSets)
    .innerJoin(sessionExercises, eq(sessionExercises.clientUuid, sessionSets.sessionExerciseClientUuid))
    .where(
      and(
        eq(sessionExercises.sessionClientUuid, last.clientUuid),
        eq(sessionSets.setType, 'normal'),
        eq(sessionSets.isCompleted, true)
      )
    );
  const volumeKg = lastSets.reduce((sum, s) => sum + calculateVolume(s.weightKg, s.reps), 0);

  const sessionDateKeys = new Set(completed.map((s) => dateKey(new Date(s.startedAt * 1000))));
  const streakDays = computeStreakDays(sessionDateKeys);

  const weekStartMs = startOfWeek(new Date()).getTime();
  const weekSessionCount = completed.filter((s) => s.startedAt * 1000 >= weekStartMs).length;

  return {
    lastCompleted: { startedAt: last.startedAt, endedAt: last.endedAt, volumeKg, setCount: lastSets.length },
    streakDays,
    weekSessionCount,
  };
}

export type WeeklyHighlights = {
  prCount: number;
  thisWeekVolumeKg: number;
  lastWeekVolumeKg: number;
};

// "Bu hafta" kartı: bu hafta kaç kişisel rekor kırıldı + geçen haftaya göre hacim trendi.
// PR'lar DB'de saklanmıyor (sadece bir oturumun in-memory ActiveSet.isPr'ı, bkz.
// useSessionStore.ts) — bu yüzden TÜM geçmiş, kronolojik sırayla (completedAt artan) tek
// seferde taranıp her egzersiz için "o ana kadarki en iyi e1RM" takip edilerek hangi
// setlerin ANINDA yeni rekor olduğu yeniden hesaplanıyor.
export async function getWeeklyHighlights(userId: string): Promise<WeeklyHighlights> {
  const thisWeekStartMs = startOfWeek(new Date()).getTime();
  const lastWeekStartMs = thisWeekStartMs - 7 * 24 * 60 * 60 * 1000;

  const rows = await db
    .select({
      exerciseId: sessionExercises.exerciseId,
      completedAt: sessionSets.completedAt,
      weightKg: sessionSets.weightKg,
      reps: sessionSets.reps,
      rir: sessionSets.rir,
    })
    .from(sessionSets)
    .innerJoin(sessionExercises, eq(sessionExercises.clientUuid, sessionSets.sessionExerciseClientUuid))
    .innerJoin(workoutSessions, eq(workoutSessions.clientUuid, sessionExercises.sessionClientUuid))
    .where(and(eq(workoutSessions.userId, userId), eq(sessionSets.setType, 'normal'), eq(sessionSets.isCompleted, true)))
    .orderBy(sessionSets.completedAt);

  const bestByExercise = new Map<string, number>();
  let prCount = 0;
  let thisWeekVolumeKg = 0;
  let lastWeekVolumeKg = 0;

  for (const r of rows) {
    const completedAtMs = r.completedAt * 1000;
    const volume = calculateVolume(r.weightKg, r.reps);
    if (completedAtMs >= thisWeekStartMs) thisWeekVolumeKg += volume;
    else if (completedAtMs >= lastWeekStartMs) lastWeekVolumeKg += volume;

    if (r.weightKg == null || r.reps == null) continue;
    const e1rm = estimate1RM(r.weightKg, r.reps, r.rir);
    const prevBest = bestByExercise.get(r.exerciseId) ?? 0;
    if (e1rm > prevBest && e1rm > 0) {
      bestByExercise.set(r.exerciseId, e1rm);
      if (completedAtMs >= thisWeekStartMs) prCount++;
    }
  }

  return { prCount, thisWeekVolumeKg, lastWeekVolumeKg };
}

export type MuscleGroupVolume = { muscleGroupId: string; volumeKg: number };

// "Çalışılan kaslar" kartı: son `sinceMs`'den bu yana loglanan setlerin hacmini
// egzersizlerin `primaryMuscles`'ına (bkz. syncExercises.ts) dağıtır. Bir egzersizin
// birden fazla ana kası varsa set hacmi HER birine tam olarak sayılır (yerel şemada
// exercise_muscles.volume_factor'a karşılık gelen bir ağırlıklandırma yok) — bu yüzden
// sonuç "kabaca hangi kaslara ağırlık verildi" göstergesidir, kesin bilimsel hacim değil.
export async function getMuscleGroupBreakdown(userId: string, sinceMs: number, limit = 3): Promise<MuscleGroupVolume[]> {
  const rows = await db
    .select({
      exerciseId: sessionExercises.exerciseId,
      weightKg: sessionSets.weightKg,
      reps: sessionSets.reps,
      completedAt: sessionSets.completedAt,
    })
    .from(sessionSets)
    .innerJoin(sessionExercises, eq(sessionExercises.clientUuid, sessionSets.sessionExerciseClientUuid))
    .innerJoin(workoutSessions, eq(workoutSessions.clientUuid, sessionExercises.sessionClientUuid))
    .where(and(eq(workoutSessions.userId, userId), eq(sessionSets.setType, 'normal'), eq(sessionSets.isCompleted, true)));

  const recent = rows.filter((r) => r.completedAt * 1000 >= sinceMs);
  if (recent.length === 0) return [];

  const exerciseIds = [...new Set(recent.map((r) => r.exerciseId))];
  const exerciseRows = await db
    .select({ id: exercises.id, primaryMuscles: exercises.primaryMuscles })
    .from(exercises)
    .where(inArray(exercises.id, exerciseIds));
  const musclesByExerciseId = new Map(exerciseRows.map((e) => [e.id, e.primaryMuscles ?? []]));

  const volumeByMuscle = new Map<string, number>();
  for (const r of recent) {
    const volume = calculateVolume(r.weightKg, r.reps);
    if (volume <= 0) continue;
    for (const muscleGroupId of musclesByExerciseId.get(r.exerciseId) ?? []) {
      volumeByMuscle.set(muscleGroupId, (volumeByMuscle.get(muscleGroupId) ?? 0) + volume);
    }
  }

  return [...volumeByMuscle.entries()]
    .map(([muscleGroupId, volumeKg]) => ({ muscleGroupId, volumeKg }))
    .sort((a, b) => b.volumeKg - a.volumeKg)
    .slice(0, limit);
}
