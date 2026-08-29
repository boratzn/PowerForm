import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card } from '../../../src/components/ui';
import { useAuthStore } from '../../../src/stores/useAuthStore';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <ScrollView
      className="flex-1 bg-bg-primary px-lg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, gap: 16 }}
    >
      <Text className="text-2xl font-semibold text-text-primary">Profil</Text>
      <Card>
        <Text className="text-base text-text-muted">
          İlerleme, istatistikler, rekorlar, AI raporları, ayarlar.
        </Text>
      </Card>

      <Card>
        <Text className="text-xs text-text-muted">Hesap</Text>
        <Text className="mt-xs text-base text-text-primary">{session?.user.email}</Text>
        <Button label="Çıkış Yap" variant="secondary" className="mt-md" onPress={signOut} />
      </Card>
    </ScrollView>
  );
}
