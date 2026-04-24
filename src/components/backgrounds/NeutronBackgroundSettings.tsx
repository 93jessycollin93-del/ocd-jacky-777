import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

const STORAGE_KEY = 'jackie:neutron-bg-settings';

export interface NeutronBackgroundSettings {
  opacity: number; // 0–1
  glow: number;    // 0–2
}

export const DEFAULT_NEUTRON_SETTINGS: NeutronBackgroundSettings = {
  opacity: 0.4,
  glow: 1,
};

export function loadNeutronSettings(): NeutronBackgroundSettings {
  if (typeof window === 'undefined') return DEFAULT_NEUTRON_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NEUTRON_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      opacity: clamp(Number(parsed.opacity), 0, 1, DEFAULT_NEUTRON_SETTINGS.opacity),
      glow: clamp(Number(parsed.glow), 0, 2, DEFAULT_NEUTRON_SETTINGS.glow),
    };
  } catch {
    return DEFAULT_NEUTRON_SETTINGS;
  }
}

function clamp(n: number, lo: number, hi: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

interface Props {
  value: NeutronBackgroundSettings;
  onChange: (next: NeutronBackgroundSettings) => void;
}

export default function NeutronBackgroundSettings({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* ignore */ }
  }, [value]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Background settings"
        className="fixed bottom-4 right-4 z-40 h-11 w-11 rounded-full border border-border/40 bg-card/80 backdrop-blur-md shadow-lg flex items-center justify-center text-foreground/80 hover:text-primary hover:border-primary/50 transition-colors"
      >
        <Sparkles size={18} />
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-72 rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Neutron Star Backdrop</h4>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40"
            >
              <X size={14} />
            </button>
          </div>

          <Slider
            label="Background opacity"
            min={0} max={1} step={0.05}
            value={value.opacity}
            display={`${Math.round(value.opacity * 100)}%`}
            onChange={(v) => onChange({ ...value, opacity: v })}
          />

          <Slider
            label="Glow intensity"
            min={0} max={2} step={0.05}
            value={value.glow}
            display={`${value.glow.toFixed(2)}×`}
            onChange={(v) => onChange({ ...value, glow: v })}
          />

          <button
            onClick={() => onChange(DEFAULT_NEUTRON_SETTINGS)}
            className="mt-2 w-full text-[11px] font-medium text-muted-foreground hover:text-foreground py-1.5 rounded-md hover:bg-muted/30 transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      )}
    </>
  );
}

function Slider({
  label, min, max, step, value, display, onChange,
}: {
  label: string; min: number; max: number; step: number;
  value: number; display: string; onChange: (v: number) => void;
}) {
  return (
    <label className="block mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className="text-[11px] font-mono text-primary">{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full bg-muted/40 appearance-none accent-primary cursor-pointer"
      />
    </label>
  );
}
