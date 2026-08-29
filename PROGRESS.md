# Powerform — İlerleme Durumu

> Bu dosya oturumlar arası devamlılık içindir. Yeni bir Claude Code oturumu bu projede
> işe başlarken önce bunu, sonra gerekirse `docs/FITNESS_APP_SPEC.md`'nin ilgili
> bölümünü okusun. Tam şartname 2061 satır — tamamını okumak yerine bölüm indeksinden
> (`grep -n "^# [0-9]" docs/FITNESS_APP_SPEC.md`) ilgili aralığı `sed -n` ile al.

Son güncelleme: 2026-08-29

## Neresindeyiz

**Faz 0 (Temel) — kısmen tamamlandı.** Proje `~/Desktop/Powerform` altında, Expo SDK 57 +
TypeScript + Expo Router + NativeWind + Zustand + TanStack Query + Supabase JS +
Drizzle/expo-sqlite ile scaffold edildi. Supabase migration'ları (§6-7 DDL'in tamamı)
ve RLS pgTAP testi yazıldı. Navigasyon iskeleti (6 sekme + auth + onboarding + tam
ekran seans modalı) çalışır durumda ama ekranların içi büyük ölçüde placeholder.

**Paket 2 (egzersiz veri seti) — script tamamlandı ve gerçek veriyle test edildi,
Supabase'e henüz yazılmadı** (Supabase projesi kurulmadığı için — kullanıcı bu adımı
bilinçli olarak sonraya bıraktı). Detaylar aşağıda.

**Paket 3 (seans ekranı) — YAZILDI VE GERÇEK BİR iOS SİMÜLATÖRÜNDE UÇTAN UCA
DOĞRULANDI** (Expo Go üzerinden, iPhone 17 Pro / iOS 26.2 simülatörü). Kullanıcının
açık isteğiyle Supabase/Anthropic bağlantısı kurulmadı — ekran tamamen yerel SQLite
üzerinde, "boş/ad-hoc seans" akışıyla çalışıyor (program bazlı başlatma henüz yok,
program oluşturucu da yok). Bu doğrulama sürecinde **3 gerçek bug bulundu ve
düzeltildi** (Drizzle migration'ları hiç çalışmıyordu, .sql importu Metro'yu
kırıyordu, kütüphane detay ekranı sekme çubuğunda fazladan bir sekme olarak
görünüyordu) — detaylar aşağıda "Simülatör doğrulaması" bölümünde.

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

## Tamamlanan (Paket 2 — egzersiz veri seti)

`scripts/seed-exercises/` — modüler pipeline, her aşama ayrı dosyada:

- [x] `fetch.ts` — free-exercise-db'yi (yuhonas/free-exercise-db, `dist/exercises.json`)
      indirir, `.cache/exercises-raw.json`'a önbelleğe alır (`--refresh` verilmedikçe
      ağa tekrar gitmez)
- [x] `types.ts` — kaynak/hedef tipler; `MUSCLE_GROUP_IDS` spec §5.3
      `search_exercises.primary_muscle` enum'uyla birebir
- [x] `muscle-map.ts` — equipment/mechanic/force/level eşleme tabloları,
      `MUSCLE_GROUPS_SEED` (16 satır, Türkçe adlarla), kas ismi eşleme tablosu,
      `classifyShoulderRegion()` (kaynakta ayrılmayan "shoulders" etiketini isim
      anahtar kelimelerinden front/side/rear_delt'e sınıflandıran sezgisel fonksiyon)
- [x] `transform.ts` — dönüştürme + **eşlenemeyenleri sessizce atlamayan rapor**
      (§15 Paket 2 madde 3 kuralı)
- [x] `translate.ts` — Claude API ile 20'li batch çeviri (instructions_tr/cues_tr/
      common_mistakes_tr), tool-use ile yapılandırılmış çıktı, batch başına diske
      kaydeden önbellek (kesintide kaldığı yerden devam eder), üstel geri çekilmeli
      retry. `ANTHROPIC_API_KEY` yoksa adım atlanır, script çökmez
- [x] `write.ts` — Supabase'e idempotent upsert (`service_role` key ile, çünkü
      is_custom=false sistem egzersizleri RLS'in `write_custom_exercises`
      politikasının kapsamı dışında — bkz. dosyadaki yorum). Env değişkeni yoksa
      adım atlanır
- [x] `index.ts` — orkestratör, `npm run seed:exercises` (`-- --refresh` ile
      yeniden indirir)
- [x] devDependencies: `tsx`, `@anthropic-ai/sdk`

**Gerçek veriyle çalıştırıldı ve doğrulandı** (credential gerektirmeyen kısım):
876/876 egzersiz dönüştürüldü, `npx tsc --noEmit` temiz. Eşleme raporu:

| Bulgu | Sayı | Not |
|---|---|---|
| `equipment = null` → `other` | 77 | kaynakta boş |
| Yaklaşık equipment eşleşmesi (→ `other`) | 171 | e-z curl bar, foam roll, medicine ball, exercise ball, "other" |
| Eşlenemeyen kas: `adductors` | 54 egzersiz | `muscle_groups`'ta karşılığı yok, bağlantı kurulmadı |
| Eşlenemeyen kas: `abductors` | 43 egzersiz | aynı |
| Eşlenemeyen kas: `neck` | 9 egzersiz | aynı |
| Yaklaşık kas: `middle back` → `upper_back` | 100 egzersiz | en yakın karşılık |
| `shoulders` sınıflandırması | 183 anahtar kelimeyle eşleşti, **156 varsayılan (side_delt)** | ilk sürümde 285'ti, "press/push/row" gibi ek anahtar kelimelerle iyileştirildi — kalan 156 elle gözden geçirilmeli |
| Boş `instructions` | 5 egzersiz | kaynak veride eksik |

jsdelivr CDN üzerinden egzersiz görselleri doğrulandı (`curl -I` → 200,
`image/jpeg`). Tam rapor: `scripts/seed-exercises/.cache/mapping-report.json`
(gitignored — yeniden üretilebilir, `npm run seed:exercises` ile).

**Bu oturumda YAPILMADI:** çeviri (ANTHROPIC_API_KEY yok) ve Supabase'e yazma
(Supabase projesi yok) — ikisi de kullanıcının bilinçli tercihiyle sonraya bırakıldı.

## Tamamlanan (Paket 3 — seans ekranı)

Mimari karar: program oluşturucu henüz yok, bu yüzden seans **boş/ad-hoc** başlıyor
(Hevy/Strong'daki "Start Empty Workout" gibi) — kullanıcı egzersizleri elle ekliyor.
Programa bağlı seans başlatma (aktif günün hedeflerini otomatik yükleme) program
oluşturucu yazılınca eklenecek bir takip işi.

- [x] `src/db/schema.ts` — yerel `exercises` tablosu eklendi (kütüphanenin salt-okunur
      aynası; Supabase bağlanana kadar `id = slug`, bkz. dosyadaki yorum)
- [x] `src/db/seed-data/exercises.json` — Paket 2'nin gerçek çıktısından elle seçilmiş
      38 egzersiz (tüm ana kas grupları + ekipman tipleri), `src/db/seedExercises.ts`
      ile uygulama ilk açıldığında bir kereliğine yerel DB'ye yazılıyor
      (`app/_layout.tsx`'te çağrılıyor) — GEÇİCİ, gerçek Supabase senkronu gelince
      kaldırılacak
- [x] `src/lib/calculations.ts` — `estimate1RM` (§9.1'deki RIR-düzeltmeli formül,
      sunucunun generated column'ındaki basit Epley'den BİLİNÇLİ olarak farklı — dosyada
      neden açıklanıyor), `calculateVolume`, `roundToPlate`. Saf fonksiyonlar (§16.3)
- [x] `src/lib/uuid.ts` — `expo-crypto` tabanlı UUID üretimi (Hermes'te global
      `crypto.randomUUID` yok)
- [x] `src/lib/restNotification.ts` — dinlenme sayacı bitince arka planda da tetiklenen
      yerel bildirim (`expo-notifications`, izin isteme + Android kanalı dahil)
- [x] `src/db/mutations.ts` — `recordMutation()`, §12.4 senkron kuyruğuna her yerel
      yazma için kayıt düşer (henüz işleyen bir senkron motoru yok ama mimari baştan
      doğru — motor eklenince bu tablo hazır)
- [x] `src/db/queries.ts` — `getLastPerformance` ("geçen sefer" placeholder verisi),
      `getBestE1RM` (PR karşılaştırması), `searchLocalExercises`
- [x] `src/stores/useSessionStore.ts` — aktif seans state'i (Zustand). Her mutasyon
      (set onayı, silme, seans bitişi) ÖNCE yerel SQLite'a yazılıyor, sonra bellek
      state'i güncelleniyor — uygulama seans ortasında çökerse veri kaybolmaz
- [x] `src/components/session/`: `NumericKeypad` (özel sayı klavyesi, +2.5/-2.5,
      "aynısı"), `SetRow` (uzun basma → düzenle/sil), `ExerciseCard`, `RestTimerBar`,
      `ExercisePickerSheet`, `PRBadge` (Reanimated animasyonlu)
- [x] `app/session.tsx` — tam implementasyon: süre sayacı, toplam hacim, tamamlanan/
      toplam set, dinlenme sayacı otomatik başlatma + titreşim + arka plan bildirimi,
      seans bitirme özeti (Alert)

**§10.2'nin 8 zorunlu kuralı ile karşılaştırma:**

| # | Kural | Durum |
|---|---|---|
| 1 | Tek elle erişilebilirlik (alt 2/3) | ✅ Klavye/dinlenme barı ekranın altında; "Bitir" üst köşede ama nadir/onaylı bir eylem |
| 2 | Min 48×48dp dokunma hedefi | ✅ Tüm chip/buton/checkmark `min-h-[48px]` veya `h-12`/`w-12` |
| 3 | Geçen seferki değer önceden dolu | ✅ `lastPerformance`'tan hem kg hem tekrar hem RIR önceden dolduruluyor |
| 4 | Özel numerik klavye | ✅ `NumericKeypad` — sistem klavyesi hiç kullanılmıyor |
| 5 | Dinlenme sayacı otomatik + titreşim + arka plan bildirimi | ✅ `confirmSet` başlatıyor, `Vibration.vibrate`, `expo-notifications` |
| 6 | Ekran uyanık kalsın | ✅ `useKeepAwake()` (Faz 0'dan beri kuruluydu) |
| 7 | PR anında kutlama | ✅ `estimate1RM` karşılaştırması + `PRBadge` animasyonu |
| 8 | Her şey geri alınabilir | ✅ Uzun basma → Düzenle/Sil (`Alert.alert`), onaylı seti "reopen" edebiliyorsun |

## Simülatör doğrulaması (Paket 3)

`xcrun simctl` ile sıfırdan bir iPhone 17 Pro / iOS 26.2 simülatörü oluşturulup Expo Go
üzerinden gerçek bir uçtan uca akış koşuldu: sekme çubuğu → Antrenman → Seansı Başlat →
egzersiz ara/ekle → KG/TEKRAR alanlarını özel klavyeyle doldur → seti onayla (PR rozeti +
dinlenme sayacı + bildirim izni tetiklendi) → uzun bas → Düzenle/Sil menüsü → Bitir →
onay diyaloğu → özet ("Süre: 6 dk, Hacim: 5445 kg, PR: 1") → workout sekmesine dönüş.
Hepsi ekran görüntüleriyle doğrulandı, konsolda hata yok (sadece beklenen Expo Go
push-notification kısıtlama uyarıları).

**Bu süreçte bulunan ve düzeltilen 3 gerçek bug** (hiçbiri `tsc`/bundle ile yakalanamazdı —
sadece gerçek çalıştırma ile ortaya çıktı):

1. **Yerel SQLite tabloları hiç oluşturulmuyordu.** `src/db/client.ts` veritabanını
   açıyordu ama migration hiç çalıştırılmıyordu — ilk ekran açılışında
   `no such table: exercises` hatası. Düzeltme: `npx drizzle-kit generate` ile
   `src/db/migrations/` üretildi, `app/_layout.tsx`'e `useMigrations` (drizzle-orm/
   expo-sqlite/migrator) eklendi — migration bitene kadar bir "Hazırlanıyor…" ekranı
   gösterip DB'ye erişimi engelliyor.
2. **Metro `.sql` importunu JS olarak parse etmeye çalışıp çöküyordu.**
   drizzle-kit'in ürettiği `migrations.js`, `.sql` dosyasını doğrudan import ediyor.
   `metro.config.js`'e `sourceExts.push('sql')` eklemek yetmedi (Metro dosyayı JS
   sanıp "Missing semicolon" hatası verdi) — asıl çözüm `babel.config.js`'e
   `babel-plugin-inline-import` eklemek oldu (Drizzle'ın resmi Expo dokümantasyonundaki
   yöntem: https://orm.drizzle.team/quick-sqlite/expo). Metro cache'i agresif şekilde
   eskiyi tuttuğu için her config değişikliğinden sonra `--clear` + Expo Go'yu
   `xcrun simctl terminate` ile tam kapatıp yeniden açmak gerekti.
3. **Sekme çubuğunda fazladan "library/[exerciseId]" sekmesi çıkıyordu.** Dosya
   tabanlı yönlendirme, `library/` altındaki `[exerciseId].tsx`'i kendi `_layout.tsx`'i
   olmadığı için otomatik ayrı bir sekme olarak keşfediyordu. Düzeltme:
   `app/(tabs)/_layout.tsx`'e `<Tabs.Screen name="library/[exerciseId]" options={{ href: null }} />`
   eklendi (görünür ama sekme çubuğunda gizli).

**Bilinen sınırlamalar:**
- Sadece `tracking_type = 'weight_reps'` tam destekleniyor (38 egzersizin 37'si).
  `'time'`/`'distance'`/`'reps_only'` için ayrı bir giriş UI'ı yok — kg alanı boş
  bırakılabiliyor ama süre/mesafe için özel bir widget yazılmadı.
- Uygulama seans ortasında kapanıp yeniden açılırsa, DB'de `in_progress` bir seans
  kalır ama ekran onu otomatik algılayıp geri açmıyor (state Zustand'da, kalıcı değil).
  "Devam eden seansı algıla" bir sonraki iterasyon işi.
- `LOCAL_USER_ID` sabit bir placeholder (`'local-user'`) — auth bağlanınca gerçek
  `supabase.auth` kullanıcı id'siyle değişecek.

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
   cd ~/Desktop/Powerform
   npx supabase login          # tarayıcıda yetkilendirme ister
   npx supabase init           # supabase/config.toml üretir (henüz yok)
   npx supabase link --project-ref <proje-ref>   # veya "npx supabase start" ile yerel
   npx supabase db push        # migrations/ altındaki 12 dosyayı uygular
   npx supabase gen types typescript --linked > src/types/database.ts
   ```
   AB (Frankfurt) bölgesini seç (§13.2 KVKK notu). `.env`'i `docs/ENVIRONMENT.md`'ye
   göre doldur.

2. **Paket 2'yi tamamla — çeviri + Supabase'e yazma** (script hazır, sadece
   credential eksik):
   ```bash
   # .env'e ANTHROPIC_API_KEY, EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   # eklendikten sonra (bkz. docs/ENVIRONMENT.md):
   export $(grep -v '^#' .env | xargs)   # ya da dotenv-cli kullan
   npm run seed:exercises
   ```
   Çeviri ~44 batch (876 egzersiz / 20) sürer, her batch sonrası
   `scripts/seed-exercises/.cache/translations.json`'a kaydedilir — kesilirse
   `npm run seed:exercises` tekrar çalıştırıldığında zaten çevrilmiş slug'ları atlar.
   Adım 1 (migration'lar) bitmeden `write.ts` hata verir (tablolar yok), ama
   `translate.ts` bağımsız çalışabilir. Rapordaki 156 "varsayılan side_delt"
   egzersizi elle gözden geçirmeyi düşün (`mapping-report.json` →
   `shoulderClassification.fallbackDefault`).

3. **Auth akışını gerçek Supabase çağrılarına bağla** (Faz 0'ın kalanı): login/register
   ekranlarına `supabase.auth.*`, `useAuthStore`'u `onAuthStateChange` ile besle,
   `app/_layout.tsx`'e session'a göre `(auth)` ↔ `(tabs)` yönlendirmesi ekle.
   `useSessionStore`'daki `LOCAL_USER_ID` sabitini gerçek kullanıcı id'siyle değiştir.

4. ~~Paket 3 — Seans ekranı~~ **YAPILDI VE SİMÜLATÖRDE DOĞRULANDI** (bu oturumda) —
   bkz. "Simülatör doğrulaması" bölümü.

5. **Paket 4 — AI katmanı** (§5, §8.2): `supabase/functions/ai-chat/` — Faz 0/1/2
   verisi olmadan anlamlı test edilemez, bu yüzden sona bırakıldı.

6. **Program oluşturucu** (F4, henüz bir "Paket" olarak tanımlanmadı ama Paket 3'ün
   ortaya çıkardığı bağımlılık): seans ekranı şu an sadece boş/ad-hoc başlıyor;
   programa bağlı başlatma (hedef set/tekrar/RIR/dinlenme otomatik yüklensin) için
   önce `program_days`/`program_exercises`'ın yerel bir aynası ve program düzenleme
   UI'ı gerekiyor.

Faz 1-5'in tam kapsamı için `docs/FITNESS_APP_SPEC.md` §14'e bak.

## Doğrulandı

- [x] `npx tsc --noEmit -p tsconfig.json` hatasız geçiyor (strict mode) — Faz 0 +
      Paket 2 + Paket 3'ün tamamı dahil
- [x] `npx expo export --platform ios` hatasız bundle'lıyor (Faz 0'da 1719 modül,
      Paket 3 sonrası 1946 modül) — Metro + Babel (nativewind/babel,
      react-native-reanimated/plugin → react-native-worklets) + Expo Router zinciri
      çalışıyor. Bunun için ek düzeltmeler gerekti: `@expo/vector-icons` ve
      `react-native-worklets` açıkça kuruldu (ilki hiç kurulu değildi, ikincisi
      Reanimated 4.x'in babel plugin'inin peer bağımlılığı), `nativewind-env.d.ts`
      eklendi (`className` prop tipi + `*.css` import tipi için).
- [x] `expo-crypto`, `expo-notifications` doğru API şekilleriyle kullanıldı — kurulum
      sonrası `node_modules` içindeki gerçek `.d.ts` dosyaları okunarak doğrulandı
      (`SchedulableTriggerInputTypes.TIME_INTERVAL`, `shouldShowBanner`/`shouldShowList`).
- [x] **Paket 3'ün tamamı gerçek bir iOS simülatöründe (Expo Go, iPhone 17 Pro /
      iOS 26.2) uçtan uca test edildi** — bkz. "Simülatör doğrulaması" bölümü.
      Tab bar, egzersiz arama, özel klavye, PR tespiti, dinlenme sayacı + bildirim
      izni, uzun-basma menüsü, seans bitirme özeti — hepsi ekran görüntüleriyle
      doğrulandı, konsol hatasız.

## Doğrulanmadı (bir sonraki oturumda ilk iş — ÖNCELİKLİ)

- [ ] "Aynısı" (sameAsLast) butonu simülatör turunda hiç tıklanmadı — kod yolu var
      (`NumericKeypad`'de koşullu render), ama gerçek dokunuşla denenmedi.
- [ ] "+ Set Ekle" ile 2. seti eklemek, "Not Ekle" akışı (buton hâlâ yok, `ExerciseCard`'da
      görsel eksik) ve `expo-keep-awake`'in gerçekten ekranı uyanık tuttuğu (simülatörde
      gözlemlenemez, sadece fiziksel cihazda anlamlı) test edilmedi.
- [ ] Android tarafı hiç denenmedi (sadece iOS simülatörü).
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
- **Egzersiz kütüphanesi Faz 0'da hiç yoktu, Paket 3'te eklendi**: seans ekranının
  gerçek anlamda test edilebilmesi için (Supabase olmadan) `src/db/schema.ts`'e bir
  yerel `exercises` aynası + `src/db/seed-data/exercises.json`'dan bundle-seed eklendi.
  Bu bilinçli bir kapsam genişlemesiydi — Supabase bağlanana kadar geçici.
- **Drizzle migration'ları `babel-plugin-inline-import` ile**, Metro `sourceExts`
  tek başına yetmiyor (dosyayı JS olarak parse etmeye çalışıp çöküyor) — Drizzle'ın
  resmi Expo dokümantasyonundaki yöntem bu, bkz. "Simülatör doğrulaması" bölümü.
