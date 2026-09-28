import { Stack } from 'expo-router';

import { colors } from '../../../src/constants/theme';

export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgPrimary },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="templates/index" options={{ title: 'Hazır Programlar' }} />
      <Stack.Screen name="templates/[templateId]" options={{ title: 'Program Detayı' }} />
      <Stack.Screen name="editor" options={{ title: 'Program Düzenleyici' }} />
      <Stack.Screen name="history/index" options={{ title: 'Antrenman Geçmişi' }} />
      <Stack.Screen name="history/[sessionId]" options={{ title: 'Antrenman Özeti' }} />
    </Stack>
  );
}
