// Bubble Pop: aim, fire, snap, pop. The rules are in logic.ts; this file draws the board, plays the
// juice (wobbles, pops, falling bubbles, the creeping ceiling), handles mouse / touch / keyboard aiming
// and runs the menus: title, level select, pause, win and game over.
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type CanvasPointer, type View } from "../../kit/GameCanvas";
import { DISPLAY_FONT, Floaters, Particles, Shake, easeOutBack, roundRect, text, withAlpha } from "../../kit/draw";
import { formatNumber } from "../../kit/format";
import { useHeldKeys, useKeyPress } from "../../kit/input";
import { randomSeed } from "../../kit/rng";
import { play, tone } from "../../kit/sfx";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, Overlay, PausePanel, PrimaryButton, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { BUBBLE_COLORS, BubbleAtlas } from "./art";
import { inRect, makeLayout } from "./layout";
import { LEVELS } from "./levels";
import {
  COLS, LOSE_ROW, ROWS, ROW_H, centerOf, clampAngle, colorsOnBoard, hasLost, land, launch, lowestRow, newEndless, newLevelState,
  refillEndless, rowLen, stepShot, swapQueue, trace, type BubbleState, type Placed, type Shot, type Trace,
} from "./logic";
import { meta } from "./meta";

type Phase = "title" | "levels" | "playing" | "paused" | "over" | "won";

const LEVELS_KEY = "bubble-pop:levels";

interface Popping {
  x: number;
  y: number;
  color: number;
  delay: number;
  t: number;
  started: boolean;
  order: number;
}

interface Falling {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  rot: number;
  vr: number;
  delay: number;
}

function loadCleared(): number[] {
  const saved = loadState<{ cleared?: unknown }>(LEVELS_KEY);
  const out = new Array(LEVELS.length).fill(0) as number[];
  if (saved && Array.isArray(saved.cleared)) saved.cleared.slice(0, LEVELS.length).forEach((v, i) => (out[i] = Number(v) > 0 ? Number(v) : 0));
  return out;
}

export default function BubblePop({ touch, best, submitScore }: GameProps) {
  const root = useRef<HTMLDivElement>(null);
  const game = useRef<BubbleState>(newEndless(1));
  const [phase, setPhase] = useState<Phase>("title");
  const phaseRef = useRef<Phase>("title");
  const [landscape, setLandscape] = useState(false);
  const layout = makeLayout(landscape);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const [cleared, setCleared] = useState<number[]>(loadCleared);
  const clearedRef = useRef(cleared);
  const [levelIdx, setLevelIdx] = useState(-1); // -1 = endless
  const levelRef = useRef(-1);
  const [result, setResult] = useState({ score: 0, isBest: false, bonusLevel: false });
  const held = useHeldKeys();
  const timers = useRef<number[]>([]);

  const vis = useRef({
    angle: Math.PI / 2,
    aiming: false,
    shot: null as Shot | null,
    popping: [] as Popping[],
    falling: [] as Falling[],
    shift: 0,
    impact: { x: 0, y: 0, t: 9 },
    fresh: { r: -1, c: -1, t: 9 },
    slide: 1,
    swap: 1,
    recoil: 0,
    ending: false,
    time: 0,
    banner: null as null | { text: string; t: number },
    particles: new Particles(500),
    shake: new Shake(),
    floaters: new Floaters(),
    atlas: new BubbleAtlas(),
    traceKey: "",
    trace: null as Trace | null,
    shownScore: 0,
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
    const check = () => setLandscape(el.clientWidth / Math.max(1, el.clientHeight) > 1.3);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---------------------------------------------------------------- flow

  const resetVis = () => {
    const v = vis.current;
    v.angle = Math.PI / 2;
    v.aiming = false;
    v.shot = null;
    v.popping = [];
    v.falling = [];
    v.shift = 0;
    v.impact.t = 9;
    v.fresh.t = 9;
    v.slide = 1;
    v.swap = 1;
    v.ending = false;
    v.banner = null;
    v.trace = null;
    v.traceKey = "";
    v.shownScore = 0;
    v.particles.clear();
    v.floaters.items = [];
  };

  const startEndless = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    levelRef.current = -1;
    setLevelIdx(-1);
    game.current = newEndless(randomSeed());
    resetVis();
    vis.current.shift = 5;
    play("select");
    go("playing");
  }, [go]);

  const startLevel = useCallback(
    (i: number) => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      levelRef.current = i;
      setLevelIdx(i);
      game.current = newLevelState(LEVELS[i], randomSeed());
      resetVis();
      vis.current.shift = 3;
      play("select");
      go("playing");
    },
    [go],
  );

  const restart = useCallback(() => {
    if (levelRef.current >= 0) startLevel(levelRef.current);
    else startEndless();
  }, [startEndless, startLevel]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const finish = (won: boolean) => {
    const g = game.current;
    if (levelRef.current >= 0) {
      if (won) {
        const next = clearedRef.current.slice();
        next[levelRef.current] = Math.max(next[levelRef.current], g.score, 1);
        clearedRef.current = next;
        setCleared(next);
        saveState(LEVELS_KEY, { cleared: next });
        play("win");
      } else {
        play("lose");
      }
      setResult({ score: g.score, isBest: false, bonusLevel: won });
      go(won ? "won" : "over");
    } else {
      play("lose");
      const isBest = submitScore(g.score);
      setResult({ score: g.score, isBest, bonusLevel: false });
      go("over");
    }
  };

  // ---------------------------------------------------------------- actions

  const fire = () => {
    const v = vis.current;
    if (phaseRef.current !== "playing" || v.shot || v.ending) return;
    const L = layoutRef.current;
    v.shot = launch(COLS / 2, (L.shooterY - L.fy) / L.d, v.angle);
    v.recoil = 1;
    v.slide = 0;
    tone(420, 0.09, "sine", 0.14, { slide: 980 });
  };

  const swap = () => {
    const v = vis.current;
    if (phaseRef.current !== "playing" || v.shot || v.ending) return;
    swapQueue(game.current);
    v.swap = 0;
    play("flip");
  };

  const setAim = (x: number, y: number) => {
    const L = layoutRef.current;
    vis.current.angle = clampAngle(Math.atan2(L.shooterY - y, x - L.shooterX));
  };

  const nextBubblePos = (L: ReturnType<typeof makeLayout>) => ({ x: L.shooterX - 2.4 * L.d, y: L.shooterY + 0.15 * L.d });

  const onPointer = (p: CanvasPointer) => {
    if (phaseRef.current !== "playing") return;
    const L = layoutRef.current;
    const v = vis.current;
    const mouse = p.pointerType === "mouse";
    if (p.type === "down") {
      if (inRect(L.menu, p.x, p.y)) {
        go("paused");
        return;
      }
      const nb = nextBubblePos(L);
      if (Math.hypot(p.x - nb.x, p.y - nb.y) < L.d * 1.15) {
        swap();
        return;
      }
      if (mouse) {
        if (p.button === 2) {
          swap();
          return;
        }
        setAim(p.x, p.y);
        if (p.y < L.shooterY - 0.3 * L.d) fire();
      } else {
        v.aiming = true;
        setAim(p.x, p.y);
      }
    } else if (p.type === "move") {
      if (mouse || v.aiming) setAim(p.x, p.y);
    } else if (p.type === "up") {
      if (v.aiming) {
        v.aiming = false;
        if (p.y < L.shooterY - 0.8 * L.d) fire();
      }
    } else {
      v.aiming = false;
    }
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) {
      go(p === "playing" ? "paused" : "playing");
      return;
    }
    if (p !== "playing") return;
    if (code === "Space" || code === "Enter" || code === "ArrowUp") fire();
    else if (code === "ShiftLeft" || code === "ShiftRight" || code === "KeyX" || code === "ArrowDown" || code === "KeyS") swap();
  });

  // ---------------------------------------------------------------- landing

  const handleLand = (shot: Shot) => {
    const g = game.current;
    const v = vis.current;
    const L = layoutRef.current;
    const res = land(g, shot.x, shot.y);
    const c = centerOf(g.board, res.cell.r, res.cell.c);
    v.impact = { x: c.x, y: c.y, t: 0 };
    v.fresh = { r: res.cell.r, c: res.cell.c, t: 0 };
    v.shot = null;
    v.slide = 0;
    const px = L.fx + c.x * L.d;
    const py = L.fy + c.y * L.d;
    if (!res.popped.length) {
      play("place");
      v.shake.add(0.06);
    }
    // Pops ripple outwards from where the bubble landed.
    const byDist = (a: Placed) => {
      const p = centerOf(g.board, a.r, a.c);
      return Math.hypot(p.x - c.x, p.y - c.y);
    };
    res.popped.sort((a, b) => byDist(a) - byDist(b)).forEach((p, i) => {
      const pc = centerOf(g.board, p.r, p.c);
      v.popping.push({ x: pc.x, y: pc.y, color: p.color, delay: i * 0.035, t: 0, started: false, order: i });
    });
    if (res.popped.length) {
      v.shake.add(Math.min(0.35, 0.08 + res.popped.length * 0.03));
      v.floaters.add(px, py - L.d * 0.4, `+${res.points - (res.fallen.length ? 0 : 0)}`, "#fde68a", 18 + Math.min(10, res.popped.length));
    }
    res.fallen.forEach((p, i) => {
      const pc = centerOf(g.board, p.r, p.c);
      v.falling.push({
        x: L.fx + pc.x * L.d, y: L.fy + pc.y * L.d, vx: (Math.random() - 0.5) * 90, vy: -120 - Math.random() * 80, color: p.color,
        rot: 0, vr: (Math.random() - 0.5) * 8, delay: 0.12 + res.popped.length * 0.035 + i * 0.03,
      });
    });
    if (res.fallen.length) {
      tone(700, 0.35, "triangle", 0.1, { slide: 180, delay: 0.25 });
      v.banner = { text: res.fallen.length >= 6 ? `${res.fallen.length} dropped!` : "Drop bonus!", t: 0 };
    }
    if (res.dropped) {
      v.shift = 1;
      v.shake.add(0.35);
      play("hit");
      v.banner = { text: "Ceiling drops!", t: 0 };
    }
    if (res.lost || hasLost(g.board)) {
      v.ending = true;
      v.shake.add(0.7);
      later(() => finish(false), 900);
      return;
    }
    if (res.cleared) {
      if (levelRef.current >= 0) {
        v.ending = true;
        v.particles.burst(L.shooterX, L.fy + L.d * 3, 60, { color: ["#38bdf8", "#fde047", "#f472b6", "#4ade80"], speed: 320, size: 6, life: 1.2, gravity: 300 });
        later(() => finish(true), 1100);
      } else {
        const bonus = refillEndless(g);
        v.shift = 4;
        v.banner = { text: `Board clear! +${bonus}`, t: 0 };
        play("levelup");
      }
    }
  };

  // ---------------------------------------------------------------- per-frame update

  const update = (dt: number) => {
    const v = vis.current;
    const g = game.current;
    const L = layoutRef.current;
    v.time += dt;
    v.particles.update(dt);
    v.floaters.update(dt);
    v.shake.update(dt);
    v.impact.t += dt;
    v.fresh.t += dt;
    v.recoil = Math.max(0, v.recoil - dt * 6);
    v.slide = Math.min(1, v.slide + dt * 7);
    v.swap = Math.min(1, v.swap + dt * 7);
    v.shift *= Math.exp(-8 * dt);
    if (v.shift < 0.01) v.shift = 0;
    v.shownScore += (g.score - v.shownScore) * (1 - Math.exp(-10 * dt));
    if (Math.abs(g.score - v.shownScore) < 1) v.shownScore = g.score;
    if (v.banner) {
      v.banner.t += dt;
      if (v.banner.t > 1.3) v.banner = null;
    }

    if (phaseRef.current !== "playing") return;

    // Keyboard aiming.
    const k = held.current;
    const turn = (k.has("ArrowRight") || k.has("KeyD") ? -1 : 0) + (k.has("ArrowLeft") || k.has("KeyA") ? 1 : 0);
    if (turn) v.angle = clampAngle(v.angle + turn * dt * (k.has("ShiftLeft") ? 0.7 : 1.7));

    // The shot in flight.
    if (v.shot && !v.ending) {
      const before = v.shot.bounces;
      const r = stepShot(g.board, v.shot, Math.min(dt, 0.04));
      if (v.shot.bounces > before) play("bounce", 1.4);
      if (r === "landed") handleLand(v.shot);
    }

    // Popping bubbles burst when their turn comes.
    for (const p of v.popping) {
      if (p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      if (!p.started) {
        p.started = true;
        const px = L.fx + p.x * L.d;
        const py = L.fy + p.y * L.d;
        const pal = BUBBLE_COLORS[p.color % 6];
        v.particles.burst(px, py, 9, { color: [pal.base, pal.light, "#ffffff"], speed: 190, size: L.d * 0.14, life: 0.55, gravity: 520, drag: 1.2 });
        v.particles.burst(px, py, 3, { color: "#ffffff", speed: 240, size: 3, life: 0.35, gravity: 0, drag: 3, shape: "spark" });
        tone(480 + Math.min(p.order, 12) * 55, 0.09, "sine", 0.16, { slide: 1100 + p.order * 40 });
      }
      p.t += dt;
    }
    v.popping = v.popping.filter((p) => p.t < 0.3);

    for (const f of v.falling) {
      if (f.delay > 0) {
        f.delay -= dt;
        continue;
      }
      f.vy += 1500 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.vr * dt;
    }
    v.falling = v.falling.filter((f) => f.y < L.h + 60);
  };

  // ---------------------------------------------------------------- drawing

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number) => {
    const L = layoutRef.current;
    const v = vis.current;
    const g = game.current;
    if (phaseRef.current !== "paused") update(dt);
    const d = L.d;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    v.atlas.setSize(d * view.scale * dpr);
    const fw = COLS * d;
    const fieldH = L.lineY + d * 2.45 - L.fy;

    // Field backdrop with glowing side walls.
    ctx.save();
    const [sx, sy] = v.shake.offset(8);
    ctx.translate(sx, sy);
    roundRect(ctx, L.fx - 6, L.fy - 18, fw + 12, fieldH + 18, 12);
    const bg = ctx.createLinearGradient(0, L.fy, 0, L.fy + fieldH);
    bg.addColorStop(0, "rgba(8,20,45,0.8)");
    bg.addColorStop(1, "rgba(4,10,28,0.92)");
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = "rgba(56,189,248,0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ceiling with a lamp for each miss left before it drops.
    const ceilH = 12;
    roundRect(ctx, L.fx - 6, L.fy - 18, fw + 12, ceilH + 6, 8);
    const cg = ctx.createLinearGradient(0, L.fy - 18, 0, L.fy);
    cg.addColorStop(0, "#64748b");
    cg.addColorStop(1, "#334155");
    ctx.fillStyle = cg;
    ctx.fill();
    if (g.missesPerDrop > 0) {
      const n = g.missesPerDrop;
      const gap = Math.min(18, (fw - 20) / n);
      for (let i = 0; i < n; i++) {
        const lit = i < g.misses;
        const danger = g.misses >= n - 1;
        ctx.beginPath();
        ctx.arc(L.fx + fw / 2 + (i - (n - 1) / 2) * gap, L.fy - 12, 4, 0, Math.PI * 2);
        ctx.fillStyle = lit ? (danger ? "#f87171" : "#fbbf24") : "rgba(15,23,42,0.8)";
        if (lit && danger && Math.sin(v.time * 14) > 0) ctx.fillStyle = "#fecaca";
        ctx.fill();
      }
    }

    // Bubbles, clipped under the ceiling so new rows slide in from it.
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.fx - 2, L.fy - 2, fw + 4, L.h);
    ctx.clip();
    const shiftPx = v.shift * ROW_H * d;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < rowLen(g.board, r); c++) {
        const color = g.board.rows[r][c];
        if (color < 0) continue;
        const p = centerOf(g.board, r, c);
        let x = L.fx + p.x * d;
        let y = L.fy + p.y * d - shiftPx;
        // Bubbles near a landing ripple away from it.
        if (v.impact.t < 0.6) {
          const dx = p.x - v.impact.x;
          const dy = p.y - v.impact.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.01 && dist < 3.2) {
            const amp = Math.exp(-v.impact.t * 7) * Math.sin(v.impact.t * 28) * (1 - dist / 3.2) * 0.2 * d;
            x += (dx / dist) * amp;
            y += (dy / dist) * amp;
          }
        }
        let scale = 1;
        if (r === v.fresh.r && c === v.fresh.c && v.fresh.t < 0.3) scale = 1 + 0.2 * Math.sin((v.fresh.t / 0.3) * Math.PI) * (1 - v.fresh.t / 0.3 + 0.3);
        v.atlas.stamp(ctx, color, x, y, d, scale);
      }
    }
    // Popping bubbles swell and vanish.
    for (const p of v.popping) {
      if (!p.started) {
        v.atlas.stamp(ctx, p.color, L.fx + p.x * d, L.fy + p.y * d - shiftPx, d, 1);
        continue;
      }
      const k = p.t / 0.3;
      const scale = k < 0.4 ? 1 + k * 0.7 : Math.max(0, 1.28 * (1 - (k - 0.4) / 0.6));
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.5) * 2);
      v.atlas.stamp(ctx, p.color, L.fx + p.x * d, L.fy + p.y * d - shiftPx, d, scale);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    for (const f of v.falling) {
      if (f.delay > 0) {
        v.atlas.stamp(ctx, f.color, f.x, f.y, d, 1);
        continue;
      }
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      v.atlas.stamp(ctx, f.color, 0, 0, d, 1);
      ctx.restore();
    }

    // Losing line: it glows when the stack gets close.
    const low = lowestRow(g.board);
    const danger = low >= LOSE_ROW - 3 ? 0.5 + 0.5 * Math.sin(v.time * 8) : 0;
    ctx.strokeStyle = withAlpha("#ef4444", 0.45 + 0.45 * danger);
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(L.fx, L.lineY);
    ctx.lineTo(L.fx + fw, L.lineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Aim guide: dotted path with its wall bounces, and a ghost where the bubble will settle.
    const playing = phaseRef.current === "playing" && !v.shot && !v.ending;
    const sxd = COLS / 2;
    const syd = (L.shooterY - L.fy) / d;
    if (playing) {
      const k = `${v.angle.toFixed(3)}:${g.shots}:${g.drops}:${g.score}`;
      if (k !== v.traceKey) {
        v.trace = trace(g.board, sxd, syd, v.angle);
        v.traceKey = k;
      }
      const t = v.trace;
      if (t) {
        const pal = BUBBLE_COLORS[g.loaded % 6];
        ctx.fillStyle = withAlpha(pal.light, 0.9);
        let carry = 0;
        let travelled = 0;
        for (let i = 1; i < t.points.length; i++) {
          const a = t.points[i - 1];
          const b = t.points[i];
          const segLen = Math.hypot(b.x - a.x, b.y - a.y) * d;
          const step = 0.5 * d;
          let s = carry;
          while (s < segLen) {
            const u = s / segLen;
            const x = L.fx + (a.x + (b.x - a.x) * u) * d;
            const y = L.fy + (a.y + (b.y - a.y) * u) * d;
            const fade = Math.max(0.15, 1 - (travelled + s) / (d * 28));
            ctx.globalAlpha = fade;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1.6, d * 0.065), 0, Math.PI * 2);
            ctx.fill();
            s += step;
          }
          carry = s - segLen;
          travelled += segLen;
        }
        ctx.globalAlpha = 1;
        const gc = centerOf(g.board, t.cell.r, t.cell.c);
        ctx.strokeStyle = withAlpha(pal.base, 0.55);
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(L.fx + gc.x * d, L.fy + gc.y * d - shiftPx, d * 0.46, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Shooter: base, barrel, loaded bubble and the next bubble to swap in.
    const sx0 = L.shooterX;
    const sy0 = L.shooterY;
    ctx.save();
    ctx.translate(sx0, sy0);
    roundRect(ctx, -1.5 * d, 0.35 * d, 3 * d, 0.7 * d, 0.3 * d);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.strokeStyle = "rgba(56,189,248,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.rotate(-(v.angle - Math.PI / 2));
    const kick = v.recoil * d * 0.18;
    roundRect(ctx, -0.22 * d, -1.25 * d + kick, 0.44 * d, 1.4 * d, 0.15 * d);
    const bgr = ctx.createLinearGradient(-0.22 * d, 0, 0.22 * d, 0);
    bgr.addColorStop(0, "#94a3b8");
    bgr.addColorStop(0.5, "#e2e8f0");
    bgr.addColorStop(1, "#64748b");
    ctx.fillStyle = bgr;
    ctx.fill();
    roundRect(ctx, -0.3 * d, -1.3 * d + kick, 0.6 * d, 0.22 * d, 0.1 * d);
    ctx.fillStyle = BUBBLE_COLORS[g.loaded % 6].base;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, 0.1 * d, 0.55 * d, 0, Math.PI * 2);
    ctx.fillStyle = "#334155";
    ctx.fill();
    ctx.restore();

    const nb = nextBubblePos(L);
    if (!v.shot && !v.ending) {
      // The loaded bubble slides up from the next slot (or swaps places with it).
      const lx = v.swap < 1 ? nb.x + (sx0 - nb.x) * easeOutBack(v.swap) : v.slide < 1 ? nb.x + (sx0 - nb.x) * easeOutBack(v.slide) : sx0;
      const ly = v.swap < 1 ? nb.y + (sy0 - nb.y) * easeOutBack(v.swap) : v.slide < 1 ? nb.y + (sy0 - nb.y) * easeOutBack(v.slide) : sy0;
      v.atlas.stamp(ctx, g.loaded, lx, ly, d);
    }
    // Next bubble with its label.
    const nx = v.swap < 1 ? sx0 + (nb.x - sx0) * easeOutBack(v.swap) : nb.x;
    const ny = v.swap < 1 ? sy0 + (nb.y - sy0) * easeOutBack(v.swap) : nb.y;
    ctx.beginPath();
    ctx.arc(nb.x, nb.y, d * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15,23,42,0.7)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    v.atlas.stamp(ctx, g.next, nx, ny, d, 0.8);
    text(ctx, "NEXT · TAP", nb.x, nb.y - d * 1.0, { size: Math.max(8, d * 0.24), color: "rgba(255,255,255,0.55)", weight: 700 });

    // The shot in flight.
    if (v.shot) v.atlas.stamp(ctx, g.loaded, L.fx + v.shot.x * d, L.fy + v.shot.y * d, d);

    v.particles.draw(ctx);
    v.floaters.draw(ctx);
    if (v.banner) {
      const k = v.banner.t / 1.3;
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      const s = easeOutBack(Math.min(1, k / 0.15));
      ctx.save();
      ctx.translate(L.fx + fw / 2, L.fy + d * 5.5 - k * 14);
      ctx.scale(s, s);
      text(ctx, v.banner.text, 0, 0, { size: Math.max(18, d * 0.8), color: "#fde047", font: DISPLAY_FONT, stroke: "#0c4a6e", strokeWidth: 6, weight: 900 });
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    drawHud(ctx, L, g, v.shownScore, best, levelRef.current);
  };

  // ---------------------------------------------------------------- screens

  const unlocked = (i: number) => i === 0 || cleared[i - 1] > 0;
  const lv = levelIdx >= 0 ? LEVELS[levelIdx] : null;
  const inLevel = levelIdx >= 0;

  const levelGrid = (
    <div className="mt-3 grid grid-cols-5 gap-2">
      {LEVELS.map((l, i) => (
        <button
          key={l.name}
          type="button"
          disabled={!unlocked(i)}
          aria-label={`Level ${i + 1}: ${l.name}`}
          onClick={() => startLevel(i)}
          className={`relative flex aspect-square items-center justify-center rounded-xl border text-lg font-black transition ${
            unlocked(i) ? "border-sky-300/60 bg-sky-500/20 text-white hover:bg-sky-500/40" : "cursor-not-allowed border-white/10 bg-white/5 text-white/30"
          }`}
        >
          {unlocked(i) ? i + 1 : "🔒"}
          {cleared[i] > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-emerald-400 px-1 text-[10px] text-black">✓</span>}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={root} className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas
        width={layout.w}
        height={layout.h}
        draw={draw}
        onPointer={onPointer}
        background="radial-gradient(ellipse at 50% 20%, #0e2a52 0%, #061427 70%)"
        cursor="crosshair"
      />

      {phase === "title" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={startEndless}
          accent={meta.accent}
          best={best ? formatNumber(best) : undefined}
          bestLabel="Best endless"
          extra={
            <div className="mt-3">
              <SecondaryButton onClick={() => go("levels")}>Play the 10 levels</SecondaryButton>
            </div>
          }
        />
      )}

      {phase === "levels" && (
        <Overlay>
          <h2 className="text-2xl font-black" style={{ color: meta.accent }}>Levels</h2>
          <p className="mt-1 text-xs text-white/60">Clear every bubble. Clear a level to unlock the next.</p>
          {levelGrid}
          <div className="mt-4 space-y-2">
            <PrimaryButton onClick={startEndless} accent={meta.accent}>Endless mode</PrimaryButton>
            <SecondaryButton onClick={() => go("title")}>Back</SecondaryButton>
          </div>
        </Overlay>
      )}

      {phase === "paused" && (
        <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={restart}>
          <p className="mt-2 text-sm text-white/60">{lv ? `Level ${levelIdx + 1} · ${lv.name}` : "Endless"}</p>
          <div className="mt-3">
            <SecondaryButton onClick={() => go("levels")}>Level select</SecondaryButton>
          </div>
        </PausePanel>
      )}

      {phase === "over" && (
        <GameOverPanel
          title={inLevel ? "Overrun!" : "Game over"}
          score={formatNumber(result.score)}
          best={best ? formatNumber(best) : undefined}
          isBest={result.isBest}
          accent={meta.accent}
          onRestart={restart}
        >
          {inLevel ? <p className="mt-2 text-xs text-white/55">The bubbles reached the line on level {levelIdx + 1}.</p> : <p className="mt-2 text-xs text-white/55">Stage {game.current.stage} · {game.current.shots} shots</p>}
          <div className="mt-3">
            <SecondaryButton onClick={() => go(inLevel ? "levels" : "title")}>{inLevel ? "Level select" : "Menu"}</SecondaryButton>
          </div>
        </GameOverPanel>
      )}

      {phase === "won" && (
        <Overlay>
          <h2 className="text-3xl font-black" style={{ color: meta.accent }}>Level cleared!</h2>
          <p className="mt-1 text-sm text-white/60">{lv?.name}</p>
          <div className="mt-3 text-sm text-white/60">Score</div>
          <div className="text-4xl font-black tabular-nums">{formatNumber(result.score)}</div>
          <div className="mt-4 space-y-2">
            {levelIdx < LEVELS.length - 1 ? (
              <PrimaryButton onClick={() => startLevel(levelIdx + 1)} accent={meta.accent} autoFocus>Next level</PrimaryButton>
            ) : (
              <p className="text-sm font-semibold text-amber-300">You cleared every level!</p>
            )}
            <SecondaryButton onClick={() => startLevel(levelIdx)}>Replay</SecondaryButton>
            <SecondaryButton onClick={() => go("levels")}>Level select</SecondaryButton>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function drawHud(ctx: CanvasRenderingContext2D, L: ReturnType<typeof makeLayout>, g: BubbleState, shown: number, best: number, level: number) {
  const m = L.menu;
  roundRect(ctx, m.x, m.y, m.w, m.h, 10);
  ctx.fillStyle = "rgba(15,23,42,0.75)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  if (L.landscape) {
    ctx.fillRect(m.x + 14, m.y + 10, 5, 16);
    ctx.fillRect(m.x + 24, m.y + 10, 5, 16);
    text(ctx, "Menu", m.x + 38, m.y + m.h / 2 + 1, { size: 14, align: "left", weight: 800 });
  } else {
    ctx.fillRect(m.x + 14, m.y + 12, 5, 18);
    ctx.fillRect(m.x + 23, m.y + 12, 5, 18);
  }
  const label = level >= 0 ? `LEVEL ${level + 1}` : `ENDLESS · STAGE ${g.stage}`;
  if (!L.landscape) {
    text(ctx, formatNumber(shown), 14, 22, { size: 28, align: "left", font: DISPLAY_FONT, weight: 900 });
    text(ctx, "SCORE", 15, 42, { size: 10, align: "left", color: "rgba(255,255,255,0.5)", weight: 700 });
    text(ctx, label, L.w / 2 + 10, 20, { size: 12, color: "#7dd3fc", weight: 800 });
    if (level < 0 && best > 0) text(ctx, `Best ${formatNumber(Math.max(best, shown))}`, L.w / 2 + 10, 38, { size: 11, color: "rgba(255,255,255,0.55)", weight: 600 });
  } else {
    const x = 16;
    text(ctx, label, x, 30, { size: 12, align: "left", color: "#7dd3fc", weight: 800 });
    text(ctx, formatNumber(shown), x, 64, { size: 32, align: "left", font: DISPLAY_FONT, weight: 900 });
    text(ctx, "SCORE", x + 1, 88, { size: 10, align: "left", color: "rgba(255,255,255,0.5)", weight: 700 });
    if (level < 0 && best > 0) text(ctx, `Best ${formatNumber(Math.max(best, shown))}`, x, 112, { size: 12, align: "left", color: "rgba(255,255,255,0.55)", weight: 600 });
    if (g.missesPerDrop > 0) text(ctx, `Ceiling drops in ${Math.max(1, g.missesPerDrop - g.misses)}`, x, 140, { size: 12, align: "left", color: "rgba(255,255,255,0.6)", weight: 700 });
    const left = colorsOnBoard(g.board).length;
    text(ctx, `${left} ${left === 1 ? "colour" : "colours"} left`, x, 160, { size: 12, align: "left", color: "rgba(255,255,255,0.45)", weight: 600 });
  }
}
