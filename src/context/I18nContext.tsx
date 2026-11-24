import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS } from '../lib/i18n';
import type { SupportedLanguage, TextSizePreference } from '../types/civic';

interface I18nContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  textSize: TextSizePreference;
  setTextSize: (size: TextSizePreference) => void;
  t: (typeof TRANSLATIONS)['en'];
}

const I18nContext = createContext<I18nContextValue | null>(null);

const LANG_KEY = 'janta_check_lang';
const SIZE_KEY = 'janta_check_text_size';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === 'hi' || saved === 'kn' || saved === 'en') return saved;
    } catch {
      // Ignore storage access errors
    }
    return 'en';
  });

  const [textSize, setTextSizeState] = useState<TextSizePreference>(() => {
    try {
      const saved = localStorage.getItem(SIZE_KEY);
      if (saved === 'large' || saved === 'xlarge' || saved === 'normal') return saved;
    } catch {
      // Ignore storage access errors
    }
    return 'normal';
  });

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // Ignore
    }
  }, []);

  const setTextSize = useCallback((size: TextSizePreference) => {
    setTextSizeState(size);
    try {
      localStorage.setItem(SIZE_KEY, size);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.style.fontSize = textSize === 'xlarge' ? '19px' : textSize === 'large' ? '17.5px' : '16px';
  }, [language, textSize]);

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        textSize,
        setTextSize,
        t: TRANSLATIONS[language] || TRANSLATIONS.en,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
