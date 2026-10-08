# Ortam değişkenleri

> Not: bu repo `turax` çalışma alanı içindeki bir oturumda oluşturuldu; o workspace'in
> `.env*` dosyalarını koruyan global bir hook'u var ve Powerform için zararsız bir
> `.env.example` şablonu bile engelliyor. Bu yüzden gerekli değişkenler burada
> belgeleniyor — gerçek `.env` dosyanı proje klasöründe elle oluştur (proje kendi
> git reposuna geçtiğinde bu kısıtlama olmayacak).

## İstemci tarafı (Expo bundle'a gömer — `EXPO_PUBLIC_` zorunlu ön ek)

```
# Supabase (Zorunlu)
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# AI Koç (Google Gemini)
EXPO_PUBLIC_GEMINI_API_KEY=

# RevenueCat (Abonelikler)
EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY=
EXPO_PUBLIC_REVENUECAT_APPLE_KEY=
EXPO_PUBLIC_REVENUECAT_TEST_KEY=
```

## Sadece sunucu tarafı / Script'ler (İstemciye asla verilmez)

Asla `EXPO_PUBLIC_` ile başlamaz, asla istemci koduna girmez.

```
# Supabase Edge Functions / Seed scriptleri
ANTHROPIC_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
