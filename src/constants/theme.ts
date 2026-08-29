// Tasarım tokenları — FITNESS_APP_SPEC.md §10.3 ile birebir eşleşir.
// Tailwind sınıfı olarak kullanmak için tailwind.config.js `colors.*` altına da eklendi.

export const colors = {
  bgPrimary: '#0B0F14',
  bgSurface: '#151B23',
  bgElevated: '#1E2630',
  textPrimary: '#F2F5F8',
  textMuted: '#8A97A6',
  accent: '#4ADE80', // tamamlanan set, PR
  accentAlt: '#38BDF8', // aktif/seçili
  warning: '#FBBF24', // deload uyarısı
  danger: '#F87171',
} as const;

// 4 tabanlı boşluk ölçeği
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radius = {
  card: 12,
  input: 8,
  pill: 999,
} as const;

// Sayılar için tabular/monospace varyant — tablo hizasını bozmasın diye
export const fontFamily = {
  sans: 'System',
  tabular: 'Menlo', // RN'de gerçek tabular-nums desteği yok; iOS/Android'de JetBrains Mono/SF Mono eklenene kadar geçici
} as const;

export const minTouchTarget = 48; // dp — terli parmak, küçük buton = hata (§10.2 kural 2)
