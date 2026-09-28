import { create } from 'zustand';

import {
  addNutritionEntry as dbAddNutritionEntry,
  deleteNutritionEntry as dbDeleteNutritionEntry,
  getDailyNutritionReport,
  saveNutritionTargets as dbSaveNutritionTargets,
  updateNutritionEntry as dbUpdateNutritionEntry,
  type DailyNutritionReport,
} from '../db/nutrition';
import { drainSyncQueue } from '../db/syncEngine';
import { dateKey } from '../lib/calculations';
import type { MacroTarget } from '../lib/nutritionCalculations';
import { useAuthStore } from './useAuthStore';

type NutritionState = {
  selectedDate: string;
  report: DailyNutritionReport | null;
  isLoading: boolean;

  setSelectedDate: (dateStr: string) => void;
  loadDailyReport: () => Promise<void>;
  addFoodEntry: (data: {
    foodId?: string;
    meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    foodName: string;
    quantityG: number;
    servingLabel?: string;
    kcalPer100: number;
    proteinPer100: number;
    carbsPer100: number;
    fatPer100: number;
  }) => Promise<void>;
  updateFoodEntry: (
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
  ) => Promise<void>;
  removeFoodEntry: (clientUuid: string) => Promise<void>;
  updateTargets: (targets: MacroTarget) => Promise<void>;
};

export const useNutritionStore = create<NutritionState>((set, get) => ({
  selectedDate: dateKey(new Date()),
  report: null,
  isLoading: false,

  setSelectedDate: (dateStr: string) => {
    set({ selectedDate: dateStr });
    get().loadDailyReport();
  },

  loadDailyReport: async () => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) {
      set({ report: null });
      return;
    }

    set({ isLoading: true });
    try {
      const profile = useAuthStore.getState().profile;
      const rep = await getDailyNutritionReport(userId, get().selectedDate, profile);
      set({ report: rep });
    } catch (err) {
      console.error('[useNutritionStore] Rapor yükleme hatası:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  addFoodEntry: async (data) => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) throw new Error('Oturum açık değil');

    await dbAddNutritionEntry({
      userId,
      loggedOn: get().selectedDate,
      ...data,
    });

    await get().loadDailyReport();
    drainSyncQueue().catch(() => {});
  },

  updateFoodEntry: async (clientUuid, data) => {
    await dbUpdateNutritionEntry(clientUuid, data);
    await get().loadDailyReport();
    drainSyncQueue().catch(() => {});
  },

  removeFoodEntry: async (clientUuid: string) => {
    await dbDeleteNutritionEntry(clientUuid);
    await get().loadDailyReport();
    drainSyncQueue().catch(() => {});
  },

  updateTargets: async (targets: MacroTarget) => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) throw new Error('Oturum açık değil');

    await dbSaveNutritionTargets(userId, targets);
    await get().loadDailyReport();
  },
}));
