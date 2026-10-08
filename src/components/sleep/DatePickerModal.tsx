import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import { colors } from '../../constants/theme';
import { dateKey } from '../../lib/calculations';
import { useLanguageStore } from '../../stores/useLanguageStore';

type DatePickerModalProps = {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelect: (dateStr: string) => void;
  onClose: () => void;
};

const WEEKDAY_NAMES: Record<string, string[]> = {
  tr: ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  es: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'],
};

const MONTH_NAMES: Record<string, string[]> = {
  tr: [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  de: [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ],
  es: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ],
};

export function DatePickerModal({
  visible,
  selectedDate,
  onSelect,
  onClose,
}: DatePickerModalProps) {
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const parsedInitial = useMemo(() => {
    const parts = (selectedDate || dateKey(new Date())).split('-');
    const y = parseInt(parts[0], 10) || new Date().getFullYear();
    const m = (parseInt(parts[1], 10) || (new Date().getMonth() + 1)) - 1;
    return { year: y, month: m };
  }, [selectedDate]);

  const [viewYear, setViewYear] = useState<number>(parsedInitial.year);
  const [viewMonth, setViewMonth] = useState<number>(parsedInitial.month);

  const today = useMemo(() => dateKey(new Date()), []);
  const yesterday = useMemo(() => dateKey(new Date(Date.now() - 24 * 60 * 60 * 1000)), []);
  const dayBeforeYesterday = useMemo(
    () => dateKey(new Date(Date.now() - 48 * 60 * 60 * 1000)),
    []
  );

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Ayın günleri ve padding hücreleri
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    // Pazartesi = 0 .. Pazar = 6
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Önceki aydan kalan günler
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, d);
      days.push({ day: d, dateStr: dateKey(prevDate), isCurrentMonth: false });
    }

    // Bu ayın günleri
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(viewYear, viewMonth, d);
      days.push({ day: d, dateStr: dateKey(curDate), isCurrentMonth: true });
    }

    // Sonraki aydan tamamlayıcı günler (42 veya 35 hücre)
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(viewYear, viewMonth + 1, d);
      days.push({ day: d, dateStr: dateKey(nextDate), isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth]);

  const weekdays = WEEKDAY_NAMES[language] || WEEKDAY_NAMES.tr;
  const monthName = (MONTH_NAMES[language] || MONTH_NAMES.tr)[viewMonth];

  const handlePickDate = (dateStr: string) => {
    onSelect(dateStr);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/75 px-lg">
        {/* Backdrop Tıklaması */}
        <Pressable className="absolute inset-0" onPress={onClose} />

        {/* Modal Kartı */}
        <View className="w-full max-w-sm rounded-3xl bg-[#12171F] border border-white/10 p-5 shadow-2xl">
          {/* Üst Bar: İkon, Başlık ve Kapat */}
          <View className="flex-row items-center justify-between pb-3 border-b border-white/10">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 rounded-xl bg-[#818CF8]/20 border border-[#818CF8]/40 items-center justify-center">
                <Ionicons name="calendar" size={17} color="#818CF8" />
              </View>
              <Text className="text-base font-bold text-text-primary">
                {language === 'tr'
                  ? 'Tarih Seçin'
                  : language === 'de'
                    ? 'Datum wählen'
                    : language === 'es'
                      ? 'Seleccionar fecha'
                      : 'Select Date'}
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

          {/* Hızlı Seçim Butonları (Bugün, Dün, Önceki Gün) */}
          <View className="flex-row gap-2 my-3">
            <Pressable
              onPress={() => handlePickDate(today)}
              className={`flex-1 py-1.5 rounded-xl border items-center justify-center ${
                selectedDate === today
                  ? 'bg-[#818CF8] border-[#818CF8]'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedDate === today ? 'text-[#0B0F14]' : 'text-text-primary'
                }`}
              >
                {t('today')}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handlePickDate(yesterday)}
              className={`flex-1 py-1.5 rounded-xl border items-center justify-center ${
                selectedDate === yesterday
                  ? 'bg-[#818CF8] border-[#818CF8]'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedDate === yesterday ? 'text-[#0B0F14]' : 'text-text-primary'
                }`}
              >
                {t('yesterday')}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handlePickDate(dayBeforeYesterday)}
              className={`flex-1 py-1.5 rounded-xl border items-center justify-center ${
                selectedDate === dayBeforeYesterday
                  ? 'bg-[#818CF8] border-[#818CF8]'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedDate === dayBeforeYesterday ? 'text-[#0B0F14]' : 'text-text-primary'
                }`}
              >
                -2 Gün
              </Text>
            </Pressable>
          </View>

          {/* Ay & Yıl Navigasyonu */}
          <View className="flex-row items-center justify-between py-2 px-1">
            <Pressable
              onPress={handlePrevMonth}
              hitSlop={8}
              className="h-8 w-8 rounded-lg bg-white/5 items-center justify-center active:opacity-60"
            >
              <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
            </Pressable>

            <Text className="text-sm font-extrabold text-text-primary">
              {monthName} {viewYear}
            </Text>

            <Pressable
              onPress={handleNextMonth}
              hitSlop={8}
              className="h-8 w-8 rounded-lg bg-white/5 items-center justify-center active:opacity-60"
            >
              <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Haftanın Günleri Başlığı */}
          <View className="flex-row justify-between mb-1.5 px-0.5">
            {weekdays.map((wd, i) => (
              <View key={i} className="flex-1 items-center">
                <Text className="text-[11px] font-bold text-text-muted">{wd}</Text>
              </View>
            ))}
          </View>

          {/* Günler Izgarası */}
          <View className="flex-row flex-wrap justify-between">
            {calendarDays.map((item, index) => {
              const isSelected = item.dateStr === selectedDate;
              const isToday = item.dateStr === today;
              const isFuture = item.dateStr > today;

              return (
                <View key={index} className="w-[14.28%] aspect-square p-0.5 items-center justify-center">
                  <Pressable
                    onPress={() => handlePickDate(item.dateStr)}
                    className={`w-full h-full rounded-xl items-center justify-center ${
                      isSelected
                        ? 'bg-[#818CF8]'
                        : isToday
                          ? 'border border-[#818CF8]/60 bg-[#818CF8]/10'
                          : 'active:bg-white/10'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected
                          ? 'font-black text-[#0B0F14]'
                          : isToday
                            ? 'font-bold text-[#818CF8]'
                            : !item.isCurrentMonth
                              ? 'text-white/20'
                              : isFuture
                                ? 'text-white/40'
                                : 'text-text-primary'
                      }`}
                    >
                      {item.day}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
