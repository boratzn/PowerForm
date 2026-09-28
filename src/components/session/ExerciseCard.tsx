import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { colors } from '../../constants/theme';
import { getExerciseDisplayName } from '../../lib/i18n';
import { useLanguageStore } from '../../stores/useLanguageStore';
import type { ActiveExercise } from '../../stores/useSessionStore';
import { Card, ModernConfirmModal } from '../ui';
import { type ActiveField, SetRow } from './SetRow';

type ActiveFieldRef = { setClientUuid: string; field: ActiveField } | null;

type ExerciseCardProps = {
  exercise: ActiveExercise;
  activeFieldRef: ActiveFieldRef;
  onFieldPress: (setClientUuid: string, field: ActiveField) => void;
  onToggleComplete: (setClientUuid: string) => void;
  onLongPressSet: (setClientUuid: string) => void;
  onAddSet: () => void;
  onRemoveExercise: () => void;
  onUpdateNotes?: (notes: string) => void;
  onPressExercise?: () => void;
};

function formatPast(weightKg: number | null, reps: number | null, repsLabel = 'tekrar'): string {
  if (weightKg == null && reps == null) return '—';
  if (weightKg == null) return `${reps} ${repsLabel}`;
  return `${weightKg}×${reps ?? '?'}`;
}

export function ExerciseCard({
  exercise,
  activeFieldRef,
  onFieldPress,
  onToggleComplete,
  onLongPressSet,
  onAddSet,
  onRemoveExercise,
  onUpdateNotes,
  onPressExercise,
}: ExerciseCardProps) {
  const t = useLanguageStore((s) => s.t);
  const lang = useLanguageStore((s) => s.language);

  const [editingNotes, setEditingNotes] = useState(false);
  const [noteText, setNoteText] = useState(exercise.notes || '');
  const [removeConfirmVisible, setRemoveConfirmVisible] = useState(false);

  const pastSummary = exercise.lastPerformance.length
    ? exercise.lastPerformance.map((p) => formatPast(p.weightKg, p.reps, t('reps'))).join(', ')
    : t('no_history');

  const displayName = getExerciseDisplayName(exercise, lang);

  const saveNotes = () => {
    onUpdateNotes?.(noteText.trim());
    setEditingNotes(false);
  };

  return (
    <Card className="gap-xs">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-xs">
          <Pressable
            onPress={onPressExercise}
            className="flex-row items-center gap-xs active:opacity-70"
          >
            <Text className="text-lg font-semibold text-text-primary" numberOfLines={2}>
              {displayName}
            </Text>
            <View className="h-5 w-5 items-center justify-center rounded-full bg-accent/15">
              <Ionicons name="stats-chart" size={11} color={colors.accent} />
            </View>
          </Pressable>
          <Text className="text-xs text-text-muted mt-0.5">Geçen sefer: {pastSummary}</Text>

          {/* Egzersiz Notu */}
          {editingNotes ? (
            <View className="flex-row items-center gap-xs rounded-input bg-bg-surface px-sm py-1 border border-bg-elevated mt-1.5">
              <TextInput
                placeholder="Egzersiz notu (koltuk 4, geniş tutuş vb.)..."
                placeholderTextColor="#8A97A6"
                value={noteText}
                onChangeText={setNoteText}
                className="flex-1 text-xs text-text-primary py-1"
                autoFocus
              />
              <Pressable onPress={saveNotes} className="px-2 py-1 bg-accent rounded">
                <Text className="text-[10px] font-bold text-bg-primary">Kaydet</Text>
              </Pressable>
            </View>
          ) : exercise.notes ? (
            <Pressable
              onPress={() => setEditingNotes(true)}
              className="flex-row items-center gap-xs rounded bg-bg-surface/60 px-sm py-1 mt-1.5 active:opacity-70"
            >
              <Text className="text-[11px] text-accent font-medium">📝 {exercise.notes}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setEditingNotes(true)}
              className="self-start py-0.5 mt-1 active:opacity-70"
            >
              <Text className="text-[11px] text-text-muted">+ Not ekle</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setRemoveConfirmVisible(true)}
          className="h-10 w-10 items-center justify-center -mr-2"
        >
          <Text className="text-xl text-text-muted">⋮</Text>
        </Pressable>
      </View>

      <View className="mt-xs border-t border-bg-elevated pt-xs">
        <View className="flex-row items-center gap-1.5 pb-xs">
          <Text className="w-5 text-center text-[10px] font-bold uppercase text-text-muted">{t('set')}</Text>
          <Text className="w-12 text-center text-[10px] font-bold uppercase text-text-muted">{t('previous')}</Text>
          <Text className="w-[54px] text-center text-[10px] font-bold uppercase text-text-muted">{t('kg')}</Text>
          <Text className="w-[48px] text-center text-[10px] font-bold uppercase text-text-muted">{t('reps')}</Text>
          <Text className="w-[38px] text-center text-[10px] font-bold uppercase text-text-muted">{t('rir')}</Text>
          <Text className="flex-1 text-center text-[10px] font-bold uppercase text-accent">✓</Text>
        </View>

        {exercise.sets.map((s) => (
          <SetRow
            key={s.clientUuid}
            set={s}
            pastLabel={formatPast(
              exercise.lastPerformance.find((p) => p.setIndex === s.setIndex)?.weightKg ?? null,
              exercise.lastPerformance.find((p) => p.setIndex === s.setIndex)?.reps ?? null,
              t('reps')
            )}
            activeField={activeFieldRef?.setClientUuid === s.clientUuid ? activeFieldRef.field : null}
            onFieldPress={(field) => onFieldPress(s.clientUuid, field)}
            onToggleComplete={() => onToggleComplete(s.clientUuid)}
            onLongPress={() => onLongPressSet(s.clientUuid)}
          />
        ))}
      </View>

      <Pressable onPress={onAddSet} className="mt-xs min-h-[48px] items-center justify-center rounded-input bg-bg-elevated active:opacity-70">
        <Text className="text-sm font-medium text-text-primary">{t('add_set')}</Text>
      </Pressable>

      <ModernConfirmModal
        visible={removeConfirmVisible}
        title={displayName}
        description={t('remove_exercise_confirm')}
        icon="trash-outline"
        confirmText={t('remove_exercise')}
        cancelText={t('cancel')}
        isDestructive
        onConfirm={() => {
          setRemoveConfirmVisible(false);
          onRemoveExercise();
        }}
        onCancel={() => setRemoveConfirmVisible(false)}
      />
    </Card>
  );
}
