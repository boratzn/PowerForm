@AGENTS.md

# Powerform — Proje Kuralları

> Proje ismi "Powerform" — şartname dosyasında (ve bazı eski yorumlarda) hâlâ orijinal
> çalışma adı "FitTrack" geçebilir, aynı projeden bahsediyor.

Tam şartname: [docs/FITNESS_APP_SPEC.md](docs/FITNESS_APP_SPEC.md) (2061 satır — bölüm
indeksine göre ilgili kısmı `sed -n` ile oku, tamamını `Read` etme). İlerleme durumu ve
sıradaki adım için [PROGRESS.md](PROGRESS.md)'e bak — özellikle yeni bir oturumda işe
başlamadan önce.

## Kod
- TypeScript strict mode. `any` yasak; bilinmeyen tip için `unknown` + type guard.
- Veritabanı tipleri `npx supabase gen types typescript` ile üretilir, elle yazılmaz
  (bkz. `src/types/database.ts` içindeki placeholder — migration'lar bir Supabase
  projesine uygulanınca değiştirilecek).
- Her yeni özellik için önce tip, sonra test, sonra implementasyon.
- Yorum satırı Türkçe, değişken/fonksiyon adları İngilizce.

## Veritabanı
- Şema değişikliği SADECE migration ile (`supabase/migrations/`). Supabase Studio'dan
  elle değişiklik yasak.
- Yeni tablo eklendiğinde RLS politikası aynı migration'da yazılır. İstisna yok.
- Her migration'ın `supabase/rollback/` altında bir `_down.sql` karşılığı olur.

## Offline-first (§12)
- UI **asla** doğrudan ağdan okumaz — her okuma `src/db` (yerel SQLite/Drizzle) üzerinden.
- Her yerel yazma bir `sync_mutations` kaydı üretir; senkron motoru bunu arka planda işler.
- `client_uuid` ile idempotentlik zorunlu (aynı seansı iki kez göndermek çift kayıt
  oluşturmamalı).

## Güvenlik
- API anahtarı, secret, token asla istemci koduna girmez — sadece Supabase Edge
  Function secrets üzerinden (bkz. `docs/ENVIRONMENT.md`).
- Kullanıcıdan gelen hiçbir veri doğrudan SQL'e girmez.
- AI tool'larında `user_id` her zaman sunucu tarafından (doğrulanmış JWT'den) enjekte
  edilir — model input'undan asla alınmaz (§5.1, §8.2, §15 Paket 4 güvenlik kontrolleri).
- Kullanıcı serbest metni (egzersiz notu, `injuries` alanı vb.) AI promptuna
  `<user_data>` etiketiyle veri olarak işaretlenir, talimat olarak değil (§16.2).

## UI (§10.3)
- Yeni bileşen yazmadan önce `src/components/ui/`'a bak.
- Hardcoded renk/boşluk değeri yasak — `tailwind.config.js` / `src/constants/theme.ts`
  token'larını kullan.
- Her ekran hem açık hem koyu temada test edilir; v1 koyu tema öncelikli.
- Seans ekranı (§10.2) özel kurallara tabi: min 48×48dp dokunma hedefi, geçen seferki
  değer placeholder, özel numerik klavye, otomatik dinlenme sayacı, `expo-keep-awake`.

## Commit
- Conventional commits: feat/fix/refactor/test/docs/chore.
- Bir commit bir işi yapar.
