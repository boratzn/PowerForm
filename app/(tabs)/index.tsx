import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../../src/components/ui';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-bg-primary px-lg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, gap: 16 }}
    >
      <Text className="text-2xl font-semibold text-text-primary">Bugün</Text>

      <Card>
        <Text className="text-base text-text-muted">Bugünün antrenmanı</Text>
        <Text className="mt-xs text-lg font-medium text-text-primary">
          Henüz aktif bir programın yok — Antrenman sekmesinden bir şablon seç.
        </Text>
      </Card>

      <Card>
        <Text className="text-base text-text-muted">Hızlı kilo girişi</Text>
      </Card>

      <Card>
        <Text className="text-base text-text-muted">Bugünün kalori / protein durumu</Text>
      </Card>

      <View>
        <Text className="text-xs text-text-muted">
          Bu ekran §11 UX akışındaki "BUGÜN" sekmesinin iskeletidir — Faz 1/2'de gerçek veriyle
          doldurulacak (bkz. PROGRESS.md).
        </Text>
      </View>
    </ScrollView>
  );
}
