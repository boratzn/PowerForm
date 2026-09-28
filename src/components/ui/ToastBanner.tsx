import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../../constants/theme';

export type ToastType = 'error' | 'warning' | 'info' | 'success';

type ToastBannerProps = {
  visible: boolean;
  type?: ToastType;
  title?: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
  autoHideDuration?: number;
};

const TYPE_CONFIG: Record<
  ToastType,
  {
    icon: string;
    iconColor: string;
    bgColor: string;
    borderColor: string;
    titleColor: string;
    defaultTitle: string;
  }
> = {
  error: {
    icon: 'alert-circle',
    iconColor: '#F87171',
    bgColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: 'rgba(248, 113, 113, 0.35)',
    titleColor: '#F87171',
    defaultTitle: 'Bir Hata Oluştu',
  },
  warning: {
    icon: 'warning',
    iconColor: '#FBBF24',
    bgColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: 'rgba(251, 191, 36, 0.35)',
    titleColor: '#FBBF24',
    defaultTitle: 'Dikkat',
  },
  info: {
    icon: 'information-circle',
    iconColor: '#38BDF8',
    bgColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    titleColor: '#38BDF8',
    defaultTitle: 'Bilgi',
  },
  success: {
    icon: 'checkmark-circle',
    iconColor: '#4ADE80',
    bgColor: 'rgba(74, 222, 128, 0.12)',
    borderColor: 'rgba(74, 222, 128, 0.35)',
    titleColor: '#4ADE80',
    defaultTitle: 'Başarılı',
  },
};

export function ToastBanner({
  visible,
  type = 'error',
  title,
  message,
  onClose,
  onRetry,
  autoHideDuration = 6000,
}: ToastBannerProps) {
  useEffect(() => {
    if (!visible || !autoHideDuration) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoHideDuration);
    return () => clearTimeout(timer);
  }, [visible, autoHideDuration, onClose]);

  if (!visible) return null;

  const cfg = TYPE_CONFIG[type];

  return (
    <View
      className="my-xs rounded-2xl p-md shadow-lg"
      style={{
        backgroundColor: cfg.bgColor,
        borderWidth: 1,
        borderColor: cfg.borderColor,
      }}
    >
      <View className="flex-row items-start gap-sm">
        <View className="pt-0.5">
          <Ionicons name={cfg.icon as any} size={20} color={cfg.iconColor} />
        </View>

        <View className="flex-1 gap-1">
          <Text className="text-xs font-bold" style={{ color: cfg.titleColor }}>
            {title || cfg.defaultTitle}
          </Text>
          <Text className="text-xs text-text-primary leading-relaxed">{message}</Text>

          {onRetry && (
            <Pressable
              onPress={onRetry}
              className="mt-xs self-start rounded-lg bg-bg-surface px-3 py-1.5 border border-bg-elevated active:opacity-70"
            >
              <Text className="text-xs font-bold text-accent">Tekrar Dene</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={onClose}
          hitSlop={8}
          className="h-6 w-6 items-center justify-center rounded-full active:opacity-60"
        >
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}
