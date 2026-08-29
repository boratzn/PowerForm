-- =========================================================
-- KULLANICI VE PROFİL
-- =========================================================
CREATE TABLE profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        text,
  avatar_url          text,
  birth_year          smallint CHECK (birth_year BETWEEN 1920 AND 2020),
  sex                 sex_type       NOT NULL DEFAULT 'unspecified',
  height_cm           numeric(5,1)   CHECK (height_cm BETWEEN 100 AND 250),
  experience          experience_level NOT NULL DEFAULT 'beginner',
  primary_goal        goal_type      NOT NULL DEFAULT 'hypertrophy',
  units               unit_system    NOT NULL DEFAULT 'metric',
  available_equipment equipment_type[] DEFAULT '{}',
  training_days_target smallint      CHECK (training_days_target BETWEEN 1 AND 7),
  injuries            text,                    -- serbest metin, AI promptuna girer
  timezone            text           NOT NULL DEFAULT 'Europe/Istanbul',
  onboarding_done     boolean        NOT NULL DEFAULT false,
  is_pro              boolean        NOT NULL DEFAULT false,
  created_at          timestamptz    NOT NULL DEFAULT now(),
  updated_at          timestamptz    NOT NULL DEFAULT now()
);
