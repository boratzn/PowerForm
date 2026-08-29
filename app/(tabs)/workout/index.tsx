import { useRouter } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card } from '../../../src/components/ui';

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      className="flex-1 bg-bg-primary px-lg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, gap: 16 }}
    >
      <Text className="text-2xl font-semibold text-text-primary">Antrenman</Text>

      <Card>
        <Text className="text-base text-text-muted">Aktif program</Text>
        <Text className="mt-xs text-lg font-medium text-text-primary">Henüz seçilmedi</Text>
      </Card>

      <Button label="Seansı Başlat" onPress={() => router.push('/session')} />

      <Card>
        <Text className="text-base text-text-muted">Şablon galerisi ve program düzenleyici</Text>
        <Text className="mt-xs text-xs text-text-muted">
          Faz 1 kapsamı — henüz yok. "Seansı Başlat" şimdilik boş/ad-hoc bir seans açar
          (egzersizleri elle ekleyip loglayabilirsin), programa bağlı akış değil.
        </Text>
      </Card>
    </ScrollView>
  );
}
