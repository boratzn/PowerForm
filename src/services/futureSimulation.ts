import { desc, eq } from 'drizzle-orm';

import { db } from '../db/client';
import { bodyMeasurements, bodyWeightLogs, nutritionEntries, nutritionTargets, workoutSessions } from '../db/schema';

export type AdherenceLevel = 0.65 | 0.85 | 1.0;

export type TrajectoryPoint = {
  day: number;
  weightKg: number;
  bodyFatPct: number;
  waistCm: number;
  armCm: number;
  chestCm: number;
  leanMassKg: number;
};

export type MilestoneItem = {
  day: number;
  titleKey: string;
  descKey: string;
  weightDelta: number;
  highlightText: string;
};

export type SimulationResult = {
  currentStats: {
    weightKg: number;
    bodyFatPct: number;
    waistCm: number;
    armCm: number;
    chestCm: number;
    leanMassKg: number;
  };
  projectedStats90: {
    weightKg: number;
    bodyFatPct: number;
    waistCm: number;
    armCm: number;
    chestCm: number;
    leanMassKg: number;
  };
  deltas: {
    weightKg: number;
    bodyFatPct: number;
    waistCm: number;
    armCm: number;
    chestCm: number;
    leanMassKg: number;
  };
  trajectoryPoints: TrajectoryPoint[];
  milestones: MilestoneItem[];
  scientificInsights: {
    title: string;
    description: string;
    bulletPoints: string[];
  };
};

/**
 * Runs the 90-day Future You projection simulation based on user's real logs and profile
 */
export async function runFutureSimulation(
  userId: string,
  profile: any,
  adherence: AdherenceLevel = 0.85
): Promise<SimulationResult> {
  // 1. Fetch latest weight logs
  let latestWeight = 78.0;
  const recentWeights = await db
    .select()
    .from(bodyWeightLogs)
    .where(eq(bodyWeightLogs.userId, userId))
    .orderBy(desc(bodyWeightLogs.loggedOn))
    .limit(14);

  if (recentWeights.length > 0) {
    latestWeight = recentWeights[0].weightKg;
  } else if (profile?.weight_kg) {
    latestWeight = Number(profile.weight_kg);
  }

  // 2. Fetch latest body measurements
  let currentWaist = 84.0;
  let currentArm = 36.0;
  let currentChest = 100.0;

  const recentMeasurements = await db
    .select()
    .from(bodyMeasurements)
    .where(eq(bodyMeasurements.userId, userId))
    .orderBy(desc(bodyMeasurements.loggedOn))
    .limit(1);

  if (recentMeasurements.length > 0) {
    const m = recentMeasurements[0];
    if (m.waistCm) currentWaist = m.waistCm;
    if (m.armRightCm || m.armLeftCm) currentArm = m.armRightCm || m.armLeftCm || currentArm;
    if (m.chestCm) currentChest = m.chestCm;
  }

  // 3. Estimate baseline body fat %
  const heightCm = Number(profile?.height_cm) || 176;
  const isMale = profile?.sex !== 'female';
  let initialBf = isMale ? 19.5 : 26.0;

  // Navy circumference approximation if waist & height available
  if (currentWaist > 50 && heightCm > 120) {
    const waistToHeight = currentWaist / heightCm;
    if (isMale) {
      initialBf = Math.max(8, Math.min(38, (waistToHeight * 100 - 25) * 1.2));
    } else {
      initialBf = Math.max(14, Math.min(45, (waistToHeight * 100 - 20) * 1.3));
    }
  }

  const initialLeanMass = Number((latestWeight * (1 - initialBf / 100)).toFixed(1));

  // 4. Compute 90-day trajectory based on primary goal and adherence
  const goal = profile?.primary_goal || 'hypertrophy';
  const experience = profile?.experience || 'intermediate';

  // Experience multiplier for hypertrophy potential
  const expGainFactor = experience === 'beginner' ? 1.4 : experience === 'advanced' ? 0.6 : 1.0;

  // Goal-driven 90-day parameters (at 100% adherence)
  let targetTotalWeightDelta = 0;
  let targetLeanMassDelta = 0;
  let targetFatMassDelta = 0;

  if (goal === 'fat_loss') {
    // Healthy deficit: ~0.55 kg fat loss / week at 100%
    targetFatMassDelta = -7.0;
    targetLeanMassDelta = 0.5 * expGainFactor; // slight muscle gain/preservation
    targetTotalWeightDelta = targetFatMassDelta + targetLeanMassDelta; // ~ -6.5 kg
  } else if (goal === 'hypertrophy') {
    // Lean surplus: ~1.5 - 2.5 kg muscle gain over 90 days + minor fat
    targetLeanMassDelta = 2.4 * expGainFactor;
    targetFatMassDelta = 0.8;
    targetTotalWeightDelta = targetLeanMassDelta + targetFatMassDelta; // ~ +3.2 kg
  } else if (goal === 'recomp') {
    // Body recomposition: lose fat while building muscle
    targetFatMassDelta = -4.0;
    targetLeanMassDelta = 2.0 * expGainFactor;
    targetTotalWeightDelta = targetFatMassDelta + targetLeanMassDelta; // ~ -2.0 kg
  } else if (goal === 'strength') {
    targetLeanMassDelta = 1.8 * expGainFactor;
    targetFatMassDelta = -1.0;
    targetTotalWeightDelta = targetLeanMassDelta + targetFatMassDelta; // ~ +0.8 kg
  } else {
    // general_health
    targetFatMassDelta = -3.0;
    targetLeanMassDelta = 1.2 * expGainFactor;
    targetTotalWeightDelta = targetFatMassDelta + targetLeanMassDelta; // ~ -1.8 kg
  }

  // Scale with adherence factor
  const scaledTotalWeightDelta = Number((targetTotalWeightDelta * adherence).toFixed(1));
  const scaledLeanMassDelta = Number((targetLeanMassDelta * adherence).toFixed(1));
  const scaledFatMassDelta = Number((targetFatMassDelta * adherence).toFixed(1));

  // Trajectory points: Day 0, 15, 30, 45, 60, 75, 90
  const days = [0, 15, 30, 45, 60, 75, 90];
  const trajectoryPoints: TrajectoryPoint[] = days.map((day) => {
    const progress = day / 90;
    // Slight non-linear curve (water weight drops early in cuts, muscle compounds steadily)
    const curveFactor =
      goal === 'fat_loss'
        ? Math.pow(progress, 0.85) // faster initial drop
        : Math.pow(progress, 1.1); // progressive compounding for muscle

    const curWeight = Number((latestWeight + scaledTotalWeightDelta * curveFactor).toFixed(1));
    const curLean = Number((initialLeanMass + scaledLeanMassDelta * curveFactor).toFixed(1));
    const curFatMass = Math.max(2, curWeight - curLean);
    const curBf = Number(((curFatMass / curWeight) * 100).toFixed(1));

    // Waist change correlates strongly with fat mass change (~0.8 cm per kg fat)
    const waistDelta = scaledFatMassDelta * 0.8 * curveFactor;
    const curWaist = Number((currentWaist + waistDelta).toFixed(1));

    // Arm and chest change correlates with lean mass gain (~0.6 cm per kg muscle)
    const armDelta = (scaledLeanMassDelta * 0.5 + scaledFatMassDelta * 0.1) * curveFactor;
    const curArm = Number((currentArm + armDelta).toFixed(1));

    const chestDelta = (scaledLeanMassDelta * 1.2 + scaledFatMassDelta * 0.3) * curveFactor;
    const curChest = Number((currentChest + chestDelta).toFixed(1));

    return {
      day,
      weightKg: curWeight,
      bodyFatPct: curBf,
      waistCm: curWaist,
      armCm: curArm,
      chestCm: curChest,
      leanMassKg: curLean,
    };
  });

  const finalPoint = trajectoryPoints[trajectoryPoints.length - 1];

  const deltas = {
    weightKg: Number((finalPoint.weightKg - latestWeight).toFixed(1)),
    bodyFatPct: Number((finalPoint.bodyFatPct - initialBf).toFixed(1)),
    waistCm: Number((finalPoint.waistCm - currentWaist).toFixed(1)),
    armCm: Number((finalPoint.armCm - currentArm).toFixed(1)),
    chestCm: Number((finalPoint.chestCm - currentChest).toFixed(1)),
    leanMassKg: Number((finalPoint.leanMassKg - initialLeanMass).toFixed(1)),
  };

  const day30Point = trajectoryPoints[2];
  const day60Point = trajectoryPoints[4];

  const milestones: MilestoneItem[] = [
    {
      day: 30,
      titleKey: 'milestone_day_30_title',
      descKey: 'milestone_day_30_desc',
      weightDelta: Number((day30Point.weightKg - latestWeight).toFixed(1)),
      highlightText: `${day30Point.weightKg} kg · %${day30Point.bodyFatPct} Yağ`,
    },
    {
      day: 60,
      titleKey: 'milestone_day_60_title',
      descKey: 'milestone_day_60_desc',
      weightDelta: Number((day60Point.weightKg - latestWeight).toFixed(1)),
      highlightText: `${day60Point.weightKg} kg · Bel: ${day60Point.waistCm} cm`,
    },
    {
      day: 90,
      titleKey: 'milestone_day_90_title',
      descKey: 'milestone_day_90_desc',
      weightDelta: deltas.weightKg,
      highlightText: `${finalPoint.weightKg} kg · Kol: ${finalPoint.armCm} cm`,
    },
  ];

  // Scientific insights
  const scientificInsights = {
    title: 'Bilimsel Hipertrofi & Yağ Oksidasyonu Analizi',
    description: `Mevcut antrenman hacminiz ve hedeflenen beslenme dengeniz doğrultusunda 90 günlük fizyolojik adaptasyonunuz:`,
    bulletPoints: [
      `Kas Proteini Sentezi (MPS): Yeterli protein (günlük ~2g/kg) ile 90 günde yaklaşık +${Math.max(0.4, deltas.leanMassKg)} kg saf yağsız kas kütlesi eklenir.`,
      `Bel & Viseral Yağ Azalımı: Bel ölçünüzde tahmini ${deltas.waistCm < 0 ? `${Math.abs(deltas.waistCm)} cm incelme` : `${deltas.waistCm} cm değişim`} gerçekleşir.`,
      `Güç & Nöromusküler Adaptasyon: Temel bileşik hareketlerde (Squat, Bench, Deadlift) e1RM değerlerinizde %12 - %18 progressive overload artışı öngörülmektedir.`,
      `Metabolik Esneklik: 12 haftalık düzenli ritim, insülin duyarlılığınızı ve istirahat metabolizma hızınızı (RMR) optimize eder.`,
    ],
  };

  return {
    currentStats: {
      weightKg: latestWeight,
      bodyFatPct: initialBf,
      waistCm: currentWaist,
      armCm: currentArm,
      chestCm: currentChest,
      leanMassKg: initialLeanMass,
    },
    projectedStats90: {
      weightKg: finalPoint.weightKg,
      bodyFatPct: finalPoint.bodyFatPct,
      waistCm: finalPoint.waistCm,
      armCm: finalPoint.armCm,
      chestCm: finalPoint.chestCm,
      leanMassKg: finalPoint.leanMassKg,
    },
    deltas,
    trajectoryPoints,
    milestones,
    scientificInsights,
  };
}
