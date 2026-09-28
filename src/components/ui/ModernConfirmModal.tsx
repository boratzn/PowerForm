import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { colors } from '../../constants/theme';

type ModernConfirmModalProps = {
  visible: boolean;
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ModernConfirmModal({
  visible,
  title,
  description,
  icon = 'help-circle-outline',
  iconColor,
  iconBgColor,
  confirmText = 'Onayla',
  cancelText = 'Vazgeç',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ModernConfirmModalProps) {
  const resolvedIconColor = iconColor || (isDestructive ? colors.danger : colors.accent);
  const resolvedIconBg = iconBgColor || (isDestructive ? 'rgba(248, 113, 113, 0.15)' : 'rgba(74, 222, 128, 0.15)');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        className="flex-1 items-center justify-center bg-black/75 px-lg"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#151B23] p-6 shadow-2xl"
        >
          {/* İkon Rozeti */}
          <View className="items-center mb-4">
            <View
              className="h-16 w-16 items-center justify-center rounded-2xl border"
              style={{
                backgroundColor: resolvedIconBg,
                borderColor: isDestructive ? 'rgba(248, 113, 113, 0.3)' : 'rgba(74, 222, 128, 0.3)',
              }}
            >
              <Ionicons name={icon} size={32} color={resolvedIconColor} />
            </View>
          </View>

          {/* Başlık & Açıklama */}
          <View className="items-center gap-1.5 mb-6">
            <Text className="text-center text-lg font-bold text-text-primary">
              {title}
            </Text>
            {description ? (
              <Text className="text-center text-xs leading-relaxed text-text-muted px-2">
                {description}
              </Text>
            ) : null}
          </View>

          {/* Aksiyon Butonları */}
          <View className="gap-2.5">
            <Pressable
              onPress={onConfirm}
              className={`h-12 flex-row items-center justify-center rounded-xl px-4 shadow-sm active:opacity-85 ${
                isDestructive ? 'bg-danger' : 'bg-accent'
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  isDestructive ? 'text-white' : 'text-[#0B0F14]'
                }`}
              >
                {confirmText}
              </Text>
            </Pressable>

            <Pressable
              onPress={onCancel}
              className="h-11 flex-row items-center justify-center rounded-xl bg-[#1E2630] border border-white/5 px-4 active:opacity-75"
            >
              <Text className="text-sm font-semibold text-text-muted">
                {cancelText}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
