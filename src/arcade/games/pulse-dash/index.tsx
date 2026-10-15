// Pulse Dash: a rhythm auto-runner. Rules live in logic.ts, the three levels in levels.ts, the synthesised
// backing tracks in music.ts and the neon art in art.ts. This file runs the loop (driven by the audio clock so the
// beat always lines up with the obstacles), reads input and handles the menu / pause / death / complete flow.
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { clamp, damp, DISPLAY_FONT, Particles, Shake, text, withAlpha } from "../../kit/draw";
import { play, tone, isMuted } from "../../kit/sfx";
import { loadState, saveState } from "../../kit/storage";
import { Overlay, PrimaryButton, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { BLOCK, CEIL_Y, GROUND_Y, VIEW_H, cubeScreen, drawBackground, drawCube, drawFinish, drawFloor, drawObject, py, type Frame } from "./art";
import { useBoxSize } from "./fit";
import { LEVELS } from "./levels";
import {
  advanceTo, emptyProgress, newRun, percent, press, recordAttempt, release, scoreOf, spb, speedOf,
  type Progress, type PulseState,
} from "./logic";
import { meta } from "./meta";
import { MusicPlayer, TRACKS } from "./music";

type Phase = "menu" | "play" | "paused" | "complete";

const PROGRESS_KEY = "pulse-dash:progress";
const JUMP_KEYS = new Set(["Space", "ArrowUp", "KeyW"]);
const DIFF_COLOR = { Easy: "#4ade80", Medium: "#facc15", Hard: "#f87171" };

function loadProgress(): Progress {
  const base = emptyProgress(LEVELS.length);
  const raw = loadState<Partial<Progress>>(PROGRESS_KEY);
  if (!raw) return base;
  return {
    best: base.best.map((_, i) => Math.max(0, Math.min(100, Number(raw.best?.[i]) || 0))),
    done: base.done.map((_, i) => !!raw.done?.[i]),
    attempts: base.attempts.map((_, i) => Math.max(0, Number(raw.attempts?.[i]) || 0)),
  };
}

export default function PulseDash({ touch, best, submitScore }: GameProps) {
  const root = useRef<HTMLDivElement>(null);
  const box = useBoxSize(root);
  const music = useRef<MusicPlayer | null>(null);
  if (!music.current) music.current = new MusicPlayer({ muted: isMuted });
  const [phase, setPhase] = useState<Phase>("menu");
  const phaseRef = useRef<Phase>("menu");
  const [levelIdx, setLevelIdx] = useState(0);
  const levelRef = useRef(0);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const progressRef = useRef(progress);
  const [attempt, setAttempt] = useState(1);
  const run = useRef<PulseState>(newRun(LEVELS[0]));
  /** True when the audio clock is driving the game. */
  const clock = useRef(false);
  const starting = useRef(false);
  const inputs = useRef({ keys: new Set<string>(), pointers: new Set<number>() });
  const fx = useRef({
    particles: new Particles(900), shake: new Shake(), flash: 0, ring: 0, ringX: 0, ringY: 0, vrot: 0, landT: 9, lastTime: 0,
    deadAt: 0, restartAt: 0, completeAt: 0, countdown: 0, trail: 0, hintT: 0, pct: -1, lastBeat: -1, confetti: 0,
  });
  const hud = {
    bar: useRef<HTMLDivElement>(null), pct: useRef<HTMLSpanElement>(null),
  };

  // The world is always VIEW_H tall; its width follows the screen (within limits).
  const zoom = box.h / VIEW_H;
  const viewW = clamp(box.w / zoom, 640, 1100);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => {
    const m = music.current;
    return () => m?.dispose();
  }, []);

  const saveProgress = useCallback(
    (p: Progress) => {
      progressRef.current = p;
      setProgress(p);
      saveState(PROGRESS_KEY, p);
      submitScore(scoreOf(p));
    },
    [submitScore],
  );

  /** Begin a fresh attempt at the current level: a new run, and the track from its first beat. */
  const beginAttempt = useCallback(() => {
    const L = LEVELS[levelRef.current];
    run.current = newRun(L);
    const f = fx.current;
    f.particles.clear();
    f.flash = 0;
    f.ring = 0;
    f.vrot = 0;
    f.deadAt = 0;
    f.restartAt = 0;
    f.completeAt = 0;
    f.hintT = 0;
    f.pct = -1;
    f.lastBeat = -1;
    clock.current = music.current!.start(TRACKS[L.id]);
    const held = inputs.current.keys.size + inputs.current.pointers.size > 0;
    if (held) press(run.current);
    setAttempt(progressRef.current.attempts[levelRef.current] + 1);
  }, []);

  const startLevel = useCallback(
    async (idx: number) => {
      if (starting.current) return;
      starting.current = true;
      levelRef.current = idx;
      setLevelIdx(idx);
      inputs.current.keys.clear();
      inputs.current.pointers.clear();
      play("select");
      try {
        await music.current!.prepare();
      } finally {
        starting.current = false;
      }
      beginAttempt();
      go("play");
    },
    [beginAttempt, go],
  );

  const pause = useCallback(() => {
    if (phaseRef.current !== "play") return;
    go("paused");
    if (clock.current) void music.current!.pause();
  }, [go]);

  const resume = useCallback(() => {
    // A short countdown so you can get your thumb ready; the audio clock (and the game) stays frozen until it ends.
    fx.current.countdown = run.current.alive && !run.current.won ? 1.5 : 0;
    go("play");
    if (fx.current.countdown <= 0 && clock.current) void music.current!.resume();
  }, [go]);

  const toMenu = useCallback(() => {
    music.current!.stop();
    void music.current!.resume();
    go("menu");
  }, [go]);

  const onPress = useCallback(() => {
    if (phaseRef.current !== "play" || fx.current.countdown > 0) return;
    const g = run.current;
    if (!g.alive) {
      // Tap after the explosion to jump straight back in.
      if (performance.now() - fx.current.deadAt > 280) fx.current.restartAt = 1;
      return;
    }
    press(g);
  }, []);

  const onRelease = useCallback(() => {
    const i = inputs.current;
    if (i.keys.size + i.pointers.size === 0) release(run.current);
  }, []);

  useEffect(() => {
    const typing = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const p = phaseRef.current;
      if (JUMP_KEYS.has(e.code)) {
        e.preventDefault();
        if (e.repeat) return;
        if (p === "menu") void startLevel(levelRef.current);
        else if (p === "play") {
          inputs.current.keys.add(e.code);
          onPress();
        }
      } else if (e.code === "KeyP" || e.code === "Escape") {
        if (e.repeat) return;
        if (p === "play") pause();
        else if (p === "paused") resume();
      } else if (e.code === "Enter" && !e.repeat) {
        if (p === "menu") void startLevel(levelRef.current);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (!JUMP_KEYS.has(e.code)) return;
      inputs.current.keys.delete(e.code);
      onRelease();
    };
    const blur = () => {
      inputs.current.keys.clear();
      inputs.current.pointers.clear();
      onRelease();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [onPress, onRelease, pause, resume, startLevel]);

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [pause]);

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number, time: number) => {
    const f = fx.current;
    const g = run.current;
    const L = g.level;
    const w = view.w;
    const rawDt = f.lastTime ? Math.min(0.25, Math.max(0, time - f.lastTime)) : dt;
    f.lastTime = time;
    const playing = phaseRef.current === "play";
    const now = performance.now();

    // ---- advance the game
    if (playing) {
      if (f.countdown > 0) {
        f.countdown -= rawDt;
        if (f.countdown <= 0) {
          f.countdown = 0;
          if (clock.current) void music.current!.resume();
        }
      } else if (g.alive && !g.won) {
        const mt = clock.current ? music.current!.time() : null;
        let target = mt !== null ? mt : g.t + Math.min(rawDt, 0.05);
        // After a long stall run slowly rather than skip ahead through obstacles.
        target = Math.min(target, g.t + 0.25);
        const events = advanceTo(g, target);
        f.hintT += rawDt;
        const cy = py(g.y) - BLOCK / 2;
        const cx = clamp(w * 0.25, 140, 240) + BLOCK / 2;
        for (const e of events) {
          if (e === "jump") {
            tone(660, 0.05, "triangle", 0.045, { slide: 900 });
            f.particles.burst(cx - 6, cy + BLOCK / 2, 4, { color: withAlpha(L.theme.accent2, 0.9), speed: 70, size: 4, gravity: 200, angle: Math.PI / 2, spread: 1.4, life: 0.3, shape: "square" });
          } else if (e === "land") {
            f.landT = 0;
            f.particles.burst(cx, cy + BLOCK / 2, 5, { color: withAlpha(L.theme.accent2, 0.8), speed: 80, size: 4, gravity: 120, angle: -Math.PI / 2, spread: 2.6, life: 0.3, shape: "square" });
          } else if (e === "pad") {
            play("bounce", 1.5);
            f.shake.add(0.15);
            f.particles.burst(cx, cy + BLOCK / 2, 14, { color: ["#fde047", "#ffffff"], speed: 190, size: 4, gravity: 300, shape: "spark", life: 0.5 });
          } else if (e === "orb") {
            play("pop", 1.3);
            f.particles.burst(cx, cy, 16, { color: ["#fde047", "#fff7b2"], speed: 220, size: 4, gravity: 0, shape: "spark", life: 0.5 });
          } else if (e === "grav") {
            play("swoosh");
            f.flash = Math.max(f.flash, 0.5);
          } else if (e === "speed") {
            tone(300, 0.25, "sawtooth", 0.08, { slide: speedOf(L, g.speedM) > speedOf(L, 1) ? 1200 : 150 });
            f.flash = Math.max(f.flash, 0.3);
          } else if (e === "die") {
            music.current!.stop();
            play("explode");
            f.shake.add(1);
            f.flash = 1;
            f.ring = 0.0001;
            f.ringX = cx;
            f.ringY = cy;
            f.particles.burst(cx, cy, 34, { color: [L.theme.accent, L.theme.accent2, "#ffffff"], speed: 420, size: 10, gravity: 900, drag: 0.8, shape: "square", life: 1 });
            f.particles.burst(cx, cy, 16, { color: "#ffffff", speed: 520, size: 3, gravity: 0, shape: "spark", life: 0.5 });
            f.deadAt = now;
            f.restartAt = 0;
            saveProgress(recordAttempt(progressRef.current, levelRef.current, percent(g), false));
          } else if (e === "win") {
            music.current!.stop();
            play("win");
            f.shake.add(0.4);
            f.confetti = 1.4;
            f.completeAt = now + 1500;
            saveProgress(recordAttempt(progressRef.current, levelRef.current, 100, true));
          }
        }
        // Dust trail while running along a surface, and the beat tick.
        f.trail -= rawDt;
        if (g.alive && f.trail <= 0) {
          f.trail = 0.035;
          const vx = -speedOf(L, g.speedM) * BLOCK;
          f.particles.burst(cx - 10, cy + (g.onGround ? BLOCK / 2 - 3 : 0) * (g.grav === 1 ? 1 : -1), 1, {
            color: withAlpha(L.theme.accent, 0.7), speed: 20, size: 5, gravity: 0, drag: 0, shape: "square", life: 0.35, angle: Math.PI, spread: 0.3,
          });
          const last = f.particles.items[f.particles.items.length - 1];
          if (last) last.vx += vx;
        }
      }
      // Death: restart automatically, or sooner when you tap.
      if (!g.alive && (f.restartAt === 1 || (f.deadAt && now - f.deadAt > 850))) beginAttempt();
      if (g.won && f.completeAt && now >= f.completeAt) {
        f.completeAt = 0;
        go("complete");
      }
    }

    f.particles.update(rawDt);
    f.shake.update(rawDt);
    f.flash = Math.max(0, f.flash - rawDt * 2.5);
    if (f.ring > 0) f.ring += rawDt;
    if (f.confetti > 0) {
      f.confetti -= rawDt;
      if (Math.random() < 0.5) {
        f.particles.burst(Math.random() * w, CEIL_Y + 20, 5, {
          color: [L.theme.accent, L.theme.accent2, "#fde047", "#ffffff", "#f472b6"], speed: 160, size: 7, gravity: 380, angle: Math.PI / 2, spread: 1.6, life: 1.6, shape: "square",
        });
      }
    }
    f.landT += rawDt;

    // ---- the frame
    const beat = spb(L);
    const phaseB = ((g.t / beat) % 1 + 1) % 1;
    const pulse = Math.exp(-5.5 * phaseB);
    const cubeX = clamp(w * 0.25, 140, 240);
    const frame: Frame = { camX: g.x - cubeX / BLOCK, w, time, pulse, theme: L.theme };
    const [sx, sy] = f.shake.offset(10);
    ctx.save();
    ctx.translate(sx, sy);
    drawBackground(ctx, frame);
    drawFloor(ctx, frame);
    // Level text in the world: the attempt counter near the start.
    if (frame.camX < 12) {
      ctx.globalAlpha = 0.5;
      text(ctx, `Attempt ${progressRef.current.attempts[levelRef.current] + 1}`, (3.5 - frame.camX) * BLOCK, GROUND_Y - BLOCK * 5, {
        size: 34, font: DISPLAY_FONT, color: "#ffffff", align: "left", weight: 900,
      });
      ctx.globalAlpha = 1;
    }
    for (let i = g.lo; i < L.objects.length; i++) {
      const o = L.objects[i];
      if ((o.x - frame.camX) * BLOCK > w + 120) break;
      drawObject(ctx, frame, o, g.used.includes(i));
    }
    // Objects before lo may still be on screen (long blocks), so draw the few just behind too.
    for (let i = Math.max(0, g.lo - 6); i < g.lo; i++) drawObject(ctx, frame, L.objects[i], true);
    drawFinish(ctx, frame, L.endX);

    // The cube.
    if (g.alive || (g.won && f.completeAt)) {
      const c = cubeScreen(frame, g.x, g.y);
      f.vrot = g.onGround ? damp(f.vrot, g.rot, 30, rawDt) : g.rot;
      const squash = f.landT < 0.12 ? 1 - 0.2 * Math.sin((f.landT / 0.12) * Math.PI) : 1 + clamp(Math.abs(g.vy) * 0.004, 0, 0.1);
      drawCube(ctx, frame, { x: c.x, y: c.y, rot: f.vrot, squash, look: clamp(g.vy / 12, -1, 1) * g.grav, alpha: 1 });
    }
    f.particles.draw(ctx);
    if (f.ring > 0 && f.ring < 0.6) {
      const k = f.ring / 0.6;
      ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
      ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(f.ringX, f.ringY, 20 + k * 200, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (f.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${f.flash * 0.45})`;
      ctx.fillRect(0, 0, w, VIEW_H);
    }
    // Countdown after un-pausing.
    if (playing && f.countdown > 0) {
      text(ctx, `${Math.ceil(f.countdown / 0.5)}`, w / 2, VIEW_H / 2 - 20, { size: 90, font: DISPLAY_FONT, color: "#ffffff", stroke: "rgba(0,0,0,0.5)", strokeWidth: 8, weight: 900 });
    }
    if (g.won) {
      text(ctx, "LEVEL COMPLETE!", w / 2, VIEW_H / 2 - 30, { size: 44, font: DISPLAY_FONT, color: "#ffffff", stroke: L.theme.accent, strokeWidth: 9, weight: 900 });
    } else if (playing && g.alive && f.hintT < 4 && g.t < 4) {
      ctx.globalAlpha = clamp(1 - Math.max(0, f.hintT - 3), 0, 1);
      text(ctx, touch ? "TAP to jump · hold to keep jumping" : "SPACE / CLICK to jump · hold to keep jumping", w / 2, GROUND_Y - BLOCK * 6.5, {
        size: 17, color: "#ffffff", stroke: "rgba(0,0,0,0.5)", strokeWidth: 5, weight: 800,
      });
      ctx.globalAlpha = 1;
    }

    // ---- HUD (progress bar is DOM; update it without re-rendering React)
    const pct = g.won ? 100 : clamp((g.x / L.endX) * 100, 0, 99.9);
    if (hud.bar.current) hud.bar.current.style.width = `${pct.toFixed(1)}%`;
    const shown = percent(g);
    if (hud.pct.current && f.pct !== shown) {
      f.pct = shown;
      hud.pct.current.textContent = `${shown}%`;
    }
  };

  const L = LEVELS[levelIdx];
  const bestPct = progress.best[levelIdx];

  return (
    <div ref={root} className="absolute inset-0 select-none" style={{ touchAction: "none" }}>
      <GameCanvas
        width={viewW}
        height={VIEW_H}
        draw={draw}
        background="#05060f"
        onPointer={(p) => {
          if (p.type === "down") {
            if (p.button !== 0 && p.pointerType === "mouse") return;
            if (phaseRef.current !== "play") return;
            inputs.current.pointers.add(p.id);
            onPress();
          } else if (p.type === "up" || p.type === "cancel") {
            inputs.current.pointers.delete(p.id);
            onRelease();
          }
        }}
      />
      {phase !== "menu" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-3 pt-1.5 text-white">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-bold tracking-wide text-white/80">
              {L.name} · <span style={{ color: DIFF_COLOR[L.difficulty] }}>{L.difficulty}</span> · Attempt {attempt}
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-black/45 ring-1 ring-white/20">
              <div ref={hud.bar} className="h-full rounded-full" style={{ width: "0%", background: `linear-gradient(90deg, ${L.theme.accent}, ${L.theme.accent2})` }} />
            </div>
          </div>
          <div className="text-right leading-tight">
            <span ref={hud.pct} className="text-xl font-black tabular-nums drop-shadow">0%</span>
            <div className="text-[10px] font-semibold text-white/60">best {bestPct}%</div>
          </div>
          {touch && phase === "play" && <div className="w-10" />}
        </div>
      )}
      {touch && phase === "play" && (
        <button
          type="button"
          aria-label="Pause"
          className="absolute right-2 top-2 z-20 h-9 w-9 rounded-full border border-white/25 bg-black/50 text-sm text-white"
          onClick={pause}
        >
          ⏸
        </button>
      )}
      {touch && box.h > box.w && phase === "play" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 text-center text-[11px] font-semibold text-white/60">
          Turn your phone sideways for a bigger view
        </div>
      )}
      {phase === "menu" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={() => void startLevel(levelIdx)}
          accent={meta.accent}
          best={best || undefined}
          bestLabel="Best score"
          extra={
            <div className="mt-3 space-y-1.5 text-left">
              {LEVELS.map((lv, i) => (
                <button
                  key={lv.id}
                  type="button"
                  onClick={() => {
                    levelRef.current = i;
                    setLevelIdx(i);
                  }}
                  className={`w-full rounded-lg border px-3 py-1.5 transition ${i === levelIdx ? "border-white/70 bg-white/15" : "border-white/15 bg-white/5 hover:bg-white/10"}`}
                >
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>
                      {i + 1}. {lv.name} {progress.done[i] ? "✓" : ""}
                    </span>
                    <span className="text-[11px]" style={{ color: DIFF_COLOR[lv.difficulty] }}>{lv.difficulty}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-white/15">
                    <div className="h-full rounded" style={{ width: `${progress.best[i]}%`, background: lv.theme.accent }} />
                  </div>
                  <div className="mt-0.5 text-[10px] text-white/55">Best {progress.best[i]}% · {progress.attempts[i]} attempts</div>
                </button>
              ))}
            </div>
          }
        />
      )}
      {phase === "paused" && (
        <Overlay>
          <h2 className="text-2xl font-black">Paused</h2>
          <p className="mt-1 text-xs text-white/55">{L.name} · {percent(run.current)}%</p>
          <div className="mt-4 space-y-2">
            <PrimaryButton onClick={resume} accent={meta.accent} autoFocus>Resume</PrimaryButton>
            <SecondaryButton
              onClick={() => {
                void startLevel(levelRef.current);
              }}
            >
              Restart level
            </SecondaryButton>
            <SecondaryButton onClick={toMenu}>Level select</SecondaryButton>
          </div>
        </Overlay>
      )}
      {phase === "complete" && (
        <Overlay>
          <h2 className="text-3xl font-black" style={{ color: L.theme.accent }}>Level complete!</h2>
          <p className="mt-1 text-sm text-white/70">{L.name}</p>
          <div className="mt-3 text-5xl font-black tabular-nums">100%</div>
          <p className="mt-1 text-xs text-white/60">
            Finished on attempt {progress.attempts[levelIdx]} · Score {scoreOf(progress)}
          </p>
          <div className="mt-4 space-y-2">
            {levelIdx + 1 < LEVELS.length ? (
              <PrimaryButton onClick={() => void startLevel(levelIdx + 1)} accent={meta.accent} autoFocus>
                Next: {LEVELS[levelIdx + 1].name}
              </PrimaryButton>
            ) : null}
            <SecondaryButton onClick={() => void startLevel(levelIdx)}>Play again</SecondaryButton>
            <SecondaryButton onClick={toMenu}>Level select</SecondaryButton>
          </div>
        </Overlay>
      )}
    </div>
  );
}
