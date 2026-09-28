import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../../../../src/components/ui';
import { colors } from '../../../../src/constants/theme';
import { useProgramStore } from '../../../../src/stores/useProgramStore';

const GOAL_LABELS: Record<string, { label: string; color: string }> = {
  hypertrophy: { label: 'Hipertrofi (Kas)', color: '#38BDF8' },
  strength: { label: 'Kuvvet / Güç', color: '#FBBF24' },
  fat_loss: { label: 'Yağ Yakımı', color: '#F87171' },
  recomp: { label: 'Recomp', color: '#A78BFA' },
  general_health: { label: 'Genel Kondisyon', color: '#4ADE80' },
};

export default function TemplatesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const templates = useProgramStore((s) => s.templates);
  const loadTemplates = useProgramStore((s) => s.loadTemplates);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return (
    <ScrollView
      className="flex-1 bg-bg-primary px-lg"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
    >
      <View className="gap-xs">
        <Text className="text-sm text-text-muted">
          Hedefine ve haftalık zamanına en uygun bilimsel olarak hazırlanmış hazır antrenman şablonunu seç.
        </Text>
      </View>

      {templates.map((template) => {
        const goalInfo = template.goal ? GOAL_LABELS[template.goal] : null;
        const totalExercises = template.days.reduce((acc, d) => acc + d.exercises.length, 0);

        return (
          <Pressable
            key={template.clientUuid}
            onPress={() => router.push(`/workout/templates/${template.clientUuid}`)}
          >
            {({ pressed }) => (
              <Card className={`gap-sm ${pressed ? 'opacity-80' : ''}`}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-xs">
                    {goalInfo && (
                      <View
                        className="rounded-full px-sm py-xs"
                        style={{ backgroundColor: `${goalInfo.color}20` }}
                      >
                        <Text className="text-xs font-semibold" style={{ color: goalInfo.color }}>
                          {goalInfo.label}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-text-muted">
                    {template.daysPerWeek} Gün / Hafta
                  </Text>
                </View>

                <Text className="text-lg font-bold text-text-primary">{template.name}</Text>

                {template.description && (
                  <Text className="text-xs leading-relaxed text-text-muted" numberOfLines={2}>
                    {template.description}
                  </Text>
                )}

                <View className="mt-xs flex-row items-center justify-between border-t border-bg-elevated pt-sm">
                  <Text className="text-xs font-medium text-text-muted">
                    {template.days.length} Gün · {totalExercises} Egzersiz
                  </Text>
                  <Text className="text-xs font-semibold text-accent-alt">İncele →</Text>
                </View>
              </Card>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
