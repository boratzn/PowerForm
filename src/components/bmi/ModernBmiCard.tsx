import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '../../constants/theme';
import {
  calculateModernBmi,
  type BmiAnalysis,
  type Sex,
} from '../../lib/bmiCalculations';
import { getSexDisplayName } from '../../lib/i18n';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { Card } from '../ui';

type ModernBmiCardProps = {
  currentWeightKg?: number | null;
  heightCm?: number | null;
  birthYear?: number | null;
  sex?: Sex | null;
  compact?: boolean;
};

export function ModernBmiCard({
  currentWeightKg,
  heightCm,
  birthYear,
  sex,
  compact = false,
}: ModernBmiCardProps) {
  const profile = useAuthStore((s) => s.profile);
  const lang = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  // Profil veya props üzerinden değerler
  const currentYear = new Date().getFullYear();
  const profileBirthYear = profile?.birth_year ?? 1998;
  const initialAge = currentYear - (birthYear || profileBirthYear || 1998);
  const initialWeight = currentWeightKg || Number((profile as any)?.weight_kg) || 75;
  const initialHeight = heightCm || Number(profile?.height_cm) || 178;
  const initialSex: Sex = (sex || (profile?.sex as Sex) || 'male');

  // Dinamik test / düzenleme state'i
  const [modalVisible, setModalVisible] = useState(false);
  const [customWeight, setCustomWeight] = useState(String(initialWeight));
  const [customHeight, setCustomHeight] = useState(String(initialHeight));
  const [customAge, setCustomAge] = useState(String(initialAge));
  const [customSex, setCustomSex] = useState<Sex>(initialSex);

  // Aktif hesaplama değerleri
  const [activeParams, setActiveParams] = useState({
    weightKg: initialWeight,
    heightCm: initialHeight,
    age: initialAge,
    sex: initialSex,
  });

  // Eğer dışarıdan gelen prop değişirse güncelle
  React.useEffect(() => {
    if (currentWeightKg && currentWeightKg !== activeParams.weightKg) {
      setActiveParams((prev) => ({ ...prev, weightKg: currentWeightKg }));
    }
  }, [currentWeightKg]);

  const analysis: BmiAnalysis = useMemo(() => {
    return calculateModernBmi({
      weightKg: activeParams.weightKg,
      heightCm: activeParams.heightCm,
      age: activeParams.age,
      sex: activeParams.sex,
      lang,
    });
  }, [activeParams, lang]);

  const handleApplyCustom = () => {
    const w = parseFloat(customWeight.replace(',', '.'));
    const h = parseFloat(customHeight.replace(',', '.'));
    const a = parseInt(customAge, 10);

    setActiveParams({
      weightKg: !isNaN(w) && w > 20 && w < 300 ? w : activeParams.weightKg,
      heightCm: !isNaN(h) && h > 80 && h < 250 ? h : activeParams.heightCm,
      age: !isNaN(a) && a > 10 && a < 110 ? a : activeParams.age,
      sex: customSex,
    });
    setModalVisible(false);
  };

  return (
    <Card className="gap-md bg-bg-surface border border-white/5 overflow-hidden">
      {/* Üst Başlık Satırı */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View
            style={{ backgroundColor: `${analysis.categoryColor}20` }}
            className="h-8 w-8 items-center justify-center rounded-xl border border-white/5"
          >
            <Ionicons name="speedometer-outline" size={17} color={analysis.categoryColor} />
          </View>
          <View>
            <Text className="text-sm font-bold text-text-primary">
              {t('bmi_title')}
            </Text>
            <Text className="text-[10px] text-text-muted">
              {activeParams.age} {t('age_years_old')} · {getSexDisplayName(activeParams.sex, lang)} · {activeParams.heightCm} cm · {activeParams.weightKg} kg
            </Text>
          </View>
        </View>

        <Pressable
          hitSlop={8}
          onPress={() => {
            setCustomWeight(String(activeParams.weightKg));
            setCustomHeight(String(activeParams.heightCm));
            setCustomAge(String(activeParams.age));
            setCustomSex(activeParams.sex);
            setModalVisible(true);
          }}
          className="flex-row items-center gap-1 rounded-lg bg-bg-elevated px-2.5 py-1.5 border border-white/5 active:opacity-70"
        >
          <Ionicons name="options-outline" size={13} color={colors.textMuted} />
          <Text className="text-[11px] font-semibold text-text-muted">
            {t('bmi_adjust_btn')}
          </Text>
        </Pressable>
      </View>

      {/* Büyük Sayı ve Kategori Rozeti */}
      <View className="flex-row items-baseline justify-between pt-1">
        <View className="flex-row items-baseline gap-1.5">
          <Text
            style={{ color: analysis.categoryColor }}
            className="text-3xl font-extrabold tracking-tight tabular-nums"
          >
            {analysis.bmi}
          </Text>
          <Text className="text-xs font-semibold text-text-muted">kg/m²</Text>
        </View>

        <View
          style={{
            backgroundColor: `${analysis.categoryColor}18`,
            borderColor: `${analysis.categoryColor}35`,
          }}
          className="rounded-full px-3 py-1 border"
        >
          <Text
            style={{ color: analysis.categoryColor }}
            className="text-xs font-bold"
          >
            {analysis.categoryLabel}
          </Text>
        </View>
      </View>

      {/* Modern Renkli Spektrum Gösterge Çubuğu */}
      <View className="gap-1.5 my-1">
        {/* İbre (Pointer) */}
        <View className="relative h-4 w-full">
          <View
            style={{
              left: `${Math.max(3, Math.min(97, analysis.gaugePositionPct))}%`,
              transform: [{ translateX: -6 }],
            }}
            className="absolute top-0 items-center"
          >
            <View
              style={{
                backgroundColor: analysis.categoryColor,
                shadowColor: analysis.categoryColor,
                shadowOpacity: 0.8,
                shadowRadius: 6,
              }}
              className="h-3.5 w-3.5 rounded-full border-2 border-white items-center justify-center"
            />
          </View>
        </View>

        {/* 4 Renk Bölmeli Spektrum Barı */}
        <View className="flex-row h-3 w-full rounded-full overflow-hidden border border-white/10">
          {/* Zayıf (<18.5) */}
          <View className="flex-[3.5] bg-[#38BDF8]" />
          {/* Normal (18.5 - 25) */}
          <View className="flex-[6.5] bg-[#10B981]" />
          {/* Fazla Kilolu (25 - 30) */}
          <View className="flex-[5] bg-[#F59E0B]" />
          {/* Obezite (30+) */}
          <View className="flex-[5] bg-[#EF4444]" />
        </View>

        {/* Eşik Değer Etiketleri */}
        <View className="flex-row justify-between px-0.5 pt-0.5">
          <Text className="text-[9px] font-semibold text-[#38BDF8]">{'<18.5'}</Text>
          <Text className="text-[9px] font-semibold text-[#10B981]">18.5 - 25</Text>
          <Text className="text-[9px] font-semibold text-[#F59E0B]">25 - 30</Text>
          <Text className="text-[9px] font-semibold text-[#EF4444]">30+</Text>
        </View>
      </View>

      {/* 3 İstatistik Kart Şeridi */}
      <View className="flex-row rounded-xl bg-bg-elevated/50 p-2.5 border border-white/5 gap-2">
        {/* Tahmini Yağ Oranı (Deurenberg Formülü) */}
        <View className="flex-1 items-center">
          <Text className="text-xs font-extrabold text-[#38BDF8] tabular-nums">
            %{analysis.estimatedBodyFatPct}
          </Text>
          <Text className="text-[9px] font-bold text-text-muted mt-0.5 text-center">
            {t('bmi_est_body_fat')}
          </Text>
        </View>

        <View className="w-[1px] bg-white/10" />

        {/* İdeal Kilo Aralığı */}
        <View className="flex-1 items-center">
          <Text className="text-xs font-extrabold text-[#10B981] tabular-nums">
            {analysis.healthyWeightRange[0]}-{analysis.healthyWeightRange[1]}
          </Text>
          <Text className="text-[9px] font-bold text-text-muted mt-0.5 text-center">
            {t('bmi_healthy_range')}
          </Text>
        </View>

        <View className="w-[1px] bg-white/10" />

        {/* Hedef Farkı */}
        <View className="flex-1 items-center">
          <Text
            style={{
              color:
                analysis.weightDeltaToHealthyKg === 0
                  ? '#10B981'
                  : analysis.weightDeltaToHealthyKg > 0
                    ? '#F59E0B'
                    : '#38BDF8',
            }}
            className="text-xs font-extrabold tabular-nums"
          >
            {analysis.weightDeltaToHealthyKg === 0
              ? t('bmi_in_range_badge')
              : analysis.weightDeltaToHealthyKg > 0
                ? `-${analysis.weightDeltaToHealthyKg} kg`
                : `+${Math.abs(analysis.weightDeltaToHealthyKg)} kg`}
          </Text>
          <Text className="text-[9px] font-bold text-text-muted mt-0.5 text-center">
            {analysis.weightDeltaToHealthyKg === 0
              ? t('bmi_in_range')
              : t('bmi_target_delta')}
          </Text>
        </View>
      </View>

      {/* Yaş & Cinsiyet Açıklama Metni */}
      <View className="flex-row items-center gap-1.5 px-1">
        <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
        <Text className="text-[10px] text-text-muted flex-1 leading-3.5">
          {analysis.summaryText} {t('bmi_scientific_note')}
        </Text>
      </View>

      {/* Hesaplama / Test Modalı */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 items-center justify-center bg-black/80 px-lg">
          <View className="w-full max-w-sm rounded-2xl bg-bg-surface p-lg border border-white/10 gap-md">
            <View className="flex-row items-center justify-between pb-1 border-b border-bg-elevated">
              <View className="flex-row items-center gap-2">
                <Ionicons name="speedometer-outline" size={18} color={colors.accent} />
                <Text className="text-base font-bold text-text-primary">
                  {t('bmi_modal_title')}
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Kilo & Boy Satırı */}
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-xs font-semibold text-text-muted">
                  {t('weight_kg_label')}
                </Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={customWeight}
                  onChangeText={setCustomWeight}
                  placeholder="75"
                  placeholderTextColor={colors.textMuted}
                  className="h-11 rounded-xl bg-bg-elevated px-3 text-sm font-bold text-text-primary border border-white/5"
                />
              </View>

              <View className="flex-1 gap-1">
                <Text className="text-xs font-semibold text-text-muted">
                  {t('height_label')}
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={customHeight}
                  onChangeText={setCustomHeight}
                  placeholder="178"
                  placeholderTextColor={colors.textMuted}
                  className="h-11 rounded-xl bg-bg-elevated px-3 text-sm font-bold text-text-primary border border-white/5"
                />
              </View>
            </View>

            {/* Yaş & Cinsiyet Satırı */}
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-xs font-semibold text-text-muted">
                  {t('age_label')}
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={customAge}
                  onChangeText={setCustomAge}
                  placeholder="28"
                  placeholderTextColor={colors.textMuted}
                  className="h-11 rounded-xl bg-bg-elevated px-3 text-sm font-bold text-text-primary border border-white/5"
                />
              </View>

              <View className="flex-1 gap-1">
                <Text className="text-xs font-semibold text-text-muted">
                  {t('gender_label')}
                </Text>
                <View className="flex-row h-11 rounded-xl bg-bg-elevated p-1 border border-white/5">
                  <Pressable
                    onPress={() => setCustomSex('male')}
                    className={`flex-1 items-center justify-center rounded-lg ${
                      customSex === 'male' ? 'bg-accent/20 border border-accent/40' : ''
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        customSex === 'male' ? 'text-accent' : 'text-text-muted'
                      }`}
                    >
                      {getSexDisplayName('male', lang)}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setCustomSex('female')}
                    className={`flex-1 items-center justify-center rounded-lg ${
                      customSex === 'female' ? 'bg-[#F472B6]/20 border border-[#F472B6]/40' : ''
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        customSex === 'female' ? 'text-[#F472B6]' : 'text-text-muted'
                      }`}
                    >
                      {getSexDisplayName('female', lang)}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Aksiyon Butonları */}
            <View className="flex-row gap-2 pt-2">
              <Pressable
                onPress={() => setModalVisible(false)}
                className="flex-1 py-3 items-center rounded-xl bg-bg-elevated active:opacity-70"
              >
                <Text className="text-xs font-semibold text-text-muted">{t('cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={handleApplyCustom}
                className="flex-1 py-3 items-center rounded-xl bg-accent active:opacity-80"
              >
                <Text className="text-xs font-bold text-bg-primary">{t('save')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Card>
  );
}
