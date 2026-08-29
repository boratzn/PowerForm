import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type LocalExercise, searchLocalExercises } from '../../db/queries';
import { Input } from '../ui';

type ExercisePickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: LocalExercise) => void;
};

export function ExercisePickerSheet({ visible, onClose, onSelect }: ExercisePickerSheetProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocalExercise[]>([]);

  useEffect(() => {
    if (!visible) return;
    searchLocalExercises(query).then(setResults);
  }, [visible, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-bg-primary px-lg" style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom }}>
        <View className="mb-md flex-row items-center justify-between">
          <Text className="text-xl font-semibold text-text-primary">Egzersiz Ekle</Text>
          <Pressable onPress={onClose} className="min-h-[48px] min-w-[48px] items-center justify-center">
            <Text className="text-2xl text-text-muted">×</Text>
          </Pressable>
        </View>

        <Input placeholder="Egzersiz ara..." value={query} onChangeText={setQuery} autoFocus />

        <FlatList
          className="mt-md"
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onSelect(item);
                setQuery('');
                onClose();
              }}
              className="min-h-[56px] justify-center border-b border-bg-elevated active:opacity-60"
            >
              <Text className="text-base text-text-primary">{item.nameEn}</Text>
              <Text className="text-xs text-text-muted">{item.equipment}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text className="mt-lg text-center text-text-muted">Sonuç yok</Text>}
        />
      </View>
    </Modal>
  );
}
