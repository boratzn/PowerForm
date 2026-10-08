import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, ModernConfirmModal } from '../src/components/ui';
import { DatePickerModal } from '../src/components/sleep/DatePickerModal';
import { TimePickerModal } from '../src/components/sleep/TimePickerModal';
import { colors } from '../src/constants/theme';
import {
  calculateSleepDurationMinutes,
  deleteSleepRecord,
  formatSleepDuration,
  getRecentSleepLogs,
  getSleepSummary,
  logSleepRecord,
  type SleepChartPoint,
  type SleepLog,
  type SleepPeriodSummary,
} from '../src/db/sleepLogs';
import { dateKey } from '../src/lib/calculations';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useLanguageStore } from '../src/stores/useLanguageStore';

// Tarih görüntüleme yardımcısı
function formatDateDisplay(dateStr: string, lang: string): string {
  const parts = (dateStr || '').split('-');
  if (parts.length < 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const locale = lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-US';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

// Zaman kaydırma yardımcısı (+/- dakika)
function adjustTimeString(timeStr: string, deltaMinutes: number): string {
  const parts = (timeStr || '00:00').split(':');
  let h = parseInt(parts[0], 10) || 0;
  let m = parseInt(parts[1], 10) || 0;

  let total = h * 60 + m + deltaMinutes;
  while (total < 0) total += 24 * 60;
  total = total % (24 * 60);

  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export default function SleepTrackerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const qualityOptions = [
    { value: 1, label: t('sleep_quality_bad'), emoji: '😫' },
    { value: 2, label: t('sleep_quality_poor'), emoji: '🥱' },
    { value: 3, label: t('sleep_quality_fair'), emoji: '😐' },
    { value: 4, label: t('sleep_quality_good'), emoji: '😊' },
    { value: 5, label: t('sleep_quality_great'), emoji: '⚡' },
  ];

  const todayStr = dateKey(new Date());
  const yesterdayStr = dateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  // Görünüm periyodu: Hafta (7 gün) vs Ay (30 gün)
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [summary, setSummary] = useState<SleepPeriodSummary | null>(null);
  const [recentLogs, setRecentLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Grafik üzerinde tıklanan gün
  const [selectedPoint, setSelectedPoint] = useState<SleepChartPoint | null>(null);

  // Uyku Girişi Form State
  const [logDate, setLogDate] = useState<string>(todayStr);
  const [bedtime, setBedtime] = useState<string>('23:00');
  const [wakeTime, setWakeTime] = useState<string>('07:30');
  const [quality, setQuality] = useState<number>(4);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Modal State
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'bedtime' | 'wakeTime'>('bedtime');

  // Silme Modalı State
  const [deleteTargetUuid, setDeleteTargetUuid] = useState<string | null>(null);

  // Canlı hesaplanan uyku süresi
  const liveDurationMinutes = calculateSleepDurationMinutes(bedtime, wakeTime);

  const loadData = useCallback(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      getSleepSummary(userId, period, language),
      getRecentSleepLogs(userId, 30),
    ])
      .then(([summaryRes, recentRes]) => {
        setSummary(summaryRes);
        setRecentLogs(recentRes);
        // Otomatik olarak son verili günü veya bugünü seç
        const lastWithData = [...summaryRes.points].reverse().find((p) => p.hasData);
        if (lastWithData) {
          setSelectedPoint(lastWithData);
        } else if (summaryRes.points.length > 0) {
          setSelectedPoint(summaryRes.points[summaryRes.points.length - 1]);
        }
      })
      .catch((err) => console.error('[SleepTracker] Veri çekme hatası:', err))
      .finally(() => setLoading(false));
  }, [userId, period, language]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Giriş Yap & Kaydet
  const handleSave = async () => {
    if (!userId) return;

    // Format kontrolü (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(bedtime.trim()) || !timeRegex.test(wakeTime.trim())) {
      Alert.alert(t('invalid_time_title'), t('invalid_time_desc'));
      return;
    }

    try {
      setSaving(true);
      await logSleepRecord({
        userId,
        date: logDate,
        bedtime: bedtime.trim(),
        wakeTime: wakeTime.trim(),
        quality,
        notes: notes.trim() || undefined,
      });

      // Formu temizle ve güncelle
      setNotes('');
      loadData();
      Alert.alert(t('success'), `${logDate} ${t('sleep_record_saved')}`);
    } catch (err: any) {
      Alert.alert(t('error'), err?.message || t('error'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetUuid) return;
    const target = deleteTargetUuid;
    setDeleteTargetUuid(null);
    try {
      await deleteSleepRecord(target);
      loadData();
    } catch (err: any) {
      Alert.alert(t('error'), err?.message || t('error'));
    }
  };

  // Zaman ayarlama fonksiyonları
  const adjustBedtime = (minutes: number) => {
    setBedtime((prev) => adjustTimeString(prev, minutes));
  };

  const adjustWakeTime = (minutes: number) => {
    setWakeTime((prev) => adjustTimeString(prev, minutes));
  };

  // 12 Saatlik eksen üzerinden yüzde hesabı
  const MAX_HOURS = 12;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-bg-primary"
    >
      <View
        className="flex-1 px-lg"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
      >
        {/* Üst Bar: Başlık ve Kapatma */}
        <View className="mb-sm flex-row items-center justify-between">
          <View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="moon" size={20} color="#818CF8" />
              <Text className="text-xl font-bold text-text-primary">{t('sleep_recovery_title')}</Text>
            </View>
            <Text className="text-xs text-text-muted mt-0.5">
              {t('circadian_rhythm_subtitle')}
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-bg-card active:opacity-70"
          >
            <Text className="text-xl text-text-muted">✕</Text>
          </Pressable>
        </View>

        {/* Sekme Geçişi: Haftalık <-> Aylık */}
        <View className="flex-row rounded-xl bg-bg-card p-1 mb-md border border-white/5">
          <Pressable
            onPress={() => setPeriod('week')}
            className="flex-1 py-2 items-center rounded-lg active:opacity-75"
            style={{
              backgroundColor: period === 'week' ? colors.bgElevated : 'transparent',
              borderWidth: 1,
              borderColor: period === 'week' ? 'rgba(129, 140, 248, 0.4)' : 'transparent',
            }}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: period === 'week' ? '#818CF8' : colors.textMuted }}
            >
              {t('weekly_last_7_days')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPeriod('month')}
            className="flex-1 py-2 items-center rounded-lg active:opacity-75"
            style={{
              backgroundColor: period === 'month' ? colors.bgElevated : 'transparent',
              borderWidth: 1,
              borderColor: period === 'month' ? 'rgba(129, 140, 248, 0.4)' : 'transparent',
            }}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: period === 'month' ? '#818CF8' : colors.textMuted }}
            >
              {t('monthly_last_30_days')}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
        >
          {/* İstatistik Şeridi */}
          <Card className="flex-row items-center justify-between p-md">
            <View className="items-center flex-1">
              <Text className="text-xl font-bold text-text-primary">
                {summary && summary.avgDurationMinutes > 0
                  ? formatSleepDuration(summary.avgDurationMinutes, language)
                  : '—'}
              </Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                {t('avg_sleep')}
              </Text>
            </View>

            <View className="h-8 w-[1px] bg-bg-elevated" />

            <View className="items-center flex-1">
              <Text className="text-xl font-bold text-[#818CF8]">
                {summary && summary.avgBedtime !== '—'
                  ? `${summary.avgBedtime} → ${summary.avgWakeTime}`
                  : '—'}
              </Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                {t('avg_window')}
              </Text>
            </View>

            <View className="h-8 w-[1px] bg-bg-elevated" />

            <View className="items-center flex-1">
              <Text
                className={`text-xl font-bold ${
                  summary?.recoveryStatus === 'optimal'
                    ? 'text-accent'
                    : summary?.recoveryStatus === 'moderate'
                    ? 'text-warning'
                    : summary?.recoveryStatus === 'insufficient'
                    ? 'text-danger'
                    : 'text-text-muted'
                }`}
              >
                {summary && summary.loggedDaysCount > 0 ? `%${summary.consistencyScore}` : '—'}
              </Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                {t('consistency')}
              </Text>
            </View>
          </Card>

          {/* Uyku Grafiği */}
          <Card className="gap-md">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs uppercase font-bold tracking-wider text-text-muted">
                  {period === 'week' ? t('weekly_sleep_chart') : t('monthly_sleep_trend')}
                </Text>
                <Text className="text-[11px] text-text-muted mt-0.5">
                  {t('target_sleep_range')}
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                <View className="flex-row items-center gap-1">
                  <View className="h-2 w-2 rounded-full bg-accent" />
                  <Text className="text-[10px] text-text-muted">{t('optimal_legend')}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="h-2 w-2 rounded-full bg-warning" />
                  <Text className="text-[10px] text-text-muted">&lt;7h</Text>
                </View>
              </View>
            </View>

            {loading ? (
              <View className="h-48 items-center justify-center">
                <ActivityIndicator color="#818CF8" />
              </View>
            ) : !summary || summary.points.length === 0 ? (
              <View className="h-36 items-center justify-center">
                <Text className="text-xs text-text-muted">{t('no_sleep_data_yet')}</Text>
              </View>
            ) : (
              <View className="h-52 pt-sm">
                {/* 7-9 Saat Hedef Bölgesi Kılavuz Çizgileri */}
                <View
                  pointerEvents="none"
                  className="absolute inset-x-0 border-t border-b border-accent/20 bg-accent/5"
                  style={{
                    bottom: `${(7 / MAX_HOURS) * 100}%`,
                    height: `${(2 / MAX_HOURS) * 100}%`,
                    zIndex: 0,
                  }}
                >
                  <Text className="absolute right-1 top-0 text-[8px] font-bold text-accent/60">
                    9h
                  </Text>
                  <Text className="absolute right-1 bottom-0 text-[8px] font-bold text-accent/60">
                    7h
                  </Text>
                </View>

                {/* Çubuklar */}
                <View className="flex-1 flex-row items-end justify-between gap-1 pb-2 border-b border-bg-elevated z-10">
                  {summary.points.map((pt) => {
                    const isSelected = selectedPoint?.date === pt.date;
                    const heightPercent = Math.min(
                      100,
                      Math.max(6, (pt.durationHours / MAX_HOURS) * 100)
                    );
                    const isOptimal = pt.durationHours >= 7 && pt.durationHours <= 9;
                    const isShort = pt.durationHours > 0 && pt.durationHours < 7;
                    const isLong = pt.durationHours > 9;

                    let barBgColor: string = colors.bgElevated;
                    if (pt.hasData) {
                      if (isOptimal) barBgColor = isSelected ? colors.accent : 'rgba(74, 222, 128, 0.85)';
                      else if (isShort) barBgColor = isSelected ? colors.warning : 'rgba(245, 158, 11, 0.85)';
                      else if (isLong) barBgColor = isSelected ? '#818CF8' : 'rgba(129, 140, 248, 0.85)';
                    }

                    return (
                      <Pressable
                        key={pt.date}
                        onPress={() => {
                          setSelectedPoint(pt);
                          if (pt.hasData) {
                            setLogDate(pt.date);
                            setBedtime(pt.bedtime);
                            setWakeTime(pt.wakeTime);
                            setQuality(pt.quality);
                            setNotes(pt.notes || '');
                          } else {
                            setLogDate(pt.date);
                          }
                        }}
                        className="flex-1 items-center justify-end h-full"
                      >
                        {/* Seçili gün saat göstergesi */}
                        {isSelected && pt.hasData && (
                          <View
                            pointerEvents="none"
                            className="absolute z-30 items-center"
                            style={{
                              bottom: `${Math.min(84, heightPercent) + 6}%`,
                            }}
                          >
                            <View className="rounded bg-bg-surface px-1.5 py-0.5 border border-[#818CF8]">
                              <Text className="text-[9px] font-bold text-text-primary">
                                {pt.durationHours}s
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Çubuk */}
                        {pt.hasData ? (
                          <View
                            style={{
                              width: '100%',
                              maxWidth: period === 'week' ? 24 : 8,
                              height: `${heightPercent}%`,
                              borderTopLeftRadius: 3,
                              borderTopRightRadius: 3,
                              backgroundColor: barBgColor,
                              borderWidth: isSelected ? 1 : 0,
                              borderColor: '#FFFFFF',
                            }}
                          />
                        ) : (
                          <View
                            style={{
                              width: '100%',
                              maxWidth: period === 'week' ? 24 : 8,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            }}
                          />
                        )}

                        {/* Gün etiketi */}
                        <Text
                          className="mt-1.5 text-[9px]"
                          style={{
                            fontWeight: isSelected || pt.date === todayStr ? '700' : '500',
                            color: isSelected
                              ? '#818CF8'
                              : pt.date === todayStr
                              ? colors.accent
                              : colors.textMuted,
                          }}
                          numberOfLines={1}
                        >
                          {period === 'week' ? pt.dayLabel : pt.date.slice(8)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Seçili Gün Ayrıntı Kartı */}
            {selectedPoint && (
              <View className="rounded-xl bg-bg-elevated p-md border border-white/5 flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-bold text-text-primary">
                    {selectedPoint.dateLabel} ({selectedPoint.dayLabel})
                  </Text>
                  {selectedPoint.hasData ? (
                    <Text className="text-xs text-text-muted mt-0.5">
                      {selectedPoint.bedtime} → {selectedPoint.wakeTime} ·{' '}
                      {formatSleepDuration(selectedPoint.durationMinutes, language)}
                    </Text>
                  ) : (
                    <Text className="text-xs text-warning mt-0.5">{t('no_log_for_day')}</Text>
                  )}
                </View>

                {selectedPoint.hasData ? (
                  <View className="flex-row items-center gap-1 rounded-full bg-bg-surface px-2.5 py-1 border border-white/5">
                    <Text className="text-sm">
                      {qualityOptions.find((q) => q.value === selectedPoint.quality)?.emoji || '😊'}
                    </Text>
                    <Text className="text-[11px] font-semibold text-text-primary">
                      {qualityOptions.find((q) => q.value === selectedPoint.quality)?.label || t('sleep_quality_good')}
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setLogDate(selectedPoint.date)}
                    className="rounded-lg bg-accent/20 px-2.5 py-1 border border-accent/40 active:opacity-70"
                  >
                    <Text className="text-[11px] font-bold text-accent">{t('add_log_btn')}</Text>
                  </Pressable>
                )}
              </View>
            )}
          </Card>

          {/* Uyku Girişi / Düzenleme Formu */}
          <Card className="gap-md border border-[#818CF8]/30">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="create-outline" size={16} color="#818CF8" />
                <Text className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  {t('log_sleep_title')}
                </Text>
              </View>

              {/* Hızlı Gün Seçimi */}
              <View className="flex-row gap-1">
                <Pressable
                  onPress={() => setLogDate(yesterdayStr)}
                  className={`rounded-md px-2 py-1 ${
                    logDate === yesterdayStr ? 'bg-[#818CF8] text-white' : 'bg-bg-elevated'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      logDate === yesterdayStr ? 'text-[#0B0F14]' : 'text-text-muted'
                    }`}
                  >
                    {t('yesterday')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setLogDate(todayStr)}
                  className={`rounded-md px-2 py-1 ${
                    logDate === todayStr ? 'bg-[#818CF8]' : 'bg-bg-elevated'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      logDate === todayStr ? 'text-[#0B0F14]' : 'text-text-muted'
                    }`}
                  >
                    {t('today')}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Modern Tarih Seçimi Kartı */}
            <Pressable
              onPress={() => setDatePickerVisible(true)}
              className="flex-row items-center justify-between bg-bg-elevated rounded-2xl p-3 px-4 border border-white/5 active:bg-white/10"
            >
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 rounded-xl bg-[#818CF8]/20 border border-[#818CF8]/40 items-center justify-center">
                  <Ionicons name="calendar" size={17} color="#818CF8" />
                </View>
                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {t('record_date')}
                  </Text>
                  <Text className="text-sm font-bold text-text-primary mt-0.5">
                    {formatDateDisplay(logDate, language)}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1 bg-[#818CF8]/15 px-2.5 py-1 rounded-full border border-[#818CF8]/30">
                <Text className="text-xs font-bold text-[#818CF8]">
                  {language === 'tr' ? 'Değiştir' : language === 'de' ? 'Ändern' : language === 'es' ? 'Cambiar' : 'Change'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#818CF8" />
              </View>
            </Pressable>

            {/* Yatış & Kalkış Saatleri (Modern Kartlar) */}
            <View className="flex-row gap-3">
              {/* Yatış Saati */}
              <Pressable
                onPress={() => {
                  setTimePickerType('bedtime');
                  setTimePickerVisible(true);
                }}
                className="flex-1 bg-bg-elevated rounded-2xl p-3 border border-white/5 active:border-[#818CF8] active:bg-[#818CF8]/10 justify-between"
                style={{ minHeight: 90 }}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] font-bold text-text-muted">
                    {t('bedtime_label')}
                  </Text>
                  <Ionicons name="moon" size={14} color="#818CF8" />
                </View>

                <View className="my-1">
                  <Text className="text-2xl font-black text-text-primary tracking-tight">
                    {bedtime}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between pt-1 border-t border-white/5">
                  <Text className="text-[10px] font-semibold text-[#818CF8]">
                    {language === 'tr' ? 'Saati Seç →' : language === 'de' ? 'Wählen →' : language === 'es' ? 'Elegir →' : 'Select →'}
                  </Text>
                </View>
              </Pressable>

              {/* Kalkış Saati */}
              <Pressable
                onPress={() => {
                  setTimePickerType('wakeTime');
                  setTimePickerVisible(true);
                }}
                className="flex-1 bg-bg-elevated rounded-2xl p-3 border border-white/5 active:border-[#F59E0B] active:bg-[#F59E0B]/10 justify-between"
                style={{ minHeight: 90 }}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] font-bold text-text-muted">
                    {t('wake_time_label')}
                  </Text>
                  <Ionicons name="sunny" size={14} color="#F59E0B" />
                </View>

                <View className="my-1">
                  <Text className="text-2xl font-black text-text-primary tracking-tight">
                    {wakeTime}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between pt-1 border-t border-white/5">
                  <Text className="text-[10px] font-semibold text-[#F59E0B]">
                    {language === 'tr' ? 'Saati Seç →' : language === 'de' ? 'Wählen →' : language === 'es' ? 'Elegir →' : 'Select →'}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Canlı Süre Rozeti */}
            <View className="flex-row items-center justify-between rounded-xl bg-bg-surface p-sm px-md border border-white/5">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="time-outline" size={16} color={colors.accent} />
                <Text className="text-xs font-semibold text-text-muted">{t('calculated_sleep')}</Text>
              </View>

              <View className="flex-row items-center gap-2">
                <Text className="text-sm font-extrabold text-text-primary">
                  {formatSleepDuration(liveDurationMinutes, language)}
                </Text>
                <View
                  className={`rounded-full px-2 py-0.5 ${
                    liveDurationMinutes >= 420 && liveDurationMinutes <= 540
                      ? 'bg-accent/20 border border-accent/40'
                      : liveDurationMinutes < 420
                      ? 'bg-warning/20 border border-warning/40'
                      : 'bg-[#818CF8]/20 border border-[#818CF8]/40'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      liveDurationMinutes >= 420 && liveDurationMinutes <= 540
                        ? 'text-accent'
                        : liveDurationMinutes < 420
                        ? 'text-warning'
                        : 'text-[#818CF8]'
                    }`}
                  >
                    {liveDurationMinutes >= 420 && liveDurationMinutes <= 540
                      ? t('optimal_target')
                      : liveDurationMinutes < 420
                      ? t('short_sleep')
                      : t('long_sleep')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Uyku Kalitesi */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-semibold text-text-muted">
                {t('sleep_quality_label')}
              </Text>
              <View className="flex-row gap-1.5">
                {qualityOptions.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setQuality(opt.value)}
                    className={`flex-1 items-center justify-center rounded-xl py-2 border ${
                      quality === opt.value
                        ? 'bg-[#818CF8]/20 border-[#818CF8]'
                        : 'bg-bg-elevated border-white/5'
                    } active:opacity-70`}
                  >
                    <Text className="text-lg">{opt.emoji}</Text>
                    <Text
                      className={`text-[9px] font-bold mt-0.5 ${
                        quality === opt.value ? 'text-[#818CF8]' : 'text-text-muted'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Notlar */}
            <View className="gap-1">
              <Text className="text-[11px] font-semibold text-text-muted">{t('notes_optional')}</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={t('sleep_notes_placeholder')}
                placeholderTextColor={colors.textMuted}
                className="rounded-xl bg-bg-elevated p-sm px-md text-xs text-text-primary border border-white/5"
              />
            </View>

            {/* Kaydet Butonu */}
            <Button
              label={saving ? t('saving') : t('save_sleep_btn')}
              variant="primary"
              onPress={handleSave}
              disabled={saving}
              className="mt-xs"
            />
          </Card>

          {/* Son Kayıtlar Listesi */}
          <Card className="gap-sm">
            <View className="flex-row items-center justify-between mb-xs">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="list" size={16} color={colors.accent} />
                <Text className="text-xs uppercase font-bold text-text-muted">
                  {t('recent_logged_nights')}
                </Text>
              </View>
              <Text className="text-[11px] text-text-muted">{recentLogs.length} {t('records_count')}</Text>
            </View>

            {recentLogs.length === 0 ? (
              <View className="py-md items-center justify-center">
                <Text className="text-xs text-text-muted">{t('no_sleep_data_yet')}</Text>
              </View>
            ) : (
              recentLogs.slice(0, 7).map((log) => {
                const opt = qualityOptions.find((q) => q.value === log.quality);
                return (
                  <View
                    key={log.clientUuid}
                    className="flex-row items-center justify-between rounded-xl bg-bg-elevated p-sm px-md border border-white/5"
                  >
                    <View className="flex-row items-center gap-sm">
                      <Text className="text-xl">{opt?.emoji || '😴'}</Text>
                      <View>
                        <Text className="text-xs font-bold text-text-primary">
                          {log.date}
                        </Text>
                        <Text className="text-[11px] text-text-muted">
                          {log.bedtime} → {log.wakeTime} (
                          {formatSleepDuration(log.durationMinutes, language)})
                        </Text>
                        {!!log.notes && (
                          <Text className="text-[10px] text-text-muted italic mt-0.5">
                            "{log.notes}"
                          </Text>
                        )}
                      </View>
                    </View>

                    <Pressable
                      onPress={() => setDeleteTargetUuid(log.clientUuid)}
                      hitSlop={12}
                      className="h-8 w-8 items-center justify-center rounded-lg bg-bg-surface border border-white/5 active:opacity-60"
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </Card>
        </ScrollView>

        {/* Silme Onay Modalı */}
        <ModernConfirmModal
          visible={!!deleteTargetUuid}
          title={t('delete_sleep_record_title')}
          description={t('delete_sleep_record_desc')}
          icon="trash-outline"
          isDestructive={true}
          confirmText={t('delete')}
          cancelText={t('cancel')}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTargetUuid(null)}
        />

        {/* Modern Tarih Seçici Modalı */}
        <DatePickerModal
          visible={datePickerVisible}
          selectedDate={logDate}
          onSelect={setLogDate}
          onClose={() => setDatePickerVisible(false)}
        />

        {/* Modern Saat Seçici Modalı */}
        <TimePickerModal
          visible={timePickerVisible}
          type={timePickerType}
          currentTime={timePickerType === 'bedtime' ? bedtime : wakeTime}
          onSelect={(newTime) => {
            if (timePickerType === 'bedtime') {
              setBedtime(newTime);
            } else {
              setWakeTime(newTime);
            }
          }}
          onClose={() => setTimePickerVisible(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
