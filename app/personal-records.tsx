import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../src/constants/theme';
import {
  getAllPersonalRecords,
  type PersonalRecordDetail,
} from '../src/db/profileStats';
import {
  getEquipmentDisplayName,
  getExerciseDisplayName,
} from '../src/lib/i18n';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useLanguageStore } from '../src/stores/useLanguageStore';

function formatDate(timestampSeconds: number, lang: string = 'tr'): string {
  if (!timestampSeconds) return '';
  const d = new Date(timestampSeconds * 1000);
  const locale =
    lang === 'tr'
      ? 'tr-TR'
      : lang === 'de'
        ? 'de-DE'
        : lang === 'es'
          ? 'es-ES'
          : 'en-US';
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type SortOption = 'bestE1RM' | 'recent' | 'name';

export default function PersonalRecordsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);
  const session = useAuthStore((s) => s.session);

  const [records, setRecords] = useState<PersonalRecordDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('bestE1RM');

  const loadData = useCallback(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getAllPersonalRecords(userId)
      .then(setRecords)
      .catch((err) => console.error('[PersonalRecords] Veri yüklenemedi:', err))
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRecords = useMemo(() => {
    let list = records;

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const name = getExerciseDisplayName(r, language).toLowerCase();
        const equip = (r.equipment || '').toLowerCase();
        return name.includes(q) || equip.includes(q);
      });
    }

    const sorted = [...list];
    if (sortBy === 'bestE1RM') {
      sorted.sort((a, b) => b.bestE1RM - a.bestE1RM);
    } else if (sortBy === 'recent') {
      sorted.sort((a, b) => b.achievedAt - a.achievedAt);
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => {
        const nameA = getExerciseDisplayName(a, language);
        const nameB = getExerciseDisplayName(b, language);
        return nameA.localeCompare(nameB);
      });
    }

    return sorted;
  }, [records, searchQuery, sortBy, language]);

  const topRecord = records.length > 0 ? records[0] : null;

  return (
    <View
      className="flex-1 bg-bg-primary"
      style={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 12,
      }}
    >
      {/* Header Bar */}
      <View className="flex-row items-center justify-between px-lg pb-3 border-b border-bg-elevated">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-9 w-9 items-center justify-center rounded-full bg-bg-surface border border-bg-elevated active:opacity-60"
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>

        <View className="items-center">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="trophy" size={17} color={colors.accent} />
            <Text className="text-base font-extrabold text-text-primary">
              {t('personal_records_page_title')}
            </Text>
          </View>
          <Text className="text-[11px] text-text-muted mt-0.5">
            {records.length} {t('records_count_label')}
          </Text>
        </View>

        <View className="w-9" />
      </View>

      {/* Arama ve Sıralama Çubuğu */}
      <View className="px-lg pt-3 pb-2 gap-2.5">
        {/* Arama Inputu */}
        <View className="flex-row items-center bg-bg-surface px-3 py-2 rounded-xl border border-bg-elevated">
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('search_records_placeholder')}
            placeholderTextColor={colors.textMuted}
            className="flex-1 ml-2 text-xs text-text-primary py-0"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Sıralama Filtreleri */}
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setSortBy('bestE1RM')}
            className={`px-2.5 py-1 rounded-lg border ${
              sortBy === 'bestE1RM'
                ? 'bg-accent/20 border-accent/40'
                : 'bg-bg-surface border-bg-elevated'
            }`}
          >
            <Text
              className={`text-[11px] font-semibold ${
                sortBy === 'bestE1RM' ? 'text-accent font-bold' : 'text-text-muted'
              }`}
            >
              {language === 'tr' ? 'En Yüksek 1RM' : language === 'de' ? 'Höchstes 1RM' : language === 'es' ? 'Mayor 1RM' : 'Highest 1RM'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSortBy('recent')}
            className={`px-2.5 py-1 rounded-lg border ${
              sortBy === 'recent'
                ? 'bg-accent/20 border-accent/40'
                : 'bg-bg-surface border-bg-elevated'
            }`}
          >
            <Text
              className={`text-[11px] font-semibold ${
                sortBy === 'recent' ? 'text-accent font-bold' : 'text-text-muted'
              }`}
            >
              {language === 'tr' ? 'En Yeni' : language === 'de' ? 'Neueste' : language === 'es' ? 'Recientes' : 'Most Recent'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSortBy('name')}
            className={`px-2.5 py-1 rounded-lg border ${
              sortBy === 'name'
                ? 'bg-accent/20 border-accent/40'
                : 'bg-bg-surface border-bg-elevated'
            }`}
          >
            <Text
              className={`text-[11px] font-semibold ${
                sortBy === 'name' ? 'text-accent font-bold' : 'text-text-muted'
              }`}
            >
              A-Z
            </Text>
          </Pressable>
        </View>
      </View>

      {/* İçerik */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.accent} />
          <Text className="text-xs text-text-muted mt-3">
            {t('loading')}
          </Text>
        </View>
      ) : records.length === 0 ? (
        <View className="flex-1 items-center justify-center px-xl">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-bg-surface border border-bg-elevated mb-3">
            <Ionicons name="trophy-outline" size={32} color={colors.textMuted} />
          </View>
          <Text className="text-base font-bold text-text-primary text-center">
            {t('no_prs_yet')}
          </Text>
          <Text className="text-xs text-text-muted text-center mt-1 leading-5">
            {language === 'tr'
              ? 'Antrenmanlarınızı tamamladıkça ulaştığınız en yüksek ağırlıklar ve tahmini 1RM rekorlarınız burada otomatik listelenecektir.'
              : language === 'de'
                ? 'Wenn Sie Ihre Trainings abschließen, werden Ihre persönlichen Rekorde hier automatisch aufgeführt.'
                : language === 'es'
                  ? 'A medida que completes entrenamientos, tus récords personales aparecerán aquí automáticamente.'
                  : 'As you complete workouts, your personal records and estimated 1RM achievements will be listed here automatically.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item.exerciseId}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 24,
            gap: 10,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            topRecord && sortBy === 'bestE1RM' && searchQuery.trim().length === 0 ? (
              <View className="mb-2">
                <View className="p-3.5 rounded-2xl bg-[#151B23] border border-[#F59E0B]/35">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="sparkles" size={14} color="#F59E0B" />
                      <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#F59E0B]">
                        {language === 'tr' ? '1 Numaralı Rekor' : language === 'de' ? 'Top Rekord #1' : language === 'es' ? 'Récord N.º 1' : 'Top PR #1'}
                      </Text>
                    </View>
                    <View className="bg-[#F59E0B]/20 px-2 py-0.5 rounded-full border border-[#F59E0B]/40">
                      <Text className="text-[10px] font-extrabold text-[#F59E0B]">
                        👑 {topRecord.bestE1RM} kg e1RM
                      </Text>
                    </View>
                  </View>
                  <Text className="text-base font-bold text-text-primary" numberOfLines={1}>
                    {getExerciseDisplayName(topRecord, language)}
                  </Text>
                  <Text className="text-xs text-text-muted mt-0.5">
                    {topRecord.maxWeightKg} kg × {topRecord.reps} rep · {formatDate(topRecord.achievedAt, language)}
                  </Text>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const displayName = getExerciseDisplayName(item, language);
            const equipName = getEquipmentDisplayName(item.equipment, language);

            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: `/library/${item.exerciseId}`,
                    params: { from: 'profile' },
                  })
                }
                className="flex-row items-center justify-between p-3 rounded-2xl border border-white/5 bg-bg-surface active:opacity-75"
              >
                {/* Sıralama Numarası */}
                <View className="h-7 w-7 items-center justify-center rounded-lg bg-bg-elevated mr-2.5">
                  <Text className="text-xs font-bold text-text-muted">
                    #{index + 1}
                  </Text>
                </View>

                {/* Egzersiz Bilgileri */}
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                      {displayName}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2 mt-1">
                    <Text className="text-[11px] font-medium text-text-muted">
                      {item.maxWeightKg} kg × {item.reps} rep
                    </Text>
                    <Text className="text-[11px] text-text-muted/60">·</Text>
                    <Text className="text-[10px] text-text-muted/80">
                      {formatDate(item.achievedAt, language)}
                    </Text>
                    {equipName ? (
                      <>
                        <Text className="text-[11px] text-text-muted/60">·</Text>
                        <Text className="text-[10px] text-accent-alt">
                          {equipName}
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>

                {/* e1RM Rozeti */}
                <View className="items-end justify-center">
                  <View className="rounded-lg bg-accent/20 px-2 py-1 border border-accent/40 items-center">
                    <Text className="text-xs font-bold text-accent">
                      {item.bestE1RM} kg
                    </Text>
                  </View>
                  <Text className="text-[9px] font-semibold text-text-muted mt-0.5">
                    e1RM
                  </Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View className="items-center py-10">
              <Text className="text-xs text-text-muted">
                {t('no_results')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
