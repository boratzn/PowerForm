import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { Card } from '../src/components/ui';
import { colors } from '../src/constants/theme';
import {
  runFutureSimulation,
  type AdherenceLevel,
  type SimulationResult,
} from '../src/services/futureSimulation';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useLanguageStore } from '../src/stores/useLanguageStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 160;

export default function FutureSimulationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);

  const [adherence, setAdherence] = useState<AdherenceLevel>(0.85);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSimulation() {
      if (!session?.user?.id) return;
      setLoading(true);
      try {
        const result = await runFutureSimulation(session.user.id, profile, adherence);
        setSimulation(result);
      } catch (err) {
        console.error('[FutureSimulation] Simülasyon hatası:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSimulation();
  }, [session?.user?.id, profile, adherence]);

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

    // Generate smooth SVG curve path
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

          {/* Area fill */}
          <Path d={areaD} fill="url(#chartGradient)" />

          {/* Line curve */}
          <Path
            d={pathD}
            fill="none"
            stroke={colors.accent}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Points & day labels */}
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
                  {c.day === 0 ? 'Bugün' : `${c.day}.G`}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </Card>
    );
  };

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

        <View className="w-9" />
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

        {/* Adherence Level Selector */}
        <View className="gap-1.5">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">
            {t('adherence_selector')}
          </Text>
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
                  onPress={() => setAdherence(opt.level)}
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
              90 günlük simülasyon hesaplanıyor…
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
                    <Text className="text-xs font-semibold text-text-muted">Kilo</Text>
                    <View
                      className={`px-1.5 py-0.5 rounded ${
                        simulation.deltas.weightKg <= 0 ? 'bg-accent/20' : 'bg-warning/20'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-extrabold ${
                          simulation.deltas.weightKg <= 0 ? 'text-accent' : 'text-warning'
                        }`}
                      >
                        {simulation.deltas.weightKg >= 0
                          ? `+${simulation.deltas.weightKg}`
                          : simulation.deltas.weightKg}{' '}
                        kg
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-baseline gap-1 mt-1">
                    <Text className="text-lg font-black text-text-primary">
                      {simulation.projectedStats90.weightKg}
                    </Text>
                    <Text className="text-xs text-text-muted">kg</Text>
                  </View>
                  <Text className="text-[10px] text-text-muted">
                    Şimdi: {simulation.currentStats.weightKg} kg
                  </Text>
                </Card>

                {/* Body Fat Card */}
                <Card className="flex-1 bg-bg-surface p-3 gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-text-muted">
                      {t('body_fat_est')}
                    </Text>
                    <View
                      className={`px-1.5 py-0.5 rounded ${
                        simulation.deltas.bodyFatPct <= 0 ? 'bg-accent/20' : 'bg-warning/20'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-extrabold ${
                          simulation.deltas.bodyFatPct <= 0 ? 'text-accent' : 'text-warning'
                        }`}
                      >
                        {simulation.deltas.bodyFatPct >= 0
                          ? `+${simulation.deltas.bodyFatPct}%`
                          : `${simulation.deltas.bodyFatPct}%`}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-baseline gap-1 mt-1">
                    <Text className="text-lg font-black text-[#38BDF8]">
                      %{simulation.projectedStats90.bodyFatPct}
                    </Text>
                  </View>
                  <Text className="text-[10px] text-text-muted">
                    Şimdi: %{simulation.currentStats.bodyFatPct}
                  </Text>
                </Card>
              </View>

              <View className="flex-row gap-2">
                {/* Waist Card */}
                <Card className="flex-1 bg-bg-surface p-3 gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-text-muted">
                      {t('waist_est')}
                    </Text>
                    <View
                      className={`px-1.5 py-0.5 rounded ${
                        simulation.deltas.waistCm <= 0 ? 'bg-accent/20' : 'bg-warning/20'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-extrabold ${
                          simulation.deltas.waistCm <= 0 ? 'text-accent' : 'text-warning'
                        }`}
                      >
                        {simulation.deltas.waistCm >= 0
                          ? `+${simulation.deltas.waistCm}`
                          : simulation.deltas.waistCm}{' '}
                        cm
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-baseline gap-1 mt-1">
                    <Text className="text-lg font-black text-text-primary">
                      {simulation.projectedStats90.waistCm}
                    </Text>
                    <Text className="text-xs text-text-muted">cm</Text>
                  </View>
                  <Text className="text-[10px] text-text-muted">
                    Şimdi: {simulation.currentStats.waistCm} cm
                  </Text>
                </Card>

                {/* Arm Card */}
                <Card className="flex-1 bg-bg-surface p-3 gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-text-muted">
                      {t('arm_est')}
                    </Text>
                    <View
                      className={`px-1.5 py-0.5 rounded ${
                        simulation.deltas.armCm >= 0 ? 'bg-accent/20' : 'bg-warning/20'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-extrabold ${
                          simulation.deltas.armCm >= 0 ? 'text-accent' : 'text-warning'
                        }`}
                      >
                        {simulation.deltas.armCm >= 0
                          ? `+${simulation.deltas.armCm}`
                          : simulation.deltas.armCm}{' '}
                        cm
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-baseline gap-1 mt-1">
                    <Text className="text-lg font-black text-[#FBBF24]">
                      {simulation.projectedStats90.armCm}
                    </Text>
                    <Text className="text-xs text-text-muted">cm</Text>
                  </View>
                  <Text className="text-[10px] text-text-muted">
                    Şimdi: {simulation.currentStats.armCm} cm
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
                Hedefimi Kilitle & Antrenmana Başla ➔
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}
