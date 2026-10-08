import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { colors } from '../src/constants/theme';
import { getBodyWeightTrend, type WeightTrendSummary } from '../src/db/bodyWeight';
import { getLifetimeStats, type LifetimeStats } from '../src/db/profileStats';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useLanguageStore } from '../src/stores/useLanguageStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type CardFormat = 'story' | 'post'; // 9:16 or 1:1
type CardLayout = 'side_by_side' | 'stacked';

const ACCENT_OPTIONS = [
  { key: 'emerald', color: '#4ADE80', name: 'Zümrüt' },
  { key: 'gold', color: '#F59E0B', name: 'Altın' },
  { key: 'cyan', color: '#38BDF8', name: 'Siyan' },
  { key: 'crimson', color: '#F87171', name: 'Kızıl' },
];

export default function TransformationCardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);
  const session = useAuthStore((s) => s.session);

  const cardRef = useRef<View>(null);

  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [format, setFormat] = useState<CardFormat>('story');
  const [layout, setLayout] = useState<CardLayout>('side_by_side');
  const [selectedAccent, setSelectedAccent] = useState(ACCENT_OPTIONS[0]);

  const [weightTrend, setWeightTrend] = useState<WeightTrendSummary | null>(null);
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    getBodyWeightTrend(userId).then(setWeightTrend).catch(() => {});
    getLifetimeStats(userId).then(setLifetimeStats).catch(() => {});
  }, [session?.user?.id]);

  const handlePickPhoto = async (target: 'before' | 'after') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('gallery_permission_required'), t('gallery_permission_desc'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (target === 'before') {
          setBeforeImage(result.assets[0].uri);
        } else {
          setAfterImage(result.assets[0].uri);
        }
      }
    } catch (err: any) {
      console.error('[TransformationCard] Fotoğraf seçme hatası:', err);
      Alert.alert(t('error'), 'Fotoğraf seçilemedi.');
    }
  };

  const handleShareCard = async () => {
    if (!cardRef.current) return;
    setIsSharing(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Powerform Dönüşüm Kartını Paylaş',
          UTI: 'public.png',
        });
      } else {
        Alert.alert(t('success'), 'Kart görseli oluşturuldu.');
      }
    } catch (err: any) {
      console.error('[TransformationCard] Paylaşım hatası:', err);
      Alert.alert(t('error'), err?.message || 'Görsel paylaşılamadı.');
    } finally {
      setIsSharing(false);
    }
  };

  // Compute stat highlights
  const pointsWithWeight = weightTrend?.points.filter((p) => p.weightKg !== null) ?? [];
  const firstW = pointsWithWeight.length > 0 ? pointsWithWeight[0].weightKg! : 80;
  const curW =
    weightTrend?.currentWeight ??
    (pointsWithWeight.length > 0 ? pointsWithWeight[pointsWithWeight.length - 1].weightKg! : firstW);
  const deltaW = Number((curW - firstW).toFixed(1));
  const totalSessions = lifetimeStats?.totalSessions ?? 0;
  const streak = lifetimeStats?.streakDays ?? 0;

  const cardWidth = Math.min(SCREEN_WIDTH - 32, 380);
  const cardHeight = format === 'story' ? cardWidth * (16 / 9) : cardWidth;

  return (
    <View
      className="flex-1 bg-bg-primary"
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 16,
      }}
    >
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-lg pb-sm border-b border-bg-elevated">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-9 w-9 items-center justify-center rounded-full bg-bg-elevated active:opacity-60"
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>

        <View className="items-center">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="trophy" size={16} color={selectedAccent.color} />
            <Text className="text-base font-extrabold text-text-primary">
              {t('transformation_card_title')}
            </Text>
          </View>
          <Text
            className="text-[10px] font-bold tracking-widest uppercase"
            style={{ color: selectedAccent.color }}
          >
            {t('transformation_card_badge')}
          </Text>
        </View>

        <Pressable
          onPress={handleShareCard}
          disabled={isSharing}
          hitSlop={12}
          className="h-9 px-3 flex-row items-center justify-center gap-1.5 rounded-full bg-accent active:opacity-80"
        >
          {isSharing ? (
            <ActivityIndicator size="small" color={colors.bgPrimary} />
          ) : (
            <>
              <Ionicons name="share-social" size={15} color={colors.bgPrimary} />
              <Text className="text-xs font-bold text-bg-primary">Paylaş</Text>
            </>
          )}
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-md"
        contentContainerStyle={{ paddingVertical: 14, gap: 14, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {/* Controls Bar: Format, Layout, Color */}
        <View className="w-full gap-2.5">
          {/* Format & Layout Row */}
          <View className="flex-row gap-2">
            {/* Format: Story vs Post */}
            <View
              className="flex-1 flex-row p-1 rounded-xl"
              style={{
                backgroundColor: 'rgba(21, 27, 35, 0.6)',
                borderWidth: 1,
                borderColor: '#1C2430',
              }}
            >
              <Pressable
                onPress={() => setFormat('story')}
                className="flex-1 py-1.5 rounded-lg items-center justify-center"
                style={{
                  backgroundColor: format === 'story' ? colors.bgSurface : 'transparent',
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{
                    color: format === 'story' ? colors.accent : colors.textMuted,
                  }}
                >
                  {t('format_story')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setFormat('post')}
                className="flex-1 py-1.5 rounded-lg items-center justify-center"
                style={{
                  backgroundColor: format === 'post' ? colors.bgSurface : 'transparent',
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{
                    color: format === 'post' ? colors.accent : colors.textMuted,
                  }}
                >
                  {t('format_post')}
                </Text>
              </Pressable>
            </View>

            {/* Layout: Side by Side vs Stacked */}
            <View
              className="flex-1 flex-row p-1 rounded-xl"
              style={{
                backgroundColor: 'rgba(21, 27, 35, 0.6)',
                borderWidth: 1,
                borderColor: '#1C2430',
              }}
            >
              <Pressable
                onPress={() => setLayout('side_by_side')}
                className="flex-1 py-1.5 rounded-lg items-center justify-center"
                style={{
                  backgroundColor: layout === 'side_by_side' ? colors.bgSurface : 'transparent',
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{
                    color: layout === 'side_by_side' ? colors.accent : colors.textMuted,
                  }}
                >
                  {t('layout_side_by_side')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setLayout('stacked')}
                className="flex-1 py-1.5 rounded-lg items-center justify-center"
                style={{
                  backgroundColor: layout === 'stacked' ? colors.bgSurface : 'transparent',
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{
                    color: layout === 'stacked' ? colors.accent : colors.textMuted,
                  }}
                >
                  {t('layout_stacked')}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Color & Photo Action Row */}
          <View className="flex-row items-center justify-between">
            {/* Color Accent Picker */}
            <View className="flex-row items-center gap-2">
              {ACCENT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setSelectedAccent(opt)}
                  className="h-7 w-7 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: opt.color,
                    borderWidth: 2,
                    borderColor: selectedAccent.key === opt.key ? '#FFFFFF' : 'transparent',
                  }}
                >
                  {selectedAccent.key === opt.key && (
                    <Ionicons name="checkmark" size={14} color="#0B0F14" />
                  )}
                </Pressable>
              ))}
            </View>

            {/* Photo Picker Quick Buttons */}
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => handlePickPhoto('before')}
                className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg"
                style={{
                  backgroundColor: colors.bgElevated,
                  borderWidth: 1,
                  borderColor: colors.bgElevated,
                }}
              >
                <Ionicons name="image-outline" size={14} color={colors.textPrimary} />
                <Text className="text-xs font-semibold text-text-primary">
                  {beforeImage ? 'Öncesi ✓' : '+ Öncesi'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handlePickPhoto('after')}
                className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg"
                style={{
                  backgroundColor: colors.bgElevated,
                  borderWidth: 1,
                  borderColor: colors.bgElevated,
                }}
              >
                <Ionicons name="image-outline" size={14} color={colors.textPrimary} />
                <Text className="text-xs font-semibold text-text-primary">
                  {afterImage ? 'Sonrası ✓' : '+ Sonrası'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ========================================================
            THE CAPTURABLE CARD VIEW (Exported as Instagram Image)
        ======================================================== */}
        <View
          ref={cardRef}
          collapsable={false}
          style={{
            width: cardWidth,
            height: cardHeight,
            backgroundColor: '#0B0F14',
            borderRadius: 24,
            borderWidth: 2,
            borderColor: selectedAccent.color,
            padding: 16,
            justifyContent: 'space-between',
            overflow: 'hidden',
          }}
        >
          {/* Top Brand Header */}
          <View className="flex-row items-center justify-between pb-2 border-b border-white/10">
            <View className="flex-row items-center gap-2">
              <View
                className="h-8 w-8 rounded-xl items-center justify-center"
                style={{ backgroundColor: `${selectedAccent.color}25` }}
              >
                <Ionicons name="barbell" size={18} color={selectedAccent.color} />
              </View>
              <View>
                <Text className="text-sm font-black tracking-widest text-white uppercase">
                  POWERFORM
                </Text>
                <Text
                  className="text-[9px] font-bold tracking-wider uppercase"
                  style={{ color: selectedAccent.color }}
                >
                  FITNESS TRANSFORMATION
                </Text>
              </View>
            </View>

            <View className="items-end justify-center">
              <View
                className="px-2.5 py-1 rounded-full border"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                }}
              >
                <Text className="text-[10px] font-bold tracking-wider text-white/70 uppercase">
                  {new Date().toLocaleDateString(
                    language === 'tr' ? 'tr-TR' : language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : 'en-US',
                    { month: 'short', year: 'numeric' }
                  )}
                </Text>
              </View>
            </View>
          </View>

          {/* Center Photo Area: Side by Side or Stacked */}
          <View
            className="flex-1 my-2 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: '#151B23',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              flexDirection: layout === 'side_by_side' ? 'row' : 'column',
            }}
          >
            {/* Before Photo */}
            <Pressable
              onPress={() => handlePickPhoto('before')}
              className="flex-1 items-center justify-center overflow-hidden"
              style={{
                position: 'relative',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
              }}
            >
              {beforeImage ? (
                <Image
                  source={{ uri: beforeImage }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <View className="items-center justify-center p-2">
                  <Ionicons name="camera-outline" size={28} color="rgba(255,255,255,0.4)" />
                  <Text className="text-[11px] font-bold text-white/60 mt-1">
                    Öncesi (Before)
                  </Text>
                  <Text className="text-[9px] text-white/40">Fotoğraf Ekle</Text>
                </View>
              )}
              {/* Badge */}
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <Text className="text-[9px] font-black tracking-wider text-white">
                  {t('before_badge')}
                </Text>
              </View>
            </Pressable>

            {/* Middle Divider Badge */}
            <View
              className="items-center justify-center z-10"
              style={
                layout === 'side_by_side'
                  ? {
                      width: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      position: 'relative',
                    }
                  : {
                      height: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      position: 'relative',
                    }
              }
            >
              <View
                style={{
                  position: 'absolute',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 9999,
                  backgroundColor: selectedAccent.color,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                }}
              >
                <Text className="text-[8px] font-black text-black">VS</Text>
              </View>
            </View>

            {/* After Photo */}
            <Pressable
              onPress={() => handlePickPhoto('after')}
              className="flex-1 items-center justify-center overflow-hidden"
              style={{
                position: 'relative',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
              }}
            >
              {afterImage ? (
                <Image
                  source={{ uri: afterImage }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <View className="items-center justify-center p-2">
                  <Ionicons name="camera-outline" size={28} color="rgba(255,255,255,0.4)" />
                  <Text className="text-[11px] font-bold text-white/60 mt-1">
                    Sonrası (After)
                  </Text>
                  <Text className="text-[9px] text-white/40">Fotoğraf Ekle</Text>
                </View>
              )}
              {/* Badge */}
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 9999,
                  backgroundColor: selectedAccent.color,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <Text className="text-[9px] font-black tracking-wider text-black">
                  {t('after_badge')}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Bottom Overlay Stat Badges */}
          <View
            style={{
              gap: 8,
              paddingTop: 4,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Weight & Stats Pills */}
            <View className="flex-row items-center justify-between gap-1.5">
              {/* Weight change */}
              <View
                className="flex-1 p-2 rounded-xl items-center"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Text className="text-[9px] uppercase font-bold text-white/60">Kilo Değişimi</Text>
                <Text
                  className="text-xs font-black mt-0.5"
                  style={{ color: selectedAccent.color }}
                >
                  {firstW} kg ➔ {curW} kg ({deltaW <= 0 ? `${deltaW} kg` : `+${deltaW} kg`})
                </Text>
              </View>

              {/* Workouts / Streak */}
              <View
                className="flex-1 p-2 rounded-xl items-center"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Text className="text-[9px] uppercase font-bold text-white/60">Disiplin</Text>
                <Text className="text-xs font-black text-white mt-0.5">
                  🔥 {streak} Gün Seri · 🏋️ {totalSessions} Seans
                </Text>
              </View>
            </View>

            {/* Motivational Quote & Watermark */}
            <View className="flex-row items-center justify-between pt-0.5">
              <Text className="text-[9px] font-bold text-white/70 italic">
                "{t('transformation_quote')}"
              </Text>
              <View className="flex-row items-center gap-1">
                <Ionicons name="sparkles" size={10} color={selectedAccent.color} />
                <Text
                  className="text-[9px] font-extrabold tracking-wider"
                  style={{ color: selectedAccent.color }}
                >
                  #POWERFORM
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Share Button (Large CTA) */}
        <Pressable
          onPress={handleShareCard}
          disabled={isSharing}
          className="w-full flex-row items-center justify-center gap-2 py-4 rounded-2xl mt-2"
          style={{
            backgroundColor: selectedAccent.color,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          {isSharing ? (
            <ActivityIndicator size="small" color="#0B0F14" />
          ) : (
            <>
              <Ionicons name="logo-instagram" size={20} color="#0B0F14" />
              <Text className="text-base font-extrabold text-[#0B0F14]">
                {t('share_to_instagram')}
              </Text>
            </>
          )}
        </Pressable>

        <Text className="text-xs text-text-muted text-center px-4 pb-4">
          Kart yüksek çözünürlüklü olarak kaydedilir ve sistem paylaşım penceresiyle Instagram Hikayeler, Gönderi veya Galeriye aktarılabilir.
        </Text>
      </ScrollView>
    </View>
  );
}
