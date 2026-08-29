import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import type { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY eksik. docs/ENVIRONMENT.md dosyasına bak.'
  );
}

// TODO(Faz 0): AsyncStorage yerine expo-secure-store tabanlı "LargeSecureStore"
// adaptörüne geç (Supabase'in Expo rehberinde önerilen desen) — refresh token
// düz metin olarak cihaz depolamasında tutulmamalı. PROGRESS.md'de takip ediliyor.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
