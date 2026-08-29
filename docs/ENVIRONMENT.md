# Ortam değişkenleri

> Not: bu repo `turax` çalışma alanı içindeki bir oturumda oluşturuldu; o workspace'in
> `.env*` dosyalarını koruyan global bir hook'u var ve FitTrack için zararsız bir
> `.env.example` şablonu bile engelliyor. Bu yüzden gerekli değişkenler burada
> belgeleniyor — gerçek `.env` dosyanı FitTrack klasöründe elle oluştur (proje kendi
> git reposuna geçtiğinde bu kısıtlama olmayacak).

## İstemci tarafı (Expo bundle'a gömer — `EXPO_PUBLIC_` zorunlu ön ek)

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## Sadece sunucu tarafı (Supabase Edge Functions secrets)

Asla `EXPO_PUBLIC_` ile başlamaz, asla istemci koduna girmez.
`npx supabase secrets set ANTHROPIC_API_KEY=...` ile ayarlanır.

```
ANTHROPIC_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
