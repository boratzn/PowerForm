import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card } from '../../../../src/components/ui';
import { colors } from '../../../../src/constants/theme';
import { getProgramById, type ProgramDetail } from '../../../../src/db/programs';
import { useProgramStore } from '../../../../src/stores/useProgramStore';
import { useLanguageStore } from '../../../../src/stores/useLanguageStore';

const GOAL_LABELS: Record<string, { label: string; color: string }> = {
  hypertrophy: { label: 'Hipertrofi (Kas)', color: '#38BDF8' },
  strength: { label: 'Kuvvet / Güç', color: '#FBBF24' },
  fat_loss: { label: 'Yağ Yakımı', color: '#F87171' },
  recomp: { label: 'Recomp', color: '#A78BFA' },
  general_health: { label: 'Genel Kondisyon', color: '#4ADE80' },
};

export default function TemplateDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId: string }>();

  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const activateProgram = useProgramStore((s) => s.activateProgram);
  const cloneAndActivateTemplate = useProgramStore((s) => s.cloneAndActivateTemplate);

  useEffect(() => {
    if (!templateId) return;
    setLoading(true);
    getProgramById(templateId)
      .then((p) => {
        setProgram(p);
      })
      .catch((err) => {
        console.error('Program detayı alınamadı:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [templateId]);

  const activeDay = useMemo(() => {
    if (!program || program.days.length === 0) return null;
    return program.days[selectedDayIdx] ?? program.days[0];
  }, [program, selectedDayIdx]);

  const handleActivate = async () => {
    if (!program) return;
    try {
      setActivating(true);
      if (program.isTemplate) {
        await cloneAndActivateTemplate(program.clientUuid);
      } else {
        await activateProgram(program.clientUuid);
      }
      Alert.alert(
        language === 'tr' ? 'Başarılı' : 'Success',
        `"${program.name}" ${language === 'tr' ? 'aktif antrenman programın olarak ayarlandı.' : 'has been set as your active workout program.'}`,
        [
          {
            text: t('ok'),
            onPress: () => router.navigate('/workout'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(t('error'), err?.message ?? 'Program aktifleştirilirken bir sorun oluştu.');
    } finally {
      setActivating(false);
    }
  };

  const handleCustomize = () => {
    if (!program) return;
    if (program.isTemplate) {
      router.push({
        pathname: '/workout/editor',
        params: { cloneFromId: program.clientUuid },
      });
    } else {
      router.push({
        pathname: '/workout/editor',
        params: { programId: program.clientUuid },
      });
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary">
        <ActivityIndicator size="large" color={colors.accent} />
        <Text className="mt-md text-sm text-text-muted">Program yükleniyor...</Text>
      </View>
    );
  }

  if (!program) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary p-lg">
        <Text className="text-base text-text-muted">Şablon bulunamadı.</Text>
        <Button label="Geri Dön" variant="secondary" className="mt-md" onPress={() => router.back()} />
      </View>
    );
  }

  const goalInfo = program.goal ? GOAL_LABELS[program.goal] : null;

  return (
    <View className="flex-1 bg-bg-primary">
      <ScrollView
        className="flex-1 px-lg"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 100, gap: 16 }}
      >
        {/* Başlık ve Etiketler */}
        <View className="gap-xs">
          <View className="flex-row flex-wrap items-center gap-xs">
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
            <View className="rounded-full bg-bg-card px-sm py-xs">
              <Text className="text-xs font-medium text-text-muted">
                {program.daysPerWeek} Gün / Hafta
              </Text>
            </View>
            {program.durationWeeks && (
              <View className="rounded-full bg-bg-card px-sm py-xs">
                <Text className="text-xs font-medium text-text-muted">
                  {program.durationWeeks} Hafta
                </Text>
              </View>
            )}
          </View>

          <Text className="mt-xs text-2xl font-bold text-text-primary">{program.name}</Text>

          {program.description && (
            <Text className="mt-xs text-sm leading-relaxed text-text-muted">
              {program.description}
            </Text>
          )}
        </View>

        {/* Gün Seçici Sekmeler */}
        <View className="gap-xs">
          <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Program Günleri ({program.days.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {program.days.map((day, idx) => {
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
                    {idx + 1}. Gün
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

        {/* Aktif Gün Detayı & Egzersiz Listesi */}
        {activeDay && (
          <View className="gap-md">
            <View className="flex-row items-center justify-between border-b border-bg-elevated pb-xs">
              <View>
                <Text className="text-lg font-bold text-text-primary">{activeDay.name}</Text>
                {activeDay.focus && (
                  <Text className="text-xs text-accent-alt">Hedef: {activeDay.focus}</Text>
                )}
              </View>
              <Text className="text-xs font-medium text-text-muted">
                {activeDay.exercises.length} Egzersiz
              </Text>
            </View>

            {activeDay.notes && (
              <Card className="bg-bg-elevated/40">
                <Text className="text-xs italic text-text-muted">{activeDay.notes}</Text>
              </Card>
            )}

            {/* Egzersiz Kartları */}
            <View className="gap-sm">
              {activeDay.exercises.map((item, index) => {
                const ex = item.exercise;
                const displayName = ex.nameTr || ex.nameEn;
                const repText =
                  item.repMin && item.repMax
                    ? `${item.repMin}-${item.repMax} tekrar`
                    : item.repMin
                    ? `${item.repMin} tekrar`
                    : null;

                return (
                  <Card key={item.clientUuid} className="gap-sm">
                    <View className="flex-row items-center gap-md">
                      {/* Küçük GIF/Thumbnail Önizleme */}
                      <View className="h-14 w-14 overflow-hidden rounded-md bg-bg-card">
                        <Image
                          source={{ uri: ex.gifUrl || ex.imageUrl || '' }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      </View>

                      {/* Egzersiz Başlıkları */}
                      <View className="flex-1">
                        <View className="flex-row items-center gap-xs">
                          <Text className="text-xs font-bold text-accent">#{index + 1}</Text>
                          <Text className="flex-1 text-base font-semibold text-text-primary" numberOfLines={1}>
                            {displayName}
                          </Text>
                        </View>
                        {ex.nameTr && (
                          <Text className="text-xs text-text-muted" numberOfLines={1}>
                            {ex.nameEn}
                          </Text>
                        )}
                        <View className="mt-xs flex-row items-center gap-xs">
                          {ex.primaryMuscles && ex.primaryMuscles[0] && (
                            <Text className="text-[10px] font-semibold text-text-muted">
                              {ex.primaryMuscles[0].toUpperCase()}
                            </Text>
                          )}
                          <Text className="text-[10px] text-text-muted">·</Text>
                          <Text className="text-[10px] capitalize text-text-muted">{ex.equipment}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Hedef Set / Tekrar / RIR / Dinlenme Paneli */}
                    <View className="flex-row flex-wrap items-center gap-xs rounded-md bg-bg-elevated/50 p-xs px-sm">
                      <View className="flex-row items-center gap-1">
                        <Text className="text-xs font-bold text-accent">{item.targetSets}</Text>
                        <Text className="text-xs text-text-muted">Set</Text>
                      </View>

                      {repText && (
                        <>
                          <Text className="text-xs text-text-muted">×</Text>
                          <Text className="text-xs font-semibold text-text-primary">{repText}</Text>
                        </>
                      )}

                      {item.targetRir !== null && (
                        <>
                          <Text className="text-xs text-text-muted">·</Text>
                          <View className="rounded bg-accent-alt/20 px-1 py-0.5">
                            <Text className="text-[10px] font-bold text-accent-alt">
                              RIR {item.targetRir}
                            </Text>
                          </View>
                        </>
                      )}

                      {item.restSeconds !== null && (
                        <>
                          <Text className="text-xs text-text-muted">·</Text>
                          <Text className="text-xs text-text-muted">{item.restSeconds}s mola</Text>
                        </>
                      )}
                    </View>

                    {item.notes && (
                      <Text className="text-xs italic text-text-muted">{item.notes}</Text>
                    )}
                  </Card>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Alt Butonlar (Sticky) */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-bg-elevated bg-bg-primary/95 p-md backdrop-blur-md"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row gap-sm">
          <Button
            label={
              program.isTemplate
                ? (language === 'tr' ? 'Kopyala & Düzenle' : 'Copy & Edit')
                : (language === 'tr' ? 'Programı Düzenle' : 'Edit Program')
            }
            variant="secondary"
            className="flex-1"
            onPress={handleCustomize}
            disabled={activating}
          />
          <Button
            label={
              activating
                ? (language === 'tr' ? 'Aktifleştiriliyor...' : 'Activating...')
                : program.isTemplate
                ? (language === 'tr' ? 'Programı Başlat' : 'Start Program')
                : (language === 'tr' ? 'Bu Programı Uygula' : 'Apply Program')
            }
            variant="primary"
            className="flex-[1.5]"
            onPress={handleActivate}
            disabled={activating}
          />
        </View>
      </View>
    </View>
  );
}
