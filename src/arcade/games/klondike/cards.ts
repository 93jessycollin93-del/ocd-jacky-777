// Card art drawn in code: suits from bezier paths, pips in the classic layouts, original court-card
// emblems and a lattice card back. Everything is rendered once per size into small sprites.
import { roundRect } from "../../kit/draw";
import { rankOf, suitOf } from "./logic";

const RED = "#d62839";
const BLACK = "#1b2233";
const FACE = "#fcfbf6";
const EDGE = "rgba(20,25,40,0.35)";
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const suitColor = (suit: number) => (suit === 1 || suit === 2 ? RED : BLACK);

/** Trace a suit symbol centred on (x, y), about `s` tall. Call fill() afterwards. */
export function suitPath(ctx: CanvasRenderingContext2D, suit: number, x: number, y: number, s: number) {
  const r = s / 2;
  ctx.beginPath();
  const heart = (flip: number) => {
    ctx.moveTo(x, y + flip * r * 0.95);
    ctx.bezierCurveTo(x - r * 1.15, y + flip * r * 0.1, x - r * 1.0, y - flip * r * 0.9, x - r * 0.5, y - flip * r * 0.9);
    ctx.bezierCurveTo(x - r * 0.2, y - flip * r * 0.9, x, y - flip * r * 0.68, x, y - flip * r * 0.4);
    ctx.bezierCurveTo(x, y - flip * r * 0.68, x + r * 0.2, y - flip * r * 0.9, x + r * 0.5, y - flip * r * 0.9);
    ctx.bezierCurveTo(x + r * 1.0, y - flip * r * 0.9, x + r * 1.15, y + flip * r * 0.1, x, y + flip * r * 0.95);
    ctx.closePath();
  };
  const stem = () => {
    ctx.moveTo(x - r * 0.08, y + r * 0.1);
    ctx.quadraticCurveTo(x - r * 0.05, y + r * 0.62, x - r * 0.5, y + r * 0.95);
    ctx.lineTo(x + r * 0.5, y + r * 0.95);
    ctx.quadraticCurveTo(x + r * 0.05, y + r * 0.62, x + r * 0.08, y + r * 0.1);
    ctx.closePath();
  };
  if (suit === 1) heart(1);
  else if (suit === 2) {
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + r * 0.2, y - r * 0.35, x + r * 0.72, y);
    ctx.quadraticCurveTo(x + r * 0.2, y + r * 0.35, x, y + r);
    ctx.quadraticCurveTo(x - r * 0.2, y + r * 0.35, x - r * 0.72, y);
    ctx.quadraticCurveTo(x - r * 0.2, y - r * 0.35, x, y - r);
    ctx.closePath();
  } else if (suit === 0) {
    // A heart upside down, then a stem.
    ctx.moveTo(x, y - r);
    ctx.bezierCurveTo(x - r * 1.15, y - r * 0.1, x - r * 1.05, y + r * 0.7, x - r * 0.5, y + r * 0.62);
    ctx.bezierCurveTo(x - r * 0.25, y + r * 0.6, x - r * 0.05, y + r * 0.42, x, y + r * 0.3);
    ctx.bezierCurveTo(x + r * 0.05, y + r * 0.42, x + r * 0.25, y + r * 0.6, x + r * 0.5, y + r * 0.62);
    ctx.bezierCurveTo(x + r * 1.05, y + r * 0.7, x + r * 1.15, y - r * 0.1, x, y - r);
    ctx.closePath();
    stem();
  } else {
    const c = r * 0.42;
    ctx.moveTo(x + c, y - r * 0.5);
    ctx.arc(x, y - r * 0.5, c, 0, Math.PI * 2);
    ctx.moveTo(x - r * 0.5 + c, y + r * 0.15);
    ctx.arc(x - r * 0.5, y + r * 0.15, c, 0, Math.PI * 2);
    ctx.moveTo(x + r * 0.5 + c, y + r * 0.15);
    ctx.arc(x + r * 0.5, y + r * 0.15, c, 0, Math.PI * 2);
    stem();
  }
}

const fillSuit = (ctx: CanvasRenderingContext2D, suit: number, x: number, y: number, s: number, flip = false) => {
  ctx.save();
  if (flip) {
    ctx.translate(x, y);
    ctx.rotate(Math.PI);
    ctx.translate(-x, -y);
  }
  ctx.fillStyle = suitColor(suit);
  suitPath(ctx, suit, x, y, s);
  ctx.fill("nonzero");
  ctx.restore();
};

// Pip positions as fractions of the pip area: [column -1..1, row 0..1].
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0.5]],
  2: [[0, 0], [0, 1]],
  3: [[0, 0], [0, 0.5], [0, 1]],
  4: [[-1, 0], [1, 0], [-1, 1], [1, 1]],
  5: [[-1, 0], [1, 0], [0, 0.5], [-1, 1], [1, 1]],
  6: [[-1, 0], [1, 0], [-1, 0.5], [1, 0.5], [-1, 1], [1, 1]],
  7: [[-1, 0], [1, 0], [0, 0.25], [-1, 0.5], [1, 0.5], [-1, 1], [1, 1]],
  8: [[-1, 0], [1, 0], [0, 0.25], [-1, 0.5], [1, 0.5], [0, 0.75], [-1, 1], [1, 1]],
  9: [[-1, 0], [1, 0], [-1, 1 / 3], [1, 1 / 3], [0, 0.5], [-1, 2 / 3], [1, 2 / 3], [-1, 1], [1, 1]],
  10: [[-1, 0], [1, 0], [0, 1 / 6], [-1, 1 / 3], [1, 1 / 3], [-1, 2 / 3], [1, 2 / 3], [0, 5 / 6], [-1, 1], [1, 1]],
};

/** One half of a court card: an emblem and a suit symbol, drawn inside the frame. */
function emblem(ctx: CanvasRenderingContext2D, rank: number, suit: number, cx: number, cy: number, u: number) {
  const col = suitColor(suit);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, u * 0.06);
  if (rank === 12) {
    // King: a three-point crown with jewels.
    ctx.beginPath();
    ctx.moveTo(-u * 0.62, u * 0.42);
    ctx.lineTo(-u * 0.72, -u * 0.38);
    ctx.lineTo(-u * 0.3, -u * 0.02);
    ctx.lineTo(0, -u * 0.62);
    ctx.lineTo(u * 0.3, -u * 0.02);
    ctx.lineTo(u * 0.72, -u * 0.38);
    ctx.lineTo(u * 0.62, u * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = FACE;
    for (const [jx, jy] of [[-0.3, 0.2], [0, 0.2], [0.3, 0.2]]) {
      ctx.beginPath();
      ctx.arc(jx * u, jy * u, u * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (rank === 11) {
    // Queen: a cut gem.
    ctx.beginPath();
    ctx.moveTo(0, -u * 0.62);
    ctx.lineTo(u * 0.56, -u * 0.14);
    ctx.lineTo(u * 0.32, u * 0.5);
    ctx.lineTo(-u * 0.32, u * 0.5);
    ctx.lineTo(-u * 0.56, -u * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = FACE;
    ctx.lineWidth = Math.max(1, u * 0.05);
    ctx.beginPath();
    ctx.moveTo(-u * 0.56, -u * 0.14);
    ctx.lineTo(u * 0.56, -u * 0.14);
    ctx.moveTo(-u * 0.2, -u * 0.14);
    ctx.lineTo(-u * 0.32, u * 0.5);
    ctx.moveTo(u * 0.2, -u * 0.14);
    ctx.lineTo(u * 0.32, u * 0.5);
    ctx.moveTo(-u * 0.2, -u * 0.14);
    ctx.lineTo(0, -u * 0.62);
    ctx.lineTo(u * 0.2, -u * 0.14);
    ctx.stroke();
  } else {
    // Jack: a shield with a cross.
    ctx.beginPath();
    ctx.moveTo(-u * 0.5, -u * 0.5);
    ctx.lineTo(u * 0.5, -u * 0.5);
    ctx.lineTo(u * 0.5, u * 0.08);
    ctx.quadraticCurveTo(u * 0.5, u * 0.55, 0, u * 0.72);
    ctx.quadraticCurveTo(-u * 0.5, u * 0.55, -u * 0.5, u * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = FACE;
    ctx.lineWidth = Math.max(1, u * 0.07);
    ctx.beginPath();
    ctx.moveTo(0, -u * 0.4);
    ctx.lineTo(0, u * 0.55);
    ctx.moveTo(-u * 0.38, -u * 0.08);
    ctx.lineTo(u * 0.38, -u * 0.08);
    ctx.stroke();
  }
  ctx.restore();
  fillSuit(ctx, suit, cx + u * 0.98, cy - u * 0.42, u * 0.5);
}

/** Draw a face-up card with its top-left corner at the origin. */
export function drawFace(ctx: CanvasRenderingContext2D, id: number, w: number, h: number) {
  const rank = rankOf(id);
  const suit = suitOf(id);
  const col = suitColor(suit);
  roundRect(ctx, 0.5, 0.5, w - 1, h - 1, w * 0.085);
  ctx.fillStyle = FACE;
  ctx.fill();
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Corner indexes (top-left, and the same turned upside down at bottom-right).
  const label = rank === 0 ? "A" : rank === 9 ? "10" : rank === 10 ? "J" : rank === 11 ? "Q" : rank === 12 ? "K" : String(rank + 1);
  const fs = w * (label === "10" ? 0.22 : 0.27);
  for (const turned of [false, true]) {
    ctx.save();
    if (turned) {
      ctx.translate(w, h);
      ctx.rotate(Math.PI);
    }
    ctx.fillStyle = col;
    ctx.font = `800 ${fs}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, w * 0.15, h * 0.095);
    fillSuit(ctx, suit, w * 0.15, h * 0.095 + fs * 0.9 + w * 0.02, w * 0.16);
    ctx.restore();
  }

  const px0 = w * 0.33;
  const px1 = w * 0.67;
  const py0 = h * 0.2;
  const py1 = h * 0.8;
  if (rank >= 10) {
    // Court card: a framed panel, the emblem and its mirror image.
    const fx = w * 0.27;
    const fy = h * 0.13;
    const fw = w * 0.5;
    const fh = h * 0.74;
    roundRect(ctx, fx, fy, fw, fh, w * 0.04);
    ctx.fillStyle = suit === 1 || suit === 2 ? "rgba(214,40,57,0.07)" : "rgba(27,34,51,0.07)";
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, w * 0.018);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx, fy + fh / 2);
    ctx.lineTo(fx + fw, fy + fh / 2);
    ctx.globalAlpha = 0.35;
    ctx.stroke();
    ctx.globalAlpha = 1;
    const u = w * 0.2;
    emblem(ctx, rank, suit, w * 0.5 - u * 0.2, h * 0.31, u);
    ctx.save();
    ctx.translate(w, h);
    ctx.rotate(Math.PI);
    emblem(ctx, rank, suit, w * 0.5 - u * 0.2, h * 0.31, u);
    ctx.restore();
    return;
  }
  const pips = PIPS[rank + 1];
  const size = rank === 0 ? w * 0.42 : w * 0.18;
  for (const [cx, cy] of pips) {
    const x = (px0 + px1) / 2 + cx * ((px1 - px0) / 2);
    const y = py0 + cy * (py1 - py0);
    fillSuit(ctx, suit, x, y, size, cy > 0.5);
  }
}

/** Draw a card back with its top-left corner at the origin. */
export function drawBack(ctx: CanvasRenderingContext2D, w: number, h: number) {
  roundRect(ctx, 0.5, 0.5, w - 1, h - 1, w * 0.085);
  ctx.fillStyle = FACE;
  ctx.fill();
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();
  const inset = w * 0.07;
  roundRect(ctx, inset, inset, w - inset * 2, h - inset * 2, w * 0.05);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#2747b8");
  g.addColorStop(1, "#14286e");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  roundRect(ctx, inset, inset, w - inset * 2, h - inset * 2, w * 0.05);
  ctx.clip();
  ctx.strokeStyle = "rgba(160,190,255,0.28)";
  ctx.lineWidth = Math.max(1, w * 0.018);
  const step = w * 0.16;
  ctx.beginPath();
  for (let d = -h; d < w + h; d += step) {
    ctx.moveTo(d, 0);
    ctx.lineTo(d + h, h);
    ctx.moveTo(d + h, 0);
    ctx.lineTo(d, h);
  }
  ctx.stroke();
  ctx.restore();
  // Centre medallion
  const cx = w / 2;
  const cy = h / 2;
  ctx.fillStyle = "#14286e";
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.21, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? w * 0.06 : w * 0.15;
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

/** Sprites for all 52 faces and the back, rebuilt when the card size or pixel density changes. */
export class SpriteCache {
  private key = "";
  private faces: (HTMLCanvasElement | null)[] = new Array(52).fill(null);
  private backSprite: HTMLCanvasElement | null = null;

  private ensure(w: number, h: number, dpr: number) {
    const key = `${Math.round(w * 10)}x${Math.round(h * 10)}@${dpr}`;
    if (key !== this.key) {
      this.key = key;
      this.faces = new Array(52).fill(null);
      this.backSprite = null;
    }
  }

  private make(w: number, h: number, dpr: number, paint: (ctx: CanvasRenderingContext2D) => void) {
    const cv = document.createElement("canvas");
    cv.width = Math.ceil(w * dpr);
    cv.height = Math.ceil(h * dpr);
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);
    paint(ctx);
    return cv;
  }

  face(id: number, w: number, h: number, dpr: number): HTMLCanvasElement {
    this.ensure(w, h, dpr);
    return (this.faces[id] ??= this.make(w, h, dpr, (ctx) => drawFace(ctx, id, w, h)));
  }

  back(w: number, h: number, dpr: number): HTMLCanvasElement {
    this.ensure(w, h, dpr);
    return (this.backSprite ??= this.make(w, h, dpr, (ctx) => drawBack(ctx, w, h)));
  }
}
