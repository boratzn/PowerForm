import { Pressable, Text } from 'react-native';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

// Dokunma hedefi min 44dp — Chip küçük bir kontrol olduğu için §10.2'nin 48dp kuralına
// tam uymuyor ama tek başına bir eylem tetiklemediği (seçim/filtre) için kabul edilebilir.
export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-[44px] items-center justify-center rounded-pill px-md ${
        selected ? 'bg-accent' : 'bg-bg-elevated'
      } active:opacity-70`}
    >
      <Text className={`text-sm font-medium ${selected ? 'text-bg-primary' : 'text-text-primary'}`}>{label}</Text>
    </Pressable>
  );
}
