import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/eru/api/base44Client';
import { Layers3, Save, RefreshCcw } from 'lucide-react';
import { useTheme } from '@/eru/context/ThemeContext';
import { applyRootVariables } from '@/eru/lib/themeEngine';
import LayerStyleForm from './LayerStyleForm';
import ThemePresetLibrary from './ThemePresetLibrary';
import ThemeScopePreview from './ThemeScopePreview';

const LAYER_OPTIONS = [
  ['app', 'Global app'],
  ['page', 'Current page'],
  ['section', 'Section / container'],
  ['panel', 'Panel / card'],
  ['modal', 'Modal / dialog'],
  ['nav', 'Sidebar / topbar / footer'],
  ['button', 'Button layer'],
  ['input', 'Input / form'],
  ['widget', 'Widget / component'],
];

function emptyLayer() {
  return {
    background_type: 'inherit',
    background_value: '',
    overlay_color: '',
    opacity: 1,
    blur: 0,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    border_color: '',
    border_width: 1,
    radius: 16,
    shadow: '',
    texture_intensity: 0,
    overlay_strength: 0,
    animation_intensity: 0,
    image_fit: '',
    surface_bg: '',
    surface_fg: '',
    button_bg: '',
    button_fg: '',
    button_border: '',
    button_hover: '',
    button_active: '',
    button_disabled: '',
    button_glow: '',
  };
}

function layerToVariables(layerId, layer) {
  const prefixMap = {
    app: ['--app-bg'],
    page: ['--page-bg'],
    section: ['--section-bg'],
    panel: ['--panel-bg', '--card-bg', '--surface-bg'],
    modal: ['--modal-bg'],
    nav: ['--sidebar-bg', '--topbar-bg', '--footer-bg'],
    button: ['--button-bg'],
    input: ['--input-bg'],
    widget: ['--widget-bg'],
  };

  const vars = {};
  const backgrounds = prefixMap[layerId] || [];
  if (layer.surface_bg) backgrounds.forEach((key) => { vars[key] = layer.surface_bg; });
  if (layer.surface_fg) vars['--surface-foreground'] = layer.surface_fg;
  if (layer.border_color) {
    vars['--page-border'] = layer.border_color;
    vars['--input-border'] = layer.border_color;
  }
  if (layer.radius !== undefined) vars['--layer-radius'] = `${layer.radius}px`;
  if (layer.shadow) vars['--layer-shadow'] = layer.shadow;
  if (layer.button_bg) vars['--button-bg'] = layer.button_bg;
  if (layer.button_fg) vars['--button-foreground'] = layer.button_fg;
  if (layer.button_border) vars['--button-border'] = layer.button_border;
  if (layer.button_hover) vars['--button-hover-bg'] = layer.button_hover;
  if (layer.button_active) vars['--button-active-bg'] = layer.button_active;
  if (layer.button_disabled) vars['--button-disabled-bg'] = layer.button_disabled;
  if (layer.button_glow) vars['--button-glow'] = layer.button_glow;
  return vars;
}

export default function AdvancedThemeStudio() {
  const location = useLocation();
  const { customThemes, reloadCustomThemes, getThemeRecord } = useTheme();
  const [scopeType, setScopeType] = useState('global');
  const [layerId, setLayerId] = useState('app');
  const [themeName, setThemeName] = useState('');
  const [editingThemeId, setEditingThemeId] = useState(null);
  const [layerStyles, setLayerStyles] = useState(() => Object.fromEntries(LAYER_OPTIONS.map(([id]) => [id, emptyLayer()])));
  const [status, setStatus] = useState('');

  const scopeKey = useMemo(() => scopeType === 'page' ? location.pathname : '', [scopeType, location.pathname]);

  const buildVariablesFromLayers = (layers) => Object.entries(layers).reduce((acc, [id, layer]) => ({
    ...acc,
    ...layerToVariables(id, layer),
  }), {});

  useEffect(() => {
    const globalTheme = getThemeRecord('global', '');
    const activeTheme = scopeType === 'page'
      ? getThemeRecord('page', location.pathname)
      : globalTheme;

    const baseLayers = Object.fromEntries(LAYER_OPTIONS.map(([id]) => [id, { ...emptyLayer(), ...(globalTheme?.layers?.[id] || {}) }]));

    if (!activeTheme) {
      setThemeName(scopeType === 'page' ? `Theme ${location.pathname}` : 'Global Theme');
      setEditingThemeId(null);
      setLayerStyles(baseLayers);
      return;
    }

    setThemeName(activeTheme.name || 'Theme');
    setEditingThemeId(activeTheme.id);
    const next = Object.fromEntries(LAYER_OPTIONS.map(([id]) => [
      id,
      {
        ...baseLayers[id],
        ...(scopeType === 'page' ? (activeTheme.layers?.[id] || {}) : (globalTheme?.layers?.[id] || {})),
      },
    ]));
    setLayerStyles(next);
  }, [customThemes, scopeType, location.pathname, getThemeRecord]);

  const currentLayer = layerStyles[layerId] || emptyLayer();

  useEffect(() => {
    applyRootVariables(buildVariablesFromLayers(layerStyles));
  }, [layerStyles]);

  const saveTheme = async () => {
    const layers = layerStyles;
    const activeLayer = layers.app;
    const payload = {
      name: themeName || (scopeType === 'page' ? `Theme ${location.pathname}` : 'Global Theme'),
      scope_type: scopeType,
      scope_key: scopeKey,
      theme_mode: 'inherit',
      background_type: activeLayer.background_type || 'inherit',
      background_value: activeLayer.background_value || '',
      variables: buildVariablesFromLayers(layers),
      layers,
      is_active: true,
    };

    if (editingThemeId) {
      await base44.entities.CustomThemeSetting.update(editingThemeId, payload);
    } else {
      const created = await base44.entities.CustomThemeSetting.create(payload);
      setEditingThemeId(created.id);
    }
    await reloadCustomThemes();
    setStatus('Saved');
    window.setTimeout(() => setStatus(''), 1400);
  };

  const applyPreset = (preset) => {
    const next = Object.fromEntries(LAYER_OPTIONS.map(([id]) => [id, { ...emptyLayer(), ...(preset.layers[id] || {}) }]));
    setLayerStyles(next);
    setThemeName(preset.label);
  };

  const duplicatePreset = (preset) => {
    applyPreset(preset);
    setThemeName(`${preset.label} Copy`);
  };

  const renamePreset = (preset) => {
    applyPreset(preset);
    setThemeName(`${preset.label} Renamed`);
  };

  const saveCurrentAsPreset = () => {
    setStatus('Current theme ready to save');
    window.setTimeout(() => setStatus(''), 1400);
  };

  const resetCurrentLayer = () => {
    const globalTheme = getThemeRecord('global', '');
    const fallback = scopeType === 'page' ? { ...emptyLayer(), ...(globalTheme?.layers?.[layerId] || {}) } : emptyLayer();
    setLayerStyles((prev) => ({ ...prev, [layerId]: fallback }));
  };

  const resetScopeToGlobal = async () => {
    const activeTheme = customThemes.find((item) => item.scope_type === 'page' && item.scope_key === location.pathname);
    if (activeTheme) {
      await base44.entities.CustomThemeSetting.delete(activeTheme.id);
      await reloadCustomThemes();
    }
    setStatus('Reset to global');
    window.setTimeout(() => setStatus(''), 1400);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Layers3 className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Advanced Visual Customization Studio</p>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Layered theme control with inheritance, page overrides, live preview, and reusable presets.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={saveTheme} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              <Save className="w-4 h-4" /> {status === 'Saved' ? 'Saved' : 'Save theme'}
            </button>
            {scopeType === 'page' && (
              <button onClick={resetScopeToGlobal} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm">
                <RefreshCcw className="w-4 h-4" /> Reset page to global
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Theme scope</span>
            <select value={scopeType} onChange={(e) => setScopeType(e.target.value)} className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none">
              <option value="global">Global app</option>
              <option value="page">Current page</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Theme name</span>
            <input value={themeName} onChange={(e) => setThemeName(e.target.value)} className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Page selector</span>
            <input value={scopeType === 'page' ? location.pathname : 'Global app'} disabled className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none disabled:opacity-70" />
          </label>
        </div>
      </div>

      <ThemePresetLibrary onApply={applyPreset} onDuplicate={duplicatePreset} onRename={renamePreset} onSaveCurrent={saveCurrentAsPreset} />

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">Layer selector</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Choose which layer overrides the inherited style.</p>
          <div className="mt-4 space-y-2">
            {LAYER_OPTIONS.map(([id, label]) => {
              const globalTheme = getThemeRecord('global', '');
              const inherited = scopeType === 'page' && globalTheme?.layers?.[id];
              const customized = Object.values(layerStyles[id] || {}).some((value) => value !== '' && value !== 0 && value !== 1 && value !== 'inherit' && value !== 16);
              return (
                <button key={id} onClick={() => setLayerId(id)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm ${layerId === id ? 'border-primary bg-primary/10' : 'border-border bg-secondary/30'}`}>
                  <span>{label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${customized ? 'bg-primary/15 text-primary' : inherited ? 'bg-blue-500/10 text-blue-400' : 'bg-secondary text-muted-foreground'}`}>
                    {customized ? 'Custom' : inherited ? 'Global' : 'Inherited'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <LayerStyleForm
            value={currentLayer}
            onChange={(next) => setLayerStyles((prev) => ({ ...prev, [layerId]: next }))}
            onReset={resetCurrentLayer}
          />
          <ThemeScopePreview />
        </div>
      </div>
    </div>
  );
}