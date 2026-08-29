import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Input } from '../../../src/components/ui';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-bg-primary px-lg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, gap: 16 }}
    >
      <Text className="text-2xl font-semibold text-text-primary">Kütüphane</Text>
      <Input placeholder="Egzersiz ara..." />
      <Card>
        <Text className="text-base text-text-muted">
          Egzersiz listesi burada görünecek (Paket 2: seed-exercises.ts ile free-exercise-db
          verisi yüklendikten sonra).
        </Text>
      </Card>
    </ScrollView>
  );
}
