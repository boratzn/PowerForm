import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../src/components/ui';

// §11 Onboarding: 3 slaytlık değer önerisi carousel'i + atla + yasal aydınlatma
const SLIDES = [
  {
    badge: '🏋️',
    tag: 'ANTRENMAN & PROGRAM',
    title: 'Bilimsel Antrenman Loglama',
    description:
      '1.300+ GIF animasyonlu egzersiz kütüphanesi, 6 hazır bilimsel program şablonu ve özel program editörüyle antrenmanlarını zahmetsizce yönet.',
    points: [
      '1.300+ detaylı egzersiz ve kas grubu analizi',
      'PPL, Upper/Lower, 5 Günlük Hipertrofi şablonları',
      'Özel set, tekrar, RIR ve mola hedefleri',
    ],
  },
  {
    badge: '⚡',
    tag: 'PERFORMANS & TAKİP',
    title: 'Canlı Dinlenme & Rekor Takibi',
    description:
      'Akıllı dinlenme sayacı, arka plan titreşimli bildirimleri, otomatik hacim tonajı ve anlık kişisel rekor (PR) tespiti.',
    points: [
      'Otomatik geri sayım ve sesli/titreşimli uyarılar',
      'Epley & RIR düzeltmeli anlık e1RM tahmini',
      'Ömür boyu istatistikler ve PR vitrini',
    ],
  },
  {
    badge: '🥗',
    tag: 'BESLENME & TDEE',
    title: 'Akıllı Beslenme & Tartı Trendi',
    description:
      'Mifflin-St Jeor TDEE motoru ile kişiselleştirilmiş kalori ve makro hedefleri, 4 öğün besin takibi ve 7 günlük kilo trend grafiği.',
    points: [
      'Hedefine göre otomatik kalori ve makro dağılımı',
      'Özel besin ekleme ve hazır porsiyon desteği',
      '7 günlük hareketli ortalama (7d MA) kilo analizi',
    ],
  },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
      setActiveIndex(index);
    }
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeIndex + 1) * width, animated: true });
    } else {
      router.push('/profile-setup');
    }
  };

  return (
    <View
      className="flex-1 justify-between bg-bg-primary"
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
    >
      {/* Üst Çubuk (Logo & Atla) */}
      <View className="flex-row items-center justify-between px-lg">
        <View className="flex-row items-center gap-xs">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-accent/20 border border-accent/40">
            <Text className="text-base font-black text-accent">P</Text>
          </View>
          <Text className="text-xl font-bold tracking-tight text-text-primary">Powerform</Text>
        </View>

        <Pressable
          hitSlop={12}
          onPress={() => router.push('/profile-setup')}
          className="rounded-full bg-bg-surface px-3 py-1.5 active:opacity-70"
        >
          <Text className="text-xs font-semibold text-text-muted">Atla</Text>
        </Pressable>
      </View>

      {/* Slaytlar Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        className="flex-1"
      >
        {SLIDES.map((slide, idx) => (
          <View
            key={idx}
            style={{ width }}
            className="flex-1 justify-center px-lg"
          >
            <View className="h-16 w-16 items-center justify-center rounded-3xl bg-bg-surface border border-bg-elevated mb-md">
              <Text className="text-3xl">{slide.badge}</Text>
            </View>

            <Text className="text-xs font-bold tracking-widest text-accent uppercase mb-1">
              {slide.tag}
            </Text>

            <Text className="text-3xl font-extrabold text-text-primary mb-sm leading-tight">
              {slide.title}
            </Text>

            <Text className="text-sm leading-relaxed text-text-muted mb-lg">
              {slide.description}
            </Text>

            <View className="gap-sm rounded-card bg-bg-surface/60 border border-bg-elevated/40 p-md">
              {slide.points.map((pt, pIdx) => (
                <View key={pIdx} className="flex-row items-center gap-sm">
                  <View className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <Text className="text-xs font-medium text-text-primary flex-1">{pt}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Alt Çubuk (İndikatörler, İleri / Başla & Yasal Bağlantı) */}
      <View className="px-lg gap-md">
        {/* Pagination Dots */}
        <View className="flex-row justify-center gap-xs">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === activeIndex ? 'w-6 bg-accent' : 'w-2 bg-bg-elevated'
              }`}
            />
          ))}
        </View>

        <Button
          label={activeIndex === SLIDES.length - 1 ? 'Kişisel Profilini Oluştur →' : 'İleri'}
          onPress={handleNext}
        />

        <Pressable
          onPress={() => router.push('/legal')}
          className="items-center active:opacity-70 px-sm"
        >
          <Text className="text-center text-[11px] text-text-muted leading-relaxed">
            Devam ederek{' '}
            <Text className="text-accent underline font-medium">Sağlık Sorumluluk Reddi</Text> ve{' '}
            <Text className="text-accent underline font-medium">KVKK Aydınlatma Metni</Text>'ni
            okuduğunuzu onaylarsınız.
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
