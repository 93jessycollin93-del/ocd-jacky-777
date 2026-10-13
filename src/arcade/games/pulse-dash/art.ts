// Pulse Dash art: a neon synthwave look drawn in code. One block is BLOCK pixels; the floor sits at GROUND_Y
// and the ceiling CEIL blocks above it. Everything pulses on the beat.
import { roundRect, shade, withAlpha, type Ctx } from "../../kit/draw";
import { CEIL, type Obj, type Theme } from "./logic";

export const VIEW_H = 450;
export const BLOCK = 38;
export const GROUND_Y = 402;
export const CEIL_Y = GROUND_Y - CEIL * BLOCK;

export interface Frame {
  /** World x (blocks) at the left edge of the screen. */
  camX: number;
  w: number;
  /** Seconds, and the beat pulse: 1 right on the beat, fading to 0. */
  time: number;
  pulse: number;
  theme: Theme;
}

export const px = (f: Frame, x: number) => (x - f.camX) * BLOCK;
export const py = (y: number) => GROUND_Y - y * BLOCK;

// ---------------------------------------------------------------- background

const SHAPES = Array.from({ length: 9 }, (_, i) => ({
  x: (i * 211 + 40) % 1400, y: 40 + ((i * 97) % 250), s: 50 + ((i * 53) % 90), k: i % 3,
}));

export function drawBackground(ctx: Ctx, f: Frame) {
  const { w, theme } = f;
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, theme.top);
  g.addColorStop(1, theme.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, VIEW_H);
  // Big slow shapes.
  const scroll = f.camX * BLOCK * 0.12;
  ctx.fillStyle = withAlpha(theme.accent, 0.07 + f.pulse * 0.04);
  for (const s of SHAPES) {
    const x = ((((s.x - scroll) % 1400) + 1400) % 1400) - 150;
    if (x > w + 120) continue;
    ctx.beginPath();
    if (s.k === 0) {
      ctx.moveTo(x, s.y - s.s);
      ctx.lineTo(x + s.s * 0.8, s.y);
      ctx.lineTo(x, s.y + s.s);
      ctx.lineTo(x - s.s * 0.8, s.y);
    } else if (s.k === 1) {
      ctx.moveTo(x - s.s, s.y + s.s * 0.7);
      ctx.lineTo(x + s.s, s.y + s.s * 0.7);
      ctx.lineTo(x, s.y - s.s * 0.8);
    } else {
      ctx.arc(x, s.y, s.s * 0.7, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill();
  }
  // A perspective-ish grid of vertical lines that breathes with the beat.
  ctx.strokeStyle = withAlpha(theme.accent, 0.08 + f.pulse * 0.1);
  ctx.lineWidth = 1.5;
  const gap = 76;
  const off = (f.camX * BLOCK * 0.4) % gap;
  ctx.beginPath();
  for (let x = -off; x < w + gap; x += gap) {
    ctx.moveTo(x, CEIL_Y);
    ctx.lineTo(x, GROUND_Y);
  }
  ctx.stroke();
  // Horizon glow.
  const h = ctx.createLinearGradient(0, GROUND_Y - 160, 0, GROUND_Y);
  h.addColorStop(0, withAlpha(theme.accent, 0));
  h.addColorStop(1, withAlpha(theme.accent, 0.16 + f.pulse * 0.16));
  ctx.fillStyle = h;
  ctx.fillRect(0, GROUND_Y - 160, w, 160);
}

export function drawFloor(ctx: Ctx, f: Frame) {
  const { w, theme } = f;
  // Ground.
  ctx.fillStyle = shade(theme.top, -0.05);
  ctx.fillRect(0, GROUND_Y, w, VIEW_H - GROUND_Y);
  ctx.fillStyle = withAlpha(theme.accent, 0.1);
  ctx.fillRect(0, GROUND_Y, w, 8);
  const off = (f.camX * BLOCK) % BLOCK;
  ctx.strokeStyle = withAlpha(theme.accent, 0.18);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = -off; x < w + BLOCK; x += BLOCK) {
    ctx.moveTo(x, GROUND_Y + 8);
    ctx.lineTo(x, VIEW_H);
  }
  ctx.moveTo(0, GROUND_Y + 8 + BLOCK);
  ctx.lineTo(w, GROUND_Y + 8 + BLOCK);
  ctx.stroke();
  glowLine(ctx, 0, GROUND_Y, w, GROUND_Y, theme.accent, f.pulse);
  // Ceiling.
  ctx.fillStyle = shade(theme.top, -0.06);
  ctx.fillRect(0, 0, w, CEIL_Y);
  ctx.strokeStyle = withAlpha(theme.accent, 0.14);
  ctx.beginPath();
  for (let x = -off; x < w + BLOCK; x += BLOCK) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CEIL_Y);
  }
  ctx.stroke();
  glowLine(ctx, 0, CEIL_Y, w, CEIL_Y, theme.accent, f.pulse);
}

function glowLine(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, pulse: number) {
  ctx.lineCap = "round";
  ctx.strokeStyle = withAlpha(color, 0.18 + pulse * 0.2);
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
}

// ---------------------------------------------------------------- obstacles

export function drawObject(ctx: Ctx, f: Frame, o: Obj, used: boolean) {
  const { theme } = f;
  const x0 = px(f, o.x);
  if (x0 > f.w + 120) return;
  switch (o.t) {
    case "block": {
      const w = o.w * BLOCK;
      if (x0 + w < -20) return;
      const top = py(o.y + o.h);
      const hgt = o.h * BLOCK;
      const g = ctx.createLinearGradient(0, top, 0, top + hgt);
      g.addColorStop(0, withAlpha(theme.accent, 0.38));
      g.addColorStop(1, withAlpha(theme.accent, 0.12));
      ctx.fillStyle = g;
      ctx.fillRect(x0, top, w, hgt);
      // Inner grid.
      ctx.strokeStyle = withAlpha(theme.accent2, 0.22);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 1; i < o.w; i++) {
        ctx.moveTo(x0 + i * BLOCK, top);
        ctx.lineTo(x0 + i * BLOCK, top + hgt);
      }
      for (let j = 1; j < o.h; j++) {
        ctx.moveTo(x0, top + j * BLOCK);
        ctx.lineTo(x0 + w, top + j * BLOCK);
      }
      ctx.stroke();
      ctx.strokeStyle = withAlpha(theme.accent, 0.3 + f.pulse * 0.25);
      ctx.lineWidth = 7;
      ctx.strokeRect(x0, top, w, hgt);
      ctx.strokeStyle = theme.accent2;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x0, top, w, hgt);
      break;
    }
    case "spike": {
      if (x0 < -BLOCK) return;
      const base = o.down ? py(o.y + 1) : py(o.y);
      const tip = o.down ? base + BLOCK : base - BLOCK;
      ctx.beginPath();
      ctx.moveTo(x0 + 1, base);
      ctx.lineTo(x0 + BLOCK / 2, tip);
      ctx.lineTo(x0 + BLOCK - 1, base);
      ctx.closePath();
      ctx.fillStyle = withAlpha(shade(theme.spike, -0.55), 0.95);
      ctx.fill();
      ctx.lineJoin = "round";
      ctx.strokeStyle = withAlpha(theme.spike, 0.25 + f.pulse * 0.25);
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.strokeStyle = theme.spike;
      ctx.lineWidth = 2.6;
      ctx.stroke();
      // A highlight along one edge.
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0 + 9, base + (o.down ? 2 : -2) + (o.down ? 4 : -4));
      ctx.lineTo(x0 + BLOCK / 2, tip + (o.down ? -8 : 8));
      ctx.stroke();
      break;
    }
    case "pad": {
      if (x0 < -BLOCK) return;
      const base = o.down ? py(o.y + 1) : py(o.y);
      const dirY = o.down ? 1 : -1;
      ctx.fillStyle = "#fde047";
      const slabY = o.down ? base : base - 9;
      roundRect(ctx, x0 + 3, slabY, BLOCK - 6, 9, 3);
      ctx.fill();
      ctx.strokeStyle = "rgba(253,224,71,0.35)";
      ctx.lineWidth = 7;
      ctx.stroke();
      // Little chevrons rising off it.
      ctx.strokeStyle = withAlpha("#fef08a", used ? 0.3 : 0.55 + 0.4 * Math.sin(f.time * 9));
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 2; i++) {
        const cy = base + dirY * (16 + i * 10 + ((f.time * 20) % 10));
        ctx.moveTo(x0 + 10, cy);
        ctx.lineTo(x0 + BLOCK / 2, cy + dirY * 6);
        ctx.lineTo(x0 + BLOCK - 10, cy);
      }
      ctx.stroke();
      break;
    }
    case "orb": {
      if (x0 < -BLOCK) return;
      const cx = x0 + BLOCK / 2;
      const cy = py(o.y) - BLOCK / 2;
      const r = BLOCK * 0.3 * (1 + f.pulse * 0.08);
      ctx.globalAlpha = used ? 0.3 : 1;
      ctx.strokeStyle = withAlpha("#fde047", 0.5);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 6 + 3 * Math.sin(f.time * 6), 0, Math.PI * 2);
      ctx.stroke();
      const g = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, r);
      g.addColorStop(0, "#fffbe0");
      g.addColorStop(1, "#facc15");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case "grav": {
      if (x0 < -BLOCK) return;
      const cx = x0 + BLOCK * 0.25;
      const cy = py(o.y + 1.5);
      const col = o.dir === -1 ? "#f472b6" : "#38bdf8";
      ctx.strokeStyle = withAlpha(col, 0.3 + f.pulse * 0.2);
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 10, BLOCK * 1.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.fillStyle = withAlpha(col, 0.18);
      ctx.fill();
      // Arrows showing where gravity will pull.
      ctx.fillStyle = withAlpha("#ffffff", 0.9);
      const dir = o.dir === -1 ? -1 : 1;
      for (const k of [-0.6, 0.6]) {
        const ay = cy + dir * (Math.sin(f.time * 6) * 4) + k * BLOCK * 0.5 * -dir;
        ctx.beginPath();
        ctx.moveTo(cx - 5, ay - dir * 4);
        ctx.lineTo(cx, ay + dir * 5);
        ctx.lineTo(cx + 5, ay - dir * 4);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "speed": {
      if (x0 < -BLOCK) return;
      const fast = o.m > 1;
      const slow = o.m < 1;
      const col = fast ? "#4ade80" : slow ? "#fb923c" : "#e5e7eb";
      const cy = GROUND_Y - BLOCK * 2.2;
      ctx.fillStyle = withAlpha(col, 0.1 + f.pulse * 0.06);
      ctx.fillRect(x0 - 4, CEIL_Y, 18, GROUND_Y - CEIL_Y);
      ctx.strokeStyle = col;
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      const sign = slow ? -1 : 1;
      for (let i = 0; i < 3; i++) {
        const ox = x0 + (i - 1) * 11 * sign;
        ctx.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(f.time * 8 - i * 0.9));
        ctx.beginPath();
        ctx.moveTo(ox - 5 * sign, cy - 22);
        ctx.lineTo(ox + 6 * sign, cy);
        ctx.lineTo(ox - 5 * sign, cy + 22);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      text2(ctx, `${o.m}x`, x0 + 5, cy - 40, col);
      break;
    }
  }
}

function text2(ctx: Ctx, s: string, x: number, y: number, color: string) {
  ctx.font = "800 14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

/** The finish line: a checkered gate across the whole height. */
export function drawFinish(ctx: Ctx, f: Frame, endX: number) {
  const x0 = px(f, endX);
  if (x0 > f.w + 40 || x0 < -80) return;
  const size = 19;
  for (let r = 0; r * size < GROUND_Y - CEIL_Y; r++) {
    for (let c = 0; c < 2; c++) {
      ctx.fillStyle = (r + c) % 2 ? "#ffffff" : "#111827";
      ctx.fillRect(x0 + c * size, CEIL_Y + r * size, size, size);
    }
  }
  const g = ctx.createLinearGradient(x0 - 80, 0, x0, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(1, `rgba(255,255,255,${0.2 + f.pulse * 0.2})`);
  ctx.fillStyle = g;
  ctx.fillRect(x0 - 80, CEIL_Y, 80, GROUND_Y - CEIL_Y);
}

// ---------------------------------------------------------------- the cube

export interface CubePose {
  /** Centre on screen. */
  x: number;
  y: number;
  rot: number;
  /** Vertical squash (1 = none) and the matching widening. */
  squash: number;
  /** Eyes look this way (-1 down, 1 up) with the jump. */
  look: number;
  alpha: number;
}

export function drawCube(ctx: Ctx, f: Frame, c: CubePose) {
  const { theme } = f;
  const s = BLOCK;
  ctx.save();
  ctx.globalAlpha = c.alpha;
  ctx.translate(c.x, c.y);
  ctx.rotate(c.rot);
  ctx.scale(1 / Math.sqrt(c.squash), c.squash);
  // Glow.
  ctx.strokeStyle = withAlpha(theme.accent2, 0.25 + f.pulse * 0.2);
  ctx.lineWidth = 10;
  ctx.strokeRect(-s / 2, -s / 2, s, s);
  const g = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
  g.addColorStop(0, theme.accent2);
  g.addColorStop(1, theme.accent);
  ctx.fillStyle = g;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.strokeRect(-s / 2 + 1.5, -s / 2 + 1.5, s - 3, s - 3);
  ctx.strokeStyle = withAlpha("#000000", 0.25);
  ctx.lineWidth = 2;
  ctx.strokeRect(-s / 2 + 8, -s / 2 + 8, s - 16, s - 16);
  // A face: two square eyes and a small mouth.
  ctx.fillStyle = "#0b1020";
  const ey = -5 - c.look * 2;
  ctx.fillRect(-11, ey, 7, 9);
  ctx.fillRect(4, ey, 7, 9);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-9, ey + 1, 2.5, 3);
  ctx.fillRect(6, ey + 1, 2.5, 3);
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(-7, 8, 14, 3);
  ctx.restore();
}

/** Where on screen (centre of the cube) a state's cube is. */
export function cubeScreen(f: Frame, x: number, y: number) {
  return { x: px(f, x) + BLOCK / 2, y: py(y) - BLOCK / 2 };
}
