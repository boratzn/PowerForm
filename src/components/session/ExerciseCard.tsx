import { Alert, Pressable, Text, View } from 'react-native';

import type { ActiveExercise } from '../../stores/useSessionStore';
import { Card } from '../ui';
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
};

function formatPast(weightKg: number | null, reps: number | null): string {
  if (weightKg == null && reps == null) return '—';
  if (weightKg == null) return `${reps} tekrar`;
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
}: ExerciseCardProps) {
  const pastSummary = exercise.lastPerformance.length
    ? exercise.lastPerformance.map((p) => formatPast(p.weightKg, p.reps)).join(', ')
    : 'Geçmiş yok';

  const showMenu = () => {
    Alert.alert(exercise.nameEn, undefined, [
      { text: 'Egzersizi kaldır', style: 'destructive', onPress: onRemoveExercise },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  return (
    <Card className="gap-xs">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-text-primary">{exercise.nameEn}</Text>
          <Text className="text-xs text-text-muted">Geçen sefer: {pastSummary}</Text>
        </View>
        <Pressable onPress={showMenu} className="h-12 w-12 items-center justify-center">
          <Text className="text-xl text-text-muted">⋮</Text>
        </Pressable>
      </View>

      <View className="mt-xs border-t border-bg-elevated pt-xs">
        <View className="flex-row items-center gap-sm pb-xs">
          <Text className="w-6 text-center text-[10px] uppercase text-text-muted">Set</Text>
          <Text className="w-16 text-center text-[10px] uppercase text-text-muted">Önceki</Text>
          <Text className="w-16 text-center text-[10px] uppercase text-text-muted">Kg</Text>
          <Text className="w-14 text-center text-[10px] uppercase text-text-muted">Tekrar</Text>
          <Text className="w-11 text-center text-[10px] uppercase text-text-muted">Rir</Text>
        </View>

        {exercise.sets.map((s) => (
          <SetRow
            key={s.clientUuid}
            set={s}
            pastLabel={formatPast(
              exercise.lastPerformance.find((p) => p.setIndex === s.setIndex)?.weightKg ?? null,
              exercise.lastPerformance.find((p) => p.setIndex === s.setIndex)?.reps ?? null
            )}
            activeField={activeFieldRef?.setClientUuid === s.clientUuid ? activeFieldRef.field : null}
            onFieldPress={(field) => onFieldPress(s.clientUuid, field)}
            onToggleComplete={() => onToggleComplete(s.clientUuid)}
            onLongPress={() => onLongPressSet(s.clientUuid)}
          />
        ))}
      </View>

      <Pressable onPress={onAddSet} className="mt-xs min-h-[48px] items-center justify-center rounded-input bg-bg-elevated active:opacity-70">
        <Text className="text-sm font-medium text-text-primary">+ Set Ekle</Text>
      </Pressable>
    </Card>
  );
}
