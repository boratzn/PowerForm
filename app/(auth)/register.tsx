import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleRegister = async () => {
    if (!email.trim() || !password) return;

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Girdiğiniz şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setError(null);
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    if (!data.session) {
      setPendingConfirmation(true);
    }
  };

  // E-posta Onay Bekleme Ekranı
  if (pendingConfirmation) {
    return (
      <View
        className="flex-1 items-center justify-center bg-bg-primary px-6"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <View className="w-full max-w-sm rounded-3xl bg-bg-surface border border-white/10 p-6 items-center shadow-xl shadow-black/50">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#38BDF8]/15 border border-[#38BDF8]/30 mb-4">
            <Ionicons name="mail-unread-outline" size={32} color="#38BDF8" />
          </View>

          <Text className="text-xl font-extrabold text-text-primary text-center">
            E-postanı Kontrol Et 📩
          </Text>

          <Text className="text-xs text-text-muted text-center mt-2 leading-relaxed">
            <Text className="font-semibold text-text-primary">{email}</Text> adresine bir aktivasyon bağlantısı gönderdik. Hesabını onayladıktan sonra giriş yapabilirsin.
          </Text>

          <Pressable
            onPress={() => router.replace('/login')}
            className="w-full min-h-[48px] items-center justify-center rounded-xl bg-accent mt-6 active:opacity-85 shadow-lg shadow-accent/25"
          >
            <Text className="text-sm font-bold text-[#0B0F14]">Giriş Ekranına Dön</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-bg-primary"
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: isKeyboardVisible ? 'flex-start' : 'center',
          paddingTop: insets.top + (isKeyboardVisible ? 12 : 16),
          paddingBottom: isKeyboardVisible ? 48 : insets.bottom + 24,
          paddingHorizontal: 20,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* LOGO & MARKA BAŞLIĞI */}
        <View className="items-center mb-6">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 border border-accent/30 shadow-lg shadow-accent/20 mb-2.5">
            <Ionicons name="barbell" size={28} color={colors.accent} />
          </View>
          <Text className="text-2xl font-black tracking-widest text-text-primary">
            POWER<Text className="text-accent">FORM</Text>
          </Text>
          <Text className="text-xs text-text-muted mt-1 font-medium text-center">
            Yeni nesil akıllı antrenman asistanı
          </Text>
        </View>

        {/* KAYIT FORMU KARTI */}
        <View className="rounded-3xl bg-bg-surface border border-white/10 p-6 shadow-xl shadow-black/40 gap-4">
          <View>
            <Text className="text-xl font-extrabold text-text-primary">Hesap Oluştur</Text>
            <Text className="text-xs text-text-muted mt-0.5">
              Güç, hipertrofi ve form takibine hemen başla
            </Text>
          </View>

          {/* HATA BANNER'I */}
          {error && (
            <View className="flex-row items-center gap-2 rounded-xl bg-danger/10 border border-danger/30 p-3">
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text className="text-xs font-medium text-danger flex-1">{error}</Text>
            </View>
          )}

          {/* E-POSTA ALANI */}
          <View className="gap-1.5">
            <Text className="text-xs font-semibold text-text-muted">E-posta</Text>
            <View
              className={`flex-row items-center rounded-xl bg-bg-elevated px-3.5 border transition-all ${
                isEmailFocused ? 'border-accent bg-bg-elevated/90' : 'border-white/10'
              }`}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={isEmailFocused ? colors.accent : colors.textMuted}
              />
              <TextInput
                placeholder="ornek@email.com"
                placeholderTextColor="#6B7A8C"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                editable={!loading}
                className="flex-1 min-h-[48px] px-2.5 text-sm text-text-primary"
              />
            </View>
          </View>

          {/* ŞİFRE ALANI */}
          <View className="gap-1.5">
            <Text className="text-xs font-semibold text-text-muted">Şifre</Text>
            <View
              className={`flex-row items-center rounded-xl bg-bg-elevated px-3.5 border transition-all ${
                isPasswordFocused ? 'border-accent bg-bg-elevated/90' : 'border-white/10'
              }`}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={isPasswordFocused ? colors.accent : colors.textMuted}
              />
              <TextInput
                placeholder="En az 6 karakter"
                placeholderTextColor="#6B7A8C"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => {
                  setIsPasswordFocused(true);
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 120);
                }}
                onBlur={() => setIsPasswordFocused(false)}
                editable={!loading}
                className="flex-1 min-h-[48px] px-2.5 text-sm text-text-primary"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
                className="p-1"
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* ŞİFRE TEKRAR ALANI */}
          <View className="gap-1.5">
            <Text className="text-xs font-semibold text-text-muted">Şifre Tekrar</Text>
            <View
              className={`flex-row items-center rounded-xl bg-bg-elevated px-3.5 border transition-all ${
                isConfirmPasswordFocused ? 'border-accent bg-bg-elevated/90' : 'border-white/10'
              }`}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={isConfirmPasswordFocused ? colors.accent : colors.textMuted}
              />
              <TextInput
                placeholder="Şifrenizi tekrar girin"
                placeholderTextColor="#6B7A8C"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => {
                  setIsConfirmPasswordFocused(true);
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 120);
                }}
                onBlur={() => setIsConfirmPasswordFocused(false)}
                editable={!loading}
                className="flex-1 min-h-[48px] px-2.5 text-sm text-text-primary"
                onSubmitEditing={handleRegister}
              />
            </View>
          </View>

          {/* KAYIT OL BUTONU */}
          <Pressable
            onPress={handleRegister}
            disabled={loading || !email.trim() || password.length < 6 || !confirmPassword}
            className={`min-h-[50px] flex-row items-center justify-center rounded-xl bg-accent mt-2 active:opacity-85 shadow-lg shadow-accent/25 ${
              loading || !email.trim() || password.length < 6 || !confirmPassword ? 'opacity-50' : ''
            }`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0B0F14" />
            ) : (
              <Text className="text-sm font-bold text-[#0B0F14]">Hesap Oluştur 🚀</Text>
            )}
          </Pressable>
        </View>

        {/* GİRİŞ YAP YÖNLENDİRMESİ */}
        <View className="flex-row items-center justify-center gap-1.5 mt-8">
          <Text className="text-xs text-text-muted">Zaten bir hesabın var mı?</Text>
          <Pressable
            hitSlop={8}
            onPress={() => router.push('/login')}
            disabled={loading}
            className="py-1 px-1.5"
          >
            <Text className="text-xs font-bold text-accent">Giriş Yap</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
