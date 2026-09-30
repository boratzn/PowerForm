-- =========================================================
-- EKSİK TABLOLAR İÇİN ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- Supabase Security Linter: "Table is public, but RLS has not been enabled"
-- uyarısını çözer.
-- =========================================================

-- 1. RLS'yi Etkinleştir
ALTER TABLE muscle_groups    ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_media   ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_servings    ENABLE ROW LEVEL SECURITY;

-- 2. Kas Grupları (Genel referans tablosu, herkes okuyabilir)
CREATE POLICY read_muscle_groups ON muscle_groups
  FOR SELECT USING (true);

-- 3. Egzersiz Kas Eşleşmeleri (Sistem egzersizleri veya kullanıcının kendi egzersizleri)
CREATE POLICY read_exercise_muscles ON exercise_muscles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exercises e
      WHERE e.id = exercise_muscles.exercise_id
        AND (NOT e.is_custom OR e.created_by = auth.uid())
    )
  );

CREATE POLICY write_exercise_muscles ON exercise_muscles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM exercises e
      WHERE e.id = exercise_muscles.exercise_id
        AND e.is_custom
        AND e.created_by = auth.uid()
    )
  );

CREATE POLICY delete_exercise_muscles ON exercise_muscles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM exercises e
      WHERE e.id = exercise_muscles.exercise_id
        AND e.is_custom
        AND e.created_by = auth.uid()
    )
  );

-- 4. Egzersiz Medyaları (Görseller, GIF'ler vb.)
CREATE POLICY read_exercise_media ON exercise_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exercises e
      WHERE e.id = exercise_media.exercise_id
        AND (NOT e.is_custom OR e.created_by = auth.uid())
    )
  );

-- 5. Gıda Porsiyonları (Sistem gıdaları veya kullanıcının eklediği gıdalar)
CREATE POLICY read_food_servings ON food_servings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM foods f
      WHERE f.id = food_servings.food_id
        AND (f.source <> 'user' OR f.created_by = auth.uid())
    )
  );

CREATE POLICY write_food_servings ON food_servings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM foods f
      WHERE f.id = food_servings.food_id
        AND f.created_by = auth.uid()
    )
  );

-- 6. Görünümler (Views) İçin RLS Yetkilendirmesi (security_invoker = on)
-- Supabase Security Advisor'daki "UNRESTRICTED view" uyarısını çözer.
-- View'ların, alttaki tabloların (workout_sessions, nutrition_entries vb.)
-- RLS güvenlik kurallarını sorguyu yapan kullanıcı adına çalıştırmasını sağlar.
ALTER VIEW public.v_weekly_volume     SET (security_invoker = on);
ALTER VIEW public.v_exercise_progress SET (security_invoker = on);
ALTER VIEW public.v_weight_trend      SET (security_invoker = on);
ALTER VIEW public.v_daily_nutrition   SET (security_invoker = on);
