import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '../../constants/theme';
import {
  addWaterAmount,
  getWaterLogForDate,
  logWaterIntake,
  type WaterLog,
} from '../../db/waterLogs';
import { dateKey } from '../../lib/calculations';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import { Card } from '../ui';

type WaterTrackerWidgetProps = {
  date?: string; // YYYY-MM-DD, defaults to today
  onWaterUpdated?: (log: WaterLog) => void;
  compact?: boolean;
};

const PRESET_ADDITIONS = [
  { ml: 250, label: '+250 ml', icon: 'water-outline' as const, subKey: 'water_glass' },
  { ml: 500, label: '+500 ml', icon: 'water' as const, subKey: 'water_bottle' },
  { ml: 750, label: '+750 ml', icon: 'flask-outline' as const, subKey: 'water_flask' },
];

const TARGET_PRESETS = [2000, 2500, 3000, 3500];

export function WaterTrackerWidget({
  date,
  onWaterUpdated,
  compact = false,
}: WaterTrackerWidgetProps) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const t = useLanguageStore((s) => s.t);
  const lang = useLanguageStore((s) => s.language);

  const targetDate = date || dateKey(new Date());

  const [waterLog, setWaterLog] = useState<WaterLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [customMlInput, setCustomMlInput] = useState('');
  const [targetInput, setTargetInput] = useState('2500');

  const currentAmount = waterLog?.amountMl ?? 0;
  const targetAmount = waterLog?.targetMl ?? 2500;
  const percentage = Math.min(100, Math.round((currentAmount / Math.max(1, targetAmount)) * 100));

  const loadData = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const row = await getWaterLogForDate(userId, targetDate);
      setWaterLog(row);
      if (row) {
        setTargetInput(String(row.targetMl));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, targetDate]);

  const handleAdd = async (ml: number) => {
    if (!userId) return;
    try {
      const updated = await addWaterAmount(userId, targetDate, ml, targetAmount);
      setWaterLog(updated);
      onWaterUpdated?.(updated);
    } catch (err: any) {
      Alert.alert(t('error'), err?.message || t('water_add_error'));
    }
  };

  const handleSetCustomAmount = async () => {
    const parsedAmount = parseInt(customMlInput, 10);
    const parsedTarget = parseInt(targetInput, 10);

    if (isNaN(parsedAmount) && isNaN(parsedTarget)) {
      setModalVisible(false);
      return;
    }

    if (!userId) return;

    try {
      const newAmount = !isNaN(parsedAmount) ? parsedAmount : currentAmount;
      const newTarget = !isNaN(parsedTarget) && parsedTarget > 500 ? parsedTarget : targetAmount;
      const updated = await logWaterIntake(userId, targetDate, newAmount, newTarget);
      setWaterLog(updated);
      onWaterUpdated?.(updated);
      setCustomMlInput('');
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert(t('error'), err?.message || t('error'));
    }
  };

  return (
    <Card className="gap-sm bg-bg-surface border border-white/5 overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#0284C7]/20 border border-[#0284C7]/30">
            <Ionicons name="water" size={17} color="#38BDF8" />
          </View>
          <View>
            <Text className="text-sm font-bold text-text-primary">
              {t('water_tracker_title')}
            </Text>
            <Text className="text-[10px] text-text-muted">
              {percentage >= 100
                ? t('water_goal_reached')
                : `${(targetAmount - currentAmount) > 0 ? `${targetAmount - currentAmount} ml` : '0 ml'} ${t('water_remaining')}`}
            </Text>
          </View>
        </View>

        <Pressable
          hitSlop={8}
          onPress={() => {
            setCustomMlInput(currentAmount ? String(currentAmount) : '');
            setTargetInput(String(targetAmount));
            setModalVisible(true);
          }}
          className="flex-row items-center gap-1 rounded-lg bg-bg-elevated px-2.5 py-1.5 border border-white/5 active:opacity-70"
        >
          <Ionicons name="settings-outline" size={12} color={colors.textMuted} />
          <Text className="text-[11px] font-semibold text-text-muted">
            {t('water_edit_goal_btn')}
          </Text>
        </Pressable>
      </View>

      {/* Main Counter & Progress Visual */}
      <View className="my-1">
        <View className="flex-row items-baseline justify-between mb-1.5">
          <View className="flex-row items-baseline gap-1">
            <Text className="text-2xl font-extrabold text-[#38BDF8] tabular-nums">
              {currentAmount.toLocaleString()}
            </Text>
            <Text className="text-xs font-semibold text-text-muted">
              / {targetAmount.toLocaleString()} ml
            </Text>
          </View>
          <View className="rounded-full bg-[#0284C7]/20 px-2 py-0.5 border border-[#0284C7]/30">
            <Text className="text-[11px] font-bold text-[#38BDF8]">%{percentage}</Text>
          </View>
        </View>

        {/* Progress Bar with Cyan Wave Effect */}
        <View className="h-3 w-full overflow-hidden rounded-full bg-bg-elevated/80 border border-white/5">
          <View
            style={{ width: `${percentage}%` }}
            className={`h-full rounded-full ${
              percentage >= 100 ? 'bg-[#38BDF8]' : 'bg-[#0284C7]'
            }`}
          />
        </View>
      </View>

      {/* Quick Add Buttons */}
      <View className="flex-row gap-2 mt-1">
        {PRESET_ADDITIONS.map((p) => (
          <Pressable
            key={p.ml}
            onPress={() => handleAdd(p.ml)}
            className="flex-1 py-2 px-1 items-center justify-center rounded-xl bg-bg-elevated/70 border border-white/5 active:bg-[#0284C7]/20 active:border-[#38BDF8]/40"
          >
            <Ionicons name={p.icon} size={15} color="#38BDF8" />
            <Text className="text-xs font-bold text-text-primary mt-0.5">{p.label}</Text>
            <Text className="text-[9px] text-text-muted">{t(p.subKey as any)}</Text>
          </Pressable>
        ))}

        {currentAmount > 0 && (
          <Pressable
            onPress={() => handleAdd(-250)}
            className="w-10 items-center justify-center rounded-xl bg-bg-elevated/40 border border-white/5 active:bg-danger/20"
          >
            <Ionicons name="remove-outline" size={16} color={colors.textMuted} />
            <Text className="text-[8px] text-text-muted">-250</Text>
          </Pressable>
        )}
      </View>

      {/* Custom Amount / Target Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 items-center justify-center bg-black/75 px-lg">
          <View className="w-full max-w-sm rounded-2xl bg-bg-surface p-lg border border-white/10 gap-md">
            <View className="flex-row items-center justify-between pb-1 border-b border-bg-elevated">
              <View className="flex-row items-center gap-2">
                <Ionicons name="water" size={18} color="#38BDF8" />
                <Text className="text-base font-bold text-text-primary">
                  {t('water_modal_title')}
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Miktar Girişi */}
            <View className="gap-1">
              <Text className="text-xs font-semibold text-text-muted">
                {t('water_drunk_today')}
              </Text>
              <TextInput
                keyboardType="numeric"
                value={customMlInput}
                onChangeText={setCustomMlInput}
                placeholder={String(currentAmount)}
                placeholderTextColor={colors.textMuted}
                className="h-11 rounded-xl bg-bg-elevated px-3 text-sm font-bold text-text-primary border border-white/5"
              />
            </View>

            {/* Hedef Girişi */}
            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-text-muted">
                {t('water_daily_target')}
              </Text>
              <TextInput
                keyboardType="numeric"
                value={targetInput}
                onChangeText={setTargetInput}
                placeholder="2500"
                placeholderTextColor={colors.textMuted}
                className="h-11 rounded-xl bg-bg-elevated px-3 text-sm font-bold text-[#38BDF8] border border-white/5"
              />

              {/* Hızlı Hedef Seçenekleri */}
              <View className="flex-row gap-1.5 pt-1">
                {TARGET_PRESETS.map((tPreset) => (
                  <Pressable
                    key={tPreset}
                    onPress={() => setTargetInput(String(tPreset))}
                    className={`flex-1 py-1.5 rounded-lg items-center border ${
                      targetInput === String(tPreset)
                        ? 'bg-[#0284C7]/20 border-[#38BDF8]'
                        : 'bg-bg-elevated border-white/5'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        targetInput === String(tPreset) ? 'text-[#38BDF8]' : 'text-text-muted'
                      }`}
                    >
                      {tPreset} ml
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Aksiyon Butonları */}
            <View className="flex-row gap-2 pt-2">
              <Pressable
                onPress={() => setModalVisible(false)}
                className="flex-1 py-3 items-center rounded-xl bg-bg-elevated active:opacity-70"
              >
                <Text className="text-xs font-semibold text-text-muted">{t('cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={handleSetCustomAmount}
                className="flex-1 py-3 items-center rounded-xl bg-[#0284C7] active:opacity-80"
              >
                <Text className="text-xs font-bold text-white">{t('save')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Card>
  );
}
