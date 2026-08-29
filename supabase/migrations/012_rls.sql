-- =========================================================
-- ROW LEVEL SECURITY POLİTİKALARI
-- Bu migration atlanamaz. RLS olmadan bir kullanıcı diğerinin
-- antrenman ve sağlık verisini okuyabilir.
-- =========================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_days       ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_sets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_weight_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_targets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises          ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods              ENABLE ROW LEVEL SECURITY;

-- Basit sahiplik: user_id sütunu olan tablolar
CREATE POLICY own_profile ON profiles
  FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY own_sessions ON workout_sessions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY own_weight ON body_weight_logs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY own_measurements ON body_measurements
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY own_photos ON progress_photos
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY own_nutrition ON nutrition_entries
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY own_targets ON nutrition_targets
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY own_prs ON personal_records
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY own_conversations ON conversations
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY own_reports ON ai_reports
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY own_usage ON ai_usage_log
  FOR SELECT USING (user_id = auth.uid());

-- Programlar: kendi programların + herkese açık şablonlar
CREATE POLICY read_programs ON programs
  FOR SELECT USING (user_id = auth.uid() OR (is_template AND user_id IS NULL));
CREATE POLICY write_programs ON programs
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY update_programs ON programs
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY delete_programs ON programs
  FOR DELETE USING (user_id = auth.uid());

-- Alt tablolar: üst tabloya EXISTS ile bağlan
CREATE POLICY program_days_access ON program_days
  FOR ALL USING (EXISTS (
    SELECT 1 FROM programs p WHERE p.id = program_days.program_id
      AND (p.user_id = auth.uid() OR (p.is_template AND p.user_id IS NULL))
  ));

CREATE POLICY program_exercises_access ON program_exercises
  FOR ALL USING (EXISTS (
    SELECT 1 FROM program_days pd
    JOIN programs p ON p.id = pd.program_id
    WHERE pd.id = program_exercises.program_day_id
      AND (p.user_id = auth.uid() OR (p.is_template AND p.user_id IS NULL))
  ));

CREATE POLICY session_exercises_access ON session_exercises
  FOR ALL USING (EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = session_exercises.session_id AND ws.user_id = auth.uid()
  ));

CREATE POLICY session_sets_access ON session_sets
  FOR ALL USING (EXISTS (
    SELECT 1 FROM session_exercises se
    JOIN workout_sessions ws ON ws.id = se.session_id
    WHERE se.id = session_sets.session_exercise_id AND ws.user_id = auth.uid()
  ));

CREATE POLICY messages_access ON messages
  FOR ALL USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  ));

CREATE POLICY tool_calls_access ON message_tool_calls
  FOR ALL USING (EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = message_tool_calls.message_id AND c.user_id = auth.uid()
  ));

-- Egzersizler: sistem egzersizleri herkese açık, özel olanlar sahibine
CREATE POLICY read_exercises ON exercises
  FOR SELECT USING (NOT is_custom OR created_by = auth.uid());
CREATE POLICY write_custom_exercises ON exercises
  FOR INSERT WITH CHECK (is_custom AND created_by = auth.uid());
CREATE POLICY update_custom_exercises ON exercises
  FOR UPDATE USING (is_custom AND created_by = auth.uid());

-- Gıdalar: doğrulanmış olanlar herkese açık, kullanıcı eklediği kendine
CREATE POLICY read_foods ON foods
  FOR SELECT USING (source <> 'user' OR created_by = auth.uid());
CREATE POLICY write_foods ON foods
  FOR INSERT WITH CHECK (created_by = auth.uid());
