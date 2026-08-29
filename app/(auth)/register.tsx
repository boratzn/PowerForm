import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input } from '../../src/components/ui';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 justify-center gap-md bg-bg-primary px-lg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text className="mb-lg text-2xl font-semibold text-text-primary">Kayıt Ol</Text>
      <Input placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" />
      <Input placeholder="Şifre" secureTextEntry />
      <Button label="Kayıt Ol" className="mt-md" />
    </View>
  );
}
