import { and, desc, eq, like, sql } from 'drizzle-orm';

import { dateKey } from '../lib/calculations';
import { calculateTdeeAndMacros, type MacroTarget } from '../lib/nutritionCalculations';
import { generateUuid } from '../lib/uuid';
import { db } from './client';
import { recordMutation } from './mutations';
import {
  foodServings,
  foods,
  nutritionEntries,
  nutritionTargets,
  type foodServings as foodServingsTable,
  type foods as foodsTable,
} from './schema';
import rawFoods from './seed-data/foods.json';

export type LocalFood = typeof foodsTable.$inferSelect;
export type LocalServing = typeof foodServingsTable.$inferSelect;

export type FoodWithServings = LocalFood & {
  servings: LocalServing[];
};

export type NutritionEntryItem = {
  clientUuid: string;
  foodId: string | null;
  foodName: string;
  quantityG: number;
  servingLabel: string | null;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
};

export type NutritionMealGroup = {
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  title: string;
  totalKcal: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  entries: NutritionEntryItem[];
};

export type DailyNutritionReport = {
  dateStr: string;
  totalKcal: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  targets: MacroTarget;
  meals: NutritionMealGroup[];
};

// Çevrimdışı ilk açılışta gıda veritabanını doldurur
export async function seedLocalFoodsIfEmpty(): Promise<void> {
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(foods);

  if (Number(existing[0]?.count ?? 0) > 0) return;

  for (const f of rawFoods) {
    await db.insert(foods).values({
      id: f.id,
      name: f.name,
      brand: f.brand,
      barcode: null,
      kcalPer100: f.kcal_per_100,
      proteinPer100: f.protein_per_100,
      carbsPer100: f.carbs_per_100,
      fatPer100: f.fat_per_100,
      fiberPer100: f.fiber_per_100,
      baseUnit: f.base_unit as any,
    });

    for (const s of f.servings) {
      await db.insert(foodServings).values({
        id: s.id,
        foodId: f.id,
        label: s.label,
        grams: s.grams,
        isDefault: s.is_default,
      });
    }
  }

  console.log(`[seedLocalFoodsIfEmpty] ${rawFoods.length} temel gıda yerel DB'ye kaydedildi.`);
}

export async function searchFoods(query: string, limit = 25): Promise<FoodWithServings[]> {
  const q = query.trim();
  const where = q ? like(foods.name, `%${q}%`) : undefined;

  const foundFoods = await db
    .select()
    .from(foods)
    .where(where)
    .limit(limit);

  if (foundFoods.length === 0) return [];

  const results: FoodWithServings[] = [];
  for (const f of foundFoods) {
    const srvs = await db
      .select()
      .from(foodServings)
      .where(eq(foodServings.foodId, f.id));

    results.push({
      ...f,
      servings: srvs,
    });
  }

  return results;
}

export async function getFoodById(id: string): Promise<FoodWithServings | null> {
  const rows = await db.select().from(foods).where(eq(foods.id, id)).limit(1);
  if (rows.length === 0) return null;
  const f = rows[0];

  const srvs = await db.select().from(foodServings).where(eq(foodServings.foodId, id));
  return { ...f, servings: srvs };
}

export type CreateCustomFoodInput = {
  name: string;
  brand?: string;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  baseUnit?: 'g' | 'ml';
  servingLabel?: string;
  servingGrams?: number;
};

export async function createCustomFood(input: CreateCustomFoodInput): Promise<FoodWithServings> {
  const foodId = generateUuid();
  const baseUnit = input.baseUnit ?? 'g';

  await db.insert(foods).values({
    id: foodId,
    name: input.name.trim(),
    brand: input.brand?.trim() || null,
    barcode: null,
    kcalPer100: input.kcalPer100,
    proteinPer100: input.proteinPer100,
    carbsPer100: input.carbsPer100,
    fatPer100: input.fatPer100,
    fiberPer100: null,
    baseUnit,
  });

  const servings: LocalServing[] = [];
  const servingLabel = input.servingLabel?.trim() || '1 Porsiyon';
  const servingGrams = input.servingGrams && input.servingGrams > 0 ? input.servingGrams : 100;
  const srvId = generateUuid();

  await db.insert(foodServings).values({
    id: srvId,
    foodId,
    label: servingLabel,
    grams: servingGrams,
    isDefault: true,
  });

  servings.push({
    id: srvId,
    foodId,
    label: servingLabel,
    grams: servingGrams,
    isDefault: true,
  });

  return {
    id: foodId,
    name: input.name.trim(),
    brand: input.brand?.trim() || null,
    barcode: null,
    kcalPer100: input.kcalPer100,
    proteinPer100: input.proteinPer100,
    carbsPer100: input.carbsPer100,
    fatPer100: input.fatPer100,
    fiberPer100: null,
    baseUnit,
    servings,
  };
}

// Kullanıcının beslenme hedeflerini getirir (yoksa varsayılan hesaplar ve kaydeder)
export async function getOrInitNutritionTargets(
  userId: string,
  userProfile?: {
    weightKg?: number | null;
    heightCm?: number | null;
    birthYear?: number | null;
    sex?: 'male' | 'female' | 'other' | null;
    trainingDaysTarget?: number | null;
    goal?: any;
  }
): Promise<MacroTarget> {
  const existing = await db
    .select()
    .from(nutritionTargets)
    .where(eq(nutritionTargets.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    const t = existing[0];
    return {
      kcal: t.kcal,
      proteinG: t.proteinG,
      carbsG: t.carbsG ?? Math.round((t.kcal - t.proteinG * 4 - (t.fatG ?? 60) * 9) / 4),
      fatG: t.fatG ?? 65,
      tdeeEstimate: t.tdeeEstimate ?? t.kcal,
    };
  }

  // Profil verilerine göre Mifflin-St Jeor ile hesapla
  const calculated = calculateTdeeAndMacros({
    weightKg: userProfile?.weightKg ?? 75,
    heightCm: userProfile?.heightCm ?? 175,
    birthYear: userProfile?.birthYear ?? 1995,
    sex: userProfile?.sex ?? 'male',
    trainingDaysTarget: userProfile?.trainingDaysTarget ?? 4,
    goal: userProfile?.goal ?? 'hypertrophy',
  });

  const targetId = generateUuid();
  await db.insert(nutritionTargets).values({
    id: targetId,
    userId,
    kcal: calculated.kcal,
    proteinG: calculated.proteinG,
    carbsG: calculated.carbsG,
    fatG: calculated.fatG,
    tdeeEstimate: calculated.tdeeEstimate,
  });

  return calculated;
}

export async function saveNutritionTargets(userId: string, target: MacroTarget): Promise<void> {
  const existing = await db
    .select()
    .from(nutritionTargets)
    .where(eq(nutritionTargets.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(nutritionTargets)
      .set({
        kcal: target.kcal,
        proteinG: target.proteinG,
        carbsG: target.carbsG,
        fatG: target.fatG,
        tdeeEstimate: target.tdeeEstimate,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(nutritionTargets.userId, userId));
  } else {
    await db.insert(nutritionTargets).values({
      id: generateUuid(),
      userId,
      kcal: target.kcal,
      proteinG: target.proteinG,
      carbsG: target.carbsG,
      fatG: target.fatG,
      tdeeEstimate: target.tdeeEstimate,
    });
  }
}

// Günlük beslenme raporu ve öğün dökümü
export async function getDailyNutritionReport(
  userId: string,
  dateStr = dateKey(new Date()),
  profileData?: any
): Promise<DailyNutritionReport> {
  const targets = await getOrInitNutritionTargets(userId, profileData);

  const entries = await db
    .select()
    .from(nutritionEntries)
    .where(and(eq(nutritionEntries.userId, userId), eq(nutritionEntries.loggedOn, dateStr)))
    .orderBy(desc(nutritionEntries.createdAt));

  const MEAL_CONFIG: { meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'; title: string }[] = [
    { meal: 'breakfast', title: 'Kahvaltı' },
    { meal: 'lunch', title: 'Öğle Yemeği' },
    { meal: 'dinner', title: 'Akşam Yemeği' },
    { meal: 'snack', title: 'Ara Öğün & Atıştırmalık' },
  ];

  let totalKcal = 0;
  let totalProteinG = 0;
  let totalCarbsG = 0;
  let totalFatG = 0;

  const meals: NutritionMealGroup[] = MEAL_CONFIG.map((cfg) => {
    const mealEntries = entries.filter((e) => e.meal === cfg.meal);
    let mealKcal = 0;
    let mealProtein = 0;
    let mealCarbs = 0;
    let mealFat = 0;

    const formattedEntries = mealEntries.map((e) => {
      mealKcal += e.kcal;
      mealProtein += e.proteinG;
      mealCarbs += e.carbsG;
      mealFat += e.fatG;

      totalKcal += e.kcal;
      totalProteinG += e.proteinG;
      totalCarbsG += e.carbsG;
      totalFatG += e.fatG;

      return {
        clientUuid: e.clientUuid,
        foodId: e.foodId,
        foodName: e.foodNameSnapshot,
        quantityG: e.quantityG,
        servingLabel: e.servingLabel,
        kcal: Math.round(e.kcal),
        proteinG: Math.round(e.proteinG * 10) / 10,
        carbsG: Math.round(e.carbsG * 10) / 10,
        fatG: Math.round(e.fatG * 10) / 10,
        meal: e.meal as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      };
    });

    return {
      meal: cfg.meal,
      title: cfg.title,
      totalKcal: Math.round(mealKcal),
      totalProteinG: Math.round(mealProtein),
      totalCarbsG: Math.round(mealCarbs),
      totalFatG: Math.round(mealFat),
      entries: formattedEntries,
    };
  });

  return {
    dateStr,
    totalKcal: Math.round(totalKcal),
    totalProteinG: Math.round(totalProteinG),
    totalCarbsG: Math.round(totalCarbsG),
    totalFatG: Math.round(totalFatG),
    targets,
    meals,
  };
}

// Öğün kaydı ekle
export async function addNutritionEntry(data: {
  userId: string;
  foodId?: string;
  loggedOn?: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  quantityG: number;
  servingLabel?: string;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
}): Promise<string> {
  const clientUuid = generateUuid();
  const ratio = data.quantityG / 100;
  const kcal = Math.round(data.kcalPer100 * ratio);
  const proteinG = Math.round(data.proteinPer100 * ratio * 10) / 10;
  const carbsG = Math.round(data.carbsPer100 * ratio * 10) / 10;
  const fatG = Math.round(data.fatPer100 * ratio * 10) / 10;
  const loggedOn = data.loggedOn || dateKey(new Date());

  await db.insert(nutritionEntries).values({
    clientUuid,
    userId: data.userId,
    foodId: data.foodId ?? null,
    loggedOn,
    meal: data.meal,
    foodNameSnapshot: data.foodName,
    quantityG: data.quantityG,
    servingLabel: data.servingLabel ?? `${data.quantityG} g`,
    kcal,
    proteinG,
    carbsG,
    fatG,
  });

  await recordMutation('nutrition_entries', 'insert', {
    client_uuid: clientUuid,
    user_id: data.userId,
    food_id: data.foodId ?? null,
    logged_on: loggedOn,
    meal: data.meal,
    food_name_snapshot: data.foodName,
    quantity_g: data.quantityG,
    serving_label: data.servingLabel ?? `${data.quantityG} g`,
    kcal,
    protein_g: proteinG,
    carbs_g: carbsG,
    fat_g: fatG,
  });

  return clientUuid;
}

// Öğün kaydı sil
export async function deleteNutritionEntry(clientUuid: string): Promise<void> {
  await db.delete(nutritionEntries).where(eq(nutritionEntries.clientUuid, clientUuid));
  await recordMutation('nutrition_entries', 'delete', { client_uuid: clientUuid });
}

// Öğün kaydı güncelle
export async function updateNutritionEntry(
  clientUuid: string,
  data: {
    meal?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    quantityG?: number;
    servingLabel?: string;
    kcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  }
): Promise<void> {
  const existingRows = await db
    .select()
    .from(nutritionEntries)
    .where(eq(nutritionEntries.clientUuid, clientUuid))
    .limit(1);

  if (existingRows.length === 0) return;
  const existing = existingRows[0];

  const newMeal = data.meal ?? existing.meal;
  const newQuantityG = data.quantityG ?? existing.quantityG;
  const newServingLabel = data.servingLabel ?? (data.quantityG ? `${data.quantityG} g` : existing.servingLabel);

  let newKcal = data.kcal;
  let newProtein = data.proteinG;
  let newCarbs = data.carbsG;
  let newFat = data.fatG;

  if (newKcal === undefined || newProtein === undefined || newCarbs === undefined || newFat === undefined) {
    const ratio = existing.quantityG > 0 ? newQuantityG / existing.quantityG : 1;
    newKcal = newKcal ?? Math.round(existing.kcal * ratio);
    newProtein = newProtein ?? Math.round(existing.proteinG * ratio * 10) / 10;
    newCarbs = newCarbs ?? Math.round(existing.carbsG * ratio * 10) / 10;
    newFat = newFat ?? Math.round(existing.fatG * ratio * 10) / 10;
  }

  await db
    .update(nutritionEntries)
    .set({
      meal: newMeal,
      quantityG: newQuantityG,
      servingLabel: newServingLabel,
      kcal: newKcal,
      proteinG: newProtein,
      carbsG: newCarbs,
      fatG: newFat,
    })
    .where(eq(nutritionEntries.clientUuid, clientUuid));

  await recordMutation('nutrition_entries', 'update', {
    client_uuid: clientUuid,
    user_id: existing.userId,
    food_id: existing.foodId ?? null,
    logged_on: existing.loggedOn,
    meal: newMeal,
    food_name_snapshot: existing.foodNameSnapshot,
    quantity_g: newQuantityG,
    serving_label: newServingLabel,
    kcal: newKcal,
    protein_g: newProtein,
    carbs_g: newCarbs,
    fat_g: newFat,
  });
}
