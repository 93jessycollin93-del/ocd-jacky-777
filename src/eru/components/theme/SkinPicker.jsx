import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Layers, Sparkles, X, Globe2, FileText, Component } from 'lucide-react';
import { useTheme, BG_ENVS } from '@/eru/context/ThemeContext';
import { base44 } from '@/eru/api/base44Client';

/**
 * SkinPicker
 * ----------------------------------------------------------------------------
 * One-stop UI to pick a background ("skin") and apply it to any scope:
 *   - Global   → every page
 *   - Page     → this route only
 *   - Component → a single named surface (Nav bar, Ticker, Bot widget,
 *                 Buttons-on-this-page, etc.)
 *
 * Persists to the CustomThemeSetting entity using the existing
 * scope_type/scope_key model already wired into ThemeContext, so the
 * choice flows through ThemeContext.themeLayers.componentBackgrounds[key]
 * and the targeted surface picks it up immediately.
 *
 * Use as a drawer/modal from anywhere — VisualEngine, Settings, the nav
 * editor, or a "✨ Skin this" affordance on any surface.
 *
 * Props:
 *   open         — controlled open state
 *   onClose      — close handler
 *   defaultScope — { type: 'global' | 'page' | 'component', key?: string }
 *                  When opened from a specific surface, pass the
 *                  component scope_key (e.g. 'nav.floating') so the
 *                  picker pre-selects it.
 *   defaultEnv   — optional pre-selected BG env id
 *
 * Component scope catalog: COMPONENT_TARGETS below. Each entry maps a
 * human-readable label to a stable scope_key that the corresponding
 * surface reads via useTheme().getScopedComponentStyles(key).
 * ----------------------------------------------------------------------------
 */

// Stable scope_keys consumed by the corresponding components. Adding to
// this list and pointing one component at the new key is all that's
// needed to expose another skinnable surface.
export const COMPONENT_TARGETS = [
  { key: 'nav.floating', label: 'Navigation bar',        hint: 'The floating nav with Home / Markets / Trade / …' },
  { key: 'ticker.bar',   label: 'Live ticker',           hint: 'The price strip at the top of every page' },
  { key: 'widget.bot',   label: 'Bot clicker widget',    hint: 'The yellow Jackie / Bot Chat floating button' },
  { key: 'page.header',  label: 'Page header banner',    hint: 'The strip with the page title at the top of each page' },
  { key: 'card.surface', label: 'All cards on this page', hint: 'Every <ThemedSurface variant="card"> on the current route' },
  { key: 'button.cta',   label: 'Primary buttons',       hint: 'The "Save", "Confirm", main-action buttons' },
];

const CATEGORY_LABEL = {
  digital:  'Digital',
  space:    'Space',
  nature:   'Nature',
  energy:   'Energy',
  mythic:   'Mythic',
  still:    'Still backdrops',
  wildlife: 'Wildlife',
  scenery:  'Scenery',
  off:      'Off',
};

function buildLayer(envId) {
  const env = BG_ENVS[envId];
  if (!env || envId === 'none') return null;
  // Still / wildlife / scenery have a remote URL we paint as the background.
  if (env.url) {
    return {
      pageBackground: {
        backgroundImage: `url(${env.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      },
      // Same for component scope: the consuming surface reads pageBackground/
      // componentBackgrounds[key] and applies it inline.
    };
  }
  // Animated envs are rendered by AnimatedBackground, so we only flag the
  // env id; the consumer can switch its <AnimatedBackground type=...> when
  // bg is component-scoped.
  return { animatedEnv: envId };
}

export default function SkinPicker({ open, onClose, defaultScope, defaultEnv }) {
  const { customThemes, reloadCustomThemes, bg, setBg } = useTheme();
  const location = useLocation();

  const [scopeType, setScopeType] = useState(defaultScope?.type || 'global');
  const [scopeKey, setScopeKey] = useState(
    defaultScope?.type === 'component' ? defaultScope.key : '',
  );
  const [selectedEnv, setSelectedEnv] = useState(defaultEnv || bg || 'none');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setScopeType(defaultScope?.type || 'global');
    setScopeKey(defaultScope?.type === 'component' ? defaultScope.key : '');
    setSelectedEnv(defaultEnv || bg || 'none');
    setError(null);
  }, [open, defaultScope, defaultEnv, bg]);

  const grouped = useMemo(() => {
    const out = {};
    for (const [id, env] of Object.entries(BG_ENVS)) {
      const cat = env.cat || 'digital';
      if (!out[cat]) out[cat] = [];
      out[cat].push({ id, ...env });
    }
    return out;
  }, []);

  const scopeKeyForSave = scopeType === 'page'
    ? location.pathname
    : scopeType === 'component'
      ? scopeKey
      : '';

  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      // Global env shortcut: matches the existing single-knob
      // "background environment" model in ThemeContext.bg so we don't
      // lose backward compat with VisualEngine's existing picker.
      if (scopeType === 'global') {
        setBg(selectedEnv);
      }

      const layer = buildLayer(selectedEnv);
      const payload = {
        name: scopeType === 'global' ? 'Global skin' :
              scopeType === 'page'   ? `Skin · ${location.pathname}` :
              `Skin · ${scopeKey || 'component'}`,
        scope_type: scopeType,
        scope_key: scopeKeyForSave || '',
        env_id: selectedEnv,
        layers: layer
          ? { [scopeType === 'component' ? scopeKey : (scopeType === 'page' ? 'page' : 'global')]: layer }
          : {},
        // Mirror into the theme record's pageBackground/componentBackgrounds
        // so existing consumers (PageThemeLayer, ThemedSurface, etc.) pick it up.
        pageBackground: scopeType === 'page' && layer?.pageBackground ? layer.pageBackground : undefined,
        componentBackgrounds: scopeType === 'component' && scopeKey && layer
          ? { [scopeKey]: layer.pageBackground || {} }
          : undefined,
        is_active: true,
      };

      const existing = customThemes.find(
        (item) => item.scope_type === scopeType && (item.scope_key || '') === (scopeKeyForSave || ''),
      );

      if (existing) {
        await base44.entities.CustomThemeSetting.update(existing.id, payload);
      } else {
        await base44.entities.CustomThemeSetting.create(payload);
      }
      await reloadCustomThemes();
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to save skin');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Remove this skin override?`)) return;
    setBusy(true);
    setError(null);
    try {
      const existing = customThemes.find(
        (item) => item.scope_type === scopeType && (item.scope_key || '') === (scopeKeyForSave || ''),
      );
      if (existing) {
        await base44.entities.CustomThemeSetting.delete(existing.id);
        if (scopeType === 'global') setBg('none');
        await reloadCustomThemes();
      }
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to remove skin');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-2xl bg-card border-t md:border md:rounded-2xl border-border max-h-[90dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Skin picker</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close skin picker">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border space-y-3 flex-shrink-0">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Apply to</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'global',    label: 'Everywhere',   hint: 'Whole app',                icon: Globe2 },
                { type: 'page',      label: 'This page',    hint: location.pathname,          icon: FileText },
                { type: 'component', label: 'One component', hint: 'Nav / ticker / button…',  icon: Component },
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.type}
                    onClick={() => setScopeType(opt.type)}
                    className={`px-3 py-2 rounded-xl border text-left transition-all ${scopeType === opt.type ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}
                  >
                    <div className="flex items-center gap-1.5"><Icon className="w-3 h-3 text-muted-foreground" /><span className="text-xs font-medium">{opt.label}</span></div>
                    <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{opt.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {scopeType === 'component' && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Pick a component</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMPONENT_TARGETS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setScopeKey(t.key)}
                    className={`px-3 py-2 rounded-xl border text-left transition-all ${scopeKey === t.key ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}
                  >
                    <p className="text-xs font-medium">{t.label}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{t.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
          {Object.entries(grouped).map(([cat, envs]) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{CATEGORY_LABEL[cat] || cat}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {envs.map((env) => {
                  const isSelected = selectedEnv === env.id;
                  return (
                    <button
                      key={env.id}
                      onClick={() => setSelectedEnv(env.id)}
                      className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all text-left ${isSelected ? 'border-primary' : 'border-border hover:border-primary/40'}`}
                      style={env.url ? {
                        backgroundImage: `url(${env.url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      } : { background: 'linear-gradient(135deg, hsl(230 25% 6%), hsl(230 22% 9%))' }}
                    >
                      {!env.url && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Layers className="w-5 h-5 text-primary/60" />
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-[9px] font-medium bg-black/50 text-white truncate">
                        {env.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-border flex-shrink-0 space-y-2">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={remove}
              disabled={busy}
              className="px-3 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm font-medium disabled:opacity-50"
            >
              Remove skin
            </button>
            <button
              onClick={apply}
              disabled={busy || (scopeType === 'component' && !scopeKey)}
              className="flex-1 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {busy ? 'Saving…' : `Apply ${BG_ENVS[selectedEnv]?.label || selectedEnv}`}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Skins persist per scope. The most specific scope wins: component &gt; page &gt; global.
          </p>
        </div>
      </div>
    </div>
  );
}
