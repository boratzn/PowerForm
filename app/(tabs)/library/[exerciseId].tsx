import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card } from '../../../src/components/ui';
import { colors } from '../../../src/constants/theme';
import {
  getBestE1RM,
  getExerciseById,
  getExerciseHistory,
  getLastPerformance,
  type ExerciseHistoryEntry,
  type LocalExercise,
  type PastSet,
} from '../../../src/db/queries';
import { useLanguageStore } from '../../../src/stores/useLanguageStore';
import {
  getEquipmentDisplayName,
  getExerciseDisplayName,
  getMuscleDisplayName,
} from '../../../src/lib/i18n';

function formatShortDate(timestampSeconds: number): string {
  const d = new Date(timestampSeconds * 1000);
  const day = d.getDate();
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${day} ${months[d.getMonth()]}`;
}

export default function ExerciseDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const router = useRouter();

  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const [exercise, setExercise] = useState<LocalExercise | null>(null);
  const [bestE1RM, setBestE1RM] = useState(0);
  const [lastSets, setLastSets] = useState<PastSet[]>([]);
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exerciseId) return;
    setLoading(true);
    Promise.all([
      getExerciseById(exerciseId),
      getBestE1RM(exerciseId),
      getLastPerformance(exerciseId),
      getExerciseHistory(exerciseId),
    ]).then(([ex, e1rm, sets, hist]) => {
      setExercise(ex ?? null);
      setBestE1RM(e1rm);
      setLastSets(sets);
      setHistory(hist);
      setLoading(false);
    });
  }, [exerciseId]);

  // Grafik verileri (en eskiden en yeniye doğru)
  const chartData = useMemo(() => {
    return [...history].reverse().slice(-7);
  }, [history]);

  // En yüksek kaldırılan tekil ağırlık (Kişisel Rekor)
  const maxWeightLifted = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.max(...history.map((h) => h.maxWeightKg), 0);
  }, [history]);

  const maxChartWeight = useMemo(() => {
    if (chartData.length === 0) return 100;
    return Math.max(...chartData.map((d) => d.maxWeightKg), 10);
  }, [chartData]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary">
        <Text className="text-text-muted">{t('loading')}</Text>
      </View>
    );
  }

  if (!exercise) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary px-lg">
        <Text className="text-text-muted">{t('exercise_not_found')}</Text>
      </View>
    );
  }

  const displayName = getExerciseDisplayName(exercise, language);
  const secondaryName = language === 'tr' ? exercise.nameEn : (exercise.nameTr !== displayName ? exercise.nameTr : null);

  const isTr = language === 'tr';
  const steps = isTr
    ? (exercise.instructionsTr?.length ? exercise.instructionsTr : exercise.instructionsEn)
    : (exercise.instructionsEn?.length ? exercise.instructionsEn : exercise.instructionsTr);

  const cues = exercise.cuesTr;

  return (
    <>
      <Stack.Screen options={{ title: displayName }} />
      <ScrollView className="flex-1 bg-bg-primary" contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="h-64 w-full items-center justify-center bg-bg-elevated">
          {(exercise.gifUrl || exercise.imageUrl) && (
            <Image
              source={{ uri: exercise.gifUrl ?? exercise.imageUrl! }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              transition={200}
            />
          )}
        </View>

        <View className="gap-lg px-lg pt-lg">
          {/* Başlık ve Etiketler */}
          <View className="gap-xs">
            <Text className="text-2xl font-semibold text-text-primary">
              {displayName}
            </Text>
            {secondaryName && <Text className="text-text-muted">{secondaryName}</Text>}

            <View className="mt-xs flex-row flex-wrap gap-xs">
              {exercise.equipment && (
                <View className="rounded-pill bg-bg-elevated px-md py-xs">
                  <Text className="text-xs font-medium text-text-primary">
                    {getEquipmentDisplayName(exercise.equipment, language)}
                  </Text>
                </View>
              )}
              {exercise.primaryMuscles?.map((m) => (
                <View key={m} className="rounded-pill bg-bg-elevated px-md py-xs">
                  <Text className="text-xs font-medium text-text-primary">
                    {getMuscleDisplayName(m, language)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* İstatistik Özet Kartları */}
          <View className="flex-row gap-sm">
            <Card className="flex-1">
              <Text className="text-xs uppercase text-text-muted">{t('personal_record_max')}</Text>
              <Text className="mt-xs text-xl font-bold text-accent">
                {maxWeightLifted > 0 ? `${maxWeightLifted} kg` : '—'}
              </Text>
            </Card>
            <Card className="flex-1">
              <Text className="text-xs uppercase text-text-muted">{t('last_time_label')}</Text>
              <Text className="mt-xs text-xl font-bold text-text-primary">
                {lastSets.length > 0 ? `${lastSets.length} ${t('set').toLowerCase()}` : '—'}
              </Text>
            </Card>
            <Card className="flex-1">
              <Text className="text-xs uppercase text-text-muted">{t('total_sessions_label')}</Text>
              <Text className="mt-xs text-xl font-bold text-accent-alt">
                {history.length > 0 ? history.length : '0'}
              </Text>
            </Card>
          </View>

          {/* İlerleme ve Maksimum Ağırlık Trend Grafiği */}
          <View className="gap-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {t('progress_trend_label')}
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
              <Card className="items-center py-md">
                <Text className="text-xs text-text-muted">
                  {t('no_history_exercise')}
                </Text>
              </Card>
            ) : (
              <Card className="gap-md p-md">
                <View className="h-40 flex-row items-end justify-between gap-xs pt-md">
                  {chartData.map((item, idx) => {
                    const ratio = Math.max(0.18, item.maxWeightKg / maxChartWeight);
                    const isLatest = idx === chartData.length - 1;

                    return (
                      <View key={item.sessionClientUuid} className="flex-1 items-center gap-1">
                        <Text className="text-[10px] font-bold text-text-primary">
                          {item.maxWeightKg}
                        </Text>
                        <View className="h-28 w-full items-center justify-end">
                          <View
                            className={`w-full max-w-[28px] rounded-t-md ${
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
                  {t('bars_desc')}
                </Text>
              </Card>
            )}
          </View>

          {/* Geçmiş Seanslar Listesi */}
          {history.length > 0 && (
            <View className="gap-sm">
              <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {t('past_records')}
              </Text>
              <View className="gap-xs">
                {history.slice(0, 5).map((entry) => (
                  <Pressable
                    key={entry.sessionClientUuid}
                    onPress={() => router.push(`/workout/history/${entry.sessionClientUuid}`)}
                  >
                    <Card className="flex-row items-center justify-between p-sm">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-xs">
                          <Text className="text-xs font-bold text-text-primary">
                            {formatShortDate(entry.startedAt)}
                          </Text>
                          <Text className="text-xs text-text-muted">·</Text>
                          <Text className="text-xs text-text-muted">
                            Max {entry.maxWeightKg} kg
                          </Text>
                        </View>
                        <Text className="text-[11px] text-text-muted mt-0.5" numberOfLines={1}>
                          {entry.sets.map((s) => `${s.weightKg ?? 0}kg × ${s.reps ?? 0}`).join(' | ')}
                        </Text>
                      </View>
                      <View className="items-end pl-sm">
                        <Text className="text-xs font-bold text-accent">
                          {entry.bestE1RM} kg
                        </Text>
                        <Text className="text-[9px] text-text-muted">e1RM</Text>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Nasıl Yapılır */}
          {steps && steps.length > 0 && (
            <View className="gap-sm">
              <Text className="text-xs uppercase text-text-muted font-bold tracking-wider">{t('how_to')}</Text>
              <View className="gap-md">
                {steps.map((step, i) => (
                  <View key={i} className="flex-row gap-md">
                    <View className="h-6 w-6 items-center justify-center rounded-pill bg-bg-elevated">
                      <Text className="text-xs font-medium text-text-primary">{i + 1}</Text>
                    </View>
                    <Text className="flex-1 text-base leading-6 text-text-primary">{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* İpuçları */}
          {cues && cues.length > 0 && (
            <View className="gap-sm">
              <Text className="text-xs uppercase text-text-muted font-bold tracking-wider">{t('tips')}</Text>
              <Card className="gap-xs">
                {cues.map((cue, i) => (
                  <Text key={i} className="text-sm leading-relaxed text-text-primary">
                    • {cue}
                  </Text>
                ))}
              </Card>
            </View>
          )}

          {/* Sık Yapılan Hatalar */}
          {exercise.commonMistakesTr && exercise.commonMistakesTr.length > 0 && (
            <View className="gap-sm">
              <Text className="text-xs uppercase text-text-muted font-bold tracking-wider">
                {language === 'tr' ? 'Sık Yapılan Hatalar' : language === 'de' ? 'Häufige Fehler' : language === 'es' ? 'Errores Comunes' : 'Common Mistakes'}
              </Text>
              <Card className="gap-xs">
                {exercise.commonMistakesTr.map((mistake, i) => (
                  <Text key={i} className="text-sm leading-relaxed text-text-primary">
                    • {mistake}
                  </Text>
                ))}
              </Card>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}
