import { useState } from 'react';
import { Volume2, VolumeX, Vibrate, Play, Zap } from 'lucide-react';
import { getSoundPrefs, saveSoundPrefs, playSound, SOUND_TYPES, SOUND_PACKS, VIBRATE } from '../lib/soundEngine';

export default function SoundSettings() {
  const [prefs, setPrefs] = useState(getSoundPrefs);

  const update = (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    saveSoundPrefs(next);
  };

  const preview = (type) => {
    if (prefs.enabled) playSound(type);
    VIBRATE[type]?.();
  };

  return (
    <div className="space-y-4">
      {/* Master toggle */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl">
        <div className="flex items-center gap-3">
          {prefs.enabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
          <div>
            <p className="text-sm font-medium">Sound Effects</p>
            <p className="text-[10px] text-muted-foreground">UI interaction audio</p>
          </div>
        </div>
        <button onClick={() => update('enabled', !prefs.enabled)}
          className={`w-11 h-6 rounded-full transition-colors relative ${prefs.enabled ? 'bg-primary' : 'bg-secondary border border-border'}`}>
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${prefs.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Vibration toggle */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl">
        <div className="flex items-center gap-3">
          <Vibrate className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Haptic Feedback</p>
            <p className="text-[10px] text-muted-foreground">Vibration on interactions</p>
          </div>
        </div>
        <button onClick={() => update('vibration', !prefs.vibration)}
          className={`w-11 h-6 rounded-full transition-colors relative ${prefs.vibration ? 'bg-primary' : 'bg-secondary border border-border'}`}>
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${prefs.vibration ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Vibration intensity */}
      <div className={`px-4 py-3 bg-card border border-border rounded-xl space-y-2 ${prefs.vibration ? '' : 'opacity-40 pointer-events-none'}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Vibration intensity</span>
          <span className="text-xs font-mono text-muted-foreground">{Math.round((prefs.vibrationIntensity ?? 0.5) * 100)}%</span>
        </div>
        <input type="range" min={0} max={1} step={0.05} value={prefs.vibrationIntensity ?? 0.5}
          onChange={e => update('vibrationIntensity', parseFloat(e.target.value))}
          className="w-full accent-primary h-1.5 rounded-full" />
        <div className="flex justify-between text-[10px] text-muted-foreground"><span>off</span><span>subtle</span><span>default</span><span>strong</span><span>max</span></div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => VIBRATE.click()} className="flex-1 px-2 py-1.5 rounded-lg border border-border bg-secondary text-[11px]">Tap</button>
          <button onClick={() => VIBRATE.success()} className="flex-1 px-2 py-1.5 rounded-lg border border-border bg-secondary text-[11px]">Success</button>
          <button onClick={() => VIBRATE.error()} className="flex-1 px-2 py-1.5 rounded-lg border border-border bg-secondary text-[11px]">Error</button>
          <button onClick={() => VIBRATE.longPress()} className="flex-1 px-2 py-1.5 rounded-lg border border-border bg-secondary text-[11px]">Long</button>
        </div>
      </div>

      {/* Haptic engine */}
      <div className={`px-4 py-3 bg-card border border-border rounded-xl space-y-2 ${prefs.vibration ? '' : 'opacity-40 pointer-events-none'}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Haptic engine</span>
          <span className="text-[10px] text-muted-foreground">auto picks the best</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'auto',     label: 'Auto',     desc: 'iOS if available' },
            { key: 'standard', label: 'Standard', desc: 'navigator.vibrate' },
            { key: 'ios',      label: 'iOS',      desc: 'Telegram/WebKit' },
          ].map(opt => (
            <button key={opt.key} onClick={() => update('hapticEngine', opt.key)}
              className={`px-2 py-2 rounded-lg border text-left transition-all ${prefs.hapticEngine === opt.key ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}>
              <p className="text-xs font-medium">{opt.label}</p>
              <p className="text-[9px] text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Volume */}
      <div className="px-4 py-3 bg-card border border-border rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Volume</span>
          <span className="text-xs font-mono text-muted-foreground">{Math.round(prefs.volume * 100)}%</span>
        </div>
        <input type="range" min={0} max={1} step={0.05} value={prefs.volume}
          onChange={e => update('volume', parseFloat(e.target.value))}
          disabled={!prefs.enabled}
          className="w-full accent-primary h-1.5 rounded-full disabled:opacity-40" />
      </div>

      {/* Sound Pack */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider px-1">Sound Pack</p>
        {Object.entries(SOUND_PACKS).map(([key, pack]) => (
          <button key={key} onClick={() => { update('pack', key); setTimeout(() => playSound('click'), 50); }}
            disabled={!prefs.enabled}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all disabled:opacity-40 ${prefs.pack === key ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}>
            <div className="text-left">
              <p className="text-sm font-medium">{pack.label}</p>
              <p className="text-[10px] text-muted-foreground">{pack.desc}</p>
            </div>
            {prefs.pack === key && <Zap className="w-3.5 h-3.5 text-primary" />}
          </button>
        ))}
      </div>

      {/* Preview sounds */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider px-1">Preview Sounds</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(SOUND_TYPES).map(([type, info]) => (
            <button key={type} onClick={() => preview(type)}
              disabled={!prefs.enabled}
              className="flex items-center gap-2 px-3 py-2.5 bg-card border border-border rounded-xl hover:border-primary/40 transition-all disabled:opacity-40 text-left">
              <Play className="w-3 h-3 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs font-medium">{info.label}</p>
                <p className="text-[9px] text-muted-foreground">{info.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}