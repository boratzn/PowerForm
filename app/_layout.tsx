import '../global.css';

import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

// Reanimated render esnasında okuma/yazma uyarılarını sessize al (§10)
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

import { QueryClientProvider } from '@tanstack/react-query';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { db, sqlite } from '../src/db/client';
import migrations from '../src/db/migrations/migrations';
import { seedLocalExercisesIfEmpty } from '../src/db/seedExercises';
import { seedLocalFoodsIfEmpty } from '../src/db/nutrition';
import { syncExercisesFromSupabase } from '../src/db/syncExercises';
import { drainSyncQueue, pullUserDataFromSupabase } from '../src/db/syncEngine';
import { queryClient } from '../src/lib/queryClient';
import { PaywallModal } from '../src/components/subscription/PaywallModal';
import { SplashScreenView } from '../src/components/ui';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useProgramStore } from '../src/stores/useProgramStore';
import { useSessionStore } from '../src/stores/useSessionStore';
import { useSubscriptionStore } from '../src/stores/useSubscriptionStore';
import { useLanguageStore } from '../src/stores/useLanguageStore';
import { adService } from '../src/services/adService';

export default function RootLayout() {
  // Yerel SQLite tabloları uygulama her açıldığında burada oluşturulur/güncellenir —
  // drizzle-kit generate ile üretilen src/db/migrations/*.sql'i uygular (bkz. metro.config.js
  // .sql import desteği). Migration bitmeden hiçbir ekran DB'ye erişmemeli.
  const { success: migrationsReady, error: migrationsError } = useMigrations(db, migrations);

  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const authInitializing = useAuthStore((s) => s.isInitializing);
  const isProfileLoading = useAuthStore((s) => s.isProfileLoading);
  const initializeAuth = useAuthStore((s) => s.initialize);

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
    useLanguageStore.getState().initializeLanguage();
    adService.initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!migrationsReady) return;
    // Önce bundle-seed (§12: ağ olmadan da anında kullanılabilir olsun), sonra arka
    // planda gerçek Supabase senkronu (TR çeviri + görsel) — bkz. syncExercises.ts.
    // Senkron başarısız olursa (ağ yok vb.) sessizce vazgeçer, bundle veri kalır.
    seedLocalExercisesIfEmpty()
      .then(() => syncExercisesFromSupabase())
      .catch((err) => console.error('[RootLayout] Egzersiz seed/senkron hatası:', err));

    seedLocalFoodsIfEmpty().catch((err) => console.error('[RootLayout] Gıda seed hatası:', err));
  }, [migrationsReady]);

  // Uygulama öldürülüp yeniden açıldığında yarım kalan bir seans varsa (DB'de
  // status='in_progress') "Bugün" ekranı "Devam Et" gösterebilsin diye store'u erkenden
  // ısıtır — session.tsx zaten aynı işi kendi mount'unda `resumeOrStartSession` ile
  // garantiliyor, bu sadece o an beklemeden gösterilsin diye bir ön-yükleme.
  useEffect(() => {
    if (!migrationsReady || !session) return;
    // Eğer hafızada zaten aktif bir seans yönetiliyorsa tekrar hydrate edip sayacı sıfırlama
    if (!useSessionStore.getState().sessionClientUuid) {
      useSessionStore
        .getState()
        .hydrateActiveSession()
        .catch((err) => console.error('[RootLayout] Seans geri yükleme hatası:', err));
    }

    useSubscriptionStore
      .getState()
      .initialize(session.user.id)
      .catch((err) => console.warn('[RootLayout] Abonelik başlatma hatası:', err));

    // Buluttaki antrenman geçmişini ve kullanıcı verilerini yerel SQLite'a çek
    pullUserDataFromSupabase(session.user.id)
      .then(() => {
        useProgramStore.getState().initialize();
      })
      .catch((err) => console.warn('[RootLayout] Buluttan veri çekme hatası:', err));

    // Çevrimdışı yapılan işlemleri Supabase ile eşitle (§12.4)
    drainSyncQueue().catch((err) => console.warn('[RootLayout] Senkron kuyruğu hatası:', err));
  }, [migrationsReady, session]);

  const [splashTimeout, setSplashTimeout] = useState(false);

  useEffect(() => {
    // 4 saniye içinde splash kalkmazsa güvenlik amacıyla zorla kapat
    const timer = setTimeout(() => {
      setSplashTimeout(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // §11 onboarding akışı: session yoksa (auth), session var ama onboarding_done=false
  // ise (onboarding), ikisi de tamamsa (tabs). Yalnızca uygulamanın İLK açılışında
  // (profil henüz hiç yüklenmemişken) splash gösterilir. Arka plandaki profil/token
  // yenilemeleri navigasyon ağacını unmount etmemelidir.
  const isInitialLoading =
    !splashTimeout &&
    (!migrationsReady ||
      authInitializing ||
      (session != null && (profile == null || isProfileLoading)));

  const showSplash = isInitialLoading && !migrationsError;

  useEffect(() => {
    if (isInitialLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    const onboardingFinished = Boolean(profile?.onboarding_done || hasCompletedOnboarding);

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && !onboardingFinished && !inOnboardingGroup) {
      // Sadece profil net olarak kesinleşmişse ve tamamlanmamışsa onboarding'e git
      if (profile !== null && !isProfileLoading) {
        router.replace('/welcome');
      }
    } else if (session && onboardingFinished && (inAuthGroup || inOnboardingGroup)) {
      router.replace('/');
    }
  }, [isInitialLoading, session, profile, isProfileLoading, hasCompletedOnboarding, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0B0F14' }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#0B0F14' }}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0F14' } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            {/* Seans ekranı tam ekran modal — sekme çubuğu otomatik gizlenir (§10.2, §11) */}
            <Stack.Screen name="session" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="weight-trend" options={{ presentation: 'modal' }} />
            <Stack.Screen name="body-measurements" options={{ presentation: 'modal' }} />
            <Stack.Screen name="sleep-tracker" options={{ presentation: 'modal' }} />
            <Stack.Screen name="future-simulation" options={{ presentation: 'modal' }} />
            <Stack.Screen name="transformation-card" options={{ presentation: 'modal' }} />
            <Stack.Screen name="body-photos" options={{ presentation: 'modal' }} />
            <Stack.Screen name="legal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
            <Stack.Screen name="personal-records" options={{ presentation: 'modal' }} />
          </Stack>
          <PaywallModal />

          {/* Navigasyon ağacını unmount etmeden üst katmanda gösterilen yüklenme durumu */}
          {showSplash && (
            <View style={StyleSheet.absoluteFill} className="z-50">
              <SplashScreenView />
            </View>
          )}

          {migrationsError && (
            <View
              style={StyleSheet.absoluteFill}
              className="items-center justify-center bg-bg-primary p-lg z-50 gap-md"
            >
              <Text className="text-center text-danger font-semibold">
                Yerel veritabanı hazırlanamadı: {migrationsError.message}
              </Text>
              <Pressable
                onPress={() => {
                  try {
                    sqlite.execSync('DROP TABLE IF EXISTS sleep_logs;');
                    router.replace('/');
                  } catch (e) {
                    console.error('[RootLayout] Onarım hatası:', e);
                  }
                }}
                className="rounded-xl bg-accent px-lg py-3 active:opacity-80"
              >
                <Text className="text-sm font-bold text-[#0B0F14]">
                  Veritabanını Onar ve Yeniden Başlat
                </Text>
              </Pressable>
            </View>
          )}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
