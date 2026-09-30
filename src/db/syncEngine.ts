import { asc, eq } from 'drizzle-orm';

import { supabase } from '../lib/supabase';
import { db } from './client';
import {
  bodyMeasurements,
  bodyWeightLogs,
  nutritionEntries,
  nutritionTargets,
  programDays,
  programExercises,
  programs,
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
        } else if (m.tableName === 'body_measurements') {
          if (m.operation === 'insert' || m.operation === 'update') {
            const { error } = await supabase.from('body_measurements').upsert(
              {
                user_id: userId,
                logged_on: payload.logged_on as string,
                neck_cm: payload.neck_cm != null ? Number(payload.neck_cm) : null,
                shoulder_cm: payload.shoulder_cm != null ? Number(payload.shoulder_cm) : null,
                chest_cm: payload.chest_cm != null ? Number(payload.chest_cm) : null,
                waist_cm: payload.waist_cm != null ? Number(payload.waist_cm) : null,
                hip_cm: payload.hip_cm != null ? Number(payload.hip_cm) : null,
                arm_left_cm: payload.arm_left_cm != null ? Number(payload.arm_left_cm) : null,
                arm_right_cm: payload.arm_right_cm != null ? Number(payload.arm_right_cm) : null,
                forearm_cm: payload.forearm_cm != null ? Number(payload.forearm_cm) : null,
                thigh_cm: payload.thigh_cm != null ? Number(payload.thigh_cm) : null,
                calf_cm: payload.calf_cm != null ? Number(payload.calf_cm) : null,
              },
              { onConflict: 'user_id,logged_on' }
            );
            if (error) throw error;
            success = true;
          } else if (m.operation === 'delete') {
            if (payload.logged_on) {
              const { error } = await supabase
                .from('body_measurements')
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

let isPulling = false;

/**
 * Kullanıcı başka bir cihazdan giriş yaptığında veya uygulamayı silip yeniden
 * yüklediğinde, Supabase bulutundaki antrenman geçmişini, vücut ağırlıklarını,
 * beslenme kayıtlarını ve programlarını yerel SQLite veritabanına aktarır.
 */
export async function pullUserDataFromSupabase(targetUserId?: string): Promise<{
  sessionsCount: number;
  weightsCount: number;
  nutritionCount: number;
}> {
  if (isPulling) return { sessionsCount: 0, weightsCount: 0, nutritionCount: 0 };

  let userId = targetUserId;
  if (!userId) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    userId = session?.user?.id;
  }
  if (!userId) return { sessionsCount: 0, weightsCount: 0, nutritionCount: 0 };

  isPulling = true;
  let sessionsCount = 0;
  let weightsCount = 0;
  let nutritionCount = 0;

  try {
    // 1. Antrenman Seansları ve Bağlı Egzersizler / Setler
    const { data: supaSessions, error: sessErr } = await supabase
      .from('workout_sessions')
      .select(`
        id,
        client_uuid,
        user_id,
        program_id,
        program_day_id,
        name,
        status,
        started_at,
        ended_at,
        bodyweight_kg,
        perceived_effort,
        notes,
        synced_at,
        created_at,
        session_exercises (
          id,
          exercise_id,
          order_index,
          notes,
          session_sets (
            id,
            set_index,
            set_type,
            weight_kg,
            reps,
            rir,
            rpe,
            duration_seconds,
            distance_m,
            is_completed,
            completed_at
          )
        )
      `)
      .eq('user_id', userId);

    if (!sessErr && supaSessions) {
      for (const s of supaSessions) {
        const clientUuid = s.client_uuid || s.id;
        const startedAt = Math.floor(new Date(s.started_at).getTime() / 1000);
        const endedAt = s.ended_at ? Math.floor(new Date(s.ended_at).getTime() / 1000) : null;
        const createdAt = s.created_at
          ? Math.floor(new Date(s.created_at).getTime() / 1000)
          : startedAt;
        const syncedAt = s.synced_at
          ? Math.floor(new Date(s.synced_at).getTime() / 1000)
          : Math.floor(Date.now() / 1000);

        await db
          .insert(workoutSessions)
          .values({
            clientUuid,
            serverId: s.id,
            userId: s.user_id,
            programId: s.program_id,
            programDayId: s.program_day_id,
            name: s.name,
            status: (s.status as any) || 'completed',
            startedAt,
            endedAt,
            bodyweightKg: s.bodyweight_kg ? Number(s.bodyweight_kg) : null,
            perceivedEffort: s.perceived_effort,
            notes: s.notes,
            syncedAt,
            createdAt,
          })
          .onConflictDoUpdate({
            target: workoutSessions.clientUuid,
            set: {
              serverId: s.id,
              status: (s.status as any) || 'completed',
              name: s.name,
              startedAt,
              endedAt,
              bodyweightKg: s.bodyweight_kg ? Number(s.bodyweight_kg) : null,
              perceivedEffort: s.perceived_effort,
              notes: s.notes,
              syncedAt,
            },
          });

        if (Array.isArray(s.session_exercises)) {
          for (const ex of s.session_exercises) {
            await db
              .insert(sessionExercises)
              .values({
                clientUuid: ex.id,
                sessionClientUuid: clientUuid,
                exerciseId: ex.exercise_id,
                orderIndex: ex.order_index,
                notes: ex.notes,
              })
              .onConflictDoNothing();

            if (Array.isArray(ex.session_sets)) {
              for (const st of ex.session_sets) {
                const completedAt = st.completed_at
                  ? Math.floor(new Date(st.completed_at).getTime() / 1000)
                  : startedAt;

                await db
                  .insert(sessionSets)
                  .values({
                    clientUuid: st.id,
                    sessionExerciseClientUuid: ex.id,
                    setIndex: st.set_index,
                    setType: (st.set_type as any) || 'normal',
                    weightKg: st.weight_kg != null ? Number(st.weight_kg) : null,
                    reps: st.reps,
                    rir: st.rir,
                    rpe: st.rpe != null ? Number(st.rpe) : null,
                    durationSeconds: st.duration_seconds,
                    distanceM: st.distance_m != null ? Number(st.distance_m) : null,
                    isCompleted: st.is_completed ?? true,
                    completedAt,
                  })
                  .onConflictDoNothing();
              }
            }
          }
        }
        sessionsCount++;
      }
    }

    // 2. Kilo Kayıtları (Body Weight Logs)
    const { data: supaWeights, error: weightErr } = await supabase
      .from('body_weight_logs')
      .select('*')
      .eq('user_id', userId);

    if (!weightErr && supaWeights) {
      for (const w of supaWeights) {
        const createdAt = w.created_at
          ? Math.floor(new Date(w.created_at).getTime() / 1000)
          : Math.floor(Date.now() / 1000);

        await db
          .insert(bodyWeightLogs)
          .values({
            clientUuid: w.id,
            userId: w.user_id,
            loggedOn: w.logged_on,
            weightKg: Number(w.weight_kg),
            syncedAt: Math.floor(Date.now() / 1000),
            createdAt,
          })
          .onConflictDoUpdate({
            target: [bodyWeightLogs.userId, bodyWeightLogs.loggedOn],
            set: {
              weightKg: Number(w.weight_kg),
              syncedAt: Math.floor(Date.now() / 1000),
            },
          });
        weightsCount++;
      }
    }

    // 2.1 Vücut Ölçüleri (Body Measurements)
    const { data: supaMeasurements, error: measErr } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId);

    if (!measErr && supaMeasurements) {
      for (const m of supaMeasurements) {
        const createdAt = m.created_at
          ? Math.floor(new Date(m.created_at).getTime() / 1000)
          : Math.floor(Date.now() / 1000);

        await db
          .insert(bodyMeasurements)
          .values({
            clientUuid: m.id,
            userId: m.user_id,
            loggedOn: m.logged_on,
            neckCm: m.neck_cm != null ? Number(m.neck_cm) : null,
            shoulderCm: m.shoulder_cm != null ? Number(m.shoulder_cm) : null,
            chestCm: m.chest_cm != null ? Number(m.chest_cm) : null,
            waistCm: m.waist_cm != null ? Number(m.waist_cm) : null,
            hipCm: m.hip_cm != null ? Number(m.hip_cm) : null,
            armLeftCm: m.arm_left_cm != null ? Number(m.arm_left_cm) : null,
            armRightCm: m.arm_right_cm != null ? Number(m.arm_right_cm) : null,
            forearmCm: m.forearm_cm != null ? Number(m.forearm_cm) : null,
            thighCm: m.thigh_cm != null ? Number(m.thigh_cm) : null,
            calfCm: m.calf_cm != null ? Number(m.calf_cm) : null,
            syncedAt: Math.floor(Date.now() / 1000),
            createdAt,
          })
          .onConflictDoUpdate({
            target: [bodyMeasurements.userId, bodyMeasurements.loggedOn],
            set: {
              neckCm: m.neck_cm != null ? Number(m.neck_cm) : null,
              shoulderCm: m.shoulder_cm != null ? Number(m.shoulder_cm) : null,
              chestCm: m.chest_cm != null ? Number(m.chest_cm) : null,
              waistCm: m.waist_cm != null ? Number(m.waist_cm) : null,
              hipCm: m.hip_cm != null ? Number(m.hip_cm) : null,
              armLeftCm: m.arm_left_cm != null ? Number(m.arm_left_cm) : null,
              armRightCm: m.arm_right_cm != null ? Number(m.arm_right_cm) : null,
              forearmCm: m.forearm_cm != null ? Number(m.forearm_cm) : null,
              thighCm: m.thigh_cm != null ? Number(m.thigh_cm) : null,
              calfCm: m.calf_cm != null ? Number(m.calf_cm) : null,
              syncedAt: Math.floor(Date.now() / 1000),
            },
          });
      }
    }

    // 3. Beslenme Kayıtları (Nutrition Entries)
    const { data: supaNutr, error: nutrErr } = await supabase
      .from('nutrition_entries')
      .select('*')
      .eq('user_id', userId);

    if (!nutrErr && supaNutr) {
      for (const n of supaNutr) {
        const clientUuid = n.client_uuid || n.id;
        const createdAt = n.created_at
          ? Math.floor(new Date(n.created_at).getTime() / 1000)
          : Math.floor(Date.now() / 1000);

        await db
          .insert(nutritionEntries)
          .values({
            clientUuid,
            serverId: n.id,
            userId: n.user_id,
            foodId: n.food_id,
            loggedOn: n.logged_on,
            meal: (n.meal as any) || 'snack',
            foodNameSnapshot: n.food_name_snapshot,
            quantityG: Number(n.quantity_g),
            servingLabel: n.serving_label,
            kcal: Number(n.kcal),
            proteinG: Number(n.protein_g ?? 0),
            carbsG: Number(n.carbs_g ?? 0),
            fatG: Number(n.fat_g ?? 0),
            createdAt,
          })
          .onConflictDoUpdate({
            target: nutritionEntries.clientUuid,
            set: {
              serverId: n.id,
              quantityG: Number(n.quantity_g),
              kcal: Number(n.kcal),
              proteinG: Number(n.protein_g ?? 0),
              carbsG: Number(n.carbs_g ?? 0),
              fatG: Number(n.fat_g ?? 0),
            },
          });
        nutritionCount++;
      }
    }

    // 4. Beslenme Hedefleri (Nutrition Targets)
    const { data: targets, error: targetErr } = await supabase
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', userId)
      .order('effective_from', { ascending: false })
      .limit(1);

    if (!targetErr && targets && targets.length > 0) {
      const t = targets[0];
      await db
        .insert(nutritionTargets)
        .values({
          id: t.id,
          userId: t.user_id,
          kcal: t.kcal,
          proteinG: t.protein_g,
          carbsG: t.carbs_g,
          fatG: t.fat_g,
          tdeeEstimate: t.tdee_estimate,
        })
        .onConflictDoUpdate({
          target: nutritionTargets.userId,
          set: {
            kcal: t.kcal,
            proteinG: t.protein_g,
            carbsG: t.carbs_g,
            fatG: t.fat_g,
            tdeeEstimate: t.tdee_estimate,
          },
        });
    }

    // 5. Programlar (Programs & Program Days & Program Exercises)
    const { data: progs, error: progErr } = await supabase
      .from('programs')
      .select(`
        id,
        user_id,
        name,
        description,
        goal,
        days_per_week,
        duration_weeks,
        status,
        is_template,
        started_at,
        created_at,
        updated_at,
        program_days (
          id,
          day_index,
          name,
          focus,
          notes,
          program_exercises (
            id,
            exercise_id,
            order_index,
            target_sets,
            rep_min,
            rep_max,
            target_rir,
            rest_seconds,
            notes
          )
        )
      `)
      .eq('user_id', userId);

    if (!progErr && progs && progs.length > 0) {
      for (const p of progs) {
        const clientUuid = p.id;
        const createdAt = p.created_at
          ? Math.floor(new Date(p.created_at).getTime() / 1000)
          : Math.floor(Date.now() / 1000);
        const updatedAt = p.updated_at
          ? Math.floor(new Date(p.updated_at).getTime() / 1000)
          : createdAt;

        await db
          .insert(programs)
          .values({
            clientUuid,
            serverId: p.id,
            userId: p.user_id,
            name: p.name,
            description: p.description,
            goal: p.goal as any,
            daysPerWeek: p.days_per_week,
            durationWeeks: p.duration_weeks,
            status: p.status as any,
            isTemplate: p.is_template,
            startedAt: p.started_at,
            syncedAt: Math.floor(Date.now() / 1000),
            createdAt,
            updatedAt,
          })
          .onConflictDoUpdate({
            target: programs.clientUuid,
            set: {
              serverId: p.id,
              name: p.name,
              status: p.status as any,
              updatedAt,
            },
          });

        if (Array.isArray(p.program_days)) {
          for (const pd of p.program_days) {
            await db
              .insert(programDays)
              .values({
                clientUuid: pd.id,
                serverId: pd.id,
                programClientUuid: clientUuid,
                dayIndex: pd.day_index,
                name: pd.name,
                focus: pd.focus,
                notes: pd.notes,
              })
              .onConflictDoNothing();

            if (Array.isArray(pd.program_exercises)) {
              for (const pe of pd.program_exercises) {
                await db
                  .insert(programExercises)
                  .values({
                    clientUuid: pe.id,
                    serverId: pe.id,
                    programDayClientUuid: pd.id,
                    exerciseId: pe.exercise_id,
                    orderIndex: pe.order_index,
                    targetSets: pe.target_sets,
                    repMin: pe.rep_min,
                    repMax: pe.rep_max,
                    targetRir: pe.target_rir,
                    restSeconds: pe.rest_seconds,
                    notes: pe.notes,
                  })
                  .onConflictDoNothing();
              }
            }
          }
        }
      }
    }

    console.log(
      `[syncEngine] Buluttan veri çekildi: ${sessionsCount} seans, ${weightsCount} kilo, ${nutritionCount} öğün.`
    );
  } catch (err) {
    console.error('[syncEngine] pullUserDataFromSupabase genel hata:', err);
  } finally {
    isPulling = false;
  }

  return { sessionsCount, weightsCount, nutritionCount };
}
