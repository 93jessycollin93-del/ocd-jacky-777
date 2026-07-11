import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Paintbrush, Save, Layers, MonitorSmartphone } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useTheme } from '@/eru/context/ThemeContext';

const EMPTY_FORM = {
  name: '',
  scope_type: 'global',
  scope_key: '',
  theme_mode: 'inherit',
  background_type: 'inherit',
  background_value: '',
  appBg: '',
  pageBg: '',
  surfaceBg: '',
  buttonBg: '',
  buttonFg: '',
  borderColor: '',
};

function toPayload(form, pathname) {
  const scopeKey = form.scope_type === 'page' ? pathname : form.scope_key;
  return {
    name: form.name || (form.scope_type === 'page' ? `Theme ${pathname}` : 'Global Theme'),
    scope_type: form.scope_type,
    scope_key: scopeKey || '',
    theme_mode: form.theme_mode,
    background_type: form.background_type,
    background_value: form.background_value,
    variables: {
      ...(form.appBg ? { '--app-bg': form.appBg } : {}),
      ...(form.pageBg ? { '--page-bg': form.pageBg } : {}),
      ...(form.surfaceBg ? { '--surface-bg': form.surfaceBg } : {}),
      ...(form.buttonBg ? { '--button-bg': form.buttonBg } : {}),
      ...(form.buttonFg ? { '--button-foreground': form.buttonFg } : {}),
      ...(form.borderColor ? { '--page-border': form.borderColor, '--button-border': form.borderColor } : {}),
    },
    is_active: true,
  };
}

export default function ThemeEnginePanel() {
  const location = useLocation();
  const { reloadCustomThemes, customThemes } = useTheme();
  const [form, setForm] = useState({ ...EMPTY_FORM, scope_key: location.pathname });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm((prev) => ({ ...prev, scope_key: location.pathname }));
  }, [location.pathname]);

  const matchingThemes = useMemo(() => {
    return (customThemes || []).filter((item) => item.scope_type === form.scope_type);
  }, [customThemes, form.scope_type]);

  const helperLabel = form.scope_type === 'page' ? `Applies to ${location.pathname}` : 'Applies across the entire app';

  const saveTheme = async () => {
    if (!base44?.entities?.CustomThemeSetting) return;
    setSaving(true);
    const payload = toPayload(form, location.pathname);
    const existing = (customThemes || []).find((item) => item.scope_type === payload.scope_type && (item.scope_key || '') === (payload.scope_key || ''));
    if (existing) {
      await base44.entities.CustomThemeSetting.update(existing.id, payload);
    } else {
      await base44.entities.CustomThemeSetting.create(payload);
    }
    await reloadCustomThemes();
    setSaving(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 overflow-hidden">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          <Paintbrush className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-6 text-foreground">Quick Theme Engine</p>
          <p className="text-xs leading-5 text-muted-foreground break-words">Use the quick controls here or open the advanced studio below for full layered customization.</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-secondary/30 p-3">
          <div className="flex items-center gap-2 text-foreground">
            <Layers className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium">Theme Scope</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{helperLabel}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/30 p-3">
          <div className="flex items-center gap-2 text-foreground">
            <MonitorSmartphone className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium">Mobile Safe</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Controls are stacked and touch-friendly for Telegram-sized screens.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 min-w-0">
          <span className="text-xs font-medium text-muted-foreground">Scope</span>
          <select aria-label="Theme scope" value={form.scope_type} onChange={(e) => setForm((prev) => ({ ...prev, scope_type: e.target.value }))} className="w-full min-h-11 bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
            <option value="global">Global app</option>
            <option value="page">Current page</option>
          </select>
        </label>
        <label className="space-y-1.5 min-w-0">
          <span className="text-xs font-medium text-muted-foreground">Theme name</span>
          <input aria-label="Theme name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="My theme" className="w-full min-h-11 bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 min-w-0">
          <span className="text-xs font-medium text-muted-foreground">Background type</span>
          <select aria-label="Background type" value={form.background_type} onChange={(e) => setForm((prev) => ({ ...prev, background_type: e.target.value }))} className="w-full min-h-11 bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
            <option value="inherit">Inherit</option>
            <option value="solid">Solid</option>
            <option value="gradient">Gradient</option>
            <option value="image">Image URL</option>
          </select>
        </label>
        <label className="space-y-1.5 min-w-0">
          <span className="text-xs font-medium text-muted-foreground">Background value</span>
          <input aria-label="Background value" value={form.background_value} onChange={(e) => setForm((prev) => ({ ...prev, background_value: e.target.value }))} placeholder="e.g. linear-gradient(...) or #0b1020" className="w-full min-h-11 bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Layer Colors</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 min-w-0"><span className="text-xs text-muted-foreground">App background</span><input aria-label="App background color" type="color" value={form.appBg || '#0b0f1a'} onChange={(e) => setForm((prev) => ({ ...prev, appBg: e.target.value }))} className="h-11 w-full rounded-xl border border-border bg-secondary p-2 cursor-pointer" /></label>
          <label className="space-y-1.5 min-w-0"><span className="text-xs text-muted-foreground">Page layer</span><input aria-label="Page layer color" type="color" value={form.pageBg || '#111827'} onChange={(e) => setForm((prev) => ({ ...prev, pageBg: e.target.value }))} className="h-11 w-full rounded-xl border border-border bg-secondary p-2 cursor-pointer" /></label>
          <label className="space-y-1.5 min-w-0"><span className="text-xs text-muted-foreground">Card surface</span><input aria-label="Card surface color" type="color" value={form.surfaceBg || '#151b2c'} onChange={(e) => setForm((prev) => ({ ...prev, surfaceBg: e.target.value }))} className="h-11 w-full rounded-xl border border-border bg-secondary p-2 cursor-pointer" /></label>
          <label className="space-y-1.5 min-w-0"><span className="text-xs text-muted-foreground">Button fill</span><input aria-label="Button fill color" type="color" value={form.buttonBg || '#29e3a1'} onChange={(e) => setForm((prev) => ({ ...prev, buttonBg: e.target.value }))} className="h-11 w-full rounded-xl border border-border bg-secondary p-2 cursor-pointer" /></label>
          <label className="space-y-1.5 min-w-0"><span className="text-xs text-muted-foreground">Button text</span><input aria-label="Button text color" type="color" value={form.buttonFg || '#07110d'} onChange={(e) => setForm((prev) => ({ ...prev, buttonFg: e.target.value }))} className="h-11 w-full rounded-xl border border-border bg-secondary p-2 cursor-pointer" /></label>
          <label className="space-y-1.5 min-w-0"><span className="text-xs text-muted-foreground">Borders</span><input aria-label="Border color" type="color" value={form.borderColor || '#243042'} onChange={(e) => setForm((prev) => ({ ...prev, borderColor: e.target.value }))} className="h-11 w-full rounded-xl border border-border bg-secondary p-2 cursor-pointer" /></label>
        </div>
      </div>

      <button onClick={saveTheme} disabled={saving} className="w-full min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 cursor-pointer">
        <Save className="w-4 h-4" /> {saving ? 'Saving theme…' : 'Save Theme'}
      </button>

      {matchingThemes.length > 0 && (
        <div className="rounded-xl border border-border bg-secondary/30 p-3">
          <p className="text-xs font-medium mb-2 text-foreground">Saved Themes in This Scope</p>
          <div className="space-y-2">
            {matchingThemes.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground min-w-0">
                <span className="truncate min-w-0">{item.name}</span>
                <span className="shrink-0 text-[10px] uppercase">{item.scope_key || 'app'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}