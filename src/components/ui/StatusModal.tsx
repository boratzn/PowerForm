import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';

export type StatusModalType = 'pro_celebration' | 'success' | 'error' | 'warning' | 'info' | 'logout';

type StatusModalProps = {
  visible: boolean;
  type?: StatusModalType;
  badgeText?: string;
  title: string;
  message: string;
  features?: string[];
  primaryButtonText?: string;
  onPrimaryPress: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
  onClose?: () => void;
  customIconName?: keyof typeof Ionicons.glyphMap;
};

const TYPE_CONFIG = {
  pro_celebration: {
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeBorder: 'rgba(245, 158, 11, 0.35)',
    badgeText: '#F59E0B',
    defaultBadge: '👑 POWERFORM PRO AKTİF',
    iconCircleBg: 'rgba(245, 158, 11, 0.18)',
    iconBorder: 'rgba(245, 158, 11, 0.4)',
    iconColor: '#F59E0B',
    iconName: 'sparkles' as const,
    cardBorder: 'rgba(245, 158, 11, 0.4)',
    btnBg: '#F59E0B',
    btnTextColor: '#0B0F14',
    defaultBtnText: 'Harika, Başlayalım! 🚀',
  },
  success: {
    badgeBg: 'rgba(74, 222, 128, 0.15)',
    badgeBorder: 'rgba(74, 222, 128, 0.35)',
    badgeText: colors.accent,
    defaultBadge: '✓ İŞLEM BAŞARILI',
    iconCircleBg: 'rgba(74, 222, 128, 0.15)',
    iconBorder: 'rgba(74, 222, 128, 0.35)',
    iconColor: colors.accent,
    iconName: 'checkmark-circle' as const,
    cardBorder: 'rgba(74, 222, 128, 0.3)',
    btnBg: colors.accent,
    btnTextColor: '#0B0F14',
    defaultBtnText: 'Tamam',
  },
  error: {
    badgeBg: 'rgba(248, 113, 113, 0.15)',
    badgeBorder: 'rgba(248, 113, 113, 0.35)',
    badgeText: colors.danger,
    defaultBadge: '✕ İŞLEM BAŞARISIZ',
    iconCircleBg: 'rgba(248, 113, 113, 0.15)',
    iconBorder: 'rgba(248, 113, 113, 0.35)',
    iconColor: colors.danger,
    iconName: 'alert-circle' as const,
    cardBorder: 'rgba(248, 113, 113, 0.3)',
    btnBg: colors.danger,
    btnTextColor: '#FFFFFF',
    defaultBtnText: 'Anladım',
  },
  warning: {
    badgeBg: 'rgba(251, 191, 36, 0.15)',
    badgeBorder: 'rgba(251, 191, 36, 0.35)',
    badgeText: colors.warning,
    defaultBadge: '⚠️ DİKKAT',
    iconCircleBg: 'rgba(251, 191, 36, 0.15)',
    iconBorder: 'rgba(251, 191, 36, 0.35)',
    iconColor: colors.warning,
    iconName: 'warning' as const,
    cardBorder: 'rgba(251, 191, 36, 0.3)',
    btnBg: colors.warning,
    btnTextColor: '#0B0F14',
    defaultBtnText: 'Tamam',
  },
  info: {
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    badgeBorder: 'rgba(56, 189, 248, 0.35)',
    badgeText: colors.accentAlt,
    defaultBadge: 'ℹ️ BİLGİ',
    iconCircleBg: 'rgba(56, 189, 248, 0.15)',
    iconBorder: 'rgba(56, 189, 248, 0.35)',
    iconColor: colors.accentAlt,
    iconName: 'information-circle' as const,
    cardBorder: 'rgba(56, 189, 248, 0.3)',
    btnBg: colors.accentAlt,
    btnTextColor: '#0B0F14',
    defaultBtnText: 'Tamam',
  },
  logout: {
    badgeBg: 'rgba(248, 113, 113, 0.15)',
    badgeBorder: 'rgba(248, 113, 113, 0.35)',
    badgeText: colors.danger,
    defaultBadge: '🚪 OTURUMU KAPAT',
    iconCircleBg: 'rgba(248, 113, 113, 0.15)',
    iconBorder: 'rgba(248, 113, 113, 0.35)',
    iconColor: colors.danger,
    iconName: 'log-out-outline' as const,
    cardBorder: 'rgba(248, 113, 113, 0.3)',
    btnBg: colors.danger,
    btnTextColor: '#FFFFFF',
    defaultBtnText: 'Çıkış Yap',
  },
};

export function StatusModal({
  visible,
  type = 'success',
  badgeText,
  title,
  message,
  features,
  primaryButtonText,
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
  onClose,
  customIconName,
}: StatusModalProps) {
  if (!visible) return null;

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.success;
  const isCelebration = type === 'pro_celebration';
  const icon = customIconName || config.iconName;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose || onPrimaryPress}
    >
      <View style={styles.overlay}>
        {/* MODAL KARTI */}
        <View style={[styles.card, { borderColor: config.cardBorder }]}>
          {/* ÜST ROZET */}
          <View
            style={[
              styles.badge,
              { backgroundColor: config.badgeBg, borderColor: config.badgeBorder },
            ]}
          >
            <Text style={[styles.badgeText, { color: config.badgeText }]}>
              {badgeText || config.defaultBadge}
            </Text>
          </View>

          {/* İKON DAİRESİ */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: config.iconCircleBg, borderColor: config.iconBorder },
            ]}
          >
            <Ionicons name={icon} size={36} color={config.iconColor} />
          </View>

          {/* BAŞLIK & AÇIKLAMA */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* PRO ÖZELLİKLER LİSTESİ (Varsa) */}
          {features && features.length > 0 && (
            <View style={styles.featuresContainer}>
              {features.map((item, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <View style={styles.featureCheckCircle}>
                    <Ionicons name="checkmark" size={13} color={colors.accent} />
                  </View>
                  <Text style={styles.featureText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {/* AKSİYON BUTONLARI */}
          <View style={styles.actionsContainer}>
            <Pressable
              onPress={onPrimaryPress}
              style={[
                styles.primaryBtn,
                { backgroundColor: config.btnBg },
                isCelebration && styles.celebrationBtnShadow,
              ]}
            >
              <Text style={[styles.primaryBtnText, { color: config.btnTextColor }]}>
                {primaryButtonText || config.defaultBtnText}
              </Text>
            </Pressable>

            {secondaryButtonText && onSecondaryPress && (
              <Pressable onPress={onSecondaryPress} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>{secondaryButtonText}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.bgSurface,
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  actionsContainer: {
    width: '100%',
    gap: 8,
  },
  primaryBtn: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  celebrationBtnShadow: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
