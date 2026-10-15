// Canvas drawing helpers shared by Arcade games: shapes, text, easing, colour, particles, shake.

export type Ctx = CanvasRenderingContext2D;

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function fillRoundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export interface TextOpts {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  weight?: number | string;
  font?: string;
  shadow?: string;
  stroke?: string;
  strokeWidth?: number;
}

export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
export const DISPLAY_FONT = "'Arial Black', 'Trebuchet MS', system-ui, sans-serif";

export function text(ctx: Ctx, s: string, x: number, y: number, o: TextOpts = {}) {
  ctx.save();
  ctx.font = `${o.weight ?? 700} ${o.size ?? 16}px ${o.font ?? FONT}`;
  ctx.textAlign = o.align ?? "center";
  ctx.textBaseline = o.baseline ?? "middle";
  if (o.shadow) {
    ctx.shadowColor = o.shadow;
    ctx.shadowBlur = 8;
  }
  if (o.stroke) {
    ctx.lineWidth = o.strokeWidth ?? 4;
    ctx.strokeStyle = o.stroke;
    ctx.lineJoin = "round";
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = o.color ?? "#fff";
  ctx.fillText(s, x, y);
  ctx.restore();
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Frame-rate independent smoothing toward a target. */
export const damp = (a: number, b: number, rate: number, dt: number) => lerp(a, b, 1 - Math.exp(-rate * dt));
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const easeOutBack = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
export const easeOutElastic = (t: number) =>
  t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

/** Lighten (amount > 0) or darken (< 0) a #rrggbb colour. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * 255)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// ---------------------------------------------------------------- particles

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
  drag: number;
  shape: "circle" | "square" | "spark";
}

/** A pool of short-lived particles: bursts, sparks, confetti. */
export class Particles {
  items: Particle[] = [];
  constructor(private cap = 600) {}

  burst(
    x: number, y: number, count: number,
    o: { color?: string | string[]; speed?: number; size?: number; life?: number; gravity?: number; drag?: number; spread?: number; angle?: number; shape?: Particle["shape"] } = {},
  ) {
    for (let i = 0; i < count; i++) {
      if (this.items.length >= this.cap) this.items.shift();
      const a = (o.angle ?? 0) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
      const s = (o.speed ?? 160) * (0.35 + Math.random() * 0.8);
      const colors = Array.isArray(o.color) ? o.color : [o.color ?? "#fff"];
      const life = (o.life ?? 0.7) * (0.6 + Math.random() * 0.6);
      this.items.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life,
        size: (o.size ?? 4) * (0.6 + Math.random() * 0.8), color: colors[i % colors.length],
        gravity: o.gravity ?? 300, drag: o.drag ?? 1.5, shape: o.shape ?? "circle",
      });
    }
  }

  update(dt: number) {
    for (const p of this.items) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.items = this.items.filter((p) => p.life > 0);
  }

  draw(ctx: Ctx) {
    for (const p of this.items) {
      const k = Math.max(0, p.life / p.max);
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.fillStyle = p.color;
      const s = p.size * (0.4 + 0.6 * k);
      if (p.shape === "square") ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      else if (p.shape === "spark") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, s / 2);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.items = [];
  }
}

/** Screen shake: add trauma on impacts, read an offset each frame. */
export class Shake {
  trauma = 0;
  add(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount);
  }
  update(dt: number) {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
  }
  offset(max = 10): [number, number] {
    const k = this.trauma * this.trauma * max;
    return [(Math.random() * 2 - 1) * k, (Math.random() * 2 - 1) * k];
  }
}

/** Floating "+100" style labels. */
export class Floaters {
  items: { x: number; y: number; text: string; color: string; life: number; size: number }[] = [];
  add(x: number, y: number, s: string, color = "#fde047", size = 18) {
    this.items.push({ x, y, text: s, color, life: 1, size });
  }
  update(dt: number) {
    for (const f of this.items) {
      f.life -= dt;
      f.y -= 40 * dt;
    }
    this.items = this.items.filter((f) => f.life > 0);
  }
  draw(ctx: Ctx) {
    for (const f of this.items) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      text(ctx, f.text, f.x, f.y, { size: f.size, color: f.color, stroke: "rgba(0,0,0,0.6)", strokeWidth: 3, weight: 900 });
    }
    ctx.globalAlpha = 1;
  }
}
