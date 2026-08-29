import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../../../src/components/ui';

export default function CoachScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-bg-primary px-lg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, gap: 16 }}
    >
      <Text className="text-2xl font-semibold text-text-primary">Koç</Text>
      <Card>
        <Text className="text-base text-text-muted">Konuşma listesi</Text>
        <Text className="mt-xs text-xs text-text-muted">
          Faz 3 kapsamı — supabase/functions/ai-chat (Paket 4) yazılınca bağlanacak.
        </Text>
      </Card>
    </ScrollView>
  );
}
