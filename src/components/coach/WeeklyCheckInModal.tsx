import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/theme';
import type { CheckInAnswers } from '../../services/aiCoach';
import { Button, Card, Input } from '../ui';

type WeeklyCheckInModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (answers: CheckInAnswers) => void;
  isGenerating: boolean;
};

export function WeeklyCheckInModal({
  visible,
  onClose,
  onSubmit,
  isGenerating,
}: WeeklyCheckInModalProps) {
  const insets = useSafeAreaInsets();

  const [sleepRecovery, setSleepRecovery] = useState<number>(4);
  const [jointPain, setJointPain] = useState<'none' | 'mild' | 'severe'>('none');
  const [nutritionAdherence, setNutritionAdherence] = useState<'low' | 'medium' | 'high'>('high');
  const [userNotes, setUserNotes] = useState('');

  const handleSubmit = () => {
    onSubmit({
      sleepRecoveryRating: sleepRecovery,
      jointPainOrFatigue: jointPain,
      nutritionAdherence,
      userNotes: userNotes.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1 bg-bg-primary"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View
          className="flex-1 px-lg"
          style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom + 16 }}
        >
          {/* Üst Bar */}
          <View className="flex-row items-center justify-between pb-sm border-b border-bg-elevated">
            <View>
              <Text className="text-xl font-bold text-text-primary">Haftalık Check-In</Text>
              <Text className="text-xs text-text-muted">Kişiselleştirilmiş analiz için 3 hızlı soru</Text>
            </View>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-bg-surface active:opacity-70"
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 pt-md"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 20 }}
          >
          {/* Soru 1: Uyku & Toparlanma */}
          <Card className="gap-sm">
            <View className="flex-row items-center gap-xs">
              <Ionicons name="moon-outline" size={16} color="#38BDF8" />
              <Text className="text-xs font-bold uppercase text-text-muted">
                1. Uyku ve Toparlanma Kaliten Nasildi?
              </Text>
            </View>
            <Text className="text-xs text-text-muted">
              Sabahları dinç mi kalktın, kas ağrıların sonraki seanslara sarktı mı?
            </Text>
            <View className="flex-row gap-xs pt-xs">
              {[1, 2, 3, 4, 5].map((val) => {
                const isSelected = sleepRecovery === val;
                return (
                  <Pressable
                    key={val}
                    onPress={() => setSleepRecovery(val)}
                    className={`flex-1 items-center justify-center rounded-xl py-3 border ${
                      isSelected ? 'border-accent bg-accent/15' : 'border-bg-elevated bg-bg-elevated'
                    }`}
                  >
                    <Text
                      className={`text-base font-bold ${
                        isSelected ? 'text-accent' : 'text-text-muted'
                      }`}
                    >
                      {val}
                    </Text>
                    <Text className="text-[10px] text-text-muted mt-0.5">
                      {val === 1 ? 'Çok Kötü' : val === 5 ? 'Harika' : `${val}/5`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Soru 2: Eklem Ağrısı veya Aşırı Yorgunluk */}
          <Card className="gap-sm">
            <View className="flex-row items-center gap-xs">
              <Ionicons name="fitness-outline" size={16} color="#F87171" />
              <Text className="text-xs font-bold uppercase text-text-muted">
                2. Eklem Ağrısı veya Aşırı Yorgunluk
              </Text>
            </View>
            <Text className="text-xs text-text-muted">
              Bel, omuz veya dizlerinde batma, hareket kısıtlılığı hissettin mi?
            </Text>
            <View className="gap-xs pt-xs">
              {[
                { key: 'none', label: 'Ağrı yok, enerjim çok iyi', color: '#4ADE80' },
                { key: 'mild', label: 'Hafif sızı / eklem yorgunluğu var', color: '#FBBF24' },
                { key: 'severe', label: 'Belirgin batma / aşırı tükenmişlik var', color: '#F87171' },
              ].map((opt) => {
                const isSelected = jointPain === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setJointPain(opt.key as any)}
                    className={`flex-row items-center justify-between rounded-xl p-md border ${
                      isSelected ? 'border-accent bg-accent/10' : 'border-bg-elevated bg-bg-elevated'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-text-primary' : 'text-text-muted'
                      }`}
                    >
                      {opt.label}
                    </Text>
                    <View
                      className={`h-4 w-4 items-center justify-center rounded-full border ${
                        isSelected ? 'border-accent bg-accent' : 'border-text-muted/40'
                      }`}
                    >
                      {isSelected && <Ionicons name="checkmark" size={10} color="#0B0F14" />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Soru 3: Beslenme Sadakati */}
          <Card className="gap-sm">
            <View className="flex-row items-center gap-xs">
              <Ionicons name="nutrition-outline" size={16} color="#4ADE80" />
              <Text className="text-xs font-bold uppercase text-text-muted">
                3. Beslenme & Protein Sadakati
              </Text>
            </View>
            <Text className="text-xs text-text-muted">
              Haftalık kalori ve protein hedeflerine ne kadar uyabildin?
            </Text>
            <View className="flex-row gap-xs pt-xs">
              {[
                { key: 'high', label: 'Tam Uydum (%90+)' },
                { key: 'medium', label: 'Kısmen (%60-80)' },
                { key: 'low', label: 'Düşük / Kaçamaklar Oldu' },
              ].map((opt) => {
                const isSelected = nutritionAdherence === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setNutritionAdherence(opt.key as any)}
                    className={`flex-1 items-center justify-center rounded-xl py-3 px-1 border text-center ${
                      isSelected ? 'border-accent bg-accent/15' : 'border-bg-elevated bg-bg-elevated'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold text-center ${
                        isSelected ? 'text-accent' : 'text-text-muted'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Soru 4: Özel Not veya Soru (Opsiyonel) */}
          <Card className="gap-sm">
            <View className="flex-row items-center gap-xs">
              <Ionicons name="create-outline" size={16} color="#A855F7" />
              <Text className="text-xs font-bold uppercase text-text-muted">
                Koça Eklemek İstediğin Not (Opsiyonel)
              </Text>
            </View>
            <Input
              value={userNotes}
              onChangeText={setUserNotes}
              placeholder="Örn. Incline press'te omuz açım batıyor, deadlift'i çıkarıp RDL mi yapsam?"
              multiline
              className="min-h-[70px] text-xs pt-2"
            />
          </Card>

          {/* Başlat Butonu */}
          <View className="pt-xs pb-md">
            <Button
              label={isGenerating ? 'Yapay Zeka Analiz Ediyor...' : 'Verilerimi ve Yanıtlarımı Analiz Et →'}
              variant="primary"
              disabled={isGenerating}
              onPress={handleSubmit}
              className="min-h-[50px]"
            />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
  );
}
