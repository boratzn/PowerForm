import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { colors } from '../../constants/theme';
import { useLanguageStore } from '../../stores/useLanguageStore';

type TimePickerModalProps = {
  visible: boolean;
  type: 'bedtime' | 'wakeTime';
  currentTime: string; // HH:MM
  onSelect: (timeStr: string) => void;
  onClose: () => void;
};

const BEDTIME_PRESETS = ['22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00'];
const WAKETIME_PRESETS = ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00'];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export function TimePickerModal({
  visible,
  type,
  currentTime,
  onSelect,
  onClose,
}: TimePickerModalProps) {
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);

  const isBedtime = type === 'bedtime';
  const themeColor = isBedtime ? '#818CF8' : '#F59E0B';

  const [hour, setHour] = useState('23');
  const [minute, setMinute] = useState('00');
  const [activeTab, setActiveTab] = useState<'hour' | 'minute'>('hour');

  useEffect(() => {
    if (currentTime && currentTime.includes(':')) {
      const parts = currentTime.split(':');
      setHour(parts[0].padStart(2, '0'));
      setMinute(parts[1].padStart(2, '0'));
    }
  }, [currentTime, visible]);

  const presets = isBedtime ? BEDTIME_PRESETS : WAKETIME_PRESETS;

  const handleApply = () => {
    onSelect(`${hour}:${minute}`);
    onClose();
  };

  const adjustMinutes = (delta: number) => {
    let h = parseInt(hour, 10);
    let m = parseInt(minute, 10);
    let total = h * 60 + m + delta;
    while (total < 0) total += 24 * 60;
    total = total % (24 * 60);

    const newH = Math.floor(total / 60);
    const newM = total % 60;
    setHour(String(newH).padStart(2, '0'));
    setMinute(String(newM).padStart(2, '0'));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/75 px-lg">
        {/* Backdrop Tıklaması */}
        <Pressable className="absolute inset-0" onPress={onClose} />

        {/* Modal Kartı */}
        <View className="w-full max-w-sm rounded-3xl bg-[#12171F] border border-white/10 p-5 shadow-2xl">
          {/* Üst Bar: İkon ve Başlık */}
          <View className="flex-row items-center justify-between pb-3 border-b border-white/10">
            <View className="flex-row items-center gap-2">
              <View
                className="h-8 w-8 rounded-xl items-center justify-center border"
                style={{
                  backgroundColor: `${themeColor}20`,
                  borderColor: `${themeColor}40`,
                }}
              >
                <Ionicons
                  name={isBedtime ? 'moon' : 'sunny'}
                  size={17}
                  color={themeColor}
                />
              </View>
              <Text className="text-base font-bold text-text-primary">
                {isBedtime
                  ? (language === 'tr' ? 'Yatış Saati Seçin' : language === 'de' ? 'Schlafenszeit wählen' : language === 'es' ? 'Hora de dormir' : 'Select Bedtime')
                  : (language === 'tr' ? 'Kalkış Saati Seçin' : language === 'de' ? 'Aufwachzeit wählen' : language === 'es' ? 'Hora de despertar' : 'Select Wake Time')}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-8 w-8 rounded-full bg-white/10 items-center justify-center active:opacity-60"
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Dijital Saat Ekranı */}
          <View className="my-4 items-center justify-center">
            <View className="flex-row items-center gap-2">
              {/* Saat Kutusu */}
              <Pressable
                onPress={() => setActiveTab('hour')}
                className="px-4 py-2.5 rounded-2xl border items-center justify-center"
                style={{
                  backgroundColor: activeTab === 'hour' ? `${themeColor}25` : 'rgba(255,255,255,0.05)',
                  borderColor: activeTab === 'hour' ? themeColor : 'rgba(255,255,255,0.1)',
                }}
              >
                <Text
                  className="text-4xl font-black"
                  style={{ color: activeTab === 'hour' ? themeColor : colors.textPrimary }}
                >
                  {hour}
                </Text>
                <Text className="text-[10px] font-bold text-text-muted uppercase mt-0.5">
                  {language === 'tr' ? 'SAAT' : language === 'de' ? 'STUNDE' : language === 'es' ? 'HORA' : 'HOUR'}
                </Text>
              </Pressable>

              <Text className="text-3xl font-black text-text-muted">:</Text>

              {/* Dakika Kutusu */}
              <Pressable
                onPress={() => setActiveTab('minute')}
                className="px-4 py-2.5 rounded-2xl border items-center justify-center"
                style={{
                  backgroundColor: activeTab === 'minute' ? `${themeColor}25` : 'rgba(255,255,255,0.05)',
                  borderColor: activeTab === 'minute' ? themeColor : 'rgba(255,255,255,0.1)',
                }}
              >
                <Text
                  className="text-4xl font-black"
                  style={{ color: activeTab === 'minute' ? themeColor : colors.textPrimary }}
                >
                  {minute}
                </Text>
                <Text className="text-[10px] font-bold text-text-muted uppercase mt-0.5">
                  {language === 'tr' ? 'DAKİKA' : language === 'de' ? 'MINUTE' : language === 'es' ? 'MINUTO' : 'MINUTE'}
                </Text>
              </Pressable>
            </View>

            {/* Hızlı +/- 15 Adım Butonları */}
            <View className="flex-row gap-2 mt-3">
              <Pressable
                onPress={() => adjustMinutes(-15)}
                className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 active:opacity-60"
              >
                <Text className="text-xs font-bold text-text-muted">-15 dk</Text>
              </Pressable>
              <Pressable
                onPress={() => adjustMinutes(15)}
                className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 active:opacity-60"
              >
                <Text className="text-xs font-bold text-text-muted">+15 dk</Text>
              </Pressable>
            </View>
          </View>

          {/* Hızlı Preset Butonları */}
          <View className="mb-3">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              {language === 'tr' ? 'Hızlı Seçenekler' : language === 'de' ? 'Schnellauswahl' : language === 'es' ? 'Opciones rápidas' : 'Quick Presets'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {presets.map((p) => {
                const isSelected = `${hour}:${minute}` === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => {
                      const [h, m] = p.split(':');
                      setHour(h);
                      setMinute(m);
                    }}
                    className="px-2.5 py-1 rounded-xl border"
                    style={{
                      backgroundColor: isSelected ? themeColor : 'rgba(255, 255, 255, 0.05)',
                      borderColor: isSelected ? themeColor : 'rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: isSelected ? '#0B0F14' : colors.textPrimary }}
                    >
                      {p}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Saat veya Dakika Seçici Izgara */}
          <View className="mb-4">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              {activeTab === 'hour'
                ? (language === 'tr' ? 'Saat Seçin (00 - 23)' : 'Select Hour (00 - 23)')
                : (language === 'tr' ? 'Dakika Seçin' : 'Select Minute')}
            </Text>

            {activeTab === 'hour' ? (
              <ScrollView
                style={{ maxHeight: 110 }}
                showsVerticalScrollIndicator={false}
              >
                <View className="flex-row flex-wrap gap-1.5">
                  {HOURS.map((h) => {
                    const isSelected = hour === h;
                    return (
                      <Pressable
                        key={h}
                        onPress={() => {
                          setHour(h);
                          setActiveTab('minute');
                        }}
                        className="w-[18%] py-1.5 rounded-xl border items-center justify-center"
                        style={{
                          backgroundColor: isSelected ? themeColor : 'rgba(255, 255, 255, 0.05)',
                          borderColor: isSelected ? themeColor : 'rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{ color: isSelected ? '#0B0F14' : colors.textPrimary }}
                        >
                          {h}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            ) : (
              <View className="flex-row flex-wrap gap-1.5">
                {MINUTES.map((m) => {
                  const isSelected = minute === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setMinute(m)}
                      className="w-[22%] py-2 rounded-xl border items-center justify-center"
                      style={{
                        backgroundColor: isSelected ? themeColor : 'rgba(255, 255, 255, 0.05)',
                        borderColor: isSelected ? themeColor : 'rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{ color: isSelected ? '#0B0F14' : colors.textPrimary }}
                      >
                        :{m}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Uygula Butonu */}
          <Pressable
            onPress={handleApply}
            className="w-full py-3 rounded-2xl items-center justify-center active:opacity-85"
            style={{ backgroundColor: themeColor }}
          >
            <Text className="text-xs font-extrabold text-[#0B0F14]">
              {language === 'tr' ? 'Saati Uygula' : language === 'de' ? 'Uhrzeit anwenden' : language === 'es' ? 'Aplicar hora' : 'Apply Time'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
