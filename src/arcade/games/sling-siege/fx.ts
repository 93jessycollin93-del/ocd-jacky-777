// World-space effects for Sling Siege: wood and stone chips, glass shards, dust puffs, explosion rings,
// confetti and score popups. Positions and sizes are in metres; nothing here allocates in the frame loop
// once the pool is warm.
import type { MatId } from "./materials";

type Kind = "chip" | "shard" | "dust" | "spark" | "ring" | "fire" | "confetti" | "star";

interface Bit {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  life: number;
  max: number;
  size: number;
  /** Dust and rings grow by this much (metres) over their life. */
  grow: number;
  gravity: number;
  drag: number;
  color: string;
  alive: boolean;
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  max: number;
  size: number;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export const CHIP_COLORS: Record<MatId, string[]> = {
  wood: ["#c08a4b", "#a16a2e", "#e0b072", "#7c4a1d"],
  stone: ["#9ca3af", "#6b7280", "#d1d5db", "#4b5563"],
  glass: ["#bae6fd", "#e0f2fe", "#ffffff", "#7dd3fc"],
  ice: ["#bfe9ff", "#e0f7ff", "#7dd3fc", "#ffffff"],
  tnt: ["#dc2626", "#f87171", "#7f1d1d", "#fbbf24"],
  rock: ["#78716c", "#a8a29e"],
};

export class Effects {
  bits: Bit[] = [];
  popups: Popup[] = [];
  private cap = 700;

  private spawn(kind: Kind, x: number, y: number, vx: number, vy: number, size: number, life: number, color: string, o: Partial<Bit> = {}) {
    let b: Bit | undefined;
    if (this.bits.length >= this.cap) {
      // Recycle the oldest (the front) instead of growing.
      b = this.bits.shift();
    }
    if (!b) b = { kind, x, y, vx, vy, rot: 0, vr: 0, life, max: life, size, grow: 0, gravity: 0, drag: 0, color, alive: true };
    b.kind = kind;
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.rot = o.rot ?? Math.random() * 6.28;
    b.vr = o.vr ?? 0;
    b.life = life;
    b.max = life;
    b.size = size;
    b.grow = o.grow ?? 0;
    b.gravity = o.gravity ?? 0;
    b.drag = o.drag ?? 0;
    b.color = color;
    b.alive = true;
    this.bits.push(b);
  }

  clear() {
    this.bits.length = 0;
    this.popups.length = 0;
  }

  /** A pile of chips from a broken block. */
  debris(mat: MatId, x: number, y: number, w: number, h: number, count?: number, power = 1) {
    const colors = CHIP_COLORS[mat];
    const n = count ?? Math.min(22, 6 + Math.round((w * h) * 6));
    const glassy = mat === "glass" || mat === "ice";
    for (let i = 0; i < n; i++) {
      const px = x + rnd(-w / 2, w / 2) * 0.8;
      const py = y + rnd(-h / 2, h / 2) * 0.8;
      const a = Math.random() * Math.PI * 2;
      const sp = rnd(2, 8) * power;
      this.spawn(glassy ? "shard" : "chip", px, py, Math.cos(a) * sp, Math.sin(a) * sp - 3, rnd(0.1, mat === "stone" ? 0.32 : 0.26), rnd(0.7, 1.4),
        colors[i % colors.length], { vr: rnd(-12, 12), gravity: 16, drag: 0.4 });
    }
    this.dust(x, y, Math.max(w, h) * 0.6, mat === "stone" ? "#d6d3d1" : mat === "glass" ? "#e0f2fe" : "#e7d5b8", 3);
  }

  /** Soft puffs that swell and fade. */
  dust(x: number, y: number, r: number, color = "#e7d5b8", count = 4) {
    for (let i = 0; i < count; i++) {
      this.spawn("dust", x + rnd(-r, r) * 0.6, y + rnd(-r, r) * 0.5, rnd(-1.2, 1.2), rnd(-1.8, -0.2), rnd(0.25, 0.5) * (0.6 + r * 0.4), rnd(0.5, 0.9), color, {
        grow: rnd(0.5, 1.1) * (0.6 + r * 0.5), drag: 2.5, gravity: -0.5,
      });
    }
  }

  /** Small sparks where a critter smacks something. */
  impact(x: number, y: number, strength: number, color: string) {
    const n = Math.min(10, 2 + Math.round(strength));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rnd(2, 6 + strength * 0.4);
      this.spawn("spark", x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.07, 0.14), rnd(0.2, 0.45), color, { gravity: 10, drag: 1 });
    }
    if (strength > 4) this.dust(x, y, 0.5, "#e7d5b8", 2);
  }

  boom(x: number, y: number, r: number) {
    this.spawn("ring", x, y, 0, 0, 0.4, 0.45, "#fde68a", { grow: r * 1.15 });
    this.spawn("ring", x, y, 0, 0, 0.2, 0.3, "#ffffff", { grow: r * 0.8 });
    for (let i = 0; i < 7; i++) {
      this.spawn("fire", x + rnd(-0.5, 0.5), y + rnd(-0.5, 0.5), rnd(-2, 2), rnd(-2.5, 0.5), rnd(0.6, 1.1), rnd(0.35, 0.6), i % 2 ? "#fb923c" : "#fde047", {
        grow: rnd(0.8, 1.6), drag: 2,
      });
    }
    for (let i = 0; i < 10; i++) {
      this.spawn("dust", x + rnd(-1, 1), y + rnd(-1, 0.5), rnd(-3, 3), rnd(-4, -0.5), rnd(0.5, 0.9), rnd(0.9, 1.6), i % 2 ? "#57534e" : "#a8a29e", { grow: rnd(0.8, 1.6), drag: 1.5, gravity: -0.8 });
    }
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rnd(5, 14);
      this.spawn("spark", x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.08, 0.16), rnd(0.35, 0.7), i % 2 ? "#fbbf24" : "#ef4444", { gravity: 12, drag: 1 });
    }
  }

  /** Green splat and a puff when a grumbler pops. */
  poof(x: number, y: number, size: number) {
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rnd(1.5, 5);
      this.spawn("dust", x, y, Math.cos(a) * sp, Math.sin(a) * sp - 1, rnd(0.25, 0.45) * size, rnd(0.5, 0.9), i % 2 ? "#86efac" : "#f0fdf4", { grow: rnd(0.4, 0.9), drag: 3 });
    }
    for (let i = 0; i < 6; i++) {
      this.spawn("star", x, y, rnd(-4, 4), rnd(-7, -2), rnd(0.18, 0.3), rnd(0.6, 1), "#fde047", { vr: rnd(-8, 8), gravity: 14, drag: 0.5 });
    }
  }

  /** Smoke when a critter calls it a day. */
  puff(x: number, y: number) {
    this.dust(x, y, 0.5, "#f1f5f9", 5);
  }

  confetti(x: number, y: number, count = 40) {
    const colors = ["#f97316", "#fde047", "#4ade80", "#38bdf8", "#f472b6", "#ffffff"];
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + rnd(-1.1, 1.1);
      const sp = rnd(6, 16);
      this.spawn("confetti", x + rnd(-1, 1), y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.14, 0.26), rnd(1.2, 2.2), colors[i % colors.length], {
        vr: rnd(-10, 10), gravity: 9, drag: 1.2,
      });
    }
  }

  popup(x: number, y: number, text: string, color = "#fde047", size = 20) {
    this.popups.push({ x, y, text, color, life: 1.15, max: 1.15, size });
  }

  update(dt: number) {
    const bits = this.bits;
    let w = 0;
    for (let i = 0; i < bits.length; i++) {
      const b = bits[i];
      b.life -= dt;
      if (b.life <= 0) continue;
      b.vy += b.gravity * dt;
      if (b.drag > 0) {
        const d = Math.exp(-b.drag * dt);
        b.vx *= d;
        b.vy *= d;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.vr * dt;
      b.size += b.grow * dt;
      // Chips bounce off the ground once.
      if (b.y > -0.05 && (b.kind === "chip" || b.kind === "shard" || b.kind === "confetti") && b.vy > 0 && b.gravity > 0) {
        b.y = -0.05;
        b.vy *= -0.3;
        b.vx *= 0.6;
        b.vr *= 0.5;
      }
      bits[w++] = b;
    }
    bits.length = w;
    const ps = this.popups;
    let pw = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.y -= dt * 1.6;
      ps[pw++] = p;
    }
    ps.length = pw;
  }

  draw(ctx: CanvasRenderingContext2D, z: number) {
    for (const b of this.bits) {
      const k = Math.max(0, b.life / b.max);
      switch (b.kind) {
        case "dust": {
          ctx.globalAlpha = Math.min(0.55, k * 0.7);
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size, 0, 6.2832);
          ctx.fill();
          break;
        }
        case "fire": {
          ctx.globalAlpha = Math.min(1, k * 1.6);
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size, 0, 6.2832);
          ctx.fill();
          break;
        }
        case "ring": {
          ctx.globalAlpha = k * 0.9;
          ctx.strokeStyle = b.color;
          ctx.lineWidth = Math.max(0.1, b.size * 0.22 * k);
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size, 0, 6.2832);
          ctx.stroke();
          break;
        }
        case "spark": {
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.strokeStyle = b.color;
          ctx.lineWidth = Math.max(b.size, 1.5 / z);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - b.vx * 0.04, b.y - b.vy * 0.04);
          ctx.stroke();
          break;
        }
        case "star": {
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.fillStyle = b.color;
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rot);
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const r = i % 2 ? b.size * 0.45 : b.size;
            const a = (i / 8) * 6.2832;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        }
        default: {
          // chip, shard, confetti: small rotated bits
          ctx.globalAlpha = Math.min(1, k * 2.2);
          ctx.fillStyle = b.color;
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rot);
          if (b.kind === "shard") {
            ctx.beginPath();
            ctx.moveTo(-b.size, b.size * 0.5);
            ctx.lineTo(b.size, 0);
            ctx.lineTo(-b.size * 0.2, -b.size * 0.8);
            ctx.closePath();
            ctx.fill();
          } else if (b.kind === "confetti") {
            ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2);
          } else {
            ctx.fillRect(-b.size / 2, -b.size / 3, b.size, b.size * 0.66);
          }
          ctx.restore();
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}
