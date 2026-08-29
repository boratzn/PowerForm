import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  isInitializing: boolean;
  initialize: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

// app/_layout.tsx'te bir kere initialize() çağrılır. Store uygulama ömrü boyunca
// tek instance olduğu için onAuthStateChange aboneliği bilerek temizlenmiyor.
export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isInitializing: true,

  initialize: () => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      set({ session });
      if (session) await get().refreshProfile();
      set({ isInitializing: false });
    });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session });
      if (session) {
        await get().refreshProfile();
      } else {
        set({ profile: null });
      }
    });
  },

  // Yönlendirme kararı (auth → onboarding → tabs) profiles.onboarding_done'a bakar,
  // bu yüzden session değişince profil de tazelenir.
  refreshProfile: async () => {
    const { session } = get();
    if (!session) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (error) {
      console.error('[useAuthStore] Profil okunamadı:', error.message);
      return;
    }
    set({ profile: data });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
