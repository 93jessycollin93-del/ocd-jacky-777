// Fruit Slash: swipe to slice. The rules live in logic.ts; this file draws the fruit, the fading trail,
// the juice splats and the halves, turns pointer drags into swipes, and runs the menus and game over.
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type CanvasPointer, type View } from "../../kit/GameCanvas";
import { DISPLAY_FONT, Floaters, Particles, Shake, easeOutBack, roundRect, text, withAlpha } from "../../kit/draw";
import { formatNumber } from "../../kit/format";
import { useKeyPress } from "../../kit/input";
import { randomSeed } from "../../kit/rng";
import { noise, play, tone } from "../../kit/sfx";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { FruitAtlas, LOOKS } from "./art";
import {
  ARCADE_SECONDS, DOUBLE_SECONDS, FREEZE_SECONDS, FRENZY_SECONDS, MAX_MISSES, endSwipe, fruitRadius, newWorld, slice, step,
  type GameEvent, type Mode, type World,
} from "./logic";
import { meta } from "./meta";

type Phase = "ready" | "playing" | "paused" | "over";

const ARCADE_BEST_KEY = "fruit-slash:arcade-best";
const TRAIL_LIFE = 0.24;

interface Splat {
  x: number;
  y: number;
  color: string;
  t: number;
  size: number;
  drops: { a: number; d: number; r: number }[];
  drips: { a: number; len: number }[];
}

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

export default function FruitSlash({ touch, best, submitScore }: GameProps) {
  const root = useRef<HTMLDivElement>(null);
  const [portrait, setPortrait] = useState(false);
  const worldW = portrait ? 420 : 720;
  const viewRef = useRef({ w: 720, h: 420, scale: 1 });
  const world = useRef<World>(newWorld("classic", 1, 720, 420));
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [mode, setMode] = useState<Mode>("classic");
  const modeRef = useRef<Mode>("classic");
  const [result, setResult] = useState({ score: 0, isBest: false, reason: "" as string, arcadeBest: 0 });
  const [arcadeBest, setArcadeBest] = useState(() => loadState<{ best?: number }>(ARCADE_BEST_KEY)?.best ?? 0);
  const timers = useRef<number[]>([]);

  const fx = useRef({
    atlas: new FruitAtlas(),
    particles: new Particles(500),
    shake: new Shake(),
    floaters: new Floaters(),
    splats: [] as Splat[],
    trail: [] as TrailPoint[],
    swiping: false,
    last: { x: 0, y: 0 },
    pointerId: -1,
    flash: 0,
    flashColor: "#fff",
    banner: null as null | { text: string; t: number; color: string },
    missFlash: 0,
    ending: false,
    time: 0,
    shownScore: 0,
    comboText: null as null | { text: string; x: number; y: number; t: number },
    powerFlash: 0,
  });

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const check = () => setPortrait(el.clientHeight > el.clientWidth * 1.1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const start = useCallback(
    (m: Mode) => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      modeRef.current = m;
      setMode(m);
      const v = viewRef.current;
      world.current = newWorld(m, randomSeed(), v.w, v.h);
      const f = fx.current;
      f.particles.clear();
      f.floaters.items = [];
      f.splats = [];
      f.trail = [];
      f.swiping = false;
      f.banner = null;
      f.ending = false;
      f.flash = 0;
      f.shownScore = 0;
      f.comboText = null;
      play("select");
      go("playing");
    },
    [go],
  );

  const finish = (reason: string) => {
    const w = world.current;
    if (w.mode === "classic") {
      const isBest = submitScore(w.score);
      setResult({ score: w.score, isBest, reason, arcadeBest });
    } else {
      const prev = loadState<{ best?: number }>(ARCADE_BEST_KEY)?.best ?? 0;
      const isBest = w.score > prev;
      if (isBest) saveState(ARCADE_BEST_KEY, { best: w.score });
      setArcadeBest(Math.max(prev, w.score));
      setResult({ score: w.score, isBest, reason, arcadeBest: Math.max(prev, w.score) });
    }
    play(reason === "bomb" ? "explode" : "lose");
    go("over");
  };

  // ---------------------------------------------------------------- reacting to events

  const addSplat = (x: number, y: number, color: string, size: number) => {
    const f = fx.current;
    const drops = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * Math.PI * 2 + Math.random() * 0.6, d: 1.1 + Math.random() * 1.3, r: 0.14 + Math.random() * 0.2 }));
    const drips = Array.from({ length: 2 }, () => ({ a: Math.PI / 2 + (Math.random() - 0.5) * 0.8, len: 0.8 + Math.random() * 1.2 }));
    f.splats.push({ x, y, color, t: 0, size, drops, drips });
    if (f.splats.length > 14) f.splats.shift();
  };

  const handleEvents = (events: GameEvent[]) => {
    const f = fx.current;
    const w = world.current;
    for (const e of events) {
      if (e.type === "slice") {
        const look = LOOKS[e.thing.kind] ?? LOOKS.apple;
        f.particles.burst(e.x, e.y, 12, { color: [look.juice, look.inner, "#ffffff"], speed: 260, size: e.thing.r * 0.2, life: 0.7, gravity: 700, drag: 1.1 });
        f.particles.burst(e.x, e.y, 4, { color: "#ffffff", speed: 300, size: 3, life: 0.3, gravity: 0, drag: 3, shape: "spark", angle: e.angle, spread: 0.6 });
        addSplat(e.x, e.y, look.juice, e.thing.r);
        f.floaters.add(e.x, e.y - e.thing.r * 0.6, `+${e.points}`, e.points > 1 ? "#fde047" : "#ffffff", 22);
        f.shake.add(0.05);
        const hits = w.swipeHits;
        noise(0.09, 0.22, { type: "bandpass", freq: 2600, sweep: 800, q: 1.4 });
        tone(520 + Math.min(hits, 8) * 70, 0.07, "sine", 0.12, { slide: 220 });
        if (e.thing.type === "power") f.powerFlash = 1;
      } else if (e.type === "combo") {
        f.comboText = { text: `${e.hits} FRUIT COMBO!  +${e.bonus}`, x: e.x, y: e.y, t: 0 };
        play("combo");
        f.shake.add(0.12);
      } else if (e.type === "miss") {
        f.missFlash = 1;
        play("error");
        f.floaters.add(Math.max(30, Math.min(w.w - 30, e.thing.x)), w.h - 40, "MISS", "#f87171", 22);
        f.shake.add(0.1);
      } else if (e.type === "bomb") {
        f.flash = 1;
        f.flashColor = "#fff7ed";
        f.shake.add(1);
        f.particles.burst(e.thing.x, e.thing.y, 40, { color: ["#fbbf24", "#f97316", "#ef4444", "#374151"], speed: 480, size: 7, life: 0.9, gravity: 300 });
        play("explode");
        if (w.mode === "arcade") f.floaters.add(e.thing.x, e.thing.y - e.thing.r, "-10", "#f87171", 28);
      } else if (e.type === "power") {
        const label = e.kind === "freeze" ? "FREEZE!" : e.kind === "frenzy" ? "FRENZY!" : "DOUBLE POINTS!";
        f.banner = { text: label, t: 0, color: e.kind === "freeze" ? "#7dd3fc" : e.kind === "frenzy" ? "#fb923c" : "#fde047" };
        play("powerup");
        f.particles.burst(e.x, e.y, 24, { color: ["#ffffff", LOOKS[e.kind].juice], speed: 360, size: 6, life: 0.8, gravity: 0, drag: 2, shape: "spark" });
      } else if (e.type === "over") {
        f.ending = true;
        const delay = e.reason === "bomb" ? 900 : e.reason === "misses" ? 700 : 400;
        const reason = e.reason;
        timers.current.push(window.setTimeout(() => finish(reason), delay));
      }
    }
  };

  // ---------------------------------------------------------------- input

  const onPointer = (p: CanvasPointer) => {
    const f = fx.current;
    if (phaseRef.current !== "playing") return;
    const w = world.current;
    if (p.type === "down") {
      const m = menuRect(viewRef.current.w);
      if (p.x >= m.x && p.x <= m.x + m.w && p.y >= m.y && p.y <= m.y + m.h) {
        go("paused");
        return;
      }
      f.swiping = true;
      f.pointerId = p.id;
      f.last = { x: p.x, y: p.y };
      f.trail.push({ x: p.x, y: p.y, t: f.time });
    } else if (p.type === "move") {
      if (!f.swiping || p.id !== f.pointerId) return;
      if (p.pointerType === "mouse" && !(p.buttons & 1)) {
        handleEvents(endSwipe(w));
        f.swiping = false;
        return;
      }
      if (Math.hypot(p.x - f.last.x, p.y - f.last.y) < 1.5) return;
      handleEvents(slice(w, f.last.x, f.last.y, p.x, p.y));
      f.trail.push({ x: p.x, y: p.y, t: f.time });
      f.last = { x: p.x, y: p.y };
    } else if (f.swiping && p.id === f.pointerId) {
      handleEvents(endSwipe(w));
      f.swiping = false;
    }
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) go(p === "playing" ? "paused" : "playing");
  });

  // ---------------------------------------------------------------- drawing

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number) => {
    const f = fx.current;
    const w = world.current;
    viewRef.current = { w: view.w, h: view.h, scale: view.scale };
    const playing = phaseRef.current === "playing";
    f.time += dt;
    if (playing) {
      w.w = view.w;
      w.h = view.h;
      handleEvents(step(w, dt));
    }
    if (phaseRef.current !== "paused") {
      f.particles.update(dt);
      f.floaters.update(dt);
      f.shake.update(dt);
      for (const s of f.splats) s.t += dt;
      f.splats = f.splats.filter((s) => s.t < 6);
      f.flash = Math.max(0, f.flash - dt * 2.5);
      f.missFlash = Math.max(0, f.missFlash - dt * 2);
      f.powerFlash = Math.max(0, f.powerFlash - dt * 3);
      if (f.banner) {
        f.banner.t += dt;
        if (f.banner.t > 1.4) f.banner = null;
      }
      if (f.comboText) {
        f.comboText.t += dt;
        if (f.comboText.t > 1.1) f.comboText = null;
      }
    }
    f.shownScore += (w.score - f.shownScore) * (1 - Math.exp(-12 * dt));
    if (Math.abs(w.score - f.shownScore) < 0.5) f.shownScore = w.score;
    f.trail = f.trail.filter((p) => f.time - p.t < TRAIL_LIFE);

    const r = fruitRadius(view.w, view.h);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    f.atlas.setSize(r * 2 * view.scale * dpr);

    ctx.save();
    const [sx, sy] = f.shake.offset(12);
    ctx.translate(sx, sy);

    // Wooden-board backdrop with a warm glow.
    const bg = ctx.createRadialGradient(view.w / 2, view.h * 0.55, 20, view.w / 2, view.h * 0.55, Math.max(view.w, view.h) * 0.75);
    bg.addColorStop(0, "#4a2c1a");
    bg.addColorStop(0.6, "#2a170e");
    bg.addColorStop(1, "#120a06");
    ctx.fillStyle = bg;
    ctx.fillRect(-20, -20, view.w + 40, view.h + 40);
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 2;
    const plank = Math.max(64, view.w / 7);
    for (let x = plank; x < view.w; x += plank) {
      ctx.beginPath();
      ctx.moveTo(x, -20);
      ctx.lineTo(x, view.h + 20);
      ctx.stroke();
    }

    // Juice splats stay on the board and slowly fade.
    for (const s of f.splats) {
      const k = s.t < 0.12 ? s.t / 0.12 : 1;
      const fade = s.t > 3 ? 1 - (s.t - 3) / 3 : 1;
      ctx.globalAlpha = 0.55 * fade;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 0.9 * k, 0, Math.PI * 2);
      ctx.fill();
      for (const d of s.drops) {
        ctx.beginPath();
        ctx.arc(s.x + Math.cos(d.a) * s.size * d.d * k, s.y + Math.sin(d.a) * s.size * d.d * k, s.size * d.r * k, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const d of s.drips) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(d.a - Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, s.size * (0.6 + d.len * 0.6 * Math.min(1, s.t / 1.5)), s.size * 0.12, s.size * d.len * 0.5 * Math.min(1, s.t / 1.5), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    // Whole fruit.
    for (const t of w.things) {
      if (t.type === "power" || t.type === "bomb") {
        const pulse = 0.5 + 0.5 * Math.sin(f.time * 8 + t.id);
        const glow = t.type === "bomb" ? "239,68,68" : t.kind === "freeze" ? "125,211,252" : t.kind === "frenzy" ? "251,146,60" : "250,204,21";
        const g = ctx.createRadialGradient(t.x, t.y, t.r * 0.6, t.x, t.y, t.r * 1.9);
        g.addColorStop(0, `rgba(${glow},${0.35 + 0.25 * pulse})`);
        g.addColorStop(1, `rgba(${glow},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(t.x - t.r * 2, t.y - t.r * 2, t.r * 4, t.r * 4);
      }
      f.atlas.stamp(ctx, t.kind, t.x, t.y, t.r, t.rot);
      if (t.type === "bomb") {
        // A flickering fuse spark.
        const a = t.rot - 0.5;
        const sxp = t.x + Math.cos(a) * t.r * 1.15 + Math.cos(a + Math.PI / 2) * t.r * 0.4;
        const syp = t.y + Math.sin(a) * t.r * 1.15 + Math.sin(a + Math.PI / 2) * t.r * 0.4;
        ctx.fillStyle = Math.sin(f.time * 30 + t.id) > 0 ? "#fde047" : "#fb923c";
        ctx.beginPath();
        ctx.arc(sxp, syp, t.r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Sliced halves, each clipped to its side of the cut, with a strip of flesh along the edge.
    drawHalves(ctx, f.atlas, w);

    f.particles.draw(ctx);

    // The fading swipe trail: a soft glow under a white core, tapering to the tail.
    const tr = f.trail;
    if (tr.length > 1) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 1; i < tr.length; i++) {
        const age = (f.time - tr[i].t) / TRAIL_LIFE;
        const k = (1 - age) * (i / tr.length * 0.5 + 0.5);
        ctx.strokeStyle = `rgba(253,186,116,${0.35 * k})`;
        ctx.lineWidth = 16 * k + 2;
        ctx.beginPath();
        ctx.moveTo(tr[i - 1].x, tr[i - 1].y);
        ctx.lineTo(tr[i].x, tr[i].y);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${0.95 * k})`;
        ctx.lineWidth = 5 * k + 1;
        ctx.stroke();
      }
    }

    f.floaters.draw(ctx);
    ctx.restore();

    // Screen-wide effects: power tints, bomb flash, miss vignette.
    if (w.freeze > 0) {
      const g = ctx.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.3, view.w / 2, view.h / 2, view.w * 0.7);
      g.addColorStop(0, "rgba(125,211,252,0.05)");
      g.addColorStop(1, `rgba(56,189,248,${0.32 + 0.05 * Math.sin(f.time * 5)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, view.w, view.h);
    }
    if (w.frenzy > 0) {
      ctx.strokeStyle = `rgba(251,146,60,${0.4 + 0.3 * Math.sin(f.time * 14)})`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, view.w - 10, view.h - 10);
    }
    if (w.double > 0) {
      ctx.strokeStyle = "rgba(250,204,21,0.55)";
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, view.w - 6, view.h - 6);
    }
    if (f.missFlash > 0) {
      ctx.fillStyle = `rgba(239,68,68,${0.25 * f.missFlash})`;
      ctx.fillRect(0, view.h - 36, view.w, 36);
    }
    if (f.flash > 0) {
      ctx.fillStyle = withAlpha(f.flashColor.length === 7 ? f.flashColor : "#ffffff", f.flash * 0.85);
      ctx.fillRect(0, 0, view.w, view.h);
    }

    drawHud(ctx, view, w, f, best, arcadeBest, modeRef.current);
    if (f.comboText) {
      const c = f.comboText;
      const k = c.t / 1.1;
      ctx.save();
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      const x = Math.max(120, Math.min(view.w - 120, c.x));
      ctx.translate(x, Math.max(80, c.y - 40 - k * 30));
      const s = easeOutBack(Math.min(1, k / 0.15));
      ctx.scale(s, s);
      text(ctx, c.text, 0, 0, { size: view.w < 500 ? 22 : 30, color: "#fde047", font: DISPLAY_FONT, stroke: "#7c2d12", strokeWidth: 6, weight: 900 });
      ctx.restore();
    }
    if (f.banner) {
      const k = f.banner.t / 1.4;
      ctx.save();
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.translate(view.w / 2, view.h * 0.32);
      const s = easeOutBack(Math.min(1, k / 0.15));
      ctx.scale(s, s);
      text(ctx, f.banner.text, 0, 0, { size: view.w < 500 ? 34 : 48, color: f.banner.color, font: DISPLAY_FONT, stroke: "#1c0f08", strokeWidth: 8, weight: 900 });
      ctx.restore();
    }
  };

  // ---------------------------------------------------------------- screens

  const ModeToggle = (
    <div className="mt-3">
      <div className="flex gap-2">
        {(["classic", "arcade"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              modeRef.current = m;
              setMode(m);
            }}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold capitalize transition ${
              mode === m ? "border-orange-300 bg-orange-500/30 text-white" : "border-white/15 text-white/60 hover:bg-white/10"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-white/60">
        {mode === "classic"
          ? "Miss 3 fruit and you're out. Slice a bomb and it's over at once."
          : `${ARCADE_SECONDS} seconds. Slice the glowing power fruit for freeze, frenzy or double points. Bombs cost points.`}
      </p>
      {mode === "arcade" && arcadeBest > 0 && <p className="mt-1 text-xs text-white/60">Arcade best: <b className="text-white">{formatNumber(arcadeBest)}</b></p>}
    </div>
  );

  return (
    <div ref={root} className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas width={worldW} fit="fill" draw={draw} onPointer={onPointer} background="#120a06" cursor="crosshair" />

      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={() => start(mode)}
          accent={meta.accent}
          best={best ? formatNumber(best) : undefined}
          bestLabel="Best Classic"
          extra={ModeToggle}
        />
      )}

      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={() => start(modeRef.current)} />}

      {phase === "over" && (
        <GameOverPanel
          title={result.reason === "bomb" ? "Boom!" : result.reason === "time" ? "Time's up!" : "Game over"}
          score={formatNumber(result.score)}
          best={modeRef.current === "classic" ? (best ? formatNumber(best) : undefined) : result.arcadeBest ? formatNumber(result.arcadeBest) : undefined}
          isBest={result.isBest}
          accent={meta.accent}
          onRestart={() => start(modeRef.current)}
        >
          <p className="mt-2 text-xs text-white/55">
            {modeRef.current === "classic" ? (result.reason === "bomb" ? "You sliced a bomb." : "Three fruit got away.") : "Arcade mode"}
          </p>
          <div className="mt-3 flex gap-2">
            {(["classic", "arcade"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className="flex-1 rounded-xl border border-white/20 py-2 text-xs font-semibold capitalize text-white hover:bg-white/10"
                onClick={() => {
                  modeRef.current = m;
                  setMode(m);
                  start(m);
                }}
              >
                Play {m}
              </button>
            ))}
          </div>
        </GameOverPanel>
      )}
    </div>
  );
}

function menuRect(w: number) {
  return { x: w - 54, y: 10, w: 44, h: 44 };
}

function drawHalves(ctx: CanvasRenderingContext2D, atlas: FruitAtlas, w: World) {
  for (const h of w.halves) {
    const look = LOOKS[h.kind] ?? LOOKS.apple;
    const local = h.cut - h.cutRot; // the cut line, in the fruit's own frame
    ctx.save();
    ctx.globalAlpha = h.age > 2.4 ? Math.max(0, 1 - (h.age - 2.4) / 1.6) : 1;
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rot);
    ctx.save();
    ctx.rotate(local);
    ctx.beginPath();
    if (h.side === 1) ctx.rect(-h.r * 3, 0, h.r * 6, h.r * 3);
    else ctx.rect(-h.r * 3, -h.r * 3, h.r * 6, h.r * 3);
    ctx.clip();
    ctx.save();
    ctx.rotate(-local);
    atlas.stamp(ctx, h.kind, 0, 0, h.r, 0);
    ctx.restore();
    // The cut face: a band of flesh along the straight edge.
    ctx.beginPath();
    ctx.arc(0, 0, h.r * 0.95, 0, Math.PI * 2);
    ctx.clip();
    const band = h.r * 0.2;
    const y0 = h.side === 1 ? 0 : -band;
    ctx.fillStyle = look.inner;
    ctx.fillRect(-h.r, y0, h.r * 2, band);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(-h.r, h.side === 1 ? 0 : -band * 0.3, h.r * 2, band * 0.3);
    ctx.restore();
    ctx.restore();
  }
}

function drawHud(ctx: CanvasRenderingContext2D, view: View, w: World, f: { shownScore: number; time: number }, best: number, arcadeBest: number, mode: Mode) {
  // Score and best.
  text(ctx, formatNumber(f.shownScore), 16, 30, { size: 34, align: "left", font: DISPLAY_FONT, weight: 900, stroke: "rgba(0,0,0,0.45)", strokeWidth: 5 });
  const b = mode === "classic" ? best : arcadeBest;
  if (b > 0) text(ctx, `Best ${formatNumber(Math.max(b, w.score))}`, 17, 56, { size: 12, align: "left", color: "rgba(255,255,255,0.6)", weight: 700 });

  // Pause button.
  const m = menuRect(view.w);
  roundRect(ctx, m.x, m.y, m.w, m.h, 12);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillRect(m.x + 15, m.y + 12, 5, 20);
  ctx.fillRect(m.x + 24, m.y + 12, 5, 20);

  if (mode === "classic") {
    // Three crosses that fill red as fruit get away.
    for (let i = 0; i < MAX_MISSES; i++) {
      const cx = view.w - 76 - (MAX_MISSES - 1 - i) * 32;
      const cy = 32;
      const hit = i < w.misses;
      ctx.strokeStyle = hit ? "#ef4444" : "rgba(255,255,255,0.35)";
      ctx.lineWidth = hit ? 6 : 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy - 9);
      ctx.lineTo(cx + 9, cy + 9);
      ctx.moveTo(cx + 9, cy - 9);
      ctx.lineTo(cx - 9, cy + 9);
      ctx.stroke();
    }
  } else {
    const left = Math.ceil(w.timeLeft);
    const low = w.timeLeft < 10;
    const cx = view.w / 2 + (view.w < 500 ? 20 : 0);
    text(ctx, `${left}`, cx, 28, { size: 34, font: DISPLAY_FONT, weight: 900, color: low && Math.sin(f.time * 10) > 0 ? "#f87171" : "#ffffff", stroke: "rgba(0,0,0,0.45)", strokeWidth: 5 });
    const bw = Math.min(180, view.w * 0.3);
    roundRect(ctx, cx - bw / 2, 50, bw, 7, 3.5);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fill();
    roundRect(ctx, cx - bw / 2, 50, Math.max(7, (bw * w.timeLeft) / ARCADE_SECONDS), 7, 3.5);
    ctx.fillStyle = low ? "#ef4444" : "#fbbf24";
    ctx.fill();
  }

  // Active powers.
  const powers: [string, number, number, string][] = [
    ["FREEZE", w.freeze, FREEZE_SECONDS, "#7dd3fc"],
    ["FRENZY", w.frenzy, FRENZY_SECONDS, "#fb923c"],
    ["x2", w.double, DOUBLE_SECONDS, "#fde047"],
  ];
  let y = 80;
  for (const [label, left, total, color] of powers) {
    if (left <= 0) continue;
    roundRect(ctx, 14, y, 92, 18, 9);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fill();
    roundRect(ctx, 14, y, Math.max(12, (92 * left) / total), 18, 9);
    ctx.fillStyle = withAlpha(color, 0.75);
    ctx.fill();
    text(ctx, `${label} ${left.toFixed(0)}s`, 60, y + 9.5, { size: 11, color: "#1c0f08", weight: 900 });
    y += 24;
  }
}
