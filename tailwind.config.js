/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0B0F14',
          surface: '#151B23',
          elevated: '#1E2630',
        },
        text: {
          primary: '#F2F5F8',
          muted: '#8A97A6',
        },
        accent: {
          DEFAULT: '#4ADE80',
          alt: '#38BDF8',
        },
        accentAlt: '#38BDF8',
        warning: '#FBBF24',
        danger: '#F87171',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      borderRadius: {
        card: '12px',
        input: '8px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
