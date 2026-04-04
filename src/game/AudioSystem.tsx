import { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react';
import { useI18n } from './i18n';

export type SfxType = 'click' | 'upgrade' | 'train' | 'march' | 'victory' | 'defeat' | 'shard' | 'alert';

interface AudioContextType {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  toggleMusic: () => void;
  toggleSfx: () => void;
  playSfx: (type: SfxType) => void;
}

const AudioCtx = createContext<AudioContextType | null>(null);

function createOscillatorSound(audioCtx: AudioContext, frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.15) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

const SFX_CONFIGS: Record<SfxType, { freq: number; dur: number; type: OscillatorType; notes?: number[] }> = {
  click:   { freq: 800, dur: 0.08, type: 'square' },
  upgrade: { freq: 523, dur: 0.3, type: 'sine', notes: [523, 659, 784] },
  train:   { freq: 440, dur: 0.15, type: 'triangle', notes: [440, 554] },
  march:   { freq: 330, dur: 0.2, type: 'sawtooth', notes: [330, 392, 440] },
  victory: { freq: 523, dur: 0.4, type: 'sine', notes: [523, 659, 784, 1047] },
  defeat:  { freq: 220, dur: 0.5, type: 'sawtooth', notes: [220, 196, 165] },
  shard:   { freq: 880, dur: 0.3, type: 'sine', notes: [880, 1047, 1319] },
  alert:   { freq: 660, dur: 0.15, type: 'square', notes: [660, 880] },
};

export function AudioProvider({ children }: { children: ReactNode }) {
  const [musicEnabled, setMusicEnabled] = useState(() => localStorage.getItem('af_music') !== 'false');
  const [sfxEnabled, setSfxEnabled] = useState(() => localStorage.getItem('af_sfx') !== 'false');
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new window.AudioContext();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicEnabled(prev => { const next = !prev; localStorage.setItem('af_music', String(next)); return next; });
  }, []);

  const toggleSfx = useCallback(() => {
    setSfxEnabled(prev => { const next = !prev; localStorage.setItem('af_sfx', String(next)); return next; });
  }, []);

  const playSfx = useCallback((type: SfxType) => {
    if (!sfxEnabled) return;
    try {
      const ctx = getAudioCtx();
      const config = SFX_CONFIGS[type];
      if (config.notes) {
        config.notes.forEach((freq, i) => setTimeout(() => createOscillatorSound(ctx, freq, config.dur, config.type), i * 80));
      } else {
        createOscillatorSound(ctx, config.freq, config.dur, config.type);
      }
    } catch {}
  }, [sfxEnabled, getAudioCtx]);

  return (
    <AudioCtx.Provider value={{ musicEnabled, sfxEnabled, toggleMusic, toggleSfx, playSfx }}>
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudio must be inside AudioProvider');
  return ctx;
}

export function AudioControls() {
  const { musicEnabled, sfxEnabled, toggleMusic, toggleSfx } = useAudio();
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1">
      <button onClick={toggleMusic} className={`px-2 py-1 text-xs rounded font-display transition-colors ${musicEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`} title={t('audio.music')}>
        {musicEnabled ? '🎵' : '🔇'}
      </button>
      <button onClick={toggleSfx} className={`px-2 py-1 text-xs rounded font-display transition-colors ${sfxEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`} title={t('audio.sfx')}>
        {sfxEnabled ? '🔊' : '🔈'}
      </button>
    </div>
  );
}
