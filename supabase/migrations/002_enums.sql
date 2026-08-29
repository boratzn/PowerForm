-- =========================================================
-- ENUM TİPLERİ
-- =========================================================
CREATE TYPE sex_type            AS ENUM ('male','female','other','unspecified');
CREATE TYPE experience_level    AS ENUM ('beginner','intermediate','advanced');
CREATE TYPE goal_type           AS ENUM ('hypertrophy','strength','fat_loss','recomp','general_health');
CREATE TYPE unit_system         AS ENUM ('metric','imperial');
CREATE TYPE equipment_type      AS ENUM ('barbell','dumbbell','machine','cable','bodyweight','kettlebell','band','smith','other');
CREATE TYPE force_type          AS ENUM ('push','pull','static');
CREATE TYPE mechanic_type       AS ENUM ('compound','isolation');
CREATE TYPE set_type            AS ENUM ('normal','warmup','drop','myorep','failure','amrap','backoff');
CREATE TYPE session_status      AS ENUM ('in_progress','completed','abandoned');
CREATE TYPE meal_type           AS ENUM ('breakfast','lunch','dinner','snack');
CREATE TYPE message_role        AS ENUM ('user','assistant','system','tool');
CREATE TYPE agent_type          AS ENUM ('coach','program_architect','nutrition_logger','weekly_analyst');
CREATE TYPE program_status      AS ENUM ('draft','active','archived');
