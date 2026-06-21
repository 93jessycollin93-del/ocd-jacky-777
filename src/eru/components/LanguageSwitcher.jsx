import { useEffect, useRef, useState } from 'react';
import { useLanguage, LANGUAGES } from '@/eru/context/LanguageContext';
import { Globe, Check } from 'lucide-react';

// All-languages list (current + future) lives in LANGUAGES; we render every
// entry so users can always switch to any supported locale.

/**
 * Compact, mobile-first language switcher.
 * - Click/tap to toggle (works on touch — hover dropdowns don't).
 * - Closes on outside click and on Escape.
 * - Reflects active language with a check + accent.
 */
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.changeLanguage', undefined, 'Change language')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-border transition-colors text-xs font-medium"
      >
        <Globe className="w-3.5 h-3.5" />
        {lang.toUpperCase()}
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {Object.entries(LANGUAGES).map(([code, name]) => {
            const active = lang === code;
            return (
              <button
                key={code}
                role="option"
                aria-selected={active}
                onClick={() => { setLang(code); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                }`}
              >
                <span>{name}</span>
                {active && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}