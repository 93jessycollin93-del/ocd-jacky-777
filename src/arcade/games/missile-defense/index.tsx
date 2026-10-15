// Missile Defense: rules in logic.ts; this file draws a neon CRT sky, plays the sounds and handles input
// (click or tap to fire from the nearest base, A/S/D to pick a base) plus the start / pause / game-over flow.
import { useCallback, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { DISPLAY_FONT, Floaters, Particles, Shake, circle, text } from "../../kit/draw";
import { useKeyPress } from "../../kit/input";
import { noise, play, tone } from "../../kit/sfx";
import { randomSeed } from "../../kit/rng";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import {
  BASE_X, CITY_X, GROUND, H, W, blastRadius, fire, nearestBase, newGame, step, waveSpec, type MdEvent, type MdState,
} from "./logic";

type Phase = "ready" | "playing" | "paused" | "over";

const BASE_KEYS: Record<string, number> = { KeyA: 0, KeyS: 1, KeyD: 2, Digit1: 0, Digit2: 1, Digit3: 2 };
const BLAST_COLORS = ["#fde047", "#f472b6", "#38bdf8", "#ffffff", "#fb923c"];

/** The starfield, ground glow and scanlines never change, so they're painted once. */
function makeBackdrop(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#05010f");
  sky.addColorStop(0.65, "#140a2e");
  sky.addColorStop(1, "#2a0b2f");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 140; i++) {
    g.fillStyle = `rgba(255,255,255,${0.2 + rnd() * 0.6})`;
    g.fillRect(rnd() * W, rnd() * (GROUND - 60), rnd() < 0.1 ? 2 : 1, rnd() < 0.1 ? 2 : 1);
  }
  // Horizon glow.
  const glow = g.createRadialGradient(W / 2, GROUND + 60, 20, W / 2, GROUND + 60, 520);
  glow.addColorStop(0, "rgba(244,63,94,0.35)");
  glow.addColorStop(1, "rgba(244,63,94,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  // Ground with hills under the bases.
  g.fillStyle = "#1a0712";
  g.beginPath();
  g.moveTo(0, H);
  g.lineTo(0, GROUND);
  for (const bx of BASE_X) {
    g.lineTo(bx - 46, GROUND);
    g.quadraticCurveTo(bx, GROUND - 40, bx + 46, GROUND);
  }
  g.lineTo(W, GROUND);
  g.lineTo(W, H);
  g.closePath();
  g.fill();
  g.strokeStyle = "#f43f5e";
  g.lineWidth = 2;
  g.stroke();
  // Scanlines.
  g.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  return c;
}

function drawCity(ctx: CanvasRenderingContext2D, x: number, alive: boolean, time: number) {
  const y = GROUND;
  if (!alive) {
    ctx.fillStyle = "#3f1d2b";
    ctx.beginPath();
    ctx.moveTo(x - 20, y);
    ctx.lineTo(x - 12, y - 7);
    ctx.lineTo(x - 4, y - 4);
    ctx.lineTo(x + 4, y - 9);
    ctx.lineTo(x + 13, y - 5);
    ctx.lineTo(x + 20, y);
    ctx.fill();
    // Smoke.
    for (let i = 0; i < 3; i++) {
      const k = (time * 0.4 + i / 3) % 1;
      circle(ctx, x - 6 + i * 6 + Math.sin(time + i) * 3, y - 10 - k * 30, 3 + k * 5, `rgba(120,113,108,${0.35 * (1 - k)})`);
    }
    return;
  }
  const blocks = [[-18, 16, 7], [-10, 26, 8], [0, 34, 7], [8, 22, 8], [15, 14, 5]];
  for (const [dx, h, w] of blocks) {
    ctx.fillStyle = "#0e2a3a";
    ctx.fillRect(x + dx, y - h, w, h);
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x + dx + 0.5, y - h + 0.5, w - 1, h - 1);
    ctx.fillStyle = "rgba(253,224,71,0.85)";
    for (let wy = y - h + 4; wy < y - 3; wy += 6) {
      if ((wy + dx * 3) % 4 !== 0) ctx.fillRect(x + dx + 2, wy, 2, 2);
    }
  }
}

export default function MissileDefense({ touch, best, submitScore }: GameProps) {
  const game = useRef<MdState>(newGame(randomSeed()));
  const fx = useRef({ particles: new Particles(900), shake: new Shake(), floaters: new Floaters(), flash: 0, banner: "", bannerT: 0 });
  const aim = useRef({ x: W / 2, y: GROUND / 2 });
  const backdrop = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [result, setResult] = useState({ score: 0, wave: 1, isBest: false });

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const start = useCallback(() => {
    game.current = newGame(randomSeed());
    const f = fx.current;
    f.particles.clear();
    f.banner = "Wave 1";
    f.bannerT = 2;
    play("select");
    go("playing");
  }, [go]);

  const handle = (events: MdEvent[]) => {
    const f = fx.current;
    const g = game.current;
    for (const e of events) {
      if (e.type === "fire") tone(e.base === 1 ? 900 : 700, 0.12, "sawtooth", 0.05, { slide: 300 });
      else if (e.type === "empty") tone(140, 0.08, "square", 0.04);
      else if (e.type === "kill") {
        f.particles.burst(e.x, e.y, e.kind === "bomber" || e.kind === "satellite" ? 30 : 14, {
          color: ["#fde047", "#fb923c", "#f43f5e"], speed: 140, size: 3, gravity: 60, life: 0.6,
        });
        f.floaters.add(e.x, e.y - 12, `+${e.points * waveSpec(g.wave).multiplier}`, "#fde68a", 14);
        noise(0.25, 0.08, { type: "lowpass", freq: 1400, sweep: 300 });
      } else if (e.type === "split") {
        tone(520, 0.1, "triangle", 0.05, { slide: 260 });
      } else if (e.type === "city" || e.type === "base") {
        f.shake.add(0.7);
        f.flash = 0.6;
        f.particles.burst(e.x, GROUND - 8, 40, { color: ["#f43f5e", "#fb923c", "#fde047", "#a8a29e"], speed: 220, size: 4, gravity: 260 });
        play("explode");
      } else if (e.type === "ground") {
        f.particles.burst(e.x, GROUND - 4, 12, { color: ["#a8a29e", "#78716c"], speed: 120, size: 3, gravity: 300 });
        noise(0.2, 0.06, { type: "lowpass", freq: 600 });
      } else if (e.type === "waveEnd") {
        f.banner = `Wave ${g.wave} cleared · +${e.bonus.toLocaleString("en-US")}`;
        f.bannerT = 2.6;
        play("levelup");
      } else if (e.type === "bonusCity") {
        f.floaters.add(CITY_X[e.index], GROUND - 50, "Bonus city!", "#67e8f9", 18);
        play("powerup");
      } else if (e.type === "gameOver") {
        f.shake.add(1);
        f.flash = 1;
        play("lose");
        const isBest = submitScore(g.score);
        setResult({ score: g.score, wave: g.wave, isBest });
        window.setTimeout(() => go("over"), 1200);
      }
    }
  };

  const shoot = (base: number, x: number, y: number) => {
    if (phaseRef.current !== "playing") return;
    const ev: MdEvent[] = [];
    fire(game.current, base, x, y, ev);
    handle(ev);
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) {
      go(p === "playing" ? "paused" : "playing");
      return;
    }
    if ((code === "Space" || code === "Enter") && (p === "ready" || p === "over")) {
      start();
      return;
    }
    if (code in BASE_KEYS) shoot(BASE_KEYS[code], aim.current.x, aim.current.y);
  });

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number, time: number) => {
    const g = game.current;
    const f = fx.current;
    if (phaseRef.current === "playing") {
      const before = g.wave;
      handle(step(g, Math.min(dt, 1 / 20)));
      if (g.wave !== before) {
        f.banner = `Wave ${g.wave}`;
        f.bannerT = 1.8;
      }
    }
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);
    f.flash = Math.max(0, f.flash - dt * 2.5);
    f.bannerT = Math.max(0, f.bannerT - dt);

    const [sx, sy] = f.shake.offset(10);
    ctx.save();
    ctx.translate(sx, sy);
    backdrop.current ??= makeBackdrop();
    ctx.drawImage(backdrop.current, 0, 0);

    // Cities and bases.
    CITY_X.forEach((x, i) => drawCity(ctx, x, g.cities[i], time));
    g.bases.forEach((b, i) => {
      const bx = b.x;
      const by = GROUND - 26;
      if (!b.alive) {
        ctx.fillStyle = "#3f1d2b";
        ctx.fillRect(bx - 14, by + 10, 28, 6);
        return;
      }
      // Missiles waiting in the silo, in a small pyramid.
      let n = 0;
      for (let row = 0; row < 4 && n < b.ammo; row++) {
        for (let k = 0; k <= row && n < b.ammo; k++, n++) {
          const mx = bx + (k - row / 2) * 9;
          const my = by - 18 + row * 8;
          ctx.fillStyle = i === 1 ? "#38bdf8" : "#a78bfa";
          ctx.fillRect(mx - 1.5, my - 3, 3, 7);
        }
      }
      if (b.ammo === 0) text(ctx, "OUT", bx, by + 4, { size: 11, color: "#f87171", weight: 900 });
      else if (b.ammo <= 3) text(ctx, "LOW", bx, by + 4, { size: 10, color: "#fbbf24", weight: 800 });
    });

    // Incoming threats: a fading trail from where they started, and a bright head.
    for (const t of g.threats) {
      const trail = ctx.createLinearGradient(t.x0, t.y0, t.x, t.y);
      trail.addColorStop(0, "rgba(244,63,94,0)");
      trail.addColorStop(1, t.kind === "smart" ? "rgba(232,121,249,0.9)" : "rgba(251,113,133,0.9)");
      ctx.strokeStyle = trail;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.x0, t.y0);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
      if (t.kind === "smart") {
        ctx.fillStyle = "#e879f9";
        ctx.beginPath();
        ctx.moveTo(t.x, t.y - 6);
        ctx.lineTo(t.x + 5, t.y);
        ctx.lineTo(t.x, t.y + 6);
        ctx.lineTo(t.x - 5, t.y);
        ctx.fill();
      } else {
        circle(ctx, t.x, t.y, 4.5, "rgba(255,255,255,0.25)");
        circle(ctx, t.x, t.y, 2.4, t.kind === "mirv" ? "#fde047" : "#fff");
      }
    }

    // Bombers and satellites.
    for (const b of g.bombers) {
      ctx.save();
      ctx.translate(b.x, b.y);
      if (b.vx < 0) ctx.scale(-1, 1);
      if (b.kind === "bomber") {
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-4, -12, 6, 24);
        ctx.fillRect(-16, -6, 3, 12);
        circle(ctx, 14, -1, 2, "#f43f5e");
      } else {
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(-5, -5, 10, 10);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-18, -3, 11, 6);
        ctx.fillRect(7, -3, 11, 6);
        circle(ctx, 0, 0, 2, Math.floor(time * 4) % 2 ? "#f43f5e" : "#fde047");
      }
      ctx.restore();
    }

    // Interceptors: a straight trail from the base and an X where they'll burst.
    for (const m of g.shots) {
      ctx.strokeStyle = "rgba(56,189,248,0.85)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(m.x0, m.y0);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
      circle(ctx, m.x, m.y, 2.2, "#e0f2fe");
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(m.tx - 5, m.ty - 5);
      ctx.lineTo(m.tx + 5, m.ty + 5);
      ctx.moveTo(m.tx + 5, m.ty - 5);
      ctx.lineTo(m.tx - 5, m.ty + 5);
      ctx.stroke();
    }

    // Blasts: glowing discs that flicker through the palette.
    for (const b of g.blasts) {
      const r = blastRadius(b);
      if (r <= 0) continue;
      const color = BLAST_COLORS[Math.floor(time * 18 + b.x) % BLAST_COLORS.length];
      const grad = ctx.createRadialGradient(b.x, b.y, r * 0.15, b.x, b.y, r * 1.35);
      grad.addColorStop(0, "rgba(255,255,255,0.95)");
      grad.addColorStop(0.55, color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r * 1.35, 0, Math.PI * 2);
      ctx.fill();
    }

    f.particles.draw(ctx);
    f.floaters.draw(ctx);
    ctx.restore();

    if (f.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${f.flash * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Crosshair on desktop.
    if (!touch && phaseRef.current === "playing") {
      const { x, y } = aim.current;
      ctx.strokeStyle = "rgba(125,211,252,0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.moveTo(x - 14, y);
      ctx.lineTo(x - 4, y);
      ctx.moveTo(x + 4, y);
      ctx.lineTo(x + 14, y);
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x, y - 4);
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x, y + 14);
      ctx.stroke();
    }

    // HUD. On a small screen (phone held upright) the text is scaled up so it stays readable.
    const k = Math.min(2.2, Math.max(1, 0.85 / view.scale));
    text(ctx, g.score.toLocaleString("en-US"), 16, 14 + 10 * k, { align: "left", size: 24 * k, font: DISPLAY_FONT, color: "#fda4af", weight: 900 });
    text(ctx, `WAVE ${g.wave} · ×${waveSpec(g.wave).multiplier}`, W / 2, 12 + 10 * k, { size: 13 * k, color: "rgba(255,255,255,0.75)", weight: 800 });
    text(ctx, `HI ${Math.max(best, g.score).toLocaleString("en-US")}`, W - (touch ? 58 : 16), 14 + 10 * k, { align: "right", size: 15 * k, color: "#fde68a", weight: 800 });
    if (f.bannerT > 0) {
      const a = Math.min(1, f.bannerT * 2);
      text(ctx, f.banner, W / 2, H * 0.36, { size: 30 * k, font: DISPLAY_FONT, color: `rgba(253,224,71,${a})`, weight: 900, stroke: `rgba(0,0,0,${a * 0.6})`, strokeWidth: 5 });
    }
  };

  return (
    <div className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas
        width={W}
        height={H}
        draw={draw}
        background="#05010f"
        cursor={touch ? "default" : "none"}
        onPointer={(p) => {
          if (p.type === "move" || p.type === "down") aim.current = { x: p.x, y: p.y };
          if (p.type !== "down") return;
          if (phaseRef.current === "ready") {
            start();
            return;
          }
          const base = nearestBase(game.current, p.x);
          if (base < 0) {
            handle([{ type: "empty" }]);
            return;
          }
          shoot(base, p.x, p.y);
        }}
      />
      {touch && phase === "playing" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] font-semibold text-white/60 [@media(orientation:landscape)]:hidden">
          ↻ Turn your phone sideways for a bigger sky
        </div>
      )}
      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={best ? best.toLocaleString("en-US") : undefined}
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={start} />}
      {phase === "over" && (
        <GameOverPanel title="The cities have fallen" accent={meta.accent} score={result.score.toLocaleString("en-US")} best={best ? best.toLocaleString("en-US") : undefined} isBest={result.isBest} onRestart={start}>
          <p className="mt-2 text-xs text-white/55">You held out until wave {result.wave}.</p>
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
