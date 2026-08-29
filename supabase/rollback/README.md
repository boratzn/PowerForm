# Rollback (down) migration'ları

Supabase CLI'nin `supabase db reset` komutu `migrations/` altındaki dosyaları sırayla
**baştan** uygular — otomatik bir "down" koşucusu yoktur. Bu klasördeki dosyalar, spec
§15 Paket 1'in istediği geri alma script'leridir; manuel çalıştırılır:

```bash
# Tek bir migration grubunu geri almak için (ör. RLS'i kaldırmak):
psql "$DATABASE_URL" -f supabase/rollback/012_rls_down.sql

# Hepsini baştan geri almak için ters sırada (012 → 001) çalıştır.
```

Dosya adları `migrations/`'daki karşılığıyla birebir eşleşir (`NNN_isim_down.sql`).
