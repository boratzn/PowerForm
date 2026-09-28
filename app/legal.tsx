import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../src/components/ui';

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'disclaimer' | 'kvkk'>('disclaimer');

  return (
    <View
      className="flex-1 bg-bg-primary"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-bg-elevated px-md py-sm">
        <Text className="text-lg font-bold text-text-primary">Yasal ve Gizlilik</Text>
        <Pressable
          hitSlop={12}
          onPress={() => router.back()}
          className="rounded-full bg-bg-surface px-3 py-1.5 active:opacity-70"
        >
          <Text className="text-xs font-semibold text-text-muted">Kapat</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-bg-elevated bg-bg-surface/50 p-xs gap-xs">
        <Pressable
          onPress={() => setActiveTab('disclaimer')}
          className={`flex-1 items-center justify-center rounded-md py-2 ${
            activeTab === 'disclaimer' ? 'bg-bg-elevated' : ''
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              activeTab === 'disclaimer' ? 'text-accent' : 'text-text-muted'
            }`}
          >
            Sağlık Sorumluluk Reddi
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('kvkk')}
          className={`flex-1 items-center justify-center rounded-md py-2 ${
            activeTab === 'kvkk' ? 'bg-bg-elevated' : ''
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              activeTab === 'kvkk' ? 'text-accent' : 'text-text-muted'
            }`}
          >
            KVKK & Gizlilik
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-md py-md"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {activeTab === 'disclaimer' ? (
          <View className="gap-md">
            <Card className="border-warning/30 bg-warning/5 p-md gap-xs">
              <Text className="text-xs font-bold uppercase tracking-wider text-warning">
                Önemli Tıbbi Uyarı
              </Text>
              <Text className="text-sm leading-relaxed text-text-primary">
                Bu uygulama yalnızca genel bilgilendirme, antrenman loglama ve kişisel takip
                amaçlıdır; kesinlikle tıbbi tavsiye, teşhis veya tedavi yerine geçmez.
              </Text>
            </Card>

            <View className="gap-xs">
              <Text className="text-sm font-bold text-text-primary">
                1. Egzersiz ve Fiziksel Aktivite
              </Text>
              <Text className="text-xs leading-relaxed text-text-muted">
                Yeni bir egzersiz programına başlamadan veya ağırlık artışına gitmeden önce mutlaka
                alanında uzman bir hekime danışınız. Egzersiz sırasında şiddetli ağrı, baş dönmesi,
                göz kararması, nefes darlığı veya göğüs rahatsızlığı hissederseniz egzersizi derhal
                durdurun ve en yakın acil tıbbi servise başvurun.
              </Text>
            </View>

            <View className="gap-xs">
              <Text className="text-sm font-bold text-text-primary">
                2. Beslenme ve Kalori Takibi Politikası
              </Text>
              <Text className="text-xs leading-relaxed text-text-muted">
                Powerform, sağlıklı ve sürdürülebilir beslenme ilkelerine bağlıdır. Bilimsel
                kriterler ve kullanıcı sağlığını koruma protokolümüz gereğince:
              </Text>
              <View className="ml-sm gap-xs mt-1">
                <Text className="text-xs text-text-muted">
                  • Kadın kullanıcılar için 1.200 kcal, erkek kullanıcılar için 1.500 kcal altındaki
                  aşırı kısıtlayıcı kalori hedeflerine izin verilmez.
                </Text>
                <Text className="text-xs text-text-muted">
                  • 18 yaş altındaki kullanıcılar için kalori açığı veya kilo kaybı hedefi
                  önerilmez ve otomatik olarak uygulanmaz.
                </Text>
                <Text className="text-xs text-text-muted">
                  • Haftalık vücut ağırlığının %1.5'inden daha hızlı kilo kaybı metabolik ve hormonal
                  riskler taşıdığından sistem uyarı üretir.
                </Text>
              </View>
            </View>

            <View className="gap-xs">
              <Text className="text-sm font-bold text-text-primary">
                3. Yeme Bozukluğu Koruması ve Destek
              </Text>
              <Text className="text-xs leading-relaxed text-text-muted">
                Beslenme veya beden algısıyla ilgili takıntılı düşünceler, aşırı kısıtlama veya
                kendini kusturma gibi yeme bozukluğu belirtileri yaşıyorsanız lütfen profesyonel
                destek almaktan çekinmeyiniz. Türkiye Cumhuriyeti Sağlık Bakanlığı MHRS (182)
                üzerinden veya bir psikiyatri uzmanından destek alabilirsiniz.
              </Text>
            </View>
          </View>
        ) : (
          <View className="gap-md">
            <Card className="border-accent/30 bg-accent/5 p-md gap-xs">
              <Text className="text-xs font-bold uppercase tracking-wider text-accent">
                6698 Sayılı KVKK Aydınlatma Metni
              </Text>
              <Text className="text-xs leading-relaxed text-text-primary">
                Powerform olarak kişisel verilerinizin ve özel nitelikli sağlık verilerinizin
                güvenliğine azami önem veriyoruz.
              </Text>
            </Card>

            <View className="gap-xs">
              <Text className="text-sm font-bold text-text-primary">
                1. Veri Sorumlusu ve Saklama Bölgesi
              </Text>
              <Text className="text-xs leading-relaxed text-text-muted">
                Verileriniz, yerel olarak cihazınızdaki güvenli SQLite veritabanında saklanır. Bulut
                eşitleme aktif olduğunda verileriniz Avrupa Birliği (Frankfurt, Almanya) bölgesinde
                bulunan şifreli Supabase altyapısında güvenle muhafaza edilir.
              </Text>
            </View>

            <View className="gap-xs">
              <Text className="text-sm font-bold text-text-primary">
                2. İşlenen Veri Kategorileri
              </Text>
              <View className="ml-sm gap-xs mt-1">
                <Text className="text-xs text-text-muted">
                  • <Text className="font-semibold text-text-primary">Kişisel Veriler:</Text> E-posta
                  adresi, profil adı, antrenman seans kayıtları, set ve tekrar geçmişi.
                </Text>
                <Text className="text-xs text-text-muted">
                  • <Text className="font-semibold text-text-primary">Özel Nitelikli Sağlık Verileri:</Text>{' '}
                  Vücut ağırlığı, boy, yaş, tahmini yağ oranı, tüketilen gıda ve besin değerleri.
                </Text>
              </View>
            </View>

            <View className="gap-xs">
              <Text className="text-sm font-bold text-text-primary">
                3. Veri Sahibi Hakları (KVKK md. 11)
              </Text>
              <Text className="text-xs leading-relaxed text-text-muted">
                Kullanıcılarımız her zaman:
              </Text>
              <View className="ml-sm gap-xs mt-1">
                <Text className="text-xs text-text-muted">
                  • Verilerinin işlenip işlenmediğini öğrenme,
                </Text>
                <Text className="text-xs text-text-muted">
                  • <Text className="font-semibold text-text-primary">Veri Taşınabilirliği:</Text>{' '}
                  Profil ekranından tek tıkla tüm antrenman, kilo ve beslenme geçmişini açık standartta
                  JSON formatında dışa aktarma (export etme),
                </Text>
                <Text className="text-xs text-text-muted">
                  • <Text className="font-semibold text-text-primary">Unutulma Hakkı (Silme):</Text>{' '}
                  Profil ekranından hesabını ve veritabanındaki tüm ilişkili kayıtları kalıcı olarak
                  silme hakkına sahiptir.
                </Text>
              </View>
            </View>

            <View className="gap-xs">
              <Text className="text-sm font-bold text-text-primary">
                4. Üçüncü Taraflarla Paylaşım
              </Text>
              <Text className="text-xs leading-relaxed text-text-muted">
                Verileriniz hiçbir koşulda ticari reklam ağlarıyla veya veri komisyoncularıyla
                paylaşılmaz ve satılmaz.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
