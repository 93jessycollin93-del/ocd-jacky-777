import { Copy, Pencil, Save } from 'lucide-react';

export const THEME_PRESETS = [
  {
    id: 'neural-jade',
    label: 'Neural Jade',
    description: 'Dark neural mesh with vivid jade surfaces.',
    layers: {
      app: { background_type: 'mesh', background_value: 'neural_mesh', overlay_color: 'rgba(0,0,0,0.35)', overlay_strength: 0.35 },
      page: { background_type: 'gradient', background_value: 'linear-gradient(135deg, rgba(5,12,18,0.9), rgba(7,27,20,0.82))' },
      panel: { surface_bg: 'rgba(10,18,22,0.72)', border_color: 'rgba(41,227,161,0.22)', blur: 18, radius: 22, shadow: '0 10px 30px rgba(0,0,0,0.28)' },
      button: { button_bg: 'linear-gradient(135deg, #29e3a1, #10b981)', button_fg: '#04130e', button_glow: '0 0 24px rgba(41,227,161,0.35)' },
    },
  },
  {
    id: 'glass-orbit',
    label: 'Glass Orbit',
    description: 'Space glass panels with soft luminous controls.',
    layers: {
      app: { background_type: 'image', background_value: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=95&fit=crop', overlay_color: 'rgba(4,8,20,0.55)', overlay_strength: 0.55 },
      page: { background_type: 'glass', surface_bg: 'rgba(15,23,42,0.38)', blur: 24 },
      panel: { surface_bg: 'rgba(15,23,42,0.54)', border_color: 'rgba(148,163,184,0.2)', blur: 24, radius: 24 },
      button: { button_bg: 'rgba(59,130,246,0.9)', button_fg: '#eff6ff', button_hover: 'rgba(96,165,250,1)' },
    },
  },
  {
    id: 'ember-control',
    label: 'Ember Control',
    description: 'Warm high-contrast operator mode with glowing actions.',
    layers: {
      app: { background_type: 'gradient', background_value: 'radial-gradient(circle at top, rgba(120,24,24,0.35), rgba(10,10,10,1) 62%)' },
      page: { background_type: 'overlay', overlay_color: 'rgba(0,0,0,0.3)', overlay_strength: 0.3 },
      panel: { surface_bg: 'rgba(30,12,12,0.72)', border_color: 'rgba(248,113,113,0.22)', radius: 20 },
      button: { button_bg: 'linear-gradient(135deg, #ef4444, #f97316)', button_fg: '#fff7ed', button_glow: '0 0 28px rgba(249,115,22,0.28)' },
    },
  },
];

export default function ThemePresetLibrary({ onApply, onDuplicate, onRename, onSaveCurrent }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Theme presets</p>
          <p className="text-[11px] text-muted-foreground">Start from a polished preset, then refine each layer.</p>
        </div>
        <button onClick={onSaveCurrent} className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs">
          <Save className="w-3.5 h-3.5" /> Save current
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {THEME_PRESETS.map((preset) => (
          <div key={preset.id} className="rounded-2xl border border-border bg-secondary/30 p-4">
            <div className="h-24 rounded-xl border border-border/60 bg-[radial-gradient(circle_at_top,_rgba(41,227,161,0.18),_transparent_50%),linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(3,7,18,0.85))]" />
            <p className="mt-3 text-sm font-semibold">{preset.label}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{preset.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => onApply(preset)} className="rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">Apply</button>
              <button onClick={() => onDuplicate(preset)} className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs"><Copy className="w-3 h-3" /> Duplicate</button>
              <button onClick={() => onRename(preset)} className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-xs"><Pencil className="w-3 h-3" /> Rename</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}