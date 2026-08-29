import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { db } from '../src/db/client';
import migrations from '../src/db/migrations/migrations';
import { seedLocalExercisesIfEmpty } from '../src/db/seedExercises';
import { queryClient } from '../src/lib/queryClient';
import { useAuthStore } from '../src/stores/useAuthStore';

export default function RootLayout() {
  // Yerel SQLite tabloları uygulama her açıldığında burada oluşturulur/güncellenir —
  // drizzle-kit generate ile üretilen src/db/migrations/*.sql'i uygular (bkz. metro.config.js
  // .sql import desteği). Migration bitmeden hiçbir ekran DB'ye erişmemeli.
  const { success: migrationsReady, error: migrationsError } = useMigrations(db, migrations);

  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const authInitializing = useAuthStore((s) => s.isInitializing);
  const initializeAuth = useAuthStore((s) => s.initialize);

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!migrationsReady) return;
    seedLocalExercisesIfEmpty().catch((err) => console.error('[RootLayout] Egzersiz seed hatası:', err));
  }, [migrationsReady]);

  // §11 onboarding akışı: session yoksa (auth), session var ama onboarding_done=false
  // ise (onboarding), ikisi de tamamsa (tabs). Bilinen sınırlama: profil ilk kez
  // yüklenirken (null) kısa bir an "onboarding gerekiyor" gibi davranır — bkz. PROGRESS.md.
  useEffect(() => {
    if (!migrationsReady || authInitializing) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && !profile?.onboarding_done && !inOnboardingGroup) {
      router.replace('/welcome');
    } else if (session && profile?.onboarding_done && (inAuthGroup || inOnboardingGroup)) {
      router.replace('/');
    }
  }, [migrationsReady, authInitializing, session, profile, segments, router]);

  if (migrationsError) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary p-lg">
        <Text className="text-center text-danger">Yerel veritabanı hazırlanamadı: {migrationsError.message}</Text>
      </View>
    );
  }
  if (!migrationsReady || authInitializing) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary">
        <Text className="text-text-muted">Hazırlanıyor…</Text>
      </View>
    );
  }

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
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
