import { Pressable, Text, View } from 'react-native';

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

type NumericKeypadProps = {
  label: string; // "KG" | "TEKRAR" | "RIR"
  value: string;
  onChangeValue: (next: string) => void;
  allowDecimal?: boolean;
  quickAdjustStep: number;
  sameAsLabel?: string; // "22×9" gibi — bir önceki set özeti
  onSameAsLast?: () => void;
  onConfirm: () => void;
};

function KeyButton({ label, onPress, variant = 'default' }: { label: string; onPress: () => void; variant?: 'default' | 'accent' | 'muted' }) {
  const bg = variant === 'accent' ? 'bg-accent' : variant === 'muted' ? 'bg-bg-elevated' : 'bg-bg-surface';
  const text = variant === 'accent' ? 'text-bg-primary' : 'text-text-primary';
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-[56px] min-w-[56px] flex-1 items-center justify-center rounded-input ${bg} active:opacity-70`}
    >
      <Text className={`text-xl font-semibold ${text}`}>{label}</Text>
    </Pressable>
  );
}

// §10.2 kural 4: sistem klavyesi yerine özel numerik pad — büyük tuşlar,
// +2.5/-2.5 (veya reps için +1/-1) kısayolları, "aynısı" butonu.
// Ekranın alt kısmına sabitlenir (kural 1: dokunmatik hedefler alt 2/3'te).
export function NumericKeypad({
  label,
  value,
  onChangeValue,
  allowDecimal = false,
  quickAdjustStep,
  sameAsLabel,
  onSameAsLast,
  onConfirm,
}: NumericKeypadProps) {
  const appendDigit = (d: string) => onChangeValue(value + d);
  const backspace = () => onChangeValue(value.slice(0, -1));
  const appendDecimal = () => {
    if (!value.includes('.')) onChangeValue(value + '.');
  };
  const quickAdjust = (delta: number) => {
    const current = parseFloat(value || '0') || 0;
    const next = Math.max(0, current + delta);
    onChangeValue(String(Number.isInteger(next) ? next : Math.round(next * 100) / 100));
  };

  return (
    <View className="gap-sm rounded-t-card bg-bg-elevated p-lg">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-text-muted">{label}</Text>
        <Text className="text-2xl font-semibold tabular-nums text-text-primary">{value || '0'}</Text>
      </View>

      <View className="flex-row gap-sm">
        <KeyButton label={`−${quickAdjustStep}`} onPress={() => quickAdjust(-quickAdjustStep)} variant="muted" />
        {onSameAsLast && sameAsLabel ? (
          <Pressable
            onPress={onSameAsLast}
            className="min-h-[56px] flex-[2] items-center justify-center rounded-input bg-bg-surface active:opacity-70"
          >
            <Text className="text-sm font-medium text-text-primary">Aynısı ({sameAsLabel})</Text>
          </Pressable>
        ) : (
          <View className="flex-[2]" />
        )}
        <KeyButton label={`+${quickAdjustStep}`} onPress={() => quickAdjust(quickAdjustStep)} variant="muted" />
      </View>

      {DIGIT_ROWS.map((row, i) => (
        <View key={i} className="flex-row gap-sm">
          {row.map((d) => (
            <KeyButton key={d} label={d} onPress={() => appendDigit(d)} />
          ))}
        </View>
      ))}

      <View className="flex-row gap-sm">
        <KeyButton label={allowDecimal ? '.' : ''} onPress={appendDecimal} variant="muted" />
        <KeyButton label="0" onPress={() => appendDigit('0')} />
        <KeyButton label="⌫" onPress={backspace} variant="muted" />
      </View>

      <Pressable onPress={onConfirm} className="mt-xs min-h-[48px] items-center justify-center rounded-card bg-accent active:opacity-80">
        <Text className="text-base font-semibold text-bg-primary">Tamam</Text>
      </Pressable>
    </View>
  );
}
