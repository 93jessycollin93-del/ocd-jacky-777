import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { en } from './translations/en';

type TranslationMap = Record<string, string>;
const translations: TranslationMap = en;

function interpolate(template: string, ...args: (string | number)[]): string {
  return template.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''));
}

interface I18nContextType {
  locale: 'en';
  setLocale: (l: 'en') => void;
  t: (key: string, ...args: (string | number)[]) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const setLocale = useCallback(() => {
    // no-op: browser translator preferred
  }, []);

  const t = useCallback((key: string, ...args: (string | number)[]): string => {
    const val = translations[key] ?? key;
    return args.length > 0 ? interpolate(val, ...args) : val;
  }, []);

  return (
    <I18nContext.Provider value={{ locale: 'en', setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be inside I18nProvider');
  return ctx;
}
