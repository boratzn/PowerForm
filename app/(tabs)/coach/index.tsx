import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormattedCoachMessage } from '../../../src/components/coach/FormattedCoachMessage';
import { CoachHistoryModal } from '../../../src/components/coach/CoachHistoryModal';
import { WeeklyCheckInModal } from '../../../src/components/coach/WeeklyCheckInModal';
import { Button, Card, StatusModal, ToastBanner } from '../../../src/components/ui';
import { colors } from '../../../src/constants/theme';
import {
  createAiConversation,
  getAiConversationMessages,
  getOrCreateActiveConversation,
  saveAiMessage,
  saveAiReport,
} from '../../../src/db/aiHistory';
import {
  replaceExerciseInActiveProgramByName,
  saveAiGeneratedWorkout,
} from '../../../src/db/programs';
import {
  getWeeklyCoachData,
  type WeeklyCoachData,
} from '../../../src/db/coachAnalytics';
import {
  askCoachQuestion,
  generateWeeklyCoachAnalysis,
  type ChatMessage,
  type CheckInAnswers,
  type WorkoutAction,
} from '../../../src/services/aiCoach';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { useProgramStore } from '../../../src/stores/useProgramStore';
import { useSubscriptionStore } from '../../../src/stores/useSubscriptionStore';
import { useLanguageStore } from '../../../src/stores/useLanguageStore';

const SUGGESTED_PROMPTS: Record<string, string[]> = {
  tr: [
    'Takıldığım hareketlerde neyi değiştirmeliyim?',
    'Bu hafta bir deload haftası yapmalı mıyım?',
    'Kilo değişimim hipertrofi hedefime uygun mu?',
    'Omuz presi yerine hangi alternatife geçebilirim?',
  ],
  en: [
    'What should I change in stalled exercises?',
    'Should I take a deload week this week?',
    'Is my weight change aligned with muscle gain?',
    'What can I swap shoulder press with?',
  ],
  de: [
    'Was sollte ich bei stagnierenden Übungen ändern?',
    'Sollte ich diese Woche eine Deload-Woche machen?',
    'Passt meine Gewichtsänderung zum Muskelaufbau?',
    'Welche Alternative gibt es zum Schulterdrücken?',
  ],
  es: [
    '¿Qué debo cambiar en ejercicios estancados?',
    '¿Debería hacer una semana de descarga?',
    '¿Mi cambio de peso es adecuado para hipertrofia?',
    '¿Qué alternativa puedo usar para press militar?',
  ],
};

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useAuthStore((s) => s.profile);
  const isPro = useSubscriptionStore((s) => s.isPro);
  const openPaywall = useSubscriptionStore((s) => s.openPaywall);
  const isMockMode = useSubscriptionStore((s) => s.isMockMode);
  const toggleMockPro = useSubscriptionStore((s) => s.toggleMockPro);

  const [proCelebrationVisible, setProCelebrationVisible] = useState(false);

  const handleToggleMockPro = async () => {
    const willBePro = !isPro;
    await toggleMockPro();
    if (willBePro) {
      setProCelebrationVisible(true);
    }
  };

  const [weeklyData, setWeeklyData] = useState<WeeklyCoachData | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Analiz & Check-in Durumu
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<string | null>(null);

  // Sohbet & Oturum Geçmişi Durumu
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const [toastError, setToastError] = useState<{ message: string; onRetry?: () => void } | null>(null);
  const [executedActionIds, setExecutedActionIds] = useState<Set<string>>(new Set());

  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isAsking]);

  const loadActiveConversation = useCallback(async (uid: string) => {
    try {
      const activeConv = await getOrCreateActiveConversation(uid);
      setCurrentConversationId(activeConv.id);
      const dbMsgs = await getAiConversationMessages(activeConv.id);
      setMessages(
        dbMsgs.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          createdAt: m.createdAt * 1000,
        }))
      );
    } catch (err) {
      console.warn('[CoachScreen] Aktif sohbet yüklenemedi:', err);
    }
  }, []);

  const selectConversation = useCallback(async (convId: string) => {
    setCurrentConversationId(convId);
    try {
      const dbMsgs = await getAiConversationMessages(convId);
      setMessages(
        dbMsgs.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          createdAt: m.createdAt * 1000,
        }))
      );
    } catch (err) {
      console.warn('[CoachScreen] Sohbet mesajları çekilemedi:', err);
    }
  }, []);

  const handleStartNewConversation = useCallback(async () => {
    if (!userId) return;
    try {
      const newConv = await createAiConversation(userId);
      setCurrentConversationId(newConv.id);
      setMessages([]);
    } catch (err) {
      console.warn('[CoachScreen] Yeni sohbet oluşturulamadı:', err);
    }
  }, [userId]);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoadingData(true);
    try {
      const data = await getWeeklyCoachData(userId);
      setWeeklyData(data);
      if (!currentConversationId) {
        await loadActiveConversation(userId);
      }
    } catch (err) {
      console.warn('[CoachScreen] Haftalık veri çekilemedi:', err);
    } finally {
      setLoadingData(false);
    }
  }, [userId, currentConversationId, loadActiveConversation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      if (userId) {
        useSubscriptionStore.getState().initialize(userId);
      }
    }, [loadData, userId])
  );

  const handleStartAnalysis = () => {
    if (!isPro) {
      openPaywall();
      return;
    }
    setCheckInVisible(true);
  };

  const handleCheckInSubmit = async (answers: CheckInAnswers) => {
    if (!weeklyData || !userId) return;
    setIsAnalyzing(true);
    try {
      const analysisText = await generateWeeklyCoachAnalysis(weeklyData, answers, profile);
      setLatestAnalysis(analysisText);
      setCheckInVisible(false);

      // 1. Haftalık Analiz Raporunu DB'ye Kaydet
      await saveAiReport({
        userId,
        periodStart: weeklyData.startDateStr,
        periodEnd: weeklyData.endDateStr,
        title: 'Haftalık Gelişim Analizi',
        contentMd: analysisText,
        metrics: weeklyData,
      });

      // 2. Aktif sohbete de koç mesajı olarak kaydet ve ekle
      let convId = currentConversationId;
      if (!convId) {
        const activeConv = await getOrCreateActiveConversation(userId);
        convId = activeConv.id;
        setCurrentConversationId(convId);
      }

      const reportContent = `📋 **Haftalık Gelişim Analizin Hazırlandı:**\n\n${analysisText}`;
      const savedMsg = await saveAiMessage({
        conversationId: convId,
        role: 'assistant',
        content: reportContent,
      });

      const reportMsg: ChatMessage = {
        id: savedMsg.id,
        role: 'assistant',
        content: reportContent,
        createdAt: savedMsg.createdAt * 1000,
      };
      setMessages((prev) => [...prev, reportMsg]);
    } catch (err: any) {
      setToastError({
        message: err?.message || 'Analiz raporu oluşturulurken bir hata meydana geldi.',
        onRetry: () => handleCheckInSubmit(answers),
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecuteAction = async (msgId: string, action: WorkoutAction) => {
    if (!userId) {
      Alert.alert('Giriş Gerekli', 'Bu işlemi gerçekleştirmek için oturum açmış olmalısınız.');
      return;
    }

    try {
      if (action.type === 'create_workout') {
        const res = await saveAiGeneratedWorkout(userId, action);
        if (!res.success) {
          Alert.alert('Kayıt Başarısız', res.message || 'Antrenmandaki hareketler kütüphaneyle eşleştirilemedi.');
          return;
        }
        await Promise.all([
          useProgramStore.getState().loadActiveProgram(),
          useProgramStore.getState().loadUserPrograms(),
        ]);
        setExecutedActionIds((prev) => new Set(prev).add(msgId));
        Alert.alert(
          'Antrenman Kaydedildi ve Aktifleştirildi! 🎉',
          `"${action.title}" başarıyla kaydedildi ve aktif programınız olarak ayarlandı. "Antrenman" sekmesine geçerek hemen başlayabilirsiniz!`
        );
      } else if (action.type === 'replace_exercise') {
        const res = await replaceExerciseInActiveProgramByName(
          userId,
          action.currentExerciseName,
          action.suggestedExerciseName
        );
        if (res.success) {
          await useProgramStore.getState().loadActiveProgram();
          setExecutedActionIds((prev) => new Set(prev).add(msgId));
          Alert.alert(
            'Hareket Güncellendi! 🔄',
            `Aktif programınızdaki "${action.currentExerciseName}" hareketi "${action.suggestedExerciseName}" ile başarıyla değiştirildi.`
          );
        } else {
          Alert.alert(
            'Değişiklik Yapılamadı',
            res.message || 'Aktif programınızda değiştirilecek hareket bulunamadı.'
          );
        }
      }
    } catch (err: any) {
      console.error('[CoachScreen] Aksiyon uygulama hatası:', err);
      Alert.alert('Hata', err.message || 'İşlem uygulanırken bir hata oluştu.');
    }
  };

  const handleCopyMessage = async (msgId: string, content: string) => {
    try {
      await Clipboard.setStringAsync(content);
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.warn('[CoachScreen] Kopyalama hatası:', err);
    }
  };

  const handleStartEditing = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setInputText(msg.content);
  };

  const handleCancelEditing = () => {
    setEditingMessageId(null);
    setInputText('');
  };

  const handleRegenerate = async (assistantMsgId: string) => {
    const targetIdx = messages.findIndex((m) => m.id === assistantMsgId);
    if (targetIdx === -1) return;
    const prevUserMsg = messages[targetIdx - 1];
    if (!prevUserMsg) return;

    const historyBefore = messages.slice(0, targetIdx);
    setMessages(historyBefore);
    setIsAsking(true);

    try {
      const answer = await askCoachQuestion(
        prevUserMsg.content,
        historyBefore,
        weeklyData ?? undefined,
        profile
      );

      let convId = currentConversationId;
      if (userId && !convId) {
        const activeConv = await getOrCreateActiveConversation(userId);
        convId = activeConv.id;
        setCurrentConversationId(convId);
      }

      let savedId = `a_${Date.now()}`;
      if (convId) {
        const saved = await saveAiMessage({
          conversationId: convId,
          role: 'assistant',
          content: answer,
        });
        savedId = saved.id;
      }

      const newAssistantMsg: ChatMessage = {
        id: savedId,
        role: 'assistant',
        content: answer,
        createdAt: Date.now(),
      };
      setMessages([...historyBefore, newAssistantMsg]);
    } catch (err: any) {
      setToastError({
        message: err?.message || 'Koç yanıt veremedi. Lütfen tekrar deneyin.',
        onRetry: () => handleRegenerate(assistantMsgId),
      });
    } finally {
      setIsAsking(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isAsking) return;

    if (!isPro) {
      openPaywall();
      return;
    }

    if (!userId) return;

    let convId = currentConversationId;
    if (!convId) {
      const activeConv = await getOrCreateActiveConversation(userId);
      convId = activeConv.id;
      setCurrentConversationId(convId);
    }

    let historyForAi = messages;
    if (editingMessageId) {
      const targetIdx = messages.findIndex((m) => m.id === editingMessageId);
      if (targetIdx !== -1) {
        const truncated = messages.slice(0, targetIdx);
        const savedUserMsg = await saveAiMessage({
          conversationId: convId,
          role: 'user',
          content: text,
        });
        const updatedUserMsg: ChatMessage = {
          id: savedUserMsg.id,
          role: 'user',
          content: text,
          createdAt: savedUserMsg.createdAt * 1000,
        };
        setMessages([...truncated, updatedUserMsg]);
        historyForAi = truncated;
      }
      setEditingMessageId(null);
    } else {
      const savedUserMsg = await saveAiMessage({
        conversationId: convId,
        role: 'user',
        content: text,
      });
      const userMsg: ChatMessage = {
        id: savedUserMsg.id,
        role: 'user',
        content: text,
        createdAt: savedUserMsg.createdAt * 1000,
      };
      setMessages((prev) => [...prev, userMsg]);
    }

    setInputText('');
    setIsAsking(true);

    try {
      const answer = await askCoachQuestion(text, historyForAi, weeklyData ?? undefined, profile);
      const savedAssistantMsg = await saveAiMessage({
        conversationId: convId,
        role: 'assistant',
        content: answer,
      });
      const assistantMsg: ChatMessage = {
        id: savedAssistantMsg.id,
        role: 'assistant',
        content: answer,
        createdAt: savedAssistantMsg.createdAt * 1000,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setToastError({
        message: err?.message || 'Koç yanıt veremedi. Lütfen tekrar deneyin.',
        onRetry: () => handleSendMessage(text),
      });
    } finally {
      setIsAsking(false);
    }
  };

  // Kilitli / Pro Olmayan Durum Arayüzü
  if (!isPro) {
    return (
      <ScrollView
        className="flex-1 bg-bg-primary px-lg"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold tracking-tight text-text-primary">{t('ai_coach')}</Text>
          <View className="flex-row items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2.5 py-1 border border-[#F59E0B]/30">
            <Ionicons name="lock-closed" size={12} color="#F59E0B" />
            <Text className="text-[11px] font-bold text-[#F59E0B]">{t('pro_feature_locked')}</Text>
          </View>
        </View>

        {/* Kilitli Hero Kartı */}
        <Card className="gap-md border border-[#F59E0B]/30 bg-bg-surface p-lg">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/30">
            <Ionicons name="sparkles" size={24} color="#F59E0B" />
          </View>

          <View className="gap-xs">
            <Text className="text-xl font-bold text-text-primary">
              {t('activate_ai_coach_title')}
            </Text>
            <Text className="text-xs text-text-muted leading-relaxed">
              {t('activate_ai_coach_desc')}
            </Text>
          </View>

          <View className="gap-sm pt-xs border-t border-bg-elevated">
            {[
              t('coach_feat_1'),
              t('coach_feat_2'),
              t('coach_feat_3'),
              t('coach_feat_4'),
            ].map((f, i) => (
              <View key={i} className="flex-row items-center gap-xs">
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                <Text className="text-xs text-text-primary font-medium flex-1">{f}</Text>
              </View>
            ))}
          </View>

          <Button
            label={t('go_pro')}
            variant="primary"
            onPress={openPaywall}
            className="mt-xs min-h-[50px]"
          />
        </Card>

        {/* Test / Simülasyon Kısayolu */}
        {isMockMode && (
          <Card className="border border-warning/30 bg-warning/5 p-md gap-xs">
            <View className="flex-row items-center gap-xs">
              <Ionicons name="construct-outline" size={14} color={colors.warning} />
              <Text className="text-xs font-bold text-warning">Geliştirici Modu</Text>
            </View>
            <Text className="text-[11px] text-text-muted">
              RevenueCat anahtarları eklenene kadar aşağıdaki butona basarak AI Koç arayüzünü anında test edebilirsiniz:
            </Text>
            <Pressable
              onPress={handleToggleMockPro}
              className="mt-xs items-center justify-center rounded-lg bg-warning/20 py-2 border border-warning/30 active:opacity-70"
            >
              <Text className="text-xs font-bold text-warning">🟢 Pro Durumunu Simüle Et (Aç)</Text>
            </Pressable>
          </Card>
        )}

        {/* Pro Kutlama Modalı */}
        <StatusModal
          visible={proCelebrationVisible}
          type="pro_celebration"
          title="Tebrikler, Powerform PRO Aktif!"
          message="Powerform PRO üyeliğin başarıyla tanımlandı. Sınırsız AI Koç analizleri ve tüm premium özellikler kullanımına hazır."
          features={[
            'Sınırsız Kişisel AI Koç ve Haftalık Analizler',
            'Plato Tespiti ve Ağırlık Artış Önerileri',
            'Gelişmiş Kuvvet & Hacim Grafikleri',
            'Sınırsız Şablon ve Geçmiş Kaydı',
          ]}
          primaryButtonText="Harika, Başlayalım! 🚀"
          onPrimaryPress={() => setProCelebrationVisible(false)}
        />
      </ScrollView>
    );
  }

  // Pro Kullanıcı Aktif Ekranı
  const plateauCount = weeklyData?.workoutSummary.plateauExercises.length ?? 0;
  const progressingCount = weeklyData?.workoutSummary.progressingExercises.length ?? 0;
  const totalSessions = weeklyData?.workoutSummary.totalSessions ?? 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      className="flex-1 bg-bg-primary"
    >
      <View
        className="flex-1 px-lg"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: isKeyboardVisible ? 8 : (insets.bottom > 0 ? insets.bottom : 8),
        }}
      >
        {/* Üst Başlık */}
        <View className="flex-row items-center justify-between pb-sm">
          <View className="flex-1 mr-2">
            <Text className="text-2xl font-bold tracking-tight text-text-primary">{t('ai_coach')}</Text>
            <Text className="text-xs text-text-muted" numberOfLines={1}>
              {t('coach_subtitle')}
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5">
            {/* Yeni Sohbet Başlat */}
            <Pressable
              onPress={handleStartNewConversation}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full bg-bg-surface border border-bg-elevated active:opacity-60"
            >
              <Ionicons name="add" size={18} color={colors.textPrimary} />
            </Pressable>

            {/* Sohbet & Rapor Geçmişi */}
            <Pressable
              onPress={() => setHistoryModalVisible(true)}
              hitSlop={8}
              className="flex-row items-center gap-1 rounded-full bg-bg-surface px-2.5 py-1.5 border border-bg-elevated active:opacity-60"
            >
              <Ionicons name="time-outline" size={14} color={colors.accentAlt} />
              <Text className="text-[11px] font-bold text-text-primary">{t('history')}</Text>
            </Pressable>

            {/* PRO Badge */}
            <View className="flex-row items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1.5 border border-accent/30">
              <Ionicons name="diamond" size={11} color={colors.accent} />
              <Text className="text-[10px] font-bold text-accent">{t('pro_badge')}</Text>
            </View>
          </View>
        </View>

        {/* Modern Hata / Uyarı Bildirimi */}
        {toastError && (
          <ToastBanner
            visible={true}
            type="error"
            title="Yapay Zeka Servis Uyarısı"
            message={toastError.message}
            onRetry={toastError.onRetry}
            onClose={() => setToastError(null)}
          />
        )}

        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 16, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Haftalık Analiz & Plato Tespit Kartı */}
          <Card className="gap-md border border-accent/30 bg-bg-surface p-lg">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-xs">
                <Ionicons name="analytics" size={18} color={colors.accent} />
                <Text className="text-sm font-bold uppercase text-accent">{t('weekly_summary_title')}</Text>
              </View>
              {weeklyData && (
                <Text className="text-[11px] text-text-muted">{weeklyData.periodLabel}</Text>
              )}
            </View>

            {loadingData ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <View className="flex-row gap-xs justify-between">
                <View className="flex-1 items-center rounded-xl bg-bg-elevated p-sm border border-bg-surface">
                  <Text className="text-base font-bold text-text-primary">{totalSessions}</Text>
                  <Text className="text-[10px] text-text-muted">{t('sessions_short')}</Text>
                </View>
                <View className="flex-1 items-center rounded-xl bg-bg-elevated p-sm border border-bg-surface">
                  <Text className="text-base font-bold text-[#38BDF8]">+{progressingCount}</Text>
                  <Text className="text-[10px] text-text-muted">{t('progressing_label')}</Text>
                </View>
                <View className="flex-1 items-center rounded-xl bg-bg-elevated p-sm border border-bg-surface">
                  <Text className="text-base font-bold text-[#FBBF24]">{plateauCount}</Text>
                  <Text className="text-[10px] text-text-muted">{t('plateau_label')}</Text>
                </View>
                <View className="flex-1 items-center rounded-xl bg-bg-elevated p-sm border border-bg-surface">
                  <Text className="text-base font-bold text-accent">
                    {weeklyData?.weightSummary.weeklyChangeKg !== null
                      ? `${weeklyData?.weightSummary.weeklyChangeKg} kg`
                      : '—'}
                  </Text>
                  <Text className="text-[10px] text-text-muted">{t('weight_change_label')}</Text>
                </View>
              </View>
            )}

            {/* Haftalık Gelişimimi Analiz Et Butonu */}
            <Button
              label={isAnalyzing ? t('analyzing_progress') : t('analyze_progress_btn')}
              variant="primary"
              disabled={isAnalyzing}
              onPress={handleStartAnalysis}
              className="min-h-[48px]"
            />

            {/* Önceki Raporlar & Sohbet Geçmişi Kısayolu */}
            <Pressable
              onPress={() => setHistoryModalVisible(true)}
              className="flex-row items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-bg-elevated/60 active:opacity-75"
            >
              <Ionicons name="archive-outline" size={14} color="#38BDF8" />
              <Text className="text-xs font-semibold text-[#38BDF8]">
                {t('previous_reports_btn')}
              </Text>
            </Pressable>
          </Card>

          {/* Hızlı Soru Çipleri */}
          <View className="gap-xs">
            <Text className="text-xs font-bold uppercase text-text-muted">{t('suggested_questions')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(SUGGESTED_PROMPTS[language] || SUGGESTED_PROMPTS.tr).map((chip, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSendMessage(chip)}
                  className="rounded-full bg-bg-elevated px-3.5 py-2 border border-bg-surface active:opacity-70"
                >
                  <Text className="text-xs text-text-primary">{chip}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Mesaj Akışı */}
          {messages.length === 0 ? (
            <Card className="items-center justify-center py-xl gap-xs border border-dashed border-bg-elevated">
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textMuted} />
              <Text className="text-sm font-semibold text-text-primary text-center">
                {t('no_chat_yet_title')}
              </Text>
              <Text className="text-xs text-text-muted text-center px-lg">
                {t('no_chat_yet_desc')}
              </Text>
            </Card>
          ) : (
            <View className="gap-md">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const isCopied = copiedMessageId === msg.id;

                return (
                  <View
                    key={msg.id}
                    className={`gap-1 ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <View
                      className={`rounded-2xl p-md ${
                        isUser
                          ? 'max-w-[85%] bg-accent/20 border border-accent/30'
                          : 'w-full max-w-[96%] bg-bg-surface/95 border border-bg-elevated shadow-sm'
                      }`}
                    >
                      {isUser ? (
                        <Text className="text-sm leading-relaxed text-accent font-medium">
                          {msg.content}
                        </Text>
                      ) : (
                        <FormattedCoachMessage
                          content={msg.content}
                          isActionExecuted={executedActionIds.has(msg.id)}
                          onExecuteAction={(action) => handleExecuteAction(msg.id, action)}
                        />
                      )}
                    </View>

                    {/* Aksiyon Butonları (Kopyala & Düzenle / Yeniden Yanıtla) */}
                    <View className={`flex-row items-center gap-xs px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {/* Kopyala */}
                      <Pressable
                        onPress={() => handleCopyMessage(msg.id, msg.content)}
                        hitSlop={6}
                        className="flex-row items-center gap-1 rounded-full bg-bg-surface/80 px-2 py-0.5 border border-bg-elevated active:opacity-60"
                      >
                        <Ionicons
                          name={isCopied ? 'checkmark' : 'copy-outline'}
                          size={11}
                          color={isCopied ? colors.accent : colors.textMuted}
                        />
                        <Text
                          className={`text-[10px] font-medium ${
                            isCopied ? 'text-accent' : 'text-text-muted'
                          }`}
                        >
                          {isCopied ? t('copied') : t('copy')}
                        </Text>
                      </Pressable>

                      {/* Düzenle (Kullanıcı mesajı için) */}
                      {isUser && (
                        <Pressable
                          onPress={() => handleStartEditing(msg)}
                          hitSlop={6}
                          className="flex-row items-center gap-1 rounded-full bg-bg-surface/80 px-2 py-0.5 border border-bg-elevated active:opacity-60"
                        >
                          <Ionicons name="pencil-outline" size={11} color={colors.textMuted} />
                          <Text className="text-[10px] font-medium text-text-muted">{t('edit')}</Text>
                        </Pressable>
                      )}

                      {/* Yeniden Yanıtla (Koç mesajı için) */}
                      {!isUser && (
                        <Pressable
                          onPress={() => handleRegenerate(msg.id)}
                          disabled={isAsking}
                          hitSlop={6}
                          className="flex-row items-center gap-1 rounded-full bg-bg-surface/80 px-2 py-0.5 border border-bg-elevated active:opacity-60"
                        >
                          <Ionicons name="refresh-outline" size={11} color={colors.textMuted} />
                          <Text className="text-[10px] font-medium text-text-muted">{t('regenerate')}</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
              {isAsking && (
                <View className="flex-row items-center gap-xs py-sm">
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text className="text-xs text-text-muted">{t('coach_thinking')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Test Modu Geliştirici Kutusu (Pro Açıksa da İptal Etmeyi Test Edebilmesi İçin) */}
          {isMockMode && (
            <Pressable
              onPress={toggleMockPro}
              className="py-xs items-center opacity-60 active:opacity-100"
            >
              <Text className="text-[11px] text-text-muted underline">
                🛠️ Geliştirici Modu: Pro Üyeliği Kapat (Test)
              </Text>
            </Pressable>
          )}
        </ScrollView>

        {/* Mesaj Düzenleme Göstergesi */}
        {editingMessageId && (
          <View className="flex-row items-center justify-between rounded-t-xl bg-bg-surface px-md py-1.5 border-t border-x border-accent/40">
            <View className="flex-row items-center gap-xs">
              <Ionicons name="pencil" size={12} color={colors.accent} />
              <Text className="text-xs font-semibold text-accent">{t('editing_message')}</Text>
            </View>
            <Pressable onPress={handleCancelEditing} hitSlop={8} className="p-0.5">
              <Text className="text-xs font-bold text-text-muted">{t('cancel')}</Text>
            </Pressable>
          </View>
        )}

        {/* Mesaj Giriş Barı */}
        <View
          className={`flex-row items-center gap-xs pt-xs border-t border-bg-elevated ${
            editingMessageId ? 'rounded-b-xl' : ''
          }`}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('ask_coach_placeholder')}
            placeholderTextColor="#8A97A6"
            className="flex-1 min-h-[46px] rounded-full bg-bg-surface px-md text-sm text-text-primary border border-bg-elevated"
            onSubmitEditing={() => handleSendMessage()}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 120);
            }}
          />
          <Pressable
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || isAsking}
            className={`h-11 w-11 items-center justify-center rounded-full ${
              inputText.trim() && !isAsking ? 'bg-accent' : 'bg-bg-elevated opacity-50'
            }`}
          >
            <Ionicons name="arrow-up" size={20} color="#0B0F14" />
          </Pressable>
        </View>

        {/* Haftalık Check-in Modalı */}
        <WeeklyCheckInModal
          visible={checkInVisible}
          onClose={() => setCheckInVisible(false)}
          onSubmit={handleCheckInSubmit}
          isGenerating={isAnalyzing}
        />

        {/* AI Sohbet & Rapor Geçmişi Modalı */}
        {userId && (
          <CoachHistoryModal
            visible={historyModalVisible}
            onClose={() => setHistoryModalVisible(false)}
            userId={userId}
            currentConversationId={currentConversationId}
            onSelectConversation={selectConversation}
            onStartNewConversation={handleStartNewConversation}
          />
        )}

        {/* Pro Kutlama Modalı */}
        <StatusModal
          visible={proCelebrationVisible}
          type="pro_celebration"
          title="Tebrikler, Powerform PRO Aktif!"
          message="Powerform PRO üyeliğin başarıyla tanımlandı. Sınırsız AI Koç analizleri ve tüm premium özellikler kullanımına hazır."
          features={[
            'Sınırsız Kişisel AI Koç ve Haftalık Analizler',
            'Plato Tespiti ve Ağırlık Artış Önerileri',
            'Gelişmiş Kuvvet & Hacim Grafikleri',
            'Sınırsız Şablon ve Geçmiş Kaydı',
          ]}
          primaryButtonText="Harika, Başlayalım! 🚀"
          onPrimaryPress={() => setProCelebrationVisible(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
