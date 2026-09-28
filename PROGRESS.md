# Powerform — İlerleme Durumu

> Bu dosya oturumlar arası devamlılık içindir. Yeni bir Claude Code oturumu bu projede
> işe başlarken önce bunu, sonra gerekirse `docs/FITNESS_APP_SPEC.md`'nin ilgili
> bölümünü okusun. Tam şartname 2061 satır — tamamını okumak yerine bölüm indeksinden
> (`grep -n "^# [0-9]" docs/FITNESS_APP_SPEC.md`) ilgili aralığı `sed -n` ile al.

Son güncelleme: 2026-09-27 (v1.0.6)

## Hata Düzeltmeleri ve Eklemeler (Son Yapılanlar)
0. **Çoklu Dil Desteği (i18n), Modern Uyarı Pencereleri & Kompakt Profil İstatistikleri (v1.0.6):**
   - **Çoklu Dil (i18n - TR, EN, DE, ES):** `expo-localization` entegre edildi. Telefon dili İngilizce ise İngilizce, değilse Türkçe açılır. `src/lib/i18n.ts` ve `src/stores/useLanguageStore.ts` oluşturuldu; Almanca (`de`) ve İspanyolca (`es`) eklendi. Profil sekmesinde istenildiği zaman değiştirilebilir, tercihler `AsyncStorage`'da kalıcıdır. Egzersiz kütüphanesi isimleri (`getExerciseDisplayName`) seçilen dile göre otomatik yerelleşir.
   - **Modern Uyarı & Onay Modalları (`ModernConfirmModal`, `SessionCompletedModal`):** Kötü görünen ham sistem `Alert.alert` uyarıları kaldırıldı; uygulamanın koyu karbon ve zümrüt yeşili temasına uyumlu modern onay diyalogları ve seans bitimi kutlama kartı oluşturuldu (`app/session.tsx`, `ExerciseCard.tsx`, `app/(tabs)/workout/history/[sessionId].tsx`, `app/weight-trend.tsx`).
   - **Kompakt Profil İstatistikleri:** Profil sayfasındaki 4'lü ızgaradan "Toplam Hacim" kaldırıldı; kalan 3 istatistik (Antrenman, Toplam Süre, Aktif Seri) tek satır halinde (`flex-row gap-2`) küçültüldü ve minimal yer kaplayacak şekilde modernize edildi.
   - **Yeni App Icon & Proguard Release Build:** Yeni modern koyu zümrüt app icon'u tüm Android mipmap klasörlerine uygulandı. Proguard/R8 optimizasyonlu `Powerform-v1.0.6.apk` ve `Powerform-v1.0.6.aab` başarıyla üretildi.
1. **Ana Sayfa Beslenme Yönlendirmesi Çözüldü:** `app/(tabs)/nutrition/_layout.tsx` Stack tanımı eklendi ve `app/(tabs)/index.tsx` içerisindeki "Detay & Öğünler" butonu doğrudan `/(tabs)/nutrition` rotasına yönlendirildi.
2. **Seans Bitimi Sonrası Otomatik Başlama Hatası Giderildi:** `app/session.tsx` bileşeninde `useEffect` bağımlılık dizisindeki `sessionClientUuid` tetiklemesi ve `resetSession` yarış durumu (race condition) ortadan kaldırıldı; `isEndingRef` ve tek seferlik montaj guard'ı eklenerek hayalet seans oluşumu engellendi.
3. **Antrenman Silme Sonrası Ekran Yenilenmesi Sağlandı:** `app/(tabs)/workout/history/index.tsx` ekranına `useFocusEffect` eklendi; seans detayından silinen antrenmanlar sonrası geçmiş ekranına dönüldüğünde liste otomatik olarak SQLite'tan yeniden yüklenir.
4. **Eklenen Besinleri Düzenleme Modülü Tamamlandı:** 
   - `src/components/nutrition/EditFoodEntryModal.tsx` modal bileşeni geliştirildi; besine tıklandığında öğün türü (Kahvaltı, Öğle, Akşam, Ara Öğün), gramaj (hızlı +/- butonları ve manuel giriş) ve porsiyon etiketi değiştirilebilir.
   - Gramaj değiştikçe kalori ve makro besinler orantısal olarak canlı hesaplanır.
   - `src/db/nutrition.ts` içine `updateNutritionEntry` fonksiyonu eklendi; `src/stores/useNutritionStore.ts` içine `updateFoodEntry` bağlandı.
5. **AI Koç & Abonelik Altyapısı (Faz 3 / F24 — RevenueCat & Gemini Entegrasyonu):**
   - **RevenueCat & Abonelik Katmanı (`src/services/subscription.ts`, `src/stores/useSubscriptionStore.ts`):** `react-native-purchases` entegre edildi. API anahtarları girilene kadar otomatik Geliştirici/Simülasyon Modu (`isMockMode`) ile hem test simülasyonu hem de canlı App Store/Google Play desteği sağlandı.
   - **Paywall Modalı (`src/components/subscription/PaywallModal.tsx`):** Koyu temalı, altın taçlı PRO rozeti, özellik listesi, Yıllık/Aylık paket seçimi, 3 gün ücretsiz deneme butonu, geri yükleme ve test modu butonu içeren modern paywall tasarlandı. `app/_layout.tsx` kökünde monte edildi.
   - **Haftalık Veri & Plato Motoru (`src/db/coachAnalytics.ts`):** Son 7 günün antrenmanlarını, egzersiz bazlı 1RM ve ağırlık değişimlerini inceleyip hareketleri `progressing`, `plateau`, `regressing` olarak etiketleyen, haftalık kilo ortalamasını ve beslenme sadakatini toplayan analitik motor yazıldı.
   - **Haftalık Check-In Modalı (`src/components/coach/WeeklyCheckInModal.tsx`):** Analiz öncesi kullanıcıya uyku/toparlanma (1-5), eklem ağrısı/yorgunluk ve beslenme sadakatini soran 3 hızlı interaktif soru penceresi geliştirildi.
   - **Yapay Zeka Analiz & Çoklu Model Motoru (`src/services/aiCoach.ts`):** `gemini-flash-latest`, `gemini-3.8-flash`, `gemini-3.5-flash` modelleriyle 503/429 yoğunluklarına karşı kesintisiz yedekleme (fallback) mimarisi kuruldu.
   - **Modern AI Yanıt Kartı (`src/components/coach/FormattedCoachMessage.tsx`):** Ham metin yerine otomatik Markdown ayrıştırma; 🏆 Özet (yeşil), 🔍 Plato & Değişiklik (kehribar), ⚖️ Kilo & Beslenme (mavi), 🎯 Eylem Planı (mor) temalı görsel kartlar, `**kalın**` tipografi vurguları, özel madde imleri ve AI Koç başlık rozeti ile tam entegre edildi.
   - **Yenilenen Koç Sekmesi & Mesaj Aksiyonları (`app/(tabs)/coach/index.tsx`):** Kilitli PRO önizlemesi, haftalık performans paneli, "Haftalık Gelişimimi Analiz Et" butonu, önerilen soru çipleri, **mesaj kopyalama (`expo-clipboard`)**, **gönderilen mesajı düzenleyip tekrar gönderme** ve **koç cevabını yeniden yanıtlama (Regenerate)** özellikleri tamamlandı.
6. **AI Sohbet ve Haftalık Analiz Raporları Geçmişi (Chat History & Archive):**
   - **Yerel Veritabanı Tabloları (`src/db/schema.ts`, `0007_true_warbird.sql`):** `ai_conversations`, `ai_messages` ve `ai_reports` tabloları eklendi ve `drizzle-kit` ile Expo SQLite migration altyapısına bağlandı.
   - **Geçmiş Servisi (`src/db/aiHistory.ts`):** Raporları kaydetme, listeleme, silme; sohbet oturumları oluşturma, mesajları kaydetme, ilk soruya göre otomatik başlık güncelleme ve Supabase senkronu sağlandı.
   - **Geçmiş & Arşiv Modalı (`src/components/coach/CoachHistoryModal.tsx`):** "💬 Sohbetler" (oturum listesi, mesaj sayısı, son aktivite, yeni sohbet başlatma, silme) ve "📊 Haftalık Raporlar" (tarih aralıklarıyla analiz raporları, detay inceleme/kopyalama ve silme) çift sekmeli modern arayüz geliştirildi.
   - **Ekran Entegrasyonu (`app/(tabs)/coach/index.tsx`):** Üst başlıkta "Yeni Sohbet (+)" ve "Geçmiş" butonları, performans kartı altında "Önceki Raporlar ve Sohbet Geçmişi" kısayolu ve tüm mesajların/raporların anlık kaydedilmesi bağlandı.
7. **Kişiselleştirilmiş 5 Adımlı İnteraktif Onboarding Akışı (`app/(onboarding)/profile-setup.tsx`):**
   - **Adım 1 (Cinsiyet & Yaş):** Modern dokunsal kartlarla cinsiyet seçimi (♂️ Erkek, ♀️ Kadın, ⚧ Diğer, 🔒 Belirtmek İstemiyorum), dinamik doğum yılı stepper'ı ve anlık yaş rozeti ("🎉 28 yaşındasın").
   - **Adım 2 (Boy & Kilo):** Hızlı stepper'lar (+/-1 cm, +/-0.5 kg), doğrudan sayısal giriş ve canlı Vücut Kitle İndeksi (BMI) hesaplama rozeti (ör. "BMI: 23.7 — Normal & İdeal Aralık"). İlk tartı kaydı SQLite `body_weight_logs`'a otomatik tohumlanır.
   - **Adım 3 (Ana Hedef & Deneyim):** Görsel hedef kartları (Kas Kütlesi/Hipertrofi, Güç, Yağ Kaybı/Definasyon, Recomp, Genel Sağlık) ve deneyim kartları (🌱 Başlangıç, 🌿 Orta, 🌳 İleri).
   - **Adım 4 (Haftalık Sıklık & Ekipman):** Haftada 2-6 gün antrenman sıklığı seçimi (4 Gün önerilen rozeti) ve tam donanımlı salon / tek tek ekipman seçimi.
   - **Adım 5 (Kişisel Plan Özeti & Beslenme Hedefleri):** Kullanıcının BMR/TDEE hesaplaması ile günlük kalori hedefi (örn. 2.650 kcal), 2.0g/kg protein hedefi, karbonhidrat ve yağ dağılımı otomatik hesaplanır; `saveNutritionTargets` ile yerel veritabanına ve buluta kaydedilir. Hedefe uygun başlangıç programı (PPL, Upper/Lower, Full Body) eşleştirilir.
   - **Karşılama Ekranı Cilası (`app/(onboarding)/welcome.tsx`):** 3 slaytlık değer önerisi carousel'i sonrasında doğrudan bu interaktif akışa geçiş sağlandı.

## Neresindeyiz

**Antrenman & Program Yönetimi (F4, F5, F6) ve Antrenman Geçmişi (F7) — TAMAMLANDI VE DOĞRULANDI.**
1. **6 Hazır Program Şablonu (F5):** Supabase ve yerel SQLite'a (çevrimdışı hazır) tohumlandı (PPL, Upper/Lower, 5 Günlük Hipertrofi, Full Body, Güç, Yeni Başlayan).
2. **Şablon Galerisi & Detayı (`app/(tabs)/workout/templates/`):** Şablon listeleme, gün ve egzersiz detayları (hedef set/tekrar/RIR/dinlenme süreleri), "Programı Başlat (Aktif Yap)" ve "Kopyala & Düzenle" akışları tamamlandı.
3. **Program Oluşturucu & Düzenleyici (`app/(tabs)/workout/editor.tsx` — F4):** Özel program oluşturma, gün ekleme/silme, `ExercisePickerSheet` ile egzersiz ekleme, hedef set/tekrar/RIR/mola düzenleme ve kaydetme akışı tamamlandı.
4. **Yenilenen Antrenman Ana Ekranı (`app/(tabs)/workout/index.tsx`):** Aktif program kartı, gün seçici sekmeler, günün egzersizleri ve **doğrudan ilgili günün hedefleriyle "Antrenmanı Başlat"** butonu (F6 entegrasyonu).
5. **Antrenman Geçmişi & Seans Detayı (`app/(tabs)/workout/history/` — F7):** `src/db/history.ts`, aylık gruplanmış seans listesi, toplam kaldırılan hacim/süre/antrenman istatistik şeridi, set-set ağırlık/tekrar/e1RM detay tablosu ve seans silme özelliği eklendi.

**Faz 2 (Takip ve Grafikler) — TAMAMLANDI VE DOĞRULANDI.**
1. **Egzersiz Detayında İlerleme & e1RM Trendi (`app/(tabs)/library/[exerciseId].tsx`):** Egzersizin zaman içindeki e1RM gelişimini görselleştiren responsive çubuk grafik, trend farkı (▲/▼ kg) ve geçmiş seans performans kayıtları listesi eklendi.
2. **Kilo Takibi & 7 Günlük MA Trend Grafiği (`app/weight-trend.tsx` — spec §13):** Günlük tartı kayıtları, 7 günlük hareketli ortalama (7-day MA), haftalık değişim hızı (kg/hf) ve etkileşimli trend grafiği tamamlandı. "Bugün" ekranındaki hızlı kilo kartına doğrudan bağlantı eklendi.
3. **Profil Sekmesi İstatistikleri & Rekorlar (`app/(tabs)/profile/index.tsx`):** Ömür boyu antrenman istatistikleri (toplam seans, toplam hacim tonajı, toplam süre, aktif seri), en iyi kişisel rekorlar (PRs) vitrin tablosu ve hızlı araç menüsü eklendi.
4. **İki Yönlü Offline Senkron Motoru (`src/db/syncEngine.ts` — spec §12.4):** Yerel SQLite'ta `sync_mutations` tablosunda biriken seans, egzersiz, set ve kilo kayıtlarını Supabase'e arka planda güvenle aktaran, seans bitiminde ve uygulama açılışında otomatik çalışan senkron motoru yazıldı.

**Faz 4 (Beslenme Takibi) — TAMAMLANDI VE DOĞRULANDI.**
1. **Veritabanı & Çevrimdışı Seed (`src/db/seed-data/foods.json`):** 40+ temel Türkçe gıda ve fitness besini (Tavuk göğsü, yumurta, yulaf, lor, somon, kıyma, muz, pirinç vb.) standart gramaj ve hazır porsiyonlarıyla yerel SQLite'a tohumlandı (`foods`, `food_servings`, `nutrition_entries`, `nutrition_targets` tabloları, `0006_aspiring_joshua_kane.sql` migration'ı).
2. **TDEE & Makro Hesaplayıcı (`src/lib/nutritionCalculations.ts`):** Mifflin-St Jeor BMR formülü, antrenman sıklığı aktivite çarpanı, hedefe göre kalori fazlası/açığı (+300 kcal / -400 kcal) ve 2.0g/kg protein hedefiyle çalışan otomatik makro hesaplayıcı.
3. **Beslenme Sekmesi (`app/(tabs)/nutrition/index.tsx`):** Kalan kalori sayacı, kalori ilerleme barı, 3 ana makro besin çubuğu (Protein `#38BDF8`, Karbonhidrat `#FBBF24`, Yağ `#F87171`), tarih değiştirici (Bugün/Dün/Yarın) ve 4 ana öğün (Kahvaltı, Öğle, Akşam, Ara Öğün) listesi.
4. **Besin Arama & Porsiyon Seçici (`src/components/nutrition/FoodPickerSheet.tsx`):** Anlık besin arama, hazır porsiyon veya serbest gramaj girişi, dinamik kalori ve makro önizlemesi ile tek tıkla öğüne ekleme.
5. **Hedef Düzenleyici (`src/components/nutrition/TargetEditorModal.tsx`):** Kullanıcının kalori ve makro hedeflerini özelleştirmesini veya profilden otomatik yeniden hesaplamasını sağlayan modal.
6. **"Bugün" Ekranı Entegrasyonu (`app/(tabs)/index.tsx`):** Ana sayfadaki statik placeholder kaldırıldı, günün anlık tüketilen kalorisi, kalan kalori ve protein çubuğu doğrudan beslenme sekmesine bağlandı.
7. **İki Yönlü Senkron:** Besin kayıtları (`nutrition_entries`) `sync_mutations` kuyruğu üzerinden otomatik Supabase ile eşitlenir.

**Faz 5 (Yasal, KVKK, Veri Dışa Aktarma & Hesap Silme) — TAMAMLANDI VE DOĞRULANDI.**
1. **Yasal Metinler & Sağlık Sorumluluk Reddi (`app/legal.tsx` — spec §13):**
   - Sağlık Sorumluluk Reddi (Disclaimer): Tıbbi tavsiye değildir, egzersize başlamadan hekime danışılmalı, egzersiz sırasında rahatsızlık hissedilirse derhal durdurulmalı.
   - Yeme Bozukluğu Koruması: Kadınlarda <1.200 kcal, erkeklerde <1.500 kcal altındaki kalori hedeflerine izin verilmez; 18 yaş altına kalori açığı verilmez; haftalık vücut ağırlığının >%1.5'i hızlı kilo kaybı uyarı üretir; TC Sağlık Bakanlığı MHRS (182) ve psikiyatri yönlendirmesi.
   - 6698 Sayılı KVKK Aydınlatma Metni: Veri sınıflandırması (Kişisel veri vs. Özel nitelikli sağlık verisi), AB (Frankfurt) sunucu saklama bölgesi, ticari reklam ağlarına asla satılmama garantisi.
2. **Kullanıcı Veri Dışa Aktarımı (`src/lib/dataExport.ts` — KVKK md. 11 Taşınabilirlik Hakkı):**
   - Kullanıcının tüm antrenman geçmişini, seans detaylarını, özel programlarını, kilo kayıtlarını ve beslenme hedefleri ile öğün girişlerini açık standartta JSON formatında paketler ve sistem paylaşım menüsü (`Share.share`) ile dışa aktarır.
3. **Hesap ve Veri Silme Akışı (`src/lib/accountDeletion.ts` — KVKK md. 11 Unutulma Hakkı):**
   - Kullanıcı onaylı alert diyaloğu sonrasında Supabase profilini (ON DELETE CASCADE ile ilişkili tüm bulut verilerini), yerel SQLite'taki seans, set, program, kilo, beslenme ve senkron kayıtlarını temizler ve oturumu kapatır.
4. **Profil Ekranı Entegrasyonu (`app/(tabs)/profile/index.tsx`):**
   - "Gizlilik ve Yasal" kartı eklendi: "Yasal ve Gizlilik İlkeleri" (`/legal`), "Verilerimi Dışa Aktar (JSON)" (loading göstergeli), ve "Hesabımı ve Tüm Verilerimi Kalıcı Olarak Sil" (kırmızı onaylı buton).
5. **Karşılama Ekranı Aydınlatması (`app/(onboarding)/welcome.tsx`):**
   - Kullanıcıya değer önerileri listesi ve doğrudan `/legal` modalına bağlanan Sağlık Sorumluluk Reddi / KVKK onay metni eklendi.
6. TypeScript derlemesi (`npx tsc --noEmit`) ve hem iOS hem Android Expo bundle export testleri (`npx expo export --platform ios/android`) 0 hata ile doğrulandı.

**Kullanılabilirlik ve Cila İyileştirmeleri — TAMAMLANDI VE DOĞRULANDI.**
1. **Şifre Sıfırlama Akışı (`app/(auth)/forgot-password.tsx`):** Kullanıcının e-posta adresine şifre sıfırlama bağlantısı gönderen (`supabase.auth.resetPasswordForEmail`), durum mesajları ve `login.tsx` ekranındaki "Şifremi unuttum" butonu ile entegre ekran yazıldı.
2. **Özel Besin Ekleme Modülü (`src/db/nutrition.ts` & `src/components/nutrition/FoodPickerSheet.tsx`):** Kullanıcının kendi gıdalarını veya paketli ürünlerini (isim, marka, 100g kalori, protein, karb, yağ ve porsiyon bilgisi) yerel veritabanına ekleyip anında öğününe loglayabilmesini sağlayan özel besin formu eklendi. Arama boş kaldığında otomatik öneri sunulur.
3. **Egzersiz Notu Ekleme & Düzenleme (`src/stores/useSessionStore.ts`, `src/components/session/ExerciseCard.tsx`):** Aktif antrenman sırasında her egzersiz için makine ayarı, koltuk yüksekliği, sakatlık veya tutuş notları (`notes`) girebilme, SQLite'a kaydetme ve seans geçmişinde (`app/(tabs)/workout/history/[sessionId].tsx`) bu notları görüntüleme özelliği eklendi.
4. **Egzersiz Kartlarında Türkçe İsim Desteği:** Seans esnasında ve geçmiş dökümünde öncelikle Türkçe isim (`nameTr`) gösterilecek şekilde optimize edildi.
5. **Donanım Destekli Güvenli Oturum Depolaması (`src/lib/secureStoreAdapter.ts` & `src/lib/supabase.ts`):** `AsyncStorage` yerine `expo-secure-store` adaptörüne geçildi. Android Keystore 2048 bayt sınırını aşan JWT oturumları için otomatik veri parçalama (chunking) ve eski `AsyncStorage` oturumlarını şifreli kasaya taşıyan kesintisiz migrasyon motoru yazıldı.
6. **3 Slaytlık Karşılama Carousel'i (`app/(onboarding)/welcome.tsx` — spec §11):** Antrenman, Performans/PR ve Beslenme/TDEE değer önerilerini tanıtan yatay kaydırmalı (swipeable) carousel, sayfa indikatörleri (pagination dots), "Atla" kısayolu ve yasal metin onay bağlantısı tamamlandı.
7. **Profil Düzenleme Ekranı (`app/edit-profile.tsx`):** Kullanıcının ana hedefini, antrenman deneyim seviyesini, haftalık gün hedefini, boyunu, doğum yılını, cinsiyetini ve mevcut ekipmanlarını istediği an güncelleyebilmesini sağlayan modal ekran yazıldı; Profil sekmesi başlığına ve araçlar listesine bağlandı.

**Faz 0 (Temel) — kısmen tamamlandı.** Proje `~/Desktop/Powerform` altında, Expo SDK 57 +
TypeScript + Expo Router + NativeWind + Zustand + TanStack Query + Supabase JS +
Drizzle/expo-sqlite ile scaffold edildi. Supabase migration'ları (§6-7 DDL'in tamamı)
ve RLS pgTAP testi yazıldı. Navigasyon iskeleti (6 sekme + auth + onboarding + tam
ekran seans modalı) çalışır durumda ama ekranların içi büyük ölçüde placeholder.

**Kütüphane ekranı (F3) yazıldı ve gerçek veriyle çalışıyor.** Arama + ekipman filtresi
+ liste + detay ekranı; gerçek görsel (jsdelivr CDN) ve kas grubu etiketleri. Detay
ekranından listeye gerçek bir native geri dönüş var (ayrı `Stack` navigator ile).
Detaylar aşağıda "Tamamlanan (Kütüphane ekranı)" bölümünde.

**Egzersiz kütüphanesi artık Supabase'den senkronize ediliyor (§12'nin salt-okunur ilk
parçası) — "sadece İngilizce" kısıtlaması kalktı.** `src/db/syncExercises.ts`: uygulama
açılışında (önce bundle-seed, sonra arka planda bu senkron) Supabase'deki gerçek
`exercises`/`exercise_muscles`/`exercise_media` tablolarını çekip yerel SQLite'ı `slug`
üzerinden upsert eder — `id` böylece bundle'daki geçici slug-string'den gerçek Supabase
uuid'sine geçer. Kütüphane detay ekranı artık Türkçe talimat/ipucu/yaygın hata metnini
gösteriyor (TR yoksa İngilizce'ye düşer). iOS simülatöründe deep-link ile doğrulandı
(`3/4 Sit-Up` egzersizi gerçek TR talimatlarla render oldu). Bu, tam iki-yönlü
`sync_mutations` motoru DEĞİL — sadece salt-okunur, tek yönlü (Supabase → yerel) bir
senkron; seans loglama (yazma yönü) hâlâ Paket 3'ün yerel-only akışıyla çalışıyor.
Detaylar aşağıda "Tamamlanan (Egzersiz kütüphanesi senkronu)" bölümünde.

**"Bugün" ekranı (F3, ana sekme) placeholder'dan çıkıp modern + gerçek veri gösteren bir
tasarıma kavuştu.** Hero kart (devam eden seans varsa "Devam Et", yoksa son seans özeti +
"Seansı Başlat"), 3'lü istatistik şeridi (gün serisi, bu hafta kaç seans, son seansın
hacmi — hepsi yerel `workout_sessions`/`session_sets`'ten gerçek hesaplama), ve yeni bir
gerçek özellik: **Hızlı kilo girişi** (`src/db/bodyWeight.ts` + yeni `body_weight_logs`
yerel tablosu, günde tek kayıt, önceki ölçüme göre ▲/▼ trend). Takip eden turda
kullanıcının istediği 4 fikir daha eklendi: **DB'den gerçek seans devam ettirme**
(uygulama öldürülüp açılsa bile `useSessionStore.hydrateActiveSession` ile), **haftalık
PR sayacı**, **haftalık hacim trendi** (geçen haftaya göre ▲/▼) ve **son 7 günün kas
grubu dağılımı** (basit orantılı çubuklar). Beslenme ve AI raporu bölümleri o paketler
hiç yazılmadığı (ne bir kalori/protein hedefi ne de tüketim kaydı var) için sahte sayı
göstermek yerine dürüst bir "yakında" kartı olarak bırakıldı — bunlar ayrı, büyük paketler
gerektiriyor. Cihaz üzerinde her adımda sahte veri enjekte edilip (sonra temizlenip) hem
boş hem dolu durumlar, hem de gerçek uygulama-öldürme senaryosu doğrulandı. Detaylar
aşağıda "Tamamlanan (Bugün ekranı yeniden tasarımı)" bölümünde.

**Paket 3 (seans ekranı) — YAZILDI VE GERÇEK BİR iOS SİMÜLATÖRÜNDE UÇTAN UCA
DOĞRULANDI** (Expo Go üzerinden, iPhone 17 Pro / iOS 26.2 simülatörü). Ekran tamamen
yerel SQLite üzerinde, "boş/ad-hoc seans" akışıyla çalışıyor (program bazlı başlatma
henüz yok, program oluşturucu da yok). Bu doğrulama sürecinde **3 gerçek bug bulundu
ve düzeltildi** (Drizzle migration'ları hiç çalışmıyordu, .sql importu Metro'yu
kırıyordu, kütüphane detay ekranı sekme çubuğunda fazladan bir sekme olarak
görünüyordu) — detaylar aşağıda "Simülatör doğrulaması" bölümünde.

**Faz 0'ın kalanı — Auth akışı Supabase'e bağlandı ve GERÇEK BİR HESAPLA UÇTAN UCA
DOĞRULANDI.** Kullanıcı kendi Supabase projesini (`srbhvxajhnqbsluoysqo`, eu-bölgesi)
verdi; 12 migration + bir düzeltme migration'ı o projeye uygulandı, gerçek
`src/types/database.ts` üretildi, login/register/useAuthStore/routing yazıldı.
Kayıt → e-posta onayı → giriş → onboarding'e otomatik yönlendirme zinciri kullanıcının
kendi Gmail hesabıyla gerçekten test edildi ve çalıştı. Bu süreçte **bir gerçek backend
bug'ı** bulundu ve düzeltildi (`handle_new_user` trigger'ı `search_path` eksikliğinden
her kayıtta "Database error saving new user" ile başarısız oluyordu). Detaylar
aşağıda "Auth akışı doğrulaması" bölümünde.

**Onboarding formu (profil kurulumu) yazıldı ve GERÇEK BİR HESAPLA UÇTAN UCA
DOĞRULANDI.** Karşılama → profil formu (boy/kilo/doğum yılı/cinsiyet/deneyim/hedef/
gün/ekipman) → submit → `(tabs)`'a otomatik yönlendirme. "Çıkış Yap" da bu sırada
tıklanarak doğrulandı. Artık her yeni kullanıcı kayıttan `(tabs)`'a kadar tüm zinciri
tamamlayabiliyor. Detaylar aşağıda "Tamamlanan (Onboarding formu — profil kurulumu)"
bölümünde.

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

**Çeviri ve Supabase'e yazma da TAMAMLANDI** (sonraki oturumda bitirildi):

- Anthropic Developer API hem "identity-linked key" (workspace header) hem de
  "credit balance too low" (Claude Pro ≠ Developer API billing, ayrı sistemler)
  sorunlarına takıldı. Kullanıcının kararıyla çeviri, Developer API yerine bu Claude
  Code oturumunun kendi model erişimiyle (9 paralel arka plan `Agent`'ı, her biri
  ~98 egzersizlik bir chunk) yapıldı — `translate.ts`'in beklediği ile birebir aynı
  önbellek formatına (`{slug: {instructions_tr, cues_tr, common_mistakes_tr}}`)
  yazıldı, böylece `translate.ts`/`write.ts` hiç değiştirilmeden kullanılabildi.
  2 ajan oturum rate-limit'ine takılıp yeniden başlatıldı, 1 ajan ~40 dakika sürdü
  (tek seferde uzun bir "thinking" bloğu) ama sonunda tamamlandı — 876/876 slug
  doğrulandı (input/output slug eşleşmesi + `instructions_en`/`instructions_tr`
  aynı uzunlukta, script ile otomatik kontrol edildi).
- `npm run seed:exercises` çalıştırıldı (env değişkenleri `set -a; source .env; set +a`
  ile export edilerek — `tsx` `.env`'i otomatik okumuyor, bkz. "Bilinen kararlar").
  **Bulunan ve düzeltilen gerçek bug:** `exercise_muscles` tablosunun PK'sı
  `(exercise_id, muscle_group_id)` (rol dahil değil) — kaynak veride aynı egzersiz için
  iki farklı ham kas ismi aynı `muscle_group_id`'ye eşleniyor (örn. "middle back" ve
  başka bir kas ikisi de `upper_back`'e), bu da `write.ts`'in insert'inde
  `duplicate key value violates unique constraint` hatasıyla çöküyordu. Düzeltme:
  `write.ts`'te insert'ten önce `(exercise_id, muscle_group_id)` bazında dedupe
  eklendi, çakışmada `primary` rolü `secondary`'ye tercih ediliyor (hacim hesabında
  daha yüksek katsayı taşıdığı için).
- **Sonuç doğrulandı** (REST API ile canlı sorgulanarak): `exercises` 876,
  `exercise_muscles` 2481 (2490 → 9 dedupe), `exercise_media` 1746, `muscle_groups` 16.
  Türkçe talimat/ipucu metinleri gerçek verilerle kontrol edildi.

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

## Tamamlanan (Kütüphane ekranı — F3)

- [x] `app/(tabs)/library/_layout.tsx` (yeni) — `index` ve `[exerciseId]` için ayrı bir
      `Stack` navigator. Bu olmadan Expo Router ikisini Tabs'ın kardeş ekranları olarak
      keşfediyordu ve detaydan listeye gerçek bir geri dönüş yolu yoktu — kullanıcı bunu
      test ederken yakaladı ("bir harekete girdiğim zaman kütüphane ekranına
      geri dönemiyorum"). `app/(tabs)/_layout.tsx`'teki eski `href: null` iş-arounду
      kaldırıldı.
- [x] `app/(tabs)/library/index.tsx` — arama input'u + yatay kaydırmalı ekipman filtre
      `Chip` satırı + `FlatList`: her satırda 64×64 `expo-image` küçük resim, isim
      (TR varsa TR, yoksa EN), ekipman + ilk 2 kas grubu etiketi, chevron.
- [x] `app/(tabs)/library/[exerciseId].tsx` — dinamik başlık (`Stack.Screen options`),
      hero görsel, ekipman/kas etiketleri, PR (e1RM) ve "geçen sefer set sayısı" kartları,
      numaralı "Nasıl yapılır" listesi, "geçen seferki setler" kartı. **Güncelleme:**
      artık `instructions_tr`/`cues_tr`/`common_mistakes_tr` de gösteriliyor — bkz.
      "Tamamlanan (Egzersiz kütüphanesi senkronu)" bölümü.
- [x] `src/db/schema.ts` + migration `0001_slim_maggott.sql` — yerel `exercises`
      tablosuna `instructions_en`, `primary_muscles`, `image_url` eklendi.
- [x] `scripts/seed-exercises/build-local-seed.ts` (yeni, `npm run seed:local-library`) —
      Paket 2'nin credential gerektirmeyen ara çıktılarını (`transformed-exercises.json` +
      `media.json` + `muscle-links.json`) `src/db/seed-data/exercises.json`'a (876 kayıt)
      birleştirir — Supabase/Anthropic credential'ı olmadan bile gerçek açıklama/görsel/
      kas verisiyle test edilebilsin diye.
- [x] **Bulunan ve düzeltilen gerçek bug:** `src/db/seedExercises.ts`'teki
      `onConflictDoUpdate({ set: { nameEn: exercises.nameEn, ... } })` çakışan satırlarda
      sessiz bir no-op'tu — `exercises.nameEn` hedef tablonun KENDİ (eski) sütununu işaret
      ediyor, gelen yeni değeri değil. Sonuç: eski seed'den (38 kayıt) kalma satırlar hiç
      güncellenmiyordu, sadece yeni 838 kayıt görsel/açıklama alıyordu. Düzeltme:
      `sql\`excluded.<col>\`` ile gelen satırın değerine referans verildi. Cihaz üzerindeki
      SQLite dosyası doğrudan `sqlite3` ile sorgulanarak doğrulandı (uygulama ekran
      görüntüsü değil, ham veri).
- [x] `expo-image` (`npx expo install expo-image`) — thumbnail/hero görseller için
      (`contentFit`, `transition` props'larıyla).

**Bilinen sınırlama:** görsel şu an sadece statik jpeg (free-exercise-db) — spec'in
istediği GIF/video (§4.1 YouTube/Cloudflare Stream stratejisi) hiç yok.

## Tamamlanan (Egzersiz kütüphanesi senkronu — Supabase → yerel, §12'nin ilk parçası)

- [x] `src/db/schema.ts` + migration `0002_burly_legion.sql` — yerel `exercises`
      tablosuna `instructions_tr`, `cues_tr`, `common_mistakes_tr` (json text[]) eklendi.
- [x] `src/db/syncExercises.ts` (yeni) — Supabase'deki `exercises` (sayfalanmış, 1000'lik
      `range()` sayfalarıyla), `exercise_muscles` (`role = 'primary'` filtreli) ve
      `exercise_media` (`media_type = 'image'`, `is_active`, `display_order`'a göre ilk
      görsel) tablolarını çekip yerel `exercises`'a `slug` üzerinden `onConflictDoUpdate`
      ile yazar. Çakışma anahtarı bilinçli olarak `id` değil `slug`: bundle-seed'deki
      geçici satırların `id`'si slug string'ken (`seedExercises.ts`) Supabase'in gerçek
      uuid'si farklı olduğu için `id`'yi de `set` içinde `excluded.id` ile güncelliyor —
      aksi halde aynı egzersiz için iki ayrı satır (biri eski slug-id'li, biri yeni
      uuid'li) oluşurdu. `set` içindeki her alan `seedExercises.ts`'deki no-op upsert
      bug'ını tekrarlamamak için `sql\`excluded.<col>\`` kullanıyor.
- [x] Günde bir senkron sınırı: `AsyncStorage` üzerinde `lastSyncedAt` — her açılışta
      876+2481+1746 satırlık gereksiz ağ isteği atılmasın diye (`force: true` ile
      bypass edilebilir, henüz UI'dan tetiklenmiyor).
- [x] `app/_layout.tsx` — migration bitince önce `seedLocalExercisesIfEmpty()` (ağsız ilk
      açılışta anında kullanılabilirlik için, §12 kuralı), ardından arka planda
      `syncExercisesFromSupabase()`. Senkron başarısız olursa (ağ yok vb.) sessizce
      vazgeçilir, bundle veri olduğu gibi kalır — UI hiçbir zaman bloklanmaz veya hataya
      düşmez.
- [x] `app/(tabs)/library/[exerciseId].tsx` — "Nasıl yapılır" artık `instructions_tr`
      varsa onu gösteriyor (yoksa `instructions_en`'e düşüyor ve o durumda "şimdilik
      sadece İngilizce" notu kalıyor); ayrıca yeni "İpuçları" (`cues_tr`) ve "Sık yapılan
      hatalar" (`common_mistakes_tr`) kartları eklendi.
- [x] Anon key ile `exercise_muscles`/`exercise_media`/`muscle_groups` okuma erişimi
      `curl` ile doğrulandı (bu üç tabloda RLS `012_rls.sql`'de hiç etkinleştirilmemiş —
      sadece `exercises`'ın kendisinde `read_exercises` politikası var — ama Supabase'in
      varsayılan `anon`/`authenticated` grant'ları sayesinde okuma zaten çalışıyor).
- [x] iOS simülatöründe uçtan uca doğrulandı (Expo Go, `exp://127.0.0.1:8081/--/library`
      ve `/library/<uuid>` deep link'leriyle): Kütüphane listesi gerçek görsel/isim/kas
      etiketleriyle geldi, "3/4 Sit-Up" detay ekranı gerçek Türkçe talimat/ipucu/yaygın
      hata metniyle render oldu — `getExerciseById` çağrısının Supabase'in gerçek
      uuid'siyle (`425fc1f5-...`) eşleştiği, yani `slug` üzerinden upsert'in `id`'yi
      doğru şekilde bundle'daki geçici değerden gerçek değere taşıdığı kanıtlandı.

**Bilinçli sınırlama / kapsam dışı:** bu SADECE tek yönlü (Supabase → yerel), salt-okunur
bir senkron — §12.4'teki tam `sync_mutations` kuyruğu (NetInfo dinleyicisi, üstel geri
çekilme, çakışma çözümü tabloları) hâlâ yazılmadı. Seans loglama (yazma yönü) bu
senkrondan etkilenmiyor, Paket 3'ün yerel-only akışıyla çalışmaya devam ediyor. Ayrıca:
mevcut cihazda daha önce (bu değişiklikten önce) loglanmış seans varsa, o seansların
`session_exercises.exerciseId`'si eski slug-tabanlı id'yi taşıyordu — senkron sonrası
`exercises.id` gerçek uuid'ye değiştiği için o eski referanslar artık eşleşmeyebilir.
Şu an canlı kullanıcı verisi olmadığı için blokaj değil, ama not düşülüyor.

## Tamamlanan (Bugün ekranı yeniden tasarımı)

Eskiden 3 statik `Card` placeholder'dan ibaretti ("Faz 1/2'de gerçek veriyle
doldurulacak" notuyla). Kullanıcı isteği: "daha modern daha iyi bir arayüzle tasarla,
başka neler olabilir araştır" — spec §11'in BUGÜN listesi (antrenman kartı, hızlı kilo
girişi, kalori/protein halkası, AI rapor banner'ı) referans alındı, ama sadece GERÇEK
veriyle doldurulabilecek kısımlar dolduruldu.

- [x] `app/(tabs)/index.tsx` — tamamen yeniden yazıldı:
      - Hero kart: `useSessionStore`'daki `sessionClientUuid` doluysa "Devam eden seans"
        + [Seansa Devam Et]; boşsa son tamamlanmış seansın özeti (tarih/hacim/süre) +
        [Seansı Başlat] (mevcut ad-hoc akışa bağlanıyor, `app/(tabs)/workout/index.tsx`
        ile aynı `router.push('/session')` deseni).
      - 3'lü istatistik şeridi (`StatPill`): gün serisi (🔥), bu hafta kaç seans (📅),
        son seansın toplam hacmi (🏋️).
      - "Hızlı kilo girişi" kartı — gerçek yeni özellik, aşağıda detaylı.
      - Beslenme kartı: dürüst "yakında" durumu (sahte kalori/protein sayısı YOK —
        o paket hiç yazılmadığı için üretilecek her sayı uydurma olurdu).
      - AI rapor banner'ı: spec'te zaten koşullu ("varsa") — Paket 4 (AI katmanı) hiç
        yazılmadığı için hiç render edilmiyor, bu spec'e aykırı değil.
      - `useFocusEffect` ile her odaklanmada tazeleniyor (ör. bir seans bitirip bu
        sekmeye dönünce seri/hacim güncel olsun).
- [x] `src/db/queries.ts` → `getTodaySummary(userId)`: sadece tamamlanmış seanslara
      bakar (in_progress durumu Zustand store'dan geliyor — bkz. aşağıdaki bilinçli
      sınırlama). Seri hesabı ve hafta başlangıcı için saf yardımcı fonksiyonlar
      `src/lib/calculations.ts`'e eklendi: `dateKey`, `startOfWeek`, `computeStreakDays`
      (test edilebilirlik için `now` parametre olarak enjekte ediliyor — proje şu an
      hiç test altyapısına sahip değil, bu yüzden test yazılmadı, ama fonksiyonlar saf
      tutuldu ki ileride yazılabilsin).
- [x] **Gerçek yeni özellik — Hızlı kilo girişi:** `src/db/schema.ts`'e yeni
      `body_weight_logs` yerel tablosu (migration `0003_busy_eddie_brock.sql`),
      sunucudaki `body_weight_logs`'un (zaten var olan `007_body.sql`, RLS `012_rls.sql`
      `own_weight` politikasıyla korunuyor) `(user_id, logged_on)` UNIQUE kısıtını
      birebir yansıtıyor. `src/db/bodyWeight.ts`: `getTodayBodyWeight`, `logBodyWeight`
      (günde tek kayıt, varsa üzerine yazar), `getRecentBodyWeights`. Diğer yerel
      yazmalarla aynı desen: `recordMutation('body_weight_logs', ...)` ile kuyruğa
      giriyor (§12.4 kuyruğu henüz işlemiyor, sadece topluyor — `useSessionStore` ile
      aynı bilinçli sınırlama).
      `src/components/today/WeightQuickEntry.tsx`: bugün girilmemişse input + Kaydet;
      girilmişse değeri gösterir, önceki ölçüme göre ▲/▼ farkı, "Düzenle" ile üzerine
      yazma.
- [x] `src/components/today/StatPill.tsx` (yeni, küçük paylaşılan bileşen).
- [x] Cihazda uçtan uca doğrulandı: `sqlite3` ile doğrudan cihazın yerel DB dosyasına
      (tamamlanmış 2 sahte seans + bugün için bir kilo kaydı) satır enjekte edilip
      ekran yeniden yüklendi — seri "2", bu hafta "2", son hacim "1.000 kg", "Son seans:
      Bugün · 1.000 kg hacim · 50 dk", kilo kartı "82.4 kg" + "Düzenle" doğru şekilde
      render oldu. Test verisi doğrulama sonrası temizlendi (`DELETE ... WHERE
      client_uuid IN ('seed-...')`). Boş durum (hiç seans/kilo kaydı yokken) da ayrıca
      doğrulandı: seri "—", bu hafta "0", son hacim "—", kilo kartı boş input.
      `npx tsc --noEmit` ve `npx expo export --platform ios` hatasız.

### Takip — "araştırdığım ama yapmadığım fikirler"den 4'ü de eklendi

Kullanıcı "yapmadığın 6 fikri yapabilirsin" dedi. 4'ü (gerçek veriyle mümkün olanlar)
eklendi, 2'si (AI rapor banner'ı, kalori/protein halkası) sahte veri gerektirdiği için
YAPILMADI — gerekçesi aşağıda.

- [x] **1. Gerçek "devam eden seans" tespiti (DB'den resume).** Önceki sınırlama
      giderildi: `useSessionStore.ts`'e `hydrateActiveSession()` eklendi — kullanıcının
      `status='in_progress'` en son seansını (varsa) `session_exercises`/`session_sets`'ten
      okuyup store'u tam olarak yeniden kurar (egzersiz meta verisi, onaylanmış setler,
      `lastPerformance`, güncel `runningBestE1RM`). Zaten aktif bir seans varsa
      (`get().sessionClientUuid` dolu) hiçbir şey yapmadan çıkar — aksi halde bu
      seansın az önce kırılan PR'larını sıfırlardı. `resumeOrStartSession()` bunu
      sarmalar: önce hydrate dener, hâlâ boşsa `startSession()` ile yeni açar.
      `app/session.tsx` artık `startSession` yerine `resumeOrStartSession` çağırıyor;
      `app/_layout.tsx` da auth hazır olur olmaz store'u erkenden ısıtıyor (Bugün ekranı
      hiç /session'a girmeden "Devam Et" gösterebilsin diye).
      **Bilinen basitleştirme:** DB'den geri yüklenen ONAYLANMIŞ setlerin `isPr` bayrağı
      `false` olarak gelir (DB'de hiç saklanmıyor, kronolojik olarak yeniden hesaplamak
      gerekirdi) — sadece görsel PR rozeti geçmiş setlerde görünmez, hacim/rekor/seri
      hesapları etkilenmez (onlar zaten ayrı, taze bir sorgudan geliyor).
      **Cihazda doğrulandı:** `in_progress` bir seans + 1 onaylanmış set doğrudan SQLite'a
      yazılıp uygulama TAMAMEN kapatılıp yeniden açıldı — Bugün ekranı "Devam Eden Seans"
      gösterdi, `/session`'a girince "Barbell Squat" seti (100kg×5, RIR2, ✓ işaretli)
      eksiksiz geri geldi.
- [x] **2. PR/rekor vurgusu.** `getWeeklyHighlights(userId)` (`src/db/queries.ts`): TÜM
      geçmiş, `completedAt` artan sırayla tek seferde taranıp her egzersiz için "o ana
      kadarki en iyi e1RM" takip edilerek hangi setlerin ANINDA yeni rekor olduğu
      yeniden hesaplanır (DB'de `isPr` saklanmadığı için tek yol bu). Bu hafta içinde
      düşenler sayılır. Hero kartta `prCount > 0` ise "🏆 Bu hafta N kişisel rekor
      kırdın!" satırı.
- [x] **3. Haftalık hacim trendi.** Aynı `getWeeklyHighlights` tek geçişte
      `thisWeekVolumeKg`/`lastWeekVolumeKg`'yi de topluyor. Yeni "Bu haftanın hacmi"
      kartı: toplam kg + (geçen hafta verisi varsa) ▲/▼ farkı, yeşil/turuncu.
- [x] **4. Kas grubu dağılımı.** `getMuscleGroupBreakdown(userId, sinceMs, limit)`:
      son 7 günün tamamlanmış setlerini `exercises.primaryMuscles`'a (bkz.
      syncExercises.ts) göre dağıtıp en çok hacim alan (en fazla `limit`) kas grubunu
      döner. Bir egzersizin birden fazla ana kası varsa set hacmi HER birine tam
      sayılır (yerel şemada `volume_factor` ağırlıklandırması yok) — yorum bunu açıkça
      belirtiyor, "kesin bilimsel hacim" değil "kabaca nereye ağırlık verildi" göstergesi.
      Yeni `src/components/today/MuscleGroupBars.tsx`: grafik kütüphanesi olmadan basit
      orantılı çubuklar (View genişliği % ile).
      **Hepsi cihazda gerçek sayılarla doğrulandı** (3 sahte seans + 3 egzersiz enjekte
      edilip elle hesaplanan beklenen değerlerle — 4 PR, 3160kg bu hafta/800kg geçen
      hafta/2360kg fark, Quads 1800/Chest 960/Hamstrings 400kg — ekrandaki sayılar
      birebir eşleşti), sonra test verisi temizlendi.

**Bilinçli olarak YAPILMADI — sahte veri gerektiriyordu:**
- **AI rapor banner'ı:** spec'te zaten koşullu ("varsa") ama "varsa" diyebilmek için
  önce Paket 4'ün (AI katmanı, `supabase/functions/ai-chat/`, konuşma geçmişi, rapor
  üretimi) TAMAMEN yazılması gerekiyor — bu bir UI eklentisi değil, ayrı bir paket.
- **Kalori/protein halkası:** göstermek için ya gerçek bir hedef (TDEE hesabı, hiçbir
  yerde yok — `profiles` tablosunda kalori/protein alanı yok, onboarding'de
  hesaplanmıyor) ya da gerçek bir tüketim kaydı (Beslenme paketi, `nutrition_entries`
  tablosu Supabase'de zaten var ama hiç yerel şema/UI/gıda veritabanı/loglama akışı
  yok) gerekir. İkisi de yoksa halka ya "0/0" gibi anlamsız ya da uydurma bir sayı
  gösterirdi — o yüzden "yakında" kartı olarak bırakıldı. Bu ikisi gerçek "Beslenme
  paketi" ve "Paket 4" büyüklüğünde ayrı işler, istenirse ayrıca kapsamlanabilir.
- `body_weight_logs` şimdilik sadece yerel — sunucuya senkron (§12.4 kuyruğu) egzersiz
  senkronuyla aynı sebepten henüz yok.

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
- ~~`LOCAL_USER_ID` sabit bir placeholder~~ **ÇÖZÜLDÜ** — `useSessionStore.startSession()`
  artık `useAuthStore.getState().session?.user.id`'yi kullanıyor (bkz. aşağıdaki
  "Tamamlanan (Faz 0'ın kalanı — Auth akışı)" bölümü).

## Tamamlanan (Faz 0'ın kalanı — Auth akışı)

- [x] Kullanıcının kendi Supabase projesi bağlandı: `npx supabase login` (kullanıcı
      kendi tarayıcısında tamamladı) → `supabase init` → `supabase link --project-ref
      srbhvxajhnqbsluoysqo` → `supabase db push` — **12 migration da hiç hatasız
      uygulandı** (Paket 1'in "temiz kurulum" doğrulaması artık gerçek bir Postgres'e
      karşı yapıldı, sadece CLI'de değil)
- [x] `src/types/database.ts` artık gerçek şemadan üretildi:
      `supabase gen types typescript --linked` (1585 satır, placeholder kalktı)
- [x] `src/stores/useAuthStore.ts` — `session`, `profile` (profiles satırı,
      onboarding_done kontrolü için), `initialize()` (`getSession` + `onAuthStateChange`
      dinleyicisi), `refreshProfile()`, `signOut()`
- [x] `app/(auth)/login.tsx`, `register.tsx` — gerçek `supabase.auth.signInWithPassword`
      / `signUp` çağrıları, yükleniyor/hata durumları, e-posta onayı bekleniyor ekranı
      (proje "Confirm email" açık olduğu için signUp sonrası session hemen gelmiyor)
- [x] `app/_layout.tsx` — `useSegments`/`useRouter` ile auth guard: session yoksa
      `(auth)`, session var ama `profiles.onboarding_done=false` ise `(onboarding)`,
      ikisi de tamamsa `(tabs)`. Migration + auth initialize bitene kadar "Hazırlanıyor…"
      ekranı gösteriyor
- [x] `app/(tabs)/profile/index.tsx` — kullanıcı e-postası + "Çıkış Yap" butonu eklendi
      (test amaçlı, onboarding tamamlanmadığı için bu oturumda tıklanarak
      doğrulanamadı — bkz. aşağıdaki sınırlama)
- [x] `useSessionStore.startSession()` artık gerçek `session.user.id`'yi kullanıyor,
      sahte `LOCAL_USER_ID` kaldırıldı

### Bulunan ve düzeltilen gerçek bug'lar

1. **`@react-native-async-storage/async-storage` sürüm uyumsuzluğu** — Faz 0'da
   `3.1.1` kurulmuştu, Expo SDK 57 `2.2.0` bekliyor. Sonuç: Expo Go'da
   `AsyncStorageError: Native module is null` ile uygulama "Hazırlanıyor…" ekranında
   sonsuza kadar takılı kalıyordu (Supabase Auth session'ı okuyamıyordu).
   `npx expo install @react-native-async-storage/async-storage` ile düzeltildi.
   **Ders:** yeni bir native paket eklerken her zaman `npx expo install` kullan,
   çıplak `npm install` semver aralığını Expo Go'nun beklediğinden başka bir sürüme
   çözebiliyor — `npx expo install --check` bunu erkenden yakalardı.
2. **`handle_new_user()` trigger'ı her kayıtta başarısız oluyordu** — gerçek bir
   hesapla kayıt denendiğinde Supabase Auth `"Database error saving new user"`
   döndürdü. Neden: `auth.users` INSERT tetikleyicisi bağlamında varsayılan
   `search_path` `public` şemasını içermiyor, bu yüzden `INSERT INTO profiles (...)`
   (şema öneki olmadan) tabloyu bulamıyordu — Supabase'de belgelenmiş, sık
   karşılaşılan bir tuzak. `013_fix_handle_new_user_search_path.sql`: tabloyu
   `public.profiles` olarak nitelendirip fonksiyona `SET search_path = public`
   eklendi. Düzeltmeden sonra kayıt/onay/giriş/onboarding yönlendirmesi kullanıcının
   gerçek Gmail hesabıyla uçtan uca çalıştı.

### Auth akışı doğrulaması

Simülatörde gerçek adımlarla test edildi: Kayıt Ol → (ilk denemede yukarıdaki #2
bug'ı yakaladı) → düzeltme sonrası tekrar Kayıt Ol → "E-postanı kontrol et" ekranı →
kullanıcı kendi Gmail'inden onay linkine tıkladı (link `localhost:3000`'e
yönlendirmeye çalıştığı için tarayıcı hata verdi — **bu kozmetik bir sorun, asıl
onay server tarafında zaten gerçekleşmişti**, bkz. aşağıdaki sınırlama) → uygulamaya
dönüp Giriş Yap → **otomatik olarak `(onboarding)/welcome` ekranına yönlendirildi**
(profiles.onboarding_done=false olduğu için, tam beklenen davranış).

Simülatörün varsayılan klavyesi Türkçe olduğu için e-posta adreslerindeki `.`/`@`
karakterleri yanlış giriliyordu (`ç`/`'` üretiyordu) — İngilizce (US) dışındaki tüm
klavyeler simülatörden kaldırılarak çözüldü (bu sadece test ortamı sorunuydu,
uygulama kodunda değil).

## Tamamlanan (Onboarding formu — profil kurulumu)

- [x] `app/(onboarding)/welcome.tsx` — "Başla" butonu artık `router.push('/profile-setup')`
      çağırıyor (önceden `onPress` hiç bağlı değildi)
- [x] `app/(onboarding)/profile-setup.tsx` — tam form: doğum yılı/boy/kilo (`Input`),
      cinsiyet/deneyim/hedef/haftalık gün/ekipman (çoklu seçim) için `Chip` bileşenleri.
      Submit'te `supabase.from('profiles').update({ ..., onboarding_done: true })` +
      kilo girildiyse ayrı bir `body_weight_logs` insert'i (kilo `profiles`'ta değil
      zaman serisi tablosunda yaşıyor, §6.2). Sonrasında `refreshProfile()` çağrılıyor —
      `app/_layout.tsx`'teki auth guard `onboarding_done=true`'yu görünce kendiliğinden
      `(tabs)`'a yönlendiriyor, elle `router.push` gerekmiyor
- [x] Tek ekranda toplandı (spec'in çok adımlı wireframe'i yerine), bilinçli bir
      kapsam kararı — dosyadaki yorumda açıklanıyor, Faz 5 cilalamasında adımlara
      bölünebilir

**Simülatörde gerçek hesapla uçtan uca doğrulandı:** Giriş Yap → (onboarding_done=false
olduğu için) `(onboarding)/welcome` → Başla → profil formunu doldur → Devam Et →
Metro logunda `handleSubmit` gerçek `session.user.id` ile tetiklendi, hata yok →
**otomatik olarak `(tabs)/Bugün`'e yönlendirildi** (6 sekmeli tab bar görünür).
Ardından Profil sekmesinden **"Çıkış Yap" da tıklanarak doğrulandı** — `(auth)/login`
ekranına doğru şekilde döndü. Bu, PROGRESS.md'nin önceki sürümündeki iki "doğrulanmadı"
maddesini (onboarding formu ve Çıkış Yap) kapatıyor.

Bu turda ayrıca bir Metro/Expo Go süreç karmaşası (iki çakışan `expo start` süreci)
`kill` + `xcrun simctl terminate` + `npx expo start --ios --clear` ile temizlendi —
kod değişikliği değil, sadece geliştirme ortamı hijyeni.

## Yapılmadı / bilinçli ertelendi

- [ ] **Supabase Auth "Redirect URLs" yapılandırılmadı.** E-posta onay linki şu an
      Supabase'in varsayılan `http://localhost:3000`'ine yönlendirmeye çalışıyor,
      kullanıcının tarayıcısında "bağlanamadı" hatası veriyor. Asıl onay server
      tarafında zaten gerçekleşiyor (test edildi, sorun sadece kozmetik) ama gerçek
      kullanıcılar için düzeltilmeli: Supabase Dashboard → Authentication → URL
      Configuration → Site URL / Redirect URLs'e uygulamanın deep link şemasını
      (`powerform://`) ekle. Bu dashboard ayarı, ben erişemiyorum.
- [x] `src/lib/supabase.ts` auth storage'ı `expo-secure-store` tabanlı chunking destekli
      `SecureStoreAdapter`'a taşındı (donanım destekli Keychain/Keystore koruması).
- [x] Onboarding'e 3 slaytlık etkileşimli kaydırmalı (swipeable) karşılama carousel'i,
      sayfa noktaları ve "Atla" özelliği eklendi (`app/(onboarding)/welcome.tsx`).
- [x] Şifre sıfırlama akışı eklendi (`app/(auth)/forgot-password.tsx` + `login.tsx`).
- [ ] Apple/Google ile giriş hiç eklenmedi (Apple Developer / Google Cloud hesabı
      gerektiriyor — kullanıcıyla daha önce bilinçli olarak sonraya bırakıldı).

## Sıradaki adım (spec §15'teki sıraya göre)

1. ~~Supabase projesini kur ve migration'ları uygula~~ **YAPILDI** — proje bağlı
   (`srbhvxajhnqbsluoysqo`), 13 migration uygulandı, gerçek tipler üretildi.

2. ~~Auth akışını gerçek Supabase çağrılarına bağla~~ **YAPILDI VE GERÇEK HESAPLA
   DOĞRULANDI** — bkz. "Tamamlanan (Faz 0'ın kalanı — Auth akışı)" bölümü.

3. ~~Paket 3 — Seans ekranı~~ **YAPILDI VE SİMÜLATÖRDE DOĞRULANDI** — bkz.
   "Simülatör doğrulaması" bölümü.

4. ~~Onboarding formu (profil kurulumu)~~ **YAPILDI VE GERÇEK HESAPLA UÇTAN UCA
   DOĞRULANDI** — bkz. "Tamamlanan (Onboarding formu — profil kurulumu)" bölümü.
   "Çıkış Yap" da bu sırada test edildi.

5. ~~Paket 2'yi tamamla — çeviri + Supabase'e yazma~~ **YAPILDI** — bkz. "Tamamlanan
   (Paket 2 — egzersiz veri seti)" bölümünün son kısmı. 876 egzersiz, TR çevirileriyle
   birlikte Supabase'de. Rapordaki 156 "varsayılan side_delt" egzersizi hâlâ elle
   gözden geçirilmedi (`mapping-report.json` → `shoulderClassification.fallbackDefault`)
   — bu opsiyonel bir kalite iyileştirmesi, blokaj değil.

6. ~~Kütüphane ekranını Supabase kaynaklı hale getir & İki Yönlü Senkron Motoru~~ **YAPILDI** —
   `src/db/syncExercises.ts` ile egzersizler ve `src/db/syncEngine.ts` ile seanslar,
   setler, kilo ve besin mutasyonlarını (`sync_mutations`) Supabase'e aktaran motor yazıldı.

7. **Supabase Auth Redirect URLs'i düzelt** (dashboard ayarı, kullanıcının Supabase Web Konsolundan yapması gereken opsiyonel ayar):
   e-posta onay linki şu an `localhost:3000`'e gidiyor. `powerform://` deep link
   şeması Supabase Dashboard'a eklenmeli.

8. **Paket 4 — AI katmanı** (§5, §8.2): `supabase/functions/ai-chat/` — kullanıcı isteği
   doğrultusunda bilinçli olarak ertelendi ("Şimdilik yapay zeka kısmını yapmayacağım").

9. ~~Program oluşturucu & Şablonlar & Programa Bağlı Seans~~ **YAPILDI** — `src/db/programs.ts`,
   `app/(tabs)/workout/editor.tsx`, `app/(tabs)/workout/templates/` ve programa bağlı
   seans başlatma akışları tamamlandı.

10. ~~Beslenme Takibi & TDEE Motoru (Faz 4)~~ **YAPILDI** — `src/lib/nutritionCalculations.ts`,
    `src/db/nutrition.ts`, `app/(tabs)/nutrition/index.tsx`, `FoodPickerSheet.tsx` ve özel besin formu tamamlandı.

11. ~~Yasal, KVKK, Hesap Silme & Veri Dışa Aktarma (Faz 5)~~ **YAPILDI** — `app/legal.tsx`,
    `src/lib/dataExport.ts`, `src/lib/accountDeletion.ts` ve profil entegrasyonu tamamlandı.

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
- [x] **12+1 migration gerçek bir Supabase Postgres'ine karşı `supabase db push`
      ile hatasız uygulandı** — Paket 1'in "temiz kurulum" doğrulaması artık
      gerçek bir projeye karşı yapıldı (`supabase db reset` değil ama pratikte
      aynı garantiyi veriyor: sıfırdan bir projeye 13 dosyanın tamamı sırayla
      hatasız uygulandı).
- [x] **Auth akışının tamamı gerçek bir Gmail hesabıyla uçtan uca doğrulandı** —
      kayıt → e-posta onayı → giriş → onboarding'e otomatik yönlendirme. Bkz.
      "Auth akışı doğrulaması" bölümü.
- [x] **Onboarding formu (profil kurulumu) ve "Çıkış Yap" gerçek hesapla uçtan uca
      doğrulandı** — giriş → welcome → profil formu → submit → `(tabs)`'a otomatik
      yönlendirme → Profil sekmesinden çıkış → `(auth)/login`'e dönüş. Bkz.
      "Tamamlanan (Onboarding formu — profil kurulumu)" bölümü.

## Doğrulanmadı (bir sonraki oturumda ilk iş — ÖNCELİKLİ)

- [ ] "Aynısı" (sameAsLast) butonu simülatör turunda hiç tıklanmadı — kod yolu var
      (`NumericKeypad`'de koşullu render), ama gerçek dokunuşla denenmedi.
- [x] "Not Ekle" akışı `ExerciseCard` ve seans/geçmiş dökümüne eklendi (inline not düzenleme + SQLite saklama).
- [ ] `expo-keep-awake`'in gerçekten ekranı uyanık tuttuğu (simülatörde
      gözlemlenemez, sadece fiziksel cihazda anlamlı) test edilmedi.
- [ ] Android tarafı hiç denenmedi (sadece iOS simülatörü).
- [ ] RLS'in gerçek projede de doğru çalıştığı sadece pgTAP dosyasıyla (statik,
      koşulmadı) değil, iki farklı gerçek kullanıcıyla canlı olarak doğrulanmadı.

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
- **Yeni native paket eklerken her zaman `npx expo install`, çıplak `npm install`
  değil**: async-storage'ın Expo Go'nun beklediğinden farklı bir sürüme çözülmesi
  ("Native module is null" hatası, bkz. "Auth akışı doğrulaması") bu kuralın
  ihlalinden kaynaklandı. `npx expo install --check` şüpheli durumlarda erken uyarır.
- **013_fix_handle_new_user_search_path.sql ayrı bir migration olarak eklendi**,
  011_triggers.sql elle düzenlenmedi: zaten uygulanmış bir migration'ı değiştirmek
  gerçek bir projede geçmişle tutarsızlık yaratır (checksum/journal uyuşmazlığı) —
  CLAUDE.md'nin "Şema değişikliği SADECE migration ile" kuralına uyarak düzeltme
  yeni bir migration olarak eklendi.
- **`tsx`, `.env`'i otomatik OKUMAZ** — `scripts/seed-exercises/` altındaki script'ler
  `process.env`'i doğrudan okuyor (dotenv import'u yok), bu yüzden `npm run
  seed:exercises` her çalıştırıldığında önce `set -a; source .env; set +a` (ya da
  eşdeğeri) ile env değişkenlerini shell'e export etmek gerekiyor — aksi halde
  "credential yok, adım atlanıyor" mesajıyla sessizce atlanır (çökmez, bu bilinçli
  bir tasarım ama yanıltıcı olabilir).
