import { useState } from 'react';
import { ArrowLeft, ChevronDown, Zap } from 'lucide-react';
import { ConversionPresetCard } from '../components/ConversionPresetCard';
import { TelegramAvatarPreview } from '../components/TelegramAvatarPreview';
import { getPresetForMedia, formatFileSize, formatDuration, type MediaItem, type ConversionPreset } from '../types';
import { conversionService } from '../services';
import { toast } from 'sonner';

interface JobBuilderProps {
  item: MediaItem;
  onBack: () => void;
  onJobCreated: () => void;
}

export function JobBuilder({ item, onBack, onJobCreated }: JobBuilderProps) {
  const allPresets = getPresetForMedia(item);
  const generalPresets = allPresets.filter(p => p.category !== 'telegram');
  const telegramPresets = allPresets.filter(p => p.category === 'telegram');

  const [selected, setSelected] = useState<ConversionPreset | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bitrate, setBitrate] = useState(192);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(item.duration || 0);
  const [normalize, setNormalize] = useState(false);
  const [outputName, setOutputName] = useState('');
  const [avatarShape, setAvatarShape] = useState<'square' | 'circle'>('circle');

  const isTelegramPreset = selected?.category === 'telegram';
  const showAvatarPreview = selected?.actionType === 'telegram_profile_photo' || selected?.actionType === 'telegram_profile_video';

  const handlePresetSelect = (preset: ConversionPreset) => {
    setSelected(preset);
    if (preset.defaultBitrate) setBitrate(preset.defaultBitrate);
    setOutputName(conversionService.getOutputFilename(item, preset.outputFormat));
    if (preset.telegramMeta?.cropShape) setAvatarShape(preset.telegramMeta.cropShape);
  };

  const handleQueue = () => {
    if (!selected) return;
    conversionService.createJob(item, selected.actionType, selected.key, selected.outputFormat, {
      targetBitrate: bitrate,
      trimStart: selected.actionType === 'trim_clip' ? trimStart : undefined,
      trimEnd: selected.actionType === 'trim_clip' ? trimEnd : undefined,
      normalizationEnabled: normalize,
    });
    toast.success('Job queued. Processing will begin shortly.');
    onJobCreated();
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-mono uppercase tracking-wider text-foreground">Convert</h1>
          <p className="text-[11px] text-muted-foreground">Choose an action for your file</p>
        </div>
      </div>

      {/* Input summary */}
      <div className="p-3 border border-border rounded-sm bg-card">
        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
        <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-muted-foreground">
          <span>{item.mimeType}</span>
          <span>·</span>
          <span>{formatFileSize(item.fileSize)}</span>
          {item.duration && <>
            <span>·</span>
            <span>{formatDuration(item.duration)}</span>
          </>}
        </div>
      </div>

      {/* General Presets */}
      {generalPresets.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Standard Actions</h2>
          <div className="grid grid-cols-1 gap-2">
            {generalPresets.map(p => (
              <ConversionPresetCard
                key={p.key}
                preset={p}
                selected={selected?.key === p.key}
                onSelect={handlePresetSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Telegram Presets */}
      {telegramPresets.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <span>✈️</span> Telegram Presets
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {telegramPresets.map(p => (
              <ConversionPresetCard
                key={p.key}
                preset={p}
                selected={selected?.key === p.key}
                onSelect={handlePresetSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Telegram Avatar Preview */}
      {showAvatarPreview && selected?.telegramMeta && (
        <TelegramAvatarPreview
          previewShape={avatarShape}
          onShapeChange={setAvatarShape}
          outputResolution={selected.telegramMeta.outputResolution}
          estimatedSize={selected.telegramMeta.estimatedSize}
          outputFormat={selected.outputFormat}
        />
      )}

      {/* Advanced Settings */}
      {selected && !isTelegramPreset && (
        <>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Advanced Settings
          </button>

          {showAdvanced && (
            <div className="space-y-4 p-3 border border-border rounded-sm bg-card">
              {selected.defaultBitrate && (
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                    Bitrate: {bitrate} kbps
                  </label>
                  <input
                    type="range"
                    min={64}
                    max={320}
                    step={32}
                    value={bitrate}
                    onChange={(e) => setBitrate(Number(e.target.value))}
                    className="w-full mt-1 accent-primary"
                  />
                </div>
              )}

              {selected.actionType === 'trim_clip' && item.duration && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Start (s)</label>
                    <input
                      type="number"
                      min={0}
                      max={item.duration}
                      value={trimStart}
                      onChange={(e) => setTrimStart(Number(e.target.value))}
                      className="w-full mt-1 px-2 py-1.5 text-sm font-mono bg-input border border-border rounded-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">End (s)</label>
                    <input
                      type="number"
                      min={0}
                      max={item.duration}
                      value={trimEnd}
                      onChange={(e) => setTrimEnd(Number(e.target.value))}
                      className="w-full mt-1 px-2 py-1.5 text-sm font-mono bg-input border border-border rounded-sm text-foreground"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="normalize"
                  checked={normalize}
                  onChange={(e) => setNormalize(e.target.checked)}
                  className="accent-primary"
                />
                <label htmlFor="normalize" className="text-xs text-foreground">Normalize audio levels</label>
              </div>

              <div>
                <label className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Output Filename</label>
                <input
                  type="text"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 text-sm font-mono bg-input border border-border rounded-sm text-foreground"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Estimated output */}
      {selected && (
        <>
          <div className="p-3 border border-primary/20 rounded-sm bg-primary/5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">Estimated Output</p>
            <p className="text-xs text-foreground mt-1">{outputName || 'output'}</p>
            <p className="text-[10px] text-muted-foreground">
              {selected.telegramMeta?.estimatedSize || `~${formatFileSize(Math.round(item.fileSize * 0.15))}`} · {selected.outputFormat}
            </p>
          </div>

          {/* Queue button */}
          <button
            onClick={handleQueue}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-mono text-sm uppercase tracking-wider rounded-sm hover:bg-primary/90 transition-colors min-h-[44px]"
          >
            <Zap className="w-4 h-4" /> Queue Conversion
          </button>
        </>
      )}
    </div>
  );
}
