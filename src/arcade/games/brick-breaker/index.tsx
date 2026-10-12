// Brick Breaker: rules live in logic.ts and the level layouts in levels.ts; this file draws, plays sounds,
// reads mouse / keys / touch drags, and runs the start / pause / game-over flow.
import { useCallback, useRef, useState } from "react";
import { GameCanvas, type CanvasPointer, type View } from "../../kit/GameCanvas";
import { DISPLAY_FONT, Floaters, Particles, Shake, clamp, fillRoundRect, roundRect, shade, text, withAlpha } from "../../kit/draw";
import { useHeldKeys, useKeyPress } from "../../kit/input";
import { randomSeed } from "../../kit/rng";
import { play, tone } from "../../kit/sfx";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import {
  BALL_R, BH, BW, CLEAR_TIME, H, PADDLE_H, PADDLE_Y, POWER_LETTER, POWER_TIME, W, WALL_TOP,
  launch, newGame, setPaddleTarget, update, type Ball, type Brick, type BreakerEvent, type BreakerState, type PowerKind,
} from "./logic";
import { meta } from "./meta";

type Phase = "ready" | "playing" | "paused" | "over";

const BRICK_COLORS = ["#ef4444", "#f97316", "#facc15", "#4ade80", "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6"];
const POWER_COLORS: Record<PowerKind, string> = {
  multi: "#f472b6", wide: "#4ade80", laser: "#ef4444", slow: "#60a5fa", sticky: "#a3e635", life: "#fbbf24", shrink: "#64748b",
};
const POWER_NAMES: Record<PowerKind, string> = {
  multi: "Multi-ball", wide: "Wide", laser: "Laser", slow: "Slow", sticky: "Catch", life: "Life", shrink: "Shrink",
};

/** A repeatable pseudo-random number from a brick's position, for its cracks. */
const hash = (a: number, b: number, c: number) => {
  const n = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return n - Math.floor(n);
};

function drawBrick(ctx: CanvasRenderingContext2D, b: Brick) {
  const x = b.x + 1;
  const y = b.y + 1;
  const w = BW - 2;
  const h = BH - 2;
  let base: string;
  if (b.kind === "steel") base = "#64748b";
  else if (b.kind === "multi") base = b.maxHp === 2 ? "#94a3b8" : "#c08a2b";
  else base = BRICK_COLORS[b.color];
  fillRoundRect(ctx, x, y, w, h, 3, shade(base, -0.22));
  fillRoundRect(ctx, x, y, w, h - 2.5, 3, base);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(x + 3, y + 1.5, w - 6, 2);
  if (b.kind === "steel") {
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 8 + i * 11, y + h - 2.5);
      ctx.lineTo(x + 14 + i * 11, y + 1);
      ctx.lineTo(x + 18 + i * 11, y + 1);
      ctx.lineTo(x + 12 + i * 11, y + h - 2.5);
      ctx.fill();
    }
    ctx.fillStyle = "#334155";
    for (const rx of [x + 4, x + w - 4]) {
      ctx.beginPath();
      ctx.arc(rx, y + h / 2 - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (b.kind === "multi") {
    // Pips show how many hits are left; cracks show how many it has taken.
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    for (let i = 0; i < b.hp; i++) {
      ctx.beginPath();
      ctx.arc(x + w / 2 + (i - (b.hp - 1) / 2) * 7, y + h / 2 - 1, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    const dmg = b.maxHp - b.hp;
    if (dmg > 0) {
      ctx.strokeStyle = "rgba(20,20,30,0.75)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let k = 0; k < dmg * 2; k++) {
        let cx = x + 5 + hash(b.col, b.row, k) * (w - 10);
        let cy = y + 1;
        ctx.moveTo(cx, cy);
        for (let seg = 0; seg < 3; seg++) {
          cx += (hash(b.col, b.row, k * 7 + seg) - 0.5) * 9;
          cy += (h - 2) / 3;
          ctx.lineTo(cx, cy);
        }
      }
      ctx.stroke();
    }
  }
  if (b.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(b.flash / 0.25) * 0.7})`;
    roundRect(ctx, x, y, w, h, 3);
    ctx.fill();
  }
}

function drawCapsule(ctx: CanvasRenderingContext2D, kind: PowerKind, x: number, y: number, time: number) {
  const c = POWER_COLORS[kind];
  const w = 38;
  const h = 17;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = withAlpha(c, 0.3);
  roundRect(ctx, -w / 2 - 3, -h / 2 - 3, w + 6, h + 6, h / 2 + 3);
  ctx.fill();
  fillRoundRect(ctx, -w / 2, -h / 2, w, h, h / 2, shade(c, -0.25));
  fillRoundRect(ctx, -w / 2, -h / 2, w, h - 3, h / 2, c);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(-w / 2 + 6, -h / 2 + 2, w - 12, 2);
  text(ctx, POWER_LETTER[kind], 0, 0.5, { size: 12, weight: 900, color: kind === "shrink" ? "#fecaca" : "#0b1020" });
  // A little shine that sweeps across.
  const sx = ((time * 1.6) % 1) * (w + 20) - w / 2 - 10;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#fff";
  ctx.fillRect(clamp(sx, -w / 2, w / 2 - 3), -h / 2 + 2, 3, h - 6);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export default function BrickBreaker({ touch, best, submitScore }: GameProps) {
  const game = useRef<BreakerState>(newGame(randomSeed()));
  const fx = useRef({
    particles: new Particles(900), shake: new Shake(), floaters: new Floaters(), trails: new WeakMap<Ball, { x: number; y: number }[]>(),
    fireworks: 0, banner: 0, flash: 0, drag: null as null | { id: number; startX: number; paddleX: number }, down: false,
  });
  const keys = useHeldKeys();
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [result, setResult] = useState({ score: 0, isBest: false, level: 1 });

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const start = useCallback(() => {
    game.current = newGame(randomSeed());
    const f = fx.current;
    f.particles.clear();
    f.floaters.items = [];
    f.banner = 0;
    f.down = false;
    f.drag = null;
    play("select");
    go("playing");
  }, [go]);

  const fire = () => {
    if (phaseRef.current !== "playing") return;
    const ev = launch(game.current);
    if (ev.length) play("blip", 1.3);
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) go(p === "playing" ? "paused" : "playing");
    else if (code === "Space" || code === "Enter") {
      if (p === "ready" || p === "over") start();
      else fire();
    } else if (p === "ready" && (code === "ArrowLeft" || code === "ArrowRight" || code === "KeyA" || code === "KeyD")) start();
  });

  const onPointer = (p: CanvasPointer) => {
    const f = fx.current;
    const g = game.current;
    if (phaseRef.current !== "playing") return;
    if (p.pointerType === "mouse") {
      if (p.type === "move" || p.type === "down") setPaddleTarget(g, p.x);
      if (p.type === "down") {
        f.down = true;
        fire();
      } else if (p.type === "up") f.down = false;
      return;
    }
    // Touch: drag anywhere to slide the paddle (relative, so your thumb doesn't cover it); touching launches.
    if (p.type === "down") {
      f.drag = { id: p.id, startX: p.x, paddleX: g.paddle.target };
      f.down = true;
      fire();
    } else if (p.type === "move" && f.drag && f.drag.id === p.id) {
      setPaddleTarget(g, f.drag.paddleX + (p.x - f.drag.startX) * 1.15);
    } else if (p.type === "up" || p.type === "cancel") {
      f.drag = null;
      f.down = false;
    }
  };

  const handle = (events: BreakerEvent[], g: BreakerState) => {
    const f = fx.current;
    for (const e of events) {
      switch (e.type) {
        case "wall":
          tone(210, 0.05, "sine", 0.12);
          break;
        case "paddle":
          play("bounce", 1.1);
          f.particles.burst(e.x, PADDLE_Y, 5, { color: "#a5f3fc", speed: 90, size: 3, gravity: 120, spread: Math.PI * 0.8, angle: -Math.PI / 2 });
          break;
        case "hit":
          tone(560 + (e.brick ? e.brick.hp * 80 : 0), 0.07, "triangle", 0.12);
          f.shake.add(0.06);
          f.particles.burst(e.x, e.y, 5, { color: ["#cbd5e1", "#94a3b8"], speed: 100, size: 3, gravity: 300 });
          break;
        case "steel":
          tone(1250, 0.07, "triangle", 0.1);
          tone(930, 0.1, "square", 0.04, { delay: 0.02 });
          f.particles.burst(e.x, e.y, 3, { color: "#e2e8f0", speed: 120, size: 2, shape: "spark", gravity: 0 });
          break;
        case "break": {
          const b = e.brick!;
          const color = b.kind === "multi" ? (b.maxHp === 2 ? "#94a3b8" : "#c08a2b") : BRICK_COLORS[b.color];
          tone(330 + (14 - b.row) * 26, 0.09, "square", 0.1);
          play("pop", 0.9 + (14 - b.row) * 0.03);
          f.particles.burst(e.x, e.y, 14, { color: [color, shade(color, 0.2), "#ffffff"], speed: 190, size: 4.5, gravity: 520, shape: "square", life: 0.8 });
          f.shake.add(0.1);
          f.floaters.add(e.x, e.y - 6, `${e.points}`, "#fde68a", 13);
          break;
        }
        case "power": {
          play("powerup");
          const k = e.power!;
          f.floaters.add(e.x, PADDLE_Y - 24, k === "life" ? "+1 LIFE" : POWER_NAMES[k].toUpperCase(), POWER_COLORS[k], 15);
          f.particles.burst(e.x, PADDLE_Y, 16, { color: [POWER_COLORS[k], "#ffffff"], speed: 170, size: 4, gravity: 100, angle: -Math.PI / 2, spread: Math.PI });
          break;
        }
        case "extra-life":
          play("levelup");
          break;
        case "laser":
          play("laser", 1.4);
          break;
        case "stick":
          tone(300, 0.08, "sine", 0.14, { slide: 180 });
          break;
        case "life-lost":
          play("lose");
          f.shake.add(0.7);
          f.particles.burst(g.paddle.x, PADDLE_Y, 30, { color: ["#22d3ee", "#ffffff", "#0e7490"], speed: 240, size: 5, gravity: 300, angle: -Math.PI / 2, spread: Math.PI });
          break;
        case "clear":
          play("win");
          f.fireworks = CLEAR_TIME;
          f.banner = 0;
          break;
        case "level":
          play("levelup");
          f.banner = 0;
          break;
        case "over": {
          const isBest = submitScore(g.score);
          setResult({ score: g.score, isBest, level: g.level });
          window.setTimeout(() => go("over"), 500);
          break;
        }
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, _view: View, dt: number, time: number) => {
    const g = game.current;
    const f = fx.current;
    if (phaseRef.current === "playing") {
      const k = keys.current;
      const left = k.has("ArrowLeft") || k.has("KeyA");
      const right = k.has("ArrowRight") || k.has("KeyD");
      handle(update(g, dt, { left, right, fire: k.has("Space") || f.down }), g);
      f.banner += dt;
    }
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);
    if (f.fireworks > 0) {
      f.fireworks -= dt;
      if (Math.random() < dt * 9) {
        const fxx = 60 + Math.random() * (W - 120);
        const fyy = 120 + Math.random() * 220;
        f.particles.burst(fxx, fyy, 26, { color: ["#fde047", "#f472b6", "#22d3ee", "#4ade80", "#ffffff"], speed: 200, size: 4, gravity: 160, shape: "spark", life: 1 });
        tone(500 + Math.random() * 600, 0.1, "triangle", 0.06, { slide: 1400 });
      }
    }

    const [sx, sy] = f.shake.offset(8);
    ctx.save();
    ctx.translate(sx, sy);

    // ---- backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0c1230");
    bg.addColorStop(1, "#060814");
    ctx.fillStyle = bg;
    ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.strokeStyle = "rgba(120,160,255,0.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 40) {
      ctx.moveTo(x, WALL_TOP);
      ctx.lineTo(x, H);
    }
    for (let y = WALL_TOP + 22; y <= H; y += 40) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
    // Side rails and the top wall.
    ctx.fillStyle = "rgba(34,211,238,0.5)";
    ctx.fillRect(0, WALL_TOP, 2, H);
    ctx.fillRect(W - 2, WALL_TOP, 2, H);
    ctx.fillRect(0, WALL_TOP - 1, W, 2);

    // ---- bricks
    for (const b of g.grid) if (b) drawBrick(ctx, b);

    // ---- capsules and lasers
    for (const c of g.capsules) drawCapsule(ctx, c.kind, c.x, c.y, time);
    ctx.fillStyle = "#fecaca";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 8;
    for (const bolt of g.bolts) ctx.fillRect(bolt.x - 1.5, bolt.y - 10, 3, 14);
    ctx.shadowBlur = 0;

    // ---- paddle
    const px = g.paddle.x;
    const pw = g.paddle.w;
    const pg = ctx.createLinearGradient(0, PADDLE_Y, 0, PADDLE_Y + PADDLE_H);
    pg.addColorStop(0, g.powers.shrink > 0 ? "#94a3b8" : "#a5f3fc");
    pg.addColorStop(1, g.powers.shrink > 0 ? "#475569" : "#0e7490");
    ctx.fillStyle = withAlpha("#22d3ee", 0.18);
    roundRect(ctx, px - pw / 2 - 4, PADDLE_Y - 4, pw + 8, PADDLE_H + 8, 11);
    ctx.fill();
    fillRoundRect(ctx, px - pw / 2, PADDLE_Y, pw, PADDLE_H, 7, "#0b3b4a");
    roundRect(ctx, px - pw / 2, PADDLE_Y, pw, PADDLE_H, 7);
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(px - pw / 2 + 8, PADDLE_Y + 2, pw - 16, 2);
    for (const s of [-1, 1]) {
      ctx.fillStyle = g.powers.laser > 0 ? "#f87171" : "#22d3ee";
      ctx.fillRect(px + s * (pw / 2 - 8) - 2, PADDLE_Y + 3, 4, 8);
    }
    if (g.powers.laser > 0) {
      ctx.fillStyle = "#fecaca";
      for (const s of [-1, 1]) ctx.fillRect(px + s * (pw / 2 - 6) - 2, PADDLE_Y - 7, 4, 8);
    }
    if (g.powers.sticky > 0) {
      ctx.fillStyle = "#a3e635";
      for (let i = 0; i < 6; i++) {
        const gx = px - pw / 2 + 8 + (i * (pw - 16)) / 5;
        ctx.beginPath();
        ctx.arc(gx, PADDLE_Y - 0.5, 3 + Math.sin(time * 4 + i) * 0.6, Math.PI, 0);
        ctx.fill();
      }
    }

    // ---- balls with trails
    for (const b of g.balls) {
      let tr = f.trails.get(b);
      if (!tr) {
        tr = [];
        f.trails.set(b, tr);
      }
      if (!b.stuck) {
        tr.push({ x: b.x, y: b.y });
        if (tr.length > 9) tr.shift();
      } else tr.length = 0;
      for (let i = 0; i < tr.length; i++) {
        ctx.fillStyle = `rgba(165,243,252,${(i / tr.length) * 0.35})`;
        ctx.beginPath();
        ctx.arc(tr[i].x, tr[i].y, BALL_R * (0.35 + 0.6 * (i / tr.length)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(165,243,252,0.25)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R + 4, 0, Math.PI * 2);
      ctx.fill();
      const bgd = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, BALL_R);
      bgd.addColorStop(0, "#ffffff");
      bgd.addColorStop(1, g.powers.slow > 0 ? "#93c5fd" : "#67e8f9");
      ctx.fillStyle = bgd;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
    }

    f.particles.draw(ctx);
    f.floaters.draw(ctx);

    // ---- messages
    if (g.phase === "serve" && phaseRef.current === "playing") {
      if (f.banner < 2.2) {
        ctx.globalAlpha = clamp(2.2 - f.banner, 0, 1);
        text(ctx, `LEVEL ${g.level}`, W / 2, 392, { size: 34, font: DISPLAY_FONT, color: "#e0f2fe", weight: 900, stroke: "#06101f", strokeWidth: 5 });
        text(ctx, g.levelName.toUpperCase(), W / 2, 424, { size: 15, color: "#67e8f9", weight: 800 });
        ctx.globalAlpha = 1;
      }
      if (Math.floor(time * 2) % 2 === 0) {
        text(ctx, touch ? "Touch to launch" : "Click or press Space to launch", W / 2, PADDLE_Y - 36, { size: 13, color: "rgba(255,255,255,0.7)" });
      }
    }
    if (g.phase === "clear") {
      const k = clamp(g.phaseTime / 0.4, 0, 1);
      ctx.globalAlpha = k;
      text(ctx, "LEVEL CLEAR!", W / 2, 330 - (1 - k) * 20, { size: 38, font: DISPLAY_FONT, color: "#fde047", weight: 900, stroke: "#06101f", strokeWidth: 6 });
      text(ctx, `Bonus +${500 + 100 * g.level}`, W / 2, 366, { size: 16, color: "#e2e8f0", weight: 800 });
      ctx.globalAlpha = 1;
    }
    if (g.phase === "dead" && g.lives > 0) {
      text(ctx, g.lives === 1 ? "Last life!" : "Ball lost", W / 2, 380, { size: 22, color: "#fca5a5", weight: 900, stroke: "#06101f", strokeWidth: 4 });
    }

    ctx.restore();

    // ---- HUD
    ctx.fillStyle = "#070a1a";
    ctx.fillRect(0, 0, W, WALL_TOP - 1);
    text(ctx, `${g.score}`, 14, 22, { align: "left", size: 24, font: DISPLAY_FONT, color: "#a5f3fc", weight: 900 });
    text(ctx, "SCORE", 15, 40, { align: "left", size: 9, color: "rgba(255,255,255,0.45)" });
    text(ctx, `LEVEL ${g.level}`, W / 2, 21, { size: 16, font: DISPLAY_FONT, color: "#e2e8f0", weight: 900 });
    text(ctx, `BEST ${Math.max(best, g.score)}`, W / 2, 39, { size: 11, color: "rgba(255,255,255,0.5)" });
    for (let i = 0; i < Math.min(g.lives, 9); i++) {
      fillRoundRect(ctx, W - 20 - i * 19, 16, 15, 6, 3, "#22d3ee");
      fillRoundRect(ctx, W - 20 - i * 19, 16, 15, 3, 2, "#a5f3fc");
    }
    text(ctx, "LIVES", W - 14, 40, { align: "right", size: 9, color: "rgba(255,255,255,0.45)" });

    // Active power-ups as timers under the paddle.
    let chip = 0;
    for (const k of ["wide", "shrink", "laser", "slow", "sticky"] as const) {
      const left = g.powers[k];
      if (left <= 0) continue;
      const kind: PowerKind = k === "sticky" ? "sticky" : k;
      const x = 12 + chip * 78;
      const frac = left / POWER_TIME[k];
      fillRoundRect(ctx, x, 618, 70, 14, 7, "rgba(255,255,255,0.1)");
      fillRoundRect(ctx, x, 618, Math.max(6, 70 * frac), 14, 7, withAlpha(POWER_COLORS[kind], 0.85));
      text(ctx, POWER_NAMES[kind], x + 35, 625.5, { size: 10, weight: 800, color: "#06101f" });
      chip++;
    }
  };

  return (
    <div className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas width={W} height={H} draw={draw} background="#03050f" onPointer={onPointer} cursor="none" />
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
            <div className="mt-3 hidden flex-wrap justify-center gap-1.5 text-[10px] font-bold text-black [@media(min-height:560px)]:flex">
              {(["multi", "wide", "laser", "slow", "sticky", "life"] as PowerKind[]).map((k) => (
                <span key={k} className="rounded-full px-2 py-0.5" style={{ background: POWER_COLORS[k] }}>
                  {POWER_LETTER[k]} {POWER_NAMES[k]}
                </span>
              ))}
              <span className="rounded-full bg-slate-500 px-2 py-0.5 text-red-100">▼ Shrink (bad!)</span>
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
