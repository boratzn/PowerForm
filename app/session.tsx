import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';

import { Button } from '../src/components/ui';

// Uygulamanın en kritik ekranı — henüz iskelet. Tam implementasyon §10.2 + §11 kurallarına
// göre ayrı bir görev paketi olarak yapılacak (spec §15 "Paket 3 — Seans ekranı"): özel numerik
// klavye, dinlenme sayacı, geçen seferki placeholder değerler, PR kutlaması, önce yerel
// SQLite'a yazma. Şimdilik sadece tam ekran modal + keep-awake iskeleti kurulu.
export default function SessionScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      className="flex-1 bg-bg-primary px-lg"
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
    >
      <Text className="text-2xl font-semibold text-text-primary">Seans</Text>
      <Text className="mt-xs text-text-muted">
        Seans loglama ekranı henüz uygulanmadı (Paket 3). Bu, tam ekran modal + ekran uyanık
        kalma davranışının çalıştığını doğrulamak için bir iskelet.
      </Text>
      <View className="mt-auto">
        <Button label="Seansı Kapat" variant="secondary" onPress={() => router.back()} />
      </View>
    </View>
  );
}
