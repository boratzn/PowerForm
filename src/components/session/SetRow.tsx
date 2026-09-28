import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../../constants/theme';
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

function FieldChip({ value, isActive, onPress, width = 54 }: { value: string; isActive: boolean; onPress: () => void; width?: number }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width }}
      className={`min-h-[44px] items-center justify-center rounded-input ${
        isActive ? 'bg-accent-alt' : 'bg-bg-elevated'
      } active:opacity-70`}
    >
      <Text className={`text-sm font-semibold tabular-nums ${isActive ? 'text-bg-primary' : 'text-text-primary'}`}>
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
      <View className="relative flex-row items-center gap-1.5 py-1">
        {set.isPr && (
          <View className="absolute -top-1.5 right-1 z-10">
            <PRBadge />
          </View>
        )}

        <Text className="w-5 text-center text-xs font-semibold text-text-muted">{set.setIndex}</Text>
        <Text className="w-12 text-center text-[11px] text-text-muted" numberOfLines={1}>{pastLabel}</Text>

        <FieldChip
          value={set.weightKg != null ? String(set.weightKg) : ''}
          isActive={activeField === 'weightKg'}
          onPress={() => onFieldPress('weightKg')}
          width={54}
        />
        <FieldChip
          value={set.reps != null ? String(set.reps) : ''}
          isActive={activeField === 'reps'}
          onPress={() => onFieldPress('reps')}
          width={48}
        />
        <FieldChip
          value={set.rir != null ? String(set.rir) : ''}
          isActive={activeField === 'rir'}
          onPress={() => onFieldPress('rir')}
          width={38}
        />

        <View className="flex-1 items-center justify-center">
          <Pressable
            onPress={onToggleComplete}
            disabled={set.reps == null}
            hitSlop={6}
            style={[
              {
                height: 40,
                width: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
              },
              set.isCompleted
                ? { backgroundColor: colors.accent }
                : set.reps != null
                  ? {
                      borderWidth: 2,
                      borderColor: colors.accent,
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    }
                  : {
                      borderWidth: 1,
                      borderColor: colors.bgElevated,
                      backgroundColor: colors.bgSurface,
                      opacity: 0.3,
                    },
            ]}
          >
            <Ionicons
              name={set.isCompleted ? 'checkmark-sharp' : 'checkmark'}
              size={set.isCompleted ? 22 : 18}
              color={
                set.isCompleted
                  ? '#0B0F14'
                  : set.reps != null
                    ? colors.accent
                    : colors.textMuted
              }
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
