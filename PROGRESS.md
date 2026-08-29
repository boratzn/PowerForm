# FitTrack — İlerleme Durumu

> Bu dosya oturumlar arası devamlılık içindir. Yeni bir Claude Code oturumu bu projede
> işe başlarken önce bunu, sonra gerekirse `docs/FITNESS_APP_SPEC.md`'nin ilgili
> bölümünü okusun. Tam şartname 2061 satır — tamamını okumak yerine bölüm indeksinden
> (`grep -n "^# [0-9]" docs/FITNESS_APP_SPEC.md`) ilgili aralığı `sed -n` ile al.

Son güncelleme: 2026-08-29

## Neresindeyiz

**Faz 0 (Temel) — kısmen tamamlandı.** Proje `~/Desktop/FitTrack` altında, Expo SDK 57 +
TypeScript + Expo Router + NativeWind + Zustand + TanStack Query + Supabase JS +
Drizzle/expo-sqlite ile scaffold edildi. Supabase migration'ları (§6-7 DDL'in tamamı)
ve RLS pgTAP testi yazıldı. Navigasyon iskeleti (6 sekme + auth + onboarding + tam
ekran seans modalı) çalışır durumda ama ekranların içi büyük ölçüde placeholder.

## Tamamlanan (Faz 0)

- [x] Expo + TypeScript + Expo Router kurulumu (`create-expo-app` blank-typescript,
      sonra `expo-router/entry`'e çevrildi)
- [x] Bağımlılıklar: zustand, @tanstack/react-query, @supabase/supabase-js,
      drizzle-orm + expo-sqlite, nativewind + tailwindcss@3 (v4 NativeWind 4.2.6 ile
      uyumsuz olabileceği için bilerek v3'e pinlendi)
- [x] Klasör yapısı: `app/` (Expo Router), `src/{components,lib,stores,db,constants,types}`,
      `supabase/{migrations,rollback,tests,seed,functions}`, `docs/`
- [x] Tasarım tokenları §10.3'ten birebir: `src/constants/theme.ts` + `tailwind.config.js`
      (koyu tema renkleri, 4-tabanlı spacing, radius). Temel bileşenler:
      `src/components/ui/{Button,Card,Input}.tsx`
- [x] Supabase migration'ları `supabase/migrations/001_extensions.sql` … `012_rls.sql` —
      §6 tam DDL (tablolar, view'lar, trigger'lar) + §7 tüm RLS politikaları, spec §15
      Paket 1'in istediği dosya bölünmesiyle birebir
- [x] Her migration için geri alma dosyası: `supabase/rollback/*_down.sql`
      (Supabase CLI'de otomatik down runner yok — README'de manuel kullanım açıklandı)
- [x] RLS pgTAP testi: `supabase/tests/rls.test.sql` — iki kullanıcı, biri diğerinin
      profilini/seansını/kilo kaydını/sohbetini göremiyor + yazamıyor, şablon
      programlar herkese açık
- [x] Yerel offline-first DB iskeleti: `src/db/schema.ts` (workout_sessions,
      session_exercises, session_sets, sync_mutations) + `src/db/client.ts`
      (drizzle + expo-sqlite) — §12 mimarisine göre
- [x] Supabase client: `src/lib/supabase.ts` (env değişkenleri, AsyncStorage session
      storage — bkz. aşağıdaki TODO)
- [x] Navigasyon iskeleti: `app/_layout.tsx` (root Stack), `(tabs)` grubu 6 sekmeyle
      (Bugün/Antrenman/Kütüphane/Beslenme/Koç/Profil — §11), `(auth)` ve `(onboarding)`
      grupları, `app/session.tsx` tam ekran modal (keep-awake iskeleti kurulu)
- [x] `CLAUDE.md` proje kuralları (spec §15 "Genel çalışma kuralları" + eklemeler)
- [x] `docs/ENVIRONMENT.md` — gerekli env değişkenlerinin dokümantasyonu (bkz. not aşağıda)
- [x] `docs/FITNESS_APP_SPEC.md` — orijinal şartnamenin kopyası (Downloads'taki
      orijinali silinir/taşınırsa diye)

## Yapılmadı / bilinçli ertelendi

- [ ] **`.env` dosyası yok.** Bu oturum `turax` workspace'i içinde çalıştığı için o
      workspace'in global secret-protection hook'u `.env*` adlı her dosyayı (içeriği
      zararsız bile olsa) engelliyor. `docs/ENVIRONMENT.md`'deki değişkenleri elle
      `.env` dosyasına kopyala.
- [ ] Supabase projesi henüz **oluşturulmadı ve migration'lar hiçbir yere uygulanmadı**.
      `npx supabase init` bu repoda hiç çalıştırılmadı (CLI kurulu değildi, `npx` ile
      ilk kullanımda otomatik iner). Sıradaki adım aşağıda.
- [ ] `src/types/database.ts` gerçek Supabase tipleri değil, placeholder
      (`Record<string, unknown>`) — migration'lar bir projeye uygulanınca
      `npx supabase gen types typescript --local > src/types/database.ts` ile üret.
- [ ] `src/lib/supabase.ts` auth storage'ı AsyncStorage — production'a girmeden önce
      Supabase'in Expo rehberindeki "LargeSecureStore" (expo-secure-store + şifreleme)
      desenine geçilmeli, dosyadaki TODO yorumuna bak.
- [ ] `expo start` ile gerçek cihaz/simülatörde henüz görsel doğrulama yapılmadı
      (bkz. "Doğrulanmadı" bölümü).
- [ ] Auth ekranları (`app/(auth)/*`) sadece UI iskeleti — `supabase.auth.signInWithPassword`
      vb. gerçek çağrılar yok. Apple/Google girişi hiç eklenmedi.
- [ ] Onboarding akışı (§11) sadece "welcome" ve "profile-setup" placeholder'ı var;
      3 slaytlık karşılama, deneyim/hedef adımı, gün/ekipman adımı eksik.

## Sıradaki adım (spec §15'teki sıraya göre)

1. **Supabase projesini kur ve migration'ları uygula**
   ```bash
   cd ~/Desktop/FitTrack
   npx supabase login          # tarayıcıda yetkilendirme ister
   npx supabase init           # supabase/config.toml üretir (henüz yok)
   npx supabase link --project-ref <proje-ref>   # veya "npx supabase start" ile yerel
   npx supabase db push        # migrations/ altındaki 12 dosyayı uygular
   npx supabase gen types typescript --linked > src/types/database.ts
   ```
   AB (Frankfurt) bölgesini seç (§13.2 KVKK notu). `.env`'i `docs/ENVIRONMENT.md`'ye
   göre doldur.

2. **Paket 2 — Egzersiz veri seti** (§15): `scripts/seed-exercises.ts` yaz —
   free-exercise-db'yi indir, `exercises`/`exercise_muscles`/`exercise_media`'ya
   dönüştür, `name_tr`/`instructions_tr`/`cues_tr` alanlarını Claude API ile toplu
   çevir (20 egzersiz/istek). `supabase/seed/` altına konabilir.

3. **Auth akışını gerçek Supabase çağrılarına bağla** (Faz 0'ın kalanı): login/register
   ekranlarına `supabase.auth.*`, `useAuthStore`'u `onAuthStateChange` ile besle,
   `app/_layout.tsx`'e session'a göre `(auth)` ↔ `(tabs)` yönlendirmesi ekle.

4. **Paket 3 — Seans ekranı** (§10.2, §11): uygulamanın en kritik ekranı, ayrı ve
   dikkatli bir görev paketi olarak ele alınmalı — özel numerik klavye, geçen seferki
   placeholder, dinlenme sayacı, PR kutlaması, önce yerel SQLite'a yaz.

5. **Paket 4 — AI katmanı** (§5, §8.2): `supabase/functions/ai-chat/` — Faz 0/1/2
   verisi olmadan anlamlı test edilemez, bu yüzden sona bırakıldı.

Faz 1-5'in tam kapsamı için `docs/FITNESS_APP_SPEC.md` §14'e bak.

## Doğrulandı

- [x] `npx tsc --noEmit -p tsconfig.json` hatasız geçiyor (strict mode)
- [x] `npx expo export --platform ios` 1719 modülü hatasız bundle'lıyor — Metro +
      Babel (nativewind/babel, react-native-reanimated/plugin → react-native-worklets)
      + Expo Router zinciri çalışıyor. Bunun için ek düzeltmeler gerekti:
      `@expo/vector-icons` ve `react-native-worklets` açıkça kuruldu (ilki hiç
      kurulu değildi, ikincisi Reanimated 4.x'in babel plugin'inin peer bağımlılığı),
      `nativewind-env.d.ts` eklendi (`className` prop tipi + `*.css` import tipi için).

## Doğrulanmadı (bir sonraki oturumda ilk iş)

- [ ] Gerçek bir simülatör/cihazda `npx expo start` ile görsel kontrol — NativeWind
      stillerinin gerçekten uygulandığını, tab bar'ın ve modal'ın göründüğü şekilde
      çalıştığını gözle doğrula (bu oturumda simülatör açılmadı, sadece headless
      bundle doğrulaması yapıldı).
- [ ] `supabase/migrations/*` dosyaları gerçek bir Postgres'e karşı `supabase db reset`
      ile temiz kurulum olarak çalışıyor mu (Paket 1'in istediği doğrulama — CLI kurulu
      olmadığı için bu oturumda koşulamadı, "Sıradaki adım" bölümüne bkz.)

## Bilinen kararlar / neden

- **NativeWind + Tailwind v3** (v4 değil): NativeWind 4.2.6 peer dependency'si
  `tailwindcss >3.3.0` diyor ama Tailwind v4'ün yeni motoru NativeWind v4 ile geniş
  çapta test edilmemiş; riski almamak için `tailwindcss@^3.4.0`'a pinlendi.
- **Drizzle + expo-sqlite** (WatermelonDB değil): spec §3.1 ikisini de "veya" ile
  sunuyor; Drizzle'ın Expo'nun resmi dokümantasyonunda daha iyi desteklenmesi ve daha
  düşük öğrenme eğrisi nedeniyle seçildi.
- **Seans ekranı modal olarak `app/session.tsx`'te, `(tabs)/workout/` altında değil**:
  §11'in istediği "tam ekran, sekme çubuğu gizli" davranışı Expo Router'da en temiz
  şekilde root-level `presentation: 'fullScreenModal'` ile elde ediliyor.
