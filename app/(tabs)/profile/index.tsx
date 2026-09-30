import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, StatusModal } from '../../../src/components/ui';
import { colors } from '../../../src/constants/theme';
import { getLifetimeStats, type LifetimeStats } from '../../../src/db/profileStats';
import { deleteUserAccountAndData } from '../../../src/lib/accountDeletion';
import { exportAllUserData } from '../../../src/lib/dataExport';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { useProgramStore } from '../../../src/stores/useProgramStore';
import { drainSyncQueue, pullUserDataFromSupabase } from '../../../src/db/syncEngine';
import { formatDurationHuman } from '../../../src/lib/calculations';
import { useSubscriptionStore } from '../../../src/stores/useSubscriptionStore';
import { useLanguageStore } from '../../../src/stores/useLanguageStore';
import { SUPPORTED_LANGUAGES, getExerciseDisplayName } from '../../../src/lib/i18n';

function formatDate(timestampSeconds: number, lang: string = 'tr'): string {
  const d = new Date(timestampSeconds * 1000);
  const locale = lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-US';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

const EXPERIENCE_LABELS: Record<string, Record<string, string>> = {
  tr: {
    beginner: 'Yeni Başlayan',
    intermediate: 'Orta Seviye',
    advanced: 'İleri Seviye',
  },
  en: {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  },
  de: {
    beginner: 'Anfänger',
    intermediate: 'Mittelstufe',
    advanced: 'Fortgeschritten',
  },
  es: {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
  },
};

const GOAL_LABELS: Record<string, Record<string, string>> = {
  tr: {
    hypertrophy: 'Hipertrofi (Kas)',
    strength: 'Kuvvet / Güç',
    fat_loss: 'Yağ Yakımı',
    recomp: 'Recomp',
    general_health: 'Genel Kondisyon',
  },
  en: {
    hypertrophy: 'Hypertrophy (Muscle)',
    strength: 'Strength / Power',
    fat_loss: 'Fat Loss',
    recomp: 'Body Recomp',
    general_health: 'General Fitness',
  },
  de: {
    hypertrophy: 'Hypertrophie (Muskelaufbau)',
    strength: 'Kraftaufbau',
    fat_loss: 'Fettabbau',
    recomp: 'Rekomposition',
    general_health: 'Allgemeine Fitness',
  },
  es: {
    hypertrophy: 'Hipertrofia (Músculo)',
    strength: 'Fuerza',
    fat_loss: 'Pérdida de Grasa',
    recomp: 'Recomposición',
    general_health: 'Salud General',
  },
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const t = useLanguageStore((s) => s.t);
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) ?? SUPPORTED_LANGUAGES[0];

  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const planType = useSubscriptionStore((s) => s.planType);
  const openPaywall = useSubscriptionStore((s) => s.openPaywall);
  const setSelectedPackageId = useSubscriptionStore((s) => s.setSelectedPackageId);

  const [stats, setStats] = useState<LifetimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const loadData = useCallback(() => {
    const userId = session?.user.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getLifetimeStats(userId)
      .then(setStats)
      .catch((err) => console.error('Profil istatistikleri alınamadı:', err))
      .finally(() => setLoading(false));
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      if (session?.user.id) {
        useSubscriptionStore.getState().initialize(session.user.id);
      }
    }, [loadData, session?.user.id])
  );

  const [syncing, setSyncing] = useState(false);

  const handleCloudSync = async () => {
    if (!session?.user?.id) return;
    setSyncing(true);
    try {
      const res = await pullUserDataFromSupabase(session.user.id);
      await drainSyncQueue();
      await useAuthStore.getState().refreshProfile();
      loadData();
      useProgramStore.getState().initialize();
      Alert.alert(
        'Eşitleme Tamamlandı',
        `Buluttan ${res.sessionsCount} antrenman seansı, ${res.weightsCount} kilo kaydı ve ${res.nutritionCount} beslenme kaydı başarıyla cihazınıza yüklendi.`
      );
    } catch (err: any) {
      Alert.alert('Eşitleme Hatası', err?.message || 'Bulut verileri eşitlenirken bir hata oluştu.');
    } finally {
      setSyncing(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      await exportAllUserData();
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteAccountModalVisible(true);
  };

  const handleSignOut = () => {
    setLogoutModalVisible(true);
  };

  const email = session?.user.email ?? 'Kullanıcı';
  const initial = email.charAt(0).toUpperCase();

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
      {/* Profil Başlığı */}
      <View className="flex-row items-center gap-md">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-accent/20 border-2 border-accent">
          <Text className="text-2xl font-bold text-accent">{initial}</Text>
        </View>

        <View className="flex-1">
          <Text className="text-lg font-bold text-text-primary" numberOfLines={1}>
            {email}
          </Text>

          <View className="mt-1 flex-row flex-wrap items-center gap-xs">
            {profile?.experience && (
              <View className="rounded-full bg-bg-elevated px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-text-muted">
                  {EXPERIENCE_LABELS[language]?.[profile.experience] ?? EXPERIENCE_LABELS.tr[profile.experience] ?? profile.experience}
                </Text>
              </View>
            )}
            {profile?.primary_goal && (
              <View className="rounded-full bg-accent/15 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-accent">
                  {GOAL_LABELS[language]?.[profile.primary_goal] ?? GOAL_LABELS.tr[profile.primary_goal] ?? profile.primary_goal}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Pressable
          hitSlop={8}
          onPress={() => router.push('/edit-profile')}
          className="rounded-full bg-bg-surface px-3 py-1.5 border border-bg-elevated active:opacity-70"
        >
          <Text className="text-xs font-semibold text-accent">{t('edit')}</Text>
        </Pressable>
      </View>

      {/* Üyelik & Plan Kartı */}
      <Card
        className={`p-lg gap-md border ${planType === 'annual'
            ? 'border-[#F59E0B]/40 bg-[#151B23]'
            : planType === 'monthly'
              ? 'border-[#38BDF8]/40 bg-[#151B23]'
              : 'border-white/10 bg-bg-surface'
          }`}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <View
              className={`h-11 w-11 items-center justify-center rounded-2xl ${planType === 'annual'
                  ? 'bg-[#F59E0B]/15 border border-[#F59E0B]/35'
                  : planType === 'monthly'
                    ? 'bg-[#38BDF8]/15 border border-[#38BDF8]/35'
                    : 'bg-white/5 border border-white/10'
                }`}
            >
              <Ionicons
                name={planType === 'free' ? 'shield-outline' : 'sparkles'}
                size={22}
                color={
                  planType === 'annual'
                    ? '#F59E0B'
                    : planType === 'monthly'
                      ? '#38BDF8'
                      : colors.textMuted
                }
              />
            </View>
            <View>
              <Text className="text-base font-bold text-text-primary">
                {planType === 'annual'
                  ? t('pro_annual')
                  : planType === 'monthly'
                    ? t('pro_monthly')
                    : t('free_plan')}
              </Text>
              <Text className="text-xs text-text-muted mt-0.5">
                {planType === 'annual'
                  ? (language === 'tr' ? 'Tüm premium özellikler sınırsız aktif' : language === 'de' ? 'Alle Premium-Features unbegrenzt aktiv' : language === 'es' ? 'Todas las funciones premium ilimitadas' : 'All premium features active')
                  : planType === 'monthly'
                    ? (language === 'tr' ? 'Aylık otomatik yenilenir · AI Koç aktif' : language === 'de' ? 'Monatlich erneuert · KI-Coach aktiv' : language === 'es' ? 'Renovación mensual · Coach IA activo' : 'Monthly renewal · AI Coach active')
                    : (language === 'tr' ? 'Temel antrenman takibi · AI Koç kilitli' : language === 'de' ? 'Basis-Training · KI-Coach gesperrt' : language === 'es' ? 'Entrenamiento básico · Coach IA bloqueado' : 'Basic workout tracking · AI Coach locked')}
              </Text>
            </View>
          </View>

          {/* Plan Rozeti */}
          <View
            className={`rounded-full px-2.5 py-1 border ${planType === 'annual'
                ? 'bg-[#F59E0B]/15 border-[#F59E0B]/40'
                : planType === 'monthly'
                  ? 'bg-[#38BDF8]/15 border-[#38BDF8]/40'
                  : 'bg-white/5 border-white/15'
              }`}
          >
            <Text
              className={`text-[10px] font-extrabold tracking-wider ${planType === 'annual'
                  ? 'text-[#F59E0B]'
                  : planType === 'monthly'
                    ? 'text-[#38BDF8]'
                    : 'text-text-muted'
                }`}
            >
              {planType === 'annual'
                ? '👑 PRO YILLIK'
                : planType === 'monthly'
                  ? '👑 PRO AYLIK'
                  : 'STANDART'}
            </Text>
          </View>
        </View>

        {/* Aksiyon Butonları / Yükseltme Seçenekleri */}
        {planType === 'free' && (
          <Pressable
            onPress={() => {
              setSelectedPackageId('powerform_pro_annual');
              openPaywall();
            }}
            className="flex-row items-center justify-center gap-2 rounded-xl bg-accent py-3 active:opacity-85"
          >
            <Ionicons name="sparkles" size={16} color="#0B0F14" />
            <Text className="text-xs font-bold text-[#0B0F14]">
              {t('upgrade_pro')}
            </Text>
          </Pressable>
        )}

        {planType === 'monthly' && (
          <View className="gap-2.5 pt-2 border-t border-white/5">
            <Pressable
              onPress={() => {
                setSelectedPackageId('powerform_pro_annual');
                openPaywall();
              }}
              className="flex-row items-center justify-between rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/40 p-3 active:opacity-85"
            >
              <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                <Ionicons name="arrow-up-circle" size={20} color="#F59E0B" />
                <View>
                  <Text className="text-xs font-bold text-[#F59E0B]">
                    Yıllık Plana Yükselt (%30 Tasarruf)
                  </Text>
                  <Text className="text-[10px] text-text-muted">
                    Yıllık faturaya geçerek ₺899,99/yıl avantajından faydalanın
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL('https://play.google.com/store/account/subscriptions')}
              className="flex-row items-center justify-center gap-1 py-1"
            >
              <Text className="text-[11px] text-text-muted underline">
                Google Play'de Aboneliği Yönet
              </Text>
            </Pressable>
          </View>
        )}

        {planType === 'annual' && (
          <View className="flex-row items-center justify-between pt-1 border-t border-white/5">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="checkmark-circle" size={15} color={colors.accent} />
              <Text className="text-xs font-semibold text-accent">En avantajlı plandasınız</Text>
            </View>
            <Pressable
              onPress={() => Linking.openURL('https://play.google.com/store/account/subscriptions')}
              className="py-1"
            >
              <Text className="text-[11px] text-text-muted underline">
                Aboneliği Yönet (Google Play)
              </Text>
            </Pressable>
          </View>
        )}
      </Card>

      {/* Ömür Boyu Antrenman İstatistikleri (Lifetime Stats) */}
      <View className="gap-xs">
        <Text className="text-xs uppercase font-bold tracking-wider text-text-muted">
          {t('workout_stats')}
        </Text>

        {loading ? (
          <Card className="items-center py-lg">
            <ActivityIndicator color={colors.accent} />
          </Card>
        ) : (
          /* Tek Sıra 3'lü Kompakt İstatistik */
          <View className="flex-row gap-2">
            <Card className="flex-1 items-center py-2.5 px-1 bg-bg-surface border border-white/5">
              <Text className="text-lg font-bold text-accent">
                {stats?.totalSessions ?? 0}
              </Text>
              <Text className="text-[10px] font-semibold text-text-muted mt-0.5 text-center" numberOfLines={1}>
                {t('sessions_count')}
              </Text>
            </Card>

            <Card className="flex-1 items-center py-2.5 px-1 bg-bg-surface border border-white/5">
              <Text className="text-lg font-bold text-accent-alt">
                {formatDurationHuman(stats?.totalDurationSeconds ?? 0, language)}
              </Text>
              <Text className="text-[10px] font-semibold text-text-muted mt-0.5 text-center" numberOfLines={1}>
                {t('total_duration')}
              </Text>
            </Card>

            <Card className="flex-1 items-center py-2.5 px-1 bg-bg-surface border border-white/5">
              <Text className="text-lg font-bold text-warning">
                {stats?.streakDays ?? 0} {t('days')}
              </Text>
              <Text className="text-[10px] font-semibold text-text-muted mt-0.5 text-center" numberOfLines={1}>
                {t('active_streak')}
              </Text>
            </Card>
          </View>
        )}
      </View>

      {/* Kişisel Rekorlar Vitrini (PRs Showcase) */}
      <View className="gap-xs">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs uppercase font-bold tracking-wider text-text-muted">
            {t('personal_records')}
          </Text>
          <Text className="text-[11px] text-text-muted">{t('highest_e1rm')}</Text>
        </View>

        {!stats || stats.topPRs.length === 0 ? (
          <Card className="items-center py-md">
            <Text className="text-xs text-text-muted">
              {t('no_prs_yet')}
            </Text>
          </Card>
        ) : (
          <View className="gap-xs">
            {stats.topPRs.map((pr) => {
              const displayName = getExerciseDisplayName(pr, language);

              return (
                <Pressable
                  key={pr.exerciseId}
                  onPress={() => router.push(`/library/${pr.exerciseId}`)}
                >
                  {({ pressed }) => (
                    <Card
                      className={`flex-row items-center justify-between p-sm ${pressed ? 'opacity-80' : ''
                        }`}
                    >
                      <View className="flex-1 mr-sm">
                        <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                          {displayName}
                        </Text>
                        <Text className="text-[11px] text-text-muted mt-0.5">
                          {pr.maxWeightKg} kg × {pr.reps} rep · {formatDate(pr.achievedAt, language)}
                        </Text>
                      </View>

                      <View className="items-end">
                        <View className="rounded bg-accent/20 px-2 py-0.5 border border-accent/40">
                          <Text className="text-xs font-bold text-accent">
                            {pr.bestE1RM} kg
                          </Text>
                        </View>
                        <Text className="text-[9px] text-text-muted mt-0.5">e1RM</Text>
                      </View>
                    </Card>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Hızlı Erişim ve Takip Menüsü */}
      <View className="gap-xs">
        <Text className="text-xs uppercase font-bold tracking-wider text-text-muted">
          {t('tools_and_progress')}
        </Text>

        <Card className="p-0 overflow-hidden divide-y divide-bg-elevated">
          <Pressable
            onPress={() => router.push('/weight-trend')}
            className="flex-row items-center justify-between p-md active:bg-bg-elevated/40"
          >
            <View>
              <Text className="text-sm font-semibold text-text-primary">
                {t('weight_tracking_title')}
              </Text>
              <Text className="text-xs text-text-muted">
                {t('weight_tracking_desc')}
              </Text>
            </View>
            <Text className="text-base text-accent font-bold">→</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/body-measurements')}
            className="flex-row items-center justify-between p-md active:bg-bg-elevated/40"
          >
            <View>
              <Text className="text-sm font-semibold text-text-primary">
                {t('body_measurements_title')}
              </Text>
              <Text className="text-xs text-text-muted">
                {t('body_measurements_desc')}
              </Text>
            </View>
            <Text className="text-base text-accent font-bold">→</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/workout/history')}
            className="flex-row items-center justify-between p-md active:bg-bg-elevated/40"
          >
            <View>
              <Text className="text-sm font-semibold text-text-primary">
                {t('workout_history_title')}
              </Text>
              <Text className="text-xs text-text-muted">
                {t('workout_history_desc')}
              </Text>
            </View>
            <Text className="text-base text-accent font-bold">→</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/workout/templates')}
            className="flex-row items-center justify-between p-md active:bg-bg-elevated/40"
          >
            <View>
              <Text className="text-sm font-semibold text-text-primary">
                {t('program_templates_title')}
              </Text>
              <Text className="text-xs text-text-muted">
                {t('program_templates_desc')}
              </Text>
            </View>
            <Text className="text-base text-accent font-bold">→</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/edit-profile')}
            className="flex-row items-center justify-between p-md active:bg-bg-elevated/40"
          >
            <View>
              <Text className="text-sm font-semibold text-text-primary">
                {t('edit_profile_title')}
              </Text>
              <Text className="text-xs text-text-muted">
                {t('edit_profile_desc')}
              </Text>
            </View>
            <Text className="text-base text-accent font-bold">→</Text>
          </Pressable>

          <Pressable
            onPress={() => setLanguageModalVisible(true)}
            className="flex-row items-center justify-between p-md active:bg-bg-elevated/40"
          >
            <View>
              <Text className="text-sm font-semibold text-text-primary">
                {t('language_selection')}
              </Text>
              <Text className="text-xs text-text-muted">
                {currentLangObj.flag} {currentLangObj.nativeName} ({currentLangObj.name})
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs font-semibold text-accent">
                {currentLangObj.nativeName}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </Pressable>

          <Pressable
            onPress={handleCloudSync}
            disabled={syncing}
            className="flex-row items-center justify-between p-md active:bg-bg-elevated/40"
          >
            <View className="flex-1 mr-sm">
              <Text className="text-sm font-semibold text-text-primary">
                {syncing
                  ? (language === 'tr' ? 'Buluttan Eşitleniyor...' : 'Syncing from Cloud...')
                  : (language === 'tr' ? 'Bulut Verilerini Eşitle' : 'Sync Cloud Data')}
              </Text>
              <Text className="text-xs text-text-muted">
                {language === 'tr'
                  ? 'Antrenman geçmişi, kilo ve beslenme kayıtlarını buluttan geri yükler'
                  : 'Restore workout history, weight, and nutrition logs from the cloud'}
              </Text>
            </View>
            {syncing ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="cloud-download-outline" size={18} color={colors.accent} />
            )}
          </Pressable>
        </Card>
      </View>

      {/* Gizlilik & KVKK */}
      <View className="gap-xs">
        <Text className="text-xs uppercase font-bold tracking-wider text-text-muted">
          {t('privacy_and_legal')}
        </Text>

        <Card className="p-0 overflow-hidden divide-y divide-bg-elevated">
          <Pressable
            onPress={() => router.push('/legal')}
            className="flex-row items-center justify-between p-md active:bg-bg-elevated/40"
          >
            <View>
              <Text className="text-sm font-semibold text-text-primary">
                {t('privacy_policy_title')}
              </Text>
              <Text className="text-xs text-text-muted">
                {t('privacy_policy_desc')}
              </Text>
            </View>
            <Text className="text-base text-accent font-bold">→</Text>
          </Pressable>

          <Pressable
            onPress={handleExportData}
            disabled={exporting}
            className="flex-row items-center justify-between p-md active:bg-bg-elevated/40"
          >
            <View className="flex-1 mr-sm">
              <Text className="text-sm font-semibold text-text-primary">
                {exporting ? t('exporting_data') : t('export_data_title')}
              </Text>
              <Text className="text-xs text-text-muted">
                {t('export_data_desc')}
              </Text>
            </View>
            {exporting ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text className="text-base text-accent font-bold">→</Text>
            )}
          </Pressable>
        </Card>
      </View>

      {/* Hesap & Çıkış Yap */}
      <Card className="gap-sm">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs uppercase font-bold text-text-muted">{t('account')}</Text>
          <Text className="text-xs text-text-muted">Powerform v1.0.7</Text>
        </View>

        <Text className="text-sm text-text-primary">{email}</Text>

        <Button
          label={t('sign_out')}
          variant="secondary"
          className="mt-xs"
          onPress={handleSignOut}
        />

        <Pressable
          onPress={handleDeleteAccount}
          disabled={deleting}
          className="items-center py-2.5 active:opacity-70 mt-1"
        >
          <Text className="text-xs font-semibold text-danger">
            {deleting ? t('deleting_account') : t('delete_account_btn')}
          </Text>
        </Pressable>
      </Card>

      {/* Modern Çıkış Yap Modalı */}
      <StatusModal
        visible={logoutModalVisible}
        type="logout"
        badgeText={language === 'tr' ? '🚪 OTURUMU KAPAT' : language === 'de' ? '🚪 ABMELDEN' : language === 'es' ? '🚪 CERRAR SESIÓN' : '🚪 SIGN OUT'}
        title={t('sign_out_confirm_title')}
        message={t('sign_out_confirm_desc')}
        primaryButtonText={t('sign_out')}
        onPrimaryPress={async () => {
          setLogoutModalVisible(false);
          await useSubscriptionStore.getState().logOut();
          await signOut();
        }}
        secondaryButtonText={t('cancel')}
        onSecondaryPress={() => setLogoutModalVisible(false)}
        onClose={() => setLogoutModalVisible(false)}
      />

      {/* Modern Hesap Silme Modalı */}
      <StatusModal
        visible={deleteAccountModalVisible}
        type="error"
        badgeText={t('delete_account_badge')}
        title={t('delete_account_title')}
        message={t('delete_account_desc')}
        primaryButtonText={deleting ? t('deleting_account') : t('confirm_delete_account')}
        onPrimaryPress={async () => {
          setDeleting(true);
          try {
            await deleteUserAccountAndData();
            setDeleteAccountModalVisible(false);
          } finally {
            setDeleting(false);
          }
        }}
        secondaryButtonText={t('cancel')}
        onSecondaryPress={() => setDeleteAccountModalVisible(false)}
        onClose={() => setDeleteAccountModalVisible(false)}
      />

      {/* Dil Seçim Modalı */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: '100%', maxWidth: 360, borderRadius: 24, backgroundColor: '#121820', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' }}>
                  <Ionicons name="language" size={18} color={colors.accent} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                  {t('change_language_title')}
                </Text>
              </View>
              <Pressable
                onPress={() => setLanguageModalVisible(false)}
                hitSlop={8}
                style={{ height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={{ gap: 10, paddingVertical: 16 }}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <Pressable
                    key={lang.code}
                    onPress={() => {
                      setLanguageModalVisible(false);
                      setTimeout(() => {
                        setLanguage(lang.code);
                      }, 50);
                    }}
                    style={[
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 14,
                        borderRadius: 16,
                        borderWidth: 1,
                      },
                      isSelected
                        ? {
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          borderColor: colors.accent,
                        }
                        : {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderColor: 'rgba(255, 255, 255, 0.08)',
                        },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 24 }}>{lang.flag}</Text>
                      <View>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: isSelected ? colors.accent : colors.textPrimary,
                          }}
                        >
                          {lang.nativeName}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          {lang.name}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setLanguageModalVisible(false)}
              style={{
                width: '100%',
                alignItems: 'center',
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>
                {t('close')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
