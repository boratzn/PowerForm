-- =========================================================
-- TRIGGER'LAR
-- =========================================================

-- updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER programs_touch BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Yeni set eklendiğinde kişisel rekor kontrolü
CREATE OR REPLACE FUNCTION check_personal_record() RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
  v_exercise_id uuid;
BEGIN
  IF NEW.set_type = 'warmup' OR NOT NEW.is_completed THEN RETURN NEW; END IF;

  SELECT ws.user_id, se.exercise_id INTO v_user_id, v_exercise_id
  FROM session_exercises se
  JOIN workout_sessions ws ON ws.id = se.session_id
  WHERE se.id = NEW.session_exercise_id;

  IF NEW.e1rm IS NOT NULL THEN
    INSERT INTO personal_records (user_id, exercise_id, record_type, value, reps, weight_kg, session_set_id)
    VALUES (v_user_id, v_exercise_id, 'max_e1rm', NEW.e1rm, NEW.reps, NEW.weight_kg, NEW.id)
    ON CONFLICT (user_id, exercise_id, record_type) DO UPDATE
      SET value = EXCLUDED.value, reps = EXCLUDED.reps,
          weight_kg = EXCLUDED.weight_kg, session_set_id = EXCLUDED.session_set_id,
          achieved_at = now()
      WHERE personal_records.value < EXCLUDED.value;
  END IF;

  IF NEW.weight_kg IS NOT NULL THEN
    INSERT INTO personal_records (user_id, exercise_id, record_type, value, reps, weight_kg, session_set_id)
    VALUES (v_user_id, v_exercise_id, 'max_weight', NEW.weight_kg, NEW.reps, NEW.weight_kg, NEW.id)
    ON CONFLICT (user_id, exercise_id, record_type) DO UPDATE
      SET value = EXCLUDED.value, reps = EXCLUDED.reps,
          weight_kg = EXCLUDED.weight_kg, session_set_id = EXCLUDED.session_set_id,
          achieved_at = now()
      WHERE personal_records.value < EXCLUDED.value;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_sets_pr AFTER INSERT OR UPDATE ON session_sets
  FOR EACH ROW EXECUTE FUNCTION check_personal_record();

-- Yeni kullanıcı kaydolunca profil satırı aç
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
