// Pre-rendered sprites for Slither Arena: worm segments per skin, glowing orbs, the hexagon floor tile.
// Everything is drawn once on small offscreen canvases and then blitted, so a frame never builds gradients.
import { shade } from "../../kit/draw";
import { ORB_COLORS } from "./model";

export interface Skin {
  name: string;
  colors: string[];
  /** Hard stripes instead of a smooth blend. */
  band?: boolean;
}

export const SKINS: Skin[] = [
  { name: "Neon", colors: ["#22d3ee", "#e879f9"], band: true },
  { name: "Ember", colors: ["#f97316", "#fde047"] },
  { name: "Orchid", colors: ["#d946ef", "#6366f1"] },
  { name: "Lagoon", colors: ["#06b6d4", "#34d399"] },
  { name: "Cherry", colors: ["#ef4444", "#fda4af"], band: true },
  { name: "Citrus", colors: ["#a3e635", "#facc15"], band: true },
  { name: "Ocean", colors: ["#2563eb", "#22d3ee"] },
  { name: "Candy", colors: ["#ec4899", "#fdf2f8"], band: true },
  { name: "Jungle", colors: ["#16a34a", "#bef264", "#166534"] },
  { name: "Dusk", colors: ["#7c3aed", "#f472b6", "#fb923c"] },
  { name: "Frost", colors: ["#e0f2fe", "#38bdf8"] },
  { name: "Mango", colors: ["#f59e0b", "#ef4444"] },
  { name: "Mint", colors: ["#5eead4", "#134e4a"], band: true },
  { name: "Gold", colors: ["#facc15", "#b45309"] },
];

export const RAMP = 16;

const hex2 = (v: number) => Math.round(v).toString(16).padStart(2, "0");
function mix(a: string, b: string, t: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => ((na >> sh) & 255) + (((nb >> sh) & 255) - ((na >> sh) & 255)) * t;
  return `#${hex2(ch(16))}${hex2(ch(8))}${hex2(ch(0))}`;
}

/** The colour of the k-th step (0..RAMP-1) of a skin's repeating stripe. */
export function rampColor(skin: Skin, k: number): string {
  const c = skin.colors;
  const u = (k / RAMP) * c.length; // position around the colour cycle
  const i = Math.floor(u) % c.length;
  const f = u - Math.floor(u);
  const a = c[i];
  const b = c[(i + 1) % c.length];
  if (skin.band) {
    // Mostly flat colour with a short blend at each edge.
    const t = f < 0.7 ? 0 : (f - 0.7) / 0.3;
    return mix(a, b, t * t * (3 - 2 * t));
  }
  return mix(a, b, f * f * (3 - 2 * f));
}

const make = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

const SEG = 96;
const segCache = new Map<number, HTMLCanvasElement>();

/** A shaded ball of one stripe colour. Radius in the sprite is SEG/2 - 2. */
export function segmentSprite(skin: number, step: number): HTMLCanvasElement {
  const key = skin * 64 + step;
  let c = segCache.get(key);
  if (c) return c;
  c = make(SEG, SEG);
  const g = c.getContext("2d")!;
  const base = rampColor(SKINS[skin], step);
  const r = SEG / 2 - 2;
  const grad = g.createRadialGradient(SEG * 0.4, SEG * 0.36, r * 0.1, SEG / 2, SEG / 2, r);
  grad.addColorStop(0, shade(base, 0.28));
  grad.addColorStop(0.55, base);
  grad.addColorStop(1, shade(base, -0.3));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(SEG / 2, SEG / 2, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.28)";
  g.lineWidth = 2.5;
  g.stroke();
  segCache.set(key, c);
  return c;
}
export const SEG_HALF = SEG / 2 - 2;

const glowCache = new Map<string, HTMLCanvasElement>();
/** A soft round glow of one colour (used for boost auras and orbs). */
export function glowSprite(color: string, core = 0.22): HTMLCanvasElement {
  const key = `${color}:${core}`;
  let c = glowCache.get(key);
  if (c) return c;
  c = make(64, 64);
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(core, color);
  grad.addColorStop(Math.min(0.95, core + 0.25), hexA(color, 0.4));
  grad.addColorStop(1, hexA(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  glowCache.set(key, c);
  return c;
}
function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const orbGlow = (colorIdx: number) => glowSprite(ORB_COLORS[colorIdx % ORB_COLORS.length], 0.2);
export const auraGlow = (skin: number) => glowSprite(SKINS[skin].colors[0], 0.05);

/** One repeating tile of the hexagon floor (flat-top hexes). Returns the canvas and its size in world units. */
export function hexTile(radius = 38, px = 2): { canvas: HTMLCanvasElement; w: number; h: number; px: number } {
  const w = 3 * radius;
  const h = Math.sqrt(3) * radius;
  const c = make(Math.round(w * px), Math.round(h * px));
  const g = c.getContext("2d")!;
  g.scale(px, px);
  g.fillStyle = "#0b1020";
  g.fillRect(0, 0, w, h);
  const hexAt = (cx: number, cy: number, fill: string) => {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const x = cx + Math.cos(a) * (radius - 1.6);
      const y = cy + Math.sin(a) * (radius - 1.6);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, shade(fill, 0.03));
    grad.addColorStop(1, fill);
    g.fillStyle = grad;
    g.fill();
    g.strokeStyle = "rgba(120,160,255,0.07)";
    g.lineWidth = 1.2;
    g.stroke();
  };
  hexAt(radius, h / 2, "#121a2e");
  hexAt(2.5 * radius, 0, "#10172a");
  hexAt(2.5 * radius, h, "#10172a");
  // The same hexes again where they wrap around the tile's left edge, so the tiling is seamless.
  hexAt(-0.5 * radius, 0, "#10172a");
  hexAt(-0.5 * radius, h, "#10172a");
  return { canvas: c, w, h, px };
}
