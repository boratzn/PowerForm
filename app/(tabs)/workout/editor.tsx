import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { ExercisePickerSheet, ExerciseProgressModal } from '../../../src/components/session';
import { Button, Card, Input } from '../../../src/components/ui';
import { colors } from '../../../src/constants/theme';
import { getProgramById, saveCustomProgram } from '../../../src/db/programs';
import type { LocalExercise } from '../../../src/db/queries';
import { generateUuid } from '../../../src/lib/uuid';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { useProgramStore } from '../../../src/stores/useProgramStore';

type GoalType = 'hypertrophy' | 'strength' | 'fat_loss' | 'recomp' | 'general_health';

const GOALS: { key: GoalType; label: string }[] = [
  { key: 'hypertrophy', label: 'Hipertrofi (Kas)' },
  { key: 'strength', label: 'Kuvvet / Güç' },
  { key: 'fat_loss', label: 'Yağ Yakımı' },
  { key: 'recomp', label: 'Recomp' },
  { key: 'general_health', label: 'Genel Kondisyon' },
];

type EditorExercise = {
  tempId: string;
  exerciseId: string;
  nameEn: string;
  nameTr: string | null;
  equipment: string;
  imageUrl: string | null;
  gifUrl: string | null;
  primaryMuscles: string[] | null;
  targetSets: number | string;
  repMin: number | string;
  repMax: number | string;
  targetRir: number | string | null;
  restSeconds: number | string;
  notes: string;
};

type EditorDay = {
  tempId: string;
  name: string;
  focus: string;
  notes: string;
  exercises: EditorExercise[];
};

export default function ProgramEditorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { programId, cloneFromId } = useLocalSearchParams<{ programId?: string; cloneFromId?: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const exercisesContainerYRef = useRef(0);
  const cardLayoutsRef = useRef<Record<string, number>>({});
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(300);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        if (e.endCoordinates?.height) {
          setKeyboardHeight(e.endCoordinates.height);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToExercise = (tempId: string) => {
    const containerY = exercisesContainerYRef.current || 0;
    const cardY = cardLayoutsRef.current[tempId] || 0;
    const targetY = Math.max(0, containerY + cardY - 20);

    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: targetY,
        animated: true,
      });
    }, 80);
  };

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState<GoalType>('hypertrophy');
  const [durationWeeks, setDurationWeeks] = useState('8');
  const [setActiveImmediately, setSetActiveImmediately] = useState(true);

  // Günler listesi
  const [days, setDays] = useState<EditorDay[]>([
    {
      tempId: generateUuid(),
      name: '1. Gün',
      focus: 'Tüm Vücut',
      notes: '',
      exercises: [],
    },
  ]);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  // Egzersiz ekleme ve performans detay modalı
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedExerciseForProgress, setSelectedExerciseForProgress] = useState<string | null>(null);

  // Mevcut program veya klonlanacak şablon varsa verileri yükle
  useEffect(() => {
    const targetId = programId || cloneFromId;
    if (!targetId) return;

    setLoading(true);
    getProgramById(targetId)
      .then((p) => {
        if (!p) return;
        setName(cloneFromId ? `${p.name} (Özelleştirilmiş)` : p.name);
        setDescription(p.description ?? '');
        if (p.goal) setGoal(p.goal);
        if (p.durationWeeks) setDurationWeeks(String(p.durationWeeks));

        if (p.days.length > 0) {
          const loadedDays: EditorDay[] = p.days.map((d) => ({
            tempId: generateUuid(),
            name: d.name,
            focus: d.focus ?? '',
            notes: d.notes ?? '',
            exercises: d.exercises.map((e) => ({
              tempId: generateUuid(),
              exerciseId: e.exerciseId,
              nameEn: e.exercise.nameEn,
              nameTr: e.exercise.nameTr,
              equipment: e.exercise.equipment,
              imageUrl: e.exercise.imageUrl,
              gifUrl: e.exercise.gifUrl,
              primaryMuscles: e.exercise.primaryMuscles,
              targetSets: e.targetSets || 3,
              repMin: e.repMin || 8,
              repMax: e.repMax || 12,
              targetRir: e.targetRir ?? 2,
              restSeconds: e.restSeconds || 90,
              notes: e.notes ?? '',
            })),
          }));
          setDays(loadedDays);
        }
      })
      .catch((err) => console.error('Program yükleme hatası:', err))
      .finally(() => setLoading(false));
  }, [programId, cloneFromId]);

  const activeDay = days[selectedDayIdx] ?? days[0];

  const handleAddDay = () => {
    const nextNum = days.length + 1;
    const newDay: EditorDay = {
      tempId: generateUuid(),
      name: `${nextNum}. Gün`,
      focus: '',
      notes: '',
      exercises: [],
    };
    setDays([...days, newDay]);
    setSelectedDayIdx(days.length);
  };

  const handleRemoveDay = (index: number) => {
    if (days.length <= 1) {
      Alert.alert('Uyarı', 'Programda en az bir gün olmalıdır.');
      return;
    }
    Alert.alert('Günü Sil', `"${days[index].name}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          const updated = days.filter((_, i) => i !== index);
          setDays(updated);
          setSelectedDayIdx(Math.max(0, index - 1));
        },
      },
    ]);
  };

  const updateActiveDayField = (field: keyof EditorDay, value: string) => {
    setDays((prev) =>
      prev.map((d, idx) => (idx === selectedDayIdx ? { ...d, [field]: value } : d))
    );
  };

  const handleAddExercise = (exercise: LocalExercise) => {
    const newEx: EditorExercise = {
      tempId: generateUuid(),
      exerciseId: exercise.id,
      nameEn: exercise.nameEn,
      nameTr: exercise.nameTr,
      equipment: exercise.equipment,
      imageUrl: exercise.imageUrl,
      gifUrl: exercise.gifUrl,
      primaryMuscles: exercise.primaryMuscles ? JSON.parse(JSON.stringify(exercise.primaryMuscles)) : null,
      targetSets: 3,
      repMin: 8,
      repMax: 12,
      targetRir: 2,
      restSeconds: 90,
      notes: '',
    };

    setDays((prev) =>
      prev.map((d, idx) =>
        idx === selectedDayIdx ? { ...d, exercises: [...d.exercises, newEx] } : d
      )
    );
  };

  const handleRemoveExercise = (exerciseTempId: string) => {
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === selectedDayIdx
          ? { ...d, exercises: d.exercises.filter((e) => e.tempId !== exerciseTempId) }
          : d
      )
    );
  };

  const updateExerciseField = (
    exerciseTempId: string,
    field: keyof EditorExercise,
    value: any
  ) => {
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === selectedDayIdx
          ? {
              ...d,
              exercises: d.exercises.map((e) =>
                e.tempId === exerciseTempId ? { ...e, [field]: value } : e
              ),
            }
          : d
      )
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Lütfen program adı girin.');
      return;
    }

    const hasAnyExercise = days.some((d) => d.exercises.length > 0);
    if (!hasAnyExercise) {
      Alert.alert('Hata', 'Lütfen programa en az bir egzersiz ekleyin.');
      return;
    }

    if (!userId) {
      Alert.alert('Hata', 'Program kaydetmek için oturum açık olmalıdır.');
      return;
    }

    try {
      setSaving(true);
      await saveCustomProgram(
        {
          clientUuid: programId, // Düzenleme ise aynı id, yoksa yeni oluşturulur
          name: name.trim(),
          description: description.trim() || undefined,
          goal,
          daysPerWeek: days.length,
          durationWeeks: parseInt(durationWeeks, 10) || 8,
          setActive: setActiveImmediately,
          days: days.map((d) => ({
            name: d.name.trim() || 'Gün',
            focus: d.focus.trim() || undefined,
            notes: d.notes.trim() || undefined,
            exercises: d.exercises.map((e, idx) => ({
              exerciseId: e.exerciseId,
              orderIndex: idx + 1,
              targetSets: parseInt(String(e.targetSets), 10) || 3,
              repMin: parseInt(String(e.repMin), 10) || 8,
              repMax: parseInt(String(e.repMax), 10) || 12,
              targetRir: e.targetRir !== null && e.targetRir !== '' ? parseInt(String(e.targetRir), 10) : undefined,
              restSeconds: parseInt(String(e.restSeconds), 10) || 90,
              notes: e.notes.trim() || undefined,
            })),
          })),
        },
        userId
      );

      await Promise.all([
        useProgramStore.getState().loadActiveProgram(),
        useProgramStore.getState().loadUserPrograms(),
      ]);

      Alert.alert('Başarılı', 'Programınız başarıyla kaydedildi!', [
        {
          text: 'Tamam',
          onPress: () => router.navigate('/workout'),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Hata', err?.message ?? 'Program kaydedilemedi.');
    } finally {
      setSaving(false);
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

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-primary"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-lg"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: isKeyboardVisible ? Math.max(340, keyboardHeight + 80) : insets.bottom + 100,
          gap: 16,
        }}
      >
        {/* Temel Bilgiler Kartı */}
        <Card className="gap-md">
          <Text className="text-base font-bold text-text-primary">Program Bilgileri</Text>

          <View className="gap-xs">
            <Text className="text-xs font-semibold text-text-muted">Program Adı *</Text>
            <Input
              placeholder="Örn: 4 Günlük Hipertrofi Programım"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="gap-xs">
            <Text className="text-xs font-semibold text-text-muted">Hedef</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {GOALS.map((g) => {
                const selected = goal === g.key;
                return (
                  <Pressable
                    key={g.key}
                    onPress={() => setGoal(g.key)}
                    className={`rounded-full border px-md py-xs ${
                      selected ? 'border-accent bg-accent/20' : 'border-bg-elevated bg-bg-card'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        selected ? 'text-accent' : 'text-text-muted'
                      }`}
                    >
                      {g.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View className="flex-row gap-md">
            <View className="flex-1 gap-xs">
              <Text className="text-xs font-semibold text-text-muted">Süre (Hafta)</Text>
              <Input
                placeholder="8"
                keyboardType="numeric"
                value={durationWeeks}
                onChangeText={setDurationWeeks}
              />
            </View>
            <View className="flex-1 gap-xs">
              <Text className="text-xs font-semibold text-text-muted">Haftalık Gün</Text>
              <View className="min-h-[48px] justify-center rounded-card border border-bg-elevated bg-bg-card px-md">
                <Text className="text-base font-semibold text-text-primary">{days.length} Gün</Text>
              </View>
            </View>
          </View>

          <View className="gap-xs">
            <Text className="text-xs font-semibold text-text-muted">Açıklama / Notlar</Text>
            <Input
              placeholder="İsteğe bağlı program açıklaması..."
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <View className="flex-row items-center justify-between border-t border-bg-elevated pt-sm">
            <Text className="text-sm font-medium text-text-primary">
              Kaydedince Aktif Program Yap
            </Text>
            <Switch
              value={setActiveImmediately}
              onValueChange={setSetActiveImmediately}
              trackColor={{ false: colors.bgElevated, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </Card>

        {/* Gün Seçici & Yönetimi */}
        <View className="gap-xs">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Program Günleri ({days.length})
            </Text>
            <Pressable onPress={handleAddDay} className="flex-row items-center gap-1 active:opacity-70">
              <Text className="text-xs font-bold text-accent">+ Gün Ekle</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {days.map((day, idx) => {
              const isSelected = idx === selectedDayIdx;
              return (
                <Pressable
                  key={day.tempId}
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

        {/* Seçili Gün Ayarları ve Egzersizler */}
        {activeDay && (
          <View className="gap-md">
            <Card className="gap-sm">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-text-primary">
                  {selectedDayIdx + 1}. Gün Ayarları
                </Text>
                {days.length > 1 && (
                  <Pressable onPress={() => handleRemoveDay(selectedDayIdx)}>
                    <Text className="text-xs font-semibold text-danger">Günü Sil</Text>
                  </Pressable>
                )}
              </View>

              <View className="flex-row gap-sm">
                <View className="flex-1 gap-xs">
                  <Text className="text-xs text-text-muted">Gün İsmi</Text>
                  <Input
                    placeholder="Örn: İtiş (Göğüs-Omuz)"
                    value={activeDay.name}
                    onChangeText={(val) => updateActiveDayField('name', val)}
                  />
                </View>
                <View className="flex-1 gap-xs">
                  <Text className="text-xs text-text-muted">Odak Kas Grubu</Text>
                  <Input
                    placeholder="Örn: Göğüs, Triceps"
                    value={activeDay.focus}
                    onChangeText={(val) => updateActiveDayField('focus', val)}
                  />
                </View>
              </View>
            </Card>

            {/* Egzersiz Listesi */}
            <View
              className="gap-xs"
              onLayout={(e) => {
                exercisesContainerYRef.current = e.nativeEvent.layout.y;
              }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-text-primary">
                  Egzersizler ({activeDay.exercises.length})
                </Text>
                <Pressable
                  onPress={() => setPickerVisible(true)}
                  className="rounded bg-accent/20 px-sm py-xs active:opacity-70"
                >
                  <Text className="text-xs font-bold text-accent">+ Egzersiz Ekle</Text>
                </Pressable>
              </View>

              {activeDay.exercises.length === 0 ? (
                <Card className="items-center justify-center py-lg">
                  <Text className="text-sm text-text-muted">Bu güne henüz egzersiz eklenmedi.</Text>
                  <Button
                    label="Egzersiz Ekle"
                    variant="secondary"
                    className="mt-md"
                    onPress={() => setPickerVisible(true)}
                  />
                </Card>
              ) : (
                activeDay.exercises.map((item, index) => {
                  const displayName = item.nameTr || item.nameEn;

                  return (
                    <View
                      key={item.tempId}
                      onLayout={(e) => {
                        cardLayoutsRef.current[item.tempId] = e.nativeEvent.layout.y;
                      }}
                    >
                      <Card className="gap-sm">
                      {/* Başlık & Silme */}
                      <View className="flex-row items-center justify-between">
                        <Pressable
                          onPress={() => setSelectedExerciseForProgress(item.exerciseId)}
                          className="flex-1 flex-row items-center gap-xs active:opacity-70"
                        >
                          <Text className="text-xs font-bold text-accent">#{index + 1}</Text>
                          <Text className="flex-1 text-base font-semibold text-text-primary" numberOfLines={1}>
                            {displayName}
                          </Text>
                          <Ionicons name="stats-chart" size={12} color={colors.accent} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleRemoveExercise(item.tempId)}
                          className="p-xs"
                        >
                          <Text className="text-xs font-bold text-danger">Kaldır</Text>
                        </Pressable>
                      </View>

                      {/* Görsel ve detaylar */}
                      <View className="flex-row items-center gap-md">
                        <View className="h-12 w-12 overflow-hidden rounded-md bg-bg-elevated">
                          <Image
                            source={{ uri: item.gifUrl || item.imageUrl || '' }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        </View>
                        <View className="flex-1">
                          {item.nameTr && (
                            <Text className="text-xs text-text-muted" numberOfLines={1}>
                              {item.nameEn}
                            </Text>
                          )}
                          <Text className="text-[10px] capitalize text-accent-alt">
                            {item.equipment}
                          </Text>
                        </View>
                      </View>

                      {/* Set, Tekrar, RIR, Mola Form Alanları */}
                      <View className="flex-row flex-wrap gap-xs rounded-md bg-bg-elevated/40 p-xs">
                        <View className="flex-1 min-w-[70px] gap-0.5">
                          <Text className="text-[10px] text-text-muted">Hedef Set</Text>
                          <TextInput
                            keyboardType="numeric"
                            returnKeyType="done"
                            selectTextOnFocus
                            value={item.targetSets !== null && item.targetSets !== undefined ? String(item.targetSets) : ''}
                            placeholder="3"
                            placeholderTextColor={colors.textMuted}
                            onFocus={() => scrollToExercise(item.tempId)}
                            onSubmitEditing={Keyboard.dismiss}
                            onChangeText={(val) =>
                              updateExerciseField(item.tempId, 'targetSets', val)
                            }
                            className="rounded bg-bg-card px-2 py-1 text-center text-xs font-bold text-text-primary"
                          />
                        </View>

                        <View className="flex-1 min-w-[70px] gap-0.5">
                          <Text className="text-[10px] text-text-muted">Min Tekrar</Text>
                          <TextInput
                            keyboardType="numeric"
                            returnKeyType="done"
                            selectTextOnFocus
                            value={item.repMin !== null && item.repMin !== undefined ? String(item.repMin) : ''}
                            placeholder="8"
                            placeholderTextColor={colors.textMuted}
                            onFocus={() => scrollToExercise(item.tempId)}
                            onSubmitEditing={Keyboard.dismiss}
                            onChangeText={(val) =>
                              updateExerciseField(item.tempId, 'repMin', val)
                            }
                            className="rounded bg-bg-card px-2 py-1 text-center text-xs font-bold text-text-primary"
                          />
                        </View>

                        <View className="flex-1 min-w-[70px] gap-0.5">
                          <Text className="text-[10px] text-text-muted">Max Tekrar</Text>
                          <TextInput
                            keyboardType="numeric"
                            returnKeyType="done"
                            selectTextOnFocus
                            value={item.repMax !== null && item.repMax !== undefined ? String(item.repMax) : ''}
                            placeholder="12"
                            placeholderTextColor={colors.textMuted}
                            onFocus={() => scrollToExercise(item.tempId)}
                            onSubmitEditing={Keyboard.dismiss}
                            onChangeText={(val) =>
                              updateExerciseField(item.tempId, 'repMax', val)
                            }
                            className="rounded bg-bg-card px-2 py-1 text-center text-xs font-bold text-text-primary"
                          />
                        </View>

                        <View className="flex-1 min-w-[70px] gap-0.5">
                          <Text className="text-[10px] text-text-muted">Hedef RIR</Text>
                          <TextInput
                            keyboardType="numeric"
                            returnKeyType="done"
                            selectTextOnFocus
                            value={item.targetRir !== null && item.targetRir !== undefined ? String(item.targetRir) : ''}
                            placeholder="-"
                            placeholderTextColor={colors.textMuted}
                            onFocus={() => scrollToExercise(item.tempId)}
                            onSubmitEditing={Keyboard.dismiss}
                            onChangeText={(val) =>
                              updateExerciseField(
                                item.tempId,
                                'targetRir',
                                val
                              )
                            }
                            className="rounded bg-bg-card px-2 py-1 text-center text-xs font-bold text-accent-alt"
                          />
                        </View>

                        <View className="flex-1 min-w-[70px] gap-0.5">
                          <Text className="text-[10px] text-text-muted">Mola (sn)</Text>
                          <TextInput
                            keyboardType="numeric"
                            returnKeyType="done"
                            selectTextOnFocus
                            value={item.restSeconds !== null && item.restSeconds !== undefined ? String(item.restSeconds) : ''}
                            placeholder="90"
                            placeholderTextColor={colors.textMuted}
                            onFocus={() => scrollToExercise(item.tempId)}
                            onSubmitEditing={Keyboard.dismiss}
                            onChangeText={(val) =>
                              updateExerciseField(item.tempId, 'restSeconds', val)
                            }
                            className="rounded bg-bg-card px-2 py-1 text-center text-xs font-bold text-text-primary"
                          />
                        </View>
                      </View>
                    </Card>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Kaydet Alt Çubuğu (Klavye açıkken form alanlarını kapatmaması için gizlenir) */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-bg-elevated bg-bg-primary/95 p-md backdrop-blur-md"
        style={{
          paddingBottom: insets.bottom + 12,
          display: isKeyboardVisible ? 'none' : 'flex',
        }}
      >
        <Button
          label={saving ? 'Kaydediliyor...' : 'Programı Kaydet'}
          variant="primary"
          onPress={handleSave}
          disabled={saving}
        />
      </View>

      <ExercisePickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleAddExercise}
      />

      <ExerciseProgressModal
        visible={!!selectedExerciseForProgress}
        exerciseId={selectedExerciseForProgress}
        onClose={() => setSelectedExerciseForProgress(null)}
      />
    </KeyboardAvoidingView>
  );
}
