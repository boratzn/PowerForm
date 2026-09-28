import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

type StatPillProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
};

// "Bugün" ekranındaki 3'lü istatistik şeridinin tek hücresi (seri, bu hafta, son hacim).
export function StatPill({ icon, iconColor, label, value }: StatPillProps) {
  return (
    <View className="flex-1 items-center gap-xs rounded-card bg-bg-surface py-lg">
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text className="text-lg font-semibold text-text-primary">{value}</Text>
      <Text className="text-xs text-text-muted">{label}</Text>
    </View>
  );
}
