import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import { Button, Card, Input, ModernConfirmModal } from '../src/components/ui';
import { colors } from '../src/constants/theme';
import {
  deleteBodyMeasurement,
  getBodyMeasurementsHistory,
  getBodyMetricTrend,
  saveBodyMeasurement,
  type BodyMeasurement,
  type BodyMetricKey,
  type MetricTrendSummary,
} from '../src/db/bodyMeasurements';
import { dateKey } from '../src/lib/calculations';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useLanguageStore } from '../src/stores/useLanguageStore';

function formatDateLabel(dateStr: string, lang: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const localeMap: Record<string, string> = {
    tr: 'tr-TR',
    en: 'en-US',
    de: 'de-DE',
    es: 'es-ES',
  };
  return d.toLocaleDateString(localeMap[lang] || 'tr-TR', { day: 'numeric', month: 'short' });
}

function formatFullDate(dateStr: string, lang: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const localeMap: Record<string, string> = {
    tr: 'tr-TR',
    en: 'en-US',
    de: 'de-DE',
    es: 'es-ES',
  };
  return d.toLocaleDateString(localeMap[lang] || 'tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const METRIC_CONFIGS: {
  key: BodyMetricKey;
  labelKey: any;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'armRightCm', labelKey: 'arm_right', icon: 'barbell-outline' },
  { key: 'armLeftCm', labelKey: 'arm_left', icon: 'barbell-outline' },
  { key: 'chestCm', labelKey: 'chest', icon: 'shirt-outline' },
  { key: 'waistCm', labelKey: 'waist', icon: 'body-outline' },
  { key: 'hipCm', labelKey: 'hips', icon: 'fitness-outline' },
  { key: 'thighCm', labelKey: 'thigh', icon: 'walk-outline' },
  { key: 'calfCm', labelKey: 'calf', icon: 'footsteps-outline' },
  { key: 'shoulderCm', labelKey: 'shoulder', icon: 'shield-outline' },
  { key: 'forearmCm', labelKey: 'forearm', icon: 'hand-left-outline' },
  { key: 'neckCm', labelKey: 'neck', icon: 'happy-outline' },
];

export default function BodyMeasurementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const [selectedMetric, setSelectedMetric] = useState<BodyMetricKey>('armRightCm');
  const [trend, setTrend] = useState<MetricTrendSummary | null>(null);
  const [history, setHistory] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Modal Durumu
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const todayKey = dateKey(new Date());
  const [formDate, setFormDate] = useState<string>(todayKey);
  const [formArmRight, setFormArmRight] = useState('');
  const [formArmLeft, setFormArmLeft] = useState('');
  const [formChest, setFormChest] = useState('');
  const [formWaist, setFormWaist] = useState('');
  const [formHip, setFormHip] = useState('');
  const [formThigh, setFormThigh] = useState('');
  const [formCalf, setFormCalf] = useState('');
  const [formShoulder, setFormShoulder] = useState('');
  const [formForearm, setFormForearm] = useState('');
  const [formNeck, setFormNeck] = useState('');

  // Silme Onay Modalı
  const [deleteTarget, setDeleteTarget] = useState<{ clientUuid: string; dateStr: string } | null>(
    null
  );

  const loadData = useCallback(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([
      getBodyMetricTrend(userId, selectedMetric),
      getBodyMeasurementsHistory(userId, 50),
    ])
      .then(([trendData, historyData]) => {
        setTrend(trendData);
        setHistory(historyData);
        if (trendData.points.length > 0) {
          setSelectedDate(trendData.points[trendData.points.length - 1].dateStr);
        }
      })
      .catch((err) => console.error('Ölçüm verisi alınamadı:', err))
      .finally(() => setLoading(false));
  }, [userId, selectedMetric]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddModal = () => {
    setIsEditing(false);
    setFormDate(todayKey);
    setFormArmRight('');
    setFormArmLeft('');
    setFormChest('');
    setFormWaist('');
    setFormHip('');
    setFormThigh('');
    setFormCalf('');
    setFormShoulder('');
    setFormForearm('');
    setFormNeck('');
    setModalVisible(true);
  };

  const openEditModal = (item: BodyMeasurement) => {
    setIsEditing(true);
    setFormDate(item.loggedOn);
    setFormArmRight(item.armRightCm != null ? String(item.armRightCm) : '');
    setFormArmLeft(item.armLeftCm != null ? String(item.armLeftCm) : '');
    setFormChest(item.chestCm != null ? String(item.chestCm) : '');
    setFormWaist(item.waistCm != null ? String(item.waistCm) : '');
    setFormHip(item.hipCm != null ? String(item.hipCm) : '');
    setFormThigh(item.thighCm != null ? String(item.thighCm) : '');
    setFormCalf(item.calfCm != null ? String(item.calfCm) : '');
    setFormShoulder(item.shoulderCm != null ? String(item.shoulderCm) : '');
    setFormForearm(item.forearmCm != null ? String(item.forearmCm) : '');
    setFormNeck(item.neckCm != null ? String(item.neckCm) : '');
    setModalVisible(true);
  };

  const parseNumOrNull = (str: string): number | null => {
    const trimmed = str.trim().replace(',', '.');
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) && n > 0 && n < 300 ? n : null;
  };

  const handleSave = async () => {
    if (!userId) return;

    const armRight = parseNumOrNull(formArmRight);
    const armLeft = parseNumOrNull(formArmLeft);
    const chest = parseNumOrNull(formChest);
    const waist = parseNumOrNull(formWaist);
    const hip = parseNumOrNull(formHip);
    const thigh = parseNumOrNull(formThigh);
    const calf = parseNumOrNull(formCalf);
    const shoulder = parseNumOrNull(formShoulder);
    const forearm = parseNumOrNull(formForearm);
    const neck = parseNumOrNull(formNeck);

    const hasAny =
      armRight != null ||
      armLeft != null ||
      chest != null ||
      waist != null ||
      hip != null ||
      thigh != null ||
      calf != null ||
      shoulder != null ||
      forearm != null ||
      neck != null;

    if (!hasAny) {
      Alert.alert(t('warning'), t('fill_at_least_one_metric'));
      return;
    }

    try {
      setSaving(true);
      await saveBodyMeasurement(userId, {
        loggedOn: formDate,
        armRightCm: armRight,
        armLeftCm: armLeft,
        chestCm: chest,
        waistCm: waist,
        hipCm: hip,
        thighCm: thigh,
        calfCm: calf,
        shoulderCm: shoulder,
        forearmCm: forearm,
        neckCm: neck,
      });

      setModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert(t('error'), err?.message || 'Kayıt başarısız oldu.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteBodyMeasurement(target.clientUuid);
      loadData();
    } catch (err: any) {
      Alert.alert(t('error'), err?.message || 'Silinemedi.');
    }
  };

  const activeConfig = METRIC_CONFIGS.find((m) => m.key === selectedMetric)!;
  const minValue = trend?.minValue ?? 20;
  const maxValue = trend?.maxValue ?? 100;
  const range = Math.max(1, maxValue - minValue);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-primary"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        className="flex-1 px-lg"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
      >
        {/* Üst Bar */}
        <View className="mb-sm flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-text-primary">
              {t('body_measurements_title')}
            </Text>
            <Text className="text-xs text-text-muted">{t('body_measurements_desc')}</Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-bg-card active:opacity-70"
          >
            <Text className="text-xl text-text-muted">×</Text>
          </Pressable>
        </View>

        {/* Sekme Geçişi: Kilo Takibi <-> Vücut Ölçüleri */}
        <View className="flex-row rounded-xl bg-bg-card p-1 mb-md border border-white/5">
          <Pressable
            onPress={() => router.replace('/weight-trend')}
            className="flex-1 py-2 items-center rounded-lg active:opacity-70"
          >
            <Text className="text-xs font-semibold text-text-muted">
              {t('weight_tracking_header')}
            </Text>
          </Pressable>
          <Pressable className="flex-1 py-2 items-center rounded-lg bg-bg-elevated shadow-sm border border-accent/20">
            <Text className="text-xs font-bold text-accent">{t('body_measurements_title')}</Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Bölge Seçim Çipleri (Yatay Kaydırılabilir) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {METRIC_CONFIGS.map((cfg) => {
              const isSelected = cfg.key === selectedMetric;
              return (
                <Pressable
                  key={cfg.key}
                  onPress={() => setSelectedMetric(cfg.key)}
                  className={`flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-full border ${
                    isSelected
                      ? 'bg-accent/15 border-accent'
                      : 'bg-bg-card border-white/5 active:bg-bg-elevated'
                  }`}
                >
                  <Ionicons
                    name={cfg.icon}
                    size={14}
                    color={isSelected ? colors.accent : colors.textMuted}
                  />
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-accent' : 'text-text-muted'
                    }`}
                  >
                    {t(cfg.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* İstatistikler Kartı */}
          <Card className="flex-row items-center justify-between p-md">
            <View className="items-center flex-1">
              <Text className="text-2xl font-black text-text-primary">
                {trend?.latestValue != null ? `${trend.latestValue} cm` : '—'}
              </Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                {t('latest_measurement')} ({t(activeConfig.labelKey)})
              </Text>
            </View>
            <View className="h-8 w-[1px] bg-bg-elevated" />
            <View className="items-center flex-1">
              <Text
                className={`text-xl font-bold ${
                  trend?.changeCm != null
                    ? trend.changeCm > 0
                      ? 'text-accent'
                      : trend.changeCm < 0
                      ? 'text-warning'
                      : 'text-text-primary'
                    : 'text-text-muted'
                }`}
              >
                {trend?.changeCm != null
                  ? `${trend.changeCm > 0 ? '+' : ''}${trend.changeCm} cm`
                  : '—'}
              </Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                {t('difference_label')}
              </Text>
            </View>
            <View className="h-8 w-[1px] bg-bg-elevated" />
            <View className="items-center flex-1">
              <Text className="text-xl font-bold text-accent">
                {trend ? trend.points.length : 0}
              </Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                Kayıt Sayısı
              </Text>
            </View>
          </Card>

          {/* Gelişim Grafiği Kartı */}
          <Card className="gap-md">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name={activeConfig.icon} size={16} color={colors.accent} />
                <Text className="text-xs uppercase font-bold tracking-wider text-text-muted">
                  {t(activeConfig.labelKey)} {t('progress_trend_label')}
                </Text>
              </View>
              <Text className="text-[11px] font-medium text-accent">
                {trend?.points.length || 0} Nokta
              </Text>
            </View>

            {loading ? (
              <View className="h-44 items-center justify-center">
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : !trend || trend.points.length === 0 ? (
              <View className="h-36 items-center justify-center gap-2">
                <Ionicons name="bar-chart-outline" size={32} color={colors.textMuted} />
                <Text className="text-xs text-text-muted text-center">
                  Bu bölge için henüz kaydedilmiş ölçüm bulunmuyor.
                </Text>
              </View>
            ) : (
              <View className="h-56 pt-sm">
                {/* Grafik çubukları */}
                <View className="flex-1 flex-row items-end justify-between gap-1 pb-2 border-b border-bg-elevated">
                  {trend.points.map((pt, idx) => {
                    const heightRatio = (pt.value - minValue) / range;
                    const isLast = idx === trend.points.length - 1;
                    const isSelected = pt.dateStr === selectedDate;
                    const showBadge = isSelected || (isLast && !selectedDate);

                    return (
                      <Pressable
                        key={pt.dateStr + idx}
                        onPress={() => setSelectedDate(pt.dateStr)}
                        className="flex-1 items-center justify-end h-full"
                      >
                        {/* Çubuğun tepesindeki net ölçü etiketi */}
                        {showBadge && (
                          <View
                            pointerEvents="none"
                            style={{
                              position: 'absolute',
                              bottom: `${Math.min(84, Math.max(14, heightRatio * 100)) + 6}%`,
                              alignItems: 'center',
                              zIndex: 30,
                            }}
                          >
                            <View
                              className={`rounded px-1.5 py-0.5 shadow-sm ${
                                isLast
                                  ? 'bg-accent border border-accent'
                                  : 'bg-bg-elevated border border-accent/40'
                              }`}
                            >
                              <Text
                                className={`text-[9px] font-extrabold leading-none ${
                                  isLast ? 'text-[#0B0F14]' : 'text-accent'
                                }`}
                              >
                                {pt.value} cm
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Ölçü Çubuğu */}
                        <View
                          className={`w-full max-w-[20px] rounded-t-sm ${
                            isLast
                              ? 'bg-accent'
                              : isSelected
                              ? 'bg-accent/80'
                              : 'bg-bg-elevated'
                          }`}
                          style={{
                            height: `${Math.min(88, Math.max(10, heightRatio * 100))}%`,
                          }}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                {/* X Ekseni Tarihleri */}
                <View className="flex-row justify-between pt-1.5">
                  {trend.points.length > 0 && (
                    <Text className="text-[10px] text-text-muted">
                      {formatDateLabel(trend.points[0].dateStr, language)}
                    </Text>
                  )}
                  {trend.points.length > 2 && (
                    <Text className="text-[10px] text-text-muted">
                      {formatDateLabel(
                        trend.points[Math.floor(trend.points.length / 2)].dateStr,
                        language
                      )}
                    </Text>
                  )}
                  {trend.points.length > 1 && (
                    <Text className="text-[10px] text-text-muted">
                      {formatDateLabel(
                        trend.points[trend.points.length - 1].dateStr,
                        language
                      )}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </Card>

          {/* Yeni Ölçü Ekleme Butonu */}
          <Button
            label={`+ ${t('add_measurement')}`}
            variant="primary"
            onPress={openAddModal}
            className="w-full"
          />

          {/* Geçmiş Ölçümler Listesi */}
          <View className="gap-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs uppercase font-bold tracking-wider text-text-muted">
                {t('measurements_history')} ({history.length})
              </Text>
            </View>

            {history.length === 0 ? (
              <Card className="items-center justify-center p-lg">
                <Text className="text-xs text-text-muted">{t('no_measurements_yet')}</Text>
              </Card>
            ) : (
              history.map((item) => (
                <Card key={item.clientUuid} className="gap-sm p-md">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="calendar-outline" size={16} color={colors.accent} />
                      <Text className="text-sm font-bold text-text-primary">
                        {formatFullDate(item.loggedOn, language)}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Pressable
                        onPress={() => openEditModal(item)}
                        className="px-2.5 py-1 rounded-md bg-bg-elevated active:opacity-60"
                      >
                        <Text className="text-xs font-semibold text-accent">{t('edit')}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          setDeleteTarget({
                            clientUuid: item.clientUuid,
                            dateStr: item.loggedOn,
                          })
                        }
                        className="px-2.5 py-1 rounded-md bg-danger/10 active:opacity-60"
                      >
                        <Text className="text-xs font-semibold text-danger">{t('delete')}</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Ölçüm Değerleri Çipleri */}
                  <View className="flex-row flex-wrap gap-1.5 pt-1">
                    {item.armRightCm != null && (
                      <View className="rounded-lg bg-bg-elevated px-2 py-1 flex-row items-center gap-1 border border-white/5">
                        <Text className="text-[11px] text-text-muted">{t('arm_right')}:</Text>
                        <Text className="text-[11px] font-bold text-text-primary">
                          {item.armRightCm} cm
                        </Text>
                      </View>
                    )}
                    {item.armLeftCm != null && (
                      <View className="rounded-lg bg-bg-elevated px-2 py-1 flex-row items-center gap-1 border border-white/5">
                        <Text className="text-[11px] text-text-muted">{t('arm_left')}:</Text>
                        <Text className="text-[11px] font-bold text-text-primary">
                          {item.armLeftCm} cm
                        </Text>
                      </View>
                    )}
                    {item.chestCm != null && (
                      <View className="rounded-lg bg-bg-elevated px-2 py-1 flex-row items-center gap-1 border border-white/5">
                        <Text className="text-[11px] text-text-muted">{t('chest')}:</Text>
                        <Text className="text-[11px] font-bold text-text-primary">
                          {item.chestCm} cm
                        </Text>
                      </View>
                    )}
                    {item.waistCm != null && (
                      <View className="rounded-lg bg-bg-elevated px-2 py-1 flex-row items-center gap-1 border border-white/5">
                        <Text className="text-[11px] text-text-muted">{t('waist')}:</Text>
                        <Text className="text-[11px] font-bold text-text-primary">
                          {item.waistCm} cm
                        </Text>
                      </View>
                    )}
                    {item.hipCm != null && (
                      <View className="rounded-lg bg-bg-elevated px-2 py-1 flex-row items-center gap-1 border border-white/5">
                        <Text className="text-[11px] text-text-muted">{t('hips')}:</Text>
                        <Text className="text-[11px] font-bold text-text-primary">
                          {item.hipCm} cm
                        </Text>
                      </View>
                    )}
                    {item.thighCm != null && (
                      <View className="rounded-lg bg-bg-elevated px-2 py-1 flex-row items-center gap-1 border border-white/5">
                        <Text className="text-[11px] text-text-muted">{t('thigh')}:</Text>
                        <Text className="text-[11px] font-bold text-text-primary">
                          {item.thighCm} cm
                        </Text>
                      </View>
                    )}
                    {item.calfCm != null && (
                      <View className="rounded-lg bg-bg-elevated px-2 py-1 flex-row items-center gap-1 border border-white/5">
                        <Text className="text-[11px] text-text-muted">{t('calf')}:</Text>
                        <Text className="text-[11px] font-bold text-text-primary">
                          {item.calfCm} cm
                        </Text>
                      </View>
                    )}
                    {item.shoulderCm != null && (
                      <View className="rounded-lg bg-bg-elevated px-2 py-1 flex-row items-center gap-1 border border-white/5">
                        <Text className="text-[11px] text-text-muted">{t('shoulder')}:</Text>
                        <Text className="text-[11px] font-bold text-text-primary">
                          {item.shoulderCm} cm
                        </Text>
                      </View>
                    )}
                    {item.forearmCm != null && (
                      <View className="rounded-lg bg-bg-elevated px-2 py-1 flex-row items-center gap-1 border border-white/5">
                        <Text className="text-[11px] text-text-muted">{t('forearm')}:</Text>
                        <Text className="text-[11px] font-bold text-text-primary">
                          {item.forearmCm} cm
                        </Text>
                      </View>
                    )}
                    {item.neckCm != null && (
                      <View className="rounded-lg bg-bg-elevated px-2 py-1 flex-row items-center gap-1 border border-white/5">
                        <Text className="text-[11px] text-text-muted">{t('neck')}:</Text>
                        <Text className="text-[11px] font-bold text-text-primary">
                          {item.neckCm} cm
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              ))
            )}
          </View>
        </ScrollView>

        {/* Ekleme / Düzenleme Modalı */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            className="flex-1 bg-bg-primary"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View
              className="flex-1 px-lg"
              style={{ paddingTop: Platform.OS === 'ios' ? 24 : insets.top + 16 }}
            >
              {/* Modal Başlık */}
              <View className="flex-row items-center justify-between pb-md border-b border-bg-elevated">
                <Text className="text-lg font-bold text-text-primary">
                  {isEditing ? t('edit_measurement') : t('add_measurement')}
                </Text>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-bg-card active:opacity-70"
                >
                  <Text className="text-lg text-text-muted">×</Text>
                </Pressable>
              </View>

              <ScrollView
                className="flex-1 pt-md"
                contentContainerStyle={{ gap: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Tarih Seçimi */}
                <View className="gap-1.5">
                  <Text className="text-xs font-semibold text-text-muted">
                    {t('measurement_date')} (YYYY-MM-DD)
                  </Text>
                  <Input
                    value={formDate}
                    onChangeText={setFormDate}
                    placeholder="YYYY-MM-DD"
                    className="w-full"
                  />
                </View>

                <Text className="text-xs uppercase font-bold text-text-muted tracking-wider mt-2">
                  Bölge Ölçüleri (cm)
                </Text>

                {/* 2 Kolonlu Ölçü Giriş Formu */}
                <View className="flex-row gap-3">
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-semibold text-text-primary">
                      {t('arm_right')} (cm)
                    </Text>
                    <Input
                      value={formArmRight}
                      onChangeText={setFormArmRight}
                      placeholder="Örn: 38.5"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-semibold text-text-primary">
                      {t('arm_left')} (cm)
                    </Text>
                    <Input
                      value={formArmLeft}
                      onChangeText={setFormArmLeft}
                      placeholder="Örn: 38"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-semibold text-text-primary">
                      {t('chest')} (cm)
                    </Text>
                    <Input
                      value={formChest}
                      onChangeText={setFormChest}
                      placeholder="Örn: 104"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-semibold text-text-primary">
                      {t('waist')} (cm)
                    </Text>
                    <Input
                      value={formWaist}
                      onChangeText={setFormWaist}
                      placeholder="Örn: 82"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-semibold text-text-primary">
                      {t('hips')} (cm)
                    </Text>
                    <Input
                      value={formHip}
                      onChangeText={setFormHip}
                      placeholder="Örn: 98"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-semibold text-text-primary">
                      {t('thigh')} (cm)
                    </Text>
                    <Input
                      value={formThigh}
                      onChangeText={setFormThigh}
                      placeholder="Örn: 60"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-semibold text-text-primary">
                      {t('calf')} (cm)
                    </Text>
                    <Input
                      value={formCalf}
                      onChangeText={setFormCalf}
                      placeholder="Örn: 39"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-semibold text-text-primary">
                      {t('shoulder')} (cm)
                    </Text>
                    <Input
                      value={formShoulder}
                      onChangeText={setFormShoulder}
                      placeholder="Örn: 122"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-semibold text-text-primary">
                      {t('forearm')} (cm)
                    </Text>
                    <Input
                      value={formForearm}
                      onChangeText={setFormForearm}
                      placeholder="Örn: 32"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-semibold text-text-primary">
                      {t('neck')} (cm)
                    </Text>
                    <Input
                      value={formNeck}
                      onChangeText={setFormNeck}
                      placeholder="Örn: 40"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Butonlar */}
                <View className="pt-md gap-sm">
                  <Button
                    label={saving ? '…' : t('save')}
                    variant="primary"
                    onPress={handleSave}
                    disabled={saving}
                  />
                  <Button
                    label={t('cancel')}
                    variant="secondary"
                    onPress={() => setModalVisible(false)}
                    disabled={saving}
                  />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Silme Onay Modalı */}
        <ModernConfirmModal
          visible={!!deleteTarget}
          title={t('delete_measurement_title')}
          description={`${deleteTarget?.dateStr || ''} ${t('delete_measurement_confirm')}`}
          confirmText={t('delete')}
          cancelText={t('cancel')}
          isDestructive
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
