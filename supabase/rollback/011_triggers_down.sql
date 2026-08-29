DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

DROP TRIGGER IF EXISTS session_sets_pr ON session_sets;
DROP FUNCTION IF EXISTS check_personal_record();

DROP TRIGGER IF EXISTS programs_touch ON programs;
DROP TRIGGER IF EXISTS profiles_touch ON profiles;
DROP FUNCTION IF EXISTS touch_updated_at();
