import { Monitor, Moon, Sun, Type, Eye } from 'lucide-react';
import { useTheme, TYPOGRAPHY_PACKS } from '@/eru/context/ThemeContext';

/**
 * DisplayPreferencesSection
 * ----------------------------------------------------------------------------
 * Lightweight display controls: color mode, typography pack, and UI scale.
 * Reuses the existing ThemeContext — values persist to localStorage already.
 * No business logic — pure UI bound to context setters.
 */
const SCALE_OPTIONS = [
  { value: 0.9, label: 'Compact' },
  { value: 1, label: 'Default' },
  { value: 1.1, label: 'Comfortable' },
  { value: 1.2, label: 'Large' },
];

export default function DisplayPreferencesSection() {
  const { colorMode, setColorMode, typography, setTypography, uiScale, setUiScale } = useTheme();

  return (
    <section className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" /> Display preferences
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Tune appearance, font, and density across the app.</p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Color mode</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'system', label: 'System', icon: Monitor },
          ].map((opt) => {
            const active = colorMode === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setColorMode(opt.value)}
                className={`h-11 rounded-xl border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary/20 text-foreground hover:border-primary/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground inline-flex items-center gap-1.5">
          <Type className="w-3 h-3" /> Typography
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(TYPOGRAPHY_PACKS).map(([key, pack]) => {
            const active = typography === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTypography(key)}
                className={`h-11 rounded-xl border text-xs font-medium transition-colors ${
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary/20 text-foreground hover:border-primary/30'
                }`}
              >
                {pack.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">UI density</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SCALE_OPTIONS.map((opt) => {
            const active = Math.abs((uiScale ?? 1) - opt.value) < 0.01;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUiScale(opt.value)}
                className={`h-11 rounded-xl border text-xs font-medium transition-colors ${
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary/20 text-foreground hover:border-primary/30'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}