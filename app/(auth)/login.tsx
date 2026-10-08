import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { useLanguageStore } from '../../src/stores/useLanguageStore';

const REMEMBER_ME_KEY = 'powerform_remember_me';
const REMEMBERED_EMAIL_KEY = 'powerform_remembered_email';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Hatırlanan e-postayı yükle
    AsyncStorage.multiGet([REMEMBER_ME_KEY, REMEMBERED_EMAIL_KEY])
      .then(([[, rem], [, savedEmail]]) => {
        if (rem !== null) {
          setRememberMe(rem === 'true');
        }
        if (savedEmail && rem !== 'false') {
          setEmail(savedEmail);
        }
      })
      .catch(() => {});

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

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) {
      if (err.message.includes('Invalid login credentials')) {
        setError('E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.');
      } else {
        setError(err.message);
      }
    } else {
      // Başarılı girişte Beni Hatırla tercihini kaydet
      if (rememberMe) {
        AsyncStorage.multiSet([
          [REMEMBER_ME_KEY, 'true'],
          [REMEMBERED_EMAIL_KEY, email.trim()],
        ]).catch(() => {});
      } else {
        AsyncStorage.multiSet([
          [REMEMBER_ME_KEY, 'false'],
          [REMEMBERED_EMAIL_KEY, ''],
        ]).catch(() => {});
      }
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
        {/* LOGO & MARKA BAŞLIĞI */}
        <View className="items-center mb-8">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 border border-accent/30 shadow-lg shadow-accent/20 mb-3">
            <Ionicons name="barbell" size={32} color={colors.accent} />
          </View>
          <Text className="text-2xl font-black tracking-widest text-text-primary">
            POWER<Text className="text-accent">FORM</Text>
          </Text>
          <Text className="text-xs text-text-muted mt-1 font-medium text-center">
            {t('brand_slogan')}
          </Text>
        </View>

        {/* GİRİŞ FORMU KARTI */}
        <View className="rounded-3xl bg-bg-surface border border-white/10 p-6 shadow-xl shadow-black/40 gap-4">
          <View>
            <Text className="text-xl font-extrabold text-text-primary">{t('login_title')}</Text>
            <Text className="text-xs text-text-muted mt-0.5">
              {t('login_subtitle')}
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
            <Text className="text-xs font-semibold text-text-muted">{t('email_label')}</Text>
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
            <Text className="text-xs font-semibold text-text-muted">{t('password_label')}</Text>
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
                placeholder="••••••••"
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
                onSubmitEditing={handleLogin}
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

          {/* BENİ HATIRLA & ŞİFREMİ UNUTTUM */}
          <View className="flex-row items-center justify-between pt-0.5">
            <Pressable
              onPress={() => setRememberMe(!rememberMe)}
              hitSlop={8}
              className="flex-row items-center gap-2 active:opacity-75"
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded-md border ${
                  rememberMe
                    ? 'bg-accent border-accent'
                    : 'bg-bg-elevated border-white/20'
                }`}
              >
                {rememberMe && (
                  <Ionicons name="checkmark" size={13} color="#0B0F14" />
                )}
              </View>
              <Text className="text-xs font-semibold text-text-primary">
                {t('remember_me')}
              </Text>
            </Pressable>

            <Pressable
              hitSlop={8}
              onPress={() => router.push('/forgot-password')}
              disabled={loading}
              className="py-0.5"
            >
              <Text className="text-xs font-semibold text-[#38BDF8]">
                {t('forgot_password_link')}
              </Text>
            </Pressable>
          </View>

          {/* GİRİŞ YAP BUTONU */}
          <Pressable
            onPress={handleLogin}
            disabled={loading || !email.trim() || !password}
            className={`min-h-[50px] flex-row items-center justify-center rounded-xl bg-accent mt-2 active:opacity-85 shadow-lg shadow-accent/25 ${
              loading || !email.trim() || !password ? 'opacity-50' : ''
            }`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0B0F14" />
            ) : (
              <Text className="text-sm font-bold text-[#0B0F14]">{t('login_title')} ➔</Text>
            )}
          </Pressable>
        </View>

        {/* KAYIT OL YÖNLENDİRMESİ */}
        <View className="flex-row items-center justify-center gap-1.5 mt-8">
          <Text className="text-xs text-text-muted">{t('dont_have_account')}</Text>
          <Pressable
            hitSlop={8}
            onPress={() => router.push('/register')}
            disabled={loading}
            className="py-1 px-1.5"
          >
            <Text className="text-xs font-bold text-accent">{t('sign_up_link')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
