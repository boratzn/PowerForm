import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { BodyWeightLog } from '../../db/bodyWeight';
import { Button, Input } from '../ui';
import { useLanguageStore } from '../../stores/useLanguageStore';

type WeightQuickEntryProps = {
  todayEntry: BodyWeightLog | undefined;
  previousEntry: BodyWeightLog | undefined;
  onSave: (weightKg: number) => Promise<void>;
};

export function WeightQuickEntry({ todayEntry, previousEntry, onSave }: WeightQuickEntryProps) {
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todayEntry ? String(todayEntry.weightKg) : '');
  const [saving, setSaving] = useState(false);

  const showInput = editing || !todayEntry;
  const delta = todayEntry && previousEntry ? todayEntry.weightKg - previousEntry.weightKg : null;

  const handleSave = async () => {
    const parsed = Number(draft.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 20 || parsed > 400) return;
    setSaving(true);
    try {
      await onSave(parsed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs uppercase text-text-muted">{t('quick_weight_title')}</Text>
        <Pressable onPress={() => router.push('/weight-trend')} className="active:opacity-70">
          <Text className="text-xs font-semibold text-accent-alt">{t('chart_trend')}</Text>
        </Pressable>
      </View>

      {showInput ? (
        <View className="flex-row items-center gap-sm">
          <Input
            className="flex-1"
            keyboardType="decimal-pad"
            placeholder={t('enter_weight_placeholder')}
            value={draft}
            onChangeText={setDraft}
          />
          <Button
            label={saving ? '…' : t('save')}
            onPress={handleSave}
            disabled={saving}
            className={saving ? 'opacity-50 px-lg' : 'px-lg'}
          />
        </View>
      ) : (
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-semibold text-text-primary">{todayEntry.weightKg} kg</Text>
            {delta != null && Math.abs(delta) >= 0.1 && (
              <Text className={`text-xs ${delta > 0 ? 'text-warning' : 'text-accent'}`}>
                {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)} kg {t('vs_previous_measurement')}
              </Text>
            )}
          </View>
          <Button
            label={t('edit')}
            variant="secondary"
            className="px-lg"
            onPress={() => {
              setDraft(String(todayEntry.weightKg));
              setEditing(true);
            }}
          />
        </View>
      )}

      {!todayEntry && previousEntry && (
        <Text className="text-xs text-text-muted">
          {t('last_measurement')}: {previousEntry.weightKg} kg ({previousEntry.loggedOn})
        </Text>
      )}

      <View className="pt-2 mt-1 border-t border-white/5 flex-row items-center justify-between">
        <Text className="text-[11px] text-text-muted">{t('body_measurements_title')}</Text>
        <Pressable onPress={() => router.push('/body-measurements')} className="active:opacity-70">
          <Text className="text-[11px] font-semibold text-accent">{t('chart_trend')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
