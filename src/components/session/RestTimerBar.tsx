import { Pressable, Text, View } from 'react-native';

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

type RestTimerBarProps = {
  secondsLeft: number;
  totalSeconds: number;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
};

// §10.2 kural 5: dinlenme sayacı sabit alt bar — set onaylanınca otomatik başlar
// (bkz. useSessionStore.confirmSet). Alt 2/3 kuralına (kural 1) zaten uygun: en altta.
export function RestTimerBar({ secondsLeft, totalSeconds, onAdjust, onSkip }: RestTimerBarProps) {
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;

  return (
    <View className="gap-xs border-t border-bg-elevated bg-bg-surface px-lg pb-lg pt-sm">
      <View className="h-1 overflow-hidden rounded-pill bg-bg-elevated">
        <View className="h-full rounded-pill bg-accent-alt" style={{ width: `${Math.max(0, progress) * 100}%` }} />
      </View>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => onAdjust(-15)} className="min-h-[48px] min-w-[48px] items-center justify-center rounded-input bg-bg-elevated active:opacity-70">
          <Text className="text-base font-semibold text-text-primary">−15</Text>
        </Pressable>

        <Text className="text-3xl font-semibold tabular-nums text-text-primary">{formatMMSS(secondsLeft)}</Text>

        <Pressable onPress={() => onAdjust(15)} className="min-h-[48px] min-w-[48px] items-center justify-center rounded-input bg-bg-elevated active:opacity-70">
          <Text className="text-base font-semibold text-text-primary">+15</Text>
        </Pressable>
      </View>
      <Pressable onPress={onSkip} className="min-h-[44px] items-center justify-center">
        <Text className="text-sm font-medium text-text-muted">Dinlenmeyi Atla</Text>
      </Pressable>
    </View>
  );
}
