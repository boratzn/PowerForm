import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { calculateTdeeAndMacros, type MacroTarget } from '../../lib/nutritionCalculations';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNutritionStore } from '../../stores/useNutritionStore';
import { Button, Card, Input } from '../ui';

type TargetEditorModalProps = {
  visible: boolean;
  currentTargets?: MacroTarget;
  onClose: () => void;
};

export function TargetEditorModal({ visible, currentTargets, onClose }: TargetEditorModalProps) {
  const insets = useSafeAreaInsets();
  const updateTargets = useNutritionStore((s) => s.updateTargets);
  const profile = useAuthStore((s) => s.profile);

  const [kcal, setKcal] = useState(currentTargets ? String(currentTargets.kcal) : '2400');
  const [proteinG, setProteinG] = useState(currentTargets ? String(currentTargets.proteinG) : '150');
  const [carbsG, setCarbsG] = useState(currentTargets ? String(currentTargets.carbsG) : '260');
  const [fatG, setFatG] = useState(currentTargets ? String(currentTargets.fatG) : '70');
  const [saving, setSaving] = useState(false);

  const handleAutoCalculate = () => {
    const calculated = calculateTdeeAndMacros({
      weightKg: 75,
      heightCm: profile?.height_cm ?? 175,
      birthYear: profile?.birth_year ?? 1995,
      sex: profile?.sex ?? 'male',
      trainingDaysTarget: profile?.training_days_target ?? 4,
      goal: profile?.primary_goal ?? 'hypertrophy',
    });

    setKcal(String(calculated.kcal));
    setProteinG(String(calculated.proteinG));
    setCarbsG(String(calculated.carbsG));
    setFatG(String(calculated.fatG));

    Alert.alert(
      'Otomatik Hesaplandı',
      `Profil bilgilerinize ve hedefinize göre günlük ${calculated.kcal} kcal ve ${calculated.proteinG}g protein olarak güncellendi.`
    );
  };

  const handleSave = async () => {
    const k = parseInt(kcal, 10);
    const p = parseInt(proteinG, 10);
    const c = parseInt(carbsG, 10);
    const f = parseInt(fatG, 10);

    if (!k || k < 1000 || k > 8000) {
      Alert.alert('Hata', 'Lütfen geçerli bir kalori hedefi girin (1000 - 8000 kcal).');
      return;
    }

    setSaving(true);
    try {
      await updateTargets({
        kcal: k,
        proteinG: p || 140,
        carbsG: c || 250,
        fatG: f || 65,
        tdeeEstimate: k,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Hata', err?.message ?? 'Hedef kaydedilemedi.');
    } finally {
      setSaving(false);
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
          <View className="mb-md flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-bold text-text-primary">Beslenme Hedefleri</Text>
              <Text className="text-xs text-text-muted">Günlük kalori ve makro besin hedefleri</Text>
            </View>
            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-bg-card active:opacity-70"
            >
              <Text className="text-xl text-text-muted">×</Text>
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 16 }}
          >
            <Card className="gap-md">
              <View className="gap-xs">
                <Text className="text-xs font-bold uppercase text-text-muted">Günlük Kalori (kcal) *</Text>
                <Input
                  keyboardType="numeric"
                  value={kcal}
                  onChangeText={setKcal}
                  placeholder="2400"
                />
              </View>

              <View className="gap-xs">
                <Text className="text-xs font-bold uppercase text-[#38BDF8]">Protein (gram) *</Text>
                <Input
                  keyboardType="numeric"
                  value={proteinG}
                  onChangeText={setProteinG}
                  placeholder="160"
                />
              </View>

              <View className="flex-row gap-sm">
                <View className="flex-1 gap-xs">
                  <Text className="text-xs font-bold uppercase text-[#FBBF24]">Karb (gram)</Text>
                  <Input
                    keyboardType="numeric"
                    value={carbsG}
                    onChangeText={setCarbsG}
                    placeholder="260"
                  />
                </View>

                <View className="flex-1 gap-xs">
                  <Text className="text-xs font-bold uppercase text-[#F87171]">Yağ (gram)</Text>
                  <Input
                    keyboardType="numeric"
                    value={fatG}
                    onChangeText={setFatG}
                    placeholder="70"
                  />
                </View>
              </View>
            </Card>

            <Button
              label="Profilden Otomatik Hesapla"
              variant="secondary"
              onPress={handleAutoCalculate}
            />

            <Button
              label={saving ? 'Kaydediliyor...' : 'Hedefleri Kaydet'}
              variant="primary"
              onPress={handleSave}
              disabled={saving}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
