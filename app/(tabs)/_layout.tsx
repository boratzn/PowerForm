import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';

import { colors } from '../../src/constants/theme';
import { useLanguageStore } from '../../src/stores/useLanguageStore';

// Sekme yapısı §11 UX akışına birebir uyar: Bugün / Antrenman / Kütüphane / Beslenme / Koç / Profil
export default function TabsLayout() {
  const t = useLanguageStore((s) => s.t);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bgSurface, borderTopColor: colors.bgElevated },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_today'),
          tabBarIcon: ({ color, size }) => <Ionicons name="sunny-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: t('tab_workout'),
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t('tab_library'),
          tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" color={color} size={size} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const state = navigation.getState();
            const libraryRoute = state?.routes?.find((r: any) => r.name === 'library');
            if (libraryRoute?.state?.key) {
              navigation.dispatch({
                type: 'RESET',
                payload: {
                  index: 0,
                  routes: [{ name: 'index' }],
                },
                target: libraryRoute.state.key,
              });
            }
            navigation.navigate('library', {
              screen: 'index',
            });
            router.replace('/(tabs)/library');
          },
        })}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: t('tab_nutrition'),
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: t('tab_coach'),
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab_profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
