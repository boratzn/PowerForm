import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// §11 Onboarding adım 3-5: profil, deneyim/hedef, gün/ekipman. F2 alanlarına karşılık gelir.
export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-bg-primary px-lg" style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom }}>
      <Text className="text-2xl font-semibold text-text-primary">Profilini kur</Text>
      <Text className="mt-xs text-text-muted">
        Boy, kilo, doğum yılı, cinsiyet, deneyim, hedef, ekipman — form Faz 0 sonunda eklenecek.
      </Text>
    </View>
  );
}
