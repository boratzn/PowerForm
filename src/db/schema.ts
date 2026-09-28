import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

// Yerel SQLite şeması — sadece offline-kritik yol (§12): seans loglama.
// UI hiçbir zaman doğrudan ağdan okumaz, her zaman bu tablolardan okur.
// Sunucu şeması (supabase/migrations) ile 1:1 değil; senkron motoru ikisini eşler.

// Egzersiz kütüphanesinin salt-okunur yerel aynası (§12). İlk kurulumda
// db/seed-data/exercises.json bundle'ından seed edilir (bkz. seedExercises.ts, anlık
// offline kullanılabilirlik için), ardından src/db/syncExercises.ts uygulama açılışında
// Supabase'deki gerçek `exercises`/`exercise_muscles`/`exercise_media` tablolarını çekip
// bu tabloyu `slug` üzerinden upsert eder — `id` böylece bundle'daki geçici slug-string'den
// gerçek Supabase uuid'sine geçer. session_exercises.exerciseId bu id'yi opak bir referans
// olarak saklar (FK constraint yok), bu yüzden id değişimi UI kodunu bozmaz.
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
  instructionsEn: text('instructions_en', { mode: 'json' }).$type<string[]>(),
  // Paket 2'nin çeviri adımı tamamlanınca (bkz. PROGRESS.md) syncExercises.ts ile dolar;
  // bundle-seed sırasında henüz yoktur (null).
  instructionsTr: text('instructions_tr', { mode: 'json' }).$type<string[]>(),
  cuesTr: text('cues_tr', { mode: 'json' }).$type<string[]>(),
  commonMistakesTr: text('common_mistakes_tr', { mode: 'json' }).$type<string[]>(),
  primaryMuscles: text('primary_muscles', { mode: 'json' }).$type<string[]>(),
  imageUrl: text('image_url'),
  gifUrl: text('gif_url'),
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

// Vücut ağırlığı takibi (§13, "Bugün" ekranı "Hızlı kilo girişi" kartı) — sunucudaki
// body_weight_logs'un (007_body.sql) yerel aynası, aynı (user_id, logged_on) UNIQUE
// kısıtıyla: günde tek kayıt, ikinci girişte üzerine yazılır (§12.3 çakışma stratejisi).
export const bodyWeightLogs = sqliteTable(
  'body_weight_logs',
  {
    clientUuid: text('client_uuid').primaryKey(),
    userId: text('user_id').notNull(),
    loggedOn: text('logged_on').notNull(), // YYYY-MM-DD (yerel takvim günü)
    weightKg: real('weight_kg').notNull(),
    syncedAt: integer('synced_at'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [unique().on(t.userId, t.loggedOn)]
);

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

// Antrenman Programları (§6.3, 005_programs.sql yerel aynası)
export const programs = sqliteTable('programs', {
  clientUuid: text('client_uuid').primaryKey(),
  serverId: text('server_id'),
  userId: text('user_id'), // null = sistem şablonu
  name: text('name').notNull(),
  description: text('description'),
  goal: text('goal', {
    enum: ['hypertrophy', 'strength', 'fat_loss', 'recomp', 'general_health'],
  }),
  daysPerWeek: integer('days_per_week').notNull(),
  durationWeeks: integer('duration_weeks'),
  status: text('status', { enum: ['draft', 'active', 'archived'] })
    .notNull()
    .default('draft'),
  isTemplate: integer('is_template', { mode: 'boolean' }).notNull().default(false),
  startedAt: text('started_at'),
  syncedAt: integer('synced_at'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(unixepoch())`),
});

export const programDays = sqliteTable('program_days', {
  clientUuid: text('client_uuid').primaryKey(),
  serverId: text('server_id'),
  programClientUuid: text('program_client_uuid')
    .notNull()
    .references(() => programs.clientUuid, { onDelete: 'cascade' }),
  dayIndex: integer('day_index').notNull(),
  name: text('name').notNull(),
  focus: text('focus'),
  notes: text('notes'),
});

export const programExercises = sqliteTable('program_exercises', {
  clientUuid: text('client_uuid').primaryKey(),
  serverId: text('server_id'),
  programDayClientUuid: text('program_day_client_uuid')
    .notNull()
    .references(() => programDays.clientUuid, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id').notNull(),
  orderIndex: integer('order_index').notNull(),
  targetSets: integer('target_sets').notNull(),
  repMin: integer('rep_min'),
  repMax: integer('rep_max'),
  targetRir: integer('target_rir'),
  restSeconds: integer('rest_seconds'),
  notes: text('notes'),
});

// Beslenme Modülü (§6.5, 008_nutrition.sql yerel aynası)
export const foods = sqliteTable('foods', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  brand: text('brand'),
  barcode: text('barcode'),
  kcalPer100: real('kcal_per_100').notNull(),
  proteinPer100: real('protein_per_100').notNull().default(0),
  carbsPer100: real('carbs_per_100').notNull().default(0),
  fatPer100: real('fat_per_100').notNull().default(0),
  fiberPer100: real('fiber_per_100'),
  baseUnit: text('base_unit', { enum: ['g', 'ml'] }).notNull().default('g'),
});

export const foodServings = sqliteTable('food_servings', {
  id: text('id').primaryKey(),
  foodId: text('food_id')
    .notNull()
    .references(() => foods.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  grams: real('grams').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
});

export const nutritionEntries = sqliteTable('nutrition_entries', {
  clientUuid: text('client_uuid').primaryKey(),
  serverId: text('server_id'),
  userId: text('user_id').notNull(),
  foodId: text('food_id').references(() => foods.id, { onDelete: 'set null' }),
  loggedOn: text('logged_on').notNull(), // YYYY-MM-DD
  meal: text('meal', { enum: ['breakfast', 'lunch', 'dinner', 'snack'] })
    .notNull()
    .default('snack'),
  foodNameSnapshot: text('food_name_snapshot').notNull(),
  quantityG: real('quantity_g').notNull(),
  servingLabel: text('serving_label'),
  kcal: real('kcal').notNull(),
  proteinG: real('protein_g').notNull().default(0),
  carbsG: real('carbs_g').notNull().default(0),
  fatG: real('fat_g').notNull().default(0),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch())`),
});

export const nutritionTargets = sqliteTable(
  'nutrition_targets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().unique(),
    kcal: integer('kcal').notNull(),
    proteinG: integer('protein_g').notNull(),
    carbsG: integer('carbs_g'),
    fatG: integer('fat_g'),
    tdeeEstimate: integer('tdee_estimate'),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  }
);

// AI Haftalık ve Dönemsel Raporlar
export const aiReports = sqliteTable('ai_reports', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  reportType: text('report_type').notNull().default('weekly'), // 'weekly' | 'monthly'
  periodStart: text('period_start').notNull(), // YYYY-MM-DD
  periodEnd: text('period_end').notNull(), // YYYY-MM-DD
  title: text('title').notNull(),
  contentMd: text('content_md').notNull(),
  metricsJson: text('metrics_json'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch())`),
});

// AI Sohbet Oturumları (Conversations)
export const aiConversations = sqliteTable('ai_conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  lastMessageAt: integer('last_message_at').notNull().default(sql`(unixepoch())`),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch())`),
});

// AI Sohbet Mesajları
export const aiMessages = sqliteTable('ai_messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => aiConversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch())`),
});

