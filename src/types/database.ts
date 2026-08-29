// Bu dosya elle yazılmaz. Migration'lar (supabase/migrations) uygulandıktan sonra üret:
//   npx supabase gen types typescript --local > src/types/database.ts
// Şimdilik migration'lar henüz yerel/uzak bir Supabase projesine uygulanmadığı için
// placeholder tip kullanılıyor — supabase.ts içindeki createClient<Database> bunu bekliyor.
export type Database = Record<string, unknown>;
