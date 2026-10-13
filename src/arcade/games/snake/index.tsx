// Snake: the reference Arcade game. Rules live in logic.ts; this file draws, plays sounds and handles
// input (keys, swipes, taps) and the start / pause / game-over flow.
import { useCallback, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { circle, fillRoundRect, Particles, Shake, Floaters, text, lerp, DISPLAY_FONT } from "../../kit/draw";
import { useKeyPress, useSwipe, type SwipeDir } from "../../kit/input";
import { play, tone } from "../../kit/sfx";
import { randomSeed } from "../../kit/rng";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import { COLS, ROWS, newGame, turn, update, type Cell, type Dir, type SnakeState } from "./logic";

const CELL = 24;
const TOP = 52;
const W = COLS * CELL;
const H = ROWS * CELL + TOP;

type Phase = "ready" | "playing" | "paused" | "over";

const KEYS: Record<string, Dir> = {
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
};

export default function SnakeGame({ touch, best, submitScore }: GameProps) {
  const game = useRef<SnakeState>(newGame(randomSeed()));
  const prev = useRef<Cell[]>(game.current.snake.map((c) => ({ ...c })));
  const fx = useRef({ particles: new Particles(), shake: new Shake(), floaters: new Floaters(), pulse: 0 });
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [result, setResult] = useState({ score: 0, isBest: false });
  const area = useRef<HTMLDivElement>(null);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const start = useCallback(() => {
    game.current = newGame(randomSeed());
    prev.current = game.current.snake.map((c) => ({ ...c }));
    fx.current.particles.clear();
    play("select");
    go("playing");
  }, [go]);

  const steer = (d: Dir) => {
    if (phaseRef.current === "ready" || phaseRef.current === "over") return;
    if (phaseRef.current === "playing") turn(game.current, d);
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if (KEYS[code]) {
      if (p === "ready") start();
      steer(KEYS[code]);
      return;
    }
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) go(p === "playing" ? "paused" : "playing");
    else if ((code === "Space" || code === "Enter") && (p === "ready" || p === "over")) start();
  });

  useSwipe(area, (dir: SwipeDir) => steer(dir));

  const draw = (ctx: CanvasRenderingContext2D, _view: View, dt: number, time: number) => {
    const g = game.current;
    const f = fx.current;
    const playing = phaseRef.current === "playing";

    if (playing) {
      const before = g.snake.map((c) => ({ ...c }));
      const eatenBefore = g.eaten;
      const events = update(g, dt);
      // When it steps, remember where each segment came from so it can slide there smoothly.
      if (before[0].x !== g.snake[0].x || before[0].y !== g.snake[0].y) prev.current = before;
      for (const e of events) {
        const h = g.snake[0];
        const hx = h.x * CELL + CELL / 2;
        const hy = TOP + h.y * CELL + CELL / 2;
        if (e === "eat") {
          play("pop", 1 + Math.min(1, g.eaten * 0.02));
          f.particles.burst(hx, hy, 14, { color: ["#ef4444", "#f87171", "#fbbf24"], speed: 140, size: 5, gravity: 0 });
          f.floaters.add(hx, hy - 10, "+10", "#fde68a", 16);
          f.pulse = 1;
        } else if (e === "bonus") {
          play("coin");
          f.particles.burst(hx, hy, 30, { color: ["#fde047", "#facc15", "#ffffff"], speed: 220, size: 5, gravity: 0, shape: "spark" });
          f.floaters.add(hx, hy - 10, "+50", "#fde047", 22);
          f.shake.add(0.25);
        } else if (e === "bonus-spawn") {
          tone(1200, 0.12, "triangle", 0.08, { slide: 1800 });
        } else if (e === "die") {
          play("lose");
          f.shake.add(0.8);
          f.particles.burst(hx, hy, 40, { color: ["#22c55e", "#16a34a", "#bbf7d0"], speed: 260, size: 6, gravity: 200 });
          const isBest = submitScore(g.score);
          setResult({ score: g.score, isBest });
          window.setTimeout(() => go("over"), 700);
        }
      }
      if (g.eaten !== eatenBefore && g.eaten % 10 === 0) play("levelup");
    }
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);
    f.pulse = Math.max(0, f.pulse - dt * 3);

    // ---- board
    const [sx, sy] = f.shake.offset(12);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = "#0b1410";
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#13241b" : "#16291f";
        ctx.fillRect(x * CELL, TOP + y * CELL, CELL, CELL);
      }
    }
    ctx.strokeStyle = "rgba(34,197,94,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, TOP + 1, W - 2, ROWS * CELL - 2);

    // ---- food: an apple that breathes, and the golden bonus with a countdown ring
    const fx_ = g.food.x * CELL + CELL / 2;
    const fy = TOP + g.food.y * CELL + CELL / 2;
    const breathe = 1 + Math.sin(time * 6) * 0.06;
    circle(ctx, fx_, fy + 1, CELL * 0.36 * breathe, "#7f1d1d");
    circle(ctx, fx_, fy, CELL * 0.36 * breathe, "#ef4444");
    circle(ctx, fx_ - 3, fy - 3, CELL * 0.1, "rgba(255,255,255,0.55)");
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.ellipse(fx_ + 3, fy - CELL * 0.38, 4, 2, -0.6, 0, Math.PI * 2);
    ctx.fill();
    if (g.bonus) {
      const bx = g.bonus.x * CELL + CELL / 2;
      const by = TOP + g.bonus.y * CELL + CELL / 2;
      const blink = g.bonus.ttl < 2 && Math.floor(time * 8) % 2 === 0;
      if (!blink) {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(time * 2);
        ctx.fillStyle = "#facc15";
        ctx.shadowColor = "#fde047";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? CELL * 0.18 : CELL * 0.42;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = "rgba(253,224,71,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, CELL * 0.62, -Math.PI / 2, -Math.PI / 2 + (Math.max(0, g.bonus.ttl) / 6) * Math.PI * 2);
      ctx.stroke();
    }

    // ---- the snake, sliding smoothly between cells
    const t = playing && g.alive ? Math.min(1, g.acc / g.stepTime) : 1;
    const n = g.snake.length;
    for (let i = n - 1; i >= 0; i--) {
      const c = g.snake[i];
      const p = prev.current[i] ?? prev.current[prev.current.length - 1] ?? c;
      const x = lerp(p.x, c.x, t) * CELL;
      const y = TOP + lerp(p.y, c.y, t) * CELL;
      const k = i / Math.max(1, n - 1);
      const pad = 2 + k * 3;
      const green = g.alive ? `hsl(${142 - k * 20}, ${70 - k * 15}%, ${48 - k * 18}%)` : `hsl(0, 0%, ${45 - k * 15}%)`;
      fillRoundRect(ctx, x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 6, green);
      if (i === 0) {
        // Eyes looking where it's going.
        const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[g.dir];
        const cx = x + CELL / 2;
        const cy = y + CELL / 2;
        for (const side of [-1, 1]) {
          const ex = cx + v[0] * 4 + -v[1] * side * 5;
          const ey = cy + v[1] * 4 + v[0] * side * 5;
          circle(ctx, ex, ey, 3.4, "#fff");
          circle(ctx, ex + v[0] * 1.3, ey + v[1] * 1.3, 1.7, g.alive ? "#052e16" : "#7f1d1d");
        }
        if (f.pulse > 0) circle(ctx, cx, cy, CELL * (0.6 + (1 - f.pulse) * 0.6), `rgba(250,204,21,${f.pulse * 0.25})`);
      }
    }

    f.particles.draw(ctx);
    f.floaters.draw(ctx);
    ctx.restore();

    // ---- HUD strip
    ctx.fillStyle = "#07100b";
    ctx.fillRect(0, 0, W, TOP);
    text(ctx, `${g.score}`, 18, TOP / 2, { align: "left", size: 28, font: DISPLAY_FONT, color: "#86efac", weight: 900 });
    text(ctx, "SCORE", 20, TOP / 2 + 17, { align: "left", size: 9, color: "rgba(255,255,255,0.45)" });
    text(ctx, `Length ${g.snake.length}`, W / 2, TOP / 2, { size: 13, color: "rgba(255,255,255,0.7)" });
    text(ctx, `${Math.max(best, g.score)}`, W - 18, TOP / 2, { align: "right", size: 22, font: DISPLAY_FONT, color: "#fde68a", weight: 900 });
    text(ctx, "BEST", W - 20, TOP / 2 + 17, { align: "right", size: 9, color: "rgba(255,255,255,0.45)" });
  };

  return (
    <div ref={area} className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas
        width={W}
        height={H}
        draw={draw}
        background="#050a07"
        onPointer={(p) => {
          if (p.type === "down" && phaseRef.current === "ready") start();
        }}
      />
      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={best || undefined}
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={start} />}
      {phase === "over" && (
        <GameOverPanel accent={meta.accent} score={result.score} best={best} isBest={result.isBest} onRestart={start}>
          <p className="mt-2 text-xs text-white/55">Length {game.current.snake.length} · {game.current.eaten} fruit</p>
        </GameOverPanel>
      )}
      {touch && phase === "playing" && (
        <button
          type="button"
          aria-label="Pause"
          className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white"
          onClick={() => go("paused")}
        >
          ⏸
        </button>
      )}
    </div>
  );
}
