import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../../constants/theme';
import { extractWorkoutAction, type WorkoutAction } from '../../services/aiCoach';

type FormattedCoachMessageProps = {
  content: string;
  onExecuteAction?: (action: WorkoutAction) => void;
  isActionExecuted?: boolean;
};

// **bold** metinleri ayrıştıran yardımcı fonksiyon
function renderFormattedText(rawText: string, isLight = false) {
  const parts = rawText.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldContent = part.slice(2, -2);
      return (
        <Text
          key={index}
          className={`font-bold ${isLight ? 'text-text-primary' : 'text-text-primary'}`}
        >
          {boldContent}
        </Text>
      );
    }
    return (
      <Text
        key={index}
        className={`${isLight ? 'text-text-primary' : 'text-text-primary/90'}`}
      >
        {part}
      </Text>
    );
  });
}

// Blok türünü tespit et
type Block =
  | { type: 'header'; text: string; level: number }
  | { type: 'section_card'; title: string; icon: string; theme: 'green' | 'amber' | 'blue' | 'purple'; lines: string[] }
  | { type: 'bullet'; text: string }
  | { type: 'paragraph'; text: string };

function parseContentToBlocks(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let currentCard: { title: string; icon: string; theme: 'green' | 'amber' | 'blue' | 'purple'; lines: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Özel temalı kart başlıkları (Haftalık analiz raporu başlıkları)
    if (rawLine.includes('🏆') || rawLine.includes('Haftalık Özet') || rawLine.includes('Güçlenen')) {
      if (currentCard) blocks.push({ type: 'section_card', ...currentCard });
      currentCard = {
        title: rawLine.replace(/^[#*\s]+|[#*\s]+$/g, ''),
        icon: 'trophy',
        theme: 'green',
        lines: [],
      };
      continue;
    }

    if (rawLine.includes('🔍') || rawLine.includes('Plato Analizi') || rawLine.includes('Değişiklik')) {
      if (currentCard) blocks.push({ type: 'section_card', ...currentCard });
      currentCard = {
        title: rawLine.replace(/^[#*\s]+|[#*\s]+$/g, ''),
        icon: 'analytics',
        theme: 'amber',
        lines: [],
      };
      continue;
    }

    if (rawLine.includes('⚖️') || rawLine.includes('Kilo') || rawLine.includes('Beslenme')) {
      if (currentCard) blocks.push({ type: 'section_card', ...currentCard });
      currentCard = {
        title: rawLine.replace(/^[#*\s]+|[#*\s]+$/g, ''),
        icon: 'scale',
        theme: 'blue',
        lines: [],
      };
      continue;
    }

    if (rawLine.includes('🎯') || rawLine.includes('Eylem Planı') || rawLine.includes('Tavsiye')) {
      if (currentCard) blocks.push({ type: 'section_card', ...currentCard });
      currentCard = {
        title: rawLine.replace(/^[#*\s]+|[#*\s]+$/g, ''),
        icon: 'flag',
        theme: 'purple',
        lines: [],
      };
      continue;
    }

    // Eğer bir kartın içindeysek ve yeni bir H1/H2 gelmediyse bu satırı karta ekle
    if (currentCard) {
      if (rawLine.startsWith('# ')) {
        blocks.push({ type: 'section_card', ...currentCard });
        currentCard = null;
      } else {
        currentCard.lines.push(rawLine);
        continue;
      }
    }

    // Standart Markdown başlıkları
    if (rawLine.startsWith('### ')) {
      blocks.push({ type: 'header', text: rawLine.replace('### ', ''), level: 3 });
    } else if (rawLine.startsWith('## ')) {
      blocks.push({ type: 'header', text: rawLine.replace('## ', ''), level: 2 });
    } else if (rawLine.startsWith('# ')) {
      blocks.push({ type: 'header', text: rawLine.replace('# ', ''), level: 1 });
    } else if (
      rawLine.startsWith('- ') ||
      rawLine.startsWith('* ') ||
      rawLine.startsWith('• ') ||
      /^\d+\.\s/.test(rawLine)
    ) {
      const cleanBullet = rawLine.replace(/^[-*•]\s+|\d+\.\s+/, '');
      blocks.push({ type: 'bullet', text: cleanBullet });
    } else {
      blocks.push({ type: 'paragraph', text: rawLine });
    }
  }

  if (currentCard) {
    blocks.push({ type: 'section_card', ...currentCard });
  }

  return blocks;
}

export function FormattedCoachMessage({ content, onExecuteAction, isActionExecuted = false }: FormattedCoachMessageProps) {
  const { cleanContent, action } = extractWorkoutAction(content);
  const blocks = parseContentToBlocks(cleanContent);

  const getThemeStyles = (theme: 'green' | 'amber' | 'blue' | 'purple') => {
    switch (theme) {
      case 'green':
        return {
          bg: 'rgba(74, 222, 128, 0.08)',
          border: 'rgba(74, 222, 128, 0.25)',
          titleColor: '#4ADE80',
          iconColor: '#4ADE80',
        };
      case 'amber':
        return {
          bg: 'rgba(251, 191, 36, 0.08)',
          border: 'rgba(251, 191, 36, 0.25)',
          titleColor: '#FBBF24',
          iconColor: '#FBBF24',
        };
      case 'blue':
        return {
          bg: 'rgba(56, 189, 248, 0.08)',
          border: 'rgba(56, 189, 248, 0.25)',
          titleColor: '#38BDF8',
          iconColor: '#38BDF8',
        };
      case 'purple':
        return {
          bg: 'rgba(168, 85, 247, 0.08)',
          border: 'rgba(168, 85, 247, 0.25)',
          titleColor: '#C084FC',
          iconColor: '#C084FC',
        };
    }
  };

  return (
    <View className="gap-sm">
      {/* Koç Üst Başlık & Rozeti */}
      <View className="flex-row items-center gap-xs pb-xs border-b border-bg-elevated/40">
        <View className="h-2 w-2 rounded-full bg-accent" />
        <Text className="text-[11px] font-bold uppercase tracking-wider text-accent">
          Powerform AI Koç
        </Text>
      </View>

      {/* Mesaj Blokları */}
      <View className="gap-xs">
        {blocks.map((block, idx) => {
          if (block.type === 'section_card') {
            const styles = getThemeStyles(block.theme);
            return (
              <View
                key={idx}
                className="my-1 rounded-xl p-md"
                style={{
                  backgroundColor: styles.bg,
                  borderWidth: 1,
                  borderColor: styles.border,
                }}
              >
                {/* Kart Başlığı */}
                <View className="flex-row items-center gap-xs mb-2">
                  <Ionicons name={block.icon as any} size={15} color={styles.iconColor} />
                  <Text className="text-xs font-bold" style={{ color: styles.titleColor }}>
                    {block.title}
                  </Text>
                </View>

                {/* Kart İçi Satırlar */}
                <View className="gap-1.5">
                  {block.lines.map((line, lIdx) => {
                    const isBullet =
                      line.startsWith('- ') ||
                      line.startsWith('* ') ||
                      line.startsWith('• ') ||
                      /^\d+\.\s/.test(line);

                    const cleanLine = isBullet ? line.replace(/^[-*•]\s+|\d+\.\s+/, '') : line;

                    return (
                      <View key={lIdx} className="flex-row items-start gap-1.5">
                        {isBullet && (
                          <Text className="text-xs mt-0.5" style={{ color: styles.iconColor }}>
                            •
                          </Text>
                        )}
                        <Text className="flex-1 text-xs leading-relaxed text-text-primary">
                          {renderFormattedText(cleanLine)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          }

          if (block.type === 'header') {
            return (
              <Text
                key={idx}
                className={`font-bold text-text-primary mt-2 mb-1 ${
                  block.level === 1 ? 'text-base text-accent' : block.level === 2 ? 'text-sm text-accent-alt' : 'text-xs text-text-primary'
                }`}
              >
                {renderFormattedText(block.text)}
              </Text>
            );
          }

          if (block.type === 'bullet') {
            return (
              <View key={idx} className="flex-row items-start gap-1.5 my-0.5 pl-1">
                <Text className="text-xs text-accent mt-0.5">▸</Text>
                <Text className="flex-1 text-xs leading-relaxed text-text-primary">
                  {renderFormattedText(block.text)}
                </Text>
              </View>
            );
          }

          return (
            <Text key={idx} className="text-xs leading-relaxed text-text-primary my-0.5">
              {renderFormattedText(block.text)}
            </Text>
          );
        })}
      </View>

      {/* Aksiyon Kartı (Antrenman Ekle veya Hareket Değiştir) */}
      {action && (
        <View className="mt-2 rounded-2xl border border-accent/30 bg-accent/5 p-3.5 overflow-hidden">
          <View className="flex-row items-center justify-between pb-2 border-b border-accent/20">
            <View className="flex-row items-center gap-2">
              <Ionicons
                name={action.type === 'create_workout' ? 'barbell' : 'swap-horizontal'}
                size={16}
                color={colors.accent}
              />
              <Text className="text-[11px] font-bold text-accent uppercase tracking-wider">
                {action.type === 'create_workout' ? 'Hazır Antrenman Planı' : 'Hareket Değişikliği Önerisi'}
              </Text>
            </View>
            {isActionExecuted && (
              <View className="flex-row items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 border border-accent/30">
                <Ionicons name="checkmark-circle" size={12} color={colors.accent} />
                <Text className="text-[10px] font-bold text-accent">Uygulandı</Text>
              </View>
            )}
          </View>

          {action.type === 'create_workout' && (
            <View className="pt-2 gap-2">
              <Text className="text-sm font-bold text-text-primary">{action.title}</Text>
              {action.focus ? (
                <Text className="text-xs text-text-muted">Hedef Odak: {action.focus}</Text>
              ) : null}

              <View className="gap-1 mt-1">
                {action.exercises.map((ex, idx) => (
                  <View
                    key={idx}
                    className="flex-row items-center justify-between py-1 border-b border-bg-elevated/40"
                  >
                    <Text className="text-xs font-semibold text-text-primary flex-1 mr-2" numberOfLines={1}>
                      {idx + 1}. {ex.name}
                    </Text>
                    <Text className="text-xs text-accent font-medium">
                      {ex.targetSets} Set × {ex.repMin === ex.repMax ? ex.repMin : `${ex.repMin}-${ex.repMax}`} Tkr {ex.restSeconds ? `(${ex.restSeconds}s)` : ''}
                    </Text>
                  </View>
                ))}
              </View>

              <Pressable
                disabled={isActionExecuted}
                onPress={() => onExecuteAction?.(action)}
                className={`mt-2 flex-row items-center justify-center gap-2 py-2.5 px-4 rounded-xl ${
                  isActionExecuted ? 'bg-bg-elevated border border-border' : 'bg-accent active:opacity-80'
                }`}
              >
                <Ionicons
                  name={isActionExecuted ? 'checkmark-circle' : 'add-circle-outline'}
                  size={16}
                  color={isActionExecuted ? colors.textMuted : colors.bgPrimary}
                />
                <Text
                  className={`text-xs font-bold ${
                    isActionExecuted ? 'text-text-muted' : 'text-bg-primary'
                  }`}
                >
                  {isActionExecuted ? 'Programlara Eklendi' : 'Antrenmanlarıma Kaydet'}
                </Text>
              </Pressable>
            </View>
          )}

          {action.type === 'replace_exercise' && (
            <View className="pt-2 gap-2">
              <View className="flex-row items-center gap-2">
                <View className="flex-1 rounded-lg bg-bg-surface p-2 border border-danger/30">
                  <Text className="text-[10px] text-danger font-medium">Mevcut Hareket</Text>
                  <Text className="text-xs font-bold text-text-primary mt-0.5">{action.currentExerciseName}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.accent} />
                <View className="flex-1 rounded-lg bg-bg-surface p-2 border border-accent/40">
                  <Text className="text-[10px] text-accent font-medium">Önerilen Hareket</Text>
                  <Text className="text-xs font-bold text-accent mt-0.5">{action.suggestedExerciseName}</Text>
                </View>
              </View>

              {action.reason ? (
                <Text className="text-xs text-text-muted mt-1 italic">
                  "💡 {action.reason}"
                </Text>
              ) : null}

              <Pressable
                disabled={isActionExecuted}
                onPress={() => onExecuteAction?.(action)}
                className={`mt-2 flex-row items-center justify-center gap-2 py-2.5 px-4 rounded-xl ${
                  isActionExecuted ? 'bg-bg-elevated border border-border' : 'bg-accent active:opacity-80'
                }`}
              >
                <Ionicons
                  name={isActionExecuted ? 'checkmark-circle' : 'swap-horizontal'}
                  size={16}
                  color={isActionExecuted ? colors.textMuted : colors.bgPrimary}
                />
                <Text
                  className={`text-xs font-bold ${
                    isActionExecuted ? 'text-text-muted' : 'text-bg-primary'
                  }`}
                >
                  {isActionExecuted ? 'Aktif Antrenmanda Değiştirildi' : 'Aktif Antrenmanda Değiştir'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
