import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  getDeviceLanguage,
  translations,
  type Language,
  type TranslationKey,
} from '../lib/i18n';

const LANGUAGE_STORAGE_KEY = 'powerform_selected_language';

type LanguageState = {
  language: Language;
  isInitialized: boolean;
  initializeLanguage: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: TranslationKey) => string;
};

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'tr',
  isInitialized: false,

  initializeLanguage: async () => {
    try {
      const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLang && (savedLang === 'tr' || savedLang === 'en' || savedLang === 'de' || savedLang === 'es')) {
        set({ language: savedLang as Language, isInitialized: true });
        return;
      }
      const deviceLang = getDeviceLanguage();
      set({ language: deviceLang, isInitialized: true });
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, deviceLang);
    } catch {
      set({ language: 'tr', isInitialized: true });
    }
  },

  setLanguage: async (lang: Language) => {
    set({ language: lang });
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (err) {
      console.warn('[useLanguageStore] Dil kaydedilemedi:', err);
    }
  },

  t: (key: TranslationKey) => {
    const lang = get().language;
    const dict = translations[lang] || translations.tr;
    return dict[key] || translations.tr[key] || key;
  },
}));
