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

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleReset = async () => {
    if (!email.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'powerform://reset-password',
      });

      if (resetErr) {
        setError(resetErr.message);
      } else {
        setSent(true);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Şifre sıfırlama isteği başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

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
          paddingTop: insets.top + (isKeyboardVisible ? 12 : 24),
          paddingBottom: isKeyboardVisible ? 48 : insets.bottom + 24,
          paddingHorizontal: 20,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* LOGO & GERİ DÖN BUTONU */}
        <View className="items-center mb-8">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#38BDF8]/15 border border-[#38BDF8]/30 shadow-lg shadow-[#38BDF8]/20 mb-3">
            <Ionicons name="key-outline" size={30} color="#38BDF8" />
          </View>
          <Text className="text-2xl font-black tracking-widest text-text-primary">
            ŞİFRE<Text className="text-[#38BDF8]">YENİLE</Text>
          </Text>
          <Text className="text-xs text-text-muted mt-1 font-medium text-center">
            Hesabına yeniden erişim sağla
          </Text>
        </View>

        {sent ? (
          <View className="rounded-3xl bg-bg-surface border border-accent/30 p-6 items-center shadow-xl shadow-black/50">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 border border-accent/30 mb-4">
              <Ionicons name="mail-unread" size={32} color={colors.accent} />
            </View>

            <Text className="text-xl font-extrabold text-text-primary text-center">
              E-posta Gönderildi! ✨
            </Text>

            <Text className="text-xs text-text-muted text-center mt-2 leading-relaxed">
              <Text className="font-semibold text-text-primary">{email}</Text> adresine şifre sıfırlama bağlantısı iletildi. Lütfen gelen kutunuzu (ve spam klasörünü) kontrol edin.
            </Text>

            <Pressable
              onPress={() => router.replace('/login')}
              className="w-full min-h-[48px] items-center justify-center rounded-xl bg-accent mt-6 active:opacity-85 shadow-lg shadow-accent/25"
            >
              <Text className="text-sm font-bold text-[#0B0F14]">Giriş Ekranına Dön</Text>
            </Pressable>
          </View>
        ) : (
          <View className="rounded-3xl bg-bg-surface border border-white/10 p-6 shadow-xl shadow-black/40 gap-4">
            <View>
              <Text className="text-xl font-extrabold text-text-primary">Şifremi Unuttum</Text>
              <Text className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Hesabınıza bağlı e-posta adresinizi girin, sıfırlama bağlantısını iletelim.
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
                  isEmailFocused ? 'border-[#38BDF8] bg-bg-elevated/90' : 'border-white/10'
                }`}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={isEmailFocused ? '#38BDF8' : colors.textMuted}
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
                  onSubmitEditing={handleReset}
                />
              </View>
            </View>

            {/* SIFIRLAMA BUTONU */}
            <Pressable
              onPress={handleReset}
              disabled={loading || !email.includes('@')}
              className={`min-h-[50px] flex-row items-center justify-center rounded-xl bg-accent mt-2 active:opacity-85 shadow-lg shadow-accent/25 ${
                loading || !email.includes('@') ? 'opacity-50' : ''
              }`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#0B0F14" />
              ) : (
                <Text className="text-sm font-bold text-[#0B0F14]">Sıfırlama Bağlantısı Gönder ➔</Text>
              )}
            </Pressable>

            {/* GİRİŞE DÖN LİNKİ */}
            <Pressable
              onPress={() => router.back()}
              disabled={loading}
              className="items-center py-2 active:opacity-70 mt-1"
            >
              <Text className="text-xs font-semibold text-text-muted">Giriş Yap'a Dön</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
