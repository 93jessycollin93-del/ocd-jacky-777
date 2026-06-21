import { RotateCcw } from 'lucide-react';

const BG_TYPES = [
  ['inherit', 'Inherit'],
  ['solid', 'Solid'],
  ['gradient', 'Gradient'],
  ['animated_gradient', 'Animated Gradient'],
  ['image', 'Image'],
  ['pattern', 'Pattern'],
  ['texture', 'Texture'],
  ['glass', 'Glass'],
  ['mesh', 'Mesh / Neural'],
  ['overlay', 'Dark Overlay'],
];

function ColorWheel({ value, fallback, label }) {
  const display = value || fallback;
  const wheelStyle = display?.includes('gradient')
    ? { backgroundImage: display }
    : { background: display || 'rgba(255,255,255,0.08)' };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-3">
      <div className="relative h-11 w-11 rounded-full border border-white/10 p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
        <div className="h-full w-full rounded-full" style={wheelStyle} />
        <div className="absolute inset-[11px] rounded-full border border-black/20 bg-card/70 backdrop-blur-sm" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="truncate text-[10px] text-muted-foreground">{display || 'Not set'}</p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="space-y-1.5 min-w-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export default function LayerStyleForm({ value, onChange, onReset }) {
  const update = (key, next) => onChange({ ...value, [key]: next });

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Layer style</p>
          <p className="text-[11px] text-muted-foreground">Each layer can inherit from global defaults or override them locally.</p>
        </div>
        <button onClick={onReset} className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary px-3 py-2 text-xs">
          <RotateCcw className="w-3.5 h-3.5" /> Reset layer
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Background type">
          <select value={value.background_type || 'inherit'} onChange={(e) => update('background_type', e.target.value)} className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none">
            {BG_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </Field>
        <Field label="Background value">
          <input value={value.background_value || ''} onChange={(e) => update('background_value', e.target.value)} placeholder="Color, gradient, image URL, pattern, mesh..." className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
        </Field>
        <Field label="Overlay color">
          <input value={value.overlay_color || ''} onChange={(e) => update('overlay_color', e.target.value)} placeholder="rgba(0,0,0,0.35)" className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
        </Field>
        <Field label="Opacity">
          <input type="range" min="0" max="1" step="0.05" value={value.opacity ?? 1} onChange={(e) => update('opacity', parseFloat(e.target.value))} className="w-full" />
        </Field>
        <Field label="Blur">
          <input type="range" min="0" max="40" step="1" value={value.blur ?? 0} onChange={(e) => update('blur', parseInt(e.target.value))} className="w-full" />
        </Field>
        <Field label="Brightness">
          <input type="range" min="0.6" max="1.4" step="0.05" value={value.brightness ?? 1} onChange={(e) => update('brightness', parseFloat(e.target.value))} className="w-full" />
        </Field>
        <Field label="Contrast">
          <input type="range" min="0.6" max="1.6" step="0.05" value={value.contrast ?? 1} onChange={(e) => update('contrast', parseFloat(e.target.value))} className="w-full" />
        </Field>
        <Field label="Saturation">
          <input type="range" min="0" max="1.8" step="0.05" value={value.saturation ?? 1} onChange={(e) => update('saturation', parseFloat(e.target.value))} className="w-full" />
        </Field>
        <Field label="Border color">
          <input value={value.border_color || ''} onChange={(e) => update('border_color', e.target.value)} placeholder="#243042" className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
        </Field>
        <Field label="Border thickness">
          <input type="range" min="0" max="4" step="1" value={value.border_width ?? 1} onChange={(e) => update('border_width', parseInt(e.target.value))} className="w-full" />
        </Field>
        <Field label="Radius">
          <input type="range" min="0" max="32" step="1" value={value.radius ?? 16} onChange={(e) => update('radius', parseInt(e.target.value))} className="w-full" />
        </Field>
        <Field label="Shadow">
          <input value={value.shadow || ''} onChange={(e) => update('shadow', e.target.value)} placeholder="0 10px 30px rgba(0,0,0,0.25)" className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
        </Field>
        <Field label="Texture intensity">
          <input type="range" min="0" max="1" step="0.05" value={value.texture_intensity ?? 0} onChange={(e) => update('texture_intensity', parseFloat(e.target.value))} className="w-full" />
        </Field>
        <Field label="Overlay strength">
          <input type="range" min="0" max="1" step="0.05" value={value.overlay_strength ?? 0} onChange={(e) => update('overlay_strength', parseFloat(e.target.value))} className="w-full" />
        </Field>
        <Field label="Animation intensity">
          <input type="range" min="0" max="1.5" step="0.05" value={value.animation_intensity ?? 0} onChange={(e) => update('animation_intensity', parseFloat(e.target.value))} className="w-full" />
        </Field>
        <Field label="Image display">
          <input value={value.image_fit || ''} onChange={(e) => update('image_fit', e.target.value)} placeholder="cover / contain / center top" className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
        </Field>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-background/40 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Surface and button colors</p>
          <p className="text-[11px] text-muted-foreground">These now preview like theme wheels while keeping the same editable values.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <ColorWheel value={value.surface_bg} fallback="rgba(255,255,255,0.08)" label="Surface fill" />
            <input value={value.surface_bg || ''} onChange={(e) => update('surface_bg', e.target.value)} placeholder="rgba(...)" className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            <ColorWheel value={value.surface_fg} fallback="#f8fafc" label="Surface text" />
            <input value={value.surface_fg || ''} onChange={(e) => update('surface_fg', e.target.value)} placeholder="#f8fafc" className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            <ColorWheel value={value.button_bg} fallback="#29e3a1" label="Button fill" />
            <input value={value.button_bg || ''} onChange={(e) => update('button_bg', e.target.value)} placeholder="#29e3a1" className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            <ColorWheel value={value.button_fg} fallback="#07110d" label="Button text" />
            <input value={value.button_fg || ''} onChange={(e) => update('button_fg', e.target.value)} placeholder="#07110d" className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            <ColorWheel value={value.button_border} fallback="rgba(255,255,255,0.16)" label="Button border" />
            <input value={value.button_border || ''} onChange={(e) => update('button_border', e.target.value)} placeholder="rgba(...)" className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            <ColorWheel value={value.button_hover} fallback="linear-gradient(135deg, #29e3a1, #1fbf85)" label="Button hover" />
            <input value={value.button_hover || ''} onChange={(e) => update('button_hover', e.target.value)} placeholder="linear-gradient(...)" className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            <ColorWheel value={value.button_active} fallback="#1fbf85" label="Button active" />
            <input value={value.button_active || ''} onChange={(e) => update('button_active', e.target.value)} placeholder="#1fbf85" className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            <ColorWheel value={value.button_disabled} fallback="rgba(255,255,255,0.2)" label="Button disabled" />
            <input value={value.button_disabled || ''} onChange={(e) => update('button_disabled', e.target.value)} placeholder="rgba(255,255,255,0.2)" className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            <ColorWheel value={value.button_glow} fallback="radial-gradient(circle, rgba(41,227,161,0.55), rgba(41,227,161,0.05))" label="Button glow" />
            <input value={value.button_glow || ''} onChange={(e) => update('button_glow', e.target.value)} placeholder="0 0 24px rgba(...)" className="w-full min-h-11 rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none" />
          </div>
        </div>
      </div>
    </div>
  );
}