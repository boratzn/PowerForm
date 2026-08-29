import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '../../src/constants/theme';

// Sekme yapısı §11 UX akışına birebir uyar: Bugün / Antrenman / Kütüphane / Beslenme / Koç / Profil
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bgSurface, borderTopColor: colors.bgElevated },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bugün',
          tabBarIcon: ({ color, size }) => <Ionicons name="sunny-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Antrenman',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Kütüphane',
          tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Beslenme',
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Koç',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
