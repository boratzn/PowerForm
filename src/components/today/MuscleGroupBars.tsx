import { Text, View } from 'react-native';

import type { MuscleGroupVolume } from '../../db/queries';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { getMuscleDisplayName } from '../../lib/i18n';

type MuscleGroupBarsProps = { data: MuscleGroupVolume[] };

export function MuscleGroupBars({ data }: MuscleGroupBarsProps) {
  const language = useLanguageStore((s) => s.language);
  const maxVolume = Math.max(...data.map((d) => d.volumeKg), 1);

  return (
    <View className="gap-sm">
      {data.map((d) => (
        <View key={d.muscleGroupId} className="gap-xs">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-text-primary">
              {getMuscleDisplayName(d.muscleGroupId, language)}
            </Text>
            <Text className="text-xs text-text-muted">{Math.round(d.volumeKg).toLocaleString()} kg</Text>
          </View>
          <View className="h-2 overflow-hidden rounded-pill bg-bg-elevated">
            <View
              className="h-2 rounded-pill bg-accent-alt"
              style={{ width: `${Math.max((d.volumeKg / maxVolume) * 100, 6)}%` }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
