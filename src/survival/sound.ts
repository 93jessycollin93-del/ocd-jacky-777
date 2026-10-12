// Primal Isle sound effects, synthesised with Web Audio so there are no audio files to ship.
import type { Sfx } from "./engine/game";

let ctx: AudioContext | null = null;
let muted = false;

const MUTE_KEY = "primal-isle-muted";

try {
  muted = localStorage.getItem(MUTE_KEY) === "1";
} catch {
  // Storage blocked: default to sound on.
}

export const isMuted = () => muted;

export function setMuted(value: boolean) {
  muted = value;
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
    if (!ctx && Ctor) ctx = new Ctor();
    void ctx?.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, gain: number, cutoff: number) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(t);
}

export function playSfx(name: Sfx) {
  if (muted || !ctx || ctx.state !== "running") return;
  switch (name) {
    case "swing": return noise(0.12, 0.08, 1800);
    case "hit": noise(0.1, 0.25, 900); return tone(140, 0.12, "square", 0.08, 70);
    case "harvest": noise(0.08, 0.2, 600); return tone(220, 0.08, "triangle", 0.12, 160);
    case "kill": noise(0.25, 0.3, 500); return tone(110, 0.4, "sawtooth", 0.1, 40);
    case "hurt": return tone(300, 0.2, "sawtooth", 0.12, 120);
    case "eat": tone(500, 0.06, "sine", 0.1); return tone(420, 0.06, "sine", 0.1, undefined, 0.09);
    case "drink": return tone(700, 0.18, "sine", 0.09, 350);
    case "craft": tone(660, 0.08, "triangle", 0.12); return tone(990, 0.12, "triangle", 0.1, undefined, 0.08);
    case "place": return noise(0.15, 0.25, 400);
    case "tame": [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "triangle", 0.12, undefined, i * 0.1)); return;
    case "level": [392, 523, 659, 784].forEach((f, i) => tone(f, 0.15, "square", 0.06, undefined, i * 0.08)); return;
    case "death": return tone(220, 1.2, "sawtooth", 0.12, 55);
  }
}
