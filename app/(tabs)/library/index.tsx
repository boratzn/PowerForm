import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, Input } from '../../../src/components/ui';
import { type Equipment, EQUIPMENT_OPTIONS } from '../../../src/constants/enumOptions';
import { type LocalExercise, searchLocalExercises } from '../../../src/db/queries';
import { useLanguageStore } from '../../../src/stores/useLanguageStore';
import {
  getEquipmentDisplayName,
  getExerciseDisplayName,
  getMuscleDisplayName,
} from '../../../src/lib/i18n';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [results, setResults] = useState<LocalExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    searchLocalExercises(query, 100, equipment)
      .then(setResults)
      .finally(() => setLoading(false));
  }, [query, equipment]);

  return (
    <View className="flex-1 bg-bg-primary" style={{ paddingTop: insets.top + 16 }}>
      <View className="gap-md px-lg pb-md">
        <Text className="text-2xl font-semibold text-text-primary">
          {t('library_title')}
        </Text>
        <Input placeholder={t('search_exercise')} value={query} onChangeText={setQuery} />

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={EQUIPMENT_OPTIONS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <Chip
              label={getEquipmentDisplayName(item.value, language)}
              selected={equipment === item.value}
              onPress={() => setEquipment((prev) => (prev === item.value ? null : item.value))}
            />
          )}
        />
      </View>

      <FlatList
        className="flex-1 px-lg"
        data={results}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View className="h-sm" />}
        renderItem={({ item }) => {
          const displayName = getExerciseDisplayName(item, language);
          const secondaryName = language === 'tr' ? item.nameEn : (item.nameTr !== displayName ? item.nameTr : null);

          return (
            <Pressable
              onPress={() => router.push(`/library/${item.id}`)}
              className="flex-row items-center gap-md rounded-card bg-bg-surface p-sm active:opacity-70"
            >
              <View className="h-16 w-16 overflow-hidden rounded-input bg-bg-elevated">
                {item.imageUrl && (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={150}
                  />
                )}
              </View>

              <View className="flex-1 gap-xs">
                <Text className="text-base font-medium text-text-primary" numberOfLines={1}>
                  {displayName}
                </Text>
                {secondaryName && (
                  <Text className="text-[11px] text-text-muted" numberOfLines={1}>
                    {secondaryName}
                  </Text>
                )}
                <View className="flex-row flex-wrap gap-xs">
                  {item.equipment && (
                    <View className="rounded-pill bg-bg-elevated px-sm py-[2px]">
                      <Text className="text-xs text-text-muted">
                        {getEquipmentDisplayName(item.equipment, language)}
                      </Text>
                    </View>
                  )}
                  {item.primaryMuscles?.slice(0, 2).map((m) => (
                    <View key={m} className="rounded-pill bg-bg-elevated px-sm py-[2px]">
                      <Text className="text-xs text-text-muted">
                        {getMuscleDisplayName(m, language)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text className="text-lg text-text-muted">›</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading ? <Text className="mt-lg text-center text-text-muted">{t('no_results')}</Text> : null
        }
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 32 }}
      />
    </View>
  );
}
