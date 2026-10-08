import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card } from '../../src/components/ui';
import { MuscleGroupBars, StatPill, WeightQuickEntry } from '../../src/components/today';
import { ToolsHubSheet } from '../../src/components/profile/ToolsHubSheet';
import { getRecentBodyWeights, getTodayBodyWeight, logBodyWeight, type BodyWeightLog } from '../../src/db/bodyWeight';
import {
  getMuscleGroupBreakdown,
  getTodaySummary,
  getWeeklyHighlights,
  type MuscleGroupVolume,
  type TodaySummary,
  type WeeklyHighlights,
} from '../../src/db/queries';
import { getDailyNutritionReport, type DailyNutritionReport } from '../../src/db/nutrition';
import { getTodaySleepRecord, formatSleepDuration, type SleepLog } from '../../src/db/sleepLogs';
import { dateKey, formatDurationHuman } from '../../src/lib/calculations';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useSessionStore } from '../../src/stores/useSessionStore';
import { useProgramStore } from '../../src/stores/useProgramStore';
import { useLanguageStore } from '../../src/stores/useLanguageStore';
import { colors } from '../../src/constants/theme';
import type { Language } from '../../src/lib/i18n';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatSessionDate(startedAtSec: number, lang: Language): string {
  const d = new Date(startedAtSec * 1000);
  const todayKey = dateKey(new Date());
  const yesterdayKey = dateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const key = dateKey(d);
  if (key === todayKey) return lang === 'tr' ? 'Bugün' : lang === 'de' ? 'Heute' : lang === 'es' ? 'Hoy' : 'Today';
  if (key === yesterdayKey) return lang === 'tr' ? 'Dün' : lang === 'de' ? 'Gestern' : lang === 'es' ? 'Ayer' : 'Yesterday';
  const locale = lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-US';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
}

function formatDuration(startedAtSec: number, endedAtSec: number | null): string {
  if (!endedAtSec) return '—';
  return formatDurationHuman(endedAtSec - startedAtSec);
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation<any>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const activeSessionClientUuid = useSessionStore((s) => s.sessionClientUuid);
  const activeProgram = useProgramStore((s) => s.activeProgram);
  const selectedDayIndex = useProgramStore((s) => s.selectedDayIndex);

  const handleStartSession = () => {
    if (activeProgram) {
      const currentDay = activeProgram.days[selectedDayIndex] ?? activeProgram.days[0];
      if (currentDay) {
        const sessionName = currentDay.name ? `${activeProgram.name} - ${currentDay.name}` : activeProgram.name;
        router.push({
          pathname: '/session',
          params: {
            programId: activeProgram.clientUuid,
            programDayId: currentDay.clientUuid,
            sessionName,
          },
        });
        return;
      }
    }
    router.push('/session');
  };

  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const handleGoToNutrition = () => {
    try {
      navigation.navigate('nutrition');
    } catch {
      router.navigate('/nutrition' as any);
    }
  };

  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [highlights, setHighlights] = useState<WeeklyHighlights | null>(null);
  const [muscleBreakdown, setMuscleBreakdown] = useState<MuscleGroupVolume[]>([]);
  const [todayWeight, setTodayWeight] = useState<BodyWeightLog | undefined>(undefined);
  const [previousWeight, setPreviousWeight] = useState<BodyWeightLog | undefined>(undefined);
  const [nutritionReport, setNutritionReport] = useState<DailyNutritionReport | null>(null);
  const [todaySleep, setTodaySleep] = useState<SleepLog | undefined>(undefined);
  const [toolsSheetVisible, setToolsSheetVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    Promise.all([
      getTodaySummary(userId),
      getWeeklyHighlights(userId),
      getMuscleGroupBreakdown(userId, Date.now() - SEVEN_DAYS_MS),
      getRecentBodyWeights(userId, 2),
      getTodayBodyWeight(userId),
      getDailyNutritionReport(userId),
      getTodaySleepRecord(userId),
    ])
      .then(([s, weekly, muscles, recentWeights, today, nutrition, sleep]) => {
        setSummary(s);
        setHighlights(weekly);
        setMuscleBreakdown(muscles);
        setTodayWeight(today);
        setPreviousWeight(recentWeights.find((w) => w.clientUuid !== today?.clientUuid));
        setNutritionReport(nutrition);
        setTodaySleep(sleep);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const handleSaveWeight = async (weightKg: number) => {
    if (!userId) return;
    await logBodyWeight(userId, weightKg);
    reload();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary">
        <Text className="text-text-muted">{t('loading')}</Text>
      </View>
    );
  }

  const hasActiveSession = !!activeSessionClientUuid;

  return (
    <>
      <ScrollView
      className="flex-1 bg-bg-primary px-lg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, gap: 16 }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-semibold text-text-primary">{t('today_title')}</Text>
        <Pressable
          hitSlop={8}
          onPress={() => setToolsSheetVisible(true)}
          className="flex-row items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 border border-accent/40 active:opacity-70"
        >
          <Ionicons name="flash" size={13} color={colors.accent} />
          <Text className="text-xs font-bold text-accent">
            {language === 'tr' ? 'Araçlar' : language === 'de' ? 'Tools' : language === 'es' ? 'Herramientas' : 'Tools'}
          </Text>
        </Pressable>
      </View>

      {/* Hero: aktif seans devam ediyorsa devam et, yoksa yeni seans başlat */}
      <Card className="gap-md bg-bg-elevated">
        {hasActiveSession ? (
          <>
            <View className="flex-row items-center gap-xs">
              <Ionicons name="ellipse" size={8} color={colors.accent} />
              <Text className="text-xs uppercase text-accent">{t('ongoing_session')}</Text>
            </View>
            <Text className="text-lg font-medium text-text-primary">
              {t('session_resume_desc')}
            </Text>
            <Button label={t('resume_session')} onPress={() => router.push('/session')} />
          </>
        ) : (
          <>
            <Text className="text-xs uppercase text-text-muted">{t('today_workout_title')}</Text>
            {summary?.lastCompleted ? (
              <Text className="text-base text-text-muted">
                {t('last_session_label')}: {formatSessionDate(summary.lastCompleted.startedAt, language)} ·{' '}
                {Math.round(summary.lastCompleted.volumeKg).toLocaleString()} {t('volume_unit')} ·{' '}
                {formatDuration(summary.lastCompleted.startedAt, summary.lastCompleted.endedAt)}
              </Text>
            ) : (
              <Text className="text-lg font-medium text-text-primary">
                {t('no_session_yet')}
              </Text>
            )}
            <Button label={t('start_session')} onPress={handleStartSession} />
          </>
        )}
        {!!highlights?.prCount && (
          <View className="flex-row items-center gap-xs rounded-input bg-bg-surface px-md py-sm">
            <Text className="text-base">🏆</Text>
            <Text className="flex-1 text-sm text-text-primary">
              {t('pr_celebration_start')}
              {highlights.prCount}
              {t('pr_celebration_end')}
            </Text>
          </View>
        )}
      </Card>

      {/* Seri / bu hafta / son hacim */}
      <View className="flex-row gap-sm">
        <StatPill
          icon="flame"
          iconColor={colors.warning}
          label={t('streak_label')}
          value={summary && summary.streakDays > 0 ? `${summary.streakDays}` : '—'}
        />
        <StatPill
          icon="calendar-outline"
          iconColor={colors.accentAlt}
          label={t('this_week_label')}
          value={summary ? `${summary.weekSessionCount}` : '—'}
        />
        <StatPill
          icon="barbell-outline"
          iconColor={colors.accent}
          label={t('last_volume_label')}
          value={summary?.lastCompleted ? Math.round(summary.lastCompleted.volumeKg).toLocaleString() : '—'}
        />
      </View>

      {!!highlights && highlights.thisWeekVolumeKg > 0 && (
        <Card className="gap-xs">
          <Text className="text-xs uppercase text-text-muted">{t('weekly_volume_title')}</Text>
          <Text className="text-2xl font-semibold text-text-primary">
            {Math.round(highlights.thisWeekVolumeKg).toLocaleString()} kg
          </Text>
          {highlights.lastWeekVolumeKg > 0 && (
            <Text
              className={`text-xs ${
                highlights.thisWeekVolumeKg >= highlights.lastWeekVolumeKg ? 'text-accent' : 'text-warning'
              }`}
            >
              {highlights.thisWeekVolumeKg >= highlights.lastWeekVolumeKg ? '▲' : '▼'}{' '}
              {Math.round(Math.abs(highlights.thisWeekVolumeKg - highlights.lastWeekVolumeKg)).toLocaleString()} kg{' '}
              {t('vs_last_week')}
            </Text>
          )}
        </Card>
      )}

      {muscleBreakdown.length > 0 && (
        <Card className="gap-md">
          <Text className="text-xs uppercase text-text-muted">{t('muscles_worked')}</Text>
          <MuscleGroupBars data={muscleBreakdown} />
        </Card>
      )}

      <Card>
        <WeightQuickEntry todayEntry={todayWeight} previousEntry={previousWeight} onSave={handleSaveWeight} />
      </Card>

      {/* Uyku & Toparlanma Kartı */}
      <Pressable onPress={() => router.push('/sleep-tracker')} className="active:opacity-85">
        <Card className="gap-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-xs">
              <Ionicons name="moon" size={16} color="#818CF8" />
              <Text className="text-xs uppercase font-bold text-text-muted">{t('sleep_recovery_title')}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-xs font-semibold text-[#818CF8]">{t('details_and_chart')}</Text>
              <Ionicons name="chevron-forward" size={14} color="#818CF8" />
            </View>
          </View>

          {todaySleep ? (
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-bold text-text-primary">
                  {formatSleepDuration(todaySleep.durationMinutes, language)}
                </Text>
                <Text className="text-xs text-text-muted mt-0.5">
                  {todaySleep.bedtime} → {todaySleep.wakeTime} ·{' '}
                  {(todaySleep.quality ?? 3) >= 4
                    ? `😊 ${t('sleep_rested')}`
                    : (todaySleep.quality ?? 3) <= 2
                    ? `🥱 ${t('sleep_tired')}`
                    : `😐 ${t('sleep_normal')}`}
                </Text>
              </View>

              <View className="items-end">
                <View className="rounded-full bg-[#818CF8]/15 px-3 py-1 border border-[#818CF8]/30">
                  <Text className="text-xs font-bold text-[#818CF8]">
                    {todaySleep.durationMinutes >= 420 && todaySleep.durationMinutes <= 540
                      ? `✓ ${t('on_target_badge')} (7-9h)`
                      : `${(todaySleep.durationMinutes / 60).toFixed(1)} h`}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="flex-row items-center justify-between py-1">
              <View className="flex-1 mr-2">
                <Text className="text-sm font-semibold text-text-primary">{t('log_today_sleep_title')}</Text>
                <Text className="text-xs text-text-muted mt-0.5">
                  {t('log_today_sleep_desc')}
                </Text>
              </View>
              <View className="rounded-lg bg-bg-elevated px-3 py-1.5 border border-white/5">
                <Text className="text-xs font-bold text-[#818CF8]">{t('enter_sleep_btn')}</Text>
              </View>
            </View>
          )}
        </Card>
      </Pressable>

      <Pressable onPress={handleGoToNutrition} className="active:opacity-85">
        <Card className="gap-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-xs">
              <Ionicons name="restaurant-outline" size={16} color={colors.accent} />
              <Text className="text-xs uppercase font-bold text-text-muted">{t('today_nutrition_title')}</Text>
            </View>
            <Pressable onPress={handleGoToNutrition} hitSlop={12} className="active:opacity-60">
              <Text className="text-xs font-semibold text-accent-alt">{t('details_and_meals')}</Text>
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-text-primary">
                {nutritionReport?.totalKcal ?? 0}
                <Text className="text-xs font-normal text-text-muted">
                  {' '}
                  / {nutritionReport?.targets.kcal ?? 2400} kcal
                </Text>
              </Text>
              <Text className="text-xs text-text-muted mt-0.5">
                {Math.max(0, (nutritionReport?.targets.kcal ?? 2400) - (nutritionReport?.totalKcal ?? 0))} {t('kcal_left')}
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-sm font-bold text-[#38BDF8]">
                {nutritionReport?.totalProteinG ?? 0}g
                <Text className="text-xs font-normal text-text-muted">
                  {' '}
                  / {nutritionReport?.targets.proteinG ?? 150}g
                </Text>
              </Text>
              <Text className="text-[10px] text-text-muted">{t('protein_label')}</Text>
            </View>
          </View>

          {/* İlerleme Çubuğu */}
          <View className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated mt-xs">
            <View
              className="h-full rounded-full bg-accent"
              style={{
                width: `${Math.min(
                  100,
                  ((nutritionReport?.totalKcal ?? 0) / (nutritionReport?.targets.kcal ?? 2400)) * 100
                )}%`,
              }}
            />
          </View>
        </Card>
      </Pressable>
    </ScrollView>
      <ToolsHubSheet
        visible={toolsSheetVisible}
        onClose={() => setToolsSheetVisible(false)}
      />
    </>
  );
}
