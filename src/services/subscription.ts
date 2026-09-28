import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, {
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

export type SubscriptionPackage = {
  id: string;
  title: string;
  description: string;
  priceString: string;
  period: 'monthly' | 'annual';
  badge?: string;
  rawPackage?: PurchasesPackage;
  rawProduct?: PurchasesStoreProduct;
};

// Standart mock paketler (RevenueCat henüz bağlanmadıysa veya test modundaysa)
export const MOCK_PACKAGES: SubscriptionPackage[] = [
  {
    id: 'powerform_pro_annual',
    title: 'Yıllık Pro Plan',
    description: 'Yılda bir kez faturalandırılır (₺74,99 / ay)',
    priceString: '₺899,99 / yıl',
    period: 'annual',
    badge: '%30 TASARRUF',
  },
  {
    id: 'powerform_pro_monthly',
    title: 'Aylık Pro Plan',
    description: 'Her ay otomatik yenilenir, dilediğin an iptal et',
    priceString: '₺129,99 / ay',
    period: 'monthly',
  },
];

class SubscriptionService {
  private isConfigured = false;
  private isMock = true;
  private mockActivePlan: 'monthly' | 'annual' = 'annual';

  get isMockMode(): boolean {
    return this.isMock;
  }

  async initialize(userId?: string): Promise<boolean> {
    if (this.isConfigured) {
      if (userId && !this.isMock) {
        try {
          await Purchases.logIn(userId);
        } catch (e) {
          console.warn('[SubscriptionService] Purchases.logIn hatası:', e);
        }
      }
      return true;
    }

    const isExpoGo =
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants as any).appOwnership === 'expo';

    const appleKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
    const googleKey = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;
    const testKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY || 'test_vFFrQtSHhkQpsuAqxVtPPoxrikH';

    // Expo Go ortamında yerel Google Play Billing bulunmadığından RevenueCat Test Store anahtarı kullanılır.
    // Gerçek cihaz / Play Store sürümünde ise resmi goog_ anahtarı kullanılır.
    let apiKey = (Platform.OS === 'ios' ? appleKey : googleKey) || googleKey || appleKey;
    if (isExpoGo && testKey) {
      console.log('[SubscriptionService] Expo Go tespit edildi, Test Store anahtarı ile başlatılıyor.');
      apiKey = testKey;
    }

    if (!apiKey || apiKey.trim() === '') {
      console.log('[SubscriptionService] RevenueCat API Key bulunamadı, Test/Mock modunda çalışılıyor.');
      this.isMock = true;
      this.isConfigured = false;
      return false;
    }

    try {
      Purchases.configure({
        apiKey,
        appUserID: userId ?? null,
      });
      this.isConfigured = true;
      this.isMock = false;
      console.log('[SubscriptionService] RevenueCat başarıyla başlatıldı.');
      return true;
    } catch (err: any) {
      console.warn('[SubscriptionService] RevenueCat başlatma uyarısı:', err?.message || err);
      this.isMock = true;
      this.isConfigured = false;
      return false;
    }
  }

  async checkIsPro(): Promise<boolean> {
    const profile = useAuthStore.getState().profile;

    // 1. RevenueCat yapılandırılmışsa ve aktifse, ana kaynak RevenueCat'tir
    if (this.isConfigured && !this.isMock) {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        const hasActivePro = typeof customerInfo.entitlements.active['pro'] !== 'undefined';

        // Eğer Supabase profilindeki is_pro durumu RevenueCat ile uyuşmuyorsa eşitle
        if (profile?.id && profile.is_pro !== hasActivePro) {
          await supabase.from('profiles').update({ is_pro: hasActivePro }).eq('id', profile.id);
          await useAuthStore.getState().refreshProfile();
        }

        return hasActivePro;
      } catch (err) {
        console.warn('[SubscriptionService] RevenueCat müşteri bilgisi okunamadı, profile bakılıyor:', err);
      }
    }

    // 2. RevenueCat bağlı değilse veya mock modundaysa profil durumuna bak
    return profile?.is_pro ?? false;
  }

  async getPackages(): Promise<SubscriptionPackage[]> {
    if (!this.isConfigured || this.isMock) {
      return MOCK_PACKAGES;
    }

    try {
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current || Object.values(offerings.all)[0];
      if (currentOffering && currentOffering.availablePackages.length > 0) {
        return currentOffering.availablePackages.map((pkg) => {
          const isAnnual =
            pkg.packageType === 'ANNUAL' ||
            pkg.identifier.toLowerCase().includes('annual') ||
            pkg.product.identifier.toLowerCase().includes('annual');
          return {
            id: pkg.identifier,
            title: isAnnual ? 'Yıllık Pro Plan' : 'Aylık Pro Plan',
            description: isAnnual
              ? 'Yılda bir kez faturalandırılır'
              : 'Her ay otomatik yenilenir, dilediğin an iptal et',
            priceString: pkg.product.priceString,
            period: isAnnual ? 'annual' : 'monthly',
            badge: isAnnual ? '%30 TASARRUF' : undefined,
            rawPackage: pkg,
          };
        });
      }
    } catch (err) {
      console.warn('[SubscriptionService] Offerings paketleri çekilemedi:', err);
    }

    // RevenueCat Offering henüz ayarlanmadıysa doğrudan Google Play Store ürünlerini çek
    try {
      const products = await Purchases.getProducts(['powerform_pro_annual', 'powerform_pro_monthly']);
      if (products && products.length > 0) {
        return products.map((prod) => {
          const isAnnual = prod.identifier.toLowerCase().includes('annual');
          return {
            id: prod.identifier,
            title: isAnnual ? 'Yıllık Pro Plan' : 'Aylık Pro Plan',
            description: isAnnual
              ? 'Yılda bir kez faturalandırılır'
              : 'Her ay otomatik yenilenir, dilediğin an iptal et',
            priceString: prod.priceString,
            period: isAnnual ? 'annual' : 'monthly',
            badge: isAnnual ? '%30 TASARRUF' : undefined,
            rawProduct: prod,
          };
        });
      }
    } catch (prodErr) {
      console.warn('[SubscriptionService] Google Play ürünleri doğrudan çekilemedi:', prodErr);
    }

    return MOCK_PACKAGES;
  }

  async getActivePlanType(): Promise<'free' | 'monthly' | 'annual'> {
    const isPro = await this.checkIsPro();
    if (!isPro) return 'free';

    if (this.isConfigured && !this.isMock) {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        const proEntitlement = customerInfo.entitlements.active['pro'];
        if (proEntitlement) {
          const prodId = (proEntitlement.productIdentifier || '').toLowerCase();
          if (prodId.includes('annual') || prodId.includes('year')) {
            return 'annual';
          }
          if (prodId.includes('monthly') || prodId.includes('month')) {
            return 'monthly';
          }
        }
      } catch (e) {
        console.warn('[SubscriptionService] Plan tipi okunamadı:', e);
      }
    }

    return this.mockActivePlan;
  }

  async purchasePackage(pkg: SubscriptionPackage): Promise<boolean> {
    const profile = useAuthStore.getState().profile;
    const isAnnual = pkg.period === 'annual' || pkg.id.includes('annual');

    // Sadece RevenueCat hiç başlatılamadıysa (Expo Go / test anahtarı) mock simülasyonu yap
    if (this.isMock || !this.isConfigured) {
      console.log('[SubscriptionService] Mock satın alma simüle edildi:', pkg.title);
      this.mockActivePlan = isAnnual ? 'annual' : 'monthly';
      if (profile?.id) {
        await supabase.from('profiles').update({ is_pro: true }).eq('id', profile.id);
        await useAuthStore.getState().refreshProfile();
      }
      return true;
    }

    try {
      let customerInfo: any = null;

      if (pkg.rawPackage) {
        const res = await Purchases.purchasePackage(pkg.rawPackage);
        customerInfo = res.customerInfo;
      } else if (pkg.rawProduct) {
        const res = await Purchases.purchaseStoreProduct(pkg.rawProduct);
        customerInfo = res.customerInfo;
      } else {
        // rawPackage ve rawProduct yoksa, doğrudan Google Play ürününü çek ve satın almayı başlat
        const targetProdId = isAnnual ? 'powerform_pro_annual' : 'powerform_pro_monthly';
        const products = await Purchases.getProducts([targetProdId]);
        if (products && products.length > 0) {
          const res = await Purchases.purchaseStoreProduct(products[0]);
          customerInfo = res.customerInfo;
        } else {
          throw new Error('Google Play abonelik ürünü bulunamadı. Lütfen internet bağlantınızı ve Google Play hesabınızı kontrol edin.');
        }
      }

      const isPro = customerInfo && typeof customerInfo.entitlements.active['pro'] !== 'undefined';
      if (isPro) {
        this.mockActivePlan = isAnnual ? 'annual' : 'monthly';
        if (profile?.id) {
          await supabase.from('profiles').update({ is_pro: true }).eq('id', profile.id);
          await useAuthStore.getState().refreshProfile();
        }
      }
      return isPro;
    } catch (err: any) {
      if (err.userCancelled) {
        return false;
      }
      console.error('[SubscriptionService] Satın alma hatası:', err);
      throw err;
    }
  }

  async restorePurchases(): Promise<boolean> {
    if (this.isMock || !this.isConfigured) {
      const profile = useAuthStore.getState().profile;
      if (profile?.id) {
        await supabase.from('profiles').update({ is_pro: true }).eq('id', profile.id);
        await useAuthStore.getState().refreshProfile();
      }
      return true;
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPro = typeof customerInfo.entitlements.active['pro'] !== 'undefined';
      const profile = useAuthStore.getState().profile;
      if (isPro && profile?.id) {
        await supabase.from('profiles').update({ is_pro: true }).eq('id', profile.id);
        await useAuthStore.getState().refreshProfile();
      }
      return isPro;
    } catch (err) {
      console.error('[SubscriptionService] Geri yükleme hatası:', err);
      throw err;
    }
  }

  async setMockProStatus(isPro: boolean, plan: 'monthly' | 'annual' = 'annual'): Promise<void> {
    this.mockActivePlan = plan;
    const profile = useAuthStore.getState().profile;
    if (profile?.id) {
      await supabase.from('profiles').update({ is_pro: isPro }).eq('id', profile.id);
      await useAuthStore.getState().refreshProfile();
    }
  }

  async logOut(): Promise<void> {
    if (this.isConfigured && !this.isMock) {
      try {
        await Purchases.logOut();
      } catch (err) {
        console.warn('[SubscriptionService] Purchases.logOut uyarısı:', err);
      }
    }
  }
}

export const subscriptionService = new SubscriptionService();
