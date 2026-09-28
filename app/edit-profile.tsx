import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, Input } from '../src/components/ui';
import {
  DAYS_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  SEX_OPTIONS,
  type Equipment,
  type Experience,
  type Goal,
  type Sex,
} from '../src/constants/enumOptions';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/useAuthStore';
import type { Database } from '../src/types/database';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-sm">
      <Text className="text-xs uppercase font-bold text-text-muted">{title}</Text>
      <View className="flex-row flex-wrap gap-sm">{children}</View>
    </View>
  );
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [sex, setSex] = useState<Sex>((profile?.sex as Sex) ?? 'unspecified');
  const [birthYear, setBirthYear] = useState(profile?.birth_year ? String(profile.birth_year) : '');
  const [heightCm, setHeightCm] = useState(profile?.height_cm ? String(profile.height_cm) : '');
  const [experience, setExperience] = useState<Experience>((profile?.experience as Experience) ?? 'beginner');
  const [primaryGoal, setPrimaryGoal] = useState<Goal>((profile?.primary_goal as Goal) ?? 'hypertrophy');
  const [trainingDays, setTrainingDays] = useState<number | null>(profile?.training_days_target ?? 4);
  const [equipment, setEquipment] = useState<Equipment[]>(
    (profile?.available_equipment as Equipment[]) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleEquipment = (item: Equipment) => {
    setEquipment((prev) => (prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]));
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setError(null);
    setSaving(true);

    try {
      const updates: Database['public']['Tables']['profiles']['Update'] = {
        sex,
        experience,
        primary_goal: primaryGoal,
      };

      const parsedBirthYear = parseInt(birthYear, 10);
      if (!Number.isNaN(parsedBirthYear)) updates.birth_year = parsedBirthYear;

      const parsedHeight = parseFloat(heightCm);
      if (!Number.isNaN(parsedHeight)) updates.height_cm = parsedHeight;

      if (trainingDays != null) updates.training_days_target = trainingDays;
      if (equipment.length > 0) updates.available_equipment = equipment;

      const { error: supaErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id);

      if (supaErr) {
        setError(supaErr.message);
        return;
      }

      await refreshProfile();
      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setError(err?.message ?? 'Profil güncellenirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      className="flex-1 bg-bg-primary"
    >
      <View
        className="flex-1"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-bg-elevated px-md py-sm">
          <Text className="text-lg font-bold text-text-primary">Profili Düzenle</Text>
          <Pressable
            hitSlop={12}
            onPress={() => router.back()}
            className="rounded-full bg-bg-surface px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-xs font-semibold text-text-muted">Kapat</Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1 px-lg"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32, gap: 20 }}
        >
        <Section title="Cinsiyet">
          {SEX_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={sex === opt.value}
              onPress={() => setSex(opt.value)}
            />
          ))}
        </Section>

        <View className="flex-row gap-md">
          <View className="flex-1 gap-xs">
            <Text className="text-xs font-bold text-text-muted">Boy (cm)</Text>
            <Input
              placeholder="178"
              keyboardType="numeric"
              value={heightCm}
              onChangeText={setHeightCm}
            />
          </View>
          <View className="flex-1 gap-xs">
            <Text className="text-xs font-bold text-text-muted">Doğum Yılı</Text>
            <Input
              placeholder="1995"
              keyboardType="numeric"
              value={birthYear}
              onChangeText={setBirthYear}
            />
          </View>
        </View>

        <Section title="Antrenman Deneyimi">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={experience === opt.value}
              onPress={() => setExperience(opt.value)}
            />
          ))}
        </Section>

        <Section title="Ana Hedef">
          {GOAL_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={primaryGoal === opt.value}
              onPress={() => setPrimaryGoal(opt.value)}
            />
          ))}
        </Section>

        <Section title="Haftalık Antrenman Hedefi">
          {DAYS_OPTIONS.map((days) => (
            <Chip
              key={days}
              label={`${days} gün`}
              selected={trainingDays === days}
              onPress={() => setTrainingDays(days)}
            />
          ))}
        </Section>

        <Section title="Mevcut Ekipmanlar">
          {EQUIPMENT_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={equipment.includes(opt.value)}
              onPress={() => toggleEquipment(opt.value)}
            />
          ))}
        </Section>

        {error && <Text className="text-sm text-danger">{error}</Text>}

        <Button
          label={saving ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
          className="mt-sm"
          onPress={handleSave}
          disabled={saving}
        />
      </ScrollView>
    </View>
  </KeyboardAvoidingView>
);
}
