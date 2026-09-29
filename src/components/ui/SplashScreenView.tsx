import { Image } from 'expo-image';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { colors } from '../../constants/theme';

export function SplashScreenView() {
  return (
    <View className="flex-1 items-center justify-center bg-bg-primary px-lg">
      {/* Arka plan parlama efekti */}
      <View className="absolute h-72 w-72 rounded-full bg-accent/5 blur-3xl" />

      {/* İkon Konteyneri */}
      <View className="relative mb-6 items-center justify-center">
        <View className="h-28 w-28 items-center justify-center rounded-[28px] border-2 border-accent/40 bg-bg-surface p-2 shadow-2xl shadow-accent/30">
          <Image
            source={require('../../../assets/icon.png')}
            style={{ width: '100%', height: '100%', borderRadius: 20 }}
            contentFit="cover"
            transition={300}
          />
        </View>
        <View className="absolute -bottom-2 -right-2 rounded-full border border-accent/40 bg-[#151B23] px-2 py-0.5 shadow-md">
          <Text className="text-[10px] font-black uppercase tracking-wider text-accent">PRO</Text>
        </View>
      </View>

      {/* Marka İsmi & Tipografi */}
      <Text className="text-3xl font-black uppercase tracking-[6px] text-text-primary">
        POWER<Text className="text-accent">FORM</Text>
      </Text>

      {/* Tagline */}
      <Text className="mt-2 text-xs font-semibold uppercase tracking-[2px] text-text-muted">
        Smart Hypertrophy & Progression
      </Text>

      {/* Yükleme Göstergesi */}
      <View className="mt-12 items-center gap-3">
        <ActivityIndicator size="small" color={colors.accent} />
        <Text className="text-xs font-medium text-text-muted/70 tracking-wide">
          Hazırlanıyor…
        </Text>
      </View>

      {/* Alt Bilgi */}
      <View className="absolute bottom-10 items-center">
        <Text className="text-[11px] font-medium text-text-muted/40 tracking-wider">
          v1.0.6
        </Text>
      </View>
    </View>
  );
}
