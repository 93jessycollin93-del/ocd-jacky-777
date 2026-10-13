// Drawing for Sling Siege: skies and hills, the ground, blocks, grumblers, critters and the slingshot.
// Everything is drawn from shapes; world units are metres (y down), the caller sets the camera transform.
import { shade, withAlpha } from "../../kit/draw";
import type { Cam, Viewport } from "./camera";
import type { CritterKind, GrumblerKind, MatId } from "./materials";
import { CRITTERS, SLING } from "./materials";
import type { Piece } from "./logic";

export interface Theme {
  skyTop: string;
  skyBottom: string;
  sun: string;
  far: string;
  mid: string;
  near: string;
  grass: string;
  grassDark: string;
  soil: string;
  soilDark: string;
  rock: string;
  rockDark: string;
  kind: "meadow" | "canyon" | "frost";
}

export const THEMES: Theme[] = [
  {
    skyTop: "#5cb8f5", skyBottom: "#dff3ff", sun: "#fff3b0", far: "#9ec9e8", mid: "#7ec17e", near: "#5da95e",
    grass: "#6fcf4a", grassDark: "#3f9a2b", soil: "#9a6b3c", soilDark: "#7a4f27", rock: "#8d8a82", rockDark: "#5f5c55", kind: "meadow",
  },
  {
    skyTop: "#f6a05b", skyBottom: "#ffe9b8", sun: "#fff1c2", far: "#d9906a", mid: "#c26a4a", near: "#a5503a",
    grass: "#d9a548", grassDark: "#a97a2a", soil: "#b5623a", soilDark: "#8a4527", rock: "#a8755a", rockDark: "#6e4533", kind: "canyon",
  },
  {
    skyTop: "#7d8ff0", skyBottom: "#e3f2ff", sun: "#ffffff", far: "#b4c4ec", mid: "#c9dcf5", near: "#9fbbe2",
    grass: "#f4faff", grassDark: "#bcd4ee", soil: "#7d92b3", soilDark: "#5a6e90", rock: "#7c8ba5", rockDark: "#4f5d78", kind: "frost",
  },
];

// ---------------------------------------------------------------- backdrop (screen space)

function ridge(
  ctx: CanvasRenderingContext2D, v: Viewport, cam: Cam, gy: number, factor: number, base: number, a1: number, k1: number, a2: number, k2: number,
  seed: number, color: string, flat = false,
) {
  const z = cam.z;
  const x0 = cam.x * factor - v.w / 2 / z - 2;
  const step = 12 / z;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, v.h + 4);
  for (let xw = x0; xw < x0 + v.w / z + 6; xw += step) {
    let hgt = base + a1 * Math.sin(xw * k1 + seed) + a2 * Math.sin(xw * k2 + seed * 2.3);
    if (flat) hgt = Math.round(hgt * 0.5) * 2; // mesas: stepped tops
    const sx = v.w / 2 + (xw - cam.x * factor) * z;
    ctx.lineTo(sx, gy - hgt * z);
  }
  ctx.lineTo(v.w + 4, v.h + 4);
  ctx.closePath();
  ctx.fill();
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, 14 * s, 0, 6.2832);
  ctx.arc(x + 16 * s, y - 8 * s, 18 * s, 0, 6.2832);
  ctx.arc(x + 36 * s, y - 2 * s, 15 * s, 0, 6.2832);
  ctx.arc(x + 24 * s, y + 6 * s, 14 * s, 0, 6.2832);
  ctx.fill();
}

export function drawBackdrop(ctx: CanvasRenderingContext2D, v: Viewport, cam: Cam, t: Theme, time: number) {
  const g = ctx.createLinearGradient(0, 0, 0, v.h);
  g.addColorStop(0, t.skyTop);
  g.addColorStop(1, t.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, v.w, v.h);
  const z = cam.z;
  const gy = v.h / 2 - cam.y * z;
  // Sun / moon, nearly fixed on the sky.
  const sx = v.w * 0.78 - cam.x * 1.5;
  const sy = Math.min(gy - 14 * z, v.h * 0.3) ;
  const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 90);
  glow.addColorStop(0, withAlpha(t.sun, 0.9));
  glow.addColorStop(0.35, withAlpha(t.sun, 0.35));
  glow.addColorStop(1, withAlpha(t.sun, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 100, sy - 100, 200, 200);
  ctx.fillStyle = t.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, 22, 0, 6.2832);
  ctx.fill();
  // Clouds drift across at their own pace.
  for (let i = 0; i < 6; i++) {
    const span = v.w + 240;
    const cx = ((i * 0.37 * span + time * (6 + i * 2) - cam.x * z * 0.12) % span + span) % span - 120;
    const cy = Math.min(gy - (11 + (i % 3) * 3.4) * z, v.h * (0.12 + (i % 3) * 0.11));
    cloud(ctx, cx, Math.max(40, cy), 0.9 + (i % 3) * 0.35, t.kind === "canyon" ? 0.55 : 0.8);
  }
  // Hills, far to near.
  const flat = t.kind === "canyon";
  ridge(ctx, v, cam, gy, 0.1, 8, 4.5, 0.11, 2.2, 0.27, 1.3, t.far, flat);
  ridge(ctx, v, cam, gy, 0.25, 3.4, 2.4, 0.16, 1.2, 0.41, 4.1, t.mid, false);
  ridge(ctx, v, cam, gy, 0.5, 1.2, 1.1, 0.23, 0.6, 0.6, 7.7, t.near, false);
}

// ---------------------------------------------------------------- ground and scenery (world space)

export function drawGround(ctx: CanvasRenderingContext2D, t: Theme, z: number, left: number, right: number, bottom: number) {
  const x0 = left;
  const w = right - left;
  const soil = ctx.createLinearGradient(0, 0, 0, 14);
  soil.addColorStop(0, t.soil);
  soil.addColorStop(1, t.soilDark);
  ctx.fillStyle = soil;
  ctx.fillRect(x0, 0, w, Math.max(14, bottom));
  // Pebbles in the soil.
  ctx.fillStyle = withAlpha(t.soilDark, 0.55);
  for (let x = Math.floor(x0 / 2.1) * 2.1; x < right; x += 2.1) {
    const k = Math.sin(x * 12.9898) * 43758.5453;
    const f = k - Math.floor(k);
    ctx.beginPath();
    ctx.ellipse(x + f * 1.4, 1.2 + (f * 7.3 % 4), 0.22 + f * 0.2, 0.14 + f * 0.1, f * 3, 0, 6.2832);
    ctx.fill();
  }
  // Grass or snow strip with a scalloped lower edge.
  ctx.fillStyle = t.grass;
  ctx.beginPath();
  ctx.moveTo(x0, -0.06);
  ctx.lineTo(right, -0.06);
  ctx.lineTo(right, 0.5);
  for (let x = right; x > x0; x -= 0.7) ctx.lineTo(x, 0.5 + 0.2 * Math.sin(x * 4));
  ctx.lineTo(x0, 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = t.grassDark;
  ctx.fillRect(x0, 0.42, w, 0.06);
  // A line of tufts along the edge.
  ctx.strokeStyle = t.grassDark;
  ctx.lineWidth = Math.max(0.05, 1.4 / z);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let x = Math.floor(x0 / 0.9) * 0.9; x < right; x += 0.9) {
    const k = Math.sin(x * 78.233) * 43758.5453;
    const f = k - Math.floor(k);
    ctx.moveTo(x, -0.05);
    ctx.lineTo(x + (f - 0.5) * 0.25, -0.05 - 0.14 - f * 0.12);
  }
  ctx.stroke();
}

/** Trees, cacti or pines standing behind the action. */
export function drawScenery(ctx: CanvasRenderingContext2D, t: Theme, z: number, levelWidth: number) {
  const spots = [-3.2, 1.2, 9.4, 14.6, 17.6, levelWidth - 2.2, levelWidth + 1.4, levelWidth + 5];
  spots.forEach((x, i) => {
    const s = 0.8 + ((i * 37) % 7) / 10;
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(s, s);
    if (t.kind === "meadow") {
      ctx.fillStyle = "#7a4f27";
      ctx.fillRect(-0.18, -1.7, 0.36, 1.7);
      ctx.fillStyle = "#2f8f3a";
      ctx.beginPath();
      ctx.arc(0, -2.4, 1.25, 0, 6.2832);
      ctx.arc(-0.8, -1.8, 0.9, 0, 6.2832);
      ctx.arc(0.85, -1.85, 0.95, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = "#4cb552";
      ctx.beginPath();
      ctx.arc(-0.2, -2.7, 0.8, 0, 6.2832);
      ctx.fill();
    } else if (t.kind === "canyon") {
      ctx.fillStyle = "#5f8f4a";
      ctx.beginPath();
      ctx.roundRect?.(-0.22, -2.6, 0.44, 2.6, 0.22);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect?.(-0.9, -1.9, 0.34, 1.0, 0.17);
      ctx.roundRect?.(-0.9, -1.0, 0.8, 0.3, 0.15);
      ctx.roundRect?.(0.56, -2.2, 0.34, 1.1, 0.17);
      ctx.roundRect?.(0.1, -1.2, 0.8, 0.3, 0.15);
      ctx.fill();
    } else {
      ctx.fillStyle = "#3b5a7a";
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(-1.1 + k * 0.22, -0.7 - k * 0.9);
        ctx.lineTo(1.1 - k * 0.22, -0.7 - k * 0.9);
        ctx.lineTo(0, -2 - k * 0.9);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#f4faff";
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(-0.45 + k * 0.1, -1.75 - k * 0.9);
        ctx.lineTo(0.45 - k * 0.1, -1.75 - k * 0.9);
        ctx.lineTo(0, -2 - k * 0.9);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#6b4a2b";
      ctx.fillRect(-0.12, -0.7, 0.24, 0.7);
    }
    ctx.restore();
  });
}

// ---------------------------------------------------------------- blocks

interface MatStyle {
  fill: string;
  fill2: string;
  edge: string;
  light: string;
}

const STYLE: Record<MatId, MatStyle> = {
  wood: { fill: "#cf9a5a", fill2: "#b9803f", edge: "#6b3f17", light: "#f0c88e" },
  stone: { fill: "#a7adb8", fill2: "#8b919d", edge: "#444b57", light: "#d4d8df" },
  glass: { fill: "rgba(186,230,253,0.5)", fill2: "rgba(125,211,252,0.4)", edge: "rgba(255,255,255,0.95)", light: "rgba(255,255,255,0.9)" },
  ice: { fill: "#c9eeff", fill2: "#93d5f6", edge: "#4aa8d6", light: "#ffffff" },
  tnt: { fill: "#e0452f", fill2: "#b92d1c", edge: "#6b140b", light: "#ff8a74" },
  rock: { fill: "#8d8a82", fill2: "#6c6a63", edge: "#403e39", light: "#b3b0a6" },
};

const hash = (n: number) => {
  const k = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return k - Math.floor(k);
};

function pathPiece(ctx: CanvasRenderingContext2D, p: Piece) {
  const sh = p.body.shape;
  ctx.beginPath();
  if (sh.kind === "box") ctx.rect(-sh.hw, -sh.hh, sh.hw * 2, sh.hh * 2);
  else if (sh.kind === "circle") ctx.arc(0, 0, sh.r, 0, 6.2832);
  else {
    const v = sh.verts;
    ctx.moveTo(v[0], v[1]);
    for (let i = 2; i < v.length; i += 2) ctx.lineTo(v[i], v[i + 1]);
    ctx.closePath();
  }
}

function cracks(ctx: CanvasRenderingContext2D, p: Piece, z: number, hw: number, hh: number) {
  const dmg = 1 - p.hp / p.maxHp;
  if (!(dmg > 0.12)) return;
  const n = Math.min(5, 1 + Math.floor(dmg * 5));
  ctx.strokeStyle = p.mat === "glass" || p.mat === "ice" ? "rgba(255,255,255,0.95)" : "rgba(30,20,10,0.65)";
  ctx.lineWidth = Math.max(0.035, 1.2 / z);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    let x = (hash(p.id * 13 + i) - 0.5) * hw * 1.6;
    let y = (hash(p.id * 29 + i * 7) - 0.5) * hh * 1.6;
    ctx.moveTo(x, y);
    const a0 = hash(p.id * 5 + i * 3) * 6.28;
    for (let k = 1; k <= 3; k++) {
      const a = a0 + (hash(p.id + i * 11 + k) - 0.5) * 1.6;
      const len = 0.18 + hash(i * 3 + k + p.id) * 0.3;
      x += Math.cos(a) * len;
      y += Math.sin(a) * len;
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

export function drawBlock(ctx: CanvasRenderingContext2D, p: Piece, z: number, t: Theme) {
  const b = p.body;
  const mat = p.mat!;
  const st = STYLE[mat];
  const sh = b.shape;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.a);
  const edgeW = Math.max(0.05, 1.6 / z);
  const hw = sh.kind === "box" ? sh.hw : sh.kind === "circle" ? sh.r : 0.6;
  const hh = sh.kind === "box" ? sh.hh : sh.kind === "circle" ? sh.r : 0.6;

  pathPiece(ctx, p);
  if (mat === "rock") {
    ctx.fillStyle = t.rock;
    ctx.fill();
    ctx.lineWidth = edgeW;
    ctx.strokeStyle = t.rockDark;
    ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = withAlpha(t.rockDark, 0.28);
    for (let i = 0; i < 14; i++) {
      const rx = (hash(i * 3.1 + b.x) - 0.5) * hw * 2;
      const ry = (hash(i * 7.7 + b.y + 1) - 0.5) * hh * 2;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 0.3 + hash(i) * 0.5, 0.2 + hash(i + 9) * 0.3, 0.4, 0, 6.2832);
      ctx.fill();
    }
    // A grassy cap on the flat tops.
    if (sh.kind === "box") {
      ctx.fillStyle = t.grass;
      ctx.fillRect(-hw, -hh, hw * 2, 0.4);
      ctx.fillStyle = t.grassDark;
      ctx.fillRect(-hw, -hh + 0.34, hw * 2, 0.06);
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  if (sh.kind === "circle") {
    const g = ctx.createRadialGradient(-sh.r * 0.35, -sh.r * 0.4, sh.r * 0.1, 0, 0, sh.r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.5, st.fill);
    g.addColorStop(1, st.fill2);
    ctx.fillStyle = g;
  } else if (mat === "glass") {
    ctx.fillStyle = st.fill;
  } else {
    const g = ctx.createLinearGradient(0, -hh, 0, hh);
    g.addColorStop(0, st.fill);
    g.addColorStop(1, st.fill2);
    ctx.fillStyle = g;
  }
  ctx.fill();
  ctx.save();
  ctx.clip();

  const long = hw > hh;
  if (mat === "wood") {
    ctx.strokeStyle = withAlpha(st.edge, 0.35);
    ctx.lineWidth = Math.max(0.03, 1 / z);
    ctx.beginPath();
    if (sh.kind === "box") {
      const n = Math.max(1, Math.round((long ? hh : hw) * 2 / 0.22));
      for (let i = 1; i < n; i++) {
        const f = i / n;
        if (long) {
          ctx.moveTo(-hw, -hh + f * hh * 2);
          ctx.lineTo(hw, -hh + f * hh * 2 + (hash(i + p.id) - 0.5) * 0.04);
        } else {
          ctx.moveTo(-hw + f * hw * 2, -hh);
          ctx.lineTo(-hw + f * hw * 2 + (hash(i + p.id) - 0.5) * 0.04, hh);
        }
      }
      if (hw > 0.45 && hh > 0.45) {
        ctx.moveTo(-hw, -hh);
        ctx.lineTo(hw, hh);
        ctx.moveTo(hw, -hh);
        ctx.lineTo(-hw, hh);
      }
    } else {
      ctx.moveTo(-hw * 0.6, hh * 0.4);
      ctx.lineTo(hw * 0.6, hh * 0.4);
    }
    ctx.stroke();
    ctx.fillStyle = st.edge;
    if (sh.kind === "box" && (long ? hw : hh) > 0.5) {
      const nr = Math.max(0.035, 1.5 / z);
      const ends = long ? [[-hw + 0.12, 0], [hw - 0.12, 0]] : [[0, -hh + 0.12], [0, hh - 0.12]];
      for (const [nx, ny] of ends) {
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, 6.2832);
        ctx.fill();
      }
    }
  } else if (mat === "stone") {
    ctx.fillStyle = withAlpha(st.edge, 0.2);
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc((hash(i * 2.3 + p.id) - 0.5) * hw * 2, (hash(i * 5.1 + p.id) - 0.5) * hh * 2, 0.04 + hash(i) * 0.05, 0, 6.2832);
      ctx.fill();
    }
    ctx.fillStyle = withAlpha(st.light, 0.55);
    if (sh.kind === "box") ctx.fillRect(-hw, -hh, hw * 2, Math.min(0.08, hh));
  } else if (mat === "glass") {
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = Math.max(0.05, 2 / z);
    ctx.beginPath();
    ctx.moveTo(-hw * 0.7, hh * 0.3);
    ctx.lineTo(-hw * 0.2, -hh * 0.5);
    ctx.moveTo(-hw * 0.3, hh * 0.6);
    ctx.lineTo(hw * 0.2, -hh * 0.1);
    ctx.stroke();
  } else if (mat === "ice") {
    ctx.fillStyle = withAlpha(st.light, 0.55);
    ctx.beginPath();
    ctx.moveTo(-hw, -hh);
    ctx.lineTo(-hw + Math.min(hw, hh) * 1.2, -hh);
    ctx.lineTo(-hw, -hh + Math.min(hw, hh) * 1.2);
    ctx.closePath();
    ctx.fill();
  } else if (mat === "tnt") {
    ctx.fillStyle = st.fill2;
    ctx.fillRect(-hw, -hh * 0.55, hw * 2, 0.12);
    ctx.fillRect(-hw, hh * 0.45, hw * 2, 0.12);
    ctx.fillStyle = "#fff";
    ctx.font = `900 ${Math.min(hw, hh) * 0.9}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("TNT", 0, 0);
  }
  cracks(ctx, p, z, hw, hh);
  ctx.restore();

  pathPiece(ctx, p);
  ctx.lineWidth = edgeW;
  ctx.strokeStyle = st.edge;
  ctx.lineJoin = "round";
  ctx.stroke();
  if (p.flash > 0) {
    pathPiece(ctx, p);
    ctx.fillStyle = `rgba(255,255,255,${p.flash * 0.55})`;
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- characters

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, px: number, py: number, closed: boolean, hurt: boolean) {
  if (closed) {
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = r * 0.35;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8, y);
    ctx.lineTo(x + r * 0.8, y);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.2832);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = r * 0.16;
  ctx.stroke();
  if (hurt) {
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = r * 0.3;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.5);
    ctx.lineTo(x + r * 0.5, y + r * 0.5);
    ctx.moveTo(x + r * 0.5, y - r * 0.5);
    ctx.lineTo(x - r * 0.5, y + r * 0.5);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(x + px * r * 0.45, y + py * r * 0.45, r * 0.5, 0, 6.2832);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x + px * r * 0.45 - r * 0.15, y + py * r * 0.45 - r * 0.18, r * 0.16, 0, 6.2832);
  ctx.fill();
}

export interface CritterLook {
  /** Rotation of the body in radians. */
  angle: number;
  /** 0..1: how hard it is concentrating (while being drawn back). */
  strain: number;
  /** Seconds, for blinking and flicker. */
  time: number;
  /** The bomber's fuse is lit. */
  lit: boolean;
  /** The dasher is boosting. */
  boost: boolean;
  /** Face direction hint (-1..1 in x, y) for the pupils. */
  lookX: number;
  lookY: number;
}

export function drawCritter(ctx: CanvasRenderingContext2D, kind: CritterKind, x: number, y: number, r: number, look: CritterLook, z: number) {
  const spec = CRITTERS[kind];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(look.angle);
  const edgeW = Math.max(0.05, 1.6 / z);
  // Body.
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.05);
  g.addColorStop(0, shade(spec.color, 0.22));
  g.addColorStop(0.65, spec.color);
  g.addColorStop(1, shade(spec.color, -0.12));
  // Tuft / extras behind the body.
  ctx.fillStyle = spec.dark;
  if (kind === "basic" || kind === "splitter") {
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, -r * 0.92);
    ctx.lineTo(-r * 0.05, -r * 1.35);
    ctx.lineTo(r * 0.12, -r * 0.94);
    ctx.lineTo(r * 0.3, -r * 1.25);
    ctx.lineTo(r * 0.42, -r * 0.85);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "dasher") {
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.9);
    ctx.lineTo(r * 0.32, -r * 1.5);
    ctx.lineTo(r * 0.12, -r * 1.05);
    ctx.lineTo(r * 0.48, -r * 1.12);
    ctx.lineTo(r * 0.28, -r * 0.8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 6.2832);
  ctx.fill();
  ctx.lineWidth = edgeW;
  ctx.strokeStyle = spec.dark;
  ctx.stroke();
  // Markings.
  if (kind === "splitter") {
    ctx.fillStyle = withAlpha(spec.dark, 0.55);
    for (const [dx, dy] of [[-0.45, 0.45], [0, 0.62], [0.45, 0.45]]) {
      ctx.beginPath();
      ctx.arc(dx * r, dy * r, r * 0.13, 0, 6.2832);
      ctx.fill();
    }
  } else if (kind === "heavy") {
    ctx.strokeStyle = withAlpha(spec.dark, 0.55);
    ctx.lineWidth = Math.max(0.04, 1.2 / z);
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.2);
    ctx.lineTo(-r * 0.4, r * 0.4);
    ctx.lineTo(-r * 0.5, r * 0.7);
    ctx.moveTo(r * 0.5, -r * 0.45);
    ctx.lineTo(r * 0.75, -r * 0.1);
    ctx.stroke();
  } else if (kind === "bomber") {
    // Fuse and spark.
    ctx.strokeStyle = "#a16207";
    ctx.lineWidth = Math.max(0.06, 2 / z);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.95);
    ctx.quadraticCurveTo(r * 0.5, -r * 1.35, r * 0.25, -r * 1.55);
    ctx.stroke();
    const flick = 0.75 + 0.25 * Math.sin(look.time * 40);
    ctx.fillStyle = look.lit ? "#ef4444" : "#fbbf24";
    ctx.beginPath();
    ctx.arc(r * 0.25, -r * 1.58, r * (look.lit ? 0.3 : 0.2) * flick, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = "#fff7ad";
    ctx.beginPath();
    ctx.arc(r * 0.25, -r * 1.58, r * 0.1 * flick, 0, 6.2832);
    ctx.fill();
  }
  // Face (it looks along the launch direction by default).
  ctx.rotate(-look.angle * 0.65);
  const blink = Math.sin(look.time * 1.3 + x) > 0.985 || Math.sin(look.time * 0.9 + y * 2) > 0.992;
  const er = r * (kind === "heavy" ? 0.24 : 0.3) * (1 - look.strain * 0.25);
  const ex = r * 0.34;
  const ey = -r * 0.1;
  eye(ctx, -ex, ey, er, look.lookX, look.lookY, blink, false);
  eye(ctx, ex, ey, er, look.lookX, look.lookY, blink, false);
  // Brows: angrier the harder it is being pulled back.
  ctx.strokeStyle = spec.dark;
  ctx.lineWidth = Math.max(0.05, r * 0.14);
  ctx.lineCap = "round";
  const bl = look.strain * 0.14 + (kind === "heavy" ? 0.18 : 0.05);
  ctx.beginPath();
  ctx.moveTo(-ex - er * 1.1, ey - er * (1.1 - bl * 3));
  ctx.lineTo(-ex + er * 1.0, ey - er * (1.5 + bl * 2));
  ctx.moveTo(ex + er * 1.1, ey - er * (1.1 - bl * 3));
  ctx.lineTo(ex - er * 1.0, ey - er * (1.5 + bl * 2));
  ctx.stroke();
  // Little beak / mouth.
  ctx.fillStyle = kind === "bomber" ? "#f1f5f9" : "#fbbf24";
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, r * 0.18);
  ctx.lineTo(r * 0.12, r * 0.18);
  ctx.lineTo(0, r * 0.4);
  ctx.closePath();
  ctx.fill();
  if (look.boost) {
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = Math.max(0.05, 2 / z);
    ctx.beginPath();
    ctx.moveTo(-r * 1.2, -r * 0.4);
    ctx.lineTo(-r * 2.6, -r * 0.4);
    ctx.moveTo(-r * 1.3, r * 0.2);
    ctx.lineTo(-r * 3, r * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

export interface GrumblerLook {
  time: number;
  /** 0 healthy, 1 nearly dead. */
  hurt: number;
  sq: number;
  flash: number;
  id: number;
  angle: number;
}

export function drawGrumbler(ctx: CanvasRenderingContext2D, kind: GrumblerKind, x: number, y: number, r: number, look: GrumblerLook, z: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(look.angle * 0.5);
  // Squash from the bottom: wide and short on impact, then a springy wobble.
  const wob = Math.sin(look.time * 14 + look.id) * look.sq;
  const sx = 1 + look.sq * 0.28 + wob * 0.08;
  const sy = 1 - look.sq * 0.26 - wob * 0.05;
  const idle = 1 + Math.sin(look.time * 3 + look.id * 1.7) * 0.015;
  ctx.translate(0, r);
  ctx.scale(sx, sy * idle);
  ctx.translate(0, -r);
  const edgeW = Math.max(0.05, 1.6 / z);
  const green = kind === "king" ? "#8be04a" : kind === "small" ? "#a3e66a" : "#6fd34f";
  const dark = "#2f7d27";
  // Ears.
  ctx.fillStyle = green;
  ctx.strokeStyle = dark;
  ctx.lineWidth = edgeW;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * r * 0.78, -r * 0.35);
    ctx.lineTo(s * r * 1.35, -r * 0.85);
    ctx.lineTo(s * r * 0.55, -r * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Body.
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
  g.addColorStop(0, shade(green, 0.2));
  g.addColorStop(0.7, green);
  g.addColorStop(1, shade(green, -0.1));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 6.2832);
  ctx.fill();
  ctx.stroke();
  const hurt = look.hurt > 0.55;
  const blink = Math.sin(look.time * 1.1 + look.id * 2.1) > 0.985;
  // Mismatched goofy eyes.
  eye(ctx, -r * 0.34, -r * 0.18, r * 0.27, 0.35, 0.2, blink, hurt);
  eye(ctx, r * 0.32, -r * 0.22, r * 0.2, -0.25, 0.3, blink, hurt);
  // Heavy unibrow.
  ctx.strokeStyle = dark;
  ctx.lineWidth = r * 0.14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -r * 0.55);
  ctx.lineTo(-r * 0.05, -r * 0.46);
  ctx.lineTo(r * 0.55, -r * 0.6);
  ctx.stroke();
  // Snout and a crooked grin with one fang.
  ctx.fillStyle = shade(green, -0.14);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.08, r * 0.2, r * 0.13, 0, 0, 6.2832);
  ctx.fill();
  ctx.strokeStyle = "#14532d";
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  if (hurt) {
    ctx.moveTo(-r * 0.3, r * 0.52);
    ctx.quadraticCurveTo(0, r * 0.32, r * 0.3, r * 0.52);
  } else {
    ctx.moveTo(-r * 0.36, r * 0.38);
    ctx.quadraticCurveTo(0, r * 0.68, r * 0.38, r * 0.34);
  }
  ctx.stroke();
  if (!hurt) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.48);
    ctx.lineTo(-r * 0.08, r * 0.48);
    ctx.lineTo(-r * 0.14, r * 0.68);
    ctx.closePath();
    ctx.fill();
  }
  // Damage: a plaster across the forehead.
  if (look.hurt > 0.3) {
    ctx.fillStyle = "#fde68a";
    ctx.save();
    ctx.rotate(-0.5);
    ctx.fillRect(-r * 0.2, -r * 0.92, r * 0.5, r * 0.2);
    ctx.restore();
  }
  // Hats.
  if (kind === "helmet") {
    const hg = ctx.createLinearGradient(0, -r * 1.2, 0, -r * 0.3);
    hg.addColorStop(0, "#e5e7eb");
    hg.addColorStop(1, "#6b7280");
    ctx.fillStyle = hg;
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = edgeW;
    ctx.beginPath();
    ctx.arc(0, -r * 0.35, r * 0.98, Math.PI * 1.03, Math.PI * 1.97);
    ctx.lineTo(r * 1.0, -r * 0.38);
    ctx.lineTo(-r * 1.0, -r * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#374151";
    for (const dx of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.arc(dx * r, -r * 0.7, r * 0.06, 0, 6.2832);
      ctx.fill();
    }
  } else if (kind === "king") {
    ctx.fillStyle = "#fbbf24";
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = edgeW;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.82);
    ctx.lineTo(-r * 0.62, -r * 1.35);
    ctx.lineTo(-r * 0.3, -r * 1.1);
    ctx.lineTo(0, -r * 1.45);
    ctx.lineTo(r * 0.3, -r * 1.1);
    ctx.lineTo(r * 0.62, -r * 1.35);
    ctx.lineTo(r * 0.6, -r * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, -r * 1.0, r * 0.1, 0, 6.2832);
    ctx.fill();
  }
  if (look.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${look.flash * 0.5})`;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 6.2832);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the slingshot

const BAND = "#5a2d14";

/** The fork and back band, drawn before the critter in the pouch. */
export function drawSlingBack(ctx: CanvasRenderingContext2D, pouchX: number, pouchY: number, z: number) {
  const x = SLING.x;
  const w = Math.max(0.1, 1.4 / z);
  // Trunk and the far (left) arm.
  ctx.lineCap = "round";
  ctx.strokeStyle = "#5b3a1b";
  ctx.lineWidth = 0.46;
  ctx.beginPath();
  ctx.moveTo(x, 0.1);
  ctx.lineTo(x, -1.8);
  ctx.stroke();
  ctx.lineWidth = 0.34;
  ctx.beginPath();
  ctx.moveTo(x, -1.7);
  ctx.quadraticCurveTo(x - 0.15, -2.4, x - 0.5, -3.15);
  ctx.stroke();
  ctx.strokeStyle = "#7c4f27";
  ctx.lineWidth = 0.16;
  ctx.beginPath();
  ctx.moveTo(x - 0.06, -0.1);
  ctx.lineTo(x - 0.06, -1.7);
  ctx.stroke();
  // Back band from the far tip to the pouch.
  ctx.strokeStyle = BAND;
  ctx.lineWidth = Math.max(0.16, w);
  ctx.beginPath();
  ctx.moveTo(x - 0.5, SLING.y + 0.12);
  ctx.lineTo(pouchX - 0.1, pouchY);
  ctx.stroke();
}

/** The near arm, the front band and the leather pouch, drawn over the critter. */
export function drawSlingFront(ctx: CanvasRenderingContext2D, pouchX: number, pouchY: number, z: number, hasCritter: boolean) {
  const x = SLING.x;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#6e4623";
  ctx.lineWidth = 0.36;
  ctx.beginPath();
  ctx.moveTo(x, -1.7);
  ctx.quadraticCurveTo(x + 0.2, -2.4, x + 0.52, -3.05);
  ctx.stroke();
  ctx.strokeStyle = BAND;
  ctx.lineWidth = Math.max(0.16, 1.4 / z);
  ctx.beginPath();
  ctx.moveTo(x + 0.52, SLING.y + 0.22);
  ctx.lineTo(pouchX + 0.1, pouchY + 0.05);
  ctx.stroke();
  if (hasCritter) {
    // Leather cradle under the critter's chin.
    ctx.fillStyle = "#7a3b1c";
    ctx.beginPath();
    ctx.ellipse(pouchX, pouchY + 0.3, 0.5, 0.22, 0, 0, 6.2832);
    ctx.fill();
  }
}

/** A little critter portrait for the HUD queue. */
export function drawCritterIcon(ctx: CanvasRenderingContext2D, kind: CritterKind, x: number, y: number, size: number, time: number) {
  const spec = CRITTERS[kind];
  const r = size / 2;
  drawCritter(ctx, kind, x, y, r * (kind === "heavy" ? 1 : 0.92), {
    angle: 0, strain: 0, time, lit: false, boost: false, lookX: 0.4, lookY: 0.1,
  }, 1);
  void spec;
}
