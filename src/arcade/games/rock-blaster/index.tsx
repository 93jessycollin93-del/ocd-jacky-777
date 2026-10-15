// Rock Blaster: rules live in logic.ts; this file draws the glowing vector graphics, plays sounds, reads
// the keyboard and the on-screen buttons, and runs the start / pause / game-over flow.
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { DISPLAY_FONT, Floaters, Particles, Shake, lerp, text } from "../../kit/draw";
import { useHeldKeys, useKeyPress } from "../../kit/input";
import { randomSeed } from "../../kit/rng";
import { noise, play, tone } from "../../kit/sfx";
import { TouchButton } from "../../kit/TouchPad";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import {
  INVULN_TIME, SAUCER_RADIUS, hyperspace, newGame, resize, rockMass, rockPoints, rocksInWave, update,
  type RockEvent, type RockState,
} from "./logic";
import { meta } from "./meta";

type Phase = "ready" | "playing" | "paused" | "over";

const LANDSCAPE = { w: 800, h: 600 };
const PORTRAIT = { w: 450, h: 600 };

const C = {
  ship: "#e0f2fe", rock: "#7dd3fc", flame: "#fb923c", bullet: "#ffffff", bigSaucer: "#f472b6", smallSaucer: "#a3e635", enemy: "#fb7185",
};

interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  len: number;
  life: number;
  max: number;
  color: string;
}

export default function RockBlaster({ touch, best, submitScore }: GameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [portrait, setPortrait] = useState(false);
  const dims = portrait ? PORTRAIT : LANDSCAPE;
  const game = useRef<RockState>(newGame(randomSeed(), LANDSCAPE.w, LANDSCAPE.h));
  const fx = useRef({
    particles: new Particles(500), shake: new Shake(), floaters: new Floaters(), debris: [] as Debris[], beat: 0, beatFlip: false,
    siren: 0, sirenFlip: false, thrustSnd: 0, banner: 0, hyperFlash: 0, lastWave: 1,
  });
  const keys = useHeldKeys();
  const pad = useRef({ left: false, right: false, thrust: false, fire: false });
  const [padOn, setPadOn] = useState({ left: false, right: false, thrust: false, fire: false });
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [result, setResult] = useState({ score: 0, isBest: false, wave: 1 });

  // The playfield is wide on a landscape screen and narrower on a portrait one.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const check = () => setPortrait(el.clientHeight > el.clientWidth * 1.05);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    resize(game.current, dims.w, dims.h);
  }, [dims.w, dims.h]);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const start = useCallback(() => {
    game.current = newGame(randomSeed(), dims.w, dims.h);
    const f = fx.current;
    f.particles.clear();
    f.debris = [];
    f.floaters.items = [];
    f.banner = 2.2;
    f.lastWave = 1;
    pad.current = { left: false, right: false, thrust: false, fire: false };
    setPadOn({ ...pad.current });
    play("select");
    go("playing");
  }, [dims.w, dims.h, go]);

  const burstDebris = (x: number, y: number, n: number, color: string, speed: number) => {
    const f = fx.current;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.3 + Math.random() * 0.9);
      const life = 0.6 + Math.random() * 0.8;
      f.debris.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: Math.random() * 6, va: (Math.random() - 0.5) * 8, len: 4 + Math.random() * 9, life, max: life, color });
    }
  };

  const handle = (events: RockEvent[], g: RockState) => {
    const f = fx.current;
    for (const e of events) {
      switch (e.type) {
        case "shoot":
          tone(980, 0.09, "square", 0.05, { slide: 260 });
          break;
        case "rock": {
          const s = e.size ?? 0;
          noise(0.35 - s * 0.08, 0.3 - s * 0.05, { freq: 1500 - s * 350, sweep: 90 });
          burstDebris(e.x, e.y, 8 + (2 - s) * 2, C.rock, 90 + (2 - s) * 40);
          f.shake.add(s === 0 ? 0.12 : s === 1 ? 0.05 : 0.02);
          break;
        }
        case "ship-die":
          play("explode");
          burstDebris(e.x, e.y, 22, C.ship, 220);
          f.particles.burst(e.x, e.y, 24, { color: ["#fde68a", "#fb923c", "#ffffff"], speed: 200, size: 3.5, gravity: 0, shape: "spark", life: 0.9 });
          f.shake.add(0.85);
          break;
        case "saucer-spawn":
          f.siren = 0;
          break;
        case "saucer-die":
          noise(0.5, 0.35, { freq: 1800, sweep: 120 });
          burstDebris(e.x, e.y, 24, e.big ? C.bigSaucer : C.smallSaucer, 200);
          f.particles.burst(e.x, e.y, 18, { color: ["#ffffff", e.big ? C.bigSaucer : C.smallSaucer], speed: 180, size: 3, gravity: 0, shape: "spark" });
          if (e.points) f.floaters.add(e.x, e.y - 10, `+${e.points}`, "#fde047", 20);
          f.shake.add(0.3);
          break;
        case "saucer-shoot":
          tone(300, 0.1, "sawtooth", 0.05, { slide: 520 });
          break;
        case "extra-life":
          play("levelup");
          f.floaters.add(g.w / 2, g.h / 2 - 60, "EXTRA SHIP!", "#86efac", 26);
          break;
        case "wave":
          f.banner = 2.2;
          if (g.wave > 1) play("levelup");
          break;
        case "hyper":
          f.hyperFlash = 0.35;
          tone(1500, 0.18, "sine", 0.1, { slide: 200 });
          f.particles.burst(e.x, e.y, 10, { color: ["#a5f3fc", "#ffffff"], speed: 120, size: 3, gravity: 0, shape: "spark", life: 0.4 });
          break;
        case "hyper-fail":
          break;
        case "respawn":
          tone(300, 0.3, "sine", 0.1, { slide: 900 });
          break;
        case "over": {
          const isBest = submitScore(g.score);
          setResult({ score: g.score, isBest, wave: g.wave });
          go("over");
          break;
        }
      }
    }
  };

  const doHyper = () => {
    if (phaseRef.current !== "playing") return;
    const out: RockEvent[] = [];
    hyperspace(game.current, out);
    handle(out, game.current);
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) go(p === "playing" ? "paused" : "playing");
    else if ((code === "ShiftLeft" || code === "ShiftRight" || code === "KeyH") && p === "playing") doHyper();
    else if ((code === "Space" || code === "Enter") && (p === "ready" || p === "over")) start();
  });

  const setPadKey = (k: "left" | "right" | "thrust" | "fire", v: boolean) => {
    pad.current[k] = v;
    setPadOn({ ...pad.current });
  };

  const draw = (ctx: CanvasRenderingContext2D, _view: View, dt: number, time: number) => {
    const g = game.current;
    const f = fx.current;
    const W = g.w;
    const H = g.h;
    if (phaseRef.current === "playing") {
      const k = keys.current;
      const p = pad.current;
      const input = {
        left: k.has("ArrowLeft") || k.has("KeyA") || p.left,
        right: k.has("ArrowRight") || k.has("KeyD") || p.right,
        thrust: k.has("ArrowUp") || k.has("KeyW") || p.thrust,
        fire: k.has("Space") || p.fire,
      };
      handle(update(g, dt, input), g);

      // The heartbeat: two low notes that speed up as the rocks run out.
      if (g.ship.alive && g.rocks.length) {
        f.beat -= dt;
        if (f.beat <= 0) {
          f.beatFlip = !f.beatFlip;
          tone(f.beatFlip ? 58 : 50, 0.12, "square", 0.1);
          f.beat = lerp(0.3, 0.9, Math.min(1, rockMass(g) / (rocksInWave(g.wave) * 4)));
        }
      }
      if (g.saucer) {
        f.siren -= dt;
        if (f.siren <= 0) {
          f.sirenFlip = !f.sirenFlip;
          const small = g.saucer.kind === "small";
          tone((small ? 980 : 520) + (f.sirenFlip ? 90 : 0), 0.09, "triangle", 0.045);
          f.siren = 0.11;
        }
      }
      if (g.ship.alive && g.ship.thrusting) {
        f.thrustSnd -= dt;
        if (f.thrustSnd <= 0) {
          noise(0.12, 0.07, { freq: 260 });
          f.thrustSnd = 0.09;
        }
      }
      f.banner = Math.max(0, f.banner - dt);
    }
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);
    f.hyperFlash = Math.max(0, f.hyperFlash - dt);
    for (const d of f.debris) {
      d.life -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.a += d.va * dt;
      d.vx *= 0.985;
      d.vy *= 0.985;
    }
    f.debris = f.debris.filter((d) => d.life > 0);

    const [sx, sy] = f.shake.offset(9);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = "#03050c";
    ctx.fillRect(-20, -20, W + 40, H + 40);
    // A faint grid, like a vector monitor's phosphor.
    ctx.strokeStyle = "rgba(56,189,248,0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 50) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = 0; y <= H; y += 50) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(56,189,248,0.35)";
    ctx.strokeRect(1, 1, W - 2, H - 2);

    ctx.globalCompositeOperation = "lighter";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    /** Draw something at (x, y), and again on the far side if it overlaps an edge. */
    const wrapped = (x: number, y: number, r: number, fn: (px: number, py: number) => void) => {
      fn(x, y);
      const ox = x < r ? W : x > W - r ? -W : 0;
      const oy = y < r ? H : y > H - r ? -H : 0;
      if (ox) fn(x + ox, y);
      if (oy) fn(x, y + oy);
      if (ox && oy) fn(x + ox, y + oy);
    };
    /** Stroke the current path as a soft glow plus a bright core. */
    const glow = (color: string, width = 1.8) => {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = width * 3.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = width;
      ctx.stroke();
    };

    // ---- rocks
    for (const r of g.rocks) {
      const pts = rockPoints(r);
      wrapped(r.x, r.y, 60, (px, py) => {
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(px + x, py + y) : ctx.moveTo(px + x, py + y)));
        ctx.closePath();
        glow(C.rock);
      });
    }

    // ---- saucer
    if (g.saucer) {
      const sc = g.saucer;
      const k = SAUCER_RADIUS[sc.kind] / 22;
      const color = sc.kind === "big" ? C.bigSaucer : C.smallSaucer;
      wrapped(sc.x, sc.y, 30, (px, py) => {
        ctx.beginPath();
        // The dome, the rim and the belly.
        ctx.moveTo(px - 22 * k, py + 2 * k);
        ctx.lineTo(px - 10 * k, py - 5 * k);
        ctx.lineTo(px - 6 * k, py - 14 * k);
        ctx.lineTo(px + 6 * k, py - 14 * k);
        ctx.lineTo(px + 10 * k, py - 5 * k);
        ctx.lineTo(px + 22 * k, py + 2 * k);
        ctx.lineTo(px + 11 * k, py + 10 * k);
        ctx.lineTo(px - 11 * k, py + 10 * k);
        ctx.closePath();
        ctx.moveTo(px - 22 * k, py + 2 * k);
        ctx.lineTo(px + 22 * k, py + 2 * k);
        ctx.moveTo(px - 10 * k, py - 5 * k);
        ctx.lineTo(px + 10 * k, py - 5 * k);
        glow(color);
      });
    }

    // ---- bullets
    for (const b of g.bullets) {
      ctx.fillStyle = b.enemy ? C.enemy : C.bullet;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.enemy ? 2.6 : 2.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- the ship
    const sh = g.ship;
    if (sh.alive) {
      const blink = sh.invuln > 0 && Math.floor(time * 12) % 2 === 0;
      if (!blink) {
        wrapped(sh.x, sh.y, 20, (px, py) => {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(sh.angle);
          ctx.beginPath();
          ctx.moveTo(0, -14);
          ctx.lineTo(10, 11);
          ctx.lineTo(0, 6);
          ctx.lineTo(-10, 11);
          ctx.closePath();
          glow(C.ship, 2);
          if (sh.thrusting) {
            // A flickering flame.
            const len = 9 + Math.random() * 11;
            ctx.beginPath();
            ctx.moveTo(-5, 8);
            ctx.lineTo(0, 8 + len);
            ctx.lineTo(5, 8);
            glow(C.flame, 1.8);
          }
          ctx.restore();
        });
        if (sh.invuln > 0.01) {
          ctx.globalAlpha = Math.min(0.5, (sh.invuln / INVULN_TIME) * 0.6);
          ctx.beginPath();
          ctx.arc(sh.x, sh.y, 20, 0, Math.PI * 2);
          glow("#67e8f9", 1.2);
          ctx.globalAlpha = 1;
        }
      }
    }

    // ---- debris lines and sparks
    for (const d of f.debris) {
      ctx.globalAlpha = Math.max(0, d.life / d.max);
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(d.x - Math.cos(d.a) * d.len * 0.5, d.y - Math.sin(d.a) * d.len * 0.5);
      ctx.lineTo(d.x + Math.cos(d.a) * d.len * 0.5, d.y + Math.sin(d.a) * d.len * 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    f.particles.draw(ctx);
    ctx.globalCompositeOperation = "source-over";
    if (f.hyperFlash > 0) {
      ctx.fillStyle = `rgba(165,243,252,${(f.hyperFlash / 0.35) * 0.18})`;
      ctx.fillRect(0, 0, W, H);
    }
    f.floaters.draw(ctx);

    // ---- messages
    if (f.banner > 0 && g.phase === "play" && phaseRef.current === "playing") {
      ctx.globalAlpha = Math.min(1, f.banner);
      text(ctx, `WAVE ${g.wave}`, W / 2, H / 2 - 100, { size: 34, font: DISPLAY_FONT, color: "#bae6fd", weight: 900, stroke: "#03050c", strokeWidth: 5 });
      ctx.globalAlpha = 1;
    }
    if (!sh.alive && g.lives > 0 && g.phase === "play") {
      text(ctx, "Get ready…", W / 2, H / 2 + 60, { size: 16, color: "rgba(255,255,255,0.6)" });
    }
    if (g.lives <= 0 && g.phase === "play") {
      text(ctx, "GAME OVER", W / 2, H / 2, { size: 40, font: DISPLAY_FONT, color: "#fb7185", weight: 900, stroke: "#03050c", strokeWidth: 6 });
    }
    ctx.restore();

    // ---- HUD
    text(ctx, `${g.score}`, 16, 24, { align: "left", size: 26, font: DISPLAY_FONT, color: "#bae6fd", weight: 900 });
    text(ctx, "SCORE", 17, 44, { align: "left", size: 9, color: "rgba(255,255,255,0.45)" });
    text(ctx, `BEST ${Math.max(best, g.score)}`, W / 2, 18, { size: 12, color: "rgba(255,255,255,0.55)", weight: 800 });
    text(ctx, `WAVE ${g.wave}`, W / 2, 36, { size: 11, color: "rgba(255,255,255,0.4)", weight: 800 });
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < Math.min(g.lives, 8); i++) {
      ctx.save();
      ctx.translate(W - 22 - i * 20, 24);
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(6.5, 8);
      ctx.lineTo(0, 4);
      ctx.lineTo(-6.5, 8);
      ctx.closePath();
      ctx.strokeStyle = C.ship;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";
  };

  return (
    <div ref={wrapRef} className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas width={dims.w} height={dims.h} draw={draw} background="#010208" />
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
          <p className="mt-2 text-xs text-white/55">You reached wave {result.wave}</p>
        </GameOverPanel>
      )}
      {touch && phase === "playing" && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <button
            type="button"
            aria-label="Pause"
            className="pointer-events-auto absolute right-2 top-2 h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white"
            onClick={() => go("paused")}
          >
            ⏸
          </button>
          <div className="absolute bottom-4 left-3 flex gap-3">
            <TouchButton label="Rotate left" size={66} active={padOn.left} onDown={() => setPadKey("left", true)} onUp={() => setPadKey("left", false)}>
              <span className="text-2xl">◀</span>
            </TouchButton>
            <TouchButton label="Rotate right" size={66} active={padOn.right} onDown={() => setPadKey("right", true)} onUp={() => setPadKey("right", false)}>
              <span className="text-2xl">▶</span>
            </TouchButton>
          </div>
          <div className="absolute bottom-4 right-3 flex flex-col items-end gap-3">
            <TouchButton label="Hyperspace" size={52} onDown={doHyper} className="border-sky-300/50">
              <span className="text-[10px] font-black leading-tight">HYPER<br />SPACE</span>
            </TouchButton>
            <div className="flex gap-3">
              <TouchButton label="Thrust" size={66} active={padOn.thrust} onDown={() => setPadKey("thrust", true)} onUp={() => setPadKey("thrust", false)}>
                <span className="text-2xl">▲</span>
              </TouchButton>
              <TouchButton label="Fire" size={66} active={padOn.fire} onDown={() => setPadKey("fire", true)} onUp={() => setPadKey("fire", false)} className="border-rose-300/60">
                <span className="text-xs font-black">FIRE</span>
              </TouchButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
