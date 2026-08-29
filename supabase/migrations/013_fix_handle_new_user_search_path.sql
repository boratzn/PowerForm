-- 011_triggers.sql'deki handle_new_user() fonksiyonu, auth.users INSERT tetikleyicisi
-- bağlamında çalışırken varsayılan search_path 'public' şemasını içermeyebiliyor —
-- bu Supabase'de sık karşılaşılan, "Database error saving new user" hatasına yol açan
-- bilinen bir durum. Tabloyu açıkça public.profiles olarak nitelendirip search_path'i
-- fonksiyon tanımında sabitliyoruz.
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
