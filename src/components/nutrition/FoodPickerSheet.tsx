import { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/theme';
import {
  createCustomFood,
  searchFoods,
  type FoodWithServings,
  type LocalServing,
} from '../../db/nutrition';
import { useNutritionStore } from '../../stores/useNutritionStore';
import { Button, Card, Input } from '../ui';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type FoodPickerSheetProps = {
  visible: boolean;
  initialMeal?: MealType;
  onClose: () => void;
};

const MEALS: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Kahvaltı' },
  { key: 'lunch', label: 'Öğle' },
  { key: 'dinner', label: 'Akşam' },
  { key: 'snack', label: 'Ara Öğün' },
];

export function FoodPickerSheet({ visible, initialMeal = 'breakfast', onClose }: FoodPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const addFoodEntry = useNutritionStore((s) => s.addFoodEntry);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodWithServings[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodWithServings | null>(null);
  const [selectedServing, setSelectedServing] = useState<LocalServing | null>(null);
  const [quantityG, setQuantityG] = useState('100');
  const [targetMeal, setTargetMeal] = useState<MealType>(initialMeal);
  const [saving, setSaving] = useState(false);

  // Özel Besin Oluşturma Modu
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customKcal, setCustomKcal] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customServingLabel, setCustomServingLabel] = useState('1 Porsiyon');
  const [customServingGrams, setCustomServingGrams] = useState('100');
  const [creatingCustom, setCreatingCustom] = useState(false);

  useEffect(() => {
    if (initialMeal) {
      setTargetMeal(initialMeal);
    }
  }, [initialMeal]);

  useEffect(() => {
    if (!visible) return;
    searchFoods(query).then(setResults);
  }, [visible, query]);

  const handleSelectFood = (food: FoodWithServings) => {
    setSelectedFood(food);
    const defaultSrv = food.servings.find((s) => s.isDefault) ?? food.servings[0];
    if (defaultSrv) {
      setSelectedServing(defaultSrv);
      setQuantityG(String(defaultSrv.grams));
    } else {
      setSelectedServing(null);
      setQuantityG('100');
    }
  };

  const handleSelectServing = (srv: LocalServing) => {
    setSelectedServing(srv);
    setQuantityG(String(srv.grams));
  };

  const currentGrams = Math.max(1, Number(quantityG.replace(',', '.')) || 100);
  const ratio = currentGrams / 100;

  const previewKcal = selectedFood ? Math.round(selectedFood.kcalPer100 * ratio) : 0;
  const previewProtein = selectedFood ? (selectedFood.proteinPer100 * ratio).toFixed(1) : '0';
  const previewCarbs = selectedFood ? (selectedFood.carbsPer100 * ratio).toFixed(1) : '0';
  const previewFat = selectedFood ? (selectedFood.fatPer100 * ratio).toFixed(1) : '0';

  const handleAdd = async () => {
    if (!selectedFood) return;
    setSaving(true);
    try {
      await addFoodEntry({
        foodId: selectedFood.id,
        meal: targetMeal,
        foodName: selectedFood.name,
        quantityG: currentGrams,
        servingLabel: selectedServing ? selectedServing.label : `${currentGrams} g`,
        kcalPer100: selectedFood.kcalPer100,
        proteinPer100: selectedFood.proteinPer100,
        carbsPer100: selectedFood.carbsPer100,
        fatPer100: selectedFood.fatPer100,
      });

      // Reset & close
      setSelectedFood(null);
      setQuery('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustomFood = async () => {
    if (!customName.trim()) return;
    setCreatingCustom(true);
    try {
      const kcal = parseFloat(customKcal.replace(',', '.')) || 0;
      const protein = parseFloat(customProtein.replace(',', '.')) || 0;
      const carbs = parseFloat(customCarbs.replace(',', '.')) || 0;
      const fat = parseFloat(customFat.replace(',', '.')) || 0;
      const srvGrams = parseFloat(customServingGrams.replace(',', '.')) || 100;

      const created = await createCustomFood({
        name: customName.trim(),
        brand: customBrand.trim() || undefined,
        kcalPer100: kcal,
        proteinPer100: protein,
        carbsPer100: carbs,
        fatPer100: fat,
        servingLabel: customServingLabel.trim() || '1 Porsiyon',
        servingGrams: srvGrams,
      });

      // Formu temizle ve yeni besini seçip porsiyon ekranına geç
      setCustomName('');
      setCustomBrand('');
      setCustomKcal('');
      setCustomProtein('');
      setCustomCarbs('');
      setCustomFat('');
      setIsCustomMode(false);
      handleSelectFood(created);
    } catch (err) {
      console.error('Özel besin ekleme hatası:', err);
    } finally {
      setCreatingCustom(false);
    }
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
        {/* Üst Bar */}
        <View className="mb-md flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-text-primary">
              {isCustomMode
                ? 'Özel Besin Ekle'
                : selectedFood
                ? 'Porsiyon & Miktar'
                : 'Besin Ekle'}
            </Text>
            <Text className="text-xs text-text-muted">
              {isCustomMode
                ? 'Kendi gıdanızı veya paketli ürününüzü kaydedin'
                : selectedFood
                ? selectedFood.name
                : 'Sağlıklı ve besleyici gıdalar ara'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              if (isCustomMode) setIsCustomMode(false);
              else if (selectedFood) setSelectedFood(null);
              else onClose();
            }}
            className="h-10 w-10 items-center justify-center rounded-full bg-bg-card active:opacity-70"
          >
            <Text className="text-xl text-text-muted">
              {isCustomMode || selectedFood ? '←' : '×'}
            </Text>
          </Pressable>
        </View>

        {isCustomMode ? (
          /* Özel Besin Oluşturma Formu */
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
          >
            <View className="gap-xs">
              <Text className="text-xs font-semibold text-text-muted">Besin Adı *</Text>
              <Input
                placeholder="Örn: Protein Bar, Hindi Füme..."
                value={customName}
                onChangeText={setCustomName}
                autoFocus
              />
            </View>

            <View className="gap-xs">
              <Text className="text-xs font-semibold text-text-muted">Marka / Üretici (İsteğe bağlı)</Text>
              <Input
                placeholder="Örn: Züber, Pınar, Hardline..."
                value={customBrand}
                onChangeText={setCustomBrand}
              />
            </View>

            <View className="flex-row gap-sm">
              <View className="flex-1 gap-xs">
                <Text className="text-xs font-semibold text-text-muted">100g Kalori (kcal) *</Text>
                <Input
                  placeholder="350"
                  keyboardType="numeric"
                  value={customKcal}
                  onChangeText={setCustomKcal}
                />
              </View>

              <View className="flex-1 gap-xs">
                <Text className="text-xs font-semibold text-accentAlt">100g Protein (g) *</Text>
                <Input
                  placeholder="20"
                  keyboardType="numeric"
                  value={customProtein}
                  onChangeText={setCustomProtein}
                />
              </View>
            </View>

            <View className="flex-row gap-sm">
              <View className="flex-1 gap-xs">
                <Text className="text-xs font-semibold text-warning">100g Karbonhidrat (g)</Text>
                <Input
                  placeholder="40"
                  keyboardType="numeric"
                  value={customCarbs}
                  onChangeText={setCustomCarbs}
                />
              </View>

              <View className="flex-1 gap-xs">
                <Text className="text-xs font-semibold text-[#F87171]">100g Yağ (g)</Text>
                <Input
                  placeholder="8"
                  keyboardType="numeric"
                  value={customFat}
                  onChangeText={setCustomFat}
                />
              </View>
            </View>

            <View className="flex-row gap-sm">
              <View className="flex-1 gap-xs">
                <Text className="text-xs font-semibold text-text-muted">Varsayılan Porsiyon Adı</Text>
                <Input
                  placeholder="Örn: 1 Paket, 1 Dilim"
                  value={customServingLabel}
                  onChangeText={setCustomServingLabel}
                />
              </View>

              <View className="flex-1 gap-xs">
                <Text className="text-xs font-semibold text-text-muted">Porsiyon Gramajı (g)</Text>
                <Input
                  placeholder="50"
                  keyboardType="numeric"
                  value={customServingGrams}
                  onChangeText={setCustomServingGrams}
                />
              </View>
            </View>

            <Button
              label={creatingCustom ? 'Kaydediliyor...' : 'Kaydet ve Öğüne Ekle'}
              className="mt-sm"
              onPress={handleSaveCustomFood}
              disabled={creatingCustom || !customName.trim() || !customKcal.trim()}
            />
          </ScrollView>
        ) : selectedFood ? (
          /* Besin Detay & Porsiyon Seçici */
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 16 }}
          >
            {/* Öğün Seçici Sekmeler */}
            <View className="gap-xs">
              <Text className="text-xs font-semibold text-text-muted">Öğün</Text>
              <View className="flex-row gap-xs">
                {MEALS.map((m) => {
                  const isSelected = targetMeal === m.key;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => setTargetMeal(m.key)}
                      className={`flex-1 items-center justify-center rounded-card py-sm border ${
                        isSelected
                          ? 'border-accent bg-accent/20'
                          : 'border-bg-elevated bg-bg-card active:opacity-70'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-accent' : 'text-text-muted'
                        }`}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Hazır Porsiyonlar */}
            {selectedFood.servings.length > 0 && (
              <View className="gap-xs">
                <Text className="text-xs font-semibold text-text-muted">Hazır Porsiyon Seçenekleri</Text>
                <View className="gap-xs">
                  {selectedFood.servings.map((srv) => {
                    const isSelected = selectedServing?.id === srv.id;
                    return (
                      <Pressable
                        key={srv.id}
                        onPress={() => handleSelectServing(srv)}
                        className={`flex-row items-center justify-between rounded-card border p-sm ${
                          isSelected
                            ? 'border-accent bg-accent/15'
                            : 'border-bg-elevated bg-bg-card active:opacity-80'
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            isSelected ? 'text-accent' : 'text-text-primary'
                          }`}
                        >
                          {srv.label}
                        </Text>
                        <Text className="text-xs text-text-muted">{srv.grams} g</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Gramaj / Miktar Girişi */}
            <Card className="gap-xs">
              <Text className="text-xs font-semibold text-text-muted">Miktar ({selectedFood.baseUnit})</Text>
              <View className="flex-row items-center gap-sm">
                <TextInput
                  keyboardType="numeric"
                  value={quantityG}
                  onChangeText={(val) => {
                    setQuantityG(val);
                    setSelectedServing(null);
                  }}
                  className="flex-1 rounded-card border border-bg-elevated bg-bg-card px-md py-3 text-lg font-bold text-text-primary"
                />
                <Text className="text-base font-bold text-text-muted">{selectedFood.baseUnit}</Text>
              </View>
            </Card>

            {/* Dinamik Besin Değerleri Önizleme Kartı */}
            <Card className="gap-md">
              <Text className="text-xs uppercase font-bold tracking-wider text-text-muted">
                Hesaplanan Besin Değerleri
              </Text>
              <View className="flex-row items-center justify-between">
                <View className="items-center flex-1">
                  <Text className="text-2xl font-bold text-accent">{previewKcal}</Text>
                  <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                    Kalori (kcal)
                  </Text>
                </View>
                <View className="h-8 w-[1px] bg-bg-elevated" />
                <View className="items-center flex-1">
                  <Text className="text-xl font-bold text-[#38BDF8]">{previewProtein}g</Text>
                  <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                    Protein
                  </Text>
                </View>
                <View className="h-8 w-[1px] bg-bg-elevated" />
                <View className="items-center flex-1">
                  <Text className="text-xl font-bold text-[#FBBF24]">{previewCarbs}g</Text>
                  <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                    Karb
                  </Text>
                </View>
                <View className="h-8 w-[1px] bg-bg-elevated" />
                <View className="items-center flex-1">
                  <Text className="text-xl font-bold text-[#F87171]">{previewFat}g</Text>
                  <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                    Yağ
                  </Text>
                </View>
              </View>
            </Card>

            <Button
              label={saving ? 'Ekleniyor...' : 'Öğüne Ekle'}
              variant="primary"
              className="mt-sm"
              onPress={handleAdd}
              disabled={saving}
            />
          </ScrollView>
        ) : (
          /* Besin Arama Listesi */
          <>
            <View className="flex-row items-center gap-sm">
              <View className="flex-1">
                <Input
                  placeholder="Besin ara (örn: Tavuk göğsü, Yulaf, Yumurta)..."
                  value={query}
                  onChangeText={setQuery}
                  autoFocus
                />
              </View>
              <Pressable
                onPress={() => {
                  setCustomName(query);
                  setIsCustomMode(true);
                }}
                className="h-12 px-3 rounded-input bg-accent/20 border border-accent/40 items-center justify-center active:opacity-70"
              >
                <Text className="text-xs font-bold text-accent">+ Özel Besin</Text>
              </Pressable>
            </View>

            <FlatList
              className="mt-md"
              keyboardShouldPersistTaps="handled"
              data={results}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 32 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelectFood(item)}
                  className="flex-row items-center justify-between border-b border-bg-elevated py-sm active:opacity-60"
                >
                  <View className="flex-1 mr-sm">
                    <Text className="text-base font-semibold text-text-primary">{item.name}</Text>
                    <Text className="text-xs text-text-muted mt-0.5">
                      100g: {Math.round(item.kcalPer100)} kcal · P: {item.proteinPer100}g · K:{' '}
                      {item.carbsPer100}g · Y: {item.fatPer100}g
                    </Text>
                  </View>
                  <Text className="text-base font-bold text-accent">+</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View className="items-center py-xl gap-sm">
                  <Text className="text-sm text-text-muted">Aradığınız besin bulunamadı.</Text>
                  <Pressable
                    onPress={() => {
                      setCustomName(query);
                      setIsCustomMode(true);
                    }}
                    className="rounded-card bg-accent/10 border border-accent/30 px-4 py-2.5 active:opacity-70 mt-1"
                  >
                    <Text className="text-xs font-semibold text-accent">
                      + "{query.trim() || 'Yeni'}" Özel Besin Olarak Ekle
                    </Text>
                  </Pressable>
                </View>
              }
            />
          </>
        )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
