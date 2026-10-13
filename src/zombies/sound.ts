// Dead Hours sound, synthesised with Web Audio (no audio files): gunshots per weapon type, zombie
// groans placed left/right by where they are, boards, buys, round bells, a music-box Mystery Box, wind.
import type { Sfx } from "./engine/game";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let noiseBuf: AudioBuffer | null = null;
let ambient: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

const MUTE_KEY = "dead-hours-muted";

try {
  muted = localStorage.getItem(MUTE_KEY) === "1";
} catch {
  // Storage blocked: default to sound on.
}

export const isMuted = () => muted;

export function setMuted(value: boolean) {
  muted = value;
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 0.9, ctx.currentTime, 0.05);
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // Not persisted; fine for this session.
  }
}

/** Browsers only allow audio after a user gesture, so call this from the Play button. */
export function unlockAudio() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!ctx && Ctor) {
      ctx = new Ctor();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(comp).connect(ctx.destination);
      const len = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    void ctx?.resume();
  } catch {
    ctx = null;
  }
}

const ready = () => !!ctx && !!master && ctx.state === "running";

interface Out {
  node: AudioNode;
}

/** A gain + stereo pan chain into the master bus. */
function out(gain: number, pan = 0, delay = 0): Out & { gain: GainNode; t: number } {
  const c = ctx!;
  const g = c.createGain();
  g.gain.value = gain;
  const t = c.currentTime + delay;
  if (c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(master!);
  } else {
    g.connect(master!);
  }
  return { node: g, gain: g, t };
}

function tone(
  freq: number, dur: number, type: OscillatorType, gain: number,
  opts: { slide?: number; delay?: number; pan?: number; attack?: number; vibrato?: number } = {},
) {
  if (!ready()) return;
  const c = ctx!;
  const o = out(1, opts.pan ?? 0, opts.delay ?? 0);
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, o.t);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slide), o.t + dur);
  if (opts.vibrato) {
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = 5 + Math.random() * 3;
    lg.gain.value = opts.vibrato;
    lfo.connect(lg).connect(osc.frequency);
    lfo.start(o.t);
    lfo.stop(o.t + dur + 0.05);
  }
  const a = opts.attack ?? 0.005;
  env.gain.setValueAtTime(0.0001, o.t);
  env.gain.exponentialRampToValueAtTime(gain, o.t + a);
  env.gain.exponentialRampToValueAtTime(0.0001, o.t + dur);
  osc.connect(env).connect(o.node);
  osc.start(o.t);
  osc.stop(o.t + dur + 0.05);
}

function noise(
  dur: number, gain: number,
  opts: { type?: BiquadFilterType; freq?: number; q?: number; sweep?: number; delay?: number; pan?: number; attack?: number } = {},
) {
  if (!ready() || !noiseBuf) return;
  const c = ctx!;
  const o = out(1, opts.pan ?? 0, opts.delay ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = opts.type ?? "lowpass";
  f.frequency.setValueAtTime(opts.freq ?? 2000, o.t);
  if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, o.t + dur);
  f.Q.value = opts.q ?? 0.7;
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, o.t);
  env.gain.exponentialRampToValueAtTime(gain, o.t + (opts.attack ?? 0.003));
  env.gain.exponentialRampToValueAtTime(0.0001, o.t + dur);
  src.connect(f).connect(env).connect(o.node);
  src.start(o.t, Math.random() * 1.5);
  src.stop(o.t + dur + 0.05);
}

const GUN: Record<string, { len: number; cut: number; thump: number; body: number; tail?: number }> = {
  pistol: { len: 0.13, cut: 3800, thump: 170, body: 0.5 },
  rifle: { len: 0.2, cut: 5200, thump: 120, body: 0.65, tail: 0.35 },
  smg: { len: 0.09, cut: 4200, thump: 150, body: 0.45 },
  shotgun: { len: 0.38, cut: 2400, thump: 85, body: 0.9, tail: 0.5 },
  lmg: { len: 0.15, cut: 3400, thump: 110, body: 0.6, tail: 0.25 },
  sniper: { len: 0.45, cut: 6500, thump: 95, body: 0.85, tail: 0.8 },
  revolver: { len: 0.32, cut: 3200, thump: 95, body: 0.85, tail: 0.45 },
};

function gunshot(cls: string, upgraded: boolean) {
  const g = GUN[cls] ?? GUN.pistol;
  noise(g.len, g.body, { freq: g.cut, sweep: 400 });
  noise(0.03, g.body * 0.6, { type: "highpass", freq: 3000 });
  tone(g.thump, g.len * 1.2, "sine", g.body * 0.9, { slide: g.thump * 0.35 });
  if (g.tail) noise(g.tail, g.body * 0.18, { freq: 700, delay: 0.04, attack: 0.03 });
  if (upgraded) tone(2600, 0.16, "sine", 0.12, { slide: 700 });
}

/** Volume and stereo position of a sound from where it happened, relative to you. */
export interface Listener {
  x: number;
  z: number;
  yaw: number;
}

function place(s: Sfx, l: Listener | null): { gain: number; pan: number } {
  if (s.x === undefined || s.z === undefined || !l) return { gain: 1, pan: 0 };
  const dx = s.x - l.x;
  const dz = s.z - l.z;
  const d = Math.hypot(dx, dz);
  // Right of you is (-cos yaw, sin yaw) in this world.
  const pan = d > 0.5 ? ((-Math.cos(l.yaw) * dx + Math.sin(l.yaw) * dz) / d) * 0.8 : 0;
  return { gain: 1 / (1 + d * 0.11), pan };
}

const MUSIC_BOX = [1046, 1318, 1568, 1318, 1175, 1396, 1760, 1396, 988, 1175, 1568, 1175, 1046, 1318, 1568, 2093];

export function playSfx(s: Sfx, listener: Listener | null = null) {
  if (muted || !ready()) return;
  const { gain: v, pan } = place(s, listener);
  switch (s.name) {
    case "shot": return gunshot(s.cls ?? "pistol", !!s.upgraded);
    case "zap":
      tone(1700, 0.22, "sawtooth", 0.18, { slide: 180 });
      tone(900, 0.25, "square", 0.08, { slide: 2400, vibrato: 400 });
      return noise(0.18, 0.25, { type: "bandpass", freq: 3000, q: 4 });
    case "empty": return noise(0.03, 0.25, { type: "highpass", freq: 2500 });
    case "reload":
      noise(0.04, 0.35, { type: "bandpass", freq: 1800, q: 3 });
      return noise(0.05, 0.4, { type: "bandpass", freq: 1200, q: 3, delay: 0.35 });
    case "swap": return noise(0.06, 0.25, { type: "bandpass", freq: 1500, q: 2 });
    case "hit":
      return noise(0.08, 0.35 * v, { freq: 700, pan });
    case "headshot":
      noise(0.05, 0.5 * v, { type: "bandpass", freq: 2200, q: 2, pan });
      return noise(0.18, 0.4 * v, { freq: 500, pan, delay: 0.01 });
    case "kill":
      noise(0.2, 0.4 * v, { freq: 500, pan });
      return tone(95, 0.35, "sawtooth", 0.12 * v, { slide: 45, pan });
    case "groan": {
      const f = 75 + Math.random() * 70;
      const dur = 0.8 + Math.random() * 0.8;
      tone(f, dur, "sawtooth", 0.22 * v, { slide: f * (0.7 + Math.random() * 0.4), pan, attack: 0.15, vibrato: 6 });
      return noise(dur, 0.12 * v, { type: "bandpass", freq: 650 + Math.random() * 300, q: 6, pan, attack: 0.15 });
    }
    case "attack":
      noise(0.22, 0.4 * v, { type: "bandpass", freq: 1100, q: 2, pan, sweep: 500 });
      return tone(190, 0.25, "sawtooth", 0.18 * v, { slide: 120, pan, vibrato: 20 });
    case "board_break":
      noise(0.14, 0.55 * v, { type: "highpass", freq: 1200, pan });
      return tone(260, 0.16, "triangle", 0.25 * v, { slide: 110, pan });
    case "board_fix":
      noise(0.05, 0.45, { freq: 900 });
      return noise(0.05, 0.4, { freq: 900, delay: 0.12 });
    case "buy":
      tone(880, 0.12, "triangle", 0.18);
      return tone(1320, 0.22, "triangle", 0.16, { delay: 0.09 });
    case "deny": return tone(110, 0.28, "square", 0.12);
    case "door":
      noise(1.0, 0.5, { freq: 320, attack: 0.05 });
      return tone(55, 0.9, "sine", 0.4, { slide: 35 });
    case "power":
      noise(0.25, 0.7, { freq: 600 });
      tone(55, 2.2, "sawtooth", 0.18, { slide: 120, attack: 0.4 });
      return tone(110, 2.2, "sine", 0.2, { slide: 240, attack: 0.4 });
    case "perk":
      [0, 0.22, 0.44].forEach((d) => tone(320 + Math.random() * 60, 0.12, "sine", 0.2, { slide: 160, delay: d }));
      return [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, "square", 0.06, { delay: 0.75 + i * 0.11 }));
    case "box_open":
      return MUSIC_BOX.forEach((f, i) => tone(f, 0.5, "triangle", 0.09, { delay: i * 0.21 }));
    case "box_take": return [784, 1046, 1568].forEach((f, i) => tone(f, 0.25, "triangle", 0.12, { delay: i * 0.07 }));
    case "box_leave":
      [0, 0.25, 0.5].forEach((d) => noise(0.18, 0.4, { type: "bandpass", freq: 1400, q: 5, delay: d, sweep: 900 }));
      return tone(330, 1.2, "triangle", 0.12, { slide: 110, delay: 0.6 });
    case "upgrade":
      tone(70, 3.2, "sawtooth", 0.12, { slide: 140, attack: 0.3 });
      return [0.6, 1.4, 2.2, 3.0].forEach((d) => noise(0.08, 0.5, { freq: 1500, delay: d }));
    case "powerup_spawn": return tone(1200, 0.6, "sine", 0.08 * v, { slide: 1800, pan, vibrato: 30 });
    case "powerup":
      tone(98, 1.2, "sawtooth", 0.16, { attack: 0.05 });
      tone(147, 1.2, "sawtooth", 0.1, { attack: 0.05 });
      return [784, 988, 1175].forEach((f, i) => tone(f, 0.3, "triangle", 0.12, { delay: 0.1 + i * 0.08 }));
    case "round_start":
      // A slow tolling bell.
      return [0, 1.1, 2.2].forEach((d) => {
        tone(98, 2.6, "sine", 0.32, { delay: d, attack: 0.01 });
        tone(196, 1.8, "sine", 0.12, { delay: d });
        tone(263, 1.4, "sine", 0.07, { delay: d });
      });
    case "round_end":
      return [440, 392, 349, 330, 262, 220].forEach((f, i) => tone(f, 0.6, "triangle", 0.12, { delay: i * 0.22 }));
    case "hurt":
      noise(0.12, 0.5, { freq: 400 });
      return tone(210, 0.22, "sawtooth", 0.14, { slide: 110 });
    case "down":
      return tone(80, 1.6, "sine", 0.35, { slide: 40 });
    case "revive":
      return [262, 330, 392, 523].forEach((f, i) => tone(f, 0.25, "triangle", 0.14, { delay: i * 0.1 }));
    case "game_over":
      tone(110, 3.5, "sawtooth", 0.15, { slide: 40, attack: 0.1 });
      return [220, 208, 196, 185].forEach((f, i) => tone(f, 0.9, "sine", 0.18, { delay: i * 0.6 }));
    case "explosion":
      noise(1.3, 0.9 * Math.max(0.35, v), { freq: 900, sweep: 120, pan });
      return tone(60, 0.8, "sine", 0.7 * Math.max(0.35, v), { slide: 24, pan });
    case "throw": return noise(0.25, 0.25, { type: "bandpass", freq: 800, sweep: 2400, q: 1.5 });
    case "knife": return noise(0.16, 0.35, { type: "highpass", freq: 2000, sweep: 6000 });
  }
}

/** A heartbeat when you're badly hurt. */
export function heartbeat() {
  if (muted || !ready()) return;
  tone(55, 0.14, "sine", 0.45, { slide: 40 });
  tone(52, 0.14, "sine", 0.35, { slide: 38, delay: 0.22 });
}

/** Low wind outside, looping while you play. */
export function startAmbient() {
  if (!ready() || ambient || !noiseBuf) return;
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 380;
  const lfo = c.createOscillator();
  const lg = c.createGain();
  lfo.frequency.value = 0.08;
  lg.gain.value = 180;
  lfo.connect(lg).connect(f.frequency);
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.gain.setTargetAtTime(0.09, c.currentTime, 1.5);
  src.connect(f).connect(gain).connect(master!);
  src.start();
  lfo.start();
  ambient = { src, gain };
}

export function stopAmbient() {
  if (!ambient || !ctx) return;
  const a = ambient;
  ambient = null;
  a.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
  a.src.stop(ctx.currentTime + 1.5);
}
