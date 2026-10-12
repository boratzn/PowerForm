import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/theme';
import { useLanguageStore } from '../../stores/useLanguageStore';

type ToolsHubSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type ToolItem = {
  id: string;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  badge?: string;
  badgeColor?: string;
  route: string;
  routeParams?: Record<string, string>;
};

export function ToolsHubSheet({ visible, onClose }: ToolsHubSheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);

  const healthTools: ToolItem[] = [
    {
      id: 'weight-trend',
      titleKey: 'weight_tracking_title',
      defaultTitle: 'Kilo Takibi',
      descKey: 'weight_tracking_desc',
      defaultDesc: '7 günlük ortalama & trend',
      iconName: 'scale-outline',
      iconColor: '#38BDF8',
      route: '/weight-trend',
    },
    {
      id: 'body-measurements',
      titleKey: 'body_measurements_title',
      defaultTitle: 'Vücut Ölçüleri',
      descKey: 'body_measurements_desc',
      defaultDesc: 'Bölgesel çevre takibi',
      iconName: 'body-outline',
      iconColor: '#A78BFA',
      route: '/body-measurements',
    },
    {
      id: 'sleep-tracker',
      titleKey: 'sleep_tracking_title',
      defaultTitle: 'Uyku Takibi',
      descKey: 'sleep_tracking_desc',
      defaultDesc: 'Toparlanma ve uyku süresi',
      iconName: 'moon-outline',
      iconColor: '#818CF8',
      route: '/sleep-tracker',
    },
    {
      id: 'body-photos',
      titleKey: 'body_photos_tool_title',
      defaultTitle: 'Vücut Form Takibi',
      descKey: 'body_photos_tool_desc',
      defaultDesc: 'Günlük form takibi & AI analizi',
      iconName: 'camera-outline',
      iconColor: '#38BDF8',
      badge: 'YENİ',
      badgeColor: '#38BDF8',
      route: '/body-photos',
    },
    {
      id: 'transformation-card',
      titleKey: 'transformation_card_tool_title',
      defaultTitle: 'Dönüşüm Kartı',
      descKey: 'transformation_card_tool_desc',
      defaultDesc: 'Öncesi/sonrası paylaşım',
      iconName: 'images-outline',
      iconColor: '#F59E0B',
      badge: 'STORY',
      badgeColor: '#F59E0B',
      route: '/transformation-card',
    },
  ];

  const workoutTools: ToolItem[] = [
    {
      id: 'personal-records',
      titleKey: 'personal_records',
      defaultTitle: 'Kişisel Rekorlar',
      descKey: 'personal_records_desc',
      defaultDesc: 'En iyi 1RM ve ağırlıklar',
      iconName: 'trophy-outline',
      iconColor: '#FACC15',
      badge: 'PR',
      badgeColor: '#FACC15',
      route: '/personal-records',
    },
    {
      id: 'future-simulation',
      titleKey: 'future_sim_tool_title',
      defaultTitle: '90 Günlük Simülasyon',
      descKey: 'future_sim_tool_desc',
      defaultDesc: 'Yapay zeka potansiyel tahmini',
      iconName: 'sparkles-outline',
      iconColor: '#4ADE80',
      badge: '90 GÜN',
      badgeColor: '#4ADE80',
      route: '/future-simulation',
    },
    {
      id: 'workout-history',
      titleKey: 'workout_history_title',
      defaultTitle: 'Antrenman Geçmişi',
      descKey: 'workout_history_desc',
      defaultDesc: 'Tamamlanan seans detayları',
      iconName: 'calendar-outline',
      iconColor: '#FB7185',
      route: '/workout/history',
      routeParams: { from: 'profile' },
    },
    {
      id: 'workout-templates',
      titleKey: 'program_templates_title',
      defaultTitle: 'Program Şablonları',
      descKey: 'program_templates_desc',
      defaultDesc: 'Bilimsel hazır rutinler',
      iconName: 'barbell-outline',
      iconColor: '#2DD4BF',
      route: '/workout/templates',
      routeParams: { from: 'profile' },
    },
  ];

  const handleSelect = (tool: ToolItem) => {
    onClose();
    setTimeout(() => {
      if (tool.routeParams) {
        router.push({
          pathname: tool.route as any,
          params: tool.routeParams,
        });
      } else {
        router.push(tool.route as any);
      }
    }, 150);
  };

  const renderToolGridItem = (item: ToolItem) => {
    const rawTitle = t(item.titleKey as any);
    const title = rawTitle && rawTitle !== item.titleKey ? rawTitle : item.defaultTitle;
    const rawDesc = t(item.descKey as any);
    const desc = rawDesc && rawDesc !== item.descKey ? rawDesc : item.defaultDesc;

    return (
      <Pressable
        key={item.id}
        onPress={() => handleSelect(item)}
        className="flex-1 p-3.5 rounded-2xl bg-[#151B23] border border-white/10 active:border-accent active:bg-accent/10 justify-between"
        style={{ minHeight: 104 }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View
            className="h-9 w-9 rounded-xl items-center justify-center"
            style={{
              backgroundColor: `${item.iconColor}20`,
              borderColor: `${item.iconColor}40`,
              borderWidth: 1,
            }}
          >
            <Ionicons name={item.iconName} size={18} color={item.iconColor} />
          </View>

          {item.badge && (
            <View
              className="px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${item.badgeColor || item.iconColor}25` }}
            >
              <Text
                className="text-[9px] font-extrabold tracking-wider"
                style={{ color: item.badgeColor || item.iconColor }}
              >
                {item.badge === 'YENİ' ? t('new_badge') : item.badge}
              </Text>
            </View>
          )}
        </View>

        <View>
          <Text className="text-xs font-bold text-text-primary" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-[10px] text-text-muted mt-0.5" numberOfLines={1}>
            {desc}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/70">
        {/* Dış alana tıklayınca kapat */}
        <Pressable className="flex-1" onPress={onClose} />

        {/* Bottom Sheet Gövdesi */}
        <View
          className="bg-[#0E131A] rounded-t-3xl border-t border-white/15 px-lg"
          style={{
            maxHeight: '85%',
            paddingBottom: Math.max(insets.bottom, 24) + 8,
          }}
        >
          {/* Çekmece Tutamacı */}
          <View className="w-12 h-1.5 rounded-full bg-white/20 self-center mt-3 mb-2" />

          {/* Başlık ve Kapat Butonu */}
          <View className="flex-row items-center justify-between py-2 border-b border-white/10 mb-3">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 rounded-xl bg-accent/20 border border-accent/40 items-center justify-center">
                <Ionicons name="flash" size={17} color={colors.accent} />
              </View>
              <View>
                <Text className="text-base font-extrabold text-text-primary">
                  {t('tools_hub_title')}
                </Text>
                <Text className="text-[11px] text-text-muted">
                  {t('tools_hub_subtitle')}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-8 w-8 rounded-full bg-white/10 items-center justify-center active:opacity-60"
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Araç Kartları Grid Scroll */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 18, paddingBottom: 16 }}
          >
            {/* Kategori 1: Vücut & Sağlık Takibi */}
            <View className="gap-2">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="heart-outline" size={13} color={colors.accent} />
                <Text className="text-xs uppercase font-extrabold tracking-wider text-text-muted">
                  {t('tools_section_health')}
                </Text>
              </View>

              <View className="gap-2.5">
                <View className="flex-row gap-2.5">
                  {renderToolGridItem(healthTools[0])}
                  {renderToolGridItem(healthTools[1])}
                </View>
                <View className="flex-row gap-2.5">
                  {renderToolGridItem(healthTools[2])}
                  {renderToolGridItem(healthTools[3])}
                </View>
              </View>
            </View>

            {/* Kategori 2: Antrenman & Akıllı Analiz */}
            <View className="gap-2">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="barbell-outline" size={13} color={colors.accent} />
                <Text className="text-xs uppercase font-extrabold tracking-wider text-text-muted">
                  {t('tools_section_workout')}
                </Text>
              </View>

              <View className="gap-2.5">
                <View className="flex-row gap-2.5">
                  {renderToolGridItem(workoutTools[0])}
                  {renderToolGridItem(workoutTools[1])}
                </View>
                <View className="flex-row gap-2.5">
                  {renderToolGridItem(workoutTools[2])}
                  {renderToolGridItem(workoutTools[3])}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
