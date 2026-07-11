import { useLanguage } from '@/eru/context/LanguageContext';

/**
 * Tiny translation primitive for clean JSX usage.
 *
 *   <T k="common.save" />
 *   <T k="security.signedInAs" vars={{ email }} />
 *   <T k="some.key" fallback="English fallback" />
 *
 * Renders a string. For inline-only uses, prefer the `t()` hook directly.
 */
export default function T({ k, vars, fallback }) {
  const { t } = useLanguage();
  return t(k, vars, fallback);
}