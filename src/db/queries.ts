import { and, desc, eq, like, or } from 'drizzle-orm';

import { estimate1RM } from '../lib/calculations';
import { db } from './client';
import { exercises, sessionExercises, sessionSets, workoutSessions } from './schema';

export type LocalExercise = typeof exercises.$inferSelect;

export async function searchLocalExercises(query: string, limit = 30): Promise<LocalExercise[]> {
  const q = query.trim();
  if (!q) return db.select().from(exercises).limit(limit);
  const pattern = `%${q}%`;
  return db
    .select()
    .from(exercises)
    .where(or(like(exercises.nameEn, pattern), like(exercises.nameTr, pattern)))
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
