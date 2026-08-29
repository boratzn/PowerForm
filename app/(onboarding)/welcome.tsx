import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../src/components/ui';

// §11 Onboarding adım 1: Karşılama + değer önerisi (3 slayt, atlanabilir).
// Şimdilik tek statik ekran — slayt carousel'i Faz 0 sonu / Faz 5 cilalamasında eklenecek.
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 justify-end gap-md bg-bg-primary px-lg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}
    >
      <Text className="text-3xl font-semibold text-text-primary">Powerform</Text>
      <Text className="text-base text-text-muted">
        Antrenmanını logla, beslenmeni takip et, gerçek verine erişimi olan bir AI koçla konuş.
      </Text>
      <Button label="Başla" className="mt-lg" />
    </View>
  );
}
