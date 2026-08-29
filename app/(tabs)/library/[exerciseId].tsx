import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ExerciseDetailScreen() {
  const insets = useSafeAreaInsets();
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();

  return (
    <ScrollView
      className="flex-1 bg-bg-primary px-lg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, gap: 16 }}
    >
      <Text className="text-2xl font-semibold text-text-primary">Egzersiz Detayı</Text>
      <Text className="text-text-muted">exercise_id: {exerciseId}</Text>
    </ScrollView>
  );
}
