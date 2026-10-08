import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
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
  analyzeMealPhoto,
  type DetectedFoodItem,
  type FoodVisionAnalysis,
} from '../../services/foodVision';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { useNutritionStore } from '../../stores/useNutritionStore';
import { Button, Card, StatusModal } from '../ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type FoodVisionModalProps = {
  visible: boolean;
  initialMeal?: MealType;
  onClose: () => void;
};

const MEALS: { key: MealType; labelKey: string; icon: string }[] = [
  { key: 'breakfast', labelKey: 'breakfast', icon: '🍳' },
  { key: 'lunch', labelKey: 'lunch', icon: '🥗' },
  { key: 'dinner', labelKey: 'dinner', icon: '🥩' },
  { key: 'snack', labelKey: 'snack', icon: '🍎' },
];

export function FoodVisionModal({
  visible,
  initialMeal = 'breakfast',
  onClose,
}: FoodVisionModalProps) {
  const insets = useSafeAreaInsets();
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);
  const addFoodEntry = useNutritionStore((s) => s.addFoodEntry);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [targetMeal, setTargetMeal] = useState<MealType>(initialMeal);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodVisionAnalysis | null>(null);
  const [editableItems, setEditableItems] = useState<DetectedFoodItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  // Scanning animation laser line
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (initialMeal) {
      setTargetMeal(initialMeal);
    }
  }, [initialMeal]);

  useEffect(() => {
    if (isAnalyzing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanAnim.stopAnimation();
    }
  }, [isAnalyzing, scanAnim]);

  const resetState = () => {
    setImageUri(null);
    setImageBase64(null);
    setIsAnalyzing(false);
    setAnalysisResult(null);
    setEditableItems([]);
    setIsSaving(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('camera_permission_required'), t('camera_permission_desc'));
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('gallery_permission_required'), t('gallery_permission_desc'));
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        if (asset.base64) {
          setImageBase64(asset.base64);
          triggerAnalysis(asset.base64);
        } else {
          Alert.alert(t('error'), 'Fotoğraf verisi okunamadı.');
        }
      }
    } catch (err: any) {
      console.error('[FoodVisionModal] Görsel seçme hatası:', err);
      Alert.alert(t('error'), err?.message || 'Fotoğraf seçilirken bir sorun oluştu.');
    }
  };

  const triggerAnalysis = async (base64Str: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setEditableItems([]);

    try {
      const data = await analyzeMealPhoto(base64Str, language);
      setAnalysisResult(data);
      setEditableItems(data.items);
    } catch (err: any) {
      Alert.alert(
        t('error'),
        err?.message || 'Fotoğraf analiz edilemedi. Lütfen tabağın daha net bir fotoğrafını deneyin.',
        [{ text: t('ok'), onPress: () => setIsAnalyzing(false) }]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Adjust portion grams for an item
  const handleAdjustGrams = (id: string, deltaGrams: number) => {
    setEditableItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newGrams = Math.max(10, item.grams + deltaGrams);
        const ratio = newGrams / item.grams;
        return {
          ...item,
          grams: newGrams,
          calories: Math.round(item.calories * ratio),
          protein: Number((item.protein * ratio).toFixed(1)),
          carbs: Number((item.carbs * ratio).toFixed(1)),
          fat: Number((item.fat * ratio).toFixed(1)),
        };
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setEditableItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Compute live totals
  const totalKcal = editableItems.reduce((acc, it) => acc + it.calories, 0);
  const totalProtein = Number(
    editableItems.reduce((acc, it) => acc + it.protein, 0).toFixed(1)
  );
  const totalCarbs = Number(
    editableItems.reduce((acc, it) => acc + it.carbs, 0).toFixed(1)
  );
  const totalFat = Number(
    editableItems.reduce((acc, it) => acc + it.fat, 0).toFixed(1)
  );

  const handleSaveToMeal = async () => {
    if (editableItems.length === 0) {
      Alert.alert(t('warning'), 'Kaydedilecek herhangi bir besin bulunamadı.');
      return;
    }

    setIsSaving(true);
    try {
      for (const item of editableItems) {
        const ratio = item.grams > 0 ? 100 / item.grams : 1;
        const kcalPer100 = Math.round(item.calories * ratio);
        const proteinPer100 = Number((item.protein * ratio).toFixed(1));
        const carbsPer100 = Number((item.carbs * ratio).toFixed(1));
        const fatPer100 = Number((item.fat * ratio).toFixed(1));

        await addFoodEntry({
          meal: targetMeal,
          foodName: item.foodName,
          quantityG: item.grams,
          servingLabel: item.portionDescription || `${item.grams} g`,
          kcalPer100,
          proteinPer100,
          carbsPer100,
          fatPer100,
        });
      }

      setSuccessVisible(true);
    } catch (err: any) {
      Alert.alert(t('error'), err?.message || 'Besinler kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuccessDone = () => {
    setSuccessVisible(false);
    handleClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleClose}
      >
        <View
          className="flex-1 bg-bg-primary"
          style={{
            backgroundColor: colors.bgPrimary,
            paddingTop: Platform.OS === 'android' ? Math.max(insets.top, 16) : Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-md pb-sm border-b border-bg-elevated">
            <View className="flex-row items-center gap-xs">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-accent/15">
                <Ionicons name="camera" size={18} color={colors.accent} />
              </View>
              <Text className="text-base font-bold text-text-primary">
                {t('food_vision_title')}
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              className="h-8 w-8 items-center justify-center rounded-full bg-bg-elevated active:opacity-60"
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            className="flex-1 px-md"
            contentContainerStyle={{ paddingVertical: 16, gap: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step 1: Initial Image Picker if no image selected */}
            {!imageUri && (
              <View className="gap-md py-lg items-center">
                <View className="h-24 w-24 rounded-3xl bg-accent/10 items-center justify-center border border-accent/20">
                  <Ionicons name="scan-outline" size={48} color={colors.accent} />
                </View>

                <View className="items-center px-lg">
                  <Text className="text-xl font-bold text-text-primary text-center">
                    {t('food_vision_title')}
                  </Text>
                  <Text className="text-sm text-text-muted text-center mt-1">
                    {t('food_vision_subtitle')}
                  </Text>
                </View>

                {/* Target Meal Selector */}
                <View className="w-full mt-2">
                  <Text className="text-xs uppercase font-bold text-text-muted mb-2 tracking-wider">
                    {t('select_meal')}
                  </Text>
                  <View className="flex-row gap-2">
                    {MEALS.map((m) => {
                      const isSelected = targetMeal === m.key;
                      return (
                        <Pressable
                          key={m.key}
                          onPress={() => setTargetMeal(m.key)}
                          className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border ${
                            isSelected
                              ? 'bg-accent/15 border-accent'
                              : 'bg-bg-elevated/40 border-bg-elevated'
                          }`}
                        >
                          <Text className="text-base">{m.icon}</Text>
                          <Text
                            className={`text-xs font-bold ${
                              isSelected ? 'text-accent' : 'text-text-muted'
                            }`}
                          >
                            {t(m.labelKey as any)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Selection Buttons */}
                <View className="w-full gap-3 mt-4">
                  <Pressable
                    onPress={() => handlePickImage(true)}
                    className="flex-row items-center justify-center gap-2.5 bg-accent py-3.5 rounded-2xl active:opacity-85 shadow-lg shadow-accent/20"
                  >
                    <Ionicons name="camera" size={20} color={colors.bgPrimary} />
                    <Text className="text-base font-bold text-[#0B0F14]">
                      {t('take_photo')}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handlePickImage(false)}
                    className="flex-row items-center justify-center gap-2.5 bg-bg-elevated border border-bg-elevated/80 py-3.5 rounded-2xl active:opacity-85"
                  >
                    <Ionicons name="images" size={20} color={colors.textPrimary} />
                    <Text className="text-base font-semibold text-text-primary">
                      {t('pick_from_gallery')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Step 2: Image Preview & Scanning / Result View */}
            {imageUri && (
              <View className="gap-md">
                {/* Image Container with Scanning Effect */}
                <View className="w-full h-56 rounded-2xl overflow-hidden bg-bg-surface border border-bg-elevated relative">
                  <Image
                    source={{ uri: imageUri }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />

                  {/* Scanning Overlay Animation */}
                  {isAnalyzing && (
                    <View className="absolute inset-0 bg-black/40 justify-center items-center">
                      <Animated.View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 3,
                          backgroundColor: colors.accent,
                          shadowColor: colors.accent,
                          shadowRadius: 10,
                          shadowOpacity: 1,
                          transform: [
                            {
                              translateY: scanAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-100, 100],
                              }),
                            },
                          ],
                        }}
                      />
                      <View className="bg-[#0B0F14]/90 px-4 py-2 rounded-full flex-row items-center gap-2 border border-accent/40 backdrop-blur-md">
                        <ActivityIndicator size="small" color={colors.accent} />
                        <Text className="text-xs font-bold text-accent">
                          {t('analyzing_plate')}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Retake badge */}
                  {!isAnalyzing && (
                    <Pressable
                      onPress={() => resetState()}
                      className="absolute top-3 right-3 bg-[#0B0F14]/90 px-3 py-1.5 rounded-full flex-row items-center gap-1 border border-bg-elevated"
                    >
                      <Ionicons name="camera-reverse" size={14} color={colors.textPrimary} />
                      <Text className="text-xs font-semibold text-text-primary">
                        {t('scan_another_photo')}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Loading state text */}
                {isAnalyzing && (
                  <Card className="items-center py-4">
                    <Text className="text-sm font-semibold text-text-primary">
                      {t('analyzing_plate')}
                    </Text>
                    <Text className="text-xs text-text-muted mt-1 text-center">
                      {t('analyzing_plate_subtitle')}
                    </Text>
                  </Card>
                )}

                {/* Step 3: Analysis Result */}
                {analysisResult && !isAnalyzing && (
                  <View className="gap-md">
                    {/* Meal Title & Confidence */}
                    <Card className="gap-xs bg-bg-surface border-accent/20">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-lg font-extrabold text-text-primary flex-1 mr-2">
                          {analysisResult.dishTitle}
                        </Text>
                        <View className="bg-accent/15 px-2.5 py-1 rounded-full flex-row items-center gap-1">
                          <Ionicons name="sparkles" size={12} color={colors.accent} />
                          <Text className="text-[10px] font-bold text-accent">AI Analizi</Text>
                        </View>
                      </View>
                      {analysisResult.description ? (
                        <Text className="text-xs text-text-muted leading-4">
                          {analysisResult.description}
                        </Text>
                      ) : null}

                      {/* Total Macro Row */}
                      <View className="flex-row items-center justify-between pt-sm border-t border-bg-elevated/60 mt-xs">
                        <View className="items-center">
                          <Text className="text-base font-extrabold text-accent">
                            {totalKcal}
                          </Text>
                          <Text className="text-[10px] font-bold text-text-muted">KCAL</Text>
                        </View>
                        <View className="h-6 w-[1px] bg-bg-elevated" />
                        <View className="items-center">
                          <Text className="text-sm font-extrabold text-[#38BDF8]">
                            {totalProtein}g
                          </Text>
                          <Text className="text-[10px] font-bold text-text-muted">PROTEİN</Text>
                        </View>
                        <View className="h-6 w-[1px] bg-bg-elevated" />
                        <View className="items-center">
                          <Text className="text-sm font-extrabold text-[#FBBF24]">
                            {totalCarbs}g
                          </Text>
                          <Text className="text-[10px] font-bold text-text-muted">KARB</Text>
                        </View>
                        <View className="h-6 w-[1px] bg-bg-elevated" />
                        <View className="items-center">
                          <Text className="text-sm font-extrabold text-[#F87171]">
                            {totalFat}g
                          </Text>
                          <Text className="text-[10px] font-bold text-text-muted">YAĞ</Text>
                        </View>
                      </View>
                    </Card>

                    {/* Meal Destination Selector */}
                    <View className="gap-1">
                      <Text className="text-xs uppercase font-bold text-text-muted tracking-wider">
                        {t('select_meal')}
                      </Text>
                      <View className="flex-row gap-2">
                        {MEALS.map((m) => {
                          const isSelected = targetMeal === m.key;
                          return (
                            <Pressable
                              key={m.key}
                              onPress={() => setTargetMeal(m.key)}
                              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl border ${
                                isSelected
                                  ? 'bg-accent/15 border-accent'
                                  : 'bg-bg-elevated/40 border-bg-elevated'
                              }`}
                            >
                              <Text className="text-base">{m.icon}</Text>
                              <Text
                                className={`text-xs font-bold ${
                                  isSelected ? 'text-accent' : 'text-text-muted'
                                }`}
                              >
                                {t(m.labelKey as any)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {/* Detected Items List with Granular Controls */}
                    <View className="gap-xs">
                      <Text className="text-xs uppercase font-bold text-text-muted tracking-wider">
                        {t('detected_foods')} ({editableItems.length})
                      </Text>

                      {editableItems.map((item) => (
                        <Card key={item.id} className="gap-sm bg-bg-surface p-sm">
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1 mr-2">
                              <Text className="text-sm font-bold text-text-primary">
                                {item.foodName}
                              </Text>
                              <Text className="text-[11px] text-text-muted mt-0.5">
                                {item.portionDescription}
                              </Text>
                            </View>

                            <Pressable
                              onPress={() => handleRemoveItem(item.id)}
                              hitSlop={8}
                              className="h-7 w-7 items-center justify-center rounded-full bg-danger/10 active:opacity-60"
                            >
                              <Ionicons name="trash-outline" size={14} color={colors.danger} />
                            </Pressable>
                          </View>

                          {/* Gram Adjuster and Macros */}
                          <View className="flex-row items-center justify-between pt-xs border-t border-bg-elevated/40">
                            {/* Gram Stepper */}
                            <View className="flex-row items-center gap-1 bg-bg-elevated/60 rounded-lg p-1">
                              <Pressable
                                onPress={() => handleAdjustGrams(item.id, -20)}
                                className="h-6 w-6 items-center justify-center rounded bg-bg-surface active:opacity-60"
                              >
                                <Text className="text-xs font-bold text-text-primary">-</Text>
                              </Pressable>

                              <Text className="text-xs font-bold text-text-primary px-2">
                                {item.grams} g
                              </Text>

                              <Pressable
                                onPress={() => handleAdjustGrams(item.id, 20)}
                                className="h-6 w-6 items-center justify-center rounded bg-bg-surface active:opacity-60"
                              >
                                <Text className="text-xs font-bold text-text-primary">+</Text>
                              </Pressable>
                            </View>

                            {/* Item Macros */}
                            <View className="flex-row items-center gap-2">
                              <Text className="text-xs font-bold text-text-primary">
                                {item.calories} kcal
                              </Text>
                              <Text className="text-[11px] font-medium text-[#38BDF8]">
                                {item.protein}g P
                              </Text>
                              <Text className="text-[11px] font-medium text-[#FBBF24]">
                                {item.carbs}g K
                              </Text>
                              <Text className="text-[11px] font-medium text-[#F87171]">
                                {item.fat}g Y
                              </Text>
                            </View>
                          </View>
                        </Card>
                      ))}
                    </View>

                    {/* Action Buttons */}
                    <View className="gap-2 pt-xs">
                      <Button
                        label={isSaving ? t('loading') : t('add_to_meal')}
                        onPress={handleSaveToMeal}
                        disabled={isSaving || editableItems.length === 0}
                        className="min-h-[48px]"
                      />

                      <Button
                        label={t('scan_another_photo')}
                        variant="secondary"
                        onPress={resetState}
                        className="min-h-[44px]"
                      />
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Success Modal */}
      <StatusModal
        visible={successVisible}
        type="success"
        title="Öğün Kaydedildi! 🎉"
        message={t('add_detected_success')}
        primaryButtonText={t('ok')}
        onPrimaryPress={handleSuccessDone}
        onClose={handleSuccessDone}
      />
    </>
  );
}
