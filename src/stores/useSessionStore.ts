import { and, desc, eq } from 'drizzle-orm';
import { Vibration } from 'react-native';
import { create } from 'zustand';

import { calculateVolume, estimate1RM } from '../lib/calculations';
import { cancelRestEndNotification, scheduleRestEndNotification } from '../lib/restNotification';
import { generateUuid } from '../lib/uuid';
import { db } from '../db/client';
import { recordMutation } from '../db/mutations';
import { getProgramDayExercises } from '../db/programs';
import { getBestE1RM, getExerciseById, getLastPerformance, type LocalExercise } from '../db/queries';
import { programDays, programs, sessionExercises, sessionSets, workoutSessions } from '../db/schema';
import { drainSyncQueue } from '../db/syncEngine';
import { useAuthStore } from './useAuthStore';

const DEFAULT_REST_SECONDS = 90;

export type ActiveSet = {
  clientUuid: string;
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  isCompleted: boolean;
  isPr: boolean;
};

export type ActiveExercise = {
  clientUuid: string;
  exerciseId: string;
  nameEn: string;
  nameTr: string | null;
  trackingType: LocalExercise['trackingType'];
  notes: string;
  sets: ActiveSet[];
  lastPerformance: { setIndex: number; weightKg: number | null; reps: number | null; rir: number | null }[];
  runningBestE1RM: number; // seans başlamadan önceki PR + bu seansta şimdiye kadar kırılanlar
  restSeconds?: number | null;
};

export type RestTimerState = {
  isRunning: boolean;
  secondsLeft: number;
  totalSeconds: number;
  targetEndTime: number | null;
  exerciseName?: string | null;
};

export type InitialExerciseInput = {
  exerciseId: string;
  targetSets: number;
  targetRir?: number | null;
  repMin?: number | null;
  repMax?: number | null;
  restSeconds?: number | null;
};

export type StartSessionOptions = {
  programId?: string;
  programDayId?: string;
  sessionName?: string;
  initialExercises?: InitialExerciseInput[];
};

type SessionState = {
  sessionClientUuid: string | null;
  startedAt: number | null;
  exercises: ActiveExercise[];
  restTimer: RestTimerState;

  startSession: (opts?: StartSessionOptions) => Promise<void>;
  hydrateActiveSession: () => Promise<void>;
  resumeOrStartSession: (opts?: StartSessionOptions) => Promise<void>;
  addExercise: (exercise: LocalExercise) => Promise<void>;
  removeExercise: (exerciseClientUuid: string) => void;
  updateExerciseNotes: (exerciseClientUuid: string, notes: string) => Promise<void>;
  addSet: (exerciseClientUuid: string) => void;
  updateDraftSet: (
    exerciseClientUuid: string,
    setClientUuid: string,
    patch: Partial<Pick<ActiveSet, 'weightKg' | 'reps' | 'rir'>>
  ) => void;
  confirmSet: (exerciseClientUuid: string, setClientUuid: string) => Promise<void>;
  reopenSet: (exerciseClientUuid: string, setClientUuid: string) => void;
  deleteSet: (exerciseClientUuid: string, setClientUuid: string) => Promise<void>;
  tickRestTimer: () => void;
  syncRestTimer: () => void;
  adjustRestTimer: (deltaSeconds: number) => void;
  skipRestTimer: () => void;
  endSession: () => Promise<{ durationSeconds: number; totalVolumeKg: number; prCount: number }>;
  reset: () => void;
};

const initialRestTimer: RestTimerState = {
  isRunning: false,
  secondsLeft: 0,
  totalSeconds: 0,
  targetEndTime: null,
  exerciseName: null,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionClientUuid: null,
  startedAt: null,
  exercises: [],
  restTimer: initialRestTimer,

  // §12: yerel yazma önce SQLite'a, DB satırı seans başlar başlamaz oluşur —
  // uygulama seans ortasında kapanırsa/çökerse veri kaybolmaz.
  startSession: async (opts?: StartSessionOptions) => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) throw new Error('startSession: aktif oturum yok');

    let sessionName = opts?.sessionName || null;
    if (!sessionName && opts?.programDayId) {
      try {
        const dayRows = await db
          .select()
          .from(programDays)
          .where(eq(programDays.clientUuid, opts.programDayId))
          .limit(1);
        const dayRow = dayRows[0];
        if (dayRow) {
          if (opts.programId) {
            const progRows = await db
              .select()
              .from(programs)
              .where(eq(programs.clientUuid, opts.programId))
              .limit(1);
            sessionName = progRows[0] ? `${progRows[0].name} - ${dayRow.name}` : dayRow.name;
          } else {
            sessionName = dayRow.name;
          }
        }
      } catch (e) {
        console.warn('Program adı çözülemedi:', e);
      }
    }

    const clientUuid = generateUuid();
    const startedAt = Math.floor(Date.now() / 1000);
    await db.insert(workoutSessions).values({
      clientUuid,
      userId,
      programId: opts?.programId ?? null,
      programDayId: opts?.programDayId ?? null,
      name: sessionName,
      status: 'in_progress',
      startedAt,
    });
    await recordMutation('workout_sessions', 'insert', {
      client_uuid: clientUuid,
      program_id: opts?.programId ?? null,
      program_day_id: opts?.programDayId ?? null,
      name: sessionName,
      started_at: startedAt,
    });

    const activeExercises: ActiveExercise[] = [];
    if (opts?.initialExercises && opts.initialExercises.length > 0) {
      for (let orderIndex = 0; orderIndex < opts.initialExercises.length; orderIndex++) {
        const item = opts.initialExercises[orderIndex];
        const exerciseMeta = await getExerciseById(item.exerciseId);
        if (!exerciseMeta) continue;

        const exClientUuid = generateUuid();
        await db.insert(sessionExercises).values({
          clientUuid: exClientUuid,
          sessionClientUuid: clientUuid,
          exerciseId: exerciseMeta.id,
          orderIndex,
        });
        await recordMutation('session_exercises', 'insert', {
          client_uuid: exClientUuid,
          session_client_uuid: clientUuid,
          exercise_id: exerciseMeta.id,
          order_index: orderIndex,
        });

        const [lastPerformance, bestE1RM] = await Promise.all([
          getLastPerformance(exerciseMeta.id),
          getBestE1RM(exerciseMeta.id),
        ]);

        const setCount = Math.max(1, item.targetSets);
        const sets: ActiveSet[] = [];
        for (let sIdx = 0; sIdx < setCount; sIdx++) {
          const past = lastPerformance[sIdx];
          sets.push({
            clientUuid: generateUuid(),
            setIndex: sIdx + 1,
            weightKg: past?.weightKg ?? null,
            reps: past?.reps ?? (item.repMin ?? item.repMax ?? null),
            rir: past?.rir ?? (item.targetRir ?? null),
            isCompleted: false,
            isPr: false,
          });
        }

        activeExercises.push({
          clientUuid: exClientUuid,
          exerciseId: exerciseMeta.id,
          nameEn: exerciseMeta.nameEn,
          nameTr: exerciseMeta.nameTr,
          trackingType: exerciseMeta.trackingType,
          notes: '',
          sets,
          lastPerformance,
          runningBestE1RM: bestE1RM,
          restSeconds: item.restSeconds ?? null,
        });
      }
    }

    set({ sessionClientUuid: clientUuid, startedAt, exercises: activeExercises, restTimer: initialRestTimer });
  },

  // Uygulama öldürülüp yeniden açılırsa (ör. bildirim, işletim sistemi arka plan
  // temizliği) yarım kalan bir seans DB'de `status='in_progress'` olarak kalır ama bu
  // store'un in-memory state'i sıfırlanmış olur — bu fonksiyon o satırı bulup store'u
  // ondan yeniden kurar. Zaten aktif bir seans varsa (get().sessionClientUuid dolu)
  // dokunmadan çıkar — aksi halde bu seansın kendi `isPr` bayraklarını (DB'de hiç
  // saklanmıyor, bkz. ActiveSet) sıfırlayarak üzerine yazardı.
  hydrateActiveSession: async () => {
    if (get().sessionClientUuid) return;

    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) return;

    const activeRows = await db
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, 'in_progress')))
      .orderBy(desc(workoutSessions.startedAt))
      .limit(1);
    const activeSession = activeRows[0];
    if (!activeSession) return;

    const exerciseRows = await db
      .select()
      .from(sessionExercises)
      .where(eq(sessionExercises.sessionClientUuid, activeSession.clientUuid))
      .orderBy(sessionExercises.orderIndex);

    const programExs = activeSession.programDayId
      ? await getProgramDayExercises(activeSession.programDayId)
      : [];
    const restMap = new Map(programExs.map((pe) => [pe.exerciseId, pe.restSeconds]));

    const hydratedExercises: ActiveExercise[] = [];
    for (const exRow of exerciseRows) {
      const exerciseMeta = await getExerciseById(exRow.exerciseId);
      // Egzersiz senkron sırasında id değiştiyse (bkz. syncExercises.ts, slug üzerinden
      // upsert) eski id artık hiçbir satıra karşılık gelmeyebilir — bu satırı atla,
      // kullanıcı elle yeniden ekleyebilir.
      if (!exerciseMeta) continue;

      const setRows = await db
        .select()
        .from(sessionSets)
        .where(eq(sessionSets.sessionExerciseClientUuid, exRow.clientUuid))
        .orderBy(sessionSets.setIndex);

      const [lastPerformance, bestE1RM] = await Promise.all([
        getLastPerformance(exRow.exerciseId),
        getBestE1RM(exRow.exerciseId),
      ]);

      hydratedExercises.push({
        clientUuid: exRow.clientUuid,
        exerciseId: exRow.exerciseId,
        nameEn: exerciseMeta.nameEn,
        nameTr: exerciseMeta.nameTr,
        trackingType: exerciseMeta.trackingType,
        notes: exRow.notes ?? '',
        sets: setRows.map((s) => ({
          clientUuid: s.clientUuid,
          setIndex: s.setIndex,
          weightKg: s.weightKg,
          reps: s.reps,
          rir: s.rir,
          isCompleted: s.isCompleted,
          isPr: false,
        })),
        lastPerformance,
        runningBestE1RM: bestE1RM,
        restSeconds: restMap.get(exRow.exerciseId) ?? null,
      });
    }

    const currentRest = get().restTimer;
    set({
      sessionClientUuid: activeSession.clientUuid,
      startedAt: activeSession.startedAt,
      exercises: hydratedExercises,
      restTimer: currentRest.isRunning ? currentRest : initialRestTimer,
    });
  },

  resumeOrStartSession: async (opts?: StartSessionOptions) => {
    await get().hydrateActiveSession();
    if (!get().sessionClientUuid) await get().startSession(opts);
  },

  addExercise: async (exercise) => {
    const { sessionClientUuid, exercises } = get();
    if (!sessionClientUuid) throw new Error('addExercise: aktif seans yok');

    const clientUuid = generateUuid();
    const orderIndex = exercises.length;
    await db.insert(sessionExercises).values({
      clientUuid,
      sessionClientUuid,
      exerciseId: exercise.id,
      orderIndex,
    });
    await recordMutation('session_exercises', 'insert', {
      client_uuid: clientUuid,
      session_client_uuid: sessionClientUuid,
      exercise_id: exercise.id,
      order_index: orderIndex,
    });

    const [lastPerformance, bestE1RM] = await Promise.all([
      getLastPerformance(exercise.id),
      getBestE1RM(exercise.id),
    ]);

    // §10.2 kural 3: "geçen seferki değer önceden doldurulmuş olsun" — ilk set, geçmiş
    // varsa geçen seferin 1. setiyle önceden dolu gelir (boş alan doldurmak yerine
    // onaylamak 3 kat hızlı).
    const firstPast = lastPerformance[0];
    const newExercise: ActiveExercise = {
      clientUuid,
      exerciseId: exercise.id,
      nameEn: exercise.nameEn,
      nameTr: exercise.nameTr,
      trackingType: exercise.trackingType,
      notes: '',
      sets: [
        {
          clientUuid: generateUuid(),
          setIndex: 1,
          weightKg: firstPast?.weightKg ?? null,
          reps: firstPast?.reps ?? null,
          rir: firstPast?.rir ?? null,
          isCompleted: false,
          isPr: false,
        },
      ],
      lastPerformance,
      runningBestE1RM: bestE1RM,
      restSeconds: DEFAULT_REST_SECONDS,
    };
    set({ exercises: [...exercises, newExercise] });
  },

  removeExercise: (exerciseClientUuid) => {
    set({ exercises: get().exercises.filter((e) => e.clientUuid !== exerciseClientUuid) });
    // DB satırı bilerek silinmiyor — kullanıcı yanlışlıkla hareket kaldırırsa seans geçmişinde
    // "boş" bir egzersiz kartı kalması, sessizce veri kaybından daha güvenli bir varsayılan.
  },

  updateExerciseNotes: async (exerciseClientUuid, notes) => {
    set({
      exercises: get().exercises.map((ex) =>
        ex.clientUuid === exerciseClientUuid ? { ...ex, notes } : ex
      ),
    });

    try {
      await db
        .update(sessionExercises)
        .set({ notes })
        .where(eq(sessionExercises.clientUuid, exerciseClientUuid));
    } catch (err) {
      console.error('[useSessionStore] updateExerciseNotes DB hatası:', err);
    }
  },

  addSet: (exerciseClientUuid) => {
    set({
      exercises: get().exercises.map((ex) => {
        if (ex.clientUuid !== exerciseClientUuid) return ex;
        const nextIndex = ex.sets.length + 1;
        const prevSet = ex.sets[ex.sets.length - 1];
        // Öncelik 1: geçen seferki AYNI set numarası (§10.2 kural 3).
        // Öncelik 2 (geçmiş yoksa): bu seansta bir önceki ONAYLANMIŞ set.
        const past = ex.lastPerformance.find((p) => p.setIndex === nextIndex);
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              clientUuid: generateUuid(),
              setIndex: nextIndex,
              weightKg: past?.weightKg ?? (prevSet?.isCompleted ? prevSet.weightKg : null),
              reps: past?.reps ?? null,
              rir: past?.rir ?? (prevSet?.isCompleted ? prevSet.rir : null),
              isCompleted: false,
              isPr: false,
            },
          ],
        };
      }),
    });
  },

  updateDraftSet: (exerciseClientUuid, setClientUuid, patch) => {
    set({
      exercises: get().exercises.map((ex) => {
        if (ex.clientUuid !== exerciseClientUuid) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.clientUuid === setClientUuid ? { ...s, ...patch } : s)),
        };
      }),
    });
  },

  confirmSet: async (exerciseClientUuid, setClientUuid) => {
    const state = get();
    const exercise = state.exercises.find((e) => e.clientUuid === exerciseClientUuid);
    const draftSet = exercise?.sets.find((s) => s.clientUuid === setClientUuid);
    if (!exercise || !draftSet || draftSet.reps == null) return;

    const e1rm = estimate1RM(draftSet.weightKg ?? 0, draftSet.reps, draftSet.rir);
    const isPr = e1rm > exercise.runningBestE1RM && e1rm > 0;

    await db
      .insert(sessionSets)
      .values({
        clientUuid: draftSet.clientUuid,
        sessionExerciseClientUuid: exercise.clientUuid,
        setIndex: draftSet.setIndex,
        setType: 'normal',
        weightKg: draftSet.weightKg,
        reps: draftSet.reps,
        rir: draftSet.rir,
        isCompleted: true,
      })
      .onConflictDoUpdate({
        target: sessionSets.clientUuid,
        set: {
          weightKg: draftSet.weightKg,
          reps: draftSet.reps,
          rir: draftSet.rir,
          isCompleted: true,
        },
      });
    await recordMutation('session_sets', 'insert', {
      client_uuid: draftSet.clientUuid,
      session_exercise_client_uuid: exercise.clientUuid,
      set_index: draftSet.setIndex,
      weight_kg: draftSet.weightKg,
      reps: draftSet.reps,
      rir: draftSet.rir,
    });

    set({
      exercises: state.exercises.map((ex) =>
        ex.clientUuid !== exerciseClientUuid
          ? ex
          : {
              ...ex,
              runningBestE1RM: isPr ? e1rm : ex.runningBestE1RM,
              sets: ex.sets.map((s) => (s.clientUuid === setClientUuid ? { ...s, isCompleted: true, isPr } : s)),
            }
      ),
    });

    const restSec =
      exercise.restSeconds && exercise.restSeconds > 0
        ? exercise.restSeconds
        : DEFAULT_REST_SECONDS;
    const targetEndTime = Date.now() + restSec * 1000;
    const exerciseDisplayName = exercise.nameTr || exercise.nameEn || 'Sıradaki Set';

    set({
      restTimer: {
        isRunning: true,
        secondsLeft: restSec,
        totalSeconds: restSec,
        targetEndTime,
        exerciseName: exerciseDisplayName,
      },
    });

    scheduleRestEndNotification(restSec, exerciseDisplayName).catch(() => {});
  },

  // §10.2 kural 8: her şey geri alınabilir. Uzun basma bunu tetikler (bkz. SetRow.tsx).
  reopenSet: (exerciseClientUuid, setClientUuid) => {
    db.update(sessionSets)
      .set({ isCompleted: false })
      .where(eq(sessionSets.clientUuid, setClientUuid))
      .catch(() => {});
    set({
      exercises: get().exercises.map((ex) =>
        ex.clientUuid !== exerciseClientUuid
          ? ex
          : { ...ex, sets: ex.sets.map((s) => (s.clientUuid === setClientUuid ? { ...s, isCompleted: false, isPr: false } : s)) }
      ),
    });
  },

  deleteSet: async (exerciseClientUuid, setClientUuid) => {
    await db.delete(sessionSets).where(eq(sessionSets.clientUuid, setClientUuid));
    await recordMutation('session_sets', 'delete', { client_uuid: setClientUuid });
    set({
      exercises: get().exercises.map((ex) => {
        if (ex.clientUuid !== exerciseClientUuid) return ex;
        const remaining = ex.sets.filter((s) => s.clientUuid !== setClientUuid);
        return { ...ex, sets: remaining.map((s, i) => ({ ...s, setIndex: i + 1 })) };
      }),
    });
  },

  tickRestTimer: () => {
    const { restTimer } = get();
    if (!restTimer.isRunning) return;
    if (restTimer.targetEndTime) {
      const remaining = Math.max(0, Math.ceil((restTimer.targetEndTime - Date.now()) / 1000));
      if (remaining <= 0) {
        set({ restTimer: { ...restTimer, isRunning: false, secondsLeft: 0, targetEndTime: null } });
        Vibration.vibrate([0, 500, 200, 500]);
        cancelRestEndNotification().catch(() => {});
        return;
      }
      set({ restTimer: { ...restTimer, secondsLeft: remaining } });
    } else {
      const next = restTimer.secondsLeft - 1;
      if (next <= 0) {
        set({ restTimer: { ...restTimer, isRunning: false, secondsLeft: 0, targetEndTime: null } });
        Vibration.vibrate([0, 500, 200, 500]);
        cancelRestEndNotification().catch(() => {});
        return;
      }
      set({ restTimer: { ...restTimer, secondsLeft: next } });
    }
  },

  syncRestTimer: () => {
    const { restTimer } = get();
    if (!restTimer.isRunning || !restTimer.targetEndTime) return;
    const remaining = Math.max(0, Math.ceil((restTimer.targetEndTime - Date.now()) / 1000));
    if (remaining <= 0) {
      set({ restTimer: { ...restTimer, isRunning: false, secondsLeft: 0, targetEndTime: null } });
      Vibration.vibrate([0, 500, 200, 500]);
      cancelRestEndNotification().catch(() => {});
    } else {
      set({ restTimer: { ...restTimer, secondsLeft: remaining } });
    }
  },

  adjustRestTimer: (deltaSeconds) => {
    const { restTimer } = get();
    if (!restTimer.isRunning) return;
    const newSeconds = Math.max(5, restTimer.secondsLeft + deltaSeconds);
    const newTarget = Date.now() + newSeconds * 1000;
    set({
      restTimer: {
        ...restTimer,
        secondsLeft: newSeconds,
        totalSeconds: Math.max(restTimer.totalSeconds, newSeconds),
        targetEndTime: newTarget,
      },
    });
    scheduleRestEndNotification(newSeconds, restTimer.exerciseName || 'Antrenman').catch(() => {});
  },

  skipRestTimer: () => {
    cancelRestEndNotification().catch(() => {});
    set({ restTimer: { ...get().restTimer, isRunning: false, secondsLeft: 0, targetEndTime: null } });
  },

  endSession: async () => {
    const { sessionClientUuid, startedAt, exercises } = get();
    if (!sessionClientUuid || !startedAt) throw new Error('endSession: aktif seans yok');

    const endedAt = Math.floor(Date.now() / 1000);
    await db.update(workoutSessions).set({ status: 'completed', endedAt }).where(eq(workoutSessions.clientUuid, sessionClientUuid));
    await recordMutation('workout_sessions', 'update', { client_uuid: sessionClientUuid, status: 'completed', ended_at: endedAt });

    // Arka planda senkronu tetikle
    drainSyncQueue().catch((err) => console.warn('[useSessionStore] Senkron hatası:', err));

    let totalVolumeKg = 0;
    let prCount = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (!s.isCompleted) continue;
        totalVolumeKg += calculateVolume(s.weightKg, s.reps);
        if (s.isPr) prCount++;
      }
    }

    return { durationSeconds: endedAt - startedAt, totalVolumeKg, prCount };
  },

  reset: () => set({ sessionClientUuid: null, startedAt: null, exercises: [], restTimer: initialRestTimer }),
}));
