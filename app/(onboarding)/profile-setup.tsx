import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../src/components/ui';
import { colors, radius, spacing } from '../../src/constants/theme';
import {
  DAYS_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  SEX_OPTIONS,
  type Equipment,
  type Experience,
  type Goal,
  type Sex,
} from '../../src/constants/enumOptions';
import { logBodyWeight } from '../../src/db/bodyWeight';
import { saveNutritionTargets } from '../../src/db/nutrition';
import { calculateTdeeAndMacros } from '../../src/lib/nutritionCalculations';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/useAuthStore';
import type { Database } from '../../src/types/database';

const TOTAL_STEPS = 5;

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  // Adım Takibi (0: Cinsiyet & Yaş, 1: Boy & Kilo, 2: Hedef & Deneyim, 3: Gün & Ekipman, 4: Özet & Onay)
  const [currentStep, setCurrentStep] = useState(0);

  // Form Değerleri
  const [sex, setSex] = useState<Sex>('male');
  const [birthYear, setBirthYear] = useState('1998');
  const [heightCm, setHeightCm] = useState('178');
  const [weightKg, setWeightKg] = useState('75.0');
  const [experience, setExperience] = useState<Experience>('beginner');
  const [primaryGoal, setPrimaryGoal] = useState<Goal>('hypertrophy');
  const [trainingDays, setTrainingDays] = useState<number>(4);
  const [equipment, setEquipment] = useState<Equipment[]>([
    'barbell',
    'dumbbell',
    'machine',
    'cable',
    'bodyweight',
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Yaş Hesaplama
  const calculatedAge = useMemo(() => {
    const y = parseInt(birthYear, 10);
    if (Number.isNaN(y) || y < 1920 || y > new Date().getFullYear()) return 26;
    return new Date().getFullYear() - y;
  }, [birthYear]);

  // Vücut Kitle İndeksi (BMI) Hesaplama
  const bmiInfo = useMemo(() => {
    const h = parseFloat(heightCm) / 100;
    const w = parseFloat(weightKg);
    if (!h || !w || h <= 0 || w <= 0) return { bmi: 23.7, label: 'Normal Kilo', color: colors.accent };
    const val = Number((w / (h * h)).toFixed(1));
    if (val < 18.5) return { bmi: val, label: 'Zayıf', color: '#38BDF8' };
    if (val < 25) return { bmi: val, label: 'Normal / İdeal Aralık', color: colors.accent };
    if (val < 30) return { bmi: val, label: 'Fazla Kilolu', color: colors.warning };
    return { bmi: val, label: 'Yüksek BMI', color: colors.danger };
  }, [heightCm, weightKg]);

  // Kişiye Özel Kalori ve Makro Hesaplama
  const calculatedMacros = useMemo(() => {
    const pWeight = parseFloat(weightKg) || 75;
    const pHeight = parseFloat(heightCm) || 178;
    const pYear = parseInt(birthYear, 10) || 1998;

    return calculateTdeeAndMacros({
      weightKg: pWeight,
      heightCm: pHeight,
      birthYear: pYear,
      sex,
      trainingDaysTarget: trainingDays,
      goal: primaryGoal,
    });
  }, [weightKg, heightCm, birthYear, sex, trainingDays, primaryGoal]);

  // Önerilen Program Şablonu
  const recommendedProgram = useMemo(() => {
    if (trainingDays <= 3) return { title: 'Full Body (Tüm Vücut)', split: '3 Gün / Hafta', desc: 'Haftalık yüksek frekans ve dengeli toparlanma' };
    if (trainingDays === 4) return { title: 'Upper / Lower (Üst / Alt Vücut)', split: '4 Gün / Hafta', desc: 'Hipertrofi ve güç gelişimi için altın oran' };
    return { title: 'Push / Pull / Legs (PPL)', split: '5-6 Gün / Hafta', desc: 'İzole kas grupları ve maksimum hacim artışı' };
  }, [trainingDays]);

  // Ekipman Toggle
  const toggleEquipment = (item: Equipment) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  const handleSelectAllEquipment = () => {
    if (equipment.length >= 5) {
      setEquipment(['dumbbell', 'bodyweight']);
    } else {
      setEquipment(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'smith', 'band']);
    }
  };

  // İleri Adıma Geçiş
  const handleNext = () => {
    setError(null);
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  // Geri Adıma Geçiş
  const handleBack = () => {
    setError(null);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.back();
    }
  };

  // Onboarding Bitirme ve Verileri Kaydetme
  const handleSubmit = async () => {
    if (!session) return;
    setError(null);
    setLoading(true);

    try {
      const updates: Database['public']['Tables']['profiles']['Update'] = {
        sex,
        experience,
        primary_goal: primaryGoal,
        training_days_target: trainingDays,
        available_equipment: equipment,
        onboarding_done: true,
      };

      const parsedBirthYear = parseInt(birthYear, 10);
      if (!Number.isNaN(parsedBirthYear)) updates.birth_year = parsedBirthYear;

      const parsedHeight = parseFloat(heightCm);
      if (!Number.isNaN(parsedHeight)) updates.height_cm = parsedHeight;

      // 1. Supabase Profiles Güncelle
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id);

      if (profileError) {
        console.warn('[profile-setup] Supabase profil güncelleme uyarısı:', profileError.message);
      }

      // 2. İlk Kilo Kaydını SQLite ve Supabase'e Yaz
      const parsedWeight = parseFloat(weightKg);
      if (!Number.isNaN(parsedWeight) && parsedWeight > 20) {
        await logBodyWeight(session.user.id, parsedWeight);
      }

      // 3. Hesaplanan Kalori & Makro Hedeflerini SQLite'a Kaydet
      await saveNutritionTargets(session.user.id, calculatedMacros);

      // 4. Auth Store Profilini Yenile
      await refreshProfile();
      // app/_layout.tsx otomatik olarak (tabs) rotasına yönlendirecek
    } catch (err: any) {
      console.warn('[profile-setup] Kaydetme hatası:', err);
      setError(err?.message || 'Bilgiler kaydedilirken bir sorun oluştu.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        {/* ÜST GEZİNME & İLERLEME ÇUBUĞU */}
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} hitSlop={12} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.progressContainer}>
            <View style={styles.progressSegments}>
              {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.segment,
                    idx <= currentStep ? styles.segmentActive : styles.segmentInactive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.stepText}>
              Adım {currentStep + 1} / {TOTAL_STEPS}
            </Text>
          </View>

          {currentStep < TOTAL_STEPS - 1 ? (
            <Pressable
              onPress={() => setCurrentStep(TOTAL_STEPS - 1)}
              hitSlop={12}
              style={styles.skipButton}
            >
              <Text style={styles.skipText}>Atla</Text>
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* ADIM İÇERİKLERİ */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ========================================================================= */}
          {/* ADIM 1: CİNSİYET & YAŞ */}
          {/* ========================================================================= */}
          {currentStep === 0 && (
            <View style={styles.stepBox}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Ionicons name="person" size={16} color={colors.accent} />
                </View>
                <Text style={styles.stepTitle}>Cinsiyetin ve Yaşın</Text>
                <Text style={styles.stepSubtitle}>
                  Metabolizma hızını ve enerji ihtiyacını doğru hesaplayabilmemiz için gereklidir.
                </Text>
              </View>

              {/* Cinsiyet Seçim Kartları */}
              <Text style={styles.sectionLabel}>CİNSİYET</Text>
              <View style={styles.genderGrid}>
                {SEX_OPTIONS.map((opt) => {
                  const isSelected = sex === opt.value;
                  let iconName: any = 'person-outline';
                  if (opt.value === 'male') iconName = 'male';
                  if (opt.value === 'female') iconName = 'female';
                  if (opt.value === 'other') iconName = 'transgender';
                  if (opt.value === 'unspecified') iconName = 'lock-closed-outline';

                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setSex(opt.value)}
                      style={[styles.genderCard, isSelected && styles.genderCardSelected]}
                    >
                      <View style={[styles.genderIconCircle, isSelected && styles.genderIconCircleSelected]}>
                        <Ionicons
                          name={iconName}
                          size={24}
                          color={isSelected ? colors.accent : colors.textMuted}
                        />
                      </View>
                      <Text style={[styles.genderLabel, isSelected && styles.genderLabelSelected]}>
                        {opt.label}
                      </Text>
                      {isSelected && (
                        <View style={styles.checkPill}>
                          <Ionicons name="checkmark" size={12} color="#0B0F14" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Doğum Yılı & Yaş Kartı */}
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>DOĞUM YILI & YAŞ</Text>
              <View style={styles.ageCard}>
                <View style={styles.ageInputRow}>
                  <Pressable
                    onPress={() => setBirthYear((prev) => String((parseInt(prev, 10) || 1998) - 1))}
                    style={styles.stepperBtn}
                  >
                    <Ionicons name="remove" size={20} color={colors.textPrimary} />
                  </Pressable>

                  <View style={styles.yearDisplay}>
                    <TextInput
                      value={birthYear}
                      onChangeText={setBirthYear}
                      keyboardType="number-pad"
                      maxLength={4}
                      style={styles.yearInput}
                    />
                    <Text style={styles.yearUnit}>Doğum Yılı</Text>
                  </View>

                  <Pressable
                    onPress={() => setBirthYear((prev) => String((parseInt(prev, 10) || 1998) + 1))}
                    style={styles.stepperBtn}
                  >
                    <Ionicons name="add" size={20} color={colors.textPrimary} />
                  </Pressable>
                </View>

                <View style={styles.ageBadgeRow}>
                  <View style={styles.calculatedAgeBadge}>
                    <Text style={styles.calculatedAgeText}>🎉 {calculatedAge} yaşındasın</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* ADIM 2: BOY & KİLO */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <View style={styles.stepBox}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Ionicons name="body" size={16} color={colors.accentAlt} />
                </View>
                <Text style={styles.stepTitle}>Fiziksel Ölçülerin</Text>
                <Text style={styles.stepSubtitle}>
                  Günlük kalori tüketimini (TDEE), protein hedefini ve 1RM güç oranını belirleyelim.
                </Text>
              </View>

              <View style={styles.measurementsRow}>
                {/* Boy Kartı */}
                <View style={styles.measureCard}>
                  <Text style={styles.measureLabel}>BOY</Text>
                  <View style={styles.measureValueRow}>
                    <TextInput
                      value={heightCm}
                      onChangeText={setHeightCm}
                      keyboardType="decimal-pad"
                      style={styles.measureInput}
                    />
                    <Text style={styles.measureUnit}>cm</Text>
                  </View>

                  <View style={styles.quickStepRow}>
                    <Pressable
                      onPress={() => setHeightCm((prev) => String(Math.max(100, (parseFloat(prev) || 178) - 1)))}
                      style={styles.miniStepBtn}
                    >
                      <Text style={styles.miniStepText}>-1</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setHeightCm((prev) => String(Math.min(240, (parseFloat(prev) || 178) + 1)))}
                      style={styles.miniStepBtn}
                    >
                      <Text style={styles.miniStepText}>+1</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Kilo Kartı */}
                <View style={styles.measureCard}>
                  <Text style={styles.measureLabel}>KİLO</Text>
                  <View style={styles.measureValueRow}>
                    <TextInput
                      value={weightKg}
                      onChangeText={setWeightKg}
                      keyboardType="decimal-pad"
                      style={styles.measureInput}
                    />
                    <Text style={styles.measureUnit}>kg</Text>
                  </View>

                  <View style={styles.quickStepRow}>
                    <Pressable
                      onPress={() => setWeightKg((prev) => String(Math.max(30, (parseFloat(prev) || 75) - 0.5).toFixed(1)))}
                      style={styles.miniStepBtn}
                    >
                      <Text style={styles.miniStepText}>-0.5</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setWeightKg((prev) => String(Math.min(250, (parseFloat(prev) || 75) + 0.5).toFixed(1)))}
                      style={styles.miniStepBtn}
                    >
                      <Text style={styles.miniStepText}>+0.5</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Canlı BMI Göstergesi */}
              <View style={styles.bmiCard}>
                <View style={styles.bmiHeaderRow}>
                  <View style={styles.bmiTitleGroup}>
                    <Ionicons name="speedometer-outline" size={18} color={bmiInfo.color} />
                    <Text style={styles.bmiTitle}>Vücut Kitle İndeksi (BMI)</Text>
                  </View>
                  <View style={[styles.bmiPill, { backgroundColor: `${bmiInfo.color}20` }]}>
                    <Text style={[styles.bmiPillText, { color: bmiInfo.color }]}>
                      {bmiInfo.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.bmiValueText}>
                  {bmiInfo.bmi}{' '}
                  <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: 'normal' }}>
                    kg/m²
                  </Text>
                </Text>
                <Text style={styles.bmiDescText}>
                  Ölçülerinize göre ilk tartı kaydınız oluşturulacak ve gelişim grafiğiniz bu tabandan başlayacaktır.
                </Text>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* ADIM 3: HEDEF & DENEYİM */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <View style={styles.stepBox}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Ionicons name="trophy" size={16} color={colors.warning} />
                </View>
                <Text style={styles.stepTitle}>Hedefin ve Deneyimin</Text>
                <Text style={styles.stepSubtitle}>
                  Sana en uygun antrenman hacmini ve kalori sürplus/açığını belirleyelim.
                </Text>
              </View>

              {/* Ana Hedef Listesi */}
              <Text style={styles.sectionLabel}>ANA HEDEFİN</Text>
              <View style={styles.optionsList}>
                {GOAL_OPTIONS.map((g) => {
                  const isSelected = primaryGoal === g.value;
                  let icon = 'barbell';
                  let desc = '';
                  if (g.value === 'hypertrophy') {
                    icon = 'fitness';
                    desc = 'Maksimum kas kütlesi ve hacim kazanımı (+300 kcal)';
                  } else if (g.value === 'strength') {
                    icon = 'flash';
                    desc = 'Squat, Bench, Deadlift gibi temel hareketlerde güç artışı';
                  } else if (g.value === 'fat_loss') {
                    icon = 'flame';
                    desc = 'Kası korurken vücut yağını azaltma (-400 kcal açık)';
                  } else if (g.value === 'recomp') {
                    icon = 'scale';
                    desc = 'Eş zamanlı kas kazanımı ve yağ yakımı';
                  } else {
                    icon = 'heart';
                    desc = 'Enerjik, fit ve fonksiyonel bir bedene sahip olma';
                  }

                  return (
                    <Pressable
                      key={g.value}
                      onPress={() => setPrimaryGoal(g.value)}
                      style={[styles.goalCard, isSelected && styles.goalCardSelected]}
                    >
                      <View style={[styles.goalIconCircle, isSelected && styles.goalIconCircleSelected]}>
                        <Ionicons
                          name={icon as any}
                          size={20}
                          color={isSelected ? colors.accent : colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.goalTitle, isSelected && styles.goalTitleSelected]}>
                          {g.label}
                        </Text>
                        <Text style={styles.goalDesc}>{desc}</Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Deneyim Seviyesi */}
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>DENEYİM SEVİYEN</Text>
              <View style={styles.experienceRow}>
                {EXPERIENCE_OPTIONS.map((exp) => {
                  const isSelected = experience === exp.value;
                  let emoji = '🌱';
                  let sub = '< 1 yıl';
                  if (exp.value === 'intermediate') {
                    emoji = '🌿';
                    sub = '1 - 3 yıl';
                  }
                  if (exp.value === 'advanced') {
                    emoji = '🌳';
                    sub = '3+ yıl';
                  }

                  return (
                    <Pressable
                      key={exp.value}
                      onPress={() => setExperience(exp.value)}
                      style={[styles.expCard, isSelected && styles.expCardSelected]}
                    >
                      <Text style={styles.expEmoji}>{emoji}</Text>
                      <Text style={[styles.expTitle, isSelected && styles.expTitleSelected]}>
                        {exp.label}
                      </Text>
                      <Text style={styles.expSub}>{sub}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* ADIM 4: HAFTALIK GÜN & EKİPMAN */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <View style={styles.stepBox}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Ionicons name="calendar" size={16} color={colors.accentAlt} />
                </View>
                <Text style={styles.stepTitle}>Sıklık ve Ekipman</Text>
                <Text style={styles.stepSubtitle}>
                  Haftalık yaşam tarzına ve spor salonu imkanlarına göre program eşleştirelim.
                </Text>
              </View>

              {/* Haftada Kaç Gün */}
              <Text style={styles.sectionLabel}>HAFTADA KAÇ GÜN ÇALIŞABİLİRSİN?</Text>
              <View style={styles.daysRow}>
                {DAYS_OPTIONS.map((d) => {
                  const isSelected = trainingDays === d;
                  const isRec = d === 4;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setTrainingDays(d)}
                      style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                    >
                      <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                        {d}
                      </Text>
                      <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>Gün</Text>
                      {isRec && <View style={styles.recDot} />}
                    </Pressable>
                  );
                })}
              </View>

              {/* Ekipman Seçimi */}
              <View style={[styles.rowBetween, { marginTop: 24, marginBottom: 8 }]}>
                <Text style={styles.sectionLabel}>EKİPMAN ERİŞİMİN</Text>
                <Pressable onPress={handleSelectAllEquipment} hitSlop={8}>
                  <Text style={styles.selectAllText}>
                    {equipment.length >= 5 ? 'Temizle' : 'Tümünü Seç (Spor Salonu)'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.equipmentWrap}>
                {EQUIPMENT_OPTIONS.map((eq) => {
                  const isSelected = equipment.includes(eq.value);
                  return (
                    <Pressable
                      key={eq.value}
                      onPress={() => toggleEquipment(eq.value)}
                      style={[styles.equipmentChip, isSelected && styles.equipmentChipSelected]}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                        size={16}
                        color={isSelected ? colors.accent : colors.textMuted}
                      />
                      <Text
                        style={[styles.equipmentChipText, isSelected && styles.equipmentChipTextSelected]}
                      >
                        {eq.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* ADIM 5: KİŞİSEL PLAN ÖZETİ & KALORİ HEDEFLERİ */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <View style={styles.stepBox}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepBadge, { backgroundColor: 'rgba(74, 222, 128, 0.2)' }]}>
                  <Ionicons name="sparkles" size={18} color={colors.accent} />
                </View>
                <Text style={styles.stepTitle}>Planın Hazırlandı! 🎉</Text>
                <Text style={styles.stepSubtitle}>
                  Girdiğin fiziksel özelliklere ve hedefine göre sana özel bilimsel beslenme ve antrenman planı oluşturuldu.
                </Text>
              </View>

              {/* Günlük Kalori & Makro Kartı */}
              <View style={styles.planCard}>
                <View style={styles.planCardHeader}>
                  <View style={styles.rowAlign}>
                    <Ionicons name="nutrition" size={18} color={colors.accent} />
                    <Text style={styles.planCardTitle}>Günlük Beslenme Hedefin</Text>
                  </View>
                  <View style={styles.tdeePill}>
                    <Text style={styles.tdeePillText}>TDEE: {calculatedMacros.tdeeEstimate} kcal</Text>
                  </View>
                </View>

                <View style={styles.targetKcalRow}>
                  <Text style={styles.targetKcalNum}>{calculatedMacros.kcal.toLocaleString()}</Text>
                  <Text style={styles.targetKcalUnit}>kcal / gün</Text>
                </View>

                {/* 3 Makro Çubuğu */}
                <View style={styles.macroGrid}>
                  <View style={styles.macroBox}>
                    <Text style={[styles.macroVal, { color: colors.accentAlt }]}>
                      {calculatedMacros.proteinG}g
                    </Text>
                    <Text style={styles.macroName}>Protein (2g/kg)</Text>
                  </View>

                  <View style={styles.macroBox}>
                    <Text style={[styles.macroVal, { color: colors.warning }]}>
                      {calculatedMacros.carbsG}g
                    </Text>
                    <Text style={styles.macroName}>Karbonhidrat</Text>
                  </View>

                  <View style={styles.macroBox}>
                    <Text style={[styles.macroVal, { color: colors.danger }]}>
                      {calculatedMacros.fatG}g
                    </Text>
                    <Text style={styles.macroName}>Sağlıklı Yağ</Text>
                  </View>
                </View>
              </View>

              {/* Önerilen Program Kartı */}
              <View style={[styles.planCard, { borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
                <View style={styles.planCardHeader}>
                  <View style={styles.rowAlign}>
                    <Ionicons name="barbell" size={18} color={colors.accentAlt} />
                    <Text style={styles.planCardTitle}>Önerilen Program Şablonu</Text>
                  </View>
                  <View style={[styles.tdeePill, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                    <Text style={[styles.tdeePillText, { color: colors.accentAlt }]}>
                      {recommendedProgram.split}
                    </Text>
                  </View>
                </View>

                <Text style={styles.programTitle}>{recommendedProgram.title}</Text>
                <Text style={styles.programDesc}>{recommendedProgram.desc}</Text>

                <View style={styles.programFeatureRow}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.accent} />
                  <Text style={styles.programFeatureText}>
                    Antrenman sekmesinden istediğin an değiştirebilir veya kendi programını yazabilirsin.
                  </Text>
                </View>
              </View>

              {/* Hata Bildirimi */}
              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* ALT BUTON */}
        <View style={styles.bottomBar}>
          <Button
            label={
              loading
                ? 'Kaydediliyor...'
                : currentStep === TOTAL_STEPS - 1
                ? 'Powerform’a Başla 🚀'
                : 'Devam Et →'
            }
            onPress={handleNext}
            disabled={loading}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  inner: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    gap: 6,
  },
  progressSegments: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    width: 28,
    height: 4,
    borderRadius: 2,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  segmentInactive: {
    backgroundColor: colors.bgElevated,
  },
  stepText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.bgSurface,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  stepBox: {
    paddingTop: 10,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    marginTop: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genderCard: {
    width: '48%',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
  },
  genderCardSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },
  genderIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderIconCircleSelected: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  genderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  genderLabelSelected: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  checkPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 12,
  },
  ageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearDisplay: {
    alignItems: 'center',
  },
  yearInput: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  yearUnit: {
    fontSize: 12,
    color: colors.textMuted,
  },
  ageBadgeRow: {
    alignItems: 'center',
  },
  calculatedAgeBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  calculatedAgeText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  measurementsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  measureCard: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    gap: 8,
    alignItems: 'center',
  },
  measureLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  measureValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  measureInput: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    minWidth: 70,
    textAlign: 'center',
  },
  measureUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  quickStepRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniStepBtn: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miniStepText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  bmiCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 8,
  },
  bmiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bmiTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bmiTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bmiPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bmiPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bmiValueText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  bmiDescText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  optionsList: {
    gap: 8,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
  },
  goalCardSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },
  goalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconCircleSelected: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  goalTitleSelected: {
    fontWeight: '700',
  },
  goalDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  experienceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  expCard: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  expCardSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },
  expEmoji: {
    fontSize: 24,
  },
  expTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  expTitleSelected: {
    fontWeight: '700',
    color: colors.accent,
  },
  expSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayCard: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  dayCardSelected: {
    borderColor: colors.accentAlt,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  dayNumberSelected: {
    color: colors.accentAlt,
  },
  dayText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  dayTextSelected: {
    color: colors.accentAlt,
    fontWeight: '700',
  },
  recDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentAlt,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentAlt,
  },
  equipmentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  equipmentChipSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  equipmentChipText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  equipmentChipTextSelected: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  planCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    padding: 16,
    marginBottom: 16,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tdeePill: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tdeePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  targetKcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 14,
  },
  targetKcalNum: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  targetKcalUnit: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroBox: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  macroVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  macroName: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  programTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  programDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginBottom: 12,
  },
  programFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 8,
  },
  programFeatureText: {
    fontSize: 11,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 15,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    flex: 1,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
