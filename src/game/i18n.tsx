import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { en } from './translations/en';

export type Locale = 'en';
type TranslationMap = Record<string, string>;
const translations: Record<Locale, TranslationMap> = { en };

function interpolate(template: string, ...args: (string | number)[]): string {
  return template.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''));
}

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, ...args: (string | number)[]) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  const t = useCallback((key: string, ...args: (string | number)[]): string => {
    const val = translations[locale]?.[key] ?? translations.en[key] ?? key;
    return args.length > 0 ? interpolate(val, ...args) : val;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be inside I18nProvider');
  return ctx;
}

export const AVAILABLE_LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
];
