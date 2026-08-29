-- =========================================================
-- BESLENME
-- =========================================================
CREATE TABLE foods (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  brand            text,
  barcode          text,
  -- 100 g / 100 ml başına değerler (standart taban)
  kcal_per_100     numeric(7,2) NOT NULL,
  protein_per_100  numeric(6,2) NOT NULL DEFAULT 0,
  carbs_per_100    numeric(6,2) NOT NULL DEFAULT 0,
  fat_per_100      numeric(6,2) NOT NULL DEFAULT 0,
  fiber_per_100    numeric(6,2),
  sugar_per_100    numeric(6,2),
  sodium_mg_per_100 numeric(8,2),
  saturated_fat_per_100 numeric(6,2),
  base_unit        text NOT NULL DEFAULT 'g' CHECK (base_unit IN ('g','ml')),
  source           text NOT NULL CHECK (source IN ('curated_tr','openfoodfacts','usda','fatsecret','user')),
  external_id      text,                        -- kaynaktaki ID
  is_verified      boolean NOT NULL DEFAULT false,
  created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  search_vector    tsvector GENERATED ALWAYS AS (
                     to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(brand,''))
                   ) STORED
);
CREATE INDEX foods_search_idx  ON foods USING gin(search_vector);
CREATE INDEX foods_trgm_idx    ON foods USING gin(name gin_trgm_ops);
CREATE UNIQUE INDEX foods_barcode_idx ON foods(barcode) WHERE barcode IS NOT NULL;

-- Porsiyon tanımları: "1 orta boy (150 g)", "1 dilim (28 g)"
CREATE TABLE food_servings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id     uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  label       text NOT NULL,              -- '1 orta boy'
  grams       numeric(7,2) NOT NULL,
  is_default  boolean NOT NULL DEFAULT false
);

CREATE TABLE nutrition_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  food_id     uuid REFERENCES foods(id) ON DELETE SET NULL,
  logged_on   date NOT NULL DEFAULT CURRENT_DATE,
  meal        meal_type NOT NULL DEFAULT 'snack',
  -- gıda silinse bile kayıt anlamını korusun diye anlık kopya
  food_name_snapshot text NOT NULL,
  quantity_g  numeric(7,2) NOT NULL CHECK (quantity_g > 0),
  serving_label text,
  kcal        numeric(7,2) NOT NULL,
  protein_g   numeric(6,2) NOT NULL DEFAULT 0,
  carbs_g     numeric(6,2) NOT NULL DEFAULT 0,
  fat_g       numeric(6,2) NOT NULL DEFAULT 0,
  entered_via text NOT NULL DEFAULT 'search' CHECK (entered_via IN ('search','barcode','ai_text','quick_add','copy')),
  client_uuid uuid UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nutrition_user_date_idx ON nutrition_entries(user_id, logged_on DESC);

CREATE TABLE nutrition_targets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  kcal          integer NOT NULL,
  protein_g     integer NOT NULL,
  carbs_g       integer,
  fat_g         integer,
  -- nasıl hesaplandığının izi
  tdee_estimate integer,
  surplus_kcal  integer,
  method        text,        -- 'mifflin_st_jeor' | 'adaptive' | 'manual' | 'ai'
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, effective_from)
);
