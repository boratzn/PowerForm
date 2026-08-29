-- pgTAP testleri: RLS politikaları (spec §15 Paket 1, §16.1 "Kullanıcı A, B'nin seansını sorgular")
-- Çalıştırma: supabase test db  (bkz. https://supabase.com/docs/guides/local-development/testing/pgtap)
--
-- Senaryo: iki kullanıcı oluştur, birinin diğerinin satırlarını (profil, seans, kilo,
-- beslenme, sohbet) okuyamadığını / yazamadığını doğrula.

BEGIN;
SELECT plan(9);

-- İki test kullanıcısı (auth.users satırı olmadan profiles.id FK hata verir,
-- bu yüzden auth şemasına minimal satır ekliyoruz)
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'user-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@test.local');

-- handle_new_user trigger'ı profiles satırını zaten açtı; ek alanları güncelle
UPDATE profiles SET display_name = 'User A' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE profiles SET display_name = 'User B' WHERE id = '22222222-2222-2222-2222-222222222222';

INSERT INTO body_weight_logs (user_id, logged_on, weight_kg) VALUES
  ('11111111-1111-1111-1111-111111111111', CURRENT_DATE, 80.0);

INSERT INTO workout_sessions (user_id, name, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'A''nın seansı', 'completed');

INSERT INTO conversations (user_id, agent, title) VALUES
  ('11111111-1111-1111-1111-111111111111', 'coach', 'A''nın sohbeti');

-- ---- Kullanıcı B olarak oturum aç ----
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

SELECT is(
  (SELECT count(*)::int FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
  0,
  'B, A''nın profilini SELECT ile göremez'
);

SELECT is(
  (SELECT count(*)::int FROM body_weight_logs WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'B, A''nın kilo kaydını göremez'
);

SELECT is(
  (SELECT count(*)::int FROM workout_sessions WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'B, A''nın seansını göremez'
);

SELECT is(
  (SELECT count(*)::int FROM conversations WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'B, A''nın AI sohbetini göremez'
);

SELECT throws_ok(
  $$ INSERT INTO body_weight_logs (user_id, logged_on, weight_kg)
     VALUES ('11111111-1111-1111-1111-111111111111', CURRENT_DATE + 1, 99) $$,
  '42501',
  NULL,
  'B, A adına kilo kaydı YAZAMAZ (RLS WITH CHECK reddeder)'
);

SELECT throws_ok(
  $$ UPDATE profiles SET display_name = 'hacked' WHERE id = '11111111-1111-1111-1111-111111111111' $$,
  NULL,
  NULL,
  'B, A''nın profilini UPDATE edemez'
);

-- ---- Kullanıcı A kendi verisini görebilmeli ----
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

SELECT is(
  (SELECT count(*)::int FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
  1,
  'A kendi profilini görebilir'
);

SELECT is(
  (SELECT count(*)::int FROM workout_sessions WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'A kendi seansını görebilir'
);

-- ---- Herkese açık şablon programlar (user_id IS NULL, is_template) her iki kullanıcıya da açık ----
RESET role;
INSERT INTO programs (user_id, name, days_per_week, is_template, status)
  VALUES (NULL, 'Full Body 3 Gün', 3, true, 'draft');

SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

SELECT is(
  (SELECT count(*)::int FROM programs WHERE is_template AND user_id IS NULL),
  1,
  'Şablon programlar tüm kullanıcılara açık'
);

SELECT * FROM finish();
ROLLBACK;
