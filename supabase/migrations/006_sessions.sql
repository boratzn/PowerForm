-- =========================================================
-- SEANS KAYITLARI  (uygulamanın kalbi)
-- =========================================================
CREATE TABLE workout_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_id      uuid REFERENCES programs(id) ON DELETE SET NULL,
  program_day_id  uuid REFERENCES program_days(id) ON DELETE SET NULL,
  name            text,                    -- program silinse bile isim kalsın
  status          session_status NOT NULL DEFAULT 'in_progress',
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  duration_seconds integer GENERATED ALWAYS AS (
                    CASE WHEN ended_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (ended_at - started_at))::integer END
                  ) STORED,
  bodyweight_kg   numeric(5,2),            -- o günkü kilo (bodyweight hareketler için)
  perceived_effort smallint CHECK (perceived_effort BETWEEN 1 AND 10),
  notes           text,
  -- offline senkron için
  client_uuid     uuid UNIQUE,             -- istemcide üretilen ID, çift kayıt önler
  synced_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_date_idx ON workout_sessions(user_id, started_at DESC);
CREATE INDEX sessions_status_idx    ON workout_sessions(user_id, status) WHERE status = 'in_progress';

CREATE TABLE session_exercises (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id  uuid NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  order_index  smallint NOT NULL,
  notes        text,
  UNIQUE (session_id, order_index)
);
CREATE INDEX session_exercises_session_idx  ON session_exercises(session_id);
CREATE INDEX session_exercises_exercise_idx ON session_exercises(exercise_id);

CREATE TABLE session_sets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id uuid NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  set_index           smallint NOT NULL,          -- 1,2,3...
  set_type            set_type NOT NULL DEFAULT 'normal',
  weight_kg           numeric(6,2) CHECK (weight_kg >= 0),
  reps                smallint     CHECK (reps >= 0),
  rir                 smallint     CHECK (rir BETWEEN 0 AND 10),
  rpe                 numeric(3,1) CHECK (rpe BETWEEN 1 AND 10),
  duration_seconds    integer,                    -- süre bazlı hareketler
  distance_m          numeric(8,2),
  is_completed        boolean NOT NULL DEFAULT true,
  -- tahmini 1RM: Epley formülü, sadece normal/failure setler için anlamlı
  e1rm                numeric(6,2) GENERATED ALWAYS AS (
                        CASE WHEN weight_kg IS NOT NULL AND reps IS NOT NULL AND reps > 0
                        THEN ROUND(weight_kg * (1 + reps::numeric / 30), 2) END
                      ) STORED,
  volume_kg           numeric(9,2) GENERATED ALWAYS AS (
                        CASE WHEN weight_kg IS NOT NULL AND reps IS NOT NULL
                        THEN weight_kg * reps END
                      ) STORED,
  completed_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_exercise_id, set_index)
);
CREATE INDEX session_sets_se_idx ON session_sets(session_exercise_id);

-- Kişisel rekorlar — trigger ile güncellenir
CREATE TABLE personal_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id   uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  record_type   text NOT NULL CHECK (record_type IN ('max_weight','max_reps','max_e1rm','max_volume_session')),
  value         numeric(9,2) NOT NULL,
  reps          smallint,
  weight_kg     numeric(6,2),
  session_set_id uuid REFERENCES session_sets(id) ON DELETE SET NULL,
  achieved_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_id, record_type)
);
