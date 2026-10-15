// Road Hopper: an endless voxel hopper. Rules live in logic.ts, the voxel art in art.ts and the camera / scene in
// scene.ts; this file runs the loop, plays sounds, reads input (keys, taps, swipes) and the menu / pause / game-over flow.
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { clamp, DISPLAY_FONT, Floaters, Particles, Shake, text } from "../../kit/draw";
import { useKeyPress } from "../../kit/input";
import { noise, play, tone } from "../../kit/sfx";
import { randomSeed } from "../../kit/rng";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { sx, sy } from "./art";
import { useBoxSize } from "./fit";
import { hop, newGame, rowAt, trainState, update, type DeathCause, type Dir, type HopperState } from "./logic";
import { meta } from "./meta";
import { drawWorld, newVis, snapCamera, updateVis, type Vis } from "./scene";

type Phase = "menu" | "play" | "paused" | "over";

const KEYS: Record<string, Dir> = {
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
};
const COINS_KEY = "road-hopper:coins";
const SWIPE = 22;

const TITLES: Record<DeathCause, string> = {
  car: "Squashed!", train: "Hit by a train!", water: "Splash!", bird: "Snatched by the hawk!", edge: "Swept away!",
};
const HINTS: Record<DeathCause, string> = {
  car: "Watch the gaps between cars and trucks.",
  train: "When the red lights flash, a train is coming.",
  water: "Hop onto logs and lily pads, never the water.",
  bird: "Keep moving forward: the hawk comes if you dawdle or go back.",
  edge: "Don't ride a log off the edge of the world.",
};

export default function RoadHopper({ touch, best, submitScore }: GameProps) {
  const root = useRef<HTMLDivElement>(null);
  const box = useBoxSize(root);
  const game = useRef<HopperState>(newGame(randomSeed()));
  const vis = useRef<Vis>(newVis());
  const fx = useRef({
    particles: new Particles(), shake: new Shake(), floaters: new Floaters(), bell: 0, rumble: 0, hint: 0, over: 0, warned: false,
    swipe: null as { id: number; x: number; y: number; done: boolean } | null, milestone: 0,
  });
  const [phase, setPhase] = useState<Phase>("menu");
  const phaseRef = useRef<Phase>("menu");
  const [totalCoins, setTotalCoins] = useState(() => loadState<number>(COINS_KEY) ?? 0);
  const [result, setResult] = useState({ score: 0, isBest: false, cause: "car" as DeathCause, coins: 0 });
  const timer = useRef(0);

  // Logical pixels are CSS pixels divided by a zoom, so tiles stay a comfortable size on any screen.
  const zoom = clamp(Math.min(box.w / 520, box.h / 420), 0.6, 1.2);
  const lw = box.w / zoom;
  const lh = box.h / zoom;

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const start = useCallback(() => {
    window.clearTimeout(timer.current);
    game.current = newGame(randomSeed());
    snapCamera(vis.current, game.current);
    const f = fx.current;
    f.particles.clear();
    f.floaters.items = [];
    f.hint = 0;
    f.swipe = null;
    f.warned = false;
    play("select");
    go("play");
  }, [go]);

  const pause = useCallback(() => {
    if (phaseRef.current === "play") go("paused");
  }, [go]);
  const resume = useCallback(() => go("play"), [go]);

  const tryHop = useCallback((dir: Dir) => {
    if (phaseRef.current === "play") hop(game.current, dir);
  }, []);

  useKeyPress((code) => {
    const p = phaseRef.current;
    if (KEYS[code]) {
      if (p === "play") tryHop(KEYS[code]);
      else if (p === "menu") start();
      return;
    }
    if (code === "KeyP" || code === "Escape") {
      if (p === "play") pause();
      else if (p === "paused") resume();
    } else if ((code === "Space" || code === "Enter") && (p === "menu" || (p === "over" && performance.now() - fx.current.over > 500))) start();
  }, true);

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [pause]);

  /** Tap = hop forward; swipe = hop that way. A swipe fires as soon as the finger has moved far enough. */
  const onPointer = (p: { type: string; x: number; y: number; id: number; button: number }) => {
    const f = fx.current;
    if (p.type === "down") {
      if (phaseRef.current !== "play") return;
      f.swipe = { id: p.id, x: p.x, y: p.y, done: false };
    } else if (p.type === "move") {
      const s = f.swipe;
      if (!s || s.id !== p.id || s.done) return;
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
      s.done = true;
      tryHop(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    } else if (p.type === "up") {
      const s = f.swipe;
      if (s && s.id === p.id && !s.done) tryHop("up");
      f.swipe = null;
    } else {
      f.swipe = null;
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number, time: number) => {
    const g = game.current;
    const v = vis.current;
    const f = fx.current;
    const running = phaseRef.current === "play";
    const wasAlive = g.alive;

    if (running || (phaseRef.current === "over" && !g.alive)) {
      const events = update(g, running ? dt : Math.min(dt, 0.05));
      if (running) f.hint += dt;
      const px = sx(v.pc, v.pr);
      const py = sy(v.pc, v.pr, v.z + 0.4);
      for (const e of events) {
        if (e === "hop") {
          tone(380 + Math.min(g.maxRow, 60) * 3, 0.09, "square", 0.07, { slide: 640 });
          if (g.row === g.maxRow && g.row > 0 && g.row % 10 === 0 && g.row !== f.milestone) {
            f.milestone = g.row;
            play("levelup");
            f.floaters.add(view.w / 2, 120, `${g.row}!`, "#fde047", 30);
          }
        } else if (e === "land") {
          f.particles.burst(px, py + 8, 4, { color: ["#d9f2a6", "#b9e07a"], speed: 50, size: 3, gravity: 200, angle: -Math.PI / 2, spread: 2.4, life: 0.35 });
        } else if (e === "bump") {
          tone(150, 0.07, "square", 0.08, { slide: 110 });
        } else if (e === "coin") {
          play("coin");
          f.floaters.add(px, py - 28, "+1", "#fde047", 20);
          f.particles.burst(px, py, 10, { color: ["#fbbf24", "#fde68a", "#ffffff"], speed: 120, size: 3.5, gravity: 200, shape: "spark", life: 0.5 });
        } else if (e === "bird-warn") {
          tone(1900, 0.38, "sawtooth", 0.09, { slide: 700 });
          f.warned = true;
        }
      }
      if (wasAlive && !g.alive) {
        const cause = g.cause ?? "car";
        f.shake.add(cause === "bird" ? 0.4 : 0.8);
        const fur = ["#ffffff", "#f3efe6", "#f9a8c4"];
        if (cause === "car" || cause === "train") {
          play("hit");
          tone(120, 0.35, "sawtooth", 0.14, { slide: 45 });
          f.particles.burst(px, py + 6, 26, { color: fur, speed: 230, size: 5, gravity: 400, life: 0.8, shape: "square" });
        } else if (cause === "water" || cause === "edge") {
          noise(0.5, 0.3, { type: "lowpass", freq: 2600, sweep: 280 });
          play("drop");
          f.particles.burst(px, py + 8, 30, { color: ["#ffffff", "#8fdcff", "#4cc0ec"], speed: 190, size: 4, gravity: 520, angle: -Math.PI / 2, spread: 2.2, life: 0.9 });
        } else {
          play("swoosh");
          tone(1500, 0.3, "sawtooth", 0.1, { slide: 500 });
        }
        const score = g.maxRow;
        const isBest = submitScore(score);
        const total = (loadState<number>(COINS_KEY) ?? 0) + g.coins;
        saveState(COINS_KEY, total);
        setTotalCoins(total);
        setResult({ score, isBest, cause, coins: g.coins });
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          f.over = performance.now();
          go("over");
        }, cause === "bird" ? 1900 : cause === "car" || cause === "train" ? 1000 : 1200);
      }
      if (running && g.alive) {
        // Level-crossing bells and the rumble of a train going past, for rails near the bunny.
        let bell = false;
        let rumble = false;
        for (let r = g.row - 6; r <= g.row + 8; r++) {
          const row = rowAt(g, r);
          if (!row || row.kind !== "rail") continue;
          const st = trainState(row, g.time);
          if (st.light) bell = true;
          if (st.present) rumble = true;
        }
        f.bell -= dt;
        if (bell && f.bell <= 0) {
          f.bell = 0.28;
          tone(Math.floor(g.time * 3.5) % 2 ? 1568 : 1319, 0.12, "triangle", 0.08);
        }
        f.rumble -= dt;
        if (rumble && f.rumble <= 0) {
          f.rumble = 0.11;
          noise(0.14, 0.14, { type: "lowpass", freq: 260 });
        }
      }
    }
    updateVis(v, g, dt, time);
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);

    const w = view.w;
    const h = view.h;
    const [shx, shy] = f.shake.offset(10);
    ctx.save();
    ctx.translate(shx, shy);
    drawWorld(ctx, w, h, g, v, time);
    f.particles.draw(ctx);
    f.floaters.draw(ctx);
    ctx.restore();

    // ---- HUD
    text(ctx, `${g.maxRow}`, w / 2, 46, { size: 50, font: DISPLAY_FONT, color: "#ffffff", stroke: "#1e3a5f", strokeWidth: 9, weight: 900 });
    ctx.fillStyle = "#fbbf24";
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(26, 30, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    text(ctx, `${g.coins}`, 44, 31, { size: 24, align: "left", font: DISPLAY_FONT, color: "#ffffff", stroke: "#1e3a5f", strokeWidth: 5, weight: 900 });
    text(ctx, `BEST ${Math.max(best, g.maxRow)}`, 16, 62, { size: 12, align: "left", color: "#ffffff", stroke: "rgba(30,58,95,0.9)", strokeWidth: 4, weight: 800 });
    if (running && v.warn > 0.02 && g.alive) {
      const pulse = 0.6 + 0.4 * Math.sin(time * 14);
      ctx.globalAlpha = Math.min(1, 0.4 + v.warn) * pulse;
      text(ctx, g.birdKind === "back" ? "Hop forward! The hawk is coming" : "Keep moving! The hawk is circling", w / 2, 96, {
        size: 18, color: "#fff1f1", stroke: "#7f1d1d", strokeWidth: 6, weight: 900,
      });
      ctx.globalAlpha = 1;
    }
    if (running && f.hint < 5 && g.maxRow < 3) {
      ctx.globalAlpha = clamp((5 - f.hint) / 1.2, 0, 1);
      text(ctx, touch ? "Tap to hop · swipe to turn" : "Arrow keys or WASD to hop", w / 2, h - 36, {
        size: 17, color: "#ffffff", stroke: "#1e3a5f", strokeWidth: 6, weight: 800,
      });
      ctx.globalAlpha = 1;
    }
  };

  return (
    <div ref={root} className="absolute inset-0 select-none" style={{ touchAction: "none" }}>
      <GameCanvas width={lw} height={lh} draw={draw} background="#bfe5ff" onPointer={onPointer} />
      {phase === "menu" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={best || undefined}
          bestLabel="Furthest row"
          extra={totalCoins > 0 ? <p className="mt-1 text-xs text-white/60">Coins collected: <b className="text-amber-300">{totalCoins}</b></p> : null}
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={resume} onRestart={start} />}
      {phase === "over" && (
        <GameOverPanel
          title={TITLES[result.cause]}
          accent={meta.accent}
          score={result.score}
          scoreLabel="Furthest row"
          best={best}
          isBest={result.isBest}
          onRestart={start}
        >
          <p className="mt-2 text-xs text-white/60">
            {HINTS[result.cause]} Coins this run: <b className="text-amber-300">{result.coins}</b>
          </p>
        </GameOverPanel>
      )}
      {touch && phase === "play" && (
        <button
          type="button"
          aria-label="Pause"
          className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white"
          onClick={pause}
        >
          ⏸
        </button>
      )}
    </div>
  );
}
