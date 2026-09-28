import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  isInitializing: boolean;
  isProfileLoading: boolean;
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
  isProfileLoading: false,

  initialize: () => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      set({ session });
      if (session) {
        set({ isProfileLoading: true });
        await get().refreshProfile();
        set({ isProfileLoading: false });
      }
      set({ isInitializing: false });
    });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentProfile = get().profile;
      set({ session });
      if (session) {
        if (!currentProfile) {
          set({ isProfileLoading: true });
        }
        await get().refreshProfile();
        set({ isProfileLoading: false });
      } else {
        set({ profile: null, isProfileLoading: false });
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
      console.warn('[useAuthStore] Profil okunamadı:', error.message);
      // Saat kayması (clock skew) veya JWT hatası durumunda oturumu tazeleyip tekrar dene
      if (error.message?.includes('JWT') || error.message?.includes('future')) {
        console.log('[useAuthStore] JWT saat uyuşmazlığı tespit edildi, oturum tazeleniyor...');
        try {
          const { data: refreshRes, error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr && refreshRes?.session) {
            set({ session: refreshRes.session });
            const retryRes = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (retryRes.data) {
              set({ profile: retryRes.data });
              return;
            }
          }
        } catch (e) {
          console.warn('[useAuthStore] Oturum tazeleme hatası:', e);
        }
      }
      return;
    }
    set({ profile: data });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
