import type { ConversionPreset } from '../types';

interface ConversionPresetCardProps {
  preset: ConversionPreset;
  selected: boolean;
  onSelect: (preset: ConversionPreset) => void;
  disabled?: boolean;
}

export function ConversionPresetCard({ preset, selected, onSelect, disabled }: ConversionPresetCardProps) {
  const isTelegram = preset.category === 'telegram';

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
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{preset.label}</p>
            {isTelegram && (
              <span className="px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider bg-[hsl(200_80%_55%)]/10 text-[hsl(200_80%_55%)] rounded-sm border border-[hsl(200_80%_55%)]/20">
                TG
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">{preset.description}</p>
          {preset.telegramMeta && (
            <div className="flex items-center gap-2 mt-1">
              {preset.telegramMeta.outputResolution && (
                <span className="text-[9px] font-mono text-muted-foreground">{preset.telegramMeta.outputResolution}</span>
              )}
              {preset.telegramMeta.estimatedSize && (
                <span className="text-[9px] font-mono text-muted-foreground">·</span>
              )}
              {preset.telegramMeta.estimatedSize && (
                <span className="text-[9px] font-mono text-muted-foreground">{preset.telegramMeta.estimatedSize}</span>
              )}
              {preset.telegramMeta.muteAudio && (
                <>
                  <span className="text-[9px] font-mono text-muted-foreground">·</span>
                  <span className="text-[9px] font-mono text-muted-foreground">🔇 Muted</span>
                </>
              )}
              {preset.telegramMeta.maxDuration && (
                <>
                  <span className="text-[9px] font-mono text-muted-foreground">·</span>
                  <span className="text-[9px] font-mono text-muted-foreground">≤{preset.telegramMeta.maxDuration}s</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
