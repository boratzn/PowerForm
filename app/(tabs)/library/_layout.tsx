import { Stack } from 'expo-router';

import { colors } from '../../../src/constants/theme';

// library/ altındaki index + [exerciseId] için kendi stack'i — detay ekranına
// gidince gerçek bir back butonu/native geçiş olsun diye. Bu olmadan Expo Router
// ikisini de doğrudan Tabs navigator'ının kardeş ekranları olarak keşfediyordu
// (bkz. eski (tabs)/_layout.tsx yorumu) ve geri dönüş yolu yoktu.
export default function LibraryLayout() {
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
      <Stack.Screen name="[exerciseId]" options={{ title: '' }} />
    </Stack>
  );
}
