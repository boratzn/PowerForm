import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
  deleteBodyWeightLog,
  getBodyWeightTrend,
  logBodyWeight,
  type WeightTrendSummary,
} from '../src/db/bodyWeight';
import { dateKey } from '../src/lib/calculations';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useLanguageStore } from '../src/stores/useLanguageStore';

function formatDateLabel(dateStr: string, lang: string): string {
  // YYYY-MM-DD
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

export default function WeightTrendScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const [trend, setTrend] = useState<WeightTrendSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [weightInput, setWeightInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ clientUuid: string; dateStr: string } | null>(null);

  const loadData = useCallback(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getBodyWeightTrend(userId, 21)
      .then(setTrend)
      .catch((err) => console.error('Kilo trendi alınamadı:', err))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    const parsed = Number(weightInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 20 || parsed > 400) {
      Alert.alert('Hata', 'Lütfen geçerli bir kilo girin (20 - 400 kg arası).');
      return;
    }
    if (!userId) return;

    try {
      setSaving(true);
      await logBodyWeight(userId, parsed);
      setWeightInput('');
      loadData();
    } catch (err: any) {
      Alert.alert('Hata', err?.message ?? 'Kilo kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteBodyWeightLog(target.clientUuid);
      loadData();
    } catch (err: any) {
      Alert.alert('Hata', err?.message ?? 'Silinemedi.');
    }
  };

  const handleDelete = (clientUuid: string, dateStr: string) => {
    setDeleteTarget({ clientUuid, dateStr });
  };

  const minWeight = trend?.minWeight ?? 70;
  const maxWeight = trend?.maxWeight ?? 80;
  const range = Math.max(1, maxWeight - minWeight);

  const todayKey = dateKey(new Date());

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-primary"
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View
        className="flex-1 px-lg"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
      >
        {/* Üst Bar: Başlık ve Kapatma */}
        <View className="mb-md flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-text-primary">{t('weight_tracking_header')}</Text>
            <Text className="text-xs text-text-muted">{t('moving_avg_7d')}</Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-bg-card active:opacity-70"
          >
            <Text className="text-xl text-text-muted">×</Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* İstatistikler Şeridi */}
          <Card className="flex-row items-center justify-between p-md">
            <View className="items-center flex-1">
              <Text className="text-xl font-bold text-text-primary">
                {trend?.currentWeight != null ? `${trend.currentWeight} kg` : '—'}
              </Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                {t('last_weight_label')}
              </Text>
            </View>
            <View className="h-8 w-[1px] bg-bg-elevated" />
            <View className="items-center flex-1">
              <Text className="text-xl font-bold text-accent">
                {trend?.currentMA != null ? `${trend.currentMA} kg` : '—'}
              </Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                {t('ma_7d_label')}
              </Text>
            </View>
            <View className="h-8 w-[1px] bg-bg-elevated" />
            <View className="items-center flex-1">
              <Text
                className={`text-xl font-bold ${
                  trend?.weeklyChangeKg != null
                    ? trend.weeklyChangeKg < 0
                      ? 'text-accent'
                      : 'text-warning'
                    : 'text-text-muted'
                }`}
              >
                {trend?.weeklyChangeKg != null
                  ? `${trend.weeklyChangeKg > 0 ? '+' : ''}${trend.weeklyChangeKg} kg`
                  : '—'}
              </Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                {t('weekly_trend_label')}
              </Text>
            </View>
          </Card>

          {/* Kilo Girişi Formu */}
          <Card className="gap-sm">
            <Text className="text-xs uppercase font-bold text-text-muted">{t('todays_weight_label')}</Text>
            <View className="flex-row items-center gap-sm">
              <Input
                placeholder="Örn: 78.5"
                keyboardType="decimal-pad"
                value={weightInput}
                onChangeText={setWeightInput}
                className="flex-1"
              />
              <Button
                label={saving ? '…' : t('save')}
                variant="primary"
                className="px-lg"
                onPress={handleSave}
                disabled={saving}
              />
            </View>
          </Card>

          {/* 7-Day MA Trend Grafiği (Spec §13) */}
          <Card className="gap-md">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs uppercase font-bold tracking-wider text-text-muted">
                {t('weight_trend_chart_title')}
              </Text>
              <View className="flex-row items-center gap-sm">
                <View className="flex-row items-center gap-1">
                  <View className="h-2.5 w-2.5 rounded-sm bg-accent" />
                  <Text className="text-[10px] text-text-muted">7d MA</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="h-2.5 w-2.5 rounded-sm bg-bg-elevated" />
                  <Text className="text-[10px] text-text-muted">{t('daily_weight_legend')}</Text>
                </View>
              </View>
            </View>

            {loading ? (
              <View className="h-44 items-center justify-center">
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : !trend || trend.points.length === 0 ? (
              <View className="h-32 items-center justify-center">
                <Text className="text-xs text-text-muted">{t('no_weight_data_yet')}</Text>
              </View>
            ) : (
              <View className="h-48 pt-sm">
                {/* Grafik çubukları ve noktaları */}
                <View className="flex-1 flex-row items-end justify-between gap-1 pb-2 border-b border-bg-elevated">
                  {trend.points.map((pt, idx) => {
                    const weightHeightRatio =
                      pt.weightKg != null ? (pt.weightKg - minWeight) / range : 0;
                    const maHeightRatio =
                      pt.movingAverage7d != null ? (pt.movingAverage7d - minWeight) / range : 0;
                    const isToday = pt.dateStr === todayKey;

                    return (
                      <View key={pt.dateStr} className="flex-1 items-center justify-end h-full">
                        {/* 7 Günlük MA Noktası */}
                        {pt.movingAverage7d != null && (
                          <View
                            className="absolute z-10 h-2 w-2 rounded-full bg-accent border border-bg-primary"
                            style={{
                              bottom: `${Math.min(95, Math.max(5, maHeightRatio * 100))}%`,
                            }}
                          />
                        )}

                        {/* Günlük Kilo Çubuğu */}
                        {pt.weightKg != null ? (
                          <View
                            className={`w-full max-w-[14px] rounded-t-sm ${
                              isToday ? 'bg-accent/70' : 'bg-bg-elevated'
                            }`}
                            style={{
                              height: `${Math.min(95, Math.max(8, weightHeightRatio * 100))}%`,
                            }}
                          />
                        ) : (
                          <View className="h-1 w-1 rounded-full bg-bg-elevated/40" />
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* X Ekseni Tarihleri */}
                <View className="flex-row justify-between pt-1">
                  {trend.points.length > 0 && (
                    <Text className="text-[9px] text-text-muted">
                      {formatDateLabel(trend.points[0].dateStr, language)}
                    </Text>
                  )}
                  {trend.points.length > 1 && (
                    <Text className="text-[9px] text-text-muted">
                      {formatDateLabel(trend.points[trend.points.length - 1].dateStr, language)}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </Card>

          {/* Geçmiş Kilo Kayıtları Listesi */}
          {trend && trend.points.filter((p) => p.weightKg != null).length > 0 && (
            <View className="gap-xs">
              <Text className="text-xs uppercase font-bold tracking-wider text-text-muted">
                {t('recorded_measurements_label')}
              </Text>
              <View className="gap-xs">
                {trend.points
                  .filter((p) => p.weightKg != null)
                  .reverse()
                  .map((p) => (
                    <Card key={p.dateStr} className="flex-row items-center justify-between p-sm">
                      <View>
                        <Text className="text-sm font-semibold text-text-primary">
                          {p.weightKg} kg
                        </Text>
                        <Text className="text-xs text-text-muted">{p.dateStr}</Text>
                      </View>

                      {p.clientUuid && (
                        <Pressable
                          onPress={() => handleDelete(p.clientUuid!, p.dateStr)}
                          className="p-xs active:opacity-60"
                        >
                          <Text className="text-xs font-semibold text-danger">{t('delete')}</Text>
                        </Pressable>
                      )}
                    </Card>
                  ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      <ModernConfirmModal
        visible={!!deleteTarget}
        title={t('delete_weight_title')}
        description={`${deleteTarget?.dateStr ?? ''} ${t('delete_weight_confirm')}`}
        icon="trash-outline"
        confirmText={t('delete')}
        cancelText={t('cancel')}
        isDestructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </KeyboardAvoidingView>
  );
}
