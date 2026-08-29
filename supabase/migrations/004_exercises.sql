-- =========================================================
-- EGZERSİZ KÜTÜPHANESİ (global, kullanıcı katkısı da olabilir)
-- =========================================================
CREATE TABLE muscle_groups (
  id          text PRIMARY KEY,          -- 'side_delt', 'lats' ...
  name_tr     text NOT NULL,
  name_en     text NOT NULL,
  region      text NOT NULL,             -- 'upper_body' | 'lower_body' | 'core'
  display_order smallint NOT NULL DEFAULT 0
);

CREATE TABLE exercises (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,          -- 'seated-dumbbell-shoulder-press'
  name_en         text NOT NULL,
  name_tr         text,
  equipment       equipment_type NOT NULL,
  mechanic        mechanic_type,
  force           force_type,
  is_unilateral   boolean NOT NULL DEFAULT false,
  difficulty      experience_level,
  instructions_en text[],                        -- adım adım
  instructions_tr text[],
  cues_tr         text[],                        -- kısa teknik ipuçları
  common_mistakes_tr text[],
  -- egzersizin varsayılan yük birimi: 'kg' | 'bodyweight' | 'time' | 'distance'
  tracking_type   text NOT NULL DEFAULT 'weight_reps'
                  CHECK (tracking_type IN ('weight_reps','reps_only','time','distance','weighted_bodyweight')),
  is_custom       boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL = sistem egzersizi
  source          text,                          -- 'free-exercise-db' | 'user' | 'admin'
  search_vector   tsvector GENERATED ALWAYS AS (
                    to_tsvector('simple', coalesce(name_en,'') || ' ' || coalesce(name_tr,''))
                  ) STORED,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX exercises_search_idx     ON exercises USING gin(search_vector);
CREATE INDEX exercises_name_trgm_idx  ON exercises USING gin(name_en gin_trgm_ops);
CREATE INDEX exercises_custom_idx     ON exercises(created_by) WHERE is_custom;

-- Bir egzersiz birden çok kası çalıştırır; katkı payı ile
CREATE TABLE exercise_muscles (
  exercise_id     uuid REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_group_id text REFERENCES muscle_groups(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('primary','secondary')),
  -- haftalık hacim hesabında kullanılacak katsayı: primary=1.0, secondary=0.5
  volume_factor   numeric(3,2) NOT NULL DEFAULT 1.0,
  PRIMARY KEY (exercise_id, muscle_group_id)
);
CREATE INDEX exercise_muscles_muscle_idx ON exercise_muscles(muscle_group_id);

CREATE TABLE exercise_media (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id  uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  media_type   text NOT NULL CHECK (media_type IN ('image','gif','video_url','youtube')),
  url          text NOT NULL,
  thumbnail_url text,
  display_order smallint NOT NULL DEFAULT 0,
  attribution  text,                              -- lisans/atıf metni
  is_active    boolean NOT NULL DEFAULT true      -- ölü link tespitinde false yap
);
CREATE INDEX exercise_media_ex_idx ON exercise_media(exercise_id) WHERE is_active;
