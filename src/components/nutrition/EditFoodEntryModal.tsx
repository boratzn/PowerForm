import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/theme';
import type { NutritionEntryItem } from '../../db/nutrition';
import { useNutritionStore } from '../../stores/useNutritionStore';
import { Button, Card, Input } from '../ui';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type EditFoodEntryModalProps = {
  visible: boolean;
  entry: NutritionEntryItem | null;
  onClose: () => void;
};

const MEALS: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Kahvaltı' },
  { key: 'lunch', label: 'Öğle' },
  { key: 'dinner', label: 'Akşam' },
  { key: 'snack', label: 'Ara Öğün' },
];

export function EditFoodEntryModal({ visible, entry, onClose }: EditFoodEntryModalProps) {
  const insets = useSafeAreaInsets();
  const updateFoodEntry = useNutritionStore((s) => s.updateFoodEntry);
  const removeFoodEntry = useNutritionStore((s) => s.removeFoodEntry);

  const [meal, setMeal] = useState<MealType>('breakfast');
  const [quantityG, setQuantityG] = useState('100');
  const [servingLabel, setServingLabel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setMeal(entry.meal || 'breakfast');
      setQuantityG(String(entry.quantityG || 100));
      setServingLabel(entry.servingLabel || `${entry.quantityG} g`);
    }
  }, [entry]);

  if (!entry) return null;

  const currentGrams = Math.max(1, Number(quantityG.replace(',', '.')) || 1);
  const originalGrams = entry.quantityG > 0 ? entry.quantityG : 100;
  const ratio = currentGrams / originalGrams;

  const calculatedKcal = Math.round(entry.kcal * ratio);
  const calculatedProtein = Math.round(entry.proteinG * ratio * 10) / 10;
  const calculatedCarbs = Math.round(entry.carbsG * ratio * 10) / 10;
  const calculatedFat = Math.round(entry.fatG * ratio * 10) / 10;

  const handleAdjustGrams = (delta: number) => {
    const next = Math.max(5, currentGrams + delta);
    setQuantityG(String(next));
    setServingLabel(`${next} g`);
  };

  const handleSave = async () => {
    if (currentGrams <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir gramaj girin.');
      return;
    }

    setSaving(true);
    try {
      await updateFoodEntry(entry.clientUuid, {
        meal,
        quantityG: currentGrams,
        servingLabel: servingLabel.trim() || `${currentGrams} g`,
        kcal: calculatedKcal,
        proteinG: calculatedProtein,
        carbsG: calculatedCarbs,
        fatG: calculatedFat,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Hata', err?.message ?? 'Besin güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Besini Sil', `"${entry.foodName}" öğününüzden çıkarılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFoodEntry(entry.clientUuid);
            onClose();
          } catch (err: any) {
            Alert.alert('Hata', 'Besin silinirken bir hata oluştu.');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1 bg-bg-primary"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View
          className="flex-1 px-lg"
          style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
        >
          {/* Üst Başlık */}
          <View className="mb-md flex-row items-center justify-between">
            <View className="flex-1 mr-sm">
              <Text className="text-xl font-bold text-text-primary" numberOfLines={1}>
                {entry.foodName}
              </Text>
              <Text className="text-xs text-text-muted">Öğün ve porsiyonu düzenle</Text>
            </View>
            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-bg-card active:opacity-70"
            >
              <Text className="text-xl text-text-muted">✕</Text>
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Öğün Seçimi */}
            <Card className="gap-sm">
              <Text className="text-xs font-bold uppercase text-text-muted">Öğün</Text>
              <View className="flex-row gap-xs">
                {MEALS.map((m) => {
                  const isSelected = meal === m.key;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => setMeal(m.key)}
                      className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
                        isSelected ? 'bg-accent' : 'bg-bg-elevated'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-bg-primary' : 'text-text-muted'
                        }`}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* Miktar & Porsiyon */}
            <Card className="gap-md">
              <View className="gap-xs">
                <Text className="text-xs font-bold uppercase text-text-muted">Miktar (Gram / ml) *</Text>
                <Input
                  keyboardType="numeric"
                  value={quantityG}
                  onChangeText={(text) => {
                    setQuantityG(text);
                    const num = Number(text.replace(',', '.'));
                    if (num > 0) {
                      setServingLabel(`${num} g`);
                    }
                  }}
                  placeholder="Örn. 150"
                />
              </View>

              {/* Hızlı Gramaj Butonları */}
              <View className="flex-row gap-xs justify-between">
                {[-50, -25, +25, +50].map((delta) => {
                  const isNegative = delta < 0;
                  return (
                    <Pressable
                      key={delta}
                      onPress={() => handleAdjustGrams(delta)}
                      className="flex-1 items-center justify-center rounded-lg bg-bg-elevated py-2.5 active:opacity-70 border border-bg-surface"
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isNegative ? 'text-danger' : 'text-accent'
                        }`}
                      >
                        {delta > 0 ? `+${delta}g` : `${delta}g`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="gap-xs">
                <Text className="text-xs font-bold uppercase text-text-muted">Porsiyon Etiketi</Text>
                <Input
                  value={servingLabel}
                  onChangeText={setServingLabel}
                  placeholder="Örn. 1 Porsiyon, 1 Kase"
                />
              </View>
            </Card>

            {/* Güncellenen Besin Değerleri Özeti */}
            <Card className="gap-sm border border-accent/20 bg-accent/5">
              <Text className="text-xs font-bold uppercase text-accent">Hesaplanan Besin Değerleri</Text>
              <View className="flex-row items-center justify-between pt-xs">
                <View className="items-center">
                  <Text className="text-lg font-bold text-text-primary">{calculatedKcal}</Text>
                  <Text className="text-[11px] text-text-muted">Kalori (kcal)</Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold text-[#38BDF8]">{calculatedProtein}g</Text>
                  <Text className="text-[11px] text-text-muted">Protein</Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold text-[#FBBF24]">{calculatedCarbs}g</Text>
                  <Text className="text-[11px] text-text-muted">Karb</Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold text-[#F87171]">{calculatedFat}g</Text>
                  <Text className="text-[11px] text-text-muted">Yağ</Text>
                </View>
              </View>
            </Card>

            {/* Butonlar */}
            <View className="gap-sm pt-xs">
              <Button
                label={saving ? 'Kaydediliyor...' : 'Değişiklikleri Güncelle'}
                variant="primary"
                disabled={saving}
                onPress={handleSave}
              />

              <Button
                label="Öğünden Çıkar / Sil"
                variant="danger"
                onPress={handleDelete}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
