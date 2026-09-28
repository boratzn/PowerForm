import { asc, eq } from 'drizzle-orm';

import { supabase } from '../lib/supabase';
import { db } from './client';
import {
  bodyWeightLogs,
  sessionExercises,
  sessionSets,
  syncMutations,
  workoutSessions,
} from './schema';

let isSyncing = false;

export async function drainSyncQueue(): Promise<{ processed: number; failed: number }> {
  if (isSyncing) return { processed: 0, failed: 0 };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId) return { processed: 0, failed: 0 };

  isSyncing = true;
  let processed = 0;
  let failed = 0;

  try {
    const mutations = await db
      .select()
      .from(syncMutations)
      .orderBy(asc(syncMutations.createdAt))
      .limit(30);

    for (const m of mutations) {
      if (m.attempts >= 5) {
        // 5 başarısız denemeden sonra atla
        continue;
      }

      const payload = typeof m.payload === 'string' ? JSON.parse(m.payload) : m.payload;
      let success = false;

      try {
        if (m.tableName === 'body_weight_logs') {
          if (m.operation === 'insert' || m.operation === 'update') {
            const { error } = await supabase.from('body_weight_logs').upsert(
              {
                user_id: userId,
                logged_on: payload.logged_on as string,
                weight_kg: Number(payload.weight_kg),
                source: 'manual',
              },
              { onConflict: 'user_id,logged_on' }
            );
            if (error) throw error;
            success = true;
          } else if (m.operation === 'delete') {
            // client_uuid üzerinden yerelde tarih bulunabilir veya direkt logged_on
            if (payload.logged_on) {
              const { error } = await supabase
                .from('body_weight_logs')
                .delete()
                .match({ user_id: userId, logged_on: payload.logged_on });
              if (error) throw error;
            }
            success = true;
          }
        } else if (m.tableName === 'workout_sessions') {
          const clientUuid = payload.client_uuid as string;

          if (m.operation === 'insert' || m.operation === 'update') {
            // Yerel seans verisini çek
            const localSession = await db
              .select()
              .from(workoutSessions)
              .where(eq(workoutSessions.clientUuid, clientUuid))
              .limit(1);

            if (localSession.length > 0) {
              const s = localSession[0];
              const { data: supaSession, error: sessErr } = await supabase
                .from('workout_sessions')
                .upsert(
                  {
                    client_uuid: s.clientUuid,
                    user_id: userId,
                    name: s.name,
                    status: s.status,
                    started_at: new Date(s.startedAt * 1000).toISOString(),
                    ended_at: s.endedAt ? new Date(s.endedAt * 1000).toISOString() : null,
                    bodyweight_kg: s.bodyweightKg,
                    perceived_effort: s.perceivedEffort,
                    notes: s.notes,
                    synced_at: new Date().toISOString(),
                  },
                  { onConflict: 'client_uuid' }
                )
                .select('id')
                .single();

              if (sessErr) throw sessErr;

              const supaSessionId = supaSession.id;

              // Seansın egzersizlerini ve setlerini Supabase'e aktar
              const localExercises = await db
                .select()
                .from(sessionExercises)
                .where(eq(sessionExercises.sessionClientUuid, clientUuid))
                .orderBy(sessionExercises.orderIndex);

              for (const ex of localExercises) {
                // Egzersiz id'si supabase'de var mı?
                const { data: supaEx, error: exErr } = await supabase
                  .from('session_exercises')
                  .upsert(
                    {
                      session_id: supaSessionId,
                      exercise_id: ex.exerciseId,
                      order_index: ex.orderIndex,
                      notes: ex.notes,
                    },
                    { onConflict: 'session_id,order_index' }
                  )
                  .select('id')
                  .single();

                if (exErr) throw exErr;

                const supaExId = supaEx.id;

                const localSets = await db
                  .select()
                  .from(sessionSets)
                  .where(eq(sessionSets.sessionExerciseClientUuid, ex.clientUuid))
                  .orderBy(sessionSets.setIndex);

                for (const st of localSets) {
                  const { error: setErr } = await supabase.from('session_sets').upsert({
                    id: st.clientUuid, // UUID
                    session_exercise_id: supaExId,
                    set_index: st.setIndex,
                    set_type: st.setType,
                    weight_kg: st.weightKg,
                    reps: st.reps,
                    rir: st.rir,
                    rpe: st.rpe,
                    duration_seconds: st.durationSeconds,
                    distance_m: st.distanceM,
                    is_completed: st.isCompleted,
                    completed_at: new Date(st.completedAt * 1000).toISOString(),
                  });

                  if (setErr) {
                    console.warn('[syncEngine] set upsert hatası:', setErr);
                  }
                }
              }

              // Yerelde senkron tarihini güncelle
              await db
                .update(workoutSessions)
                .set({ serverId: supaSessionId, syncedAt: Math.floor(Date.now() / 1000) })
                .where(eq(workoutSessions.clientUuid, clientUuid));

              success = true;
            } else {
              // Yerelde yoksa işlem tamam kabul edilir
              success = true;
            }
          } else if (m.operation === 'delete') {
            const { error: delErr } = await supabase
              .from('workout_sessions')
              .delete()
              .eq('client_uuid', clientUuid);
            if (delErr) throw delErr;
            success = true;
          }
        } else if (m.tableName === 'nutrition_entries') {
          const clientUuid = payload.client_uuid as string;

          if (m.operation === 'insert' || m.operation === 'update') {
            const { error } = await supabase.from('nutrition_entries').upsert(
              {
                user_id: userId,
                food_name_snapshot: payload.food_name_snapshot as string,
                meal: payload.meal as any,
                logged_on: payload.logged_on as string,
                quantity_g: Number(payload.quantity_g),
                serving_label: (payload.serving_label as string) ?? null,
                kcal: Number(payload.kcal),
                protein_g: Number(payload.protein_g ?? 0),
                carbs_g: Number(payload.carbs_g ?? 0),
                fat_g: Number(payload.fat_g ?? 0),
                entered_via: 'search',
                client_uuid: clientUuid,
              },
              { onConflict: 'client_uuid' }
            );
            if (error) throw error;
            success = true;
          } else if (m.operation === 'delete') {
            const { error } = await supabase
              .from('nutrition_entries')
              .delete()
              .eq('client_uuid', clientUuid);
            if (error) throw error;
            success = true;
          }
        } else {
          // Desteklenmeyen veya diğer tablolar için kuyruğu tıkamamak adına başarılı say
          success = true;
        }
      } catch (err: any) {
        console.warn(`[syncEngine] Mutasyon başarısız (${m.tableName}:${m.operation}):`, err);
        await db
          .update(syncMutations)
          .set({
            attempts: m.attempts + 1,
            lastError: err?.message ?? String(err),
          })
          .where(eq(syncMutations.id, m.id));
        failed++;
      }

      if (success) {
        await db.delete(syncMutations).where(eq(syncMutations.id, m.id));
        processed++;
      }
    }
  } finally {
    isSyncing = false;
  }

  return { processed, failed };
}
