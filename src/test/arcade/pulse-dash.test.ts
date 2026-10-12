import { describe, it, expect, vi } from "vitest";
import {
  CEIL, JUMP_H, PAD_MULT, STEP, emptyProgress, newRun, percent, physics, press, recordAttempt, release, scoreOf, speedOf, spb, tick,
  type Level, type Obj, type PulseState,
} from "@/arcade/games/pulse-dash/logic";
import { LEVELS } from "@/arcade/games/pulse-dash/levels";
import { solve } from "@/arcade/games/pulse-dash/solver";
import { MusicPlayer, STEPS_PER_BAR, TRACKS, eventsAtStep, layersAt, stepSeconds } from "@/arcade/games/pulse-dash/music";

/** A tiny level for rules tests: 120 BPM, nothing in it but what the test adds. */
function mini(objects: Obj[], bpm = 120, endX = 500): Level {
  return {
    id: "t", name: "Test", difficulty: "Easy", bpm, endX, endBeats: 100, objects: objects.slice().sort((a, b) => a.x - b.x), zones: [{ beat: 0, m: 1 }],
    theme: { top: "#000000", bottom: "#000000", accent: "#ffffff", accent2: "#ffffff", spike: "#ffffff" },
  };
}

function run(s: PulseState, seconds: number) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n && s.alive && !s.won; i++) tick(s);
}

/** Step until the cube is airborne and back down; returns the number of ticks, and the apex reached. */
function jumpArc(s: PulseState) {
  press(s);
  tick(s);
  release(s);
  let ticks = 1;
  let apex = s.y;
  while (!s.onGround && ticks < 2000) {
    tick(s);
    apex = Math.max(apex, s.y);
    ticks++;
  }
  return { ticks, apex };
}

describe("pulse dash", () => {
  it("a jump takes exactly one beat and reaches the same height at every tempo", () => {
    for (const bpm of [100, 120, 132, 144, 160]) {
      const s = newRun(mini([], bpm));
      const { ticks, apex } = jumpArc(s);
      expect(ticks * STEP).toBeGreaterThan(spb(s.level) - 0.03);
      expect(ticks * STEP).toBeLessThan(spb(s.level) + 0.03);
      expect(apex).toBeGreaterThan(JUMP_H - 0.1);
      expect(apex).toBeLessThan(JUMP_H + 0.05);
      expect(s.y).toBe(0);
      expect(s.onGround).toBe(true);
    }
    expect(physics(mini([], 120)).v0).toBeCloseTo(17.6, 6);
  });

  it("holding the button jumps again every landing; a single tap jumps once", () => {
    const h = newRun(mini([]));
    press(h);
    let jumps = 0;
    for (let i = 0; i < 120 * 3; i++) {
      tick(h);
      jumps += h.events.filter((e) => e === "jump").length;
      h.events.length = 0;
    }
    expect(jumps).toBe(6);
    const t = newRun(mini([]));
    press(t);
    tick(t);
    release(t);
    let tapJumps = t.events.filter((e) => e === "jump").length;
    for (let i = 0; i < 120 * 3; i++) {
      t.events.length = 0;
      tick(t);
      tapJumps += t.events.filter((e) => e === "jump").length;
    }
    expect(tapJumps).toBe(1);
    // A press just before landing is remembered.
    const b = newRun(mini([]));
    jumpArc(newRun(mini([])));
    press(b);
    tick(b);
    release(b);
    while (b.y < 1) tick(b);
    while (b.vy > 0) tick(b);
    while (b.y > 0.4) tick(b);
    b.events.length = 0;
    press(b);
    release(b);
    run(b, 0.2);
    expect(b.events.filter((e) => e === "jump").length).toBe(1);
  });

  it("spikes kill, a well-timed jump clears them, and grazing the tip is forgiven", () => {
    const L = mini([{ t: "spike", x: 20, y: 0 }]);
    const dead = newRun(L);
    run(dead, 5);
    expect(dead.alive).toBe(false);
    expect(dead.x).toBeGreaterThan(18);
    expect(dead.x).toBeLessThan(21);
    // Take off about half a beat before the spike.
    const ok = newRun(L);
    const takeoffX = 20 - 2;
    while (ok.x < takeoffX) tick(ok);
    press(ok);
    tick(ok);
    release(ok);
    run(ok, 1.5);
    expect(ok.alive).toBe(true);
    expect(ok.x).toBeGreaterThan(30);
    // A spike hanging from the ceiling is a hazard too, but not on the floor.
    const ceil = newRun(mini([{ t: "spike", x: 20, y: CEIL - 1, down: true }]));
    run(ceil, 4);
    expect(ceil.alive).toBe(true);
  });

  it("block tops are safe to land on and run across; block sides and undersides kill", () => {
    // Jump onto a low block: stay alive and end up standing on it.
    const L = mini([{ t: "block", x: 20, y: 0, w: 8, h: 1 }]);
    const s = newRun(L);
    while (s.x < 20 - 2.2) tick(s);
    press(s);
    tick(s);
    release(s);
    let onTop = false;
    for (let i = 0; i < 120 && s.alive && !onTop; i++) {
      tick(s);
      if (s.onGround && s.y === 1) onTop = true;
    }
    expect(s.alive).toBe(true);
    expect(onTop).toBe(true);
    run(s, 0.2);
    expect(s.y).toBe(1);
    expect(s.alive).toBe(true);
    // Off the end of the block it drops back to the floor.
    run(s, 1);
    expect(s.y).toBe(0);
    expect(s.alive).toBe(true);
    // Running into the side kills.
    const side = newRun(mini([{ t: "block", x: 20, y: 0, w: 4, h: 1 }]));
    run(side, 4);
    expect(side.alive).toBe(false);
    expect(side.x).toBeLessThan(20);
    // So does jumping up into the underside of a low ceiling.
    const tunnel = newRun(mini([{ t: "block", x: 20, y: 2, w: 8, h: CEIL - 2 }]));
    while (tunnel.x < 17) tick(tunnel);
    press(tunnel);
    run(tunnel, 1);
    expect(tunnel.alive).toBe(false);
    // But staying on the floor goes straight under it.
    const under = newRun(mini([{ t: "block", x: 20, y: 2, w: 8, h: CEIL - 2 }], 120, 60));
    run(under, 8);
    expect(under.won).toBe(true);
  });

  it("a jump pad throws you much higher than a jump, once per pass", () => {
    const s = newRun(mini([{ t: "pad", x: 10, y: 0 }]));
    let apex = 0;
    run(s, 3);
    // (the pad is hit automatically as we run over it)
    const t = newRun(mini([{ t: "pad", x: 10, y: 0 }]));
    for (let i = 0; i < 120 * 2; i++) {
      tick(t);
      apex = Math.max(apex, t.y);
    }
    expect(apex).toBeGreaterThan(JUMP_H * PAD_MULT * PAD_MULT * 0.9);
    expect(apex).toBeLessThan(JUMP_H * PAD_MULT * PAD_MULT * 1.05);
    expect(t.events.filter((e) => e === "pad").length).toBeLessThanOrEqual(1);
    expect(s.alive).toBe(true);
  });

  it("an orb needs a press in mid-air (holding is not enough) and works once", () => {
    const L = mini([{ t: "orb", x: 30, y: 2.2 }]);
    // Jump so the cube peaks over the orb, then press again: it jumps a second time.
    const a = newRun(L);
    while (a.x < 30 - 2) tick(a);
    press(a);
    tick(a);
    release(a);
    while (a.x < 30 - 0.6) tick(a);
    press(a);
    tick(a);
    release(a);
    let apex = a.y;
    for (let i = 0; i < 90; i++) {
      tick(a);
      apex = Math.max(apex, a.y);
    }
    expect(a.events).toContain("orb");
    expect(apex).toBeGreaterThan(JUMP_H + 1.5);
    // Merely holding through it does nothing.
    const b = newRun(L);
    while (b.x < 30 - 2) tick(b);
    press(b);
    run(b, 1.2);
    expect(b.events).not.toContain("orb");
  });

  it("gravity portals flip the pull: you fall to the ceiling, jump downward, and the next portal flips back", () => {
    const L = mini([
      { t: "grav", x: 12, y: 0, dir: -1 },
      { t: "grav", x: 60, y: CEIL - 3, dir: 1 },
    ]);
    const s = newRun(L);
    while (s.x < 14) tick(s);
    expect(s.grav).toBe(-1);
    run(s, 1.5);
    expect(s.grav).toBe(-1);
    expect(s.y).toBe(CEIL - 1);
    expect(s.onGround).toBe(true);
    // A jump now goes down.
    press(s);
    tick(s);
    release(s);
    tick(s);
    expect(s.vy).toBeLessThan(0);
    let low = s.y;
    for (let i = 0; i < 60; i++) {
      tick(s);
      low = Math.min(low, s.y);
    }
    expect(CEIL - 1 - low).toBeGreaterThan(JUMP_H - 0.15);
    run(s, 8);
    expect(s.grav).toBe(1);
    expect(s.y).toBe(0);
  });

  it("speed portals change how fast the cube runs", () => {
    const L = mini([{ t: "speed", x: 20, m: 1.5 }], 120, 1000);
    const s = newRun(L);
    run(s, 1);
    const x1 = s.x;
    expect(x1).toBeCloseTo(speedOf(L, 1), 1);
    while (s.x < 22) tick(s);
    expect(s.speedM).toBe(1.5);
    const before = s.x;
    run(s, 1);
    expect(s.x - before).toBeCloseTo(speedOf(L, 1.5), 1);
    expect(speedOf(L, 1)).toBe(8);
  });

  it("the cube spins in the air (a full turn per jump) and snaps upright when it lands", () => {
    const s = newRun(mini([]));
    press(s);
    tick(s);
    release(s);
    let mid = 0;
    for (let i = 0; i < 30; i++) tick(s);
    mid = s.rot;
    expect(mid).toBeGreaterThan(0.5);
    while (!s.onGround) tick(s);
    expect(Math.abs(s.rot / (Math.PI * 2) - Math.round(s.rot / (Math.PI * 2)))).toBeLessThan(1e-9);
    expect(s.rot).toBeGreaterThan(5.5);
    // Standing on the ceiling it is upside down.
    const c = newRun(mini([{ t: "grav", x: 12, y: 0, dir: -1 }]));
    run(c, 3);
    expect(c.onGround).toBe(true);
    expect(Math.abs(((c.rot - Math.PI) / (Math.PI * 2)) % 1)).toBeLessThan(1e-6);
  });

  it("each level is 60 to 90 seconds, in beats, with its first obstacle after a run-in, and uses what it should", () => {
    const kinds = new Set<string>();
    for (const L of LEVELS) {
      const secs = L.endBeats * spb(L);
      expect(secs).toBeGreaterThanOrEqual(60);
      expect(secs).toBeLessThanOrEqual(90);
      expect(L.objects.length).toBeGreaterThan(40);
      for (let i = 1; i < L.objects.length; i++) expect(L.objects[i].x).toBeGreaterThanOrEqual(L.objects[i - 1].x);
      expect(L.objects[0].x).toBeGreaterThan(speedOf(L, 1) * spb(L) * 6);
      expect(L.objects[L.objects.length - 1].x).toBeLessThan(L.endX - 8);
      expect(TRACKS[L.id].bpm).toBe(L.bpm);
      for (const o of L.objects) kinds.add(o.t);
    }
    expect([...kinds].sort()).toEqual(["block", "grav", "orb", "pad", "speed", "spike"]);
    expect(LEVELS.map((l) => l.difficulty)).toEqual(["Easy", "Medium", "Hard"]);
    expect(LEVELS[0].bpm).toBeLessThan(LEVELS[2].bpm);
  });

  it("obstacles line up with the beat: the cube reaches each lone spike exactly on or half a beat off the pulse, at any speed", () => {
    for (const L of LEVELS) {
      const spikes = L.objects.filter((o) => o.t === "spike" && !o.down) as Extract<Obj, { t: "spike" }>[];
      const lone = spikes.filter((o) => !spikes.some((p) => p !== o && Math.abs(p.x - o.x) < 1.5));
      expect(lone.length).toBeGreaterThan(10);
      // Fly an empty copy of the level (only the speed portals) and note when the cube's left edge reaches each spike.
      const s = newRun({ ...L, objects: L.objects.filter((o) => o.t === "speed") });
      for (const o of lone) {
        while (s.x < o.x && s.won === false) tick(s);
        const beat = s.t / spb(L);
        const off = Math.abs(((beat * 2) % 1) - 0.5) * 2; // 0 when on a half beat
        expect(Math.min(off, 1 - off)).toBeLessThan(0.12); // within a tick or two
      }
    }
  });

  it("every level can be beaten by a bot that only presses on a coarse timing grid, and can't be won by holding or doing nothing", () => {
    for (const L of LEVELS) {
      const r = solve(L, 12);
      expect(r.ok).toBe(true);
      const idle = newRun(L);
      run(idle, 200);
      expect(idle.alive).toBe(false);
      expect(percent(idle)).toBeLessThan(10);
      const hold = newRun(L);
      press(hold);
      run(hold, 200);
      expect(hold.alive).toBe(false);
      expect(percent(hold)).toBeLessThan(30);
    }
  }, 120000);

  it("score is levels completed x 100 plus the best percent on the hardest level attempted", () => {
    let p = emptyProgress(3);
    expect(scoreOf(p)).toBe(0);
    p = recordAttempt(p, 0, 40, false);
    expect(scoreOf(p)).toBe(40);
    p = recordAttempt(p, 0, 100, true);
    expect(scoreOf(p)).toBe(100 + 100);
    p = recordAttempt(p, 1, 35, false);
    expect(scoreOf(p)).toBe(100 + 35);
    p = recordAttempt(p, 1, 20, false);
    expect(p.best[1]).toBe(35);
    expect(p.attempts).toEqual([2, 2, 0]);
    p = recordAttempt(p, 1, 100, true);
    p = recordAttempt(p, 2, 61, false);
    expect(scoreOf(p)).toBe(200 + 61);
    expect(percent(newRun(LEVELS[0]))).toBe(0);
  });
});

describe("pulse dash music", () => {
  it("is built on the beat: kicks on the quarter notes, the same events every time, layers join in over time", () => {
    for (const L of LEVELS) {
      const spec = TRACKS[L.id];
      expect(stepSeconds(spec.bpm) * 4).toBeCloseTo(spb(L), 9);
      let kicks = 0;
      for (let step = 0; step < STEPS_PER_BAR * 8; step++) {
        const ev = eventsAtStep(spec, step);
        const kick = ev.some((e) => e.kind === "kick");
        if (kick) {
          kicks++;
          expect(step % 4 === 0 || spec.kick[step % 16] < 1).toBe(true);
        }
        if (step % 4 === 0 && step % 16 < 16) expect(spec.kick[step % 16]).toBeGreaterThan(0);
      }
      expect(kicks).toBeGreaterThanOrEqual(8 * 4);
      expect(JSON.stringify(eventsAtStep(spec, 37))).toBe(JSON.stringify(eventsAtStep(spec, 37)));
      expect(layersAt(spec, 0).size).toBeLessThan(layersAt(spec, 20).size);
      expect(layersAt(spec, 20).has("lead")).toBe(true);
      // Every note is a sane frequency range (MIDI 20..110).
      for (let step = 0; step < 400; step++) {
        for (const e of eventsAtStep(spec, step)) {
          if ("note" in e) {
            expect(e.note).toBeGreaterThan(20);
            expect(e.note).toBeLessThan(110);
          }
        }
      }
    }
  });

  it("starts, stops and restarts cleanly: stopping cancels the schedule, restart begins again at beat 0, pausing freezes the clock", async () => {
    vi.useFakeTimers();
    let now = 0;
    let state: "running" | "suspended" = "suspended";
    let started = 0;
    const node = (): unknown =>
      new Proxy(function () {}, {
        get: (_t, k) => (k === "start" ? () => void started++ : k === "connect" ? () => node() : k === "getChannelData" ? () => new Float32Array(8) : node()),
        apply: () => node(),
        set: () => true,
      });
    const fake = {
      get currentTime() {
        return now;
      },
      get state() {
        return state;
      },
      sampleRate: 8,
      destination: node(),
      createGain: () => node(),
      createOscillator: () => node(),
      createBiquadFilter: () => node(),
      createBufferSource: () => node(),
      createBuffer: () => node(),
      resume: async () => void (state = "running"),
      suspend: async () => void (state = "suspended"),
      close: async () => {},
    } as unknown as AudioContext;
    const music = new MusicPlayer({ create: () => fake });
    expect(music.time()).toBeNull();
    expect(music.start(TRACKS["neon-start"])).toBe(false); // no context yet
    const p = music.prepare();
    await vi.advanceTimersByTimeAsync(10);
    expect(await p).toBe(true);
    expect(music.ready).toBe(true);

    expect(music.start(TRACKS["neon-start"])).toBe(true);
    expect(music.time()).toBeCloseTo(-0.12, 6);
    expect(started).toBeGreaterThan(0);
    // Time passes: more of the track is scheduled.
    const before = started;
    now = 1.5;
    vi.advanceTimersByTime(100);
    expect(music.time()).toBeCloseTo(1.38, 6);
    expect(started).toBeGreaterThan(before);

    // Death: stop. Nothing more is scheduled and there is no clock.
    music.stop();
    const afterStop = started;
    now = 4;
    vi.advanceTimersByTime(500);
    expect(started).toBe(afterStop);
    expect(music.time()).toBeNull();
    expect(music.playing).toBe(false);

    // Restart: the clock starts over from the beginning of the track.
    expect(music.start(TRACKS["neon-start"])).toBe(true);
    expect(music.time()).toBeCloseTo(-0.12, 6);
    expect(started).toBeGreaterThan(afterStop);

    // Pause freezes the audio clock; resume lets it go again.
    await music.pause();
    expect(state).toBe("suspended");
    await music.resume();
    expect(state).toBe("running");
    music.dispose();
    vi.useRealTimers();
  });
});
