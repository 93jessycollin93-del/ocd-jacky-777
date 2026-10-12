// Sugar Swap's art, all drawn in code. Each sweet is a different colour AND a different silhouette (so the
// board still reads for colour-blind players): gumdrop, toffee, lemon drop, jelly cube, gem and star.
// Pieces are painted once into small canvases (the Atlas) at the exact pixel size they'll be shown at,
// then stamped every frame, which keeps 64 animated sweets cheap on a phone.
import { roundRect } from "../../kit/draw";
import type { Piece } from "./logic";

type Ctx = CanvasRenderingContext2D;

export interface Pal {
  base: string;
  light: string;
  dark: string;
  name: string;
}

export const PALETTE: Pal[] = [
  { name: "ruby", base: "#ef4a5a", light: "#ffb3bb", dark: "#9f1239" },
  { name: "tangerine", base: "#fb923c", light: "#fed7aa", dark: "#b45309" },
  { name: "lemon", base: "#fcd34d", light: "#fff7b0", dark: "#b7791f" },
  { name: "lime", base: "#4ade80", light: "#c8f7d4", dark: "#15803d" },
  { name: "berry", base: "#4f8ff7", light: "#bcd7ff", dark: "#1d3f9c" },
  { name: "grape", base: "#b46cf5", light: "#e6ccff", dark: "#6b21a8" },
];

export const KIND_NAMES: Record<string, string> = {
  rowRocket: "Rocket",
  colRocket: "Rocket",
  bomb: "Burst",
  prism: "Prism",
};

const R = 0.4;

// ---------------------------------------------------------------------------------------- silhouettes

function roundedPoly(ctx: Ctx, pts: [number, number][], rad: number) {
  const n = pts.length;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[(i + n - 1) % n];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[(i + 1) % n];
    const mx = (px + cx) / 2;
    const my = (py + cy) / 2;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.lineTo(mx, my);
    ctx.arcTo(cx, cy, (cx + nx) / 2, (cy + ny) / 2, rad);
  }
  ctx.closePath();
}

function starPoints(outer: number, inner: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? inner : outer;
    pts.push([Math.cos(a) * r, Math.sin(a) * r + 0.015]);
  }
  return pts;
}

/** Trace the outline of sweet `color` around (0, 0). */
function outline(ctx: Ctx, color: number) {
  switch (color) {
    case 0: {
      // Gumdrop: a dome with a flat, slightly rounded base.
      const w = R * 1.02;
      const top = -R * 1.02;
      const bot = R * 0.86;
      ctx.beginPath();
      ctx.moveTo(-w, bot - R * 0.3);
      ctx.bezierCurveTo(-w * 1.02, top * 0.5, -w * 0.58, top, 0, top);
      ctx.bezierCurveTo(w * 0.58, top, w * 1.02, top * 0.5, w, bot - R * 0.3);
      ctx.quadraticCurveTo(w, bot, w - R * 0.34, bot);
      ctx.lineTo(-w + R * 0.34, bot);
      ctx.quadraticCurveTo(-w, bot, -w, bot - R * 0.3);
      ctx.closePath();
      break;
    }
    case 1: {
      // Wrapped toffee: a plump body with twisted wrapper ends.
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 0.8, R * 0.66, 0, 0, Math.PI * 2);
      for (const s of [-1, 1]) {
        ctx.moveTo(s * R * 0.62, -R * 0.12);
        ctx.lineTo(s * R * 1.2, -R * 0.55);
        ctx.lineTo(s * R * 1.06, -R * 0.2);
        ctx.lineTo(s * R * 1.22, 0);
        ctx.lineTo(s * R * 1.06, R * 0.2);
        ctx.lineTo(s * R * 1.2, R * 0.55);
        ctx.lineTo(s * R * 0.62, R * 0.12);
        ctx.closePath();
      }
      break;
    }
    case 2: {
      // Lemon drop: an oval with a nub at each end, tilted.
      ctx.beginPath();
      ctx.save();
      ctx.rotate(-0.5);
      ctx.ellipse(0, 0, R * 0.98, R * 0.76, 0, 0, Math.PI * 2);
      ctx.moveTo(R * 1.18, 0);
      ctx.arc(R * 1.0, 0, R * 0.2, 0, Math.PI * 2);
      ctx.moveTo(-R * 0.8, 0);
      ctx.arc(-R * 1.0, 0, R * 0.2, 0, Math.PI * 2);
      ctx.restore();
      break;
    }
    case 3: {
      // Jelly cube.
      const h = R * 0.88;
      roundRect(ctx, -h, -h, h * 2, h * 2, R * 0.34);
      break;
    }
    case 4:
      // Gem: a rounded diamond.
      roundedPoly(ctx, [[0, -R * 1.12], [R * 0.98, 0], [0, R * 1.12], [-R * 0.98, 0]], R * 0.3);
      break;
    default:
      roundedPoly(ctx, starPoints(R * 1.26, R * 0.66), R * 0.22);
  }
}

// ---------------------------------------------------------------------------------------- sweets

function bodyGradient(ctx: Ctx, pal: Pal) {
  const g = ctx.createRadialGradient(-R * 0.4, -R * 0.5, R * 0.05, 0, 0, R * 1.4);
  g.addColorStop(0, pal.light);
  g.addColorStop(0.35, pal.base);
  g.addColorStop(1, pal.dark);
  return g;
}

function gloss(ctx: Ctx, color: number) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  if (color === 3) roundRect(ctx, -R * 0.72, -R * 0.74, R * 0.8, R * 0.22, R * 0.11);
  else {
    ctx.beginPath();
    if (color === 0) ctx.ellipse(-R * 0.42, -R * 0.52, R * 0.3, R * 0.16, -0.6, 0, Math.PI * 2);
    else ctx.ellipse(-R * 0.36, -R * 0.42, R * 0.26, R * 0.14, -0.7, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(-R * 0.62, -R * 0.2, R * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function decorate(ctx: Ctx, color: number, pal: Pal) {
  ctx.save();
  switch (color) {
    case 0: {
      // Sugar crystals.
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      for (let i = 0; i < 16; i++) {
        const a = i * 2.4;
        const d = ((i * 37) % 10) / 10;
        const x = Math.cos(a) * R * (0.25 + d * 0.62);
        const y = -R * 0.1 + Math.sin(a) * R * (0.2 + d * 0.62);
        ctx.fillRect(x - R * 0.025, y - R * 0.025, R * 0.05, R * 0.05);
      }
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = R * 0.08;
      ctx.beginPath();
      ctx.moveTo(-R, R * 0.58);
      ctx.lineTo(R, R * 0.58);
      ctx.stroke();
      break;
    }
    case 1: {
      // Wrapper stripes and a lighter twist.
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.save();
      ctx.rotate(-0.5);
      ctx.fillRect(-R * 0.2, -R, R * 0.22, R * 2);
      ctx.fillRect(R * 0.18, -R, R * 0.12, R * 2);
      ctx.restore();
      ctx.strokeStyle = "rgba(120,53,15,0.35)";
      ctx.lineWidth = R * 0.05;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * R * 0.7, -R * 0.1);
        ctx.lineTo(s * R * 1.15, -R * 0.1);
        ctx.moveTo(s * R * 0.7, R * 0.1);
        ctx.lineTo(s * R * 1.15, R * 0.1);
        ctx.stroke();
      }
      break;
    }
    case 2: {
      // Zest dimples and a little leaf-curl highlight.
      ctx.fillStyle = "rgba(180,120,0,0.28)";
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.arc(Math.cos(i * 2.1) * R * 0.5, Math.sin(i * 1.7) * R * 0.38, R * 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = R * 0.07;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.62, 0.6, 1.5);
      ctx.stroke();
      break;
    }
    case 3: {
      // Bevel: a lighter inner tile.
      const h = R * 0.62;
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      roundRect(ctx, -h, -h, h * 2, h * 2, R * 0.2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,60,20,0.25)";
      ctx.lineWidth = R * 0.07;
      ctx.stroke();
      break;
    }
    case 4: {
      // Facets.
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = R * 0.05;
      ctx.beginPath();
      ctx.moveTo(-R * 0.98, 0);
      ctx.lineTo(R * 0.98, 0);
      ctx.moveTo(0, -R * 1.12);
      ctx.lineTo(-R * 0.3, 0);
      ctx.lineTo(0, R * 1.12);
      ctx.moveTo(0, -R * 1.12);
      ctx.lineTo(R * 0.3, 0);
      ctx.lineTo(0, R * 1.12);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.moveTo(0, -R * 1.12);
      ctx.lineTo(-R * 0.98, 0);
      ctx.lineTo(-R * 0.3, 0);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default: {
      // Inner star glow.
      roundedPoly(ctx, starPoints(R * 0.74, R * 0.4), R * 0.1);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fill();
      ctx.strokeStyle = pal.dark;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = R * 0.05;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSweet(ctx: Ctx, color: number) {
  const pal = PALETTE[color % PALETTE.length];
  // Soft drop shadow.
  ctx.save();
  ctx.translate(0, R * 0.14);
  outline(ctx, color);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();
  ctx.restore();
  outline(ctx, color);
  ctx.fillStyle = bodyGradient(ctx, pal);
  ctx.fill();
  ctx.save();
  outline(ctx, color);
  ctx.clip();
  decorate(ctx, color, pal);
  // Rim shading.
  ctx.lineWidth = R * 0.16;
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  outline(ctx, color);
  ctx.stroke();
  ctx.restore();
  outline(ctx, color);
  ctx.lineWidth = R * 0.05;
  ctx.strokeStyle = pal.dark;
  ctx.stroke();
  gloss(ctx, color);
}

// ---------------------------------------------------------------------------------------- specials

function drawRocket(ctx: Ctx, color: number, vertical: boolean) {
  drawSweet(ctx, color);
  // Two white bands run the way the rocket blasts, with arrow heads at the centre.
  ctx.save();
  outline(ctx, color);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  if (vertical) {
    ctx.fillRect(-R * 0.52, -R * 1.3, R * 0.2, R * 2.6);
    ctx.fillRect(R * 0.32, -R * 1.3, R * 0.2, R * 2.6);
  } else {
    ctx.fillRect(-R * 1.3, -R * 0.52, R * 2.6, R * 0.2);
    ctx.fillRect(-R * 1.3, R * 0.32, R * 2.6, R * 0.2);
  }
  ctx.restore();
  // Arrow heads showing which way it goes.
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = R * 0.04;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(0, s * R * 0.62);
      ctx.lineTo(-R * 0.24, s * R * 0.2);
      ctx.lineTo(R * 0.24, s * R * 0.2);
    } else {
      ctx.moveTo(s * R * 0.62, 0);
      ctx.lineTo(s * R * 0.2, -R * 0.24);
      ctx.lineTo(s * R * 0.2, R * 0.24);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawBurst(ctx: Ctx, color: number) {
  const pal = PALETTE[color % PALETTE.length];
  // Sun rays behind the sweet.
  ctx.save();
  ctx.fillStyle = pal.light;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 ? R * 1.15 : R * 1.5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawSweet(ctx, color);
  // A bright core, like a lit fuse.
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.62);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.5, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.dark;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? R * 0.1 : R * 0.3;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

const FACETS = ["#fda4af", "#fdba74", "#fde68a", "#86efac", "#7dd3fc", "#c4b5fd"];

function drawPrism(ctx: Ctx) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    pts.push([Math.cos(a) * R * 1.12, Math.sin(a) * R * 1.12]);
  }
  ctx.save();
  ctx.translate(0, R * 0.12);
  roundedPoly(ctx, pts, R * 0.2);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();
  ctx.restore();
  for (let i = 0; i < 6; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % 6];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, (ax + bx) / 2, (ay + by) / 2);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, FACETS[i]);
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = R * 0.05;
  ctx.beginPath();
  for (const [x, y] of pts) {
    ctx.moveTo(0, 0);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  roundedPoly(ctx, pts, R * 0.2);
  ctx.lineWidth = R * 0.09;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  ctx.lineWidth = R * 0.03;
  ctx.strokeStyle = "rgba(80,40,140,0.5)";
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.ellipse(-R * 0.4, -R * 0.55, R * 0.2, R * 0.1, -0.7, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------------------- ingredients

function drawIngredient(ctx: Ctx, which: number) {
  // A cream plate so ingredients never look like sweets.
  ctx.save();
  ctx.translate(0, R * 0.1);
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.08, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();
  ctx.restore();
  const g = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R * 1.2);
  g.addColorStop(0, "#fffdf5");
  g.addColorStop(1, "#f3dfb0");
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.08, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = R * 0.12;
  ctx.strokeStyle = "#d19a2a";
  ctx.stroke();
  ctx.lineWidth = R * 0.04;
  ctx.strokeStyle = "#fff3c4";
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.9, 0, Math.PI * 2);
  ctx.stroke();

  if (which === 0) {
    // Hazelnut.
    const ng = ctx.createRadialGradient(-R * 0.2, -R * 0.1, R * 0.05, 0, 0, R * 0.8);
    ng.addColorStop(0, "#d9a066");
    ng.addColorStop(1, "#7c4a1e");
    ctx.beginPath();
    ctx.ellipse(0, R * 0.12, R * 0.52, R * 0.56, 0, 0, Math.PI * 2);
    ctx.fillStyle = ng;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -R * 0.3, R * 0.56, R * 0.3, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(R * 0.56, -R * 0.26);
    ctx.quadraticCurveTo(0, -R * 0.06, -R * 0.56, -R * 0.26);
    ctx.closePath();
    ctx.fillStyle = "#5b3513";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,230,190,0.5)";
    ctx.lineWidth = R * 0.04;
    ctx.beginPath();
    ctx.arc(0, R * 0.2, R * 0.34, 0.3, 1.4);
    ctx.stroke();
  } else {
    // Cherry pair.
    ctx.strokeStyle = "#3f7d2a";
    ctx.lineWidth = R * 0.07;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-R * 0.25, R * 0.12);
    ctx.quadraticCurveTo(-R * 0.1, -R * 0.45, R * 0.12, -R * 0.62);
    ctx.moveTo(R * 0.3, R * 0.2);
    ctx.quadraticCurveTo(R * 0.25, -R * 0.4, R * 0.12, -R * 0.62);
    ctx.stroke();
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.ellipse(R * 0.32, -R * 0.62, R * 0.24, R * 0.1, -0.35, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, y] of [[-R * 0.25, R * 0.32], [R * 0.3, R * 0.38]]) {
      const cg = ctx.createRadialGradient(x - R * 0.1, y - R * 0.12, R * 0.02, x, y, R * 0.34);
      cg.addColorStop(0, "#ff9aa5");
      cg.addColorStop(0.45, "#e11d48");
      cg.addColorStop(1, "#881337");
      ctx.beginPath();
      ctx.arc(x, y, R * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = cg;
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(x - R * 0.1, y - R * 0.1, R * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------------------------- frosting

function drawFrosting(ctx: Ctx, layers: number) {
  const h = 0.47;
  roundRect(ctx, -h, -h, h * 2, h * 2, 0.12);
  ctx.fillStyle = layers > 1 ? "rgba(255,255,255,0.86)" : "rgba(255,236,248,0.6)";
  ctx.fill();
  ctx.lineWidth = layers > 1 ? 0.06 : 0.035;
  ctx.strokeStyle = layers > 1 ? "#fff" : "rgba(255,255,255,0.9)";
  ctx.stroke();
  // Drips along the top edge.
  ctx.fillStyle = layers > 1 ? "#ffffff" : "rgba(255,246,252,0.9)";
  for (let i = 0; i < 4; i++) {
    const x = -h + 0.14 + i * 0.24;
    roundRect(ctx, x - 0.07, -h - 0.01, 0.14, 0.1 + (i % 2) * 0.07, 0.06);
    ctx.fill();
  }
  if (layers > 1) {
    roundRect(ctx, -h + 0.1, -h + 0.1, (h - 0.1) * 2, (h - 0.1) * 2, 0.08);
    ctx.fillStyle = "rgba(251,207,232,0.55)";
    ctx.fill();
    ctx.strokeStyle = "rgba(244,114,182,0.7)";
    ctx.lineWidth = 0.03;
    ctx.stroke();
  }
  const sprinkle = ["#f472b6", "#60a5fa", "#fbbf24", "#34d399"];
  for (let i = 0; i < (layers > 1 ? 9 : 5); i++) {
    ctx.save();
    ctx.translate(-0.3 + ((i * 53) % 60) / 100, -0.3 + ((i * 37) % 60) / 100);
    ctx.rotate(i * 1.3);
    ctx.fillStyle = sprinkle[i % 4];
    ctx.fillRect(-0.05, -0.014, 0.1, 0.028);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------- atlas

/**
 * One painted-once sprite sheet. Every sweet, special, ingredient and frosting tile is drawn into a
 * grid of square slots, each 1.6 cells wide and centred on the piece, so a frame is a few dozen
 * drawImage calls from a single texture.
 */
export class Atlas {
  px = 0;
  readonly span = 1.6;
  sheet: HTMLCanvasElement | null = null;
  private slot = 0;
  private slots = new Map<string, number>();
  private static COLS = 6;

  private static keys(): string[] {
    const keys: string[] = [];
    for (const kind of ["normal", "rowRocket", "colRocket", "bomb"]) for (let c = 0; c < 6; c++) keys.push(`${kind}:${c}`);
    keys.push("prism:0", "ingredient:0", "ingredient:1", "frost:1", "frost:2");
    return keys;
  }

  /** Set the on-screen size of one cell in device pixels; repaints the sheet if it changed. */
  setSize(cellPx: number) {
    const q = Math.max(16, Math.round(cellPx / 4) * 4);
    if (q === this.px && this.sheet) return;
    this.px = q;
    this.slot = Math.ceil(q * this.span);
    const keys = Atlas.keys();
    const cols = Atlas.COLS;
    const rows = Math.ceil(keys.length / cols);
    const cv = this.sheet ?? document.createElement("canvas");
    cv.width = this.slot * cols;
    cv.height = this.slot * rows;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, cv.width, cv.height);
    this.slots.clear();
    keys.forEach((key, i) => {
      this.slots.set(key, i);
      const [kind, num] = key.split(":");
      const n = Number(num);
      ctx.save();
      ctx.translate((i % cols) * this.slot + this.slot / 2, Math.floor(i / cols) * this.slot + this.slot / 2);
      ctx.scale(q, q);
      switch (kind) {
        case "rowRocket": drawRocket(ctx, n, false); break;
        case "colRocket": drawRocket(ctx, n, true); break;
        case "bomb": drawBurst(ctx, n); break;
        case "prism": drawPrism(ctx); break;
        case "ingredient": drawIngredient(ctx, n); break;
        case "frost": drawFrosting(ctx, n); break;
        default: drawSweet(ctx, n);
      }
      ctx.restore();
    });
    this.sheet = cv;
  }

  /** Source rectangle of a piece's slot in the sheet. */
  pieceRect(p: Piece): [number, number, number, number] {
    return this.rect(`${p.kind}:${p.kind === "prism" ? 0 : p.color}`);
  }

  frostingRect(layers: number): [number, number, number, number] {
    return this.rect(`frost:${layers}`);
  }

  private rect(key: string): [number, number, number, number] {
    const i = this.slots.get(key) ?? 0;
    return [(i % Atlas.COLS) * this.slot, Math.floor(i / Atlas.COLS) * this.slot, this.slot, this.slot];
  }
}

/** The colour of a piece for particles and floaters. */
export function pieceColor(p: Piece): string {
  if (p.kind === "prism") return "#e9d5ff";
  if (p.kind === "ingredient") return p.color === 0 ? "#a16207" : "#e11d48";
  return PALETTE[p.color % PALETTE.length].base;
}

export function pieceLight(p: Piece): string {
  if (p.kind === "prism" || p.kind === "ingredient") return "#ffffff";
  return PALETTE[p.color % PALETTE.length].light;
}
