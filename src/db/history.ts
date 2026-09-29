import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { calculateVolume, dateKey, estimate1RM } from '../lib/calculations';
import { db } from './client';
import { exercises, programDays, programs, sessionExercises, sessionSets, workoutSessions } from './schema';
import { recordMutation } from './mutations';

export type HistorySessionSummary = {
  clientUuid: string;
  name: string | null;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number;
  totalVolumeKg: number;
  totalSets: number;
  exerciseCount: number;
  exerciseNames: string[];
  perceivedEffort: number | null;
  prCount: number;
  dateStr: string; // YYYY-MM-DD
};

export type SessionDetailView = {
  clientUuid: string;
  name: string | null;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number;
  totalVolumeKg: number;
  totalSets: number;
  perceivedEffort: number | null;
  notes: string | null;
  exercises: {
    clientUuid: string;
    exerciseId: string;
    orderIndex: number;
    nameEn: string;
    nameTr: string | null;
    equipment: string;
    imageUrl: string | null;
    gifUrl: string | null;
    primaryMuscles: string[] | null;
    notes: string | null;
    sets: {
      clientUuid: string;
      setIndex: number;
      setType: string;
      weightKg: number | null;
      reps: number | null;
      rir: number | null;
      rpe: number | null;
      isCompleted: boolean;
      estimated1RM: number | null;
    }[];
  }[];
};

export async function getWorkoutHistory(userId: string): Promise<HistorySessionSummary[]> {
  const sessions = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, 'completed')))
    .orderBy(desc(workoutSessions.startedAt));

  if (sessions.length === 0) return [];

  const sessionUuids = sessions.map((s) => s.clientUuid);

  // Tüm egzersizleri çek
  const exRows = await db
    .select({
      sessionClientUuid: sessionExercises.sessionClientUuid,
      exerciseId: sessionExercises.exerciseId,
      nameEn: exercises.nameEn,
      nameTr: exercises.nameTr,
    })
    .from(sessionExercises)
    .leftJoin(exercises, eq(sessionExercises.exerciseId, exercises.id))
    .where(inArray(sessionExercises.sessionClientUuid, sessionUuids))
    .orderBy(sessionExercises.orderIndex);

  // Tüm tamamlanmış setleri çek
  const setRows = await db
    .select({
      sessionClientUuid: sessionExercises.sessionClientUuid,
      exerciseId: sessionExercises.exerciseId,
      weightKg: sessionSets.weightKg,
      reps: sessionSets.reps,
      completedAt: sessionSets.completedAt,
    })
    .from(sessionSets)
    .innerJoin(sessionExercises, eq(sessionExercises.clientUuid, sessionSets.sessionExerciseClientUuid))
    .where(and(inArray(sessionExercises.sessionClientUuid, sessionUuids), eq(sessionSets.isCompleted, true)));

  // Oturum bazında grupla
  const exBySession = new Map<string, string[]>();
  for (const r of exRows) {
    const list = exBySession.get(r.sessionClientUuid) ?? [];
    const displayName = r.nameTr || r.nameEn || 'Egzersiz';
    if (!list.includes(displayName)) list.push(displayName);
    exBySession.set(r.sessionClientUuid, list);
  }

  const volumeBySession = new Map<string, number>();
  const setCountBySession = new Map<string, number>();
  for (const s of setRows) {
    const vol = calculateVolume(s.weightKg, s.reps);
    volumeBySession.set(s.sessionClientUuid, (volumeBySession.get(s.sessionClientUuid) ?? 0) + vol);
    setCountBySession.set(s.sessionClientUuid, (setCountBySession.get(s.sessionClientUuid) ?? 0) + 1);
  }

  // Oturumların eksik isimlerini program_days ve programs üzerinden tamamla
  const dayUuids = Array.from(new Set(sessions.map((s) => s.programDayId).filter((id): id is string => !!id)));
  const progUuids = Array.from(new Set(sessions.map((s) => s.programId).filter((id): id is string => !!id)));

  const dayMap = new Map<string, string>();
  if (dayUuids.length > 0) {
    const dRows = await db.select().from(programDays).where(inArray(programDays.clientUuid, dayUuids));
    for (const d of dRows) dayMap.set(d.clientUuid, d.name);
  }

  const progMap = new Map<string, string>();
  if (progUuids.length > 0) {
    const pRows = await db.select().from(programs).where(inArray(programs.clientUuid, progUuids));
    for (const p of pRows) progMap.set(p.clientUuid, p.name);
  }

  return sessions.map((sess) => {
    let resolvedName = sess.name;
    if (!resolvedName && sess.programDayId) {
      const dName = dayMap.get(sess.programDayId);
      const pName = sess.programId ? progMap.get(sess.programId) : null;
      if (dName && pName) resolvedName = `${pName} - ${dName}`;
      else if (dName) resolvedName = dName;
      else if (pName) resolvedName = pName;

      // Otomatik olarak SQLite'taki boş kaydı da onar
      if (resolvedName) {
        db.update(workoutSessions)
          .set({ name: resolvedName })
          .where(eq(workoutSessions.clientUuid, sess.clientUuid))
          .catch(() => {});
      }
    }

    const duration =
      sess.endedAt && sess.endedAt > sess.startedAt ? sess.endedAt - sess.startedAt : 0;
    const exNames = exBySession.get(sess.clientUuid) ?? [];

    return {
      clientUuid: sess.clientUuid,
      name: resolvedName,
      startedAt: sess.startedAt,
      endedAt: sess.endedAt,
      durationSeconds: duration,
      totalVolumeKg: Math.round(volumeBySession.get(sess.clientUuid) ?? 0),
      totalSets: setCountBySession.get(sess.clientUuid) ?? 0,
      exerciseCount: exNames.length,
      exerciseNames: exNames,
      perceivedEffort: sess.perceivedEffort,
      prCount: 0,
      dateStr: dateKey(new Date(sess.startedAt * 1000)),
    };
  });
}

export async function getSessionDetail(sessionClientUuid: string): Promise<SessionDetailView | null> {
  const sessRows = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.clientUuid, sessionClientUuid))
    .limit(1);

  if (sessRows.length === 0) return null;
  const sess = sessRows[0];

  let resolvedSessionName = sess.name;
  if (!resolvedSessionName && sess.programDayId) {
    try {
      const dRows = await db
        .select()
        .from(programDays)
        .where(eq(programDays.clientUuid, sess.programDayId))
        .limit(1);
      if (dRows[0]) {
        if (sess.programId) {
          const pRows = await db
            .select()
            .from(programs)
            .where(eq(programs.clientUuid, sess.programId))
            .limit(1);
          resolvedSessionName = pRows[0] ? `${pRows[0].name} - ${dRows[0].name}` : dRows[0].name;
        } else {
          resolvedSessionName = dRows[0].name;
        }
        if (resolvedSessionName) {
          db.update(workoutSessions)
            .set({ name: resolvedSessionName })
            .where(eq(workoutSessions.clientUuid, sess.clientUuid))
            .catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Seans adı çözülemedi:', e);
    }
  }

  const exRows = await db
    .select({
      se: sessionExercises,
      nameEn: exercises.nameEn,
      nameTr: exercises.nameTr,
      equipment: exercises.equipment,
      imageUrl: exercises.imageUrl,
      gifUrl: exercises.gifUrl,
      primaryMuscles: exercises.primaryMuscles,
    })
    .from(sessionExercises)
    .leftJoin(exercises, eq(sessionExercises.exerciseId, exercises.id))
    .where(eq(sessionExercises.sessionClientUuid, sessionClientUuid))
    .orderBy(sessionExercises.orderIndex);

  let totalVolumeKg = 0;
  let totalSets = 0;

  const resultExercises: SessionDetailView['exercises'] = [];

  for (const item of exRows) {
    const sets = await db
      .select()
      .from(sessionSets)
      .where(eq(sessionSets.sessionExerciseClientUuid, item.se.clientUuid))
      .orderBy(sessionSets.setIndex);

    const formattedSets = sets.map((s) => {
      const e1rm =
        s.weightKg != null && s.reps != null ? estimate1RM(s.weightKg, s.reps, s.rir) : null;
      if (s.isCompleted) {
        totalVolumeKg += calculateVolume(s.weightKg, s.reps);
        totalSets++;
      }
      return {
        clientUuid: s.clientUuid,
        setIndex: s.setIndex,
        setType: s.setType,
        weightKg: s.weightKg,
        reps: s.reps,
        rir: s.rir,
        rpe: s.rpe,
        isCompleted: s.isCompleted,
        estimated1RM: e1rm ? Math.round(e1rm * 10) / 10 : null,
      };
    });

    resultExercises.push({
      clientUuid: item.se.clientUuid,
      exerciseId: item.se.exerciseId,
      orderIndex: item.se.orderIndex,
      nameEn: item.nameEn ?? 'Bilinmeyen Egzersiz',
      nameTr: item.nameTr,
      equipment: item.equipment ?? 'other',
      imageUrl: item.imageUrl,
      gifUrl: item.gifUrl,
      primaryMuscles: item.primaryMuscles,
      notes: item.se.notes ?? null,
      sets: formattedSets,
    });
  }

  const durationSeconds =
    sess.endedAt && sess.endedAt > sess.startedAt ? sess.endedAt - sess.startedAt : 0;

  return {
    clientUuid: sess.clientUuid,
    name: resolvedSessionName,
    startedAt: sess.startedAt,
    endedAt: sess.endedAt,
    durationSeconds,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalSets,
    perceivedEffort: sess.perceivedEffort,
    notes: sess.notes,
    exercises: resultExercises,
  };
}

export async function deleteWorkoutSession(sessionClientUuid: string): Promise<void> {
  await db.delete(workoutSessions).where(eq(workoutSessions.clientUuid, sessionClientUuid));
  await recordMutation('workout_sessions', 'delete', { client_uuid: sessionClientUuid });
}
