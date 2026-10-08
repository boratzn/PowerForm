import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card } from '../../../../src/components/ui';
import { colors } from '../../../../src/constants/theme';
import { useLanguageStore } from '../../../../src/stores/useLanguageStore';
import { useProgramStore } from '../../../../src/stores/useProgramStore';

const GOAL_LABELS: Record<string, { label: string; color: string }> = {
  hypertrophy: { label: 'Hipertrofi (Kas)', color: '#38BDF8' },
  strength: { label: 'Kuvvet / Güç', color: '#FBBF24' },
  fat_loss: { label: 'Yağ Yakımı', color: '#F87171' },
  recomp: { label: 'Recomp', color: '#A78BFA' },
  general_health: { label: 'Genel Kondisyon', color: '#4ADE80' },
};

export default function TemplatesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();

  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const [activeTab, setActiveTab] = useState<'my_programs' | 'templates'>('my_programs');
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const templates = useProgramStore((s) => s.templates);
  const userPrograms = useProgramStore((s) => s.userPrograms);
  const activeProgram = useProgramStore((s) => s.activeProgram);
  const isLoading = useProgramStore((s) => s.isLoading);
  const loadTemplates = useProgramStore((s) => s.loadTemplates);
  const loadUserPrograms = useProgramStore((s) => s.loadUserPrograms);
  const loadActiveProgram = useProgramStore((s) => s.loadActiveProgram);
  const activateProgram = useProgramStore((s) => s.activateProgram);

  const handleGoBack = useCallback(() => {
    if (from === 'profile') {
      router.navigate('/(tabs)/profile');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/workout');
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

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
      loadUserPrograms();
      loadActiveProgram();
    }, [loadTemplates, loadUserPrograms, loadActiveProgram])
  );

  const handleSwitchActive = async (programClientUuid: string, programName: string) => {
    try {
      setActivatingId(programClientUuid);
      await activateProgram(programClientUuid);
      Alert.alert(
        language === 'tr' ? 'Başarılı' : 'Success',
        `"${programName}" ${
          language === 'tr' ? 'aktif programınız olarak ayarlandı.' : 'has been set as your active program.'
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
      Alert.alert(t('error'), err?.message || (language === 'tr' ? 'Program aktifleştirilemedi.' : 'Could not activate program.'));
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: from === 'profile' ? () => (
            <Pressable onPress={handleGoBack} hitSlop={12} className="mr-3 p-1 active:opacity-70">
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </Pressable>
          ) : undefined,
        }}
      />
      <ScrollView
        className="flex-1 bg-bg-primary px-lg"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
      >
      {/* Sekme Seçici (Tab Switcher) */}
      <View className="flex-row rounded-xl bg-bg-card p-1 border border-bg-elevated">
        <Pressable
          onPress={() => setActiveTab('my_programs')}
          className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg ${
            activeTab === 'my_programs' ? 'bg-accent' : 'bg-transparent'
          }`}
        >
          <Ionicons
            name="barbell-outline"
            size={16}
            color={activeTab === 'my_programs' ? colors.bgPrimary : colors.textMuted}
          />
          <Text
            className={`text-xs font-bold ${
              activeTab === 'my_programs' ? 'text-bg-primary' : 'text-text-muted'
            }`}
          >
            {language === 'tr' ? 'Programlarım' : 'My Programs'} ({userPrograms.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('templates')}
          className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg ${
            activeTab === 'templates' ? 'bg-accent' : 'bg-transparent'
          }`}
        >
          <Ionicons
            name="layers-outline"
            size={16}
            color={activeTab === 'templates' ? colors.bgPrimary : colors.textMuted}
          />
          <Text
            className={`text-xs font-bold ${
              activeTab === 'templates' ? 'text-bg-primary' : 'text-text-muted'
            }`}
          >
            {language === 'tr' ? 'Hazır Şablonlar' : 'Templates'} ({templates.length})
          </Text>
        </Pressable>
      </View>

      {/* TAB 1: KULLANICININ KAYITLI PROGRAMLARI */}
      {activeTab === 'my_programs' && (
        <View className="gap-md">
          {/* Üst Eylem Satırı */}
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
              {language === 'tr' ? 'Kayıtlı Antrenman Programların' : 'Your Saved Workout Programs'}
            </Text>
            <Pressable
              onPress={() => router.push('/workout/editor')}
              className="flex-row items-center gap-1 rounded-full bg-accent/20 px-3 py-1.5 active:opacity-75"
            >
              <Ionicons name="add" size={14} color={colors.accent} />
              <Text className="text-xs font-bold text-accent">
                {language === 'tr' ? 'Yeni Oluştur' : 'Create New'}
              </Text>
            </Pressable>
          </View>

          {isLoading && userPrograms.length === 0 ? (
            <View className="items-center py-xl">
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : userPrograms.length === 0 ? (
            <Card className="items-center py-xl gap-sm">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-accent/15">
                <Text className="text-3xl">📋</Text>
              </View>
              <Text className="text-lg font-bold text-text-primary">
                {language === 'tr' ? 'Henüz Kayıtlı Programın Yok' : 'No Saved Programs Yet'}
              </Text>
              <Text className="text-center text-xs leading-relaxed text-text-muted px-md">
                {language === 'tr'
                  ? 'Sıfırdan kendinize özel bir program oluşturabilir veya tamamladığınız antrenmanları tek dokunuşla program olarak kaydedebilirsiniz.'
                  : 'You can create your own custom routine from scratch or save completed sessions as reusable programs.'}
              </Text>
              <View className="mt-md w-full gap-sm">
                <Button
                  label={language === 'tr' ? '+ Yeni Program Oluştur' : '+ Create New Program'}
                  variant="primary"
                  onPress={() => router.push('/workout/editor')}
                />
                <Button
                  label={language === 'tr' ? 'Geçmiş Antrenmanlara Git' : 'Go to Workout History'}
                  variant="secondary"
                  onPress={() => router.push('/workout/history')}
                />
              </View>
            </Card>
          ) : (
            userPrograms.map((program) => {
              const isActive = program.clientUuid === activeProgram?.clientUuid;
              const totalExercises = program.days.reduce((acc, d) => acc + d.exercises.length, 0);
              const goalInfo = program.goal ? GOAL_LABELS[program.goal] : null;

              return (
                <Card
                  key={program.clientUuid}
                  className={`gap-sm ${
                    isActive ? 'border-2 border-accent bg-bg-card shadow-sm' : ''
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-xs">
                      {isActive ? (
                        <View className="flex-row items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5 border border-accent">
                          <Ionicons name="checkmark-circle" size={12} color={colors.accent} />
                          <Text className="text-[11px] font-bold text-accent">
                            {language === 'tr' ? 'AKTİF PROGRAM' : 'ACTIVE PROGRAM'}
                          </Text>
                        </View>
                      ) : (
                        <View className="rounded-full bg-bg-elevated px-2 py-0.5">
                          <Text className="text-[10px] font-semibold text-text-muted">
                            {language === 'tr' ? 'Kayıtlı Program' : 'Saved Program'}
                          </Text>
                        </View>
                      )}

                      {goalInfo && (
                        <View
                          className="rounded-full px-2 py-0.5"
                          style={{ backgroundColor: `${goalInfo.color}20` }}
                        >
                          <Text className="text-[10px] font-semibold" style={{ color: goalInfo.color }}>
                            {goalInfo.label}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text className="text-xs text-text-muted">
                      {program.days.length} {t('day_label')} · {totalExercises} {t('exercises_count_label')}
                    </Text>
                  </View>

                  <Text className="text-lg font-bold text-text-primary">{program.name}</Text>

                  {program.description && (
                    <Text className="text-xs text-text-muted leading-relaxed" numberOfLines={2}>
                      {program.description}
                    </Text>
                  )}

                  {/* Günler Önizlemesi */}
                  {program.days.length > 0 && (
                    <View className="flex-row flex-wrap gap-1 mt-0.5">
                      {program.days.map((d, dIdx) => (
                        <View
                          key={d.clientUuid || dIdx}
                          className="rounded bg-bg-elevated/60 px-2 py-0.5"
                        >
                          <Text className="text-[10px] font-medium text-text-secondary">
                            {d.name || `${dIdx + 1}. Gün`} ({d.exercises.length})
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Aksiyon Butonları */}
                  <View className="mt-xs flex-row gap-sm border-t border-bg-elevated pt-sm">
                    {isActive ? (
                      <>
                        <Button
                          label={language === 'tr' ? 'Antrenmanı Başlat' : 'Start Workout'}
                          variant="primary"
                          className="flex-1 min-h-[38px]"
                          onPress={() => router.navigate('/workout')}
                        />
                        <Button
                          label={language === 'tr' ? '✏️ Düzenle' : '✏️ Edit'}
                          variant="secondary"
                          className="flex-1 min-h-[38px]"
                          onPress={() =>
                            router.push({
                              pathname: '/workout/editor',
                              params: { programId: program.clientUuid },
                            })
                          }
                        />
                      </>
                    ) : (
                      <>
                        <Button
                          label={
                            activatingId === program.clientUuid
                              ? (language === 'tr' ? 'Ayarlanıyor…' : 'Activating…')
                              : (language === 'tr' ? '⚡ Aktif Yap' : '⚡ Set Active')
                          }
                          variant="primary"
                          className="flex-1 min-h-[38px]"
                          disabled={activatingId === program.clientUuid}
                          onPress={() => handleSwitchActive(program.clientUuid, program.name)}
                        />
                        <Button
                          label={language === 'tr' ? 'İncele & Düzenle' : 'View & Edit'}
                          variant="secondary"
                          className="flex-1 min-h-[38px]"
                          onPress={() =>
                            router.push({
                              pathname: '/workout/editor',
                              params: { programId: program.clientUuid },
                            })
                          }
                        />
                      </>
                    )}
                  </View>
                </Card>
              );
            })
          )}
        </View>
      )}

      {/* TAB 2: HAZIR ŞABLONLAR */}
      {activeTab === 'templates' && (
        <View className="gap-md">
          <View className="gap-xs">
            <Text className="text-xs text-text-muted">
              {language === 'tr'
                ? 'Hedefine ve haftalık zamanına en uygun bilimsel olarak hazırlanmış hazır antrenman şablonunu seç ve hemen başla.'
                : 'Choose a scientifically designed workout template tailored to your goal and schedule.'}
            </Text>
          </View>

          {templates.map((template) => {
            const goalInfo = template.goal ? GOAL_LABELS[template.goal] : null;
            const totalExercises = template.days.reduce((acc, d) => acc + d.exercises.length, 0);

            return (
              <Pressable
                key={template.clientUuid}
                onPress={() =>
                  router.push({
                    pathname: `/workout/templates/${template.clientUuid}`,
                    params: from ? { from } : undefined,
                  })
                }
              >
                {({ pressed }) => (
                  <Card className={`gap-sm ${pressed ? 'opacity-80' : ''}`}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-xs">
                        {goalInfo && (
                          <View
                            className="rounded-full px-sm py-xs"
                            style={{ backgroundColor: `${goalInfo.color}20` }}
                          >
                            <Text className="text-xs font-semibold" style={{ color: goalInfo.color }}>
                              {goalInfo.label}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs text-text-muted">
                        {template.daysPerWeek} {t('day_label')} / {language === 'tr' ? 'Hafta' : 'Week'}
                      </Text>
                    </View>

                    <Text className="text-lg font-bold text-text-primary">{template.name}</Text>

                    {template.description && (
                      <Text className="text-xs leading-relaxed text-text-muted" numberOfLines={2}>
                        {template.description}
                      </Text>
                    )}

                    <View className="mt-xs flex-row items-center justify-between border-t border-bg-elevated pt-sm">
                      <Text className="text-xs font-medium text-text-muted">
                        {template.days.length} {t('day_label')} · {totalExercises} {t('exercises_count_label')}
                      </Text>
                      <Text className="text-xs font-semibold text-accent-alt">
                        {language === 'tr' ? 'İncele & Uygula →' : 'View & Apply →'}
                      </Text>
                    </View>
                  </Card>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
      </ScrollView>
    </>
  );
}
