import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../../../src/components/ui';

export default function NutritionScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-bg-primary px-lg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, gap: 16 }}
    >
      <Text className="text-2xl font-semibold text-text-primary">Beslenme</Text>
      <Card>
        <Text className="text-base text-text-muted">Kalori halkası + makro çubukları</Text>
        <Text className="mt-xs text-xs text-text-muted">Faz 4 kapsamı — bkz. PROGRESS.md.</Text>
      </Card>
    </ScrollView>
  );
}
