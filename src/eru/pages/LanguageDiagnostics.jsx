import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Globe, Languages } from 'lucide-react';
import { useLanguage, LANGUAGES } from '@/eru/context/LanguageContext';
import translations from '@/eru/lib/translations.json';

// Walk the translations object and produce a flat list of dotted key paths
// whose value is a string (i.e. real translatable leaf nodes).
function collectKeys(o, prefix = '', acc = []) {
  if (o && typeof o === 'object') {
    for (const k of Object.keys(o)) collectKeys(o[k], prefix ? `${prefix}.${k}` : k, acc);
  } else if (typeof o === 'string') {
    acc.push(prefix);
  }
  return acc;
}

const SAMPLE_KEYS = [
  'nav.home', 'nav.markets', 'nav.trade', 'nav.portfolio', 'nav.settings',
  'storefront.title', 'storefront.listings', 'storefront.active',
  'analytics.title', 'analytics.totalvolume',
  'common.save', 'common.cancel', 'common.loading', 'common.language',
];

export default function LanguageDiagnostics() {
  const { lang, setLang, t } = useLanguage();

  // Coverage report — what % of EN keys exist in each locale, and which are missing.
  // Only report on locales that are actually exposed to end users.
  const report = useMemo(() => {
    const enKeys = collectKeys(translations.en || {});
    const enSet = new Set(enKeys);
    const out = { totalEn: enKeys.length, locales: {} };
    const exposed = Object.keys(LANGUAGES);
    for (const code of exposed) {
      if (code === 'en' || !translations[code]) continue;
      const local = new Set(collectKeys(translations[code] || {}));
      const missing = enKeys.filter((k) => !local.has(k));
      const extra = [...local].filter((k) => !enSet.has(k));
      out.locales[code] = {
        coverage: enKeys.length ? Math.round(((enKeys.length - missing.length) / enKeys.length) * 100) : 100,
        missing,
        extra,
      };
    }
    return out;
  }, []);

  // Interpolation test — verifies {{var}} substitution is wired correctly.
  const interpolationCheck = useMemo(() => {
    const a = t('storefront.push', { count: 3, plural: 's' });
    const b = t('storefront.bulkpush', { pushed: 5, failed: '' });
    const ok = !a.includes('{{') && !b.includes('{{');
    return { ok, a, b };
  }, [t, lang]);

  // Fallback test — request a deliberately missing key and see what comes back.
  const fallbackCheck = useMemo(() => {
    const out = t('definitely.missing.key', undefined, 'Fallback OK');
    return { ok: out === 'Fallback OK', value: out };
  }, [t, lang]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Languages className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Language Diagnostics</h2>
          <span className="ml-auto text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            EN keys: {report.totalEn}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Verify global translation correctness, coverage, interpolation, and fallback behavior.</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Active language picker */}
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Active language</p>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{lang}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                  lang === code ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Smoke tests */}
        <div className="rounded-xl border border-border bg-card p-3 space-y-3">
          <p className="text-sm font-semibold">Engine smoke tests</p>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2">
            {interpolationCheck.ok
              ? <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              : <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />}
            <div className="text-xs">
              <p className="font-medium">Interpolation</p>
              <p className="text-muted-foreground mt-1">{interpolationCheck.a}</p>
              <p className="text-muted-foreground">{interpolationCheck.b}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2">
            {fallbackCheck.ok
              ? <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              : <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />}
            <div className="text-xs">
              <p className="font-medium">Missing-key fallback</p>
              <p className="text-muted-foreground mt-1">Returned: <span className="font-mono">{fallbackCheck.value}</span></p>
            </div>
          </div>
        </div>

        {/* Sample translations grid */}
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <p className="text-sm font-semibold">Live translation samples ({lang.toUpperCase()})</p>
          <div className="divide-y divide-border">
            {SAMPLE_KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between py-1.5 text-xs">
                <span className="font-mono text-muted-foreground">{key}</span>
                <span className="text-foreground text-right max-w-[60%] truncate">{t(key)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Coverage report */}
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <p className="text-sm font-semibold">Coverage vs English</p>
          <div className="space-y-2">
            {Object.entries(report.locales).map(([code, data]) => (
              <div key={code} className="rounded-lg border border-border bg-background p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{LANGUAGES[code] || code}</span>
                  <span className={`font-mono ${data.coverage === 100 ? 'text-primary' : 'text-yellow-400'}`}>
                    {data.coverage}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full ${data.coverage === 100 ? 'bg-primary' : 'bg-yellow-400'}`}
                    style={{ width: `${data.coverage}%` }}
                  />
                </div>
                {data.missing.length > 0 && (
                  <p className="mt-1.5 text-[10px] text-muted-foreground truncate" title={data.missing.join(', ')}>
                    Missing: {data.missing.slice(0, 4).join(', ')}{data.missing.length > 4 ? `, +${data.missing.length - 4} more` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Note: only strings registered under <span className="font-mono">lib/translations.json</span> are translated. Hardcoded strings inside individual pages stay in English by design until they are wired up.
        </p>
      </div>
    </div>
  );
}