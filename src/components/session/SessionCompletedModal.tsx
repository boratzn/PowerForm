import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { colors } from '../../constants/theme';
import { formatDurationHuman } from '../../lib/calculations';
import { useLanguageStore } from '../../stores/useLanguageStore';

type SessionCompletedModalProps = {
  visible: boolean;
  durationSeconds: number;
  totalVolumeKg: number;
  prCount: number;
  onClose: () => void;
};

export function SessionCompletedModal({
  visible,
  durationSeconds,
  totalVolumeKg,
  prCount,
  onClose,
}: SessionCompletedModalProps) {
  const t = useLanguageStore((s) => s.t);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/80 px-lg">
        <View className="w-full max-w-sm rounded-3xl border border-accent/30 bg-[#151B23] p-6 shadow-2xl">
          {/* Parıldayan Başarı İkonu */}
          <View className="items-center mb-4">
            <View className="h-20 w-20 items-center justify-center rounded-3xl bg-accent/15 border border-accent/40 shadow-lg shadow-accent/25">
              <Ionicons name="trophy" size={40} color={colors.accent} />
            </View>
          </View>

          {/* Başlık & Tebrik */}
          <View className="items-center gap-1 mb-6">
            <Text className="text-center text-xl font-bold text-text-primary">
              {t('session_completed_title')}
            </Text>
            <Text className="text-center text-xs text-text-muted px-2">
              {t('session_completed_desc')}
            </Text>
          </View>

          {/* 3'lü İstatistik Özeti */}
          <View className="flex-row gap-2.5 mb-6">
            <View className="flex-1 items-center rounded-2xl bg-bg-elevated/70 border border-white/5 p-3">
              <Ionicons name="time-outline" size={18} color={colors.accentAlt} />
              <Text className="text-base font-bold text-text-primary mt-1.5" numberOfLines={1}>
                {formatDurationHuman(durationSeconds)}
              </Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                {t('duration')}
              </Text>
            </View>

            <View className="flex-1 items-center rounded-2xl bg-bg-elevated/70 border border-white/5 p-3">
              <Ionicons name="barbell-outline" size={18} color={colors.accent} />
              <Text className="text-base font-bold text-text-primary mt-1.5" numberOfLines={1}>
                {totalVolumeKg >= 1000 ? `${(totalVolumeKg / 1000).toFixed(1)}t` : `${totalVolumeKg}kg`}
              </Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                {t('volume')}
              </Text>
            </View>

            <View className="flex-1 items-center rounded-2xl bg-bg-elevated/70 border border-white/5 p-3">
              <Ionicons name="trophy-outline" size={18} color={colors.warning} />
              <Text className="text-base font-bold text-warning mt-1.5" numberOfLines={1}>
                {prCount}
              </Text>
              <Text className="text-[10px] uppercase font-semibold text-text-muted mt-0.5">
                {t('new_prs')}
              </Text>
            </View>
          </View>

          {/* Tamamla Butonu */}
          <Pressable
            onPress={onClose}
            className="h-12 flex-row items-center justify-center rounded-xl bg-accent px-4 shadow-lg shadow-accent/25 active:opacity-85"
          >
            <Text className="text-sm font-bold text-[#0B0F14]">
              {t('great_job')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
