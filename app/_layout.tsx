import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { seedLocalExercisesIfEmpty } from '../src/db/seedExercises';
import { queryClient } from '../src/lib/queryClient';

export default function RootLayout() {
  useEffect(() => {
    seedLocalExercisesIfEmpty().catch((err) => console.error('[RootLayout] Egzersiz seed hatası:', err));
  }, []);

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
