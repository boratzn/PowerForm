import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card } from '../../../src/components/ui';
import { colors } from '../../../src/constants/theme';
import { useProgramStore } from '../../../src/stores/useProgramStore';
import { useSessionStore } from '../../../src/stores/useSessionStore';
import { useLanguageStore } from '../../../src/stores/useLanguageStore';
import { getExerciseDisplayName } from '../../../src/lib/i18n';

const GOAL_LABELS: Record<string, { label: string; color: string }> = {
  hypertrophy: { label: 'Hipertrofi (Kas)', color: '#38BDF8' },
  strength: { label: 'Kuvvet / Güç', color: '#FBBF24' },
  fat_loss: { label: 'Yağ Yakımı', color: '#F87171' },
  recomp: { label: 'Recomp', color: '#A78BFA' },
  general_health: { label: 'Genel Kondisyon', color: '#4ADE80' },
};

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const activeProgram = useProgramStore((s) => s.activeProgram);
  const userPrograms = useProgramStore((s) => s.userPrograms);
  const isLoading = useProgramStore((s) => s.isLoading);
  const initialize = useProgramStore((s) => s.initialize);
  const activateProgram = useProgramStore((s) => s.activateProgram);

  const sessionClientUuid = useSessionStore((s) => s.sessionClientUuid);

  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  // Ekran her odaklandığında aktif programı ve listeleri yenile
  useFocusEffect(
    useCallback(() => {
      initialize();
    }, [initialize])
  );

  const currentDay = activeProgram?.days[selectedDayIdx] ?? activeProgram?.days[0];

  const handleStartWorkout = () => {
    if (!activeProgram || !currentDay) {
      router.push('/session');
      return;
    }

    // Halihazırda devam eden bir seans varsa uyar
    if (sessionClientUuid) {
      router.push('/session');
      return;
    }

    const sessionName = currentDay?.name
      ? (activeProgram?.name ? `${activeProgram.name} - ${currentDay.name}` : currentDay.name)
      : (activeProgram?.name || undefined);

    router.push({
      pathname: '/session',
      params: {
        programId: activeProgram.clientUuid,
        programDayId: currentDay.clientUuid,
        sessionName,
      },
    });
  };

  const handleSwitchProgram = async (programClientUuid: string) => {
    try {
      await activateProgram(programClientUuid);
      setSelectedDayIdx(0);
      Alert.alert('Aktif Program Değiştirildi', 'Seçtiğiniz program aktif olarak ayarlandı.');
    } catch (err: any) {
      Alert.alert('Hata', err?.message ?? 'Program aktifleştirilemedi.');
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-bg-primary px-lg"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
        gap: 20,
      }}
    >
      {/* Üst Başlık */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold tracking-tight text-text-primary">{t('workout_title')}</Text>
          <Text className="text-xs text-text-muted">
            {activeProgram ? t('today_target_ready') : t('choose_or_start')}
          </Text>
        </View>

        {sessionClientUuid && (
          <Pressable
            onPress={() => router.push('/session')}
            className="flex-row items-center gap-1.5 rounded-full bg-accent/20 px-sm py-1 border border-accent"
          >
            <View className="h-2 w-2 rounded-full bg-accent" />
            <Text className="text-xs font-bold text-accent">{t('ongoing_session')}</Text>
          </Pressable>
        )}
      </View>

      {/* Yükleniyor Göstergesi */}
      {isLoading && !activeProgram && (
        <View className="items-center py-xl">
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {/* Aktif Program Varsa Gösterilen Ana Kart */}
      {activeProgram ? (
        <View className="gap-md">
          {/* Program Başlık Kartı */}
          <Card className="gap-sm border-l-4 border-l-accent">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-xs">
                {activeProgram.goal && GOAL_LABELS[activeProgram.goal] && (
                  <View
                    className="rounded-full px-sm py-xs"
                    style={{ backgroundColor: `${GOAL_LABELS[activeProgram.goal].color}20` }}
                  >
                    <Text
                      className="text-[10px] font-bold"
                      style={{ color: GOAL_LABELS[activeProgram.goal].color }}
                    >
                      {GOAL_LABELS[activeProgram.goal].label}
                    </Text>
                  </View>
                )}
                <View className="rounded-full bg-bg-elevated px-sm py-xs">
                  <Text className="text-[10px] font-semibold text-text-muted">
                    {activeProgram.daysPerWeek} {t('day_label')} / {t('this_week_label')}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => router.push('/workout/templates')}
                className="active:opacity-70"
              >
                <Text className="text-xs font-semibold text-accent-alt">{t('switch_program')}</Text>
              </Pressable>
            </View>

            <Text className="text-xl font-bold text-text-primary">{activeProgram.name}</Text>

            {activeProgram.description && (
              <Text className="text-xs text-text-muted" numberOfLines={2}>
                {activeProgram.description}
              </Text>
            )}
          </Card>

          {/* Gün Seçici Sekmeler */}
          <View className="gap-xs">
            <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {t('day_label')} ({activeProgram.days.length})
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {activeProgram.days.map((day, idx) => {
                const isSelected = idx === selectedDayIdx;
                return (
                  <Pressable
                    key={day.clientUuid}
                    onPress={() => setSelectedDayIdx(idx)}
                    className={`rounded-card border px-md py-sm ${
                      isSelected
                        ? 'border-accent bg-accent/15'
                        : 'border-bg-elevated bg-bg-card active:opacity-80'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-accent' : 'text-text-muted'
                      }`}
                    >
                      {idx + 1}. {t('day_label')}
                    </Text>
                    <Text
                      className={`mt-0.5 text-sm font-medium ${
                        isSelected ? 'text-text-primary' : 'text-text-primary/70'
                      }`}
                    >
                      {day.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Seçili Gün ve Egzersiz Önizlemesi */}
          {currentDay && (
            <Card className="gap-md">
              <View className="flex-row items-center justify-between border-b border-bg-elevated pb-sm">
                <View>
                  <Text className="text-base font-bold text-text-primary">{currentDay.name}</Text>
                  {currentDay.focus && (
                    <Text className="text-xs font-medium text-accent-alt">
                      {currentDay.focus}
                    </Text>
                  )}
                </View>
                <Text className="text-xs font-semibold text-text-muted">
                  {currentDay.exercises.length} {t('library_title')}
                </Text>
              </View>

              {/* Günün Egzersiz Listesi (Özet) */}
              <View className="gap-xs">
                {currentDay.exercises.map((item, index) => {
                  const ex = item.exercise;
                  const displayName = getExerciseDisplayName(ex, language);
                  const repText =
                    item.repMin && item.repMax
                      ? `${item.repMin}-${item.repMax} ${t('reps').toLowerCase()}`
                      : item.repMin
                      ? `${item.repMin} ${t('reps').toLowerCase()}`
                      : null;

                  return (
                    <View
                      key={item.clientUuid}
                      className="flex-row items-center gap-sm border-b border-bg-elevated/40 py-xs"
                    >
                      <View className="h-10 w-10 overflow-hidden rounded bg-bg-elevated">
                        <Image
                          source={{ uri: ex.gifUrl || ex.imageUrl || '' }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center gap-xs">
                          <Text className="text-xs font-bold text-accent">#{index + 1}</Text>
                          <Text
                            className="flex-1 text-sm font-semibold text-text-primary"
                            numberOfLines={1}
                          >
                            {displayName}
                          </Text>
                        </View>
                        <Text className="text-[10px] text-text-muted">
                          {item.targetSets} {t('set').toLowerCase()} {repText ? `× ${repText}` : ''}{' '}
                          {item.targetRir !== null ? `· RIR ${item.targetRir}` : ''}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Günün Antrenmanını Başlat Butonu */}
              <Button
                label={sessionClientUuid ? t('resume_session') : `${currentDay.name} · ${t('start_day_workout')}`}
                variant="primary"
                onPress={handleStartWorkout}
              />
            </Card>
          )}

          {/* Program Yönetim Butonları */}
          <View className="flex-row gap-sm">
            <Button
              label={language === 'tr' ? 'Programı Düzenle' : language === 'de' ? 'Plan bearbeiten' : language === 'es' ? 'Editar rutina' : 'Edit Program'}
              variant="secondary"
              className="flex-1"
              onPress={() =>
                router.push({
                  pathname: '/workout/editor',
                  params: { programId: activeProgram.clientUuid },
                })
              }
            />
            <Button
              label={t('templates_title')}
              variant="secondary"
              className="flex-1"
              onPress={() => router.push('/workout/templates')}
            />
          </View>
        </View>
      ) : (
        /* Aktif Program Yoksa Gösterilen Başlangıç Kartı */
        <View className="gap-md">
          <Card className="items-center py-xl gap-sm">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-accent/15">
              <Text className="text-3xl">🏋️</Text>
            </View>
            <Text className="text-lg font-bold text-text-primary">
              {language === 'tr' ? 'Aktif Programın Yok' : language === 'de' ? 'Kein aktives Programm' : language === 'es' ? 'Sin programa activo' : 'No Active Program'}
            </Text>
            <Text className="text-center text-xs leading-relaxed text-text-muted px-md">
              {t('choose_or_start')}
            </Text>

            <View className="mt-md w-full gap-sm">
              <Button
                label={t('templates_title')}
                variant="primary"
                onPress={() => router.push('/workout/templates')}
              />
              <Button
                label={t('create_program')}
                variant="secondary"
                onPress={() => router.push('/workout/editor')}
              />
            </View>
          </Card>
        </View>
      )}

      {/* Kullanıcının Diğer Programları (Varsa) */}
      {userPrograms.some((up) => up.clientUuid !== activeProgram?.clientUuid) && (
        <View className="gap-xs">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            {t('my_programs')} ({userPrograms.filter((up) => up.clientUuid !== activeProgram?.clientUuid).length})
          </Text>
          {userPrograms.map((up) => {
            const isActive = up.clientUuid === activeProgram?.clientUuid;
            if (isActive) return null;
            const totalExercises = up.days.reduce((acc, d) => acc + d.exercises.length, 0);

            return (
              <Pressable
                key={up.clientUuid}
                onPress={() => router.push(`/workout/templates/${up.clientUuid}`)}
                className="active:opacity-85"
              >
                <Card className="flex-row items-center justify-between p-md">
                  <View className="flex-1 mr-sm gap-0.5">
                    <Text className="text-base font-semibold text-text-primary" numberOfLines={1}>
                      {up.name}
                    </Text>
                    <Text className="text-xs text-text-muted">
                      {up.days.length} {t('day_label')} · {totalExercises} {t('exercises_count_label')}
                    </Text>
                    <Text className="text-[11px] font-medium text-accent mt-0.5">
                      {language === 'tr' ? 'Hareketleri ve Detayları Gör →' : language === 'de' ? 'Übungen & Details anzeigen →' : language === 'es' ? 'Ver ejercicios y detalles →' : 'View exercises & details →'}
                    </Text>
                  </View>
                  <Button
                    label={t('apply')}
                    variant="secondary"
                    className="min-h-[36px] px-sm py-1"
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      handleSwitchProgram(up.clientUuid);
                    }}
                  />
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Hızlı İşlemler: Geçmiş ve Serbest Antrenman */}
      <View className="border-t border-bg-elevated pt-md gap-sm">
        <Pressable
          onPress={() => router.push('/workout/history')}
          className="flex-row items-center justify-between rounded-card border border-bg-elevated bg-bg-card p-md active:opacity-80"
        >
          <View className="flex-1 mr-sm">
            <Text className="text-sm font-semibold text-text-primary">{t('history_title')}</Text>
            <Text className="text-xs text-text-muted">
              {language === 'tr' ? 'Tamamlanan tüm seansların dökümü, hacim ve set detayları' : language === 'de' ? 'Übersicht über alle Einheiten und Volumen' : language === 'es' ? 'Resumen de sesiones y detalles de series' : 'Overview of all completed workouts and volume'}
            </Text>
          </View>
          <Text className="text-base font-bold text-accent">→</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/session')}
          className="flex-row items-center justify-between rounded-card border border-bg-elevated bg-bg-card p-md active:opacity-80"
        >
          <View className="flex-1 mr-sm">
            <Text className="text-sm font-semibold text-text-primary">
              {language === 'tr' ? 'Boş / Serbest Antrenman' : language === 'de' ? 'Freies Training' : language === 'es' ? 'Entrenamiento libre' : 'Empty / Free Workout'}
            </Text>
            <Text className="text-xs text-text-muted">
              {language === 'tr' ? 'Programa bağlı kalmadan serbest seans aç ve egzersizleri elle logla' : language === 'de' ? 'Freies Training ohne Plan starten' : language === 'es' ? 'Comienza una sesión libre sin un programa fijo' : 'Start a free workout session without following a program'}
            </Text>
          </View>
          <Text className="text-base font-bold text-accent">→</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
