import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../constants/theme';
import { useSubscriptionStore } from '../../stores/useSubscriptionStore';
import { Button, Card, StatusModal } from '../ui';

const FEATURES = [
  {
    icon: 'sparkles',
    color: '#F59E0B',
    title: 'Akıllı AI Koç & Analiz',
    desc: 'Antrenman, kilo ve beslenme geçmişini tek bir beyinde birleştirir.',
  },
  {
    icon: 'trending-up',
    color: '#4ADE80',
    title: 'Haftalık Gelişim & Plato Analizi',
    desc: 'Ağırlık artıramadığın, takıldığın veya gerileyen hareketleri anında yakalar.',
  },
  {
    icon: 'barbell',
    color: '#38BDF8',
    title: 'Kişisel Egzersiz Reçetesi',
    desc: 'Takıldığın hareketler için açı, varyasyon, tekrar veya deload önerileri sunar.',
  },
  {
    icon: 'chatbubbles',
    color: '#A855F7',
    title: 'Sınırsız Etkileşim & Check-in',
    desc: 'Haftalık toparlanma, eklem ağrısı ve form sorularına kişiye özel rehberlik.',
  },
];

export function PaywallModal() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const isPro = useSubscriptionStore((s) => s.isPro);
  const paywallVisible = useSubscriptionStore((s) => s.paywallVisible);
  const closePaywall = useSubscriptionStore((s) => s.closePaywall);
  const packages = useSubscriptionStore((s) => s.packages);
  const selectedPackageId = useSubscriptionStore((s) => s.selectedPackageId);
  const setSelectedPackageId = useSubscriptionStore((s) => s.setSelectedPackageId);
  const purchase = useSubscriptionStore((s) => s.purchase);
  const restore = useSubscriptionStore((s) => s.restore);
  const isLoading = useSubscriptionStore((s) => s.isLoading);
  const isMockMode = useSubscriptionStore((s) => s.isMockMode);
  const toggleMockPro = useSubscriptionStore((s) => s.toggleMockPro);

  const [actionLoading, setActionLoading] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    type: 'pro_celebration' | 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    badgeText?: string;
    features?: string[];
    primaryButtonText?: string;
    onPrimaryPress: () => void;
  } | null>(null);

  if (!paywallVisible && !statusModal) return null;

  const handlePurchase = async () => {
    setActionLoading(true);
    try {
      const success = await purchase(selectedPackageId);
      if (success) {
        setStatusModal({
          visible: true,
          type: 'pro_celebration',
          badgeText: '👑 POWERFORM PRO AKTİF',
          title: 'Tebrikler! 🎉',
          message:
            'Powerform PRO üyeliğiniz başarıyla aktif edildi. Kişisel yapay zeka koçunuz antrenman ve beslenmenizi en üst seviyeye taşımak için hazır!',
          features: [
            'Sınırsız AI Koç Danışmanlığı & Soru-Cevap',
            'Haftalık Plato & Overload Analizi',
            'Kişiye Özel Alternatif Egzersiz Önerileri',
            'Gelişmiş Form ve Toparlanma Rehberliği',
          ],
          primaryButtonText: 'Harika, Başlayalım! 🚀',
          onPrimaryPress: () => {
            setStatusModal(null);
            closePaywall();
          },
        });
      }
    } catch (err: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'İşlem Başarısız',
        message: err?.message || 'Abonelik işlemi tamamlanamadı. Lütfen tekrar deneyin.',
        primaryButtonText: 'Tamam',
        onPrimaryPress: () => setStatusModal(null),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    setActionLoading(true);
    try {
      const isRestored = await restore();
      if (isRestored) {
        setStatusModal({
          visible: true,
          type: 'pro_celebration',
          badgeText: '✓ ÜYELİK GERİ YÜKLENDİ',
          title: 'Tekrar Hoş Geldin! 🎉',
          message: 'Önceki Powerform PRO üyeliğiniz başarıyla tespit edildi ve hesabınıza tanımlandı.',
          primaryButtonText: 'Kullanmaya Başla 🚀',
          onPrimaryPress: () => {
            setStatusModal(null);
            closePaywall();
          },
        });
      } else {
        setStatusModal({
          visible: true,
          type: 'info',
          title: 'Abonelik Bulunamadı',
          message: 'Bu hesaba bağlı aktif bir Powerform PRO aboneliği bulunamadı.',
          primaryButtonText: 'Anladım',
          onPrimaryPress: () => setStatusModal(null),
        });
      }
    } catch (err: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Geri Yükleme Hatası',
        message: err?.message || 'Geri yükleme sırasında hata oluştu.',
        primaryButtonText: 'Tamam',
        onPrimaryPress: () => setStatusModal(null),
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal visible={paywallVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closePaywall}>
      <View
        className="flex-1 bg-bg-primary px-lg"
        style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom + 16 }}
      >
        {/* Üst Bar: Kapat Butonu */}
        <View className="flex-row items-center justify-between pb-sm">
          <View className="flex-row items-center gap-xs rounded-full bg-[#F59E0B]/10 px-3 py-1 border border-[#F59E0B]/30">
            <Ionicons name="diamond" size={14} color="#F59E0B" />
            <Text className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">POWERFORM PRO</Text>
          </View>
          <Pressable
            onPress={closePaywall}
            className="h-9 w-9 items-center justify-center rounded-full bg-bg-surface active:opacity-70"
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 20 }}>
          {/* Başlık & Spot */}
          <View className="gap-xs pt-xs">
            <Text className="text-2xl font-bold tracking-tight text-text-primary">
              Yapay Zeka Koçunuzla Sınırlarınızı Aşın
            </Text>
            <Text className="text-sm text-text-muted">
              Antrenman kayıtlarınızı, kilo trendinizi ve makrolarınızı analiz eden kişisel koçunuz her an yanınızda.
            </Text>
          </View>

          {/* Özellikler Kartı */}
          <Card className="gap-md bg-bg-surface/80 border border-bg-elevated">
            {FEATURES.map((feat, idx) => (
              <View key={idx} className="flex-row items-start gap-md">
                <View
                  className="h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${feat.color}15` }}
                >
                  <Ionicons name={feat.icon as any} size={18} color={feat.color} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-sm font-bold text-text-primary">{feat.title}</Text>
                  <Text className="text-xs text-text-muted leading-relaxed">{feat.desc}</Text>
                </View>
              </View>
            ))}
          </Card>

          {/* Paket Seçenekleri */}
          <View className="gap-sm">
            <Text className="text-xs font-bold uppercase tracking-wider text-text-muted">Planınızı Seçin</Text>
            <View className="gap-sm">
              {packages.map((pkg) => {
                const isSelected = selectedPackageId === pkg.id;
                return (
                  <Pressable
                    key={pkg.id}
                    onPress={() => setSelectedPackageId(pkg.id)}
                    className={`relative rounded-card p-md border-2 transition-all ${
                      isSelected
                        ? 'border-accent bg-accent/10'
                        : 'border-bg-elevated bg-bg-surface active:border-text-muted/30'
                    }`}
                  >
                    {pkg.badge && (
                      <View className="absolute -top-3 right-4 rounded-full bg-accent px-2.5 py-0.5 shadow-sm">
                        <Text className="text-[10px] font-black uppercase text-bg-primary">{pkg.badge}</Text>
                      </View>
                    )}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 gap-1">
                        <Text className="text-base font-bold text-text-primary">{pkg.title}</Text>
                        <Text className="text-xs text-text-muted">{pkg.description}</Text>
                      </View>
                      <View className="items-end gap-1">
                        <Text className="text-base font-black text-accent">{pkg.priceString}</Text>
                        <View
                          className={`h-5 w-5 items-center justify-center rounded-full border ${
                            isSelected ? 'border-accent bg-accent' : 'border-text-muted/40'
                          }`}
                        >
                          {isSelected && <Ionicons name="checkmark" size={14} color="#0B0F14" />}
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Satın Alma Butonu */}
          <View className="gap-sm pt-xs">
            <Button
              label={
                actionLoading || isLoading ? 'İşlem Sürüyor...' : 'Hemen Abone Ol ve Başla ➔'
              }
              variant="primary"
              disabled={actionLoading || isLoading}
              onPress={handlePurchase}
              className="min-h-[52px]"
            />
            <Text className="text-center text-[11px] text-text-muted">
              Seçtiğiniz plan doğrultusunda ödeme anında tahsil edilir. Aboneliğinizi dilediğiniz zaman Google Play üzerinden kolayca iptal edebilirsiniz.
            </Text>
          </View>

          {/* Geliştirici / Test Modu Çubuğu */}
          {isMockMode && (
            <Card className="border border-warning/40 bg-warning/10 p-md gap-xs">
              <View className="flex-row items-center gap-xs">
                <Ionicons name="construct-outline" size={16} color={colors.warning} />
                <Text className="text-xs font-bold text-warning">Geliştirici / Test Simülasyonu</Text>
              </View>
              <Text className="text-[11px] text-text-muted">
                RevenueCat API anahtarları henüz girilmediği için test modundasınız. Pro durumunu simüle etmek için aşağıdaki butona basabilirsiniz:
              </Text>
              <Pressable
                onPress={toggleMockPro}
                className="mt-xs items-center justify-center rounded-lg bg-warning/20 py-2 border border-warning/40 active:opacity-70"
              >
                <Text className="text-xs font-bold text-warning">
                  {isPro ? '🔴 Pro Durumunu Kaldır (Test)' : '🟢 Pro Durumunu Aktif Et (Test)'}
                </Text>
              </Pressable>
            </Card>
          )}

          {/* Alt Bağlantılar */}
          <View className="flex-row items-center justify-center gap-md py-sm">
            <Pressable onPress={handleRestore} disabled={actionLoading}>
              <Text className="text-xs font-medium text-text-muted underline">Geri Yükle</Text>
            </Pressable>
            <Text className="text-xs text-text-muted">·</Text>
            <Pressable
              onPress={() => {
                closePaywall();
                router.push('/legal');
              }}
            >
              <Text className="text-xs font-medium text-text-muted underline">Kullanım & Gizlilik</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Modern Kutlama / Durum Modalı */}
        {statusModal && (
          <StatusModal
            visible={statusModal.visible}
            type={statusModal.type}
            badgeText={statusModal.badgeText}
            title={statusModal.title}
            message={statusModal.message}
            features={statusModal.features}
            primaryButtonText={statusModal.primaryButtonText}
            onPrimaryPress={statusModal.onPrimaryPress}
            onClose={() => setStatusModal(null)}
          />
        )}
      </View>
    </Modal>
  );
}
