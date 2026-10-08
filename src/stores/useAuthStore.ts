import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

const PROFILE_CACHE_KEY = 'powerform_cached_profile';
const ONBOARDING_DONE_CACHE_KEY = 'powerform_onboarding_done';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  hasCompletedOnboarding: boolean;
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
  hasCompletedOnboarding: false,
  isInitializing: true,
  isProfileLoading: false,

  initialize: () => {
    let isSettled = false;
    const finishInit = () => {
      if (!isSettled) {
        isSettled = true;
        set({ isInitializing: false, isProfileLoading: false });
      }
    };

    // Güvenlik zaman aşımı (3.5 sn): Ağ veya Supabase bağlantısı yavaşsa splash ekranının kilitli kalmasını engelle
    const safetyTimer = setTimeout(() => {
      console.warn('[useAuthStore] Auth başlatma zaman aşımına uğradı, splash ekranı serbest bırakılıyor.');
      finishInit();
    }, 3500);

    // 1. Önce cihazdaki önbellekten profili ve onboarding durumunu anında oku (onboarding yanıp sönmesini engeller)
    AsyncStorage.multiGet([PROFILE_CACHE_KEY, ONBOARDING_DONE_CACHE_KEY])
      .then(([[, cachedProfile], [, cachedOnboardingDone]]) => {
        let isDone = cachedOnboardingDone === 'true';
        if (cachedProfile) {
          try {
            const parsed = JSON.parse(cachedProfile);
            if (parsed && typeof parsed === 'object') {
              if (parsed.onboarding_done) isDone = true;
              set({ profile: parsed, hasCompletedOnboarding: isDone });
            }
          } catch {
            // yoksay
          }
        }
        if (isDone) {
          set({ hasCompletedOnboarding: true });
        }
      })
      .catch(() => {})
      .finally(() => {
        // 2. Supabase oturumunu al ve profili arka planda tazele
        supabase.auth
          .getSession()
          .then(async ({ data, error }) => {
            if (error) {
              console.warn('[useAuthStore] getSession hatası:', error.message);
              set({ session: null, profile: null });
              AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(() => {});
              return;
            }
            const session = data?.session ?? null;
            set({ session });

            if (session) {
              const currentProfile = get().profile;
              // Eğer önbellekten henüz profil gelmediyse loading bayrağını aç
              if (!currentProfile) {
                set({ isProfileLoading: true });
              }
              try {
                // Profil yükleme en fazla 3 sn bekler
                await Promise.race([
                  get().refreshProfile(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)),
                ]);
              } catch (profileErr) {
                console.warn('[useAuthStore] Profil yükleme zaman aşımı veya hatası:', profileErr);
              } finally {
                set({ isProfileLoading: false });
              }
            } else {
              set({ profile: null, hasCompletedOnboarding: false });
              AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(() => {});
            }
          })
          .catch((err) => {
            console.warn('[useAuthStore] getSession kritik hata:', err);
            set({ session: null, profile: null });
          })
          .finally(() => {
            clearTimeout(safetyTimer);
            finishInit();
          });
      });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentProfile = get().profile;
      set({ session });
      if (session) {
        if (!currentProfile) {
          set({ isProfileLoading: true });
        }
        try {
          await get().refreshProfile();
        } catch (e) {
          console.warn('[useAuthStore] onAuthStateChange profil hatası:', e);
        } finally {
          set({ isProfileLoading: false });
        }
      } else {
        set({ profile: null, hasCompletedOnboarding: false, isProfileLoading: false });
        AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(() => {});
      }
    });
  },

  // Yönlendirme kararı (auth → onboarding → tabs) profiles.onboarding_done'a bakar,
  // bu yüzden session değişince profil de tazelenir.
  refreshProfile: async () => {
    const { session } = get();
    if (!session) return;
    try {
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
                const isDone = Boolean(retryRes.data.onboarding_done);
                set({ profile: retryRes.data, hasCompletedOnboarding: isDone });
                if (isDone) {
                  AsyncStorage.setItem(ONBOARDING_DONE_CACHE_KEY, 'true').catch(() => {});
                }
                AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(retryRes.data)).catch(() => {});
                return;
              }
            }
          } catch (e) {
            console.warn('[useAuthStore] Oturum tazeleme hatası:', e);
          }
        }
        return;
      }
      const isDone = Boolean(data.onboarding_done);
      set({ profile: data, hasCompletedOnboarding: isDone });
      if (isDone) {
        AsyncStorage.setItem(ONBOARDING_DONE_CACHE_KEY, 'true').catch(() => {});
      }
      AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data)).catch(() => {});
    } catch (err) {
      console.warn('[useAuthStore] refreshProfile sorgusu beklenmeyen hata:', err);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(() => {});
    AsyncStorage.removeItem(ONBOARDING_DONE_CACHE_KEY).catch(() => {});
    set({ session: null, profile: null, hasCompletedOnboarding: false });
  },
}));
