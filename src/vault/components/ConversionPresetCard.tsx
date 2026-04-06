import type { ConversionPreset } from '../types';

interface ConversionPresetCardProps {
  preset: ConversionPreset;
  selected: boolean;
  onSelect: (preset: ConversionPreset) => void;
  disabled?: boolean;
}

export function ConversionPresetCard({ preset, selected, onSelect, disabled }: ConversionPresetCardProps) {
  return (
    <button
      onClick={() => !disabled && onSelect(preset)}
      disabled={disabled}
      className={`w-full p-3 rounded-sm border text-left transition-all duration-200 min-h-[44px] ${
        disabled
          ? 'opacity-30 cursor-not-allowed border-border bg-card'
          : selected
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card hover:border-primary/20'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{preset.icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{preset.label}</p>
          <p className="text-[10px] text-muted-foreground">{preset.description}</p>
        </div>
      </div>
    </button>
  );
}
