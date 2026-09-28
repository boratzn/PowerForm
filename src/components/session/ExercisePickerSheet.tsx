import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type LocalExercise, searchLocalExercises } from '../../db/queries';
import { Input } from '../ui';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { getEquipmentDisplayName, getExerciseDisplayName } from '../../lib/i18n';

type ExercisePickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: LocalExercise) => void;
};

export function ExercisePickerSheet({ visible, onClose, onSelect }: ExercisePickerSheetProps) {
  const insets = useSafeAreaInsets();
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

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
          <Text className="text-xl font-semibold text-text-primary">
            {t('add_exercise_title')}
          </Text>
          <Pressable onPress={onClose} className="min-h-[48px] min-w-[48px] items-center justify-center">
            <Text className="text-2xl text-text-muted">×</Text>
          </Pressable>
        </View>

        <Input placeholder={t('search_exercise')} value={query} onChangeText={setQuery} autoFocus />

        <FlatList
          className="mt-md"
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const displayName = getExerciseDisplayName(item, language);
            const secondaryName = language === 'tr' ? item.nameEn : (item.nameTr !== displayName ? item.nameTr : null);

            return (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  setQuery('');
                  onClose();
                }}
                className="flex-row items-center justify-between border-b border-bg-elevated py-sm active:opacity-60"
              >
                <View className="flex-1 mr-2">
                  <Text className="text-base font-medium text-text-primary">{displayName}</Text>
                  <View className="flex-row items-center gap-xs mt-0.5">
                    {secondaryName ? <Text className="text-xs text-text-muted">{secondaryName} · </Text> : null}
                    {item.equipment && (
                      <Text className="text-xs text-accent-alt">
                        {getEquipmentDisplayName(item.equipment, language)}
                      </Text>
                    )}
                  </View>
                </View>
                <Text className="text-base text-accent font-semibold">+</Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text className="mt-lg text-center text-text-muted">{t('no_results')}</Text>}
        />
      </View>
    </Modal>
  );
}
