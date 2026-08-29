import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Yerel SQLite şeması — sadece offline-kritik yol (§12): seans loglama.
// UI hiçbir zaman doğrudan ağdan okumaz, her zaman bu tablolardan okur.
// Sunucu şeması (supabase/migrations) ile 1:1 değil; senkron motoru ikisini eşler.

// Egzersiz kütüphanesinin salt-okunur yerel aynası. Supabase henüz bağlanmadığı için
// (bkz. PROGRESS.md) `id` = `slug` — gerçek Supabase senkronu geldiğinde exercises.id
// (uuid) ile slug üzerinden eşlenip bu tablo yeniden doldurulacak; session_exercises'taki
// exerciseId referansları slug-stabil olduğu için kırılmaz. Şimdilik db/seed-data/exercises.json
// bundle'ından tek seferlik seed ediliyor (bkz. seedExercises.ts).
export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameTr: text('name_tr'),
  equipment: text('equipment').notNull(),
  trackingType: text('tracking_type', {
    enum: ['weight_reps', 'reps_only', 'time', 'distance', 'weighted_bodyweight'],
  })
    .notNull()
    .default('weight_reps'),
});

export const workoutSessions = sqliteTable('workout_sessions', {
  clientUuid: text('client_uuid').primaryKey(), // sunucudaki client_uuid UNIQUE ile eşleşir
  serverId: text('server_id'), // senkron olunca dolar
  userId: text('user_id').notNull(),
  programId: text('program_id'),
  programDayId: text('program_day_id'),
  name: text('name'),
  status: text('status', { enum: ['in_progress', 'completed', 'abandoned'] })
    .notNull()
    .default('in_progress'),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  bodyweightKg: real('bodyweight_kg'),
  perceivedEffort: integer('perceived_effort'),
  notes: text('notes'),
  syncedAt: integer('synced_at'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch())`),
});

export const sessionExercises = sqliteTable('session_exercises', {
  clientUuid: text('client_uuid').primaryKey(),
  sessionClientUuid: text('session_client_uuid')
    .notNull()
    .references(() => workoutSessions.clientUuid, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull(), // sunucu exercises.id (global, önceden senkron)
  orderIndex: integer('order_index').notNull(),
  notes: text('notes'),
});

export const sessionSets = sqliteTable('session_sets', {
  clientUuid: text('client_uuid').primaryKey(),
  sessionExerciseClientUuid: text('session_exercise_client_uuid')
    .notNull()
    .references(() => sessionExercises.clientUuid, { onDelete: 'cascade' }),
  setIndex: integer('set_index').notNull(),
  setType: text('set_type', {
    enum: ['normal', 'warmup', 'drop', 'myorep', 'failure', 'amrap', 'backoff'],
  })
    .notNull()
    .default('normal'),
  weightKg: real('weight_kg'),
  reps: integer('reps'),
  rir: integer('rir'),
  rpe: real('rpe'),
  durationSeconds: integer('duration_seconds'),
  distanceM: real('distance_m'),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(true),
  completedAt: integer('completed_at')
    .notNull()
    .default(sql`(unixepoch())`),
});

// Senkron kuyruğu (§12.4) — her yerel yazma bir mutation kaydı üretir
export const syncMutations = sqliteTable('sync_mutations', {
  id: text('id').primaryKey(), // = client_uuid
  tableName: text('table_name').notNull(),
  operation: text('operation', { enum: ['insert', 'update', 'delete'] }).notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch())`),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
});
