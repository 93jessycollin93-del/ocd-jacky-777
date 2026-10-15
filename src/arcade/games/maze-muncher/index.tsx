// Maze Muncher: rules live in logic.ts and the maze in maze.ts; this file draws, plays sounds, reads
// keys / swipes / the optional D-pad, and runs the start / pause / game-over flow.
import { useCallback, useRef, useState } from "react";
import { GameCanvas, type CanvasPointer, type View } from "../../kit/GameCanvas";
import { DISPLAY_FONT, Floaters, Particles, Shake, clamp, text } from "../../kit/draw";
import { useKeyPress } from "../../kit/input";
import { randomSeed } from "../../kit/rng";
import { melody, play, tone } from "../../kit/sfx";
import { loadState, saveState } from "../../kit/storage";
import { DPad } from "../../kit/TouchPad";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { drawBonus, drawHunter, drawMuncher, type HunterLook } from "./art";
import {
  CLEAR_FLASH, CLEAR_FREEZE, DEATH_ANIM, DEATH_FREEZE, DOWN, FLASH_TIME, HUNTERS, LEFT, RIGHT, UP, bonusForLevel,
  newGame, steer, update, type Dir, type MazeEvent, type MazeState,
} from "./logic";
import { BONUS_SPOT, COLS, ROWS, TILES, WALL } from "./maze";
import { wallOutline } from "./outline";
import { meta } from "./meta";

const T = 16;
const TOP = 46;
const BOTTOM = 36;
const W = COLS * T;
const H = TOP + ROWS * T + BOTTOM;

type Phase = "ready" | "playing" | "paused" | "over";

const KEYS: Record<string, Dir> = {
  ArrowUp: UP, KeyW: UP, ArrowDown: DOWN, KeyS: DOWN, ArrowLeft: LEFT, KeyA: LEFT, ArrowRight: RIGHT, KeyD: RIGHT,
};

const px = (x: number) => (x + 0.5) * T;
const py = (y: number) => TOP + (y + 0.5) * T;

interface MazeCache {
  scale: number;
  normal: HTMLCanvasElement;
  flash: HTMLCanvasElement;
}

/** Paint the static maze (walls and neon outline) once, at the screen's resolution; frames just blit it. */
function buildMaze(scale: number): MazeCache {
  const o = wallOutline(0.45);
  const make = (flash: boolean) => {
    const cv = document.createElement("canvas");
    cv.width = Math.ceil(W * scale);
    cv.height = Math.ceil(ROWS * T * scale);
    const c = cv.getContext("2d");
    if (!c) return cv;
    c.scale(scale, scale);
    c.fillStyle = flash ? "#26307a" : "#0b1138";
    c.beginPath();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (TILES[y * COLS + x] === WALL) c.rect(x * T, y * T, T, T);
    c.fill();
    const edges = new Path2D();
    for (const [x1, y1, x2, y2] of o.lines) {
      edges.moveTo(x1 * T, y1 * T);
      edges.lineTo(x2 * T, y2 * T);
    }
    for (const a of o.arcs) {
      edges.moveTo((a.cx + Math.cos(a.a0) * a.r) * T, (a.cy + Math.sin(a.a0) * a.r) * T);
      edges.arc(a.cx * T, a.cy * T, a.r * T, a.a0, a.a1, a.ccw);
    }
    c.lineCap = "round";
    c.lineJoin = "round";
    c.strokeStyle = flash ? "rgba(255,255,255,0.35)" : "rgba(80,110,255,0.3)";
    c.lineWidth = 6;
    c.stroke(edges);
    c.strokeStyle = flash ? "#ffffff" : "#6f93ff";
    c.lineWidth = 2;
    c.stroke(edges);
    return cv;
  };
  return { scale, normal: make(false), flash: make(true) };
}

export default function MazeMuncher({ touch, best, submitScore }: GameProps) {
  const game = useRef<MazeState>(newGame(randomSeed()));
  const fx = useRef({
    particles: new Particles(), shake: new Shake(), floaters: new Floaters(),
    flip: false, warble: 0, mouth: 0, maze: null as MazeCache | null, overT: 0,
  });
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [result, setResult] = useState({ score: 0, isBest: false, level: 1 });
  const [pad, setPad] = useState<boolean>(() => loadState<boolean>("maze-muncher:pad") ?? false);
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const start = useCallback(() => {
    game.current = newGame(randomSeed());
    const f = fx.current;
    f.particles.clear();
    f.floaters.items = [];
    f.overT = 0;
    melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.1], [659, 0.1], [784, 0.1], [1046, 0.3]], "square", 0.07);
    go("playing");
  }, [go]);

  const dirTo = (d: Dir) => {
    const p = phaseRef.current;
    if (p === "ready") start();
    if (phaseRef.current === "playing") steer(game.current, d);
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if (KEYS[code] !== undefined) {
      dirTo(KEYS[code]);
      return;
    }
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) go(p === "playing" ? "paused" : "playing");
    else if ((code === "Space" || code === "Enter") && (p === "ready" || p === "over")) start();
  });

  const onPointer = (p: CanvasPointer) => {
    if (p.type === "down") {
      swipe.current = { id: p.id, x: p.x, y: p.y };
      return;
    }
    const s = swipe.current;
    if (!s || s.id !== p.id) return;
    if (p.type === "up" || p.type === "cancel") {
      swipe.current = null;
      return;
    }
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 9) return;
    dirTo(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? RIGHT : LEFT) : dy > 0 ? DOWN : UP);
    s.x = p.x;
    s.y = p.y;
  };

  const handle = (events: MazeEvent[], g: MazeState) => {
    const f = fx.current;
    for (const e of events) {
      const ex = px(e.x);
      const ey = py(e.y);
      switch (e.type) {
        case "dot":
          f.flip = !f.flip;
          tone(f.flip ? 420 : 330, 0.05, "triangle", 0.07);
          break;
        case "pellet":
          play("powerup");
          f.particles.burst(ex, ey, 18, { color: ["#fff1b3", "#ffc83a", "#ffffff"], speed: 150, size: 4, gravity: 0, life: 0.5 });
          f.shake.add(0.15);
          break;
        case "hunter": {
          play("coin", 0.8 + Math.min(3, g.chain) * 0.2);
          const eaten = g.hunters.find((h) => Math.abs(h.x - e.x) < 0.01 && Math.abs(h.y - e.y) < 0.01);
          const color = eaten ? HUNTERS[eaten.id].color : "#9ad1ff";
          f.particles.burst(ex, ey, 24, { color: [color, "#ffffff", "#9ad1ff"], speed: 190, size: 5, gravity: 0, shape: "spark" });
          f.shake.add(0.3);
          break;
        }
        case "bonus":
          play("powerup");
          f.floaters.add(ex, ey - 10, `+${e.points}`, "#fde047", 17);
          f.particles.burst(ex, ey, 22, { color: ["#fde047", "#ffffff", "#fb923c"], speed: 170, size: 4, gravity: 0 });
          break;
        case "bonus-spawn":
          tone(900, 0.1, "triangle", 0.07, { slide: 1500 });
          break;
        case "caught":
          f.shake.add(0.25);
          break;
        case "death": {
          melody([[494, 0.09], [466, 0.09], [440, 0.09], [415, 0.09], [392, 0.09], [370, 0.09], [330, 0.09], [294, 0.09], [262, 0.2]], "triangle", 0.12);
          const pl = g.player;
          f.particles.burst(px(pl.x), py(pl.y), 30, { color: ["#ffc83a", "#ffe27a", "#ffffff"], speed: 200, size: 4, gravity: 120 });
          break;
        }
        case "extra-life":
          play("levelup");
          f.floaters.add(W / 2, py(17), "1UP!", "#86efac", 24);
          break;
        case "clear":
          play("win");
          break;
        case "level":
          play("levelup");
          break;
        case "over": {
          play("lose");
          const isBest = submitScore(g.score);
          setResult({ score: g.score, isBest, level: g.level });
          window.setTimeout(() => go("over"), 1100);
          break;
        }
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number, time: number) => {
    const g = game.current;
    const f = fx.current;
    const want = Math.min(3, view.scale * Math.min(2, window.devicePixelRatio || 1));
    if (!f.maze || Math.abs(f.maze.scale - want) / want > 0.05) f.maze = buildMaze(want);
    if (phaseRef.current === "playing") handle(update(g, dt), g);
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);
    if (g.phase === "over") f.overT += dt;

    // Frightened hunters wobble while it lasts.
    if (phaseRef.current === "playing" && g.phase === "play" && g.fright > 0) {
      f.warble -= dt;
      if (f.warble <= 0) {
        f.warble = 0.16;
        f.flip = !f.flip;
        tone(f.flip ? 230 : 190, 0.1, "square", 0.04);
      }
    }
    if (g.player.moving && g.phase === "play") f.mouth += dt * 11;

    const [sx, sy] = f.shake.offset(7);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = "#05060f";
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // ---- maze
    const flashing = g.phase === "clear" && g.phaseTime > CLEAR_FREEZE;
    const flashOn = flashing && Math.floor((g.phaseTime - CLEAR_FREEZE) * 5) % 2 === 0;
    ctx.drawImage(flashOn ? f.maze.flash : f.maze.normal, 0, TOP, W, ROWS * T);
    // The pen's door.
    ctx.fillStyle = "#ff8fd0";
    ctx.fillRect(13 * T + 1, TOP + 12 * T + T / 2 - 2, 2 * T - 2, 4);

    // ---- dots and pellets
    {
      ctx.fillStyle = "#ffe9c2";
      ctx.beginPath();
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (g.dots[y * COLS + x] === 1) {
            ctx.moveTo(px(x) + 2, py(y));
            ctx.arc(px(x), py(y), 2, 0, Math.PI * 2);
          }
        }
      }
      ctx.fill();
      const pulse = 0.5 + 0.5 * Math.sin(time * 9);
      if (g.phase !== "ready" || Math.floor(time * 4) % 2 === 0) {
        ctx.fillStyle = "#fff5d6";
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            if (g.dots[y * COLS + x] !== 2) continue;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(px(x), py(y), 8 + pulse * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(px(x), py(y), 4.8 + pulse * 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // ---- bonus item
    if (g.bonus && !(g.bonus.ttl < 2 && Math.floor(time * 8) % 2 === 0)) {
      drawBonus(ctx, g.bonus.kind, px(BONUS_SPOT.x), py(BONUS_SPOT.y), T * 0.62);
    }

    const wrapped = (x: number, fn: (xx: number) => void) => {
      fn(x);
      if (x < 1.2) fn(x + COLS);
      else if (x > COLS - 2.2) fn(x - COLS);
    };

    // ---- hunters
    const hideActors = (g.phase === "clear" && g.phaseTime > CLEAR_FREEZE) || (g.phase === "dying" && g.phaseTime > DEATH_FREEZE);
    if (!hideActors) {
      const frame = Math.floor(time * 7) & 1;
      for (const h of g.hunters) {
        if (g.phase === "eat" && g.eaten && Math.abs(h.x - g.eaten.x) < 0.01 && Math.abs(h.y - g.eaten.y) < 0.01 && (h.mode === "eyes" || h.mode === "entering")) continue;
        let look: HunterLook = "normal";
        if (h.mode === "eyes" || h.mode === "entering") look = "eyes";
        else if (h.frightened) look = g.fright < FLASH_TIME && Math.floor(time * 6) % 2 === 0 ? "flash" : "scared";
        wrapped(h.x, (xx) => drawHunter(ctx, px(xx), py(h.y), T * 0.86, HUNTERS[h.id].color, h.id, h.dir, frame, look));
      }
    }

    // ---- the muncher
    const pl = g.player;
    if (g.phase === "dying" && g.phaseTime > DEATH_FREEZE) {
      const k = clamp((g.phaseTime - DEATH_FREEZE) / DEATH_ANIM, 0, 1);
      drawMuncher(ctx, px(pl.x), py(pl.y), T * 0.8, pl.dir, 0, 0.04 + k * 0.96);
    } else if (g.phase !== "eat" && !(g.phase === "clear" && g.phaseTime > CLEAR_FREEZE)) {
      const mouth = g.phase === "ready" ? 0.6 : Math.abs(Math.sin(f.mouth));
      wrapped(pl.x, (xx) => drawMuncher(ctx, px(xx), py(pl.y), T * 0.8, pl.dir, mouth));
    }

    // ---- messages
    if (g.phase === "ready") {
      text(ctx, "READY!", W / 2, py(17), { size: 20, color: "#ffe14d", font: DISPLAY_FONT, weight: 900, stroke: "#05060f", strokeWidth: 4 });
    } else if (g.phase === "over") {
      text(ctx, "GAME OVER", W / 2, py(17), { size: 20, color: "#ff5a4e", font: DISPLAY_FONT, weight: 900, stroke: "#05060f", strokeWidth: 4 });
    } else if (g.phase === "eat" && g.eaten) {
      text(ctx, `${g.eaten.points}`, px(g.eaten.x), py(g.eaten.y), { size: 15, color: "#5eead4", weight: 900, stroke: "#05060f", strokeWidth: 4 });
    } else if (g.phase === "clear" && g.phaseTime > CLEAR_FREEZE + CLEAR_FLASH * 0.3) {
      text(ctx, "LEVEL CLEAR!", W / 2, py(17), { size: 18, color: "#86efac", font: DISPLAY_FONT, weight: 900, stroke: "#05060f", strokeWidth: 4 });
    }

    f.particles.draw(ctx);
    f.floaters.draw(ctx);
    ctx.restore();

    // ---- HUD
    ctx.fillStyle = "#05060f";
    ctx.fillRect(0, 0, W, TOP);
    ctx.fillRect(0, TOP + ROWS * T, W, BOTTOM);
    text(ctx, `${g.score}`, 14, 21, { align: "left", size: 24, font: DISPLAY_FONT, color: "#ffe27a", weight: 900 });
    text(ctx, "SCORE", 15, 38, { align: "left", size: 9, color: "rgba(255,255,255,0.45)" });
    text(ctx, `${g.level}`, W / 2, 21, { size: 22, font: DISPLAY_FONT, color: "#a5b4fc", weight: 900 });
    text(ctx, "LEVEL", W / 2, 38, { size: 9, color: "rgba(255,255,255,0.45)" });
    text(ctx, `${Math.max(best, g.score)}`, W - 14, 21, { align: "right", size: 24, font: DISPLAY_FONT, color: "#86efac", weight: 900 });
    text(ctx, "BEST", W - 15, 38, { align: "right", size: 9, color: "rgba(255,255,255,0.45)" });
    // Lives on the left, recent bonus items on the right.
    const lives = Math.max(0, g.lives - (g.phase === "dying" && g.phaseTime > DEATH_FREEZE ? 1 : 0));
    for (let i = 0; i < Math.min(lives, 6); i++) drawMuncher(ctx, 20 + i * 26, TOP + ROWS * T + 18, 9, LEFT, 0.55);
    const shown = Math.min(g.level, 5);
    for (let i = 0; i < shown; i++) {
      const lv = g.level - shown + 1 + i;
      drawBonus(ctx, bonusForLevel(lv), W - 20 - (shown - 1 - i) * 26, TOP + ROWS * T + 18, 9);
    }
  };

  const touchDir = (d: { up: boolean; down: boolean; left: boolean; right: boolean }) => {
    const dir = d.up ? UP : d.down ? DOWN : d.left ? LEFT : d.right ? RIGHT : -1;
    if (dir >= 0) dirTo(dir as Dir);
  };

  return (
    <div className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas width={W} height={H} draw={draw} background="#02030a" onPointer={onPointer} />
      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={best || undefined}
          extra={
            <div className="mt-3 hidden grid-cols-2 gap-x-3 gap-y-1 text-left text-[11px] text-white/70 [@media(min-height:560px)]:grid">
              {HUNTERS.map((h) => (
                <div key={h.name} className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: h.color }} />
                  <span><b className="text-white">{h.name}</b> {h.role}</span>
                </div>
              ))}
            </div>
          }
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={start} />}
      {phase === "over" && (
        <GameOverPanel accent={meta.accent} score={result.score} best={best} isBest={result.isBest} onRestart={start}>
          <p className="mt-2 text-xs text-white/55">You reached level {result.level}</p>
        </GameOverPanel>
      )}
      {touch && phase === "playing" && (
        <>
          <button
            type="button"
            aria-label="Pause"
            className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white"
            onClick={() => go("paused")}
          >
            ⏸
          </button>
          <button
            type="button"
            aria-label={pad ? "Hide D-pad" : "Show D-pad"}
            className={`absolute right-12 top-2 z-10 h-9 rounded-full border px-3 text-xs font-bold text-white ${pad ? "border-white/70 bg-white/25" : "border-white/25 bg-black/40"}`}
            onClick={() => {
              saveState("maze-muncher:pad", !pad);
              setPad(!pad);
            }}
          >
            D-pad
          </button>
          {pad && <DPad onChange={touchDir} size={140} className="absolute bottom-3 right-3 z-10" />}
        </>
      )}
    </div>
  );
}
