import Constants, { ExecutionEnvironment } from 'expo-constants';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

import { useSubscriptionStore } from '../stores/useSubscriptionStore';

export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo' ||
  typeof (globalThis as any).expo !== 'undefined' ||
  Boolean(!NativeModules?.RNGoogleMobileAdsModule && !NativeModules?.RNAppModule);

let GoogleMobileAdsModule: any = null;

/**
 * Expo Go ortamında yerel Google Mobile Ads C++/Java binary'si bulunmadığından
 * TurboModule Invariant hatasını engellemek için modülü güvenli (lazy) yükler.
 */
export function getGoogleMobileAds() {
  if (isExpoGo) {
    return null;
  }

  // TurboModule veya NativeModule kontrolü — Expo Go'da bu modüller bulunmaz
  const hasTurbo =
    typeof TurboModuleRegistry !== 'undefined' &&
    TurboModuleRegistry.get &&
    Boolean(TurboModuleRegistry.get('RNAppModule'));
  const hasNative = Boolean(NativeModules?.RNGoogleMobileAdsModule || NativeModules?.RNAppModule);

  if (!hasTurbo && !hasNative) {
    return null;
  }

  if (!GoogleMobileAdsModule) {
    try {
      GoogleMobileAdsModule = require('react-native-google-mobile-ads');
    } catch (e) {
      console.warn('[AdService] react-native-google-mobile-ads modülü yüklenemedi:', e);
      return null;
    }
  }
  return GoogleMobileAdsModule;
}

// Google Resmi Test Reklam ID'leri
export const FALLBACK_TEST_IDS = {
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
};

const PROD_ANDROID_BANNER =
  process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER || 'ca-app-pub-4725502493968424/1939725983';

// Canlı reklam kimlikleri veya geliştirme aşaması için Google Test ID'leri
// Geliştirme modunda (__DEV__) Google'ın ceza vermemesi için otomatik Test ID kullanılır.
// Canlı APK / Production derlemelerinde ise gerçek AdMob kimliğin devreye girer.
export const AD_UNIT_IDS = {
  BANNER: Platform.select({
    ios: __DEV__ ? FALLBACK_TEST_IDS.BANNER : (process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER || FALLBACK_TEST_IDS.BANNER),
    android: __DEV__ ? FALLBACK_TEST_IDS.BANNER : (process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER || PROD_ANDROID_BANNER),
    default: FALLBACK_TEST_IDS.BANNER,
  }) as string,

  INTERSTITIAL: Platform.select({
    ios: __DEV__ ? FALLBACK_TEST_IDS.INTERSTITIAL : (process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL || FALLBACK_TEST_IDS.INTERSTITIAL),
    android: __DEV__ ? FALLBACK_TEST_IDS.INTERSTITIAL : (process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL || FALLBACK_TEST_IDS.INTERSTITIAL),
    default: FALLBACK_TEST_IDS.INTERSTITIAL,
  }) as string,

  REWARDED: Platform.select({
    ios: __DEV__ ? FALLBACK_TEST_IDS.REWARDED : (process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED || FALLBACK_TEST_IDS.REWARDED),
    android: __DEV__ ? FALLBACK_TEST_IDS.REWARDED : (process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED || FALLBACK_TEST_IDS.REWARDED),
    default: FALLBACK_TEST_IDS.REWARDED,
  }) as string,
};

class AdService {
  private isInitialized = false;
  private interstitialAd: any = null;
  private isInterstitialLoaded = false;
  private interstitialLoading = false;

  /**
   * AdMob SDK'sını başlatır ve genel istek ayarlarını yapılandırır
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const gma = getGoogleMobileAds();
    if (!gma) {
      if (isExpoGo) {
        console.log('[AdService] Expo Go ortamı tespit edildi. Reklamlar yalnızca yerel derlemede (APK/Dev Build) çalışır.');
      }
      return;
    }

    try {
      const mobileAds = gma.default || gma;
      const { MaxAdContentRating } = gma;
      if (mobileAds && typeof mobileAds === 'function') {
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating?.G,
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        });

        const adapterStatuses = await mobileAds().initialize();
        this.isInitialized = true;
        console.log('[AdService] Google Mobile Ads başarıyla başlatıldı:', adapterStatuses);

        // İlk geçiş reklamını arka planda ısıt (ön yükleme)
        this.preloadInterstitial();
      }
    } catch (error) {
      console.warn('[AdService] Başlatma hatası:', error);
    }
  }

  /**
   * Kullanıcının Pro abone olup olmadığını kontrol eder.
   * Pro abonelere hiçbir reklam gösterilmez.
   */
  get shouldShowAds(): boolean {
    return !useSubscriptionStore.getState().isPro;
  }

  /**
   * Geçiş reklamını (Interstitial) önceden yükler
   */
  preloadInterstitial(): void {
    if (!this.shouldShowAds || this.isInterstitialLoaded || this.interstitialLoading) return;

    const gma = getGoogleMobileAds();
    if (!gma?.InterstitialAd) return;

    try {
      this.interstitialLoading = true;
      const { InterstitialAd, AdEventType } = gma;
      this.interstitialAd = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL, {
        requestNonPersonalizedAdsOnly: true,
      });

      const unsubscribeLoaded = this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.isInterstitialLoaded = true;
        this.interstitialLoading = false;
      });

      const unsubscribeClosed = this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        this.isInterstitialLoaded = false;
        unsubscribeLoaded();
        unsubscribeClosed();
        // Reklam kapandıktan sonra bir sonrakini hazırla
        this.preloadInterstitial();
      });

      const unsubscribeError = this.interstitialAd.addAdEventListener(AdEventType.ERROR, (err: any) => {
        this.isInterstitialLoaded = false;
        this.interstitialLoading = false;
        unsubscribeLoaded();
        unsubscribeClosed();
        unsubscribeError();
        console.warn('[AdService] Interstitial yükleme hatası:', err);
      });

      this.interstitialAd.load();
    } catch (e) {
      this.interstitialLoading = false;
      console.warn('[AdService] Interstitial oluşturma hatası:', e);
    }
  }

  /**
   * Hazırsa geçiş reklamını gösterir
   */
  async showInterstitial(): Promise<boolean> {
    if (!this.shouldShowAds) return false;

    if (this.isInterstitialLoaded && this.interstitialAd) {
      try {
        await this.interstitialAd.show();
        return true;
      } catch (err) {
        console.warn('[AdService] Interstitial gösterim hatası:', err);
        return false;
      }
    } else {
      // Yüklü değilse arka planda yüklemeyi tetikle
      this.preloadInterstitial();
      return false;
    }
  }

  /**
   * Ödüllü reklam (Rewarded) gösterir ve ödül kazanıldığında callback çağırır
   */
  showRewarded(onRewarded: () => void, onDismiss?: () => void): void {
    if (!this.shouldShowAds) {
      // Pro kullanıcı zaten ödüle doğrudan hak kazanır
      onRewarded();
      return;
    }

    const gma = getGoogleMobileAds();
    if (!gma?.RewardedAd) {
      // Modül yoksa (örn Expo Go) akışı tıkamamak için ödülü ver
      onRewarded();
      return;
    }

    try {
      const { RewardedAd, RewardedAdEventType, AdEventType } = gma;
      const rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED, {
        requestNonPersonalizedAdsOnly: true,
      });

      let earned = false;

      const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        rewarded.show();
      });

      const unsubscribeEarned = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          earned = true;
          onRewarded();
        }
      );

      const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        cleanup();
        if (!earned && onDismiss) {
          onDismiss();
        }
      });

      const unsubscribeError = rewarded.addAdEventListener(AdEventType.ERROR, (err: any) => {
        cleanup();
        console.warn('[AdService] Rewarded reklam hatası:', err);
      });

      const cleanup = () => {
        unsubscribeLoaded();
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();
      };

      rewarded.load();
    } catch (err) {
      console.warn('[AdService] Rewarded başlatma hatası:', err);
    }
  }
}

export const adService = new AdService();
