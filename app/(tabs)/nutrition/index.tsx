import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EditFoodEntryModal } from '../../../src/components/nutrition/EditFoodEntryModal';
import { FoodPickerSheet } from '../../../src/components/nutrition/FoodPickerSheet';
import { TargetEditorModal } from '../../../src/components/nutrition/TargetEditorModal';
import { Button, Card, StatusModal } from '../../../src/components/ui';
import { colors } from '../../../src/constants/theme';
import type { NutritionEntryItem } from '../../../src/db/nutrition';
import { dateKey } from '../../../src/lib/calculations';
import { useNutritionStore } from '../../../src/stores/useNutritionStore';
import { useLanguageStore } from '../../../src/stores/useLanguageStore';
import { useSubscriptionStore } from '../../../src/stores/useSubscriptionStore';
import type { Language } from '../../../src/lib/i18n';

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🥩',
  snack: '🍎',
};

function formatDateLabel(dateStr: string, lang: Language): string {
  const today = dateKey(new Date());
  const yesterday = dateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const tomorrow = dateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));

  if (dateStr === today) return lang === 'tr' ? 'Bugün' : lang === 'de' ? 'Heute' : lang === 'es' ? 'Hoy' : 'Today';
  if (dateStr === yesterday) return lang === 'tr' ? 'Dün' : lang === 'de' ? 'Gestern' : lang === 'es' ? 'Ayer' : 'Yesterday';
  if (dateStr === tomorrow) return lang === 'tr' ? 'Yarın' : lang === 'de' ? 'Morgen' : lang === 'es' ? 'Mañana' : 'Tomorrow';

  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const locale = lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-US';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
}

export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const isPro = useSubscriptionStore((s) => s.isPro);
  const openPaywall = useSubscriptionStore((s) => s.openPaywall);
  const isMockMode = useSubscriptionStore((s) => s.isMockMode);
  const toggleMockPro = useSubscriptionStore((s) => s.toggleMockPro);
  const [proCelebrationVisible, setProCelebrationVisible] = useState(false);

  const handleToggleMockPro = async () => {
    const willBePro = !isPro;
    await toggleMockPro();
    if (willBePro) {
      setProCelebrationVisible(true);
    }
  };

  const selectedDate = useNutritionStore((s) => s.selectedDate);
  const report = useNutritionStore((s) => s.report);
  const isLoading = useNutritionStore((s) => s.isLoading);
  const setSelectedDate = useNutritionStore((s) => s.setSelectedDate);
  const loadDailyReport = useNutritionStore((s) => s.loadDailyReport);
  const removeFoodEntry = useNutritionStore((s) => s.removeFoodEntry);

  const [pickerMeal, setPickerMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<NutritionEntryItem | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (isPro) {
        loadDailyReport();
      }
    }, [isPro, loadDailyReport])
  );

  const shiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(dateKey(current));
  };

  const handleDeleteEntry = (clientUuid: string, foodName: string) => {
    Alert.alert(t('delete_food_title'), `"${foodName}" ${t('delete_food_confirm')}`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => removeFoodEntry(clientUuid),
      },
    ]);
  };

  if (!isPro) {
    return (
      <View className="flex-1 bg-bg-primary">
        <ScrollView
          className="flex-1 px-lg"
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 32,
            gap: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Üst Başlık & Kilit Rozeti */}
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold tracking-tight text-text-primary">
                {t('nutrition_title')}
              </Text>
              <Text className="text-xs text-text-muted">{t('nutrition_subtitle')}</Text>
            </View>
            <View className="flex-row items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2.5 py-1 border border-[#F59E0B]/30">
              <Ionicons name="lock-closed" size={12} color="#F59E0B" />
              <Text className="text-[11px] font-bold text-[#F59E0B]">
                {t('pro_feature_locked')}
              </Text>
            </View>
          </View>

          {/* Kilitli Hero Kartı */}
          <Card className="gap-md border border-[#10B981]/30 bg-bg-surface p-lg">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#10B981]/15 border border-[#10B981]/30">
              <Ionicons name="nutrition" size={24} color="#10B981" />
            </View>

            <View className="gap-xs">
              <Text className="text-xl font-bold text-text-primary">
                {t('nutrition_pro_title')}
              </Text>
              <Text className="text-xs text-text-muted leading-relaxed">
                {t('nutrition_pro_desc')}
              </Text>
            </View>

            <View className="gap-sm pt-xs border-t border-bg-elevated">
              {[
                t('nutrition_feat_1'),
                t('nutrition_feat_2'),
                t('nutrition_feat_3'),
                t('nutrition_feat_4'),
              ].map((f, i) => (
                <View key={i} className="flex-row items-center gap-xs">
                  <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                  <Text className="text-xs text-text-primary font-medium flex-1">{f}</Text>
                </View>
              ))}
            </View>

            <Button
              label={t('go_pro')}
              variant="primary"
              onPress={openPaywall}
              className="mt-xs min-h-[50px]"
            />
          </Card>

          {/* Test / Simülasyon Kısayolu */}
          {isMockMode && (
            <Card className="border border-warning/30 bg-warning/5 p-md gap-xs">
              <View className="flex-row items-center gap-xs">
                <Ionicons name="construct-outline" size={14} color={colors.warning} />
                <Text className="text-xs font-bold text-warning">Geliştirici Modu</Text>
              </View>
              <Text className="text-[11px] text-text-muted">
                RevenueCat anahtarları eklenene kadar aşağıdaki butona basarak Beslenme arayüzünü anında test edebilirsiniz:
              </Text>
              <Pressable
                onPress={handleToggleMockPro}
                className="mt-xs items-center justify-center rounded-lg bg-warning/20 py-2 border border-warning/30 active:opacity-70"
              >
                <Text className="text-xs font-bold text-warning">🟢 Pro Durumunu Simüle Et (Aç)</Text>
              </Pressable>
            </Card>
          )}

          {/* Pro Kutlama Modalı */}
          <StatusModal
            visible={proCelebrationVisible}
            type="pro_celebration"
            title="Tebrikler! Powerform PRO Aktif"
            badgeText="PRO ÜYE"
            message="Beslenme & Makro takibi ve AI Koç dahil tüm gelişmiş özelliklerin kilidi açıldı."
            features={[
              'Günlük kalori & makro hedefleri',
              'Geniş Türkçe besin veri tabanı',
              'Akıllı AI Koç & Progressive Overload analizi',
            ]}
            primaryButtonText="Harika, Başla!"
            onPrimaryPress={() => setProCelebrationVisible(false)}
          />
        </ScrollView>
      </View>
    );
  }

  const targetKcal = report?.targets.kcal || 2400;
  const consumedKcal = report?.totalKcal || 0;
  const remainingKcal = targetKcal - consumedKcal;

  const targetProtein = report?.targets.proteinG || 150;
  const consumedProtein = report?.totalProteinG || 0;

  const targetCarbs = report?.targets.carbsG || 250;
  const consumedCarbs = report?.totalCarbsG || 0;

  const targetFat = report?.targets.fatG || 70;
  const consumedFat = report?.totalFatG || 0;

  const proteinProgress = Math.min(1, consumedProtein / targetProtein);
  const carbsProgress = Math.min(1, consumedCarbs / targetCarbs);
  const fatProgress = Math.min(1, consumedFat / targetFat);
  const kcalProgress = Math.min(1, consumedKcal / targetKcal);

  return (
    <View className="flex-1 bg-bg-primary">
      <ScrollView
        className="flex-1 px-lg"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Üst Başlık & Tarih Değiştirici */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold tracking-tight text-text-primary">{t('nutrition_title')}</Text>
            <Text className="text-xs text-text-muted">{t('nutrition_subtitle')}</Text>
          </View>

          <View className="flex-row items-center rounded-full bg-bg-card border border-bg-elevated px-sm py-1">
            <Pressable onPress={() => shiftDate(-1)} className="px-2 py-1 active:opacity-60">
              <Text className="text-xs font-bold text-text-muted">◀</Text>
            </Pressable>
            <Text className="px-2 text-xs font-bold text-accent">
              {formatDateLabel(selectedDate, language)}
            </Text>
            <Pressable onPress={() => shiftDate(1)} className="px-2 py-1 active:opacity-60">
              <Text className="text-xs font-bold text-text-muted">▶</Text>
            </Pressable>
          </View>
        </View>

        {isLoading && !report ? (
          <View className="items-center py-xl">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <>
            {/* Kalori & Makro İlerleme Kartı */}
            <Card className="gap-md">
              <View className="flex-row items-center justify-between border-b border-bg-elevated pb-sm">
                <View>
                  <Text className="text-xs font-bold uppercase text-text-muted">{t('remaining_kcal')}</Text>
                  <Text
                    className={`text-2xl font-bold ${
                      remainingKcal >= 0 ? 'text-accent' : 'text-danger'
                    }`}
                  >
                    {remainingKcal >= 0 ? remainingKcal : `+${Math.abs(remainingKcal)} ${t('over_target')}`}
                    <Text className="text-xs font-normal text-text-muted"> kcal</Text>
                  </Text>
                </View>

                <View className="items-end">
                  <Text className="text-xs text-text-muted">
                    {consumedKcal} / {targetKcal} kcal
                  </Text>
                  <Pressable
                    onPress={() => setTargetModalVisible(true)}
                    className="mt-1 active:opacity-70"
                  >
                    <Text className="text-xs font-semibold text-accent-alt">{t('edit_targets')}</Text>
                  </Pressable>
                </View>
              </View>

              {/* Kalori Barı */}
              <View className="h-3 w-full overflow-hidden rounded-full bg-bg-elevated">
                <View
                  className={`h-full rounded-full ${
                    remainingKcal >= 0 ? 'bg-accent' : 'bg-danger'
                  }`}
                  style={{ width: `${Math.min(100, kcalProgress * 100)}%` }}
                />
              </View>

              {/* 3 Makro Besin Çubukları */}
              <View className="gap-sm pt-xs">
                {/* Protein */}
                <View className="gap-1">
                  <View className="flex-row justify-between text-xs">
                    <Text className="text-xs font-bold text-[#38BDF8]">
                      {t('protein')}: {consumedProtein}g
                    </Text>
                    <Text className="text-xs text-text-muted">{targetProtein}g {t('target')}</Text>
                  </View>
                  <View className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
                    <View
                      className="h-full rounded-full bg-[#38BDF8]"
                      style={{ width: `${Math.min(100, proteinProgress * 100)}%` }}
                    />
                  </View>
                </View>

                {/* Karbonhidrat */}
                <View className="gap-1">
                  <View className="flex-row justify-between text-xs">
                    <Text className="text-xs font-bold text-[#FBBF24]">
                      {t('carbs')}: {consumedCarbs}g
                    </Text>
                    <Text className="text-xs text-text-muted">{targetCarbs}g {t('target')}</Text>
                  </View>
                  <View className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
                    <View
                      className="h-full rounded-full bg-[#FBBF24]"
                      style={{ width: `${Math.min(100, carbsProgress * 100)}%` }}
                    />
                  </View>
                </View>

                {/* Yağ */}
                <View className="gap-1">
                  <View className="flex-row justify-between text-xs">
                    <Text className="text-xs font-bold text-[#F87171]">
                      {t('fat')}: {consumedFat}g
                    </Text>
                    <Text className="text-xs text-text-muted">{targetFat}g {t('target')}</Text>
                  </View>
                  <View className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
                    <View
                      className="h-full rounded-full bg-[#F87171]"
                      style={{ width: `${Math.min(100, fatProgress * 100)}%` }}
                    />
                  </View>
                </View>
              </View>
            </Card>

            {/* 4 Öğün Listesi */}
            <View className="gap-md">
              {report?.meals.map((mealGroup) => {
                const icon = MEAL_ICONS[mealGroup.meal] || '🍽️';

                return (
                  <Card key={mealGroup.meal} className="gap-sm">
                    {/* Öğün Başlık Satırı */}
                    <View className="flex-row items-center justify-between border-b border-bg-elevated pb-xs">
                      <View className="flex-row items-center gap-xs">
                        <Text className="text-lg">{icon}</Text>
                        <Text className="text-base font-bold text-text-primary">
                          {t(mealGroup.meal)}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-xs">
                        <Text className="text-xs font-bold text-accent">
                          {mealGroup.totalKcal} kcal
                        </Text>
                        <Text className="text-xs text-text-muted">·</Text>
                        <Text className="text-xs font-medium text-[#38BDF8]">
                          {mealGroup.totalProteinG}g P
                        </Text>
                      </View>
                    </View>

                    {/* Besin Listesi */}
                    {mealGroup.entries.length === 0 ? (
                      <Text className="py-2 text-center text-xs text-text-muted">
                        {t('no_foods_meal')}
                      </Text>
                    ) : (
                      <View className="gap-xs">
                        {mealGroup.entries.map((entry) => (
                          <Pressable
                            key={entry.clientUuid}
                            onPress={() => setEditingEntry(entry)}
                            className="flex-row items-center justify-between border-b border-bg-elevated/30 py-2 active:opacity-70"
                          >
                            <View className="flex-1 mr-sm">
                              <View className="flex-row items-center gap-1.5">
                                <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                                  {entry.foodName}
                                </Text>
                                <Text className="text-[10px] text-text-muted">✎</Text>
                              </View>
                              <Text className="text-[11px] text-text-muted mt-0.5">
                                {entry.servingLabel || `${entry.quantityG} g`} · P:{' '}
                                {entry.proteinG}g · K: {entry.carbsG}g · Y: {entry.fatG}g
                              </Text>
                            </View>

                            <View className="flex-row items-center gap-sm">
                              <Text className="text-xs font-bold text-text-primary">
                                {entry.kcal} kcal
                              </Text>
                              <Pressable
                                onPress={(e) => {
                                  e.stopPropagation?.();
                                  handleDeleteEntry(entry.clientUuid, entry.foodName);
                                }}
                                hitSlop={8}
                                className="p-xs active:opacity-60"
                              >
                                <Text className="text-xs font-bold text-danger">×</Text>
                              </Pressable>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    )}

                    {/* + Besin Ekle Butonu */}
                    <Button
                      label={t('add_food')}
                      variant="secondary"
                      className="mt-xs min-h-[40px] py-1"
                      onPress={() => {
                        setPickerMeal(mealGroup.meal);
                        setPickerVisible(true);
                      }}
                    />
                  </Card>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Besin Arama / Porsiyon Modalı */}
      <FoodPickerSheet
        visible={pickerVisible}
        initialMeal={pickerMeal}
        onClose={() => setPickerVisible(false)}
      />

      {/* Besin Düzenleyici Modalı */}
      <EditFoodEntryModal
        visible={editingEntry !== null}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
      />

      {/* Hedef Düzenleyici Modalı */}
      <TargetEditorModal
        visible={targetModalVisible}
        currentTargets={report?.targets}
        onClose={() => setTargetModalVisible(false)}
      />
    </View>
  );
}
