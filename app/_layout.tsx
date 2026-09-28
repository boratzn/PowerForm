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
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { db } from '../src/db/client';
import migrations from '../src/db/migrations/migrations';
import { seedLocalExercisesIfEmpty } from '../src/db/seedExercises';
import { seedLocalFoodsIfEmpty } from '../src/db/nutrition';
import { syncExercisesFromSupabase } from '../src/db/syncExercises';
import { drainSyncQueue } from '../src/db/syncEngine';
import { queryClient } from '../src/lib/queryClient';
import { PaywallModal } from '../src/components/subscription/PaywallModal';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useSessionStore } from '../src/stores/useSessionStore';
import { useSubscriptionStore } from '../src/stores/useSubscriptionStore';
import { useLanguageStore } from '../src/stores/useLanguageStore';

export default function RootLayout() {
  // Yerel SQLite tabloları uygulama her açıldığında burada oluşturulur/güncellenir —
  // drizzle-kit generate ile üretilen src/db/migrations/*.sql'i uygular (bkz. metro.config.js
  // .sql import desteği). Migration bitmeden hiçbir ekran DB'ye erişmemeli.
  const { success: migrationsReady, error: migrationsError } = useMigrations(db, migrations);

  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const authInitializing = useAuthStore((s) => s.isInitializing);
  const isProfileLoading = useAuthStore((s) => s.isProfileLoading);
  const initializeAuth = useAuthStore((s) => s.initialize);

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
    useLanguageStore.getState().initializeLanguage();
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

    // Çevrimdışı yapılan işlemleri Supabase ile eşitle (§12.4)
    drainSyncQueue().catch((err) => console.warn('[RootLayout] Senkron kuyruğu hatası:', err));
  }, [migrationsReady, session]);

  // §11 onboarding akışı: session yoksa (auth), session var ama onboarding_done=false
  // ise (onboarding), ikisi de tamamsa (tabs). Yalnızca uygulamanın İLK açılışında
  // (profil henüz hiç yüklenmemişken) splash gösterilir. Arka plandaki profil/token
  // yenilemeleri navigasyon ağacını unmount etmemelidir.
  const isInitialLoading = !migrationsReady || authInitializing || (session != null && profile == null && isProfileLoading);

  useEffect(() => {
    if (isInitialLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && !profile?.onboarding_done && !inOnboardingGroup) {
      router.replace('/welcome');
    } else if (session && profile?.onboarding_done && (inAuthGroup || inOnboardingGroup)) {
      router.replace('/');
    }
  }, [isInitialLoading, session, profile, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            {/* Seans ekranı tam ekran modal — sekme çubuğu otomatik gizlenir (§10.2, §11) */}
            <Stack.Screen name="session" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="weight-trend" options={{ presentation: 'modal' }} />
            <Stack.Screen name="legal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
          </Stack>
          <PaywallModal />

          {/* Navigasyon ağacını unmount etmeden üst katmanda gösterilen yüklenme durumu */}
          {isInitialLoading && (
            <View
              style={StyleSheet.absoluteFill}
              className="items-center justify-center bg-bg-primary z-50"
            >
              <Text className="text-text-muted">Hazırlanıyor…</Text>
            </View>
          )}

          {migrationsError && (
            <View
              style={StyleSheet.absoluteFill}
              className="items-center justify-center bg-bg-primary p-lg z-50"
            >
              <Text className="text-center text-danger">
                Yerel veritabanı hazırlanamadı: {migrationsError.message}
              </Text>
            </View>
          )}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
