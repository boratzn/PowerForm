-- =========================================================
-- VÜCUT TAKİBİ
-- =========================================================
CREATE TABLE body_weight_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_on   date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg   numeric(5,2) NOT NULL CHECK (weight_kg BETWEEN 20 AND 400),
  body_fat_pct numeric(4,1) CHECK (body_fat_pct BETWEEN 1 AND 70),
  source      text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','healthkit','health_connect','scale')),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, logged_on)
);
CREATE INDEX bw_user_date_idx ON body_weight_logs(user_id, logged_on DESC);

CREATE TABLE body_measurements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_on   date NOT NULL DEFAULT CURRENT_DATE,
  neck_cm       numeric(4,1),
  shoulder_cm   numeric(5,1),
  chest_cm      numeric(5,1),
  waist_cm      numeric(5,1),
  hip_cm        numeric(5,1),
  arm_left_cm   numeric(4,1),
  arm_right_cm  numeric(4,1),
  forearm_cm    numeric(4,1),
  thigh_cm      numeric(4,1),
  calf_cm       numeric(4,1),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, logged_on)
);

CREATE TABLE progress_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,             -- private bucket yolu
  pose        text CHECK (pose IN ('front','side','back','other')),
  taken_on    date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg   numeric(5,2),
  created_at  timestamptz NOT NULL DEFAULT now()
);
