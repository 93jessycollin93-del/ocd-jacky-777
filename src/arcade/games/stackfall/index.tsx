// Stackfall: a classic falling-block game. Rules live in logic.ts; this file draws the well, plays the
// sounds and handles keys (with proper auto-repeat), touch gestures and the start / pause / game-over flow.
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type CanvasPointer, type View } from "../../kit/GameCanvas";
import { DISPLAY_FONT, Floaters, Particles, Shake, damp, fillRoundRect, roundRect, shade, text, withAlpha } from "../../kit/draw";
import { noise, play, tone } from "../../kit/sfx";
import { randomSeed } from "../../kit/rng";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import { formatNumber } from "../../kit/format";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import {
  COLS, HIDDEN, LINES_PER_LEVEL, LOCK_DELAY, QUEUE_SHOWN, ROWS, SHAPES, VISIBLE, cellsOf, ghostY, hardDrop, holdPiece, move,
  newGame, newRepeat, pieceId, repeatSteps, rotate, softDropStep, update, upcoming, type PieceType, type StackEvent,
  type StackState,
} from "./logic";

type Phase = "ready" | "playing" | "paused" | "dying" | "over";

// Piece colours, indexed by piece id (1 = I … 7 = L); 8 is the grey of a finished game.
const COLORS = ["", "#5eead4", "#fcd34d", "#f472b6", "#a3e635", "#fb7185", "#818cf8", "#fb923c", "#4a4566"];
const EDGE = COLORS.map((c) => (c ? shade(c, -0.24) : ""));
const GLOSS = "rgba(255,255,255,0.3)";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Layout {
  portrait: boolean;
  W: number;
  H: number;
  /** Cell size in logical units. */
  C: number;
  wx: number;
  wy: number;
  hold: Rect;
  next: Rect;
}

const LANDSCAPE: Layout = {
  portrait: false, W: 560, H: 456, C: 22, wx: 170, wy: 8,
  hold: { x: 10, y: 8, w: 146, h: 96 }, next: { x: 404, y: 8, w: 146, h: 300 },
};
const PORTRAIT: Layout = {
  portrait: true, W: 360, H: 776, C: 33, wx: 15, wy: 108,
  hold: { x: 10, y: 6, w: 62, h: 62 }, next: { x: 80, y: 6, w: 236, h: 62 },
};

// Cells of each piece (rotation 0) as a tight box, to centre previews.
const BOUNDS = Object.fromEntries(
  (Object.keys(SHAPES) as PieceType[]).map((t) => {
    const cs = SHAPES[t][0];
    const xs = cs.map((c) => c[0]);
    const ys = cs.map((c) => c[1]);
    return [t, { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }];
  }),
) as Record<PieceType, { minX: number; maxX: number; minY: number; maxY: number }>;

function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, id: number, alpha = 1, white = 0) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  const r = s * 0.2;
  fillRoundRect(ctx, x + 0.5, y + 0.5, s - 1, s - 1, r, EDGE[id]);
  fillRoundRect(ctx, x + 1.5, y + 1.5, s - 3, s - 3.5, r * 0.85, COLORS[id]);
  fillRoundRect(ctx, x + 2.5, y + 2.5, s - 5, (s - 5) * 0.36, r * 0.6, GLOSS);
  if (white > 0) {
    ctx.globalAlpha = alpha * Math.min(1, white);
    fillRoundRect(ctx, x + 0.5, y + 0.5, s - 1, s - 1, r, "#ffffff");
  }
  ctx.globalAlpha = 1;
}

function drawMini(ctx: CanvasRenderingContext2D, type: PieceType, cx: number, cy: number, m: number, alpha = 1, grey = false) {
  const b = BOUNDS[type];
  const w = (b.maxX - b.minX + 1) * m;
  const h = (b.maxY - b.minY + 1) * m;
  const ox = cx - w / 2 - b.minX * m;
  const oy = cy - h / 2 - b.minY * m;
  const id = grey ? 8 : pieceId(type);
  for (const [x, y] of SHAPES[type][0]) drawBlock(ctx, ox + x * m, oy + y * m, m, id, alpha);
}

function panel(ctx: CanvasRenderingContext2D, r: Rect, label: string, accent = false) {
  roundRect(ctx, r.x, r.y, r.w, r.h, 12);
  ctx.fillStyle = accent ? "rgba(139,92,246,0.14)" : "rgba(255,255,255,0.05)";
  ctx.fill();
  ctx.strokeStyle = accent ? "rgba(167,139,250,0.55)" : "rgba(255,255,255,0.09)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, label, r.x + r.w / 2, r.y + 12, { size: 11, color: "rgba(255,255,255,0.5)", weight: 800 });
}

const inRect = (r: Rect, x: number, y: number, pad = 0) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;

interface Flash {
  rows: number[];
  colors: number[][];
  t: number;
}
interface Trail {
  col: number;
  y0: number;
  y1: number;
  id: number;
  t: number;
}

export default function StackfallGame({ touch, best, submitScore }: GameProps) {
  const [portrait, setPortrait] = useState(() => typeof window !== "undefined" && window.innerWidth < window.innerHeight * 1.05);
  const box = useRef<HTMLDivElement>(null);
  const L = portrait ? PORTRAIT : LANDSCAPE;
  const layout = useRef(L);
  layout.current = L;

  const game = useRef<StackState>(newGame(randomSeed()));
  const fx = useRef({
    particles: new Particles(900),
    shake: new Shake(),
    floaters: new Floaters(),
    flashes: [] as Flash[],
    trails: [] as Trail[],
    lockFlash: [] as { x: number; y: number; id: number; t: number }[],
    rowOff: new Float32Array(ROWS),
    vx: 0,
    vy: 0,
    lastX: 0,
    lastY: 0,
    snap: true,
    scoreShown: 0,
    deadT: 0,
    levelPulse: 0,
  });
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [result, setResult] = useState({ score: 0, isBest: false, lines: 0, level: 1 });
  const keys = useRef({ left: false, right: false, last: 0 as -1 | 0 | 1, soft: false });
  const rep = useRef(newRepeat());
  const gesture = useRef<{ id: number; sx: number; sy: number; ax: number; ay: number; t0: number; moved: boolean; consumed: boolean } | null>(null);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // Pick the layout from the shape of the play area.
  useEffect(() => {
    const el = box.current?.parentElement;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth && el.clientHeight) setPortrait(el.clientWidth < el.clientHeight * 1.05);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const start = useCallback(() => {
    game.current = newGame(randomSeed());
    const f = fx.current;
    f.particles.clear();
    f.flashes = [];
    f.trails = [];
    f.lockFlash = [];
    f.rowOff.fill(0);
    f.snap = true;
    f.scoreShown = 0;
    f.deadT = 0;
    f.levelPulse = 0;
    f.floaters.items = [];
    rep.current = newRepeat();
    keys.current = { left: false, right: false, last: 0, soft: false };
    gesture.current = null;
    play("select");
    go("playing");
  }, [go]);

  /** React to what the rules reported: sounds, particles, flashes, shake, game over. */
  const handle = (events: StackEvent[]) => {
    const g = game.current;
    const f = fx.current;
    const l = layout.current;
    const px = (col: number) => l.wx + col * l.C;
    const py = (row: number) => l.wy + (row - HIDDEN) * l.C;
    let hard = false;
    for (const e of events) {
      switch (e.type) {
        case "spawn":
          f.snap = true;
          break;
        case "hold":
          f.snap = true;
          play("flip");
          break;
        case "harddrop": {
          hard = true;
          const topByCol = new Map<number, number>();
          for (const [x, y] of e.from) topByCol.set(x, Math.min(topByCol.get(x) ?? 99, y));
          const botByCol = new Map<number, number>();
          for (const [x, y] of e.from) botByCol.set(x, Math.max(botByCol.get(x) ?? -1, y + e.dist));
          for (const [col, y0] of topByCol) {
            if (e.dist > 0) f.trails.push({ col, y0, y1: botByCol.get(col) ?? y0, id: pieceId(e.piece), t: 1 });
            f.particles.burst(px(col) + l.C / 2, py((botByCol.get(col) ?? y0) + 1), 3, {
              color: [COLORS[pieceId(e.piece)], "#ffffff"], speed: 110, size: 3.2, life: 0.4, gravity: 420, angle: -Math.PI / 2, spread: Math.PI * 0.9,
            });
          }
          f.shake.add(Math.min(0.32, 0.06 + e.dist * 0.014));
          noise(0.09, 0.28, { freq: 900, sweep: 200 });
          tone(150, 0.1, "sine", 0.18, { slide: 70 });
          break;
        }
        case "lock":
          for (const [x, y] of e.cells) f.lockFlash.push({ x, y, id: pieceId(e.piece), t: 1 });
          if (!hard) play("place");
          break;
        case "clear": {
          const n = e.lines;
          // Remember where each surviving row came from so it can slide down smoothly.
          const cleared = new Set(e.rows);
          const surv: number[] = [];
          for (let y = 0; y < ROWS; y++) if (!cleared.has(y)) surv.push(y);
          const old = Float32Array.from(f.rowOff);
          for (let y = 0; y < ROWS; y++) {
            if (y < n) f.rowOff[y] = 0;
            else f.rowOff[y] = surv[y - n] - y + old[surv[y - n]];
          }
          f.flashes.push({ rows: e.rows, colors: e.colors, t: 0 });
          const cx = l.wx + (COLS * l.C) / 2;
          const midRow = e.rows[Math.floor(e.rows.length / 2)];
          for (let i = 0; i < e.rows.length; i++) {
            for (let x = 0; x < COLS; x++) {
              const id = e.colors[i][x];
              if (!id) continue;
              f.particles.burst(px(x) + l.C / 2, py(e.rows[i]) + l.C / 2, n === 4 ? 4 : 2, {
                color: [COLORS[id], "#ffffff"], speed: n === 4 ? 300 : 190, size: n === 4 ? 5.5 : 4, life: 0.8, gravity: 520, shape: "square",
              });
            }
          }
          const label = n === 4 ? "QUAD!" : n === 3 ? "TRIPLE" : n === 2 ? "DOUBLE" : "SINGLE";
          const y0 = py(midRow) + l.C / 2;
          f.floaters.add(cx, y0 - 8, label, n === 4 ? "#fde047" : "#e9d5ff", n === 4 ? 30 : 22);
          f.floaters.add(cx, y0 + 18, `+${formatNumber(e.points)}`, "#ffffff", 20);
          if (e.b2b) f.floaters.add(cx, y0 + 42, "BACK-TO-BACK", "#f0abfc", 16);
          if (e.combo > 0) f.floaters.add(cx, y0 + (e.b2b ? 62 : 42), `COMBO ×${e.combo}`, "#5eead4", 16);
          if (n === 4) {
            f.shake.add(0.75);
            play("powerup", 1.1);
            noise(0.35, 0.35, { freq: 2500, sweep: 200 });
          } else {
            f.shake.add(0.12 * n);
            play("match", 0.9 + n * 0.12);
          }
          if (e.combo > 0) tone(520 * (1 + e.combo * 0.09), 0.1, "triangle", 0.1, { delay: 0.12 });
          break;
        }
        case "levelup":
          f.levelPulse = 1;
          f.floaters.add(l.wx + (COLS * l.C) / 2, l.wy + 4 * l.C, `LEVEL ${e.level}`, "#a78bfa", 28);
          play("levelup");
          break;
        case "gameover": {
          if (phaseRef.current === "dying" || phaseRef.current === "over") break;
          play("lose");
          f.shake.add(0.7);
          f.deadT = 0;
          const isBest = submitScore(g.score);
          setResult({ score: g.score, isBest, lines: g.lines, level: g.level });
          phaseRef.current = "dying";
          window.setTimeout(() => go("over"), 1100);
          break;
        }
      }
    }
  };

  /** Direction of the held arrow keys (the one pressed last wins when both are down). */
  const heldDir = (): -1 | 0 | 1 => {
    const k = keys.current;
    if (k.left && k.right) return k.last;
    return k.left ? -1 : k.right ? 1 : 0;
  };

  const shift = (dx: -1 | 1) => {
    if (move(game.current, dx)) {
      tone(760, 0.025, "square", 0.035);
      return true;
    }
    return false;
  };
  const turn = (dir: 1 | -1) => {
    if (rotate(game.current, dir)) tone(dir > 0 ? 560 : 500, 0.04, "triangle", 0.07);
    else tone(180, 0.03, "square", 0.04);
  };
  const drop = () => handle(hardDrop(game.current));
  const doHold = () => {
    if (holdPiece(game.current)) {
      const ev: StackEvent[] = [{ type: "hold" }];
      if (!game.current.alive) ev.push({ type: "gameover" });
      handle(ev);
    } else tone(160, 0.08, "square", 0.08);
  };
  const togglePause = () => {
    const p = phaseRef.current;
    if (p === "playing") go("paused");
    else if (p === "paused") go("playing");
  };

  const onKey = useRef<(e: KeyboardEvent, down: boolean) => void>(() => {});
  onKey.current = (e, isDown) => {
    const k = keys.current;
    const code = e.code;
    const p = phaseRef.current;
    // Keep the page from scrolling while playing; menus keep Space and Enter for their buttons.
    if ((code.startsWith("Arrow") || code === "Space") && (p === "playing" || p === "dying" || p === "ready" || p === "over")) e.preventDefault();
    if (!isDown) {
      if (code === "ArrowLeft" || code === "KeyA") k.left = false;
      else if (code === "ArrowRight" || code === "KeyD") k.right = false;
      else if (code === "ArrowDown" || code === "KeyS") k.soft = false;
      return;
    }
    if (e.repeat) return;
    if (code === "KeyP" || code === "Escape") {
      if (p === "playing" || p === "paused") togglePause();
      return;
    }
    if (p === "ready" || p === "over") {
      if (code === "Space" || code === "Enter") start();
      return;
    }
    if (p !== "playing") return;
    switch (code) {
      case "ArrowLeft":
      case "KeyA":
        k.left = true;
        k.last = -1;
        shift(-1);
        rep.current.dir = -1;
        rep.current.t = 0;
        rep.current.n = 0;
        break;
      case "ArrowRight":
      case "KeyD":
        k.right = true;
        k.last = 1;
        shift(1);
        rep.current.dir = 1;
        rep.current.t = 0;
        rep.current.n = 0;
        break;
      case "ArrowDown":
      case "KeyS":
        k.soft = true;
        break;
      case "ArrowUp":
      case "KeyX":
      case "KeyW":
        turn(1);
        break;
      case "KeyZ":
        turn(-1);
        break;
      case "KeyC":
      case "ShiftLeft":
      case "ShiftRight":
        doHold();
        break;
      case "Space":
        drop();
        break;
    }
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => onKey.current(e, true);
    const up = (e: KeyboardEvent) => onKey.current(e, false);
    const lose = () => {
      keys.current = { left: false, right: false, last: 0, soft: false };
      if (phaseRef.current === "playing") go("paused");
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") lose();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", lose);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", lose);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [go]);

  const onPointer = (p: CanvasPointer) => {
    const l = layout.current;
    if (phaseRef.current !== "playing") return;
    const gs = gesture.current;
    if (p.type === "down") {
      if (inRect(l.hold, p.x, p.y, 6)) {
        doHold();
        gesture.current = { id: p.id, sx: p.x, sy: p.y, ax: p.x, ay: p.y, t0: performance.now(), moved: false, consumed: true };
        return;
      }
      if (p.pointerType === "mouse") return;
      gesture.current = { id: p.id, sx: p.x, sy: p.y, ax: p.x, ay: p.y, t0: performance.now(), moved: false, consumed: false };
      return;
    }
    if (!gs || gs.id !== p.id) return;
    if (p.type === "cancel") {
      gesture.current = null;
      return;
    }
    if (gs.consumed) {
      if (p.type === "up") gesture.current = null;
      return;
    }
    const C = l.C;
    if (p.type === "move") {
      // One cell per cell-width of drag; if the piece is blocked, the anchor follows the finger so
      // reversing direction responds at once.
      while (p.x - gs.ax >= C) {
        if (shift(1)) {
          gs.moved = true;
          gs.ax += C;
        } else gs.ax = p.x;
      }
      while (gs.ax - p.x >= C) {
        if (shift(-1)) {
          gs.moved = true;
          gs.ax -= C;
        } else gs.ax = p.x;
      }
      while (p.y - gs.ay >= C) {
        if (softDropStep(game.current)) {
          gs.moved = true;
          gs.ay += C;
          tone(300, 0.02, "square", 0.03);
        } else gs.ay = p.y;
      }
      if (p.y < gs.ay) gs.ay = p.y;
      return;
    }
    // up
    const dt = performance.now() - gs.t0;
    const dy = p.y - gs.sy;
    const dx = p.x - gs.sx;
    gesture.current = null;
    if (dy > C * 2.5 && dt < 320 && Math.abs(dy) > Math.abs(dx) * 1.2) drop();
    else if (dy < -C * 2.5 && dt < 420 && Math.abs(dy) > Math.abs(dx) * 1.2) doHold();
    else if (!gs.moved && Math.hypot(dx, dy) < C * 0.7 && dt < 350) turn(1);
  };

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number) => {
    const g = game.current;
    const f = fx.current;
    const l = layout.current;
    const ph = phaseRef.current;
    const C = l.C;

    // ---- simulation
    if (ph === "playing") {
      const k = keys.current;
      const steps = repeatSteps(rep.current, heldDir(), dt);
      let shifted = false;
      for (let i = 0; i < steps; i++) {
        const d = rep.current.dir;
        if (d === 0 || !move(g, d)) break;
        shifted = true;
      }
      if (shifted) tone(760, 0.025, "square", 0.03);
      const ev = update(g, dt, k.soft);
      if (ev.length) handle(ev);
      if (k.soft && !g.alive) k.soft = false;
    }
    if (ph === "dying") f.deadT += dt;
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);
    f.levelPulse = Math.max(0, f.levelPulse - dt * 1.5);
    f.scoreShown = damp(f.scoreShown, g.score, 10, dt);
    if (Math.abs(f.scoreShown - g.score) < 0.5) f.scoreShown = g.score;
    for (const fl of f.flashes) fl.t += dt / 0.42;
    f.flashes = f.flashes.filter((fl) => fl.t < 1);
    for (const t of f.trails) t.t -= dt / 0.22;
    f.trails = f.trails.filter((t) => t.t > 0);
    for (const lf of f.lockFlash) lf.t -= dt / 0.16;
    f.lockFlash = f.lockFlash.filter((lf) => lf.t > 0);
    for (let y = 0; y < ROWS; y++) {
      if (f.rowOff[y] !== 0) {
        f.rowOff[y] = damp(f.rowOff[y], 0, 16, dt);
        if (Math.abs(f.rowOff[y]) < 0.01) f.rowOff[y] = 0;
      }
    }
    // The falling piece glides between cells instead of teleporting.
    if (f.snap) {
      f.vx = 0;
      f.vy = 0;
      f.snap = false;
    } else {
      f.vx += f.lastX - g.cur.x;
      f.vy += f.lastY - g.cur.y;
      f.vx = damp(f.vx, 0, 42, dt);
      f.vy = damp(f.vy, 0, 34, dt);
      if (Math.abs(f.vx) < 0.005) f.vx = 0;
      if (Math.abs(f.vy) < 0.005) f.vy = 0;
    }
    f.lastX = g.cur.x;
    f.lastY = g.cur.y;

    // ---- background
    const { w: W, h: H } = view;
    ctx.fillStyle = "#0d0a1f";
    ctx.fillRect(0, 0, W, H);

    const [sx, sy] = f.shake.offset(10);
    ctx.save();
    ctx.translate(sx, sy);

    // ---- the well
    const wx = l.wx;
    const wy = l.wy;
    const ww = COLS * C;
    const wh = VISIBLE * C;
    // a soft violet glow around the well, built from a few widening strokes (no blur filter needed)
    for (let i = 5; i >= 1; i--) {
      ctx.strokeStyle = `rgba(139,92,246,${0.05 + (5 - i) * 0.012})`;
      ctx.lineWidth = i * 5;
      roundRect(ctx, wx - 3, wy - 3, ww + 6, wh + 6, 8 + i * 2);
      ctx.stroke();
    }
    fillRoundRect(ctx, wx - 3, wy - 3, ww + 6, wh + 6, 8, "#0c0a1c");
    ctx.strokeStyle = "rgba(167,139,250,0.55)";
    ctx.lineWidth = 2;
    roundRect(ctx, wx - 3, wy - 3, ww + 6, wh + 6, 8);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) {
      ctx.moveTo(wx + x * C, wy);
      ctx.lineTo(wx + x * C, wy + wh);
    }
    for (let y = 1; y < VISIBLE; y++) {
      ctx.moveTo(wx, wy + y * C);
      ctx.lineTo(wx + ww, wy + y * C);
    }
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, ww, wh);
    ctx.clip();

    // settled blocks (sliding down after a clear; greying out when the game ends)
    const greyFrom = ph === "dying" ? ROWS - (f.deadT / 0.8) * ROWS : ph === "over" ? -1 : Infinity;
    for (let y = HIDDEN - 1; y < ROWS; y++) {
      const gy = wy + (y - HIDDEN + f.rowOff[y]) * C;
      const grey = y >= greyFrom;
      for (let x = 0; x < COLS; x++) {
        const id = g.board[y * COLS + x];
        if (id) drawBlock(ctx, wx + x * C, gy, C, grey ? 8 : id);
      }
    }

    // line-clear flashes
    for (const fl of f.flashes) {
      const t = Math.min(1, fl.t);
      for (let i = 0; i < fl.rows.length; i++) {
        const gy = wy + (fl.rows[i] - HIDDEN) * C;
        const a = 1 - t;
        const grow = 1 + t * 0.35;
        ctx.globalAlpha = Math.min(1, a * 1.4) * 0.85;
        const bar = ctx.createLinearGradient(wx, 0, wx + ww, 0);
        bar.addColorStop(0, "rgba(255,255,255,0)");
        bar.addColorStop(0.5, "#ffffff");
        bar.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = bar;
        ctx.fillRect(wx, gy + C / 2 - (C * grow) / 2, ww, C * grow);
        ctx.globalAlpha = 1;
        for (let x = 0; x < COLS; x++) {
          const id = fl.colors[i][x];
          if (!id) continue;
          const sc = 1 - t * 0.55;
          drawBlock(ctx, wx + x * C + (C * (1 - sc)) / 2, gy + (C * (1 - sc)) / 2, C * sc, id, a, 0.7 * a + 0.2);
        }
      }
    }

    // hard-drop trails
    for (const t of f.trails) {
      const top = wy + (t.y0 - HIDDEN) * C;
      const bot = wy + (t.y1 + 1 - HIDDEN) * C;
      const grad = ctx.createLinearGradient(0, top, 0, bot);
      grad.addColorStop(0, withAlpha(COLORS[t.id], 0));
      grad.addColorStop(1, withAlpha(COLORS[t.id], 0.42 * t.t));
      ctx.fillStyle = grad;
      ctx.fillRect(wx + t.col * C + 3, top, C - 6, bot - top);
    }

    if (ph === "playing" || ph === "paused") {
      // ghost
      const gyRow = ghostY(g);
      const id = pieceId(g.cur.type);
      if (gyRow !== g.cur.y) {
        for (const [x, y] of SHAPES[g.cur.type][g.cur.rot]) {
          const gx = wx + (g.cur.x + x) * C;
          const gyy = wy + (gyRow + y - HIDDEN) * C;
          fillRoundRect(ctx, gx + 2, gyy + 2, C - 4, C - 4, C * 0.18, withAlpha(COLORS[id], 0.12));
          ctx.strokeStyle = withAlpha(COLORS[id], 0.6);
          ctx.lineWidth = 1.6;
          roundRect(ctx, gx + 2, gyy + 2, C - 4, C - 4, C * 0.18);
          ctx.stroke();
        }
      }
      // falling piece, getting whiter as the lock delay runs out
      const glow = g.lockTimer > 0 ? Math.min(0.4, (g.lockTimer / LOCK_DELAY) * 0.4) : 0;
      for (const [x, y] of cellsOf(g.cur)) {
        drawBlock(ctx, wx + (x + f.vx) * C, wy + (y - HIDDEN + f.vy) * C, C, id, 1, glow);
      }
    }
    // pieces that just locked flash white for a moment
    for (const lf of f.lockFlash) {
      ctx.globalAlpha = lf.t * 0.7;
      fillRoundRect(ctx, wx + lf.x * C + 1, wy + (lf.y - HIDDEN) * C + 1, C - 2, C - 2, C * 0.2, "#ffffff");
    }
    ctx.globalAlpha = 1;
    f.particles.draw(ctx);
    ctx.restore(); // well clip
    f.floaters.draw(ctx);
    ctx.restore(); // shake

    // ---- side panels / HUD
    ctx.globalAlpha = 1;
    panel(ctx, l.hold, "HOLD", touch);
    if (g.hold && ph !== "ready") {
      drawMini(ctx, g.hold, l.hold.x + l.hold.w / 2, l.hold.y + l.hold.h / 2 + 7, l.portrait ? 11 : 20, g.canHold ? 1 : 0.45, !g.canHold);
    } else if (touch) {
      text(ctx, "tap to hold", l.hold.x + l.hold.w / 2, l.hold.y + l.hold.h / 2 + 8, { size: l.portrait ? 9 : 12, color: "rgba(255,255,255,0.4)" });
    }
    panel(ctx, l.next, "NEXT");
    const nextPieces = ph === "ready" ? [] : upcoming(g, QUEUE_SHOWN);
    if (l.portrait) {
      const slot = l.next.w / QUEUE_SHOWN;
      nextPieces.forEach((t, i) => drawMini(ctx, t, l.next.x + slot * (i + 0.5), l.next.y + l.next.h / 2 + 7, i === 0 ? 11 : 9.5, i === 0 ? 1 : 0.8));
    } else {
      let y = l.next.y + 28;
      nextPieces.forEach((t, i) => {
        const hgt = i === 0 ? 62 : 48;
        drawMini(ctx, t, l.next.x + l.next.w / 2, y + hgt / 2, i === 0 ? 19 : 14, i === 0 ? 1 : 0.8);
        y += hgt;
      });
    }

    const lvlProgress = (g.lines % LINES_PER_LEVEL) / LINES_PER_LEVEL;
    const bestShown = Math.max(best, g.score);
    const scoreText = formatNumber(f.scoreShown);
    if (l.portrait) {
      text(ctx, "SCORE", 15, 80, { align: "left", size: 10, color: "rgba(255,255,255,0.5)", weight: 800 });
      text(ctx, scoreText, 15, 96, { align: "left", size: 24, font: DISPLAY_FONT, color: "#ddd6fe", weight: 900 });
      text(ctx, "LEVEL", 180, 80, { align: "left", size: 10, color: "rgba(255,255,255,0.5)", weight: 800 });
      text(ctx, `${g.level}`, 180, 96, { align: "left", size: 22, font: DISPLAY_FONT, color: "#fff", weight: 900 });
      text(ctx, "LINES", 240, 80, { align: "left", size: 10, color: "rgba(255,255,255,0.5)", weight: 800 });
      text(ctx, `${g.lines}`, 240, 96, { align: "left", size: 22, font: DISPLAY_FONT, color: "#fff", weight: 900 });
      text(ctx, "BEST", 345, 80, { align: "right", size: 10, color: "rgba(255,255,255,0.5)", weight: 800 });
      text(ctx, formatNumber(bestShown), 345, 96, { align: "right", size: 16, font: DISPLAY_FONT, color: "#fde68a", weight: 900 });
      // progress to the next level under the stats
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(15, 103, 330, 2);
      ctx.fillStyle = "#a78bfa";
      ctx.fillRect(15, 103, 330 * lvlProgress, 2);
    } else {
      const lx = 10;
      const lw = 146;
      const stat = (label: string, value: string, y: number, big = false, color = "#fff") => {
        roundRect(ctx, lx, y, lw, big ? 70 : 54, 12);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fill();
        text(ctx, label, lx + 12, y + 14, { align: "left", size: 11, color: "rgba(255,255,255,0.5)", weight: 800 });
        text(ctx, value, lx + lw - 12, y + (big ? 46 : 36), { align: "right", size: big ? 30 : 24, font: DISPLAY_FONT, color, weight: 900 });
      };
      stat("SCORE", scoreText, 114, true, "#ddd6fe");
      stat("LEVEL", `${g.level}`, 192, false);
      // progress bar to the next level
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(lx + 12, 192 + 44, 60, 4);
      ctx.fillStyle = "#a78bfa";
      ctx.fillRect(lx + 12, 192 + 44, 60 * lvlProgress, 4);
      stat("LINES", `${g.lines}`, 254, false);
      // best on the right under the queue
      const by = l.next.y + l.next.h + 10;
      roundRect(ctx, l.next.x, by, l.next.w, 58, 12);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fill();
      text(ctx, "BEST", l.next.x + 12, by + 14, { align: "left", size: 11, color: "rgba(255,255,255,0.5)", weight: 800 });
      text(ctx, formatNumber(bestShown), l.next.x + l.next.w - 12, by + 38, { align: "right", size: 24, font: DISPLAY_FONT, color: "#fde68a", weight: 900 });
      const hints = touch
        ? ["Drag  move", "Tap  rotate", "Slow drag ↓  soft drop", "Swipe ↓  hard drop", "Swipe ↑  hold"]
        : ["← →  move", "↓  soft drop", "Space  hard drop", "Z X  rotate", "C  hold", "P  pause"];
      hints.forEach((h, i) => text(ctx, h, lx + 4, 330 + i * 19, { align: "left", size: 12, color: "rgba(255,255,255,0.4)", weight: 600 }));
    }
  };

  return (
    <div ref={box} className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas width={L.W} height={L.H} draw={draw} onPointer={onPointer} background="#0d0a1f" />
      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={best ? formatNumber(best) : undefined}
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={start} />}
      {phase === "over" && (
        <GameOverPanel accent={meta.accent} score={formatNumber(result.score)} best={formatNumber(best)} isBest={result.isBest} onRestart={start}>
          <p className="mt-2 text-xs text-white/55">
            {result.lines} lines · level {result.level}
          </p>
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
