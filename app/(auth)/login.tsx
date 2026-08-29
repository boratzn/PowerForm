import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';

// F1: Kayıt/giriş — e-posta+şifre. Apple/Google girişi ayrı bir iş paketi (Apple
// Developer / Google Cloud hesabı gerektiriyor), bkz. PROGRESS.md.
// Giriş başarılı olunca burada router.push YAPILMAZ — useAuthStore.initialize()'daki
// onAuthStateChange dinleyicisi session'ı yakalar, app/_layout.tsx (auth) ↔ (tabs)
// yönlendirmesini kendisi yapar.
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <View
      className="flex-1 justify-center gap-md bg-bg-primary px-lg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text className="mb-lg text-2xl font-semibold text-text-primary">Giriş Yap</Text>
      <Input
        placeholder="E-posta"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />
      <Input placeholder="Şifre" secureTextEntry value={password} onChangeText={setPassword} editable={!loading} />
      {error && <Text className="text-sm text-danger">{error}</Text>}
      <Button
        label={loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        className="mt-md"
        onPress={handleLogin}
        disabled={loading || !email || !password}
      />
      <Button label="Hesabın yok mu? Kayıt ol" variant="ghost" onPress={() => router.push('/register')} disabled={loading} />
    </View>
  );
}
