import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/theme';
import { getLatestBodyPhoto } from '../../db/bodyPhotos';
import type { CheckInAnswers } from '../../services/aiCoach';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { Button, Card, Input } from '../ui';

type WeeklyCheckInModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (answers: CheckInAnswers) => void;
  isGenerating: boolean;
};

export function WeeklyCheckInModal({
  visible,
  onClose,
  onSubmit,
  isGenerating,
}: WeeklyCheckInModalProps) {
  const insets = useSafeAreaInsets();
  const t = useLanguageStore((s) => s.t);
  const lang = useLanguageStore((s) => s.language);
  const userId = useAuthStore((s) => s.session?.user.id);

  const [sleepRecovery, setSleepRecovery] = useState<number>(4);
  const [jointPain, setJointPain] = useState<'none' | 'mild' | 'severe'>('none');
  const [nutritionAdherence, setNutritionAdherence] = useState<'low' | 'medium' | 'high'>('high');
  const [userNotes, setUserNotes] = useState('');

  // Form Fotoğrafı State'i (Item 6)
  const [attachedPhotoUri, setAttachedPhotoUri] = useState<string | null>(null);
  const [attachedPhotoBase64, setAttachedPhotoBase64] = useState<string | null>(null);

  useEffect(() => {
    if (visible && userId) {
      getLatestBodyPhoto(userId).then((photo) => {
        if (photo && !attachedPhotoUri) {
          setAttachedPhotoUri(photo.photoUri);
          setAttachedPhotoBase64(photo.photoBase64);
        }
      });
    }
  }, [visible, userId]);

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachedPhotoUri(result.assets[0].uri);
        setAttachedPhotoBase64(result.assets[0].base64 ?? null);
      }
    } catch (err: any) {
      Alert.alert('Hata', err?.message || 'Fotoğraf seçilemedi.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Kamera erişim izni vermelisiniz.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachedPhotoUri(result.assets[0].uri);
        setAttachedPhotoBase64(result.assets[0].base64 ?? null);
      }
    } catch (err: any) {
      Alert.alert('Hata', err?.message || 'Fotoğraf çekilemedi.');
    }
  };

  const handleSubmit = () => {
    onSubmit({
      sleepRecoveryRating: sleepRecovery,
      jointPainOrFatigue: jointPain,
      nutritionAdherence,
      userNotes: userNotes.trim() || undefined,
      photoUri: attachedPhotoUri || undefined,
      photoBase64: attachedPhotoBase64 || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1 bg-bg-primary"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View
          className="flex-1 px-lg"
          style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom + 16 }}
        >
          {/* Üst Bar */}
          <View className="flex-row items-center justify-between pb-sm border-b border-bg-elevated">
            <View>
              <Text className="text-xl font-bold text-text-primary">{t('weekly_checkin_title')}</Text>
              <Text className="text-xs text-text-muted">{t('weekly_checkin_subtitle')}</Text>
            </View>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-bg-surface active:opacity-70"
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 pt-md"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 20 }}
          >
            {/* Soru 1: Uyku & Toparlanma */}
            <Card className="gap-sm">
              <View className="flex-row items-center gap-xs">
                <Ionicons name="moon-outline" size={16} color="#38BDF8" />
                <Text className="text-xs font-bold uppercase text-text-muted">
                  {t('checkin_q1_title')}
                </Text>
              </View>
              <Text className="text-xs text-text-muted">
                {t('checkin_q1_desc')}
              </Text>
              <View className="flex-row gap-xs pt-xs">
                {[1, 2, 3, 4, 5].map((val) => {
                  const isSelected = sleepRecovery === val;
                  return (
                    <Pressable
                      key={val}
                      onPress={() => setSleepRecovery(val)}
                      className={`flex-1 items-center justify-center rounded-xl py-3 border ${
                        isSelected ? 'border-accent bg-accent/15' : 'border-bg-elevated bg-bg-elevated'
                      }`}
                    >
                      <Text
                        className={`text-base font-bold ${
                          isSelected ? 'text-accent' : 'text-text-muted'
                        }`}
                      >
                        {val}
                      </Text>
                      <Text className="text-[10px] text-text-muted mt-0.5">
                        {val === 1 ? t('sleep_quality_bad') : val === 5 ? t('sleep_quality_great') : `${val}/5`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* Soru 2: Eklem Ağrısı veya Aşırı Yorgunluk */}
            <Card className="gap-sm">
              <View className="flex-row items-center gap-xs">
                <Ionicons name="fitness-outline" size={16} color="#F87171" />
                <Text className="text-xs font-bold uppercase text-text-muted">
                  {t('checkin_q2_title')}
                </Text>
              </View>
              <Text className="text-xs text-text-muted">
                {t('checkin_q2_desc')}
              </Text>
              <View className="gap-xs pt-xs">
                {[
                  { key: 'none', label: t('joint_pain_none'), color: '#4ADE80' },
                  { key: 'mild', label: t('joint_pain_mild'), color: '#FBBF24' },
                  { key: 'severe', label: t('joint_pain_severe'), color: '#F87171' },
                ].map((opt) => {
                  const isSelected = jointPain === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setJointPain(opt.key as any)}
                      className={`flex-row items-center justify-between rounded-xl p-md border ${
                        isSelected ? 'border-accent bg-accent/10' : 'border-bg-elevated bg-bg-elevated'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-text-primary' : 'text-text-muted'
                        }`}
                      >
                        {opt.label}
                      </Text>
                      <View
                        className={`h-4 w-4 items-center justify-center rounded-full border ${
                          isSelected ? 'border-accent bg-accent' : 'border-text-muted/40'
                        }`}
                      >
                        {isSelected && <Ionicons name="checkmark" size={10} color="#0B0F14" />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* Soru 3: Beslenme Sadakati */}
            <Card className="gap-sm">
              <View className="flex-row items-center gap-xs">
                <Ionicons name="nutrition-outline" size={16} color="#4ADE80" />
                <Text className="text-xs font-bold uppercase text-text-muted">
                  {t('checkin_q3_title')}
                </Text>
              </View>
              <Text className="text-xs text-text-muted">
                {t('checkin_q3_desc')}
              </Text>
              <View className="flex-row gap-xs pt-xs">
                {[
                  { key: 'high', label: t('nutrition_adh_high') },
                  { key: 'medium', label: t('nutrition_adh_medium') },
                  { key: 'low', label: t('nutrition_adh_low') },
                ].map((opt) => {
                  const isSelected = nutritionAdherence === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setNutritionAdherence(opt.key as any)}
                      className={`flex-1 items-center justify-center rounded-xl py-3 px-1 border text-center ${
                        isSelected ? 'border-accent bg-accent/15' : 'border-bg-elevated bg-bg-elevated'
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold text-center ${
                          isSelected ? 'text-accent' : 'text-text-muted'
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* Soru 4: Form Fotoğrafı (AI Görsel Analizi İçin - Item 6) */}
            <Card className="gap-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-xs">
                  <Ionicons name="camera-outline" size={16} color="#38BDF8" />
                  <Text className="text-xs font-bold uppercase text-text-muted">
                    {t('period_weekly_checkin')}
                  </Text>
                </View>
                {attachedPhotoUri && (
                  <View className="rounded-full bg-accent/20 px-2 py-0.5 border border-accent/30">
                    <Text className="text-[10px] font-bold text-accent">
                      {t('checkin_photo_included')}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-xs text-text-muted">
                {t('checkin_photo_guide')}
              </Text>

              {attachedPhotoUri ? (
                <View className="flex-row items-center gap-3 p-2.5 rounded-xl bg-bg-surface border border-white/5">
                  <View className="h-16 w-16 rounded-xl overflow-hidden bg-bg-elevated border border-white/10">
                    <Image
                      source={{ uri: attachedPhotoUri }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-xs font-bold text-text-primary">
                      {t('checkin_photo_attached_title')}
                    </Text>
                    <Text className="text-[10px] text-text-muted">
                      {t('checkin_photo_attached_sub')}
                    </Text>
                    <View className="flex-row gap-2 mt-1">
                      <Pressable
                        onPress={handlePickPhoto}
                        className="px-2.5 py-1 bg-bg-elevated rounded-lg border border-white/5 active:opacity-70"
                      >
                        <Text className="text-[10px] font-semibold text-text-muted">
                          {t('change_photo')}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setAttachedPhotoUri(null);
                          setAttachedPhotoBase64(null);
                        }}
                        className="px-2.5 py-1 bg-danger/15 rounded-lg border border-danger/25 active:opacity-70"
                      >
                        <Text className="text-[10px] font-semibold text-danger">
                          {t('delete')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="flex-row gap-2 pt-1">
                  <Pressable
                    onPress={handleTakePhoto}
                    className="flex-1 py-2.5 rounded-xl bg-bg-elevated items-center justify-center flex-row gap-1.5 border border-white/5 active:opacity-70"
                  >
                    <Ionicons name="camera" size={15} color="#38BDF8" />
                    <Text className="text-xs font-bold text-text-primary">
                      {t('take_photo')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handlePickPhoto}
                    className="flex-1 py-2.5 rounded-xl bg-bg-elevated items-center justify-center flex-row gap-1.5 border border-white/5 active:opacity-70"
                  >
                    <Ionicons name="images-outline" size={15} color="#38BDF8" />
                    <Text className="text-xs font-bold text-text-primary">
                      {t('pick_from_gallery')}
                    </Text>
                  </Pressable>
                </View>
              )}
            </Card>

            {/* Soru 5: Özel Not veya Soru (Opsiyonel) */}
            <Card className="gap-sm">
              <View className="flex-row items-center gap-xs">
                <Ionicons name="create-outline" size={16} color="#A855F7" />
                <Text className="text-xs font-bold uppercase text-text-muted">
                  {t('checkin_q4_title')}
                </Text>
              </View>
              <Input
                value={userNotes}
                onChangeText={setUserNotes}
                placeholder={t('checkin_q4_placeholder')}
                multiline
                className="min-h-[70px] text-xs pt-2"
              />
            </Card>

            {/* Başlat Butonu */}
            <View className="pt-xs pb-md">
              <Button
                label={isGenerating ? t('ai_analyzing') : t('analyze_answers_btn')}
                variant="primary"
                disabled={isGenerating}
                onPress={handleSubmit}
                className="min-h-[50px]"
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
