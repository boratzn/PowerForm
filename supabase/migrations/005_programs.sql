-- =========================================================
-- PROGRAMLAR
-- =========================================================
CREATE TABLE programs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE,  -- NULL = sistem şablonu
  name            text NOT NULL,
  description     text,
  goal            goal_type,
  days_per_week   smallint NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  duration_weeks  smallint CHECK (duration_weeks BETWEEN 1 AND 52),
  status          program_status NOT NULL DEFAULT 'draft',
  is_template     boolean NOT NULL DEFAULT false,   -- true = herkese açık şablon
  source_template_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  created_by_ai   boolean NOT NULL DEFAULT false,
  ai_conversation_id uuid,                          -- hangi sohbetten doğduğu
  started_at      date,
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX programs_user_idx ON programs(user_id, status);
-- Bir kullanıcının aynı anda tek aktif programı olur
CREATE UNIQUE INDEX programs_one_active_idx ON programs(user_id) WHERE status = 'active';

CREATE TABLE program_days (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  day_index   smallint NOT NULL,          -- 1..N, program içindeki sıra
  name        text NOT NULL,              -- '1. Gün — İtiş'
  focus       text,                       -- 'Omuz + Göğüs + Triceps'
  notes       text,
  UNIQUE (program_id, day_index)
);

CREATE TABLE program_exercises (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_day_id uuid NOT NULL REFERENCES program_days(id) ON DELETE CASCADE,
  exercise_id   uuid NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  order_index   smallint NOT NULL,
  target_sets   smallint NOT NULL CHECK (target_sets BETWEEN 1 AND 20),
  rep_min       smallint CHECK (rep_min > 0),
  rep_max       smallint CHECK (rep_max >= rep_min),
  target_rir    smallint CHECK (target_rir BETWEEN 0 AND 5),
  rest_seconds  smallint CHECK (rest_seconds BETWEEN 0 AND 600),
  tempo         text,                     -- '3-1-1-0'
  notes         text,
  superset_group smallint,                -- aynı numaralı hareketler superset
  UNIQUE (program_day_id, order_index)
);
CREATE INDEX program_exercises_day_idx ON program_exercises(program_day_id);
