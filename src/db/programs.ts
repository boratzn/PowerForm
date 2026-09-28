import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { supabase } from '../lib/supabase';
import { generateUuid } from '../lib/uuid';
import { db } from './client';
import { searchLocalExercises } from './queries';
import { exercises, programDays, programExercises, programs } from './schema';
import rawTemplates from './seed-data/templates.json';

export type ProgramDayDetail = {
  clientUuid: string;
  dayIndex: number;
  name: string;
  focus: string | null;
  notes: string | null;
  exercises: {
    clientUuid: string;
    exerciseId: string;
    orderIndex: number;
    targetSets: number;
    repMin: number | null;
    repMax: number | null;
    targetRir: number | null;
    restSeconds: number | null;
    notes: string | null;
    exercise: {
      nameEn: string;
      nameTr: string | null;
      equipment: string;
      imageUrl: string | null;
      gifUrl: string | null;
      primaryMuscles: string[] | null;
    };
  }[];
};

export type ProgramDetail = {
  clientUuid: string;
  serverId: string | null;
  userId: string | null;
  name: string;
  description: string | null;
  goal: 'hypertrophy' | 'strength' | 'fat_loss' | 'recomp' | 'general_health' | null;
  daysPerWeek: number;
  durationWeeks: number | null;
  status: 'draft' | 'active' | 'archived';
  isTemplate: boolean;
  days: ProgramDayDetail[];
};

// Çevrimdışı ilk açılışta 6 şablon programın yerel SQLite'ta hazır olması için seed eder
export async function seedLocalTemplatesIfEmpty(): Promise<void> {
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(programs)
    .where(eq(programs.isTemplate, true));

  if (Number(existing[0]?.count ?? 0) > 0) {
    return;
  }

  // Egzersiz slug -> id haritası
  const allExercises = await db.select({ id: exercises.id, slug: exercises.slug }).from(exercises);
  const slugToId = new Map<string, string>();
  for (const ex of allExercises) {
    slugToId.set(ex.slug, ex.id);
  }

  for (const t of rawTemplates) {
    const programClientUuid = generateUuid();
    await db.insert(programs).values({
      clientUuid: programClientUuid,
      userId: null,
      name: t.name,
      description: t.description,
      goal: t.goal as any,
      daysPerWeek: t.days_per_week,
      durationWeeks: t.duration_weeks,
      status: 'draft',
      isTemplate: true,
    });

    for (const d of t.days) {
      const dayClientUuid = generateUuid();
      await db.insert(programDays).values({
        clientUuid: dayClientUuid,
        programClientUuid,
        dayIndex: d.day_index,
        name: d.name,
        focus: (d as any).focus ?? null,
        notes: (d as any).notes ?? null,
      });

      for (const e of d.exercises) {
        const exerciseId = slugToId.get(e.slug) ?? e.slug;
        await db.insert(programExercises).values({
          clientUuid: generateUuid(),
          programDayClientUuid: dayClientUuid,
          exerciseId,
          orderIndex: e.order_index,
          targetSets: e.target_sets,
          repMin: e.rep_min,
          repMax: e.rep_max,
          targetRir: e.target_rir,
          restSeconds: e.rest_seconds,
          notes: (e as any).notes ?? null,
        });
      }
    }
  }

  console.log(`[seedLocalTemplatesIfEmpty] ${rawTemplates.length} şablon yerel DB'ye kaydedildi.`);
}

// Supabase'den şablonları senkronize eder
export async function syncTemplatesFromSupabase(): Promise<void> {
  try {
    const { data: supaPrograms, error: progErr } = await supabase
      .from('programs')
      .select('id, name, description, goal, days_per_week, duration_weeks')
      .eq('is_template', true);

    if (progErr || !supaPrograms || supaPrograms.length === 0) return;

    for (const sp of supaPrograms) {
      // Yerelde bu isimde şablon var mı?
      const existing = await db.select().from(programs).where(eq(programs.name, sp.name)).limit(1);

      let programClientUuid: string;
      if (existing.length > 0) {
        programClientUuid = existing[0].clientUuid;
        await db
          .update(programs)
          .set({
            serverId: sp.id,
            description: sp.description,
            goal: sp.goal,
            daysPerWeek: sp.days_per_week,
            durationWeeks: sp.duration_weeks,
          })
          .where(eq(programs.clientUuid, programClientUuid));
      } else {
        programClientUuid = generateUuid();
        await db.insert(programs).values({
          clientUuid: programClientUuid,
          serverId: sp.id,
          userId: null,
          name: sp.name,
          description: sp.description,
          goal: sp.goal,
          daysPerWeek: sp.days_per_week,
          durationWeeks: sp.duration_weeks,
          status: 'draft',
          isTemplate: true,
        });
      }

      // Günleri ve egzersizleri çek
      const { data: supaDays } = await supabase
        .from('program_days')
        .select('id, day_index, name, focus, notes')
        .eq('program_id', sp.id)
        .order('day_index');

      if (!supaDays) continue;

      for (const sd of supaDays) {
        const existingDay = await db
          .select()
          .from(programDays)
          .where(and(eq(programDays.programClientUuid, programClientUuid), eq(programDays.dayIndex, sd.day_index)))
          .limit(1);

        let dayClientUuid: string;
        if (existingDay.length > 0) {
          dayClientUuid = existingDay[0].clientUuid;
          await db
            .update(programDays)
            .set({ serverId: sd.id, name: sd.name, focus: sd.focus, notes: sd.notes })
            .where(eq(programDays.clientUuid, dayClientUuid));
        } else {
          dayClientUuid = generateUuid();
          await db.insert(programDays).values({
            clientUuid: dayClientUuid,
            serverId: sd.id,
            programClientUuid,
            dayIndex: sd.day_index,
            name: sd.name,
            focus: sd.focus,
            notes: sd.notes,
          });
        }

        const { data: supaExercises } = await supabase
          .from('program_exercises')
          .select('id, exercise_id, order_index, target_sets, rep_min, rep_max, target_rir, rest_seconds, notes')
          .eq('program_day_id', sd.id)
          .order('order_index');

        if (!supaExercises) continue;

        // Günün egzersizlerini tazele
        await db.delete(programExercises).where(eq(programExercises.programDayClientUuid, dayClientUuid));
        for (const se of supaExercises) {
          await db.insert(programExercises).values({
            clientUuid: generateUuid(),
            serverId: se.id,
            programDayClientUuid: dayClientUuid,
            exerciseId: se.exercise_id,
            orderIndex: se.order_index,
            targetSets: se.target_sets,
            repMin: se.rep_min,
            repMax: se.rep_max,
            targetRir: se.target_rir,
            restSeconds: se.rest_seconds,
            notes: se.notes,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[syncTemplatesFromSupabase] Senkron atlandı:', err);
  }
}

// Kullanıcının aktif programını getirir
export async function getActiveProgram(userId: string): Promise<ProgramDetail | null> {
  const activeRows = await db
    .select()
    .from(programs)
    .where(and(eq(programs.userId, userId), eq(programs.status, 'active')))
    .limit(1);

  if (activeRows.length === 0) return null;
  return getProgramById(activeRows[0].clientUuid);
}

// Tek bir programı tüm günleri ve hareketleriyle döner
export async function getProgramById(programClientUuid: string): Promise<ProgramDetail | null> {
  const progRows = await db.select().from(programs).where(eq(programs.clientUuid, programClientUuid)).limit(1);
  if (progRows.length === 0) return null;
  const p = progRows[0];

  const daysRows = await db
    .select()
    .from(programDays)
    .where(eq(programDays.programClientUuid, programClientUuid))
    .orderBy(programDays.dayIndex);

  const days: ProgramDayDetail[] = [];
  for (const d of daysRows) {
    const exRows = await db
      .select({
        pe: programExercises,
        nameEn: exercises.nameEn,
        nameTr: exercises.nameTr,
        equipment: exercises.equipment,
        imageUrl: exercises.imageUrl,
        gifUrl: exercises.gifUrl,
        primaryMuscles: exercises.primaryMuscles,
      })
      .from(programExercises)
      .leftJoin(exercises, eq(programExercises.exerciseId, exercises.id))
      .where(eq(programExercises.programDayClientUuid, d.clientUuid))
      .orderBy(programExercises.orderIndex);

    days.push({
      clientUuid: d.clientUuid,
      dayIndex: d.dayIndex,
      name: d.name,
      focus: d.focus,
      notes: d.notes,
      exercises: exRows.map((r) => ({
        clientUuid: r.pe.clientUuid,
        exerciseId: r.pe.exerciseId,
        orderIndex: r.pe.orderIndex,
        targetSets: r.pe.targetSets,
        repMin: r.pe.repMin,
        repMax: r.pe.repMax,
        targetRir: r.pe.targetRir,
        restSeconds: r.pe.restSeconds,
        notes: r.pe.notes,
        exercise: {
          nameEn: r.nameEn ?? 'Bilinmeyen Egzersiz',
          nameTr: r.nameTr,
          equipment: r.equipment ?? 'other',
          imageUrl: r.imageUrl,
          gifUrl: r.gifUrl,
          primaryMuscles: r.primaryMuscles,
        },
      })),
    });
  }

  return {
    clientUuid: p.clientUuid,
    serverId: p.serverId,
    userId: p.userId,
    name: p.name,
    description: p.description,
    goal: p.goal as any,
    daysPerWeek: p.daysPerWeek,
    durationWeeks: p.durationWeeks,
    status: p.status as any,
    isTemplate: Boolean(p.isTemplate),
    days,
  };
}

// Şablon listesini döner
export async function getTemplatePrograms(): Promise<ProgramDetail[]> {
  const templateRows = await db
    .select()
    .from(programs)
    .where(eq(programs.isTemplate, true))
    .orderBy(programs.daysPerWeek);

  const list: ProgramDetail[] = [];
  for (const t of templateRows) {
    const detail = await getProgramById(t.clientUuid);
    if (detail) list.push(detail);
  }
  return list;
}

// Kullanıcının özel programlarını döner
export async function getUserPrograms(userId: string): Promise<ProgramDetail[]> {
  const userRows = await db
    .select()
    .from(programs)
    .where(and(eq(programs.userId, userId), eq(programs.isTemplate, false)))
    .orderBy(desc(programs.updatedAt));

  const list: ProgramDetail[] = [];
  for (const p of userRows) {
    const detail = await getProgramById(p.clientUuid);
    if (detail) list.push(detail);
  }
  return list;
}

// Programı aktif yap
export async function setActiveProgram(programClientUuid: string, userId: string): Promise<void> {
  // Önce kullanıcının diğer programlarını draft yap
  await db
    .update(programs)
    .set({ status: 'draft' })
    .where(and(eq(programs.userId, userId), eq(programs.status, 'active')));

  // Seçilen program şablon ise, önce kullanıcıya kopyala, sonra aktif yap
  const target = await db.select().from(programs).where(eq(programs.clientUuid, programClientUuid)).limit(1);
  if (!target[0]) throw new Error('Program bulunamadı');

  if (target[0].isTemplate) {
    await cloneTemplateToUserProgram(programClientUuid, userId, true);
  } else {
    await db
      .update(programs)
      .set({ status: 'active', startedAt: new Date().toISOString() })
      .where(eq(programs.clientUuid, programClientUuid));
  }
}

// Şablonu kullanıcıya kopyalar
export async function cloneTemplateToUserProgram(
  templateClientUuid: string,
  userId: string,
  setActive = false
): Promise<string> {
  const template = await getProgramById(templateClientUuid);
  if (!template) throw new Error('Şablon bulunamadı');

  const newProgramUuid = generateUuid();
  await db.insert(programs).values({
    clientUuid: newProgramUuid,
    userId,
    name: template.name,
    description: template.description,
    goal: template.goal as any,
    daysPerWeek: template.daysPerWeek,
    durationWeeks: template.durationWeeks,
    status: setActive ? 'active' : 'draft',
    isTemplate: false,
    startedAt: setActive ? new Date().toISOString() : null,
  });

  for (const d of template.days) {
    const newDayUuid = generateUuid();
    await db.insert(programDays).values({
      clientUuid: newDayUuid,
      programClientUuid: newProgramUuid,
      dayIndex: d.dayIndex,
      name: d.name,
      focus: d.focus,
      notes: d.notes,
    });

    for (const e of d.exercises) {
      await db.insert(programExercises).values({
        clientUuid: generateUuid(),
        programDayClientUuid: newDayUuid,
        exerciseId: e.exerciseId,
        orderIndex: e.orderIndex,
        targetSets: e.targetSets,
        repMin: e.repMin,
        repMax: e.repMax,
        targetRir: e.targetRir,
        restSeconds: e.restSeconds,
        notes: e.notes,
      });
    }
  }

  return newProgramUuid;
}

// Özel program kaydet / güncelle
export async function saveCustomProgram(
  data: {
    clientUuid?: string;
    name: string;
    description?: string;
    goal: 'hypertrophy' | 'strength' | 'fat_loss' | 'recomp' | 'general_health';
    daysPerWeek: number;
    durationWeeks?: number;
    setActive?: boolean;
    days: {
      name: string;
      focus?: string;
      notes?: string;
      exercises: {
        exerciseId: string;
        orderIndex: number;
        targetSets: number;
        repMin?: number;
        repMax?: number;
        targetRir?: number;
        restSeconds?: number;
        notes?: string;
      }[];
    }[];
  },
  userId: string
): Promise<string> {
  const programUuid = data.clientUuid ?? generateUuid();

  if (data.setActive) {
    await db
      .update(programs)
      .set({ status: 'draft' })
      .where(and(eq(programs.userId, userId), eq(programs.status, 'active')));
  }

  const existing = await db.select().from(programs).where(eq(programs.clientUuid, programUuid)).limit(1);

  if (existing.length > 0) {
    await db
      .update(programs)
      .set({
        name: data.name,
        description: data.description ?? null,
        goal: data.goal,
        daysPerWeek: data.daysPerWeek,
        durationWeeks: data.durationWeeks ?? null,
        status: data.setActive ? 'active' : existing[0].status,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(programs.clientUuid, programUuid));

    // Eski günleri temizle (cascade ile egzersizler de silinir)
    await db.delete(programDays).where(eq(programDays.programClientUuid, programUuid));
  } else {
    await db.insert(programs).values({
      clientUuid: programUuid,
      userId,
      name: data.name,
      description: data.description ?? null,
      goal: data.goal,
      daysPerWeek: data.daysPerWeek,
      durationWeeks: data.durationWeeks ?? null,
      status: data.setActive ? 'active' : 'draft',
      isTemplate: false,
      startedAt: data.setActive ? new Date().toISOString() : null,
    });
  }

  for (let dIdx = 0; dIdx < data.days.length; dIdx++) {
    const d = data.days[dIdx];
    const dayUuid = generateUuid();
    await db.insert(programDays).values({
      clientUuid: dayUuid,
      programClientUuid: programUuid,
      dayIndex: dIdx + 1,
      name: d.name,
      focus: d.focus ?? null,
      notes: d.notes ?? null,
    });

    for (let eIdx = 0; eIdx < d.exercises.length; eIdx++) {
      const e = d.exercises[eIdx];
      await db.insert(programExercises).values({
        clientUuid: generateUuid(),
        programDayClientUuid: dayUuid,
        exerciseId: e.exerciseId,
        orderIndex: e.orderIndex ?? eIdx + 1,
        targetSets: e.targetSets,
        repMin: e.repMin ?? null,
        repMax: e.repMax ?? null,
        targetRir: e.targetRir ?? null,
        restSeconds: e.restSeconds ?? null,
        notes: e.notes ?? null,
      });
    }
  }

  return programUuid;
}

// Belirli bir program günündeki egzersizleri döner (seansı başlatırken ön-yüklemek için)
export async function getProgramDayExercises(programDayClientUuid: string) {
  const rows = await db
    .select()
    .from(programExercises)
    .where(eq(programExercises.programDayClientUuid, programDayClientUuid))
    .orderBy(programExercises.orderIndex);

  return rows.map((r) => ({
    exerciseId: r.exerciseId,
    targetSets: r.targetSets,
    repMin: r.repMin,
    repMax: r.repMax,
    targetRir: r.targetRir,
    restSeconds: r.restSeconds,
  }));
}

// Aktif programda belirtilen isimdeki egzersizi yeni bir egzersizle değiştirir
export async function replaceExerciseInActiveProgramByName(
  userId: string,
  currentExerciseName: string,
  suggestedExerciseName: string
): Promise<{ success: boolean; message: string }> {
  const activeProg = await getActiveProgram(userId);
  if (!activeProg) {
    return { success: false, message: 'Aktif bir antrenman programı bulunamadı.' };
  }

  // Yeni egzersizi bul
  const newMatches = await searchLocalExercises(suggestedExerciseName, 5);
  const newEx = newMatches[0];
  if (!newEx) {
    return { success: false, message: `"${suggestedExerciseName}" egzersiz kütüphanesinde bulunamadı.` };
  }

  // Aktif programdaki günleri tara
  const normCurrent = currentExerciseName.toLowerCase().trim();
  for (const day of activeProg.days) {
    for (const ex of day.exercises) {
      const matchTr = ex.exercise.nameTr?.toLowerCase().trim();
      const matchEn = ex.exercise.nameEn.toLowerCase().trim();
      if (
        (matchTr && matchTr.includes(normCurrent)) ||
        (matchEn && matchEn.includes(normCurrent)) ||
        normCurrent.includes(matchEn) ||
        (matchTr && normCurrent.includes(matchTr))
      ) {
        await db
          .update(programExercises)
          .set({ exerciseId: newEx.id })
          .where(eq(programExercises.clientUuid, ex.clientUuid));
        return {
          success: true,
          message: `"${ex.exercise.nameTr || ex.exercise.nameEn}" başarıyla "${newEx.nameTr || newEx.nameEn}" ile değiştirildi.`,
        };
      }
    }
  }

  return {
    success: false,
    message: `Aktif programınızda "${currentExerciseName}" hareketine rastlanmadı.`,
  };
}

// Yapay zekanın oluşturduğu antrenmanı kullanıcının özel programlarına kaydeder
export async function saveAiGeneratedWorkout(
  userId: string,
  workout: {
    title: string;
    focus?: string;
    exercises: {
      name: string;
      targetSets: number;
      repMin: number;
      repMax: number;
      targetRir?: number;
      restSeconds?: number;
      notes?: string;
    }[];
  }
): Promise<{ success: boolean; programId?: string; message: string }> {
  try {
    const resolvedExercises: {
      exerciseId: string;
      orderIndex: number;
      targetSets: number;
      repMin: number;
      repMax: number;
      targetRir?: number;
      restSeconds: number;
      notes?: string;
    }[] = [];

    for (let idx = 0; idx < workout.exercises.length; idx++) {
      const we = workout.exercises[idx];
      let matches = await searchLocalExercises(we.name, 5);

      // Doğrudan bulunamadıysa, kelime bazlı eşleştirme yap
      if (matches.length === 0) {
        const clean = we.name.replace(/[()[\]{},.-]/g, ' ').trim();
        const words = clean.split(/\s+/).filter((w) => w.length >= 3);
        for (const w of words) {
          const sub = await searchLocalExercises(w, 5);
          if (sub.length > 0) {
            matches = sub;
            break;
          }
        }
      }

      // Yaygın Türkçe kas/hareket eşleştirmeleri
      if (matches.length === 0) {
        const lower = we.name.toLowerCase();
        let fallbackQuery = '';
        if (lower.includes('karın') || lower.includes('mekik')) fallbackQuery = 'crunch';
        else if (lower.includes('bacak') || lower.includes('leg raise')) fallbackQuery = 'leg raise';
        else if (lower.includes('plank')) fallbackQuery = 'plank';
        else if (lower.includes('şınav')) fallbackQuery = 'push-up';
        else if (lower.includes('barfiks')) fallbackQuery = 'pull-up';
        else if (lower.includes('omuz')) fallbackQuery = 'shoulder press';
        else if (lower.includes('göğüs')) fallbackQuery = 'bench press';
        else if (lower.includes('squat') || lower.includes('çömelme')) fallbackQuery = 'squat';

        if (fallbackQuery) {
          matches = await searchLocalExercises(fallbackQuery, 5);
        }
      }

      const ex = matches[0];
      if (ex) {
        resolvedExercises.push({
          exerciseId: ex.id,
          orderIndex: idx + 1,
          targetSets: we.targetSets || 3,
          repMin: we.repMin || 8,
          repMax: we.repMax || 12,
          targetRir: we.targetRir ?? 2,
          restSeconds: we.restSeconds || 60,
          notes: we.notes,
        });
      }
    }

    if (resolvedExercises.length === 0) {
      return { success: false, message: 'Antrenmandaki hareketler kütüphaneyle eşleştirilemedi.' };
    }

    const progId = await saveCustomProgram(
      {
        name: workout.title || 'AI Özel Antrenman',
        description: `Yapay zeka koçu tarafından hazırlandı (${workout.focus || 'Genel'}).`,
        goal: 'hypertrophy',
        daysPerWeek: 1,
        durationWeeks: 4,
        setActive: true,
        days: [
          {
            name: '1. Seans',
            focus: workout.focus,
            exercises: resolvedExercises,
          },
        ],
      },
      userId
    );

    return {
      success: true,
      programId: progId,
      message: `"${workout.title}" antrenmanı programlarınıza başarıyla kaydedildi!`,
    };
  } catch (err: any) {
    console.error('saveAiGeneratedWorkout hatası:', err);
    return { success: false, message: err?.message || 'Antrenman kaydedilemedi.' };
  }
}

