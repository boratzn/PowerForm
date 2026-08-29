import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Proje "Confirm email" ayarı açıksa signUp sonrası session gelmez — kullanıcıya
  // e-postasını onaylaması gerektiğini söylememiz lazım. Kapalıysa onAuthStateChange
  // zaten session'ı yakalayıp app/_layout.tsx'i (onboarding)'e yönlendirir.
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const handleRegister = async () => {
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (!data.session) setPendingConfirmation(true);
  };

  if (pendingConfirmation) {
    return (
      <View
        className="flex-1 items-center justify-center gap-md bg-bg-primary px-lg"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Text className="text-center text-xl font-semibold text-text-primary">E-postanı kontrol et</Text>
        <Text className="text-center text-text-muted">
          {email} adresine bir onay bağlantısı gönderdik. Onayladıktan sonra giriş yapabilirsin.
        </Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1 justify-center gap-md bg-bg-primary px-lg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text className="mb-lg text-2xl font-semibold text-text-primary">Kayıt Ol</Text>
      <Input
        placeholder="E-posta"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />
      <Input placeholder="Şifre (en az 6 karakter)" secureTextEntry value={password} onChangeText={setPassword} editable={!loading} />
      {error && <Text className="text-sm text-danger">{error}</Text>}
      <Button
        label={loading ? 'Kaydediliyor…' : 'Kayıt Ol'}
        className="mt-md"
        onPress={handleRegister}
        disabled={loading || !email || password.length < 6}
      />
    </View>
  );
}
