import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input } from '../../src/components/ui';

// F1: Kayıt/giriş — e-posta+şifre iskeleti. Apple/Google girişi ve gerçek
// supabase.auth çağrıları için bkz. PROGRESS.md "Faz 0 — Auth akışı".
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      className="flex-1 justify-center gap-md bg-bg-primary px-lg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text className="mb-lg text-2xl font-semibold text-text-primary">Giriş Yap</Text>
      <Input placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" />
      <Input placeholder="Şifre" secureTextEntry />
      <Button label="Giriş Yap" className="mt-md" />
      <Button label="Hesabın yok mu? Kayıt ol" variant="ghost" onPress={() => router.push('/register')} />
    </View>
  );
}
