import { eq } from 'drizzle-orm';
import { create } from 'zustand';

import { calculateVolume, estimate1RM } from '../lib/calculations';
import { generateUuid } from '../lib/uuid';
import { db } from '../db/client';
import { recordMutation } from '../db/mutations';
import { getBestE1RM, getLastPerformance, type LocalExercise } from '../db/queries';
import { sessionExercises, sessionSets, workoutSessions } from '../db/schema';

// Auth henüz bağlanmadı (bkz. PROGRESS.md) — gerçek supabase.auth.user().id gelene kadar
// yerel seansları tek bir sahte kullanıcıya bağlıyoruz. Auth akışı kurulunca bu sabit kalkacak.
const LOCAL_USER_ID = 'local-user';

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
};

type RestTimerState = {
  isRunning: boolean;
  secondsLeft: number;
  totalSeconds: number;
};

type SessionState = {
  sessionClientUuid: string | null;
  startedAt: number | null;
  exercises: ActiveExercise[];
  restTimer: RestTimerState;

  startSession: () => Promise<void>;
  addExercise: (exercise: LocalExercise) => Promise<void>;
  removeExercise: (exerciseClientUuid: string) => void;
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
  adjustRestTimer: (deltaSeconds: number) => void;
  skipRestTimer: () => void;
  endSession: () => Promise<{ durationSeconds: number; totalVolumeKg: number; prCount: number }>;
  reset: () => void;
};

const initialRestTimer: RestTimerState = { isRunning: false, secondsLeft: 0, totalSeconds: 0 };

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionClientUuid: null,
  startedAt: null,
  exercises: [],
  restTimer: initialRestTimer,

  // §12: yerel yazma önce SQLite'a, DB satırı seans başlar başlamaz oluşur —
  // uygulama seans ortasında kapanırsa/çökerse veri kaybolmaz.
  startSession: async () => {
    const clientUuid = generateUuid();
    const startedAt = Math.floor(Date.now() / 1000);
    await db.insert(workoutSessions).values({
      clientUuid,
      userId: LOCAL_USER_ID,
      status: 'in_progress',
      startedAt,
    });
    await recordMutation('workout_sessions', 'insert', { client_uuid: clientUuid, started_at: startedAt });
    set({ sessionClientUuid: clientUuid, startedAt, exercises: [], restTimer: initialRestTimer });
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
    };
    set({ exercises: [...exercises, newExercise] });
  },

  removeExercise: (exerciseClientUuid) => {
    set({ exercises: get().exercises.filter((e) => e.clientUuid !== exerciseClientUuid) });
    // DB satırı bilerek silinmiyor — kullanıcı yanlışlıkla hareket kaldırırsa seans geçmişinde
    // "boş" bir egzersiz kartı kalması, sessizce veri kaybından daha güvenli bir varsayılan.
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

    await db.insert(sessionSets).values({
      clientUuid: draftSet.clientUuid,
      sessionExerciseClientUuid: exercise.clientUuid,
      setIndex: draftSet.setIndex,
      setType: 'normal',
      weightKg: draftSet.weightKg,
      reps: draftSet.reps,
      rir: draftSet.rir,
      isCompleted: true,
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

    set({ restTimer: { isRunning: true, secondsLeft: DEFAULT_REST_SECONDS, totalSeconds: DEFAULT_REST_SECONDS } });
  },

  // §10.2 kural 8: her şey geri alınabilir. Uzun basma bunu tetikler (bkz. SetRow.tsx).
  reopenSet: (exerciseClientUuid, setClientUuid) => {
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
    const next = restTimer.secondsLeft - 1;
    if (next <= 0) {
      set({ restTimer: { ...restTimer, isRunning: false, secondsLeft: 0 } });
      return;
    }
    set({ restTimer: { ...restTimer, secondsLeft: next } });
  },

  adjustRestTimer: (deltaSeconds) => {
    const { restTimer } = get();
    set({ restTimer: { ...restTimer, secondsLeft: Math.max(0, restTimer.secondsLeft + deltaSeconds) } });
  },

  skipRestTimer: () => set({ restTimer: { ...get().restTimer, isRunning: false, secondsLeft: 0 } }),

  endSession: async () => {
    const { sessionClientUuid, startedAt, exercises } = get();
    if (!sessionClientUuid || !startedAt) throw new Error('endSession: aktif seans yok');

    const endedAt = Math.floor(Date.now() / 1000);
    await db.update(workoutSessions).set({ status: 'completed', endedAt }).where(eq(workoutSessions.clientUuid, sessionClientUuid));
    await recordMutation('workout_sessions', 'update', { client_uuid: sessionClientUuid, status: 'completed', ended_at: endedAt });

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
