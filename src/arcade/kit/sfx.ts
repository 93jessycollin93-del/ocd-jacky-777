// Arcade sound effects, synthesised with Web Audio: no audio files. Use the presets with play(), or
// build your own from tone() and noise(). One mute switch for the whole Arcade.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;
const MUTE_KEY = "arcade:muted";

try {
  muted = localStorage.getItem(MUTE_KEY) === "1";
} catch {
  // Default: sound on.
}

export const isMuted = () => muted;

export function setMuted(value: boolean) {
  muted = value;
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 0.8, ctx.currentTime, 0.03);
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // Not persisted.
  }
}

/** Browsers only allow audio after a user gesture; the Arcade shell calls this on the first one. */
export function unlockAudio() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!ctx && Ctor) {
      ctx = new Ctor();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.8;
      master.connect(comp).connect(ctx.destination);
      const len = ctx.sampleRate;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    void ctx?.resume();
  } catch {
    ctx = null;
  }
}

const ready = () => !muted && !!ctx && !!master && ctx.state === "running";

export interface ToneOpts {
  /** Glide to this frequency by the end. */
  slide?: number;
  delay?: number;
  attack?: number;
  /** Stereo position, -1 (left) to 1 (right). */
  pan?: number;
}

export function tone(freq: number, dur: number, type: OscillatorType = "square", gain = 0.15, opts: ToneOpts = {}) {
  if (!ready()) return;
  const c = ctx!;
  const t = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slide), t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + (opts.attack ?? 0.005));
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = osc.connect(env);
  if (opts.pan && c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, opts.pan));
    node = node.connect(p);
  }
  node.connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function noise(
  dur: number, gain = 0.2,
  opts: { type?: BiquadFilterType; freq?: number; sweep?: number; q?: number; delay?: number } = {},
) {
  if (!ready() || !noiseBuf) return;
  const c = ctx!;
  const t = c.currentTime + (opts.delay ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = opts.type ?? "lowpass";
  f.frequency.setValueAtTime(opts.freq ?? 2000, t);
  if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur);
  f.Q.value = opts.q ?? 0.7;
  const env = c.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(env).connect(master!);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

/** Play notes in sequence: [frequency, seconds] pairs. */
export function melody(notes: [number, number][], type: OscillatorType = "square", gain = 0.1) {
  let at = 0;
  for (const [f, d] of notes) {
    if (f > 0) tone(f, d * 0.95, type, gain, { delay: at });
    at += d;
  }
}

export type Preset =
  | "click" | "blip" | "select" | "coin" | "jump" | "land" | "hit" | "hurt" | "explode" | "shoot" | "laser" | "pop"
  | "powerup" | "lose" | "win" | "levelup" | "swoosh" | "tick" | "error" | "place" | "flip" | "match" | "bounce"
  | "combo" | "drop" | "slide";

export function play(name: Preset, pitch = 1) {
  if (!ready()) return;
  const p = pitch;
  switch (name) {
    case "click": return tone(900 * p, 0.04, "square", 0.08);
    case "blip": return tone(660 * p, 0.07, "square", 0.1);
    case "select": tone(523 * p, 0.06, "triangle", 0.12); return tone(784 * p, 0.08, "triangle", 0.12, { delay: 0.05 });
    case "coin": tone(988 * p, 0.06, "square", 0.1); return tone(1319 * p, 0.18, "square", 0.1, { delay: 0.06 });
    case "jump": return tone(300 * p, 0.16, "square", 0.1, { slide: 700 * p });
    case "land": return noise(0.08, 0.2, { freq: 500 });
    case "hit": noise(0.08, 0.3, { freq: 1200 }); return tone(180 * p, 0.1, "square", 0.1, { slide: 90 * p });
    case "hurt": return tone(400 * p, 0.25, "sawtooth", 0.14, { slide: 120 * p });
    case "explode": noise(0.6, 0.5, { freq: 1200, sweep: 120 }); return tone(90 * p, 0.5, "sine", 0.4, { slide: 30 });
    case "shoot": noise(0.07, 0.2, { type: "highpass", freq: 2500 }); return tone(880 * p, 0.08, "square", 0.08, { slide: 220 * p });
    case "laser": return tone(1400 * p, 0.14, "sawtooth", 0.09, { slide: 300 * p });
    case "pop": return tone(520 * p, 0.07, "sine", 0.2, { slide: 1100 * p });
    case "powerup": return melody([[523 * p, 0.06], [659 * p, 0.06], [784 * p, 0.06], [1046 * p, 0.12]], "square", 0.09);
    case "lose": return melody([[392, 0.16], [330, 0.16], [262, 0.16], [196, 0.4]], "triangle", 0.14);
    case "win": return melody([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.1], [784, 0.1], [1046, 0.35]], "square", 0.1);
    case "levelup": return melody([[392 * p, 0.08], [523 * p, 0.08], [659 * p, 0.08], [784 * p, 0.2]], "triangle", 0.13);
    case "swoosh": return noise(0.22, 0.25, { type: "bandpass", freq: 600, sweep: 3200, q: 1.2 });
    case "tick": return tone(1800 * p, 0.02, "square", 0.05);
    case "error": return tone(140, 0.22, "square", 0.12);
    case "place": noise(0.05, 0.25, { freq: 900 }); return tone(220 * p, 0.06, "triangle", 0.14);
    case "flip": return noise(0.06, 0.18, { type: "bandpass", freq: 2600, q: 2 });
    case "match": tone(784 * p, 0.08, "sine", 0.14); return tone(1175 * p, 0.14, "sine", 0.12, { delay: 0.06 });
    case "bounce": return tone(240 * p, 0.08, "sine", 0.2, { slide: 160 * p });
    case "combo": return tone(660 * p, 0.12, "square", 0.1, { slide: 1320 * p });
    case "drop": return tone(500 * p, 0.12, "triangle", 0.14, { slide: 180 * p });
    case "slide": return noise(0.12, 0.12, { type: "bandpass", freq: 1500, q: 1 });
  }
}
