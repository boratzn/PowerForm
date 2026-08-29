-- =========================================================
-- TÜRETİLMİŞ GÖRÜNÜMLER
-- Bu view'lar hem uygulama grafiklerini hem AI tool'larını besler.
-- =========================================================

-- Kas grubu başına haftalık set sayısı (ikincil kaslar 0.5 katsayıyla)
CREATE OR REPLACE VIEW v_weekly_volume AS
SELECT
  ws.user_id,
  date_trunc('week', ws.started_at)::date          AS week_start,
  em.muscle_group_id,
  mg.name_tr                                       AS muscle_name,
  SUM(em.volume_factor)                            AS effective_sets,
  COUNT(*) FILTER (WHERE em.role = 'primary')      AS direct_sets,
  SUM(ss.volume_kg)                                AS tonnage_kg
FROM session_sets ss
JOIN session_exercises se ON se.id = ss.session_exercise_id
JOIN workout_sessions  ws ON ws.id = se.session_id
JOIN exercise_muscles  em ON em.exercise_id = se.exercise_id
JOIN muscle_groups     mg ON mg.id = em.muscle_group_id
WHERE ws.status = 'completed'
  AND ss.is_completed
  AND ss.set_type NOT IN ('warmup')
GROUP BY 1,2,3,4;

-- Egzersiz bazlı seans özeti (ilerleme grafiği için)
CREATE OR REPLACE VIEW v_exercise_progress AS
SELECT
  ws.user_id,
  se.exercise_id,
  ws.id                                AS session_id,
  ws.started_at::date                  AS performed_on,
  COUNT(*)                             AS working_sets,
  MAX(ss.e1rm)                         AS best_e1rm,
  MAX(ss.weight_kg)                    AS top_weight,
  SUM(ss.volume_kg)                    AS session_volume,
  ROUND(AVG(ss.reps), 1)               AS avg_reps
FROM session_sets ss
JOIN session_exercises se ON se.id = ss.session_exercise_id
JOIN workout_sessions  ws ON ws.id = se.session_id
WHERE ws.status = 'completed'
  AND ss.is_completed
  AND ss.set_type NOT IN ('warmup')
GROUP BY 1,2,3,4;

-- Kilo trendi + 7 günlük hareketli ortalama
CREATE OR REPLACE VIEW v_weight_trend AS
SELECT
  user_id,
  logged_on,
  weight_kg,
  ROUND(AVG(weight_kg) OVER (
    PARTITION BY user_id ORDER BY logged_on
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ), 2) AS ma7_kg
FROM body_weight_logs;

-- Günlük beslenme toplamı
CREATE OR REPLACE VIEW v_daily_nutrition AS
SELECT
  user_id,
  logged_on,
  ROUND(SUM(kcal))      AS kcal,
  ROUND(SUM(protein_g)) AS protein_g,
  ROUND(SUM(carbs_g))   AS carbs_g,
  ROUND(SUM(fat_g))     AS fat_g,
  COUNT(*)              AS entry_count
FROM nutrition_entries
GROUP BY 1,2;
