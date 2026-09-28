import { create } from 'zustand';

import {
  MOCK_PACKAGES,
  subscriptionService,
  type SubscriptionPackage,
} from '../services/subscription';

type SubscriptionState = {
  isPro: boolean;
  planType: 'free' | 'monthly' | 'annual';
  packages: SubscriptionPackage[];
  selectedPackageId: string;
  isLoading: boolean;
  isMockMode: boolean;
  paywallVisible: boolean;

  openPaywall: () => void;
  closePaywall: () => void;
  setSelectedPackageId: (id: string) => void;
  initialize: (userId?: string) => Promise<void>;
  purchase: (pkgId?: string) => Promise<boolean>;
  restore: () => Promise<boolean>;
  toggleMockPro: () => Promise<void>;
  logOut: () => Promise<void>;
};

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isPro: false,
  planType: 'free',
  packages: MOCK_PACKAGES,
  selectedPackageId: 'powerform_pro_annual',
  isLoading: false,
  isMockMode: true,
  paywallVisible: false,

  openPaywall: () => set({ paywallVisible: true }),
  closePaywall: () => set({ paywallVisible: false }),

  setSelectedPackageId: (id: string) => set({ selectedPackageId: id }),

  initialize: async (userId?: string) => {
    set({ isLoading: true });
    try {
      await subscriptionService.initialize(userId);
      const isPro = await subscriptionService.checkIsPro();
      const planType = await subscriptionService.getActivePlanType();
      const packages = await subscriptionService.getPackages();

      set({
        isPro,
        planType,
        packages,
        isMockMode: subscriptionService.isMockMode,
        selectedPackageId: packages[0]?.id || 'powerform_pro_annual',
      });
    } catch (err) {
      console.warn('[useSubscriptionStore] Başlatma hatası:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  purchase: async (pkgId?: string) => {
    const { packages, selectedPackageId } = get();
    const targetId = pkgId || selectedPackageId;
    const pkg = packages.find((p) => p.id === targetId) || packages[0];

    if (!pkg) return false;

    set({ isLoading: true });
    try {
      const success = await subscriptionService.purchasePackage(pkg);
      if (success) {
        const planType = await subscriptionService.getActivePlanType();
        set({ isPro: true, planType });
      }
      return success;
    } catch (err) {
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  restore: async () => {
    set({ isLoading: true });
    try {
      const isPro = await subscriptionService.restorePurchases();
      const planType = await subscriptionService.getActivePlanType();
      set({ isPro, planType });
      return isPro;
    } catch (err) {
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  toggleMockPro: async () => {
    const current = get().isPro;
    const next = !current;
    await subscriptionService.setMockProStatus(next);
    const planType = next ? 'annual' : 'free';
    set({ isPro: next, planType });
    if (next) {
      set({ paywallVisible: false });
    }
  },

  logOut: async () => {
    await subscriptionService.logOut();
    set({ isPro: false, planType: 'free' });
  },
}));
