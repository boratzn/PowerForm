import { Pressable, Text, View } from 'react-native';

import type { ActiveSet } from '../../stores/useSessionStore';
import { PRBadge } from './PRBadge';

export type ActiveField = 'weightKg' | 'reps' | 'rir';

type SetRowProps = {
  set: ActiveSet;
  pastLabel: string; // "22×9" ya da geçmiş yoksa "—"
  activeField: ActiveField | null;
  onFieldPress: (field: ActiveField) => void;
  onToggleComplete: () => void;
  onLongPress: () => void;
};

function FieldChip({ value, isActive, onPress, width = 64 }: { value: string; isActive: boolean; onPress: () => void; width?: number }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width }}
      className={`min-h-[48px] items-center justify-center rounded-input ${
        isActive ? 'bg-accent-alt' : 'bg-bg-elevated'
      } active:opacity-70`}
    >
      <Text className={`text-base font-medium tabular-nums ${isActive ? 'text-bg-primary' : 'text-text-primary'}`}>
        {value || '—'}
      </Text>
    </Pressable>
  );
}

// Satır düzeni FITNESS_APP_SPEC.md §10.2'deki ASCII diyagramla birebir:
// SET | ÖNCEKİ | KG | TEKRAR | RIR | ✓ — tüm dokunma hedefleri min 48dp (kural 2).
export function SetRow({ set, pastLabel, activeField, onFieldPress, onToggleComplete, onLongPress }: SetRowProps) {
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={400}>
      <View className="flex-row items-center gap-sm py-xs">
        <Text className="w-6 text-center text-sm text-text-muted">{set.setIndex}</Text>
        <Text className="w-16 text-center text-xs text-text-muted">{pastLabel}</Text>

        <FieldChip value={set.weightKg != null ? String(set.weightKg) : ''} isActive={activeField === 'weightKg'} onPress={() => onFieldPress('weightKg')} />
        <FieldChip value={set.reps != null ? String(set.reps) : ''} isActive={activeField === 'reps'} onPress={() => onFieldPress('reps')} width={56} />
        <FieldChip value={set.rir != null ? String(set.rir) : ''} isActive={activeField === 'rir'} onPress={() => onFieldPress('rir')} width={44} />

        <View className="flex-1 flex-row items-center justify-end gap-xs">
          {set.isPr && <PRBadge />}
          <Pressable
            onPress={onToggleComplete}
            disabled={set.reps == null}
            className={`h-12 w-12 items-center justify-center rounded-pill ${
              set.isCompleted ? 'bg-accent' : 'bg-bg-elevated'
            } ${set.reps == null ? 'opacity-40' : ''} active:opacity-70`}
          >
            <Text className={`text-lg ${set.isCompleted ? 'text-bg-primary' : 'text-text-muted'}`}>{set.isCompleted ? '✓' : '○'}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
