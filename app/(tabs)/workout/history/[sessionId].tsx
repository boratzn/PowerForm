import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, ModernConfirmModal } from '../../../../src/components/ui';
import { colors } from '../../../../src/constants/theme';
import { formatDurationHuman } from '../../../../src/lib/calculations';
import {
  deleteWorkoutSession,
  getSessionDetail,
  type SessionDetailView,
} from '../../../../src/db/history';
import {
  getEquipmentDisplayName,
  getExerciseDisplayName,
  getMuscleDisplayName,
} from '../../../../src/lib/i18n';
import { useLanguageStore } from '../../../../src/stores/useLanguageStore';
import { useProgramStore } from '../../../../src/stores/useProgramStore';

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
    year: 'numeric',
    weekday: 'long',
  });
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${datePart} · ${hours}:${mins}`;
}

export default function SessionDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sessionId, from } = useLocalSearchParams<{ sessionId: string; from?: string }>();
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const createProgramFromPastSession = useProgramStore((s) => s.createProgramFromPastSession);

  const [session, setSession] = useState<SessionDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [converting, setConverting] = useState(false);

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (from === 'profile') {
      router.navigate('/(tabs)/profile');
    } else {
      router.navigate('/workout/history');
    }
  }, [from, router]);

  useEffect(() => {
    if (from !== 'profile') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleGoBack();
      return true;
    });
    return () => sub.remove();
  }, [from, handleGoBack]);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    getSessionDetail(sessionId)
      .then(setSession)
      .catch((err) => console.error('Seans detayı yüklenemedi:', err))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleMakeActiveProgram = async () => {
    if (!session) return;
    try {
      setConverting(true);
      await createProgramFromPastSession(session.clientUuid, {
        name: session.name || undefined,
        setActive: true,
      });

      Alert.alert(
        language === 'tr' ? 'Aktif Program Değiştirildi' : 'Active Program Updated',
        `"${session.name || (language === 'tr' ? 'Geçmiş Antrenman' : 'Workout')}" ${
          language === 'tr'
            ? 'başarıyla aktif antrenman programınız olarak ayarlandı.'
            : 'has been set as your active program.'
        }`,
        [
          {
            text: language === 'tr' ? 'Antrenmana Git' : 'Go to Workout',
            onPress: () => router.navigate('/workout'),
          },
          { text: t('ok') },
        ]
      );
    } catch (err: any) {
      Alert.alert(t('error'), err?.message ?? (language === 'tr' ? 'Program aktifleştirilemedi.' : 'Could not activate program.'));
    } finally {
      setConverting(false);
    }
  };

  const handleSaveAsProgramAndEdit = async () => {
    if (!session) return;
    try {
      setConverting(true);
      const newProgId = await createProgramFromPastSession(session.clientUuid, {
        name: session.name || undefined,
        setActive: false,
      });

      router.push({
        pathname: '/workout/editor',
        params: { programId: newProgId },
      });
    } catch (err: any) {
      Alert.alert(t('error'), err?.message ?? (language === 'tr' ? 'Program oluşturulamadı.' : 'Could not create program.'));
    } finally {
      setConverting(false);
    }
  };

  const confirmDelete = async () => {
    if (!session) return;
    setDeleteModalVisible(false);
    try {
      setDeleting(true);
      await deleteWorkoutSession(session.clientUuid);
      router.back();
    } catch (err: any) {
      Alert.alert(t('error'), err?.message ?? t('could_not_delete'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    if (!session) return;
    setDeleteModalVisible(true);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary">
        <ActivityIndicator size="large" color={colors.accent} />
        <Text className="mt-md text-sm text-text-muted">{t('session_detail_loading')}</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary p-lg">
        <Text className="text-base text-text-muted">{t('session_not_found')}</Text>
        <Button label={t('back_btn')} variant="secondary" className="mt-md" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={handleGoBack} hitSlop={12} className="mr-3 p-1 active:opacity-70">
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-bg-primary px-lg"
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
      >
        {/* Üst Başlık Kartı */}
        <Card className="gap-sm">
          <Text className="text-xs text-text-muted">{formatDate(session.startedAt, language)}</Text>
          <Text className="text-xl font-bold text-text-primary">
            {session.name || t('freestyle_session')}
          </Text>

          {session.notes && (
            <Text className="text-xs italic text-text-muted">{session.notes}</Text>
          )}

          {/* İstatistikler Paneli */}
          <View className="mt-xs flex-row items-center justify-between rounded-md bg-bg-elevated/40 p-md">
            <View className="items-center flex-1">
              <Text className="text-lg font-bold text-accent">
                {session.totalVolumeKg.toLocaleString()} kg
              </Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted">{t('volume')}</Text>
            </View>
            <View className="h-6 w-[1px] bg-bg-elevated" />
            <View className="items-center flex-1">
              <Text className="text-lg font-bold text-accent-alt">
                {formatDurationHuman(session.durationSeconds, language)}
              </Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted">{t('duration')}</Text>
            </View>
            <View className="h-6 w-[1px] bg-bg-elevated" />
            <View className="items-center flex-1">
              <Text className="text-lg font-bold text-text-primary">{session.totalSets}</Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted">{t('sets_count_label')}</Text>
            </View>
            {session.perceivedEffort && (
              <>
                <View className="h-6 w-[1px] bg-bg-elevated" />
                <View className="items-center flex-1">
                  <Text className="text-lg font-bold text-text-primary">
                    {session.perceivedEffort}/10
                  </Text>
                  <Text className="text-[10px] uppercase font-semibold text-text-muted">{t('difficulty_label')}</Text>
                </View>
              </>
            )}
          </View>
        </Card>

        {/* Egzersizler ve Set Detayları */}
        <View className="gap-md">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
            {t('exercises_title')} ({session.exercises.length})
          </Text>

          {session.exercises.map((item, index) => {
            const displayName = getExerciseDisplayName(item, language);
            const completedSets = item.sets.filter((s) => s.isCompleted);

            return (
              <Card key={item.clientUuid} className="gap-sm">
                {/* Egzersiz Başlık Satırı (Tıklanınca Detaya Gider) */}
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: `/library/${item.exerciseId}`,
                      params: { from: 'workout' },
                    })
                  }
                  className="flex-row items-center gap-md active:opacity-75"
                >
                  <View className="h-12 w-12 overflow-hidden rounded bg-bg-elevated">
                    <Image
                      source={{ uri: item.gifUrl || item.imageUrl || '' }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-xs">
                      <Text className="text-xs font-bold text-accent">#{index + 1}</Text>
                      <Text className="flex-1 text-base font-semibold text-text-primary" numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </View>
                    {language === 'tr' && item.nameTr && item.nameEn && (
                      <Text className="text-xs text-text-muted" numberOfLines={1}>
                        {item.nameEn}
                      </Text>
                    )}
                    <View className="mt-0.5 flex-row items-center gap-xs">
                      <Text className="text-[10px] capitalize text-accent-alt">
                        {getEquipmentDisplayName(item.equipment, language)}
                      </Text>
                      {item.primaryMuscles && item.primaryMuscles[0] && (
                        <Text className="text-[10px] text-text-muted">
                          · {getMuscleDisplayName(item.primaryMuscles[0], language).toUpperCase()}
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>

              {item.notes && (
                <View className="rounded bg-bg-surface/80 px-sm py-1 border border-bg-elevated/40">
                  <Text className="text-[11px] text-accent font-medium">📝 {item.notes}</Text>
                </View>
              )}

              {/* Set Tablosu */}
              <View className="mt-xs rounded bg-bg-elevated/30 p-xs">
                {/* Tablo Başlığı */}
                <View className="flex-row items-center border-b border-bg-elevated pb-1 px-sm">
                  <Text className="w-10 text-[10px] font-bold text-text-muted">SET</Text>
                  <Text className="flex-1 text-[10px] font-bold text-text-muted">{t('weight_x_reps')}</Text>
                  <Text className="w-16 text-center text-[10px] font-bold text-text-muted">RIR</Text>
                  <Text className="w-16 text-right text-[10px] font-bold text-text-muted">e1RM</Text>
                </View>

                {/* Set Satırları */}
                {completedSets.length === 0 ? (
                  <Text className="py-2 text-center text-xs text-text-muted">{t('no_sets_recorded')}</Text>
                ) : (
                  completedSets.map((s) => (
                    <View
                      key={s.clientUuid}
                      className="flex-row items-center border-b border-bg-elevated/30 py-1.5 px-sm"
                    >
                      <View className="w-10">
                        <View className="h-5 w-5 items-center justify-center rounded bg-bg-elevated">
                          <Text className="text-[10px] font-bold text-text-primary">
                            {s.setIndex}
                          </Text>
                        </View>
                      </View>
                      <Text className="flex-1 text-xs font-semibold text-text-primary">
                        {s.weightKg != null ? `${s.weightKg} kg` : '-'} × {s.reps ?? '-'}
                      </Text>
                      <Text className="w-16 text-center text-xs text-text-muted">
                        {s.rir != null ? `RIR ${s.rir}` : '-'}
                      </Text>
                      <Text className="w-16 text-right text-xs font-medium text-accent">
                        {s.estimated1RM ? `${s.estimated1RM} kg` : '-'}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </Card>
          );
        })}
      </View>

      {/* Bu Antrenmanı Aktif Program Yap veya Kaydet */}
      <Card className="gap-sm border-l-4 border-l-accent mt-sm">
        <Text className="text-sm font-bold text-text-primary">
          {language === 'tr' ? 'Bu Antrenmanı Tekrar Yapmak İster misin?' : 'Want to repeat this workout?'}
        </Text>
        <Text className="text-xs text-text-muted leading-relaxed">
          {language === 'tr'
            ? 'Bu antrenmandaki egzersiz ve set düzenini tek dokunuşla aktif programın olarak ayarlayabilir veya düzenleyip kaydedebilirsin.'
            : 'Set all exercises and sets from this session as your active routine with a single tap, or edit and save it.'}
        </Text>
        <View className="mt-xs gap-sm">
          <Button
            label={
              converting
                ? (language === 'tr' ? 'Aktifleştiriliyor…' : 'Activating…')
                : (language === 'tr' ? '⚡ Bu Antrenmanı Aktif Program Yap' : '⚡ Set as Active Program')
            }
            variant="primary"
            onPress={handleMakeActiveProgram}
            disabled={converting}
          />
          <Button
            label={language === 'tr' ? '📝 Program Olarak Kaydet & Düzenle' : '📝 Save & Customize as Program'}
            variant="secondary"
            onPress={handleSaveAsProgramAndEdit}
            disabled={converting}
          />
        </View>
      </Card>

      {/* Silme Butonu */}
      <View className="mt-md">
        <Button
          label={deleting ? t('deleting') : t('delete_workout_btn')}
          variant="danger"
          onPress={handleDelete}
          disabled={deleting}
        />
      </View>

      <ModernConfirmModal
        visible={deleteModalVisible}
        title={t('delete_workout_title')}
        description={t('delete_workout_confirm')}
        icon="trash-outline"
        confirmText={t('yes_delete')}
        cancelText={t('cancel')}
        isDestructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />
    </ScrollView>
    </>
  );
}
