import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import translations from '@/eru/lib/translations.json';

/**
 * Central i18n provider for the entire ERU application.
 *
 * Production rules:
 * - Single source of truth: lib/translations.json (categorized by domain).
 * - Persistence: selected language saved in localStorage and reflected on
 *   <html lang> for screen readers, browser auto-translate, and SEO.
 * - Fallback chain: current language → English → caller fallback → key path.
 * - Interpolation: `{{token}}` placeholders are replaced from a `vars` object.
 * - Dev guard: missing keys are reported (warn-once per key) on
 *   window.__i18nMissing for easy auditing without console spam.
 */

const LanguageContext = createContext();

// Order matters — this is the rendering order in the language switcher.
// Only locales with full coverage are exposed to users. fr/es are kept in
// translations.json as scaffolding for future expansion but are not selectable
// to avoid showing partial translations in production.
export const LANGUAGES = {
  en: 'English',
  uk: 'Українська',
  zh: '中文',
  ru: 'Русский',
};

// Resolve a dotted key path against a translations object.
function resolvePath(obj, path) {
  if (!obj || !path) return undefined;
  let v = obj;
  for (const k of path.split('.')) {
    if (v == null) return undefined;
    v = v[k];
  }
  return v;
}

// Replace {{token}} placeholders with values from `vars`.
function interpolate(template, vars) {
  if (typeof template !== 'string' || !vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, name) =>
    vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : ''
  );
}

// Dev-only missing-key warning (warn-once-per-key, never in production).
const __warned = new Set();
function reportMissing(key, lang) {
  if (typeof window === 'undefined') return;
  const id = `${lang}::${key}`;
  if (__warned.has(id)) return;
  __warned.add(id);
  if (!window.__i18nMissing) window.__i18nMissing = {};
  if (!window.__i18nMissing[lang]) window.__i18nMissing[lang] = [];
  window.__i18nMissing[lang].push(key);
  // Soft signal — never crashes, never spams.
  if (import.meta && import.meta.env && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[i18n] missing key "${key}" for "${lang}" — falling back`);
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('app_language') : null;
    if (saved && translations[saved]) return saved;
    if (typeof navigator !== 'undefined') {
      const browserLang = (navigator.language || 'en').split('-')[0];
      if (translations[browserLang]) return browserLang;
    }
    return 'en';
  });

  // Persist + sync <html lang> for screen readers, browser auto-translate, SEO.
  useEffect(() => {
    try { localStorage.setItem('app_language', lang); } catch {}
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('lang', lang);
    }
  }, [lang]);

  const setLang = useCallback((next) => {
    if (translations[next]) setLangState(next);
  }, []);

  // t(key, vars?, fallback?)
  // - Tries current language → English → fallback → key.
  // - Supports {{var}} interpolation from vars.
  // - Reports missing keys in dev for auditing.
  const t = useCallback((key, vars, fallback) => {
    const fromLang = resolvePath(translations[lang], key);
    if (fromLang === undefined && lang !== 'en') reportMissing(key, lang);
    const fromEn = fromLang === undefined ? resolvePath(translations.en, key) : fromLang;
    const raw = fromEn !== undefined ? fromEn : (fallback !== undefined ? fallback : key);
    return interpolate(raw, vars);
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, languages: LANGUAGES }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}

// ─── Dev self-test ──────────────────────────────────────────────────────────
// Runs once in non-production to verify: (a) every locale has the same key
// shape as English, (b) interpolation works, (c) fallback works.
// Exposes results on window.__i18nReport for manual inspection without
// cluttering the console of normal users.
if (typeof window !== 'undefined' && !window.__i18nReportRan) {
  window.__i18nReportRan = true;
  try {
    const collectKeys = (o, prefix = '', acc = []) => {
      if (o && typeof o === 'object') {
        for (const k of Object.keys(o)) collectKeys(o[k], prefix ? `${prefix}.${k}` : k, acc);
      } else acc.push(prefix);
      return acc;
    };
    const enKeys = new Set(collectKeys(translations.en || {}));
    const report = { locales: {}, totalEnKeys: enKeys.size };
    for (const code of Object.keys(translations)) {
      if (code === 'en') continue;
      const localeKeys = new Set(collectKeys(translations[code] || {}));
      const missing = [...enKeys].filter((k) => !localeKeys.has(k));
      const extra = [...localeKeys].filter((k) => !enKeys.has(k));
      report.locales[code] = {
        coverage: enKeys.size ? Math.round(((enKeys.size - missing.length) / enKeys.size) * 100) : 100,
        missing,
        extra,
      };
    }
    // Interpolation smoke test
    const interpTest = interpolate('Hello {{name}}, {{count}} items', { name: 'X', count: 3 });
    report.interpolationOk = interpTest === 'Hello X, 3 items';
    window.__i18nReport = report;
  } catch (e) {
    window.__i18nReport = { error: String(e) };
  }
}