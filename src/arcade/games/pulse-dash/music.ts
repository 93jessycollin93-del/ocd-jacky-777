// Backing tracks for the three levels, synthesised with scheduled Web Audio (no audio files). The notes come from
// a pure generator (so the beat can be tested), and a small player schedules them ahead of time on the audio clock.
// The game is driven by that same clock, so the beat always lines up with the obstacles. Stopping fades out and
// cancels everything that was scheduled, so a restart after a death or a pause starts clean from beat 0.

export type Layer = "kick" | "snare" | "hat" | "bass" | "arp" | "lead" | "pad";

export interface MusicSpec {
  bpm: number;
  /** MIDI note of the bass root. */
  root: number;
  /** Scale as semitone offsets from the root. */
  scale: number[];
  /** Chord root (scale degree) for each bar, looping. */
  chords: number[];
  /** 16-step patterns (one per sixteenth note of a bar). */
  kick: number[];
  snare: number[];
  hat: number[];
  /** Semitones above the chord root, -1 for a rest. */
  bass: number[];
  /** Index of the chord tone (0 root, 1 third, 2 fifth, 3 octave), -1 for a rest. */
  arp: number[];
  /** Scale degree above the chord root, null for a rest. */
  lead: (number | null)[];
  /** Layers that are playing from each bar on (the last entry at or before the bar wins). */
  arrangement: { from: number; layers: Layer[] }[];
}

export type MusicEvent =
  | { kind: "kick" | "snare" | "hat"; gain: number }
  | { kind: "bass" | "arp" | "lead"; note: number; beats: number; gain: number }
  | { kind: "pad"; notes: number[]; beats: number; gain: number };

export const STEPS_PER_BAR = 16;
export const stepSeconds = (bpm: number) => 60 / bpm / 4;
const midiToFreq = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** The MIDI note of a scale degree (degree 0 is the root; degrees past the scale wrap up an octave). */
export function scaleNote(spec: MusicSpec, degree: number) {
  const n = spec.scale.length;
  const oct = Math.floor(degree / n);
  return spec.root + oct * 12 + spec.scale[((degree % n) + n) % n];
}

export function layersAt(spec: MusicSpec, bar: number): Set<Layer> {
  let cur = spec.arrangement[0];
  for (const a of spec.arrangement) if (a.from <= bar) cur = a;
  return new Set(cur.layers);
}

/** Everything that plays on one sixteenth-note step (step 0 is the first beat of the track). */
export function eventsAtStep(spec: MusicSpec, step: number): MusicEvent[] {
  const bar = Math.floor(step / STEPS_PER_BAR);
  const i = step % STEPS_PER_BAR;
  const on = layersAt(spec, bar);
  const out: MusicEvent[] = [];
  const degree = spec.chords[bar % spec.chords.length];
  if (on.has("kick") && spec.kick[i] > 0) out.push({ kind: "kick", gain: spec.kick[i] });
  if (on.has("snare") && spec.snare[i] > 0) out.push({ kind: "snare", gain: spec.snare[i] });
  if (on.has("hat") && spec.hat[i] > 0) out.push({ kind: "hat", gain: spec.hat[i] });
  if (on.has("bass") && spec.bass[i] >= 0) {
    out.push({ kind: "bass", note: scaleNote(spec, degree) + spec.bass[i], beats: 0.22, gain: 1 });
  }
  if (on.has("arp") && spec.arp[i] >= 0) {
    const tone = [0, 2, 4, 7][spec.arp[i]];
    out.push({ kind: "arp", note: scaleNote(spec, degree + tone) + 24, beats: 0.2, gain: 1 });
  }
  const l = spec.lead[i];
  if (on.has("lead") && l !== null) {
    out.push({ kind: "lead", note: scaleNote(spec, degree + l) + 36, beats: 0.45, gain: 1 });
  }
  if (on.has("pad") && i === 0) {
    out.push({ kind: "pad", notes: [0, 2, 4].map((t) => scaleNote(spec, degree + t) + 12), beats: 4, gain: 1 });
  }
  return out;
}

// ---------------------------------------------------------------- the three tracks

const R = null;

/** Level 1: bright and steady, A minor at 120 BPM. */
export const TRACK_1: MusicSpec = {
  bpm: 120, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], chords: [0, 5, 2, 6],
  kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  snare: [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0],
  hat: [0, 0, 0.7, 0, 0, 0, 0.7, 0, 0, 0, 0.7, 0, 0, 0, 0.7, 0.4],
  bass: [0, -1, -1, 0, -1, -1, 7, -1, 0, -1, -1, 0, -1, 12, -1, 7],
  arp: [0, 1, 2, 1, 3, 2, 1, 2, 0, 1, 2, 1, 3, 2, 1, 2],
  lead: [4, R, R, 2, R, 3, R, R, 4, R, 2, R, 0, R, R, R],
  arrangement: [
    { from: 0, layers: ["kick", "pad"] },
    { from: 2, layers: ["kick", "pad", "hat"] },
    { from: 4, layers: ["kick", "pad", "hat", "bass"] },
    { from: 8, layers: ["kick", "pad", "hat", "bass", "snare", "arp"] },
    { from: 16, layers: ["kick", "pad", "hat", "bass", "snare", "arp", "lead"] },
    { from: 28, layers: ["kick", "hat", "bass", "snare", "arp", "lead"] },
  ],
};

/** Level 2: syncopated and a little darker, D minor at 132 BPM. */
export const TRACK_2: MusicSpec = {
  bpm: 132, root: 38, scale: [0, 2, 3, 5, 7, 8, 10], chords: [0, 5, 2, 6],
  kick: [1, 0, 0, 0, 1, 0, 0, 0.6, 1, 0, 0, 0, 1, 0, 0.6, 0],
  snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0.5, 1, 0, 0, 0],
  hat: [0.6, 0, 0.8, 0, 0.6, 0, 0.8, 0.4, 0.6, 0, 0.8, 0, 0.6, 0.4, 0.8, 0.4],
  bass: [0, -1, 0, -1, 7, -1, 0, -1, 0, -1, 0, -1, 12, -1, 7, 10],
  arp: [0, 2, 1, 3, 0, 2, 1, 3, 2, 1, 3, 1, 0, 2, 1, 3],
  lead: [R, 4, R, 4, 2, R, 3, R, R, 4, R, 5, 4, R, 2, R],
  arrangement: [
    { from: 0, layers: ["kick", "pad", "hat"] },
    { from: 2, layers: ["kick", "pad", "hat", "bass"] },
    { from: 4, layers: ["kick", "pad", "hat", "bass", "snare"] },
    { from: 8, layers: ["kick", "pad", "hat", "bass", "snare", "arp"] },
    { from: 16, layers: ["kick", "pad", "hat", "bass", "snare", "arp", "lead"] },
    { from: 30, layers: ["kick", "hat", "bass", "snare", "arp"] },
    { from: 32, layers: ["kick", "pad", "hat", "bass", "snare", "arp", "lead"] },
  ],
};

/** Level 3: driving and tense, E minor at 144 BPM. */
export const TRACK_3: MusicSpec = {
  bpm: 144, root: 40, scale: [0, 2, 3, 5, 7, 8, 10], chords: [0, 5, 2, 6],
  kick: [1, 0, 0, 0.5, 1, 0, 0, 0, 1, 0, 0.5, 0, 1, 0, 0, 0.5],
  snare: [0, 0, 0, 0, 1, 0, 0, 0.4, 0, 0, 0, 0, 1, 0, 0.4, 0],
  hat: [0.7, 0.4, 0.8, 0.4, 0.7, 0.4, 0.8, 0.4, 0.7, 0.4, 0.8, 0.4, 0.7, 0.4, 0.8, 0.6],
  bass: [0, 0, -1, 0, 0, -1, 12, 0, 0, 0, -1, 0, 7, -1, 10, 12],
  arp: [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 1],
  lead: [4, R, 4, 5, R, 4, 2, R, 4, R, 4, 5, R, 7, 5, R],
  arrangement: [
    { from: 0, layers: ["kick", "pad", "hat"] },
    { from: 2, layers: ["kick", "pad", "hat", "bass"] },
    { from: 4, layers: ["kick", "pad", "hat", "bass", "snare", "arp"] },
    { from: 12, layers: ["kick", "pad", "hat", "bass", "snare", "arp", "lead"] },
    { from: 26, layers: ["kick", "hat", "bass", "snare", "arp"] },
    { from: 28, layers: ["kick", "pad", "hat", "bass", "snare", "arp", "lead"] },
  ],
};

export const TRACKS: Record<string, MusicSpec> = { "neon-start": TRACK_1, "prism-run": TRACK_2, "hyper-drift": TRACK_3 };

// ---------------------------------------------------------------- the player

/** How far ahead (seconds of audio time) notes are scheduled. */
const LOOKAHEAD = 0.4;
/** The track starts this long after `start()` so the first notes are never late. */
const LEAD_IN = 0.12;

type AudioCtor = new () => AudioContext;

export class MusicPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private spec: MusicSpec | null = null;
  private t0 = 0;
  private nextStep = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private muted: () => boolean;
  private make: () => AudioContext;

  constructor(opts: { muted?: () => boolean; create?: () => AudioContext } = {}) {
    this.muted = opts.muted ?? (() => false);
    this.make =
      opts.create ??
      (() => {
        const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext) as AudioCtor;
        return new Ctor();
      });
  }

  /** Create the audio context (call from a click or key press) and wait until it is running. Resolves false if audio is unavailable. */
  async prepare(): Promise<boolean> {
    try {
      if (!this.ctx) {
        this.ctx = this.make();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state !== "running") {
        await Promise.race([this.ctx.resume(), new Promise((r) => setTimeout(r, 400))]);
      }
      return this.ctx.state === "running";
    } catch {
      this.ctx = null;
      return false;
    }
  }

  get ready() {
    return !!this.ctx && this.ctx.state === "running";
  }

  get playing() {
    return this.spec !== null;
  }

  /** Start a track from the beginning. Returns true if the audio clock now drives time. */
  start(spec: MusicSpec): boolean {
    this.stop();
    const ctx = this.ctx;
    if (!ctx || !this.master || ctx.state !== "running") return false;
    this.spec = spec;
    this.bus = ctx.createGain();
    this.bus.gain.value = 1;
    this.bus.connect(this.master);
    this.t0 = ctx.currentTime + LEAD_IN;
    this.nextStep = 0;
    this.pump();
    this.timer = setInterval(() => this.pump(), 40);
    return true;
  }

  /** Seconds since the track began on the audio clock (negative during the lead-in), or null when there is no clock. */
  time(): number | null {
    if (!this.ctx || !this.spec) return null;
    return this.ctx.currentTime - this.t0;
  }

  /** Fade out and forget everything scheduled. Safe to call at any time. */
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const ctx = this.ctx;
    const bus = this.bus;
    this.bus = null;
    this.spec = null;
    if (ctx && bus) {
      try {
        bus.gain.cancelScheduledValues(ctx.currentTime);
        bus.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
        setTimeout(() => {
          try {
            bus.disconnect();
          } catch {
            // Already gone.
          }
        }, 120);
      } catch {
        // Nothing to fade.
      }
    }
  }

  /** Pause and resume are queued, so a quick pause-then-resume can never leave the clock frozen. */
  private chain: Promise<unknown> = Promise.resolve();

  /** Freeze the clock (and so the music and the game with it). */
  pause(): Promise<unknown> {
    this.chain = this.chain.then(async () => {
      if (this.ctx && this.ctx.state === "running") await this.ctx.suspend();
    });
    return this.chain;
  }

  resume(): Promise<unknown> {
    this.chain = this.chain.then(async () => {
      if (this.ctx && this.ctx.state === "suspended") await this.ctx.resume();
    });
    return this.chain;
  }

  dispose() {
    this.stop();
    const ctx = this.ctx;
    this.ctx = null;
    try {
      void ctx?.close();
    } catch {
      // Already closed.
    }
  }

  /** Schedule every step that falls inside the lookahead window. */
  pump() {
    const ctx = this.ctx;
    const spec = this.spec;
    if (!ctx || !spec || !this.bus || ctx.state !== "running") return;
    if (this.master) this.master.gain.value = this.muted() ? 0 : 0.55;
    const sec = stepSeconds(spec.bpm);
    const horizon = ctx.currentTime + LOOKAHEAD;
    let guard = 0;
    while (this.t0 + this.nextStep * sec < horizon && guard++ < 64) {
      const at = this.t0 + this.nextStep * sec;
      if (at >= ctx.currentTime - 0.005) for (const e of eventsAtStep(spec, this.nextStep)) this.voice(e, at, spec);
      this.nextStep++;
    }
  }

  private env(g: GainNode, t: number, peak: number, attack: number, dur: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  private tone(type: OscillatorType, freq: number, t: number, dur: number, peak: number, attack = 0.005, filter?: { freq: number }) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    this.env(g, t, peak, attack, dur);
    let node: AudioNode = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(filter.freq, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(120, filter.freq * 0.35), t + dur);
      node.connect(f);
      node = f;
    }
    node.connect(g).connect(this.bus!);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private burst(t: number, dur: number, peak: number, type: BiquadFilterType, freq: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.bus!);
    src.start(t, Math.random() * 0.4);
    src.stop(t + dur + 0.05);
  }

  private voice(e: MusicEvent, t: number, spec: MusicSpec) {
    const beat = 60 / spec.bpm;
    switch (e.kind) {
      case "kick": {
        const ctx = this.ctx!;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(165, t);
        osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
        this.env(g, t, 0.9 * e.gain, 0.004, 0.3);
        osc.connect(g).connect(this.bus!);
        osc.start(t);
        osc.stop(t + 0.35);
        break;
      }
      case "snare":
        this.burst(t, 0.16, 0.35 * e.gain, "highpass", 1600);
        this.tone("triangle", 190, t, 0.1, 0.22 * e.gain);
        break;
      case "hat":
        this.burst(t, 0.045, 0.16 * e.gain, "highpass", 7500);
        break;
      case "bass":
        this.tone("sawtooth", midiToFreq(e.note), t, e.beats * beat * 1.6, 0.3, 0.006, { freq: 900 });
        break;
      case "arp":
        this.tone("square", midiToFreq(e.note), t, e.beats * beat * 1.4, 0.07, 0.004, { freq: 3200 });
        break;
      case "lead":
        this.tone("sawtooth", midiToFreq(e.note), t, e.beats * beat * 1.5, 0.1, 0.01, { freq: 2600 });
        this.tone("square", midiToFreq(e.note) * 1.004, t, e.beats * beat * 1.5, 0.04, 0.01);
        break;
      case "pad":
        for (const n of e.notes) this.tone("triangle", midiToFreq(n), t, e.beats * beat * 0.98, 0.07, 0.35);
        break;
    }
  }
}
