import React, { useState } from 'react';
import { View, Text } from 'react-native';

import { AD_UNIT_IDS, getGoogleMobileAds, isExpoGo } from '../../services/adService';
import { useSubscriptionStore } from '../../stores/useSubscriptionStore';

type BannerAdViewProps = {
  className?: string;
};

export function BannerAdView({ className = '' }: BannerAdViewProps) {
  const isPro = useSubscriptionStore((s) => s.isPro);
  const [hasError, setHasError] = useState(false);

  // Pro kullanıcıya veya hata durumunda gizle
  if (isPro || hasError) {
    return null;
  }

  const gma = getGoogleMobileAds();

  // Expo Go Önizleme Modu: Expo Go'da yerel C++/Java AdMob SDK'sı bulunmadığından
  // yerleşimi, boyutu ve tasarımı görebilmen için simüle edilmiş test banner kutusu gösterir.
  if (isExpoGo || !gma?.BannerAd || !gma?.BannerAdSize) {
    return (
      <View className={`items-center justify-center px-4 py-2 bg-bg-primary ${className}`}>
        <View className="w-full h-[52px] flex-row items-center justify-between px-3.5 rounded-xl border border-dashed border-accent/40 bg-[#151B23]">
          <View className="flex-row items-center gap-2">
            <View className="px-1.5 py-0.5 rounded bg-accent/20 border border-accent/30">
              <Text className="text-[10px] font-bold text-accent">REKLAM</Text>
            </View>
            <Text className="text-xs font-semibold text-text-primary">
              Google AdMob Banner
            </Text>
          </View>
          <Text className="text-[10px] font-medium text-text-muted">
            Expo Go Önizleme
          </Text>
        </View>
      </View>
    );
  }

  const { BannerAd, BannerAdSize } = gma;

  return (
    <View className={`items-center justify-center py-1 bg-bg-primary ${className}`}>
      <BannerAd
        unitId={AD_UNIT_IDS.BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error: any) => {
          console.warn('[BannerAdView] Reklam yüklenemedi:', error);
          setHasError(true);
        }}
      />
    </View>
  );
}
