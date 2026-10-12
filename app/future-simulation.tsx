import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { Card } from '../src/components/ui';
import { colors } from '../src/constants/theme';
import {
  runFutureSimulation,
  type AdherenceLevel,
  type SimulationCustomParams,
  type SimulationResult,
} from '../src/services/futureSimulation';
import { getGoalDisplayName, getExperienceDisplayName } from '../src/lib/i18n';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useLanguageStore } from '../src/stores/useLanguageStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 160;

const GOAL_KEYS: { key: any; icon: string }[] = [
  { key: 'hypertrophy', icon: '💪' },
  { key: 'fat_loss', icon: '🔥' },
  { key: 'recomp', icon: '⚡' },
  { key: 'strength', icon: '🏋️' },
  { key: 'general_health', icon: '🏃' },
];

const EXPERIENCE_KEYS: { key: any }[] = [
  { key: 'beginner' },
  { key: 'intermediate' },
  { key: 'advanced' },
];

const getPaceOptions = (lang: string) => [
  { key: 'conservative', label: lang === 'tr' ? 'Muhafazakar (Temiz & Yavaş)' : lang === 'de' ? 'Konservativ (Sauber & Langsam)' : lang === 'es' ? 'Conservador (Limpio y Lento)' : 'Conservative (Slow & Steady)' },
  { key: 'moderate', label: lang === 'tr' ? 'Dengeli (Önerilen)' : lang === 'de' ? 'Ausgewogen (Empfohlen)' : lang === 'es' ? 'Equilibrado (Recomendado)' : 'Moderate (Recommended)' },
  { key: 'aggressive', label: lang === 'tr' ? 'Agresif (Hızlı Sonuç)' : lang === 'de' ? 'Aggressiv (Schnelle Resultate)' : lang === 'es' ? 'Agresivo (Resultados Rápidos)' : 'Aggressive (Fast Results)' },
];

export default function FutureSimulationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const lang = useLanguageStore((s) => s.language);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);

  const [adherence, setAdherence] = useState<AdherenceLevel>(0.85);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Düzenleme / Yeniden Simüle Etme State'leri
  const [customParams, setCustomParams] = useState<SimulationCustomParams | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Form State
  const [formWeight, setFormWeight] = useState('');
  const [formTargetWeight, setFormTargetWeight] = useState('');
  const [formGoal, setFormGoal] = useState<any>('hypertrophy');
  const [formExperience, setFormExperience] = useState<any>('intermediate');
  const [formPace, setFormPace] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [formAdherence, setFormAdherence] = useState<AdherenceLevel>(0.85);

  const loadSimulation = async (overrides?: SimulationCustomParams | null) => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const activeOverrides = overrides !== undefined ? overrides : customParams;
      const result = await runFutureSimulation(
        session.user.id,
        profile,
        activeOverrides?.adherence ?? adherence,
        activeOverrides || undefined,
        lang
      );
      setSimulation(result);
    } catch (err) {
      console.error('[FutureSimulation] Simülasyon hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSimulation();
  }, [session?.user?.id, profile, adherence, lang]);

  const handleOpenEditModal = () => {
    const curWeight = customParams?.startingWeightKg ?? simulation?.currentStats.weightKg ?? Number((profile as any)?.weight_kg) ?? 78;
    setFormWeight(String(curWeight));
    const curTarget = customParams?.targetWeightKg ?? simulation?.projectedStats90.weightKg ?? '';
    setFormTargetWeight(curTarget ? String(curTarget) : '');
    setFormGoal(customParams?.goal ?? profile?.primary_goal ?? 'hypertrophy');
    setFormExperience(customParams?.experience ?? profile?.experience ?? 'intermediate');
    setFormPace(customParams?.caloricPace ?? 'moderate');
    setFormAdherence(customParams?.adherence ?? adherence);
    setEditModalVisible(true);
  };

  const handleApplyReSimulation = async () => {
    const parsedWeight = parseFloat(formWeight.replace(',', '.'));
    if (!isNaN(parsedWeight) && (parsedWeight < 30 || parsedWeight > 300)) {
      const invalidWeightTitle = lang === 'tr' ? 'Geçersiz Kilo' : lang === 'de' ? 'Ungültiges Gewicht' : lang === 'es' ? 'Peso no válido' : 'Invalid Weight';
      const invalidWeightDesc = lang === 'tr' ? 'Lütfen 30 ile 300 kg arasında geçerli bir başlangıç kilosu girin.' : lang === 'de' ? 'Bitte gib ein Startgewicht zwischen 30 und 300 kg ein.' : lang === 'es' ? 'Introduce un peso inicial válido entre 30 y 300 kg.' : 'Please enter a valid starting weight between 30 and 300 kg.';
      Alert.alert(invalidWeightTitle, invalidWeightDesc);
      return;
    }

    const parsedTarget = formTargetWeight.trim() ? parseFloat(formTargetWeight.replace(',', '.')) : NaN;
    if (!isNaN(parsedTarget) && (parsedTarget < 30 || parsedTarget > 300)) {
      const invalidTargetTitle = lang === 'tr' ? 'Geçersiz Hedef Kilo' : lang === 'de' ? 'Ungültiges Zielgewicht' : lang === 'es' ? 'Peso objetivo no válido' : 'Invalid Target Weight';
      const invalidTargetDesc = lang === 'tr' ? 'Lütfen 30 ile 300 kg arasında geçerli bir hedef kilo girin.' : lang === 'de' ? 'Bitte gib ein Zielgewicht zwischen 30 und 300 kg ein.' : lang === 'es' ? 'Introduce un peso objetivo válido entre 30 y 300 kg.' : 'Please enter a valid target weight between 30 and 300 kg.';
      Alert.alert(invalidTargetTitle, invalidTargetDesc);
      return;
    }

    const newCustomParams: SimulationCustomParams = {
      startingWeightKg: !isNaN(parsedWeight) ? parsedWeight : undefined,
      targetWeightKg: !isNaN(parsedTarget) ? parsedTarget : undefined,
      goal: formGoal,
      experience: formExperience,
      caloricPace: formPace,
      adherence: formAdherence,
    };

    setCustomParams(newCustomParams);
    setAdherence(formAdherence);
    setEditModalVisible(false);
    await loadSimulation(newCustomParams);
  };

  const handleResetToDefaults = async () => {
    setCustomParams(null);
    setAdherence(0.85);
    await loadSimulation(null);
  };

  // SVG Chart path calculation
  const renderTrajectoryChart = () => {
    if (!simulation || simulation.trajectoryPoints.length < 2) return null;

    const points = simulation.trajectoryPoints;
    const weights = points.map((p) => p.weightKg);
    const minW = Math.min(...weights) - 0.5;
    const maxW = Math.max(...weights) + 0.5;
    const range = maxW - minW || 1;

    const paddingX = 24;
    const paddingY = 24;
    const usableW = CHART_WIDTH - paddingX * 2;
    const usableH = CHART_HEIGHT - paddingY * 2;

    const coords = points.map((p, i) => {
      const x = paddingX + (i / (points.length - 1)) * usableW;
      const y = paddingY + (1 - (p.weightKg - minW) / range) * usableH;
      return { x, y, weight: p.weightKg, day: p.day };
    });

    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const midX = (p0.x + p1.x) / 2;
      pathD += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${CHART_HEIGHT} L ${coords[0].x} ${CHART_HEIGHT} Z`;

    return (
      <Card className="gap-sm bg-bg-surface p-sm overflow-hidden">
        <View className="flex-row items-center justify-between pb-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
            {t('trajectory_chart_title')}
          </Text>
          <Text className="text-xs font-bold text-accent">
            {simulation.deltas.weightKg >= 0
              ? `+${simulation.deltas.weightKg} kg`
              : `${simulation.deltas.weightKg} kg`}
          </Text>
        </View>

        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.35" />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          <Path d={areaD} fill="url(#chartGradient)" />

          <Path
            d={pathD}
            fill="none"
            stroke={colors.accent}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {coords.map((c, idx) => {
            const isMilestone = c.day === 0 || c.day === 30 || c.day === 60 || c.day === 90;
            if (!isMilestone) return null;

            return (
              <React.Fragment key={c.day}>
                <Circle
                  cx={c.x}
                  cy={c.y}
                  r="5"
                  fill={colors.bgPrimary}
                  stroke={colors.accent}
                  strokeWidth="2.5"
                />
                <SvgText
                  x={c.x}
                  y={c.y - 10}
                  fontSize="10"
                  fontWeight="bold"
                  fill={colors.textPrimary}
                  textAnchor="middle"
                >
                  {`${c.weight}kg`}
                </SvgText>
                <SvgText
                  x={c.x}
                  y={CHART_HEIGHT - 6}
                  fontSize="9"
                  fontWeight="600"
                  fill={colors.textMuted}
                  textAnchor="middle"
                >
                  {c.day === 0 ? t('future_sim_today') : `${c.day}${t('future_sim_day_short')}`}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </Card>
    );
  };

  const activeGoalKey = customParams?.goal ?? profile?.primary_goal ?? 'hypertrophy';
  const activeGoalLabel = getGoalDisplayName(activeGoalKey, lang);

  return (
    <View
      className="flex-1 bg-bg-primary"
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 16,
      }}
    >
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-lg pb-sm border-b border-bg-elevated">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-9 w-9 items-center justify-center rounded-full bg-bg-elevated active:opacity-60"
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>

        <View className="items-center">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="sparkles" size={15} color={colors.accent} />
            <Text className="text-base font-extrabold text-text-primary">
              {t('future_sim_title')}
            </Text>
          </View>
          <Text className="text-[10px] font-bold tracking-widest text-accent uppercase">
            {t('future_sim_badge')}
          </Text>
        </View>

        <Pressable
          onPress={handleOpenEditModal}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-accent/15 border border-accent/40 active:opacity-70"
        >
          <Ionicons name="options-outline" size={17} color={colors.accent} />
        </Pressable>
      </View>

      {/* Main Content */}
      <ScrollView
        className="flex-1 px-lg"
        contentContainerStyle={{ paddingVertical: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle Banner */}
        <View className="items-center px-sm">
          <Text className="text-xs text-text-muted text-center leading-4">
            {t('future_sim_subtitle')}
          </Text>
        </View>

        {/* Custom Simulation Active Notification Banner */}
        {customParams ? (
          <View className="rounded-2xl bg-accent/10 border border-accent/30 p-3 flex-row items-center justify-between">
            <View className="flex-1 mr-2">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-xs font-bold text-accent">{t('custom_simulation_active')}</Text>
              </View>
              <Text className="text-[11px] text-text-muted mt-0.5" numberOfLines={1}>
                {activeGoalLabel} · {t('simulation_start_prefix')} {customParams.startingWeightKg ? `${customParams.startingWeightKg} kg` : (t('tab_profile') || 'Profile')}
                {customParams.targetWeightKg ? ` · ${t('simulation_target_prefix')} ${customParams.targetWeightKg} kg` : ''}
              </Text>
            </View>
            <View className="flex-row gap-1.5">
              <Pressable
                onPress={handleOpenEditModal}
                className="bg-accent/20 px-2.5 py-1.5 rounded-lg border border-accent/30 active:opacity-70"
              >
                <Text className="text-[11px] font-bold text-accent">{t('edit')}</Text>
              </Pressable>
              <Pressable
                onPress={handleResetToDefaults}
                className="bg-bg-elevated px-2 py-1.5 rounded-lg active:opacity-70"
              >
                <Text className="text-[11px] font-semibold text-text-muted">{t('reset_btn')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Düzenle Butonu Banner */
          <Pressable
            onPress={handleOpenEditModal}
            className="flex-row items-center justify-between p-3 rounded-2xl bg-bg-surface border border-accent/30 active:opacity-80"
          >
            <View className="flex-row items-center gap-2.5">
              <View className="h-8 w-8 rounded-xl bg-accent/15 items-center justify-center">
                <Ionicons name="options-outline" size={17} color={colors.accent} />
              </View>
              <View>
                <Text className="text-xs font-bold text-accent">
                  {t('edit_simulation_banner_title')}
                </Text>
                <Text className="text-[10px] text-text-muted">
                  {t('edit_simulation_banner_desc')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </Pressable>
        )}

        {/* Adherence Level Selector */}
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
              {t('adherence_selector')}
            </Text>
            <Text className="text-[10px] text-text-muted">
              {adherence === 1.0 ? t('adherence_opt_strict') : adherence === 0.85 ? t('adherence_opt_steady') : t('adherence_opt_casual')}
            </Text>
          </View>
          <View className="flex-row gap-2">
            {[
              { level: 0.65 as AdherenceLevel, label: t('adherence_casual') },
              { level: 0.85 as AdherenceLevel, label: t('adherence_steady') },
              { level: 1.0 as AdherenceLevel, label: t('adherence_strict') },
            ].map((opt) => {
              const isSelected = adherence === opt.level;
              return (
                <Pressable
                  key={opt.level}
                  onPress={() => {
                    setAdherence(opt.level);
                    if (customParams) {
                      setCustomParams({ ...customParams, adherence: opt.level });
                    }
                  }}
                  className={`flex-1 items-center justify-center py-2.5 px-1 rounded-xl border ${
                    isSelected
                      ? 'bg-accent/15 border-accent'
                      : 'bg-bg-elevated/40 border-bg-elevated active:opacity-70'
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
        </View>

        {loading || !simulation ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color={colors.accent} />
            <Text className="text-xs text-text-muted mt-3">
              {t('loading')}
            </Text>
          </View>
        ) : (
          <>
            {/* 4 Stat Hero Grid: Current vs 90-Day Projected */}
            <View className="gap-2">
              <View className="flex-row gap-2">
                {/* Weight Card */}
                <Card className="flex-1 bg-bg-surface p-3 gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-text-muted">{t('weight')}</Text>
                    <Text
                      className={`text-[10px] font-bold ${
                        simulation.deltas.weightKg >= 0 ? 'text-accent' : 'text-warning'
                      }`}
                    >
                      {simulation.deltas.weightKg >= 0
                        ? `+${simulation.deltas.weightKg}`
                        : simulation.deltas.weightKg}{' '}
                      kg
                    </Text>
                  </View>
                  <View className="flex-row items-baseline gap-1 mt-1">
                    <Text className="text-xl font-black text-text-primary">
                      {simulation.projectedStats90.weightKg}
                    </Text>
                    <Text className="text-xs text-text-muted">kg</Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[10px] text-text-muted">
                      {t('future_sim_now_prefix')} {simulation.currentStats.weightKg} kg
                    </Text>
                    {simulation.customParams?.targetWeightKg && (
                      <Text className="text-[10px] font-bold text-accent">
                        🎯 {simulation.customParams.targetWeightKg} kg
                      </Text>
                    )}
                  </View>
                </Card>

                {/* Body Fat Card */}
                <Card className="flex-1 bg-bg-surface p-3 gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-text-muted">{t('body_fat_est')}</Text>
                    <Text
                      className={`text-[10px] font-bold ${
                        simulation.deltas.bodyFatPct <= 0 ? 'text-accent' : 'text-warning'
                      }`}
                    >
                      {simulation.deltas.bodyFatPct <= 0
                        ? `${simulation.deltas.bodyFatPct}%`
                        : `+${simulation.deltas.bodyFatPct}%`}
                    </Text>
                  </View>
                  <View className="flex-row items-baseline gap-1 mt-1">
                    <Text className="text-xl font-black text-accent">
                      %{simulation.projectedStats90.bodyFatPct}
                    </Text>
                  </View>
                  <Text className="text-[10px] text-text-muted">
                    {t('future_sim_now_prefix')} %{simulation.currentStats.bodyFatPct}
                  </Text>
                </Card>
              </View>

              <View className="flex-row gap-2">
                {/* Waist Card */}
                <Card className="flex-1 bg-bg-surface p-3 gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-text-muted">{t('waist_est')}</Text>
                    <Text
                      className={`text-[10px] font-bold ${
                        simulation.deltas.waistCm <= 0 ? 'text-accent' : 'text-warning'
                      }`}
                    >
                      {simulation.deltas.waistCm <= 0
                        ? `${simulation.deltas.waistCm} cm`
                        : `+${simulation.deltas.waistCm} cm`}
                    </Text>
                  </View>
                  <View className="flex-row items-baseline gap-1 mt-1">
                    <Text className="text-lg font-black text-[#38BDF8]">
                      {simulation.projectedStats90.waistCm}
                    </Text>
                    <Text className="text-xs text-text-muted">cm</Text>
                  </View>
                  <Text className="text-[10px] text-text-muted">
                    {t('future_sim_now_prefix')} {simulation.currentStats.waistCm} cm
                  </Text>
                </Card>

                {/* Arm Card */}
                <Card className="flex-1 bg-bg-surface p-3 gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-text-muted">{t('arm_est')}</Text>
                    <Text
                      className={`text-[10px] font-bold ${
                        simulation.deltas.armCm >= 0 ? 'text-accent' : 'text-text-muted'
                      }`}
                    >
                      {simulation.deltas.armCm >= 0
                        ? `+${simulation.deltas.armCm} cm`
                        : `${simulation.deltas.armCm} cm`}
                    </Text>
                  </View>
                  <View className="flex-row items-baseline gap-1 mt-1">
                    <Text className="text-lg font-black text-[#FBBF24]">
                      {simulation.projectedStats90.armCm}
                    </Text>
                    <Text className="text-xs text-text-muted">cm</Text>
                  </View>
                  <Text className="text-[10px] text-text-muted">
                    {t('future_sim_now_prefix')} {simulation.currentStats.armCm} cm
                  </Text>
                </Card>
              </View>
            </View>

            {/* Trajectory Graph */}
            {renderTrajectoryChart()}

            {/* 3-Phase Transformation Milestones */}
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {t('milestone_timeline')}
              </Text>

              {simulation.milestones.map((m) => (
                <Card key={m.day} className="gap-1.5 bg-bg-surface border-bg-elevated p-3.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="h-6 w-6 rounded-full bg-accent/20 items-center justify-center">
                        <Text className="text-xs font-bold text-accent">{m.day / 30}</Text>
                      </View>
                      <Text className="text-sm font-bold text-text-primary">
                        {t(m.titleKey as any)}
                      </Text>
                    </View>
                    <View className="bg-bg-elevated px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-accent">
                        {m.highlightText}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-text-muted leading-4 mt-0.5">
                    {t(m.descKey as any)}
                  </Text>
                </Card>
              ))}
            </View>

            {/* Scientific Breakdown */}
            <Card className="gap-2 bg-bg-surface border-accent/20 p-3.5">
              <View className="flex-row items-center gap-2">
                <Ionicons name="flask-outline" size={18} color={colors.accent} />
                <Text className="text-sm font-bold text-text-primary">
                  {t('scientific_breakdown_title')}
                </Text>
              </View>
              <Text className="text-xs text-text-muted">
                {simulation.scientificInsights.description}
              </Text>
              <View className="gap-2 pt-1">
                {simulation.scientificInsights.bulletPoints.map((bp, i) => (
                  <View key={i} className="flex-row items-start gap-2">
                    <Text className="text-accent text-xs mt-0.5">●</Text>
                    <Text className="text-xs text-text-muted leading-4 flex-1">
                      {bp}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Action Button */}
            <Pressable
              onPress={() => router.push('/workout')}
              className="bg-accent py-3.5 rounded-2xl items-center justify-center active:opacity-85 shadow-lg shadow-accent/20 mt-2"
            >
              <Text className="text-base font-bold text-bg-primary">
                {t('future_sim_lock_and_start')}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Simülasyonu Düzenleme & Yeniden Simüle Etme Modalı (Item 3) */}
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/80">
          <View
            style={{ maxHeight: '88%' }}
            className="rounded-t-3xl bg-bg-surface p-lg border-t border-white/10 gap-md"
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-2 border-b border-bg-elevated">
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 rounded-xl bg-accent/20 items-center justify-center">
                  <Ionicons name="sparkles" size={16} color={colors.accent} />
                </View>
                <View>
                  <Text className="text-base font-bold text-text-primary">
                    {t('future_sim_customize_title')}
                  </Text>
                  <Text className="text-[11px] text-text-muted">
                    {t('future_sim_customize_subtitle')}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setEditModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              {/* 1. Kilo Girişleri (Başlangıç & Hedef) */}
              <View className="gap-2">
                <View className="flex-row gap-2.5">
                  {/* Başlangıç Kilosu */}
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      {t('future_sim_start_weight')}
                    </Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={formWeight}
                      onChangeText={setFormWeight}
                      placeholder="78.5"
                      placeholderTextColor={colors.textMuted}
                      className="h-12 rounded-xl bg-bg-elevated px-4 text-base font-bold text-text-primary border border-white/5"
                    />
                  </View>

                  {/* Hedef Kilo */}
                  <View className="flex-1 gap-1.5">
                    <Text className="text-xs font-bold uppercase tracking-wider text-accent">
                      {t('future_sim_target_weight')}
                    </Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={formTargetWeight}
                      onChangeText={setFormTargetWeight}
                      placeholder="72.0"
                      placeholderTextColor={colors.textMuted}
                      className="h-12 rounded-xl bg-bg-elevated px-4 text-base font-bold text-accent border border-accent/30"
                    />
                  </View>
                </View>

                {/* Dinamik Hedef Değişim Göstergesi */}
                {(() => {
                  const startNum = parseFloat(formWeight.replace(',', '.'));
                  const targetNum = parseFloat(formTargetWeight.replace(',', '.'));
                  if (!isNaN(startNum) && !isNaN(targetNum)) {
                    const diff = Number((targetNum - startNum).toFixed(1));
                    const isLoss = diff < 0;
                    const isGain = diff > 0;
                    return (
                      <View className="flex-row items-center justify-between px-3 py-2 rounded-xl bg-accent/10 border border-accent/20">
                        <Text className="text-[11px] font-medium text-text-muted">
                          {t('future_sim_90d_delta_label')}
                        </Text>
                        <Text
                          className={`text-xs font-bold ${
                            isLoss ? 'text-warning' : isGain ? 'text-accent' : 'text-text-primary'
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff} kg (
                          {isLoss
                            ? t('future_sim_weight_loss')
                            : isGain
                            ? t('future_sim_mass_gain')
                            : t('future_sim_recomp')})
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })()}
              </View>

              {/* 2. Ana Hedef Seçimi */}
              <View className="gap-1.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {t('future_sim_goal_to_simulate')}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {GOAL_KEYS.map((g) => {
                    const isSelected = formGoal === g.key;
                    return (
                      <Pressable
                        key={g.key}
                        onPress={() => setFormGoal(g.key)}
                        className={`py-2 px-3 rounded-xl border flex-row items-center gap-1.5 ${
                          isSelected
                            ? 'bg-accent/20 border-accent'
                            : 'bg-bg-elevated/70 border-white/5'
                        }`}
                      >
                        <Text className="text-xs">{g.icon}</Text>
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? 'text-accent' : 'text-text-muted'
                          }`}
                        >
                          {getGoalDisplayName(g.key, lang)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* 3. Deneyim Seviyesi */}
              <View className="gap-1.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {t('future_sim_experience_level')}
                </Text>
                <View className="flex-row gap-2">
                  {EXPERIENCE_KEYS.map((e) => {
                    const isSelected = formExperience === e.key;
                    return (
                      <Pressable
                        key={e.key}
                        onPress={() => setFormExperience(e.key)}
                        className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                          isSelected
                            ? 'bg-accent/20 border-accent'
                            : 'bg-bg-elevated/70 border-white/5'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold text-center ${
                            isSelected ? 'text-accent' : 'text-text-muted'
                          }`}
                        >
                          {getExperienceDisplayName(e.key, lang)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* 4. Hedef Tempo */}
              <View className="gap-1.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {t('future_sim_progress_pace')}
                </Text>
                <View className="gap-1.5">
                  {getPaceOptions(lang).map((p) => {
                    const isSelected = formPace === p.key;
                    return (
                      <Pressable
                        key={p.key}
                        onPress={() => setFormPace(p.key as any)}
                        className={`p-2.5 rounded-xl border flex-row items-center justify-between ${
                          isSelected
                            ? 'bg-accent/15 border-accent'
                            : 'bg-bg-elevated/50 border-white/5'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? 'text-accent' : 'text-text-muted'
                          }`}
                        >
                          {p.label}
                        </Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={16} color={colors.accent} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* 5. Uyum / Disiplin Seviyesi */}
              <View className="gap-1.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {t('future_sim_adherence_rate')}
                </Text>
                <View className="flex-row gap-2">
                  {[
                    { level: 0.65 as AdherenceLevel, label: t('adherence_opt_casual') },
                    { level: 0.85 as AdherenceLevel, label: t('adherence_opt_steady') },
                    { level: 1.0 as AdherenceLevel, label: t('adherence_opt_strict') },
                  ].map((a) => {
                    const isSelected = formAdherence === a.level;
                    return (
                      <Pressable
                        key={a.level}
                        onPress={() => setFormAdherence(a.level)}
                        className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                          isSelected
                            ? 'bg-accent/20 border-accent'
                            : 'bg-bg-elevated/70 border-white/5'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            isSelected ? 'text-accent' : 'text-text-muted'
                          }`}
                        >
                          {a.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Uygula & Tekrar Simüle Et Butonu */}
              <View className="pt-2 pb-4 gap-2">
                <Pressable
                  onPress={handleApplyReSimulation}
                  className="bg-accent py-3.5 rounded-2xl items-center justify-center active:opacity-85 shadow-lg shadow-accent/25 flex-row gap-2"
                >
                  <Ionicons name="sparkles" size={18} color="#0B0F14" />
                  <Text className="text-base font-extrabold text-bg-primary">
                    {t('future_sim_resimulate_btn')}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setEditModalVisible(false)}
                  className="py-2.5 items-center rounded-xl bg-bg-elevated active:opacity-70"
                >
                  <Text className="text-xs font-semibold text-text-muted">{t('cancel')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
