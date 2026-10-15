// Pre-rendered sprites for Blob Arena: shaded blobs per colour, pellets, and the spiky thorn.
import { shade } from "../../kit/draw";
import { PELLET_COLORS } from "./model";

const make = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

const cellCache = new Map<string, HTMLCanvasElement>();
const CELL = 128;
/** A glossy blob of one colour: the circle fills the whole sprite (outline included). */
export function cellSprite(color: string): HTMLCanvasElement {
  let c = cellCache.get(color);
  if (c) return c;
  c = make(CELL, CELL);
  const g = c.getContext("2d")!;
  const r = CELL / 2 - 1;
  const grad = g.createRadialGradient(CELL * 0.42, CELL * 0.38, r * 0.05, CELL / 2, CELL / 2, r);
  grad.addColorStop(0, shade(color, 0.22));
  grad.addColorStop(0.65, color);
  grad.addColorStop(1, shade(color, -0.1));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(CELL / 2, CELL / 2, r, 0, Math.PI * 2);
  g.fill();
  // Darker rim, like a membrane.
  g.strokeStyle = shade(color, -0.28);
  g.lineWidth = 7;
  g.beginPath();
  g.arc(CELL / 2, CELL / 2, r - 3.5, 0, Math.PI * 2);
  g.stroke();
  // Soft highlight.
  const hl = g.createRadialGradient(CELL * 0.36, CELL * 0.3, 0, CELL * 0.36, CELL * 0.3, CELL * 0.3);
  hl.addColorStop(0, "rgba(255,255,255,0.4)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = hl;
  g.fillRect(0, 0, CELL, CELL);
  cellCache.set(color, c);
  return c;
}

const pelletCache: HTMLCanvasElement[] = [];
export function pelletSprite(idx: number): HTMLCanvasElement {
  let c = pelletCache[idx];
  if (c) return c;
  const col = PELLET_COLORS[idx % PELLET_COLORS.length];
  c = make(32, 32);
  const g = c.getContext("2d")!;
  const glow = g.createRadialGradient(16, 16, 2, 16, 16, 16);
  glow.addColorStop(0, col);
  glow.addColorStop(0.45, col);
  glow.addColorStop(0.5, shade(col, -0.15));
  glow.addColorStop(0.62, "rgba(255,255,255,0.08)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, 32, 32);
  pelletCache[idx] = c;
  return c;
}

let thornCanvas: HTMLCanvasElement | null = null;
const THORN = 224;
/** A green spiky ball; the body circle is 80% of the sprite radius, spikes reach the edge. */
export function thornSprite(): HTMLCanvasElement {
  if (thornCanvas) return thornCanvas;
  const c = make(THORN, THORN);
  const g = c.getContext("2d")!;
  const mid = THORN / 2;
  const spikes = 22;
  g.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? mid - 2 : mid * 0.82;
    g.lineTo(mid + Math.cos(a) * rad, mid + Math.sin(a) * rad);
  }
  g.closePath();
  const grad = g.createRadialGradient(mid, mid, 4, mid, mid, mid);
  grad.addColorStop(0, "#86efac");
  grad.addColorStop(0.7, "#22c55e");
  grad.addColorStop(1, "#15803d");
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = "#14532d";
  g.lineWidth = 4;
  g.lineJoin = "round";
  g.stroke();
  const hl = g.createRadialGradient(mid * 0.8, mid * 0.75, 0, mid * 0.8, mid * 0.75, mid * 0.6);
  hl.addColorStop(0, "rgba(255,255,255,0.35)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = hl;
  g.fillRect(0, 0, THORN, THORN);
  thornCanvas = c;
  return c;
}
