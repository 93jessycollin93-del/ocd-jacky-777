import { AVAILABLE_LOCALES, useI18n, type Locale } from '@/game/i18n';

interface Props {
  variant?: 'pill' | 'compact';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'pill', className = '' }: Props) {
  const { locale, setLocale } = useI18n();

  if (variant === 'compact') {
    return (
      <select
        aria-label="Language"
        value={locale}
        onChange={e => setLocale(e.target.value as Locale)}
        className={`bg-muted border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      >
        {AVAILABLE_LOCALES.map(l => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.nativeLabel}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-2 uppercase tracking-widest">
        <span>🌐</span>
        <span>Language · 语言 · Язык · Мова</span>
      </div>
      <div role="radiogroup" aria-label="Select language" className="grid grid-cols-4 gap-2">
        {AVAILABLE_LOCALES.map(l => {
          const active = locale === l.code;
          return (
            <button
              key={l.code}
              role="radio"
              aria-checked={active}
              onClick={() => setLocale(l.code)}
              className={[
                'flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-md border transition-all',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                active
                  ? 'bg-primary/15 border-primary text-foreground gold-glow'
                  : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground',
              ].join(' ')}
            >
              <span className="text-xl leading-none">{l.flag}</span>
              <span className="text-[11px] font-display tracking-wide">{l.nativeLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
