import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card } from '../../../../src/components/ui';
import { colors } from '../../../../src/constants/theme';
import { formatDurationHuman } from '../../../../src/lib/calculations';
import { getWorkoutHistory, type HistorySessionSummary } from '../../../../src/db/history';
import { useAuthStore } from '../../../../src/stores/useAuthStore';
import { useLanguageStore } from '../../../../src/stores/useLanguageStore';

function formatDate(timestampSeconds: number, lang: string): string {
  const d = new Date(timestampSeconds * 1000);
  const localeMap: Record<string, string> = {
    tr: 'tr-TR',
    en: 'en-US',
    de: 'de-DE',
    es: 'es-ES',
  };
  const locale = localeMap[lang] || 'tr-TR';
  const datePart = d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${datePart} · ${hours}:${mins}`;
}

function getMonthYear(timestampSeconds: number, lang: string): string {
  const d = new Date(timestampSeconds * 1000);
  const localeMap: Record<string, string> = {
    tr: 'tr-TR',
    en: 'en-US',
    de: 'de-DE',
    es: 'es-ES',
  };
  const locale = localeMap[lang] || 'tr-TR';
  const monthName = d.toLocaleDateString(locale, { month: 'long' });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `${capitalizedMonth} ${d.getFullYear()}`;
}

export default function WorkoutHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const [history, setHistory] = useState<HistorySessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getWorkoutHistory(userId)
      .then(setHistory)
      .catch((err) => console.error('Geçmiş yüklenemedi:', err))
      .finally(() => setLoading(false));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Ay bazında grupla
  const groupedByMonth = useMemo(() => {
    const map = new Map<string, HistorySessionSummary[]>();
    for (const item of history) {
      const my = getMonthYear(item.startedAt, language);
      const list = map.get(my) ?? [];
      list.push(item);
      map.set(my, list);
    }
    return Array.from(map.entries());
  }, [history, language]);

  // Genel toplamlar
  const totalVolumeKg = useMemo(
    () => history.reduce((sum, s) => sum + s.totalVolumeKg, 0),
    [history]
  );
  const totalDurationSeconds = useMemo(
    () => history.reduce((sum, s) => sum + s.durationSeconds, 0),
    [history]
  );

  return (
    <ScrollView
      className="flex-1 bg-bg-primary px-lg"
      contentContainerStyle={{
        paddingTop: 16,
        paddingBottom: insets.bottom + 32,
        gap: 16,
      }}
    >
      {/* İstatistik Şeridi */}
      {history.length > 0 && (
        <Card className="flex-row items-center justify-between p-md">
          <View className="items-center flex-1">
            <Text className="text-xl font-bold text-accent">{history.length}</Text>
            <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
              {t('workout_title')}
            </Text>
          </View>
          <View className="h-8 w-[1px] bg-bg-elevated" />
          <View className="items-center flex-1">
            <Text className="text-xl font-bold text-text-primary">
              {totalVolumeKg >= 1000
                ? `${(totalVolumeKg / 1000).toFixed(1)}t`
                : `${totalVolumeKg}kg`}
            </Text>
            <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
              {t('total_volume_label')}
            </Text>
          </View>
          <View className="h-8 w-[1px] bg-bg-elevated" />
          <View className="items-center flex-1">
            <Text className="text-xl font-bold text-accent-alt">
              {formatDurationHuman(totalDurationSeconds, language)}
            </Text>
            <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
              {t('duration')}
            </Text>
          </View>
        </Card>
      )}

      {loading ? (
        <View className="items-center py-xl">
          <ActivityIndicator color={colors.accent} />
          <Text className="mt-md text-xs text-text-muted">{t('history_loading')}</Text>
        </View>
      ) : history.length === 0 ? (
        <Card className="items-center py-xl gap-sm">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-accent/15">
            <Text className="text-3xl">📋</Text>
          </View>
          <Text className="text-lg font-bold text-text-primary">{t('no_workouts_logged')}</Text>
          <Text className="text-center text-xs leading-relaxed text-text-muted px-md">
            {t('no_workouts_logged_desc')}
          </Text>
          <Button
            label={t('start_workout_btn')}
            variant="primary"
            className="mt-md"
            onPress={() => router.navigate('/workout')}
          />
        </Card>
      ) : (
        /* Aylık Gruplanmış Liste */
        groupedByMonth.map(([monthYear, sessions]) => (
          <View key={monthYear} className="gap-sm">
            <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
              {monthYear} ({sessions.length})
            </Text>

            {sessions.map((sess) => (
              <Pressable
                key={sess.clientUuid}
                onPress={() => router.push(`/workout/history/${sess.clientUuid}`)}
              >
                {({ pressed }) => (
                  <Card className={`gap-sm ${pressed ? 'opacity-80' : ''}`}>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-medium text-text-muted">
                        {formatDate(sess.startedAt, language)}
                      </Text>
                      {sess.perceivedEffort && (
                        <View className="rounded bg-accent-alt/20 px-1.5 py-0.5">
                          <Text className="text-[10px] font-bold text-accent-alt">
                            {t('difficulty_label')}: {sess.perceivedEffort}/10
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text className="text-base font-bold text-text-primary">
                      {sess.name || t('freestyle_session')}
                    </Text>

                    {/* Metrikler Şeridi */}
                    <View className="flex-row items-center gap-xs rounded bg-bg-elevated/40 p-xs px-sm">
                      <View className="flex-row items-center gap-1">
                        <Text className="text-xs font-bold text-accent">
                          {sess.totalVolumeKg.toLocaleString()} kg
                        </Text>
                      </View>
                      <Text className="text-xs text-text-muted">·</Text>
                      <Text className="text-xs text-text-muted">
                        {formatDurationHuman(sess.durationSeconds, language)}
                      </Text>
                      <Text className="text-xs text-text-muted">·</Text>
                      <Text className="text-xs text-text-muted">
                        {sess.totalSets} {t('sets_count_label')} · {sess.exerciseCount} {t('exercises_count_label')}
                      </Text>
                    </View>

                    {/* Egzersiz Listesi Önizleme */}
                    {sess.exerciseNames.length > 0 && (
                      <Text className="text-xs text-text-muted" numberOfLines={1}>
                        {sess.exerciseNames.join(', ')}
                      </Text>
                    )}
                  </Card>
                )}
              </Pressable>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}
