import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/theme';
import {
  getExerciseById,
  getExerciseHistory,
  type ExerciseHistoryEntry,
  type LocalExercise,
} from '../../db/queries';
import { Button, Card } from '../ui';

function formatShortDate(timestampSeconds: number): string {
  const d = new Date(timestampSeconds * 1000);
  const day = d.getDate();
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${day} ${months[d.getMonth()]}`;
}

type ExerciseProgressModalProps = {
  visible: boolean;
  exerciseId: string | null;
  onClose: () => void;
};

export function ExerciseProgressModal({ visible, exerciseId, onClose }: ExerciseProgressModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [exercise, setExercise] = useState<LocalExercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !exerciseId) return;

    setLoading(true);
    Promise.all([
      getExerciseById(exerciseId),
      getExerciseHistory(exerciseId, 10),
    ])
      .then(([ex, hist]) => {
        setExercise(ex ?? null);
        setHistory(hist);
      })
      .catch((err) => console.error('[ExerciseProgressModal] yükleme hatası:', err))
      .finally(() => setLoading(false));
  }, [visible, exerciseId]);

  // En yüksek tekil ağırlık (Kişisel Rekor - Max Kilo)
  const maxWeightLifted = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.max(...history.map((h) => h.maxWeightKg), 0);
  }, [history]);

  // Son 7 seansın maksimum kilo verileri (kronolojik: soldan sağa)
  const chartData = useMemo(() => {
    return [...history].reverse().slice(-7);
  }, [history]);

  const maxChartWeight = useMemo(() => {
    if (chartData.length === 0) return 100;
    return Math.max(...chartData.map((d) => d.maxWeightKg), 10);
  }, [chartData]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View
        className="flex-1 bg-bg-primary px-lg"
        style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom + 16 }}
      >
        {/* Üst Bar */}
        <View className="flex-row items-center justify-between pb-sm border-b border-bg-elevated">
          <View className="flex-1 mr-sm">
            <Text className="text-lg font-bold text-text-primary" numberOfLines={1}>
              {exercise?.nameTr || exercise?.nameEn || 'Egzersiz Performansı'}
            </Text>
            {exercise?.nameTr && (
              <Text className="text-xs text-text-muted" numberOfLines={1}>
                {exercise.nameEn}
              </Text>
            )}
          </View>
          <Pressable
            onPress={onClose}
            className="h-9 w-9 items-center justify-center rounded-full bg-bg-surface active:opacity-70"
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : !exercise ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-sm text-text-muted">Egzersiz bilgisi bulunamadı.</Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1 pt-md"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
          >
            {/* Görsel & Temel Bilgiler */}
            {(exercise.gifUrl || exercise.imageUrl) && (
              <View className="h-44 w-full overflow-hidden rounded-card bg-bg-elevated">
                <Image
                  source={{ uri: exercise.gifUrl ?? exercise.imageUrl! }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              </View>
            )}

            {/* Kişisel Rekor (En Yüksek Kaldırılan Kilo) */}
            <View className="flex-row gap-sm">
              <Card className="flex-1 bg-accent/10 border border-accent/30 p-md">
                <View className="flex-row items-center gap-xs">
                  <Ionicons name="trophy" size={16} color={colors.accent} />
                  <Text className="text-[11px] font-bold uppercase text-accent">En Yüksek Ağırlık</Text>
                </View>
                <Text className="mt-xs text-2xl font-black text-accent">
                  {maxWeightLifted > 0 ? `${maxWeightLifted} kg` : '—'}
                </Text>
                <Text className="text-[10px] text-text-muted mt-0.5">Bu hareketteki kişisel rekor</Text>
              </Card>

              <Card className="flex-1 bg-bg-surface p-md">
                <View className="flex-row items-center gap-xs">
                  <Ionicons name="calendar-outline" size={16} color={colors.accentAlt} />
                  <Text className="text-[11px] font-bold uppercase text-accentAlt">Toplam Kayıt</Text>
                </View>
                <Text className="mt-xs text-2xl font-black text-text-primary">
                  {history.length} <Text className="text-sm font-normal text-text-muted">seans</Text>
                </Text>
                <Text className="text-[10px] text-text-muted mt-0.5">Kayıtlı performans geçmişi</Text>
              </Card>
            </View>

            {/* Maksimum Kilo Gelişim Grafiği */}
            <View className="gap-xs">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Max Kilo Trend Grafiği
                </Text>
                {chartData.length >= 2 && (
                  <Text
                    className={`text-xs font-bold ${
                      chartData[chartData.length - 1].maxWeightKg >= chartData[0].maxWeightKg
                        ? 'text-accent'
                        : 'text-text-muted'
                    }`}
                  >
                    {chartData[chartData.length - 1].maxWeightKg >= chartData[0].maxWeightKg ? '▲ +' : '▼ '}
                    {(chartData[chartData.length - 1].maxWeightKg - chartData[0].maxWeightKg).toFixed(1)} kg
                  </Text>
                )}
              </View>

              {chartData.length === 0 ? (
                <Card className="items-center py-lg">
                  <Text className="text-xs text-text-muted">
                    Bu hareketle ilgili henüz tamamlanmış antrenman kaydı yok.
                  </Text>
                </Card>
              ) : (
                <Card className="gap-sm p-md">
                  <View className="h-40 flex-row items-end justify-between gap-xs pt-sm">
                    {chartData.map((item, idx) => {
                      const ratio = Math.max(0.18, item.maxWeightKg / maxChartWeight);
                      const isLatest = idx === chartData.length - 1;

                      return (
                        <View key={item.sessionClientUuid} className="flex-1 items-center gap-1">
                          <Text className="text-[10px] font-bold text-text-primary">
                            {item.maxWeightKg}
                          </Text>
                          <View className="h-24 w-full items-center justify-end">
                            <View
                              className={`w-full max-w-[24px] rounded-t-md ${
                                isLatest ? 'bg-accent' : 'bg-accent/40'
                              }`}
                              style={{ height: `${ratio * 100}%` }}
                            />
                          </View>
                          <Text className="text-[9px] font-medium text-text-muted">
                            {formatShortDate(item.startedAt)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text className="text-[10px] text-center text-text-muted">
                    Her sütun o antrenmanda kaldırılan en yüksek ağırlığı (kg) gösterir
                  </Text>
                </Card>
              )}
            </View>

            {/* Son Antrenmanların Detayları */}
            {history.length > 0 && (
              <View className="gap-xs">
                <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Son Seans Setleri
                </Text>
                <View className="gap-xs">
                  {history.slice(0, 3).map((entry) => (
                    <Card key={entry.sessionClientUuid} className="p-sm">
                      <View className="flex-row items-center justify-between pb-1">
                        <Text className="text-xs font-bold text-text-primary">
                          {formatShortDate(entry.startedAt)} · {entry.sessionName || 'Antrenman'}
                        </Text>
                        <Text className="text-xs font-bold text-accent">
                          Max: {entry.maxWeightKg} kg
                        </Text>
                      </View>
                      <Text className="text-xs text-text-muted">
                        {entry.sets.map((s) => `${s.weightKg ?? 0}kg × ${s.reps ?? 0}`).join('  |  ')}
                      </Text>
                    </Card>
                  ))}
                </View>
              </View>
            )}

            {/* Kütüphane sayfasına git butonu */}
            <Button
              label="Egzersiz Rehberini & Formunu Gör →"
              variant="secondary"
              onPress={() => {
                onClose();
                router.push(`/library/${exercise.id}`);
              }}
            />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
