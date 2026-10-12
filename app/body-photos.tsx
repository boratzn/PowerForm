import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, ModernConfirmModal } from '../src/components/ui';
import { colors } from '../src/constants/theme';
import {
  deleteBodyPhoto,
  formatPhotoDateTime,
  getBodyPhotos,
  saveBodyPhoto,
  type BodyPhoto,
} from '../src/db/bodyPhotos';
import { dateKey } from '../src/lib/calculations';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useLanguageStore } from '../src/stores/useLanguageStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;

const getPhotoTypeLabel = (type: string, t: any) => {
  if (type === 'front') return t('photo_angle_front');
  if (type === 'side') return t('photo_angle_side');
  if (type === 'back') return t('photo_angle_back');
  return t('photo_angle_other');
};

export default function BodyPhotosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const lang = useLanguageStore((s) => s.language);
  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useAuthStore((s) => s.profile);

  const [photos, setPhotos] = useState<BodyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');

  // Modal / Ekleme State'leri (Varsayılan günlük takip)
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [pickedBase64, setPickedBase64] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<'front' | 'side' | 'back' | 'other'>('front');
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [weightInput, setWeightInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Görüntüleme & Silme
  const [selectedPhoto, setSelectedPhoto] = useState<BodyPhoto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BodyPhoto | null>(null);

  const loadPhotos = useCallback(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getBodyPhotos(userId, filterPeriod === 'all' ? undefined : { periodType: filterPeriod })
      .then(setPhotos)
      .catch((err) => console.error('[BodyPhotos] Fotoğraflar alınamadı:', err))
      .finally(() => setLoading(false));
  }, [userId, filterPeriod]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permission_required'), t('gallery_permission_msg'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPickedImageUri(result.assets[0].uri);
        setPickedBase64(result.assets[0].base64 ?? null);
        setWeightInput((profile as any)?.weight_kg ? String((profile as any).weight_kg) : '');
        setAddModalVisible(true);
      }
    } catch (err: any) {
      Alert.alert(t('error'), err?.message || t('photo_save_error'));
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permission_required'), t('camera_permission_msg'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPickedImageUri(result.assets[0].uri);
        setPickedBase64(result.assets[0].base64 ?? null);
        setWeightInput((profile as any)?.weight_kg ? String((profile as any).weight_kg) : '');
        setAddModalVisible(true);
      }
    } catch (err: any) {
      Alert.alert(t('error'), err?.message || t('photo_save_error'));
    }
  };

  const handleSavePhoto = async () => {
    if (!userId || !pickedImageUri) return;
    setSaving(true);
    try {
      const parsedWeight = parseFloat(weightInput.replace(',', '.'));
      await saveBodyPhoto(userId, {
        photoUri: pickedImageUri,
        photoBase64: pickedBase64,
        photoType,
        periodType,
        date: dateKey(new Date()),
        weightKg: !isNaN(parsedWeight) ? parsedWeight : null,
        notes: notesInput.trim() || null,
      });

      setAddModalVisible(false);
      setPickedImageUri(null);
      setPickedBase64(null);
      setNotesInput('');
      loadPhotos();
    } catch (err: any) {
      Alert.alert(t('error'), err?.message || t('photo_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeletePhoto = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setSelectedPhoto(null);
    try {
      await deleteBodyPhoto(target.clientUuid);
      loadPhotos();
    } catch (err: any) {
      Alert.alert(t('error'), err?.message || t('photo_delete_error'));
    }
  };

  return (
    <View
      className="flex-1 bg-bg-primary"
      style={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 16,
      }}
    >
      {/* Üst Bar */}
      <View className="flex-row items-center justify-between px-lg mb-sm">
        <View>
          <Text className="text-xl font-bold text-text-primary">
            {t('body_photos_title')}
          </Text>
          <Text className="text-xs text-text-muted">
            {t('body_photos_subtitle')}
          </Text>
        </View>

        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-bg-card active:opacity-70"
        >
          <Text className="text-xl text-text-muted">×</Text>
        </Pressable>
      </View>

      {/* 3'lü Sekme Geçişi: Kilo Takibi <-> Vücut Ölçüleri <-> Form Fotoğrafları */}
      <View className="flex-row rounded-xl bg-bg-card p-1 mx-lg mb-md border border-white/5">
        <Pressable
          onPress={() => router.replace('/weight-trend')}
          className="flex-1 py-2 items-center rounded-lg active:opacity-70"
        >
          <Text className="text-[11px] font-semibold text-text-muted">{t('weight_tracking_header')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/body-measurements')}
          className="flex-1 py-2 items-center rounded-lg active:opacity-70"
        >
          <Text className="text-[11px] font-semibold text-text-muted">{t('body_measurements_title')}</Text>
        </Pressable>
        <Pressable className="flex-1 py-2 items-center rounded-lg bg-bg-elevated shadow-sm border border-accent/20">
          <Text className="text-[11px] font-bold text-accent">{t('tab_body_photos')}</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-lg"
        contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Haftalık Analiz Bilgilendirme Banner'ı */}
        <View className="rounded-2xl bg-accent/10 border border-accent/30 p-3.5 flex-row items-center gap-3">
          <View className="h-9 w-9 rounded-xl bg-accent/20 items-center justify-center">
            <Ionicons name="sparkles" size={18} color={colors.accent} />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold text-accent">
              {t('body_photos_ai_banner_title')}
            </Text>
            <Text className="text-[10px] text-text-muted leading-3.5 mt-0.5">
              {t('body_photos_ai_banner_desc')}
            </Text>
          </View>
        </View>

        {/* Aksiyon Butonları: Galeri & Kamera */}
        <View className="flex-row gap-2">
          <Pressable
            onPress={handleTakePhoto}
            className="flex-1 py-3 px-2 rounded-xl bg-accent items-center justify-center flex-row gap-2 active:opacity-85 shadow-md shadow-accent/20"
          >
            <Ionicons name="camera" size={18} color="#0B0F14" />
            <Text className="text-xs font-extrabold text-bg-primary">{t('take_photo')}</Text>
          </Pressable>

          <Pressable
            onPress={handlePickFromGallery}
            className="flex-1 py-3 px-2 rounded-xl bg-bg-surface border border-accent/30 items-center justify-center flex-row gap-2 active:opacity-70"
          >
            <Ionicons name="images-outline" size={18} color={colors.accent} />
            <Text className="text-xs font-bold text-accent">{t('pick_from_gallery')}</Text>
          </Pressable>
        </View>

        {/* Dönüşüm Karşılaştırma Kartı Kısayolu */}
        <Pressable
          onPress={() => router.push('/transformation-card')}
          className="flex-row items-center justify-between p-3 rounded-2xl bg-bg-surface border border-white/10 active:opacity-80"
        >
          <View className="flex-row items-center gap-2.5">
            <View className="h-8 w-8 rounded-xl bg-[#38BDF8]/20 items-center justify-center">
              <Ionicons name="git-compare-outline" size={16} color="#38BDF8" />
            </View>
            <View>
              <Text className="text-xs font-bold text-text-primary">
                {t('before_after_card_title')}
              </Text>
              <Text className="text-[10px] text-text-muted">
                {t('before_after_card_desc')}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
        </Pressable>

        {/* Dönem Filtresi (Tümü / Haftalık / Aylık) */}
        <View className="flex-row items-center justify-between pt-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
            {t('photo_gallery_title')} ({photos.length})
          </Text>

          <View className="flex-row gap-1 bg-bg-card p-1 rounded-lg border border-white/5">
            {[
              { key: 'all' as const, label: t('filter_all') },
              { key: 'daily' as const, label: t('filter_daily') },
              { key: 'weekly' as const, label: t('filter_weekly') },
              { key: 'monthly' as const, label: t('filter_monthly') },
            ].map((p) => {
              const isSelected = filterPeriod === p.key;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setFilterPeriod(p.key)}
                  className={`px-2 py-1 rounded ${isSelected ? 'bg-accent/20' : ''}`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      isSelected ? 'text-accent' : 'text-text-muted'
                    }`}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Galeri Izgarası */}
        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : photos.length === 0 ? (
          <Card className="items-center py-10 gap-2 border border-dashed border-white/10 bg-bg-surface/50">
            <View className="h-12 w-12 rounded-2xl bg-bg-elevated items-center justify-center">
              <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
            </View>
            <Text className="text-sm font-bold text-text-primary">
              {t('no_body_photos_title')}
            </Text>
            <Text className="text-xs text-text-muted text-center px-4 leading-4">
              {t('no_body_photos_desc')}
            </Text>
            <Pressable
              onPress={handlePickFromGallery}
              className="mt-2 bg-accent/20 px-4 py-2 rounded-xl border border-accent/40 active:opacity-70"
            >
              <Text className="text-xs font-bold text-accent">{t('upload_photo_btn')}</Text>
            </Pressable>
          </Card>
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {photos.map((item) => {
              const dtInfo = formatPhotoDateTime(item.date, item.time, lang);
              return (
                <Pressable
                  key={item.clientUuid}
                  onPress={() => setSelectedPhoto(item)}
                  style={{ width: COLUMN_WIDTH }}
                  className="rounded-2xl bg-bg-surface border border-white/5 overflow-hidden active:opacity-85 shadow-sm"
                >
                  <View style={{ height: COLUMN_WIDTH * 1.3 }} className="w-full bg-bg-elevated">
                    <Image
                      source={{ uri: item.photoUri }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                    {/* Açı Rozeti */}
                    <View className="absolute top-2 left-2 rounded-md bg-black/65 px-2 py-0.5">
                      <Text className="text-[9px] font-bold text-white">
                        {getPhotoTypeLabel(item.photoType, t)}
                      </Text>
                    </View>

                    {/* Kilo Rozeti */}
                    {item.weightKg != null && (
                      <View className="absolute bottom-2 left-2 rounded-md bg-accent/90 px-2 py-0.5">
                        <Text className="text-[10px] font-extrabold text-[#0B0F14]">
                          {item.weightKg} kg
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Alt Bilgi - Gün & Saat Logu */}
                  <View className="p-2.5 gap-0.5">
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="time-outline" size={11} color={colors.accent} />
                      <Text className="text-xs font-bold text-text-primary" numberOfLines={1}>
                        {dtInfo.fullLabel}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-text-muted">
                      {item.periodType === 'daily'
                        ? t('period_daily_label')
                        : item.periodType === 'weekly'
                          ? t('period_weekly_label')
                          : t('period_monthly_label')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Fotoğraf Ekleme & Açı Seçme Modalı */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/80">
          <View className="rounded-t-3xl bg-bg-surface p-lg border-t border-white/10 gap-md">
            <View className="flex-row items-center justify-between pb-2 border-b border-bg-elevated">
              <View className="flex-row items-center gap-2">
                <Ionicons name="camera" size={18} color={colors.accent} />
                <Text className="text-base font-bold text-text-primary">
                  {t('body_photo_modal_title')}
                </Text>
              </View>
              <Pressable onPress={() => setAddModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Seçilen Fotoğraf Önizlemesi */}
            {pickedImageUri && (
              <View className="h-44 w-full rounded-2xl bg-bg-elevated overflow-hidden items-center justify-center border border-white/10">
                <Image
                  source={{ uri: pickedImageUri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              </View>
            )}

            {/* Tarih & Saat Logu Bilgisi */}
            <View className="flex-row items-center justify-between bg-bg-elevated/70 px-3 py-2 rounded-xl border border-white/5">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="time-outline" size={14} color={colors.accent} />
                <Text className="text-[11px] text-text-muted">{t('logged_timestamp_label')}</Text>
              </View>
              <Text className="text-[11px] font-bold text-accent">
                {formatPhotoDateTime(dateKey(new Date()), null, lang).dateLabel} · {new Date().toLocaleTimeString(lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            {/* Açı Seçimi */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {t('photo_angle_label')}
              </Text>
              <View className="flex-row gap-2">
                {[
                  { key: 'front', label: t('photo_angle_front') },
                  { key: 'side', label: t('photo_angle_side') },
                  { key: 'back', label: t('photo_angle_back') },
                ].map((opt) => (
                  <Pressable
                    key={opt.key}
                    onPress={() => setPhotoType(opt.key as any)}
                    className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                      photoType === opt.key
                        ? 'bg-accent/20 border-accent'
                        : 'bg-bg-elevated border-white/5'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        photoType === opt.key ? 'text-accent' : 'text-text-muted'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Takip Dönemi (Günlük / Haftalık / Aylık) */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {t('tracking_period_label')}
              </Text>
              <View className="flex-row gap-2">
                {[
                  { key: 'daily', label: t('period_daily_label') },
                  { key: 'weekly', label: t('period_weekly_checkin') },
                  { key: 'monthly', label: t('period_monthly_checkin') },
                ].map((opt) => (
                  <Pressable
                    key={opt.key}
                    onPress={() => setPeriodType(opt.key as any)}
                    className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                      periodType === opt.key
                        ? 'bg-accent/20 border-accent'
                        : 'bg-bg-elevated border-white/5'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        periodType === opt.key ? 'text-accent' : 'text-text-muted'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Kilo Girişi */}
            <View className="gap-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {t('bodyweight_at_photo')}
              </Text>
              <TextInput
                keyboardType="decimal-pad"
                value={weightInput}
                onChangeText={setWeightInput}
                placeholder="78.5"
                placeholderTextColor={colors.textMuted}
                className="h-11 rounded-xl bg-bg-elevated px-3 text-sm font-bold text-text-primary border border-white/5"
              />
            </View>

            {/* Kaydet Butonu */}
            <View className="pt-2 gap-2">
              <Pressable
                onPress={handleSavePhoto}
                disabled={saving}
                className="bg-accent py-3.5 rounded-2xl items-center justify-center active:opacity-85 shadow-md shadow-accent/25"
              >
                <Text className="text-base font-bold text-bg-primary">
                  {saving ? t('saving_photo') : t('save_body_photo_btn')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Büyük Önizleme & Detay Modalı */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <View className="flex-1 bg-black/95 justify-between p-lg" style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}>
          {/* Üst Bar */}
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-bold text-white">
                {selectedPhoto ? formatPhotoDateTime(selectedPhoto.date, selectedPhoto.time, lang).fullLabel : ''}
              </Text>
              <Text className="text-xs text-text-muted">
                {selectedPhoto ? getPhotoTypeLabel(selectedPhoto.photoType, t) : ''} ·{' '}
                {selectedPhoto?.periodType === 'daily'
                  ? t('period_daily_label')
                  : selectedPhoto?.periodType === 'weekly'
                    ? t('period_weekly_label')
                    : t('period_monthly_label')}
              </Text>
            </View>

            <Pressable
              onPress={() => setSelectedPhoto(null)}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/10 active:opacity-70"
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </Pressable>
          </View>

          {/* Görsel */}
          {selectedPhoto && (
            <View className="flex-1 my-4 items-center justify-center">
              <Image
                source={{ uri: selectedPhoto.photoUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
              />
            </View>
          )}

          {/* Alt Aksiyonlar */}
          <View className="gap-2">
            {selectedPhoto?.weightKg != null && (
              <View className="flex-row items-center justify-center gap-1.5 py-1">
                <Text className="text-xs text-text-muted">{t('weight_on_date')}</Text>
                <Text className="text-sm font-extrabold text-accent">{selectedPhoto.weightKg} kg</Text>
              </View>
            )}

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => {
                  setSelectedPhoto(null);
                  router.push('/transformation-card');
                }}
                className="flex-1 py-3 bg-accent rounded-xl items-center justify-center flex-row gap-1.5 active:opacity-85"
              >
                <Ionicons name="share-social-outline" size={17} color="#0B0F14" />
                <Text className="text-xs font-bold text-bg-primary">{t('make_transformation_card_btn')}</Text>
              </Pressable>

              <Pressable
                onPress={() => selectedPhoto && setDeleteTarget(selectedPhoto)}
                className="py-3 px-4 bg-danger/20 border border-danger/40 rounded-xl items-center justify-center flex-row gap-1 active:opacity-70"
              >
                <Ionicons name="trash-outline" size={17} color={colors.danger} />
                <Text className="text-xs font-bold text-danger">{t('delete')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Silme Onay Modalı */}
      <ModernConfirmModal
        visible={!!deleteTarget}
        title={t('delete_body_photo_title')}
        description={t('delete_body_photo_desc')}
        icon="trash-outline"
        confirmText={t('delete')}
        cancelText={t('cancel')}
        isDestructive
        onConfirm={confirmDeletePhoto}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}
