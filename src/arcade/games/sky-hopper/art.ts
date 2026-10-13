// Sky Hopper art: a hand-drawn notebook page. Everything is drawn in code with wobbly pencil and marker strokes
// whose jitter is seeded per object, and which "boils" a few times a second like hand-made animation.
import { clamp, type Ctx } from "../../kit/draw";
import { PLAYER_H, PLATFORM_H, SPRING_H, W, type Jet, type Monster, type Platform } from "./logic";

export const INK = "#27324f";
export const PENCIL = "#6b7280";
export const HAND_FONT = "'Segoe Print', 'Bradley Hand', 'Chalkboard SE', 'Comic Sans MS', 'Marker Felt', cursive";

/** Deterministic noise in [-1, 1]. */
function nz(a: number, b = 0) {
  const v = Math.sin(a * 127.1 + b * 311.7 + 17.13) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}

/** How many times a second the hand-drawn wobble changes. */
const BOIL_RATE = 6;

export interface Cam {
  /** Screen height in world units, and the world y at the bottom of the screen. */
  h: number;
  camY: number;
  /** Seconds, for the boil. */
  time: number;
}

export const toScreenY = (c: Cam, y: number) => c.h - (y - c.camY);

// ---------------------------------------------------------------- shapes with a hand-drawn wobble

/** A wobbly rounded rectangle path (not stroked or filled yet). */
function wobblyBox(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, seed: number, amp: number, boil: number) {
  const pts: [number, number][] = [
    [x + r, y], [x + w / 2, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r], [x + w - r, y + h], [x + w / 2, y + h],
    [x + r, y + h], [x, y + h - r], [x, y + r],
  ];
  const n = pts.length;
  const j = pts.map(([px, py], i) => [px + nz(seed + boil * 1.7, i) * amp, py + nz(seed * 1.3 + boil * 2.3, i + 40) * amp] as const);
  ctx.beginPath();
  ctx.moveTo((j[n - 1][0] + j[0][0]) / 2, (j[n - 1][1] + j[0][1]) / 2);
  for (let i = 0; i < n; i++) {
    const a = j[i];
    const b = j[(i + 1) % n];
    ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  ctx.closePath();
}

/** A wobbly circle-ish blob path centred on (cx, cy). */
function wobblyBlob(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, seed: number, amp: number, boil: number, lobes = 0, phase = 0) {
  const n = 14;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (lobes ? Math.sin(a * lobes + phase) * 0.06 : 0);
    const jx = nz(seed + boil, i % n) * amp;
    const jy = nz(seed * 2 + boil, (i % n) + 30) * amp;
    const px = cx + Math.cos(a) * rx * k + jx;
    const py = cy + Math.sin(a) * ry * k + jy;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function scribbleLine(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, seed: number, amp: number) {
  const mx = (x0 + x1) / 2 + nz(seed, 1) * amp;
  const my = (y0 + y1) / 2 + nz(seed, 2) * amp;
  ctx.moveTo(x0 + nz(seed, 3) * amp * 0.5, y0 + nz(seed, 4) * amp * 0.5);
  ctx.quadraticCurveTo(mx, my, x1 + nz(seed, 5) * amp * 0.5, y1 + nz(seed, 6) * amp * 0.5);
}

// ---------------------------------------------------------------- the page

let grain: CanvasPattern | null = null;
function paperGrain(ctx: Ctx) {
  if (grain) return grain;
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 160;
  const g = c.getContext("2d");
  if (!g) return null;
  for (let i = 0; i < 380; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 43758.5453) % 1;
    const a = 0.03 + Math.abs((Math.sin(i * 4.1) * 1000) % 1) * 0.06;
    g.fillStyle = i % 3 ? `rgba(120,100,70,${a})` : `rgba(255,255,255,${a * 2})`;
    g.fillRect(Math.abs(x) * 160, Math.abs(y) * 160, 1 + (i % 2), 1);
  }
  grain = ctx.createPattern(c, "repeat");
  return grain;
}

const DOODLES = 6;

function drawDoodle(ctx: Ctx, kind: number, x: number, y: number, s: number, seed: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = "rgba(90,100,130,0.3)";
  ctx.lineWidth = 1.8 / s;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  switch (kind) {
    case 0: // star
      for (let i = 0; i < 6; i++) {
        const a = (i / 5) * Math.PI * 4 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
      }
      break;
    case 1: // spiral
      for (let i = 0; i < 40; i++) {
        const a = i * 0.45;
        const r = 1 + i * 0.34;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      break;
    case 2: // cloud
      ctx.arc(-9, 2, 7, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(0, -6, 8, Math.PI, Math.PI * 2);
      ctx.arc(10, 0, 7, Math.PI * 1.5, Math.PI * 2.5);
      ctx.closePath();
      break;
    case 3: // arrow
      ctx.moveTo(-14, 6);
      ctx.quadraticCurveTo(0, -12, 14, 0);
      ctx.moveTo(14, 0);
      ctx.lineTo(7, -5);
      ctx.moveTo(14, 0);
      ctx.lineTo(8, 6);
      break;
    case 4: // smiley
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.moveTo(-4, -3);
      ctx.lineTo(-4, -1);
      ctx.moveTo(4, -3);
      ctx.lineTo(4, -1);
      ctx.moveTo(-6, 4);
      ctx.quadraticCurveTo(0, 10, 6, 4);
      break;
    default: // flower
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.moveTo(0, 0);
        ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 5, 0, Math.PI * 2);
      }
      ctx.moveTo(0, 6);
      ctx.lineTo(1 + nz(seed) * 2, 24);
      break;
  }
  ctx.stroke();
  ctx.restore();
}

/** Lined paper, a red margin, punch holes, margin doodles, height marks and your best-height line. */
export function drawPaper(ctx: Ctx, c: Cam, best: number) {
  const { h, camY } = c;
  ctx.fillStyle = "#f8f3e3";
  ctx.fillRect(0, 0, W, h);
  const pat = paperGrain(ctx);
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, h);
  }
  // Ruled lines.
  const gap = 28;
  ctx.strokeStyle = "rgba(112,164,214,0.55)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let k = Math.floor(camY / gap) - 1; k * gap < camY + h + gap; k++) {
    const y = Math.round(toScreenY(c, k * gap)) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();
  // Margin.
  ctx.strokeStyle = "rgba(226,92,92,0.6)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(52.5, 0);
  ctx.lineTo(52.5, h);
  ctx.moveTo(56.5, 0);
  ctx.lineTo(56.5, h);
  ctx.stroke();
  // Punch holes down the left edge.
  const holeGap = 260;
  for (let k = Math.floor((camY - 40) / holeGap); k * holeGap + 80 < camY + h + 40; k++) {
    const y = toScreenY(c, k * holeGap + 80);
    const g = ctx.createRadialGradient(22, y - 2, 1, 22, y, 11);
    g.addColorStop(0, "#2d2a35");
    g.addColorStop(1, "#5a5560");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(22, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Margin doodles, printed on the page.
  const dg = 210;
  for (let k = Math.floor((camY - 40) / dg); k * dg < camY + h + 40; k++) {
    const r = nz(k, 7);
    const kind = Math.floor((nz(k, 3) * 0.5 + 0.5) * DOODLES) % DOODLES;
    const x = r > 0 ? 24 + (r - 0) * 12 : 360 + r * 14;
    drawDoodle(ctx, kind, x, toScreenY(c, k * dg + 90 + nz(k, 9) * 40), 0.9 + (nz(k, 5) + 1) * 0.2, k);
  }
  // Height marks every 100 points, in blue pen.
  const mark = 1000;
  ctx.font = `700 15px ${HAND_FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (let k = Math.max(1, Math.floor(camY / mark)); k * mark < camY + h; k++) {
    const y = toScreenY(c, k * mark);
    ctx.strokeStyle = "rgba(39,50,79,0.28)";
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(39,50,79,0.55)";
    ctx.fillText(`${k * 100}`, 64, y - 9);
  }
  // Your best, as a red dashed line with a note.
  if (best > 0) {
    const by = toScreenY(c, best * 10);
    if (by > -20 && by < h + 20) {
      ctx.strokeStyle = "rgba(220,60,60,0.7)";
      ctx.setLineDash([10, 7]);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, by);
      ctx.lineTo(W, by);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(200,50,50,0.9)";
      ctx.textAlign = "right";
      ctx.fillText(`best ${best}`, W - 10, by - 11);
      ctx.textAlign = "left";
    }
  }
}

// ---------------------------------------------------------------- platforms

const PAL: Record<string, { fill: string; hatch: string }> = {
  normal: { fill: "#8fd462", hatch: "#4f9f3a" },
  moving: { fill: "#79c0f0", hatch: "#3b83c4" },
  break: { fill: "#d6a579", hatch: "#8c5a34" },
  vanish: { fill: "#e4d4f5", hatch: "#a688d0" },
  spring: { fill: "#8fd462", hatch: "#4f9f3a" },
  ground: { fill: "#c8b690", hatch: "#85714b" },
};

export function drawPlatform(ctx: Ctx, p: Platform, c: Cam) {
  const boil = Math.floor(c.time * BOIL_RATE);
  const top = toScreenY(c, p.y);
  if (top < -40 || top > c.h + 60) return;
  const pal = PAL[p.kind];
  const x0 = p.x - p.w / 2;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (p.kind === "ground") {
    ctx.fillStyle = pal.fill;
    ctx.fillRect(-4, top, W + 8, 200);
    ctx.strokeStyle = pal.hatch;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = -10; x < W + 10; x += 14) scribbleLine(ctx, x, top + 4, x + 18, top + 30, x + boil, 3);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    for (let x = 0; x < W; x += 40) scribbleLine(ctx, x, top, x + 41, top, x * 0.7 + boil, 1.4);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (p.kind === "break" && p.t >= 0) {
    // Crumbling: three chunks drop and tumble away.
    const t = p.t;
    for (let i = 0; i < 3; i++) {
      const w = p.w / 3;
      const px = x0 + i * w + w / 2 + (i - 1) * t * 26;
      const py = top + PLATFORM_H / 2 + t * (60 + i * 25) + t * t * 520;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((i - 1) * t * 2.4);
      ctx.globalAlpha = clamp(1 - t * 0.9, 0, 1);
      wobblyBox(ctx, -w / 2, -PLATFORM_H / 2, w, PLATFORM_H, 3, p.id + i, 1, 0);
      ctx.fillStyle = pal.fill;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  let alpha = 1;
  if (p.kind === "vanish") alpha = p.t >= 0 ? clamp(1 - p.t / 0.18, 0, 1) : 0.85;
  ctx.globalAlpha = alpha;

  // Spring platforms: the coil sits above the bar.
  const barTop = p.kind === "spring" ? top + SPRING_H : top;
  if (p.kind === "spring") {
    const k = 1 - p.squash * 0.55;
    const coilTop = barTop - SPRING_H * k;
    ctx.strokeStyle = "#e0463c";
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    const cx = p.x;
    ctx.moveTo(cx - 9, barTop);
    const turns = 4;
    for (let i = 0; i < turns; i++) {
      const y0 = barTop - (i / turns) * (barTop - coilTop);
      const y1 = barTop - ((i + 1) / turns) * (barTop - coilTop);
      ctx.lineTo(cx + 11, (y0 + y1) / 2);
      ctx.lineTo(cx - 9, y1);
    }
    ctx.stroke();
    ctx.fillStyle = "#f5c542";
    wobblyBox(ctx, cx - 14, coilTop - 5, 28, 7, 3, p.id, 0.7, boil);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  wobblyBox(ctx, x0, barTop, p.w, PLATFORM_H, 5, p.id * 3.1, 1.1, boil);
  ctx.fillStyle = pal.fill;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = pal.hatch;
  ctx.globalAlpha = alpha * 0.8;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let x = x0 - 8; x < x0 + p.w; x += 9) scribbleLine(ctx, x, barTop + PLATFORM_H + 2, x + 12, barTop - 2, p.id * 7 + x, 1.2);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = alpha;
  wobblyBox(ctx, x0, barTop, p.w, PLATFORM_H, 5, p.id * 3.1 + 0.5, 1.4, boil);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  if (p.kind === "vanish") ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Little marks that say what it does.
  if (p.kind === "moving") {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const y = barTop + PLATFORM_H / 2;
    ctx.moveTo(p.x - 12, y);
    ctx.lineTo(p.x + 12, y);
    ctx.moveTo(p.x - 12, y);
    ctx.lineTo(p.x - 7, y - 4);
    ctx.moveTo(p.x - 12, y);
    ctx.lineTo(p.x - 7, y + 4);
    ctx.moveTo(p.x + 12, y);
    ctx.lineTo(p.x + 7, y - 4);
    ctx.moveTo(p.x + 12, y);
    ctx.lineTo(p.x + 7, y + 4);
    ctx.stroke();
  } else if (p.kind === "vanish") {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(p.x - 14, barTop + 5, 2, 0, Math.PI * 2);
    ctx.arc(p.x + 6, barTop + 8, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === "break") {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(p.x - 4, barTop);
    ctx.lineTo(p.x - 1, barTop + 5);
    ctx.lineTo(p.x - 6, barTop + 9);
    ctx.lineTo(p.x - 2, barTop + PLATFORM_H);
    ctx.moveTo(p.x + 16, barTop);
    ctx.lineTo(p.x + 13, barTop + 6);
    ctx.lineTo(p.x + 17, barTop + PLATFORM_H);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the player

export interface PlayerPose {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  /** Aim angle for the pen-nib nose. */
  aim: number;
  firing: number;
  sinceBounce: number;
  jet: number;
  alive: boolean;
  deadT: number;
  cause: "fell" | "monster" | null;
}

/** "Inky": a round little doodle with a pen-nib nose that points where it shoots, and stretchy legs. */
export function drawPlayer(ctx: Ctx, p: PlayerPose, c: Cam) {
  const sy = toScreenY(c, p.y);
  const rising = p.vy > 80;
  const squash = p.alive && p.sinceBounce < 0.12 ? 1 - (1 - p.sinceBounce / 0.12) * 0.22 : rising ? 1 + Math.min(0.1, p.vy / 9000) : 1;
  const widen = 1 / Math.sqrt(squash);
  const f = p.facing;
  ctx.save();
  ctx.translate(p.x, sy);
  if (!p.alive) ctx.rotate(p.deadT * 5 * (p.cause === "monster" ? f : 1));
  else ctx.rotate(clamp(p.vx / 340, -1, 1) * 0.16);
  ctx.scale(widen, squash);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const boil = Math.floor(c.time * BOIL_RATE);

  // Jetpack on the back, with a flickering flame.
  if (p.jet > 0) {
    const bx = -f * 17;
    ctx.fillStyle = "#e0463c";
    for (const dx of [-4, 4]) {
      wobblyBox(ctx, bx + dx - 4, -38, 8, 24, 3, 11 + dx, 0.5, 0);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const fl = 14 + Math.sin(c.time * 60) * 4 + Math.min(1, p.jet) * 12;
    for (const dx of [-4, 4]) {
      ctx.fillStyle = "#ffb03a";
      ctx.beginPath();
      ctx.moveTo(bx + dx - 4, -14);
      ctx.quadraticCurveTo(bx + dx, -14 + fl * 1.3, bx + dx + 4, -14);
      ctx.fill();
      ctx.fillStyle = "#fff3a0";
      ctx.beginPath();
      ctx.moveTo(bx + dx - 2, -14);
      ctx.quadraticCurveTo(bx + dx, -14 + fl * 0.7, bx + dx + 2, -14);
      ctx.fill();
    }
  }

  // Legs: long and reaching while rising, tucked up while falling.
  const tuck = p.vy < -120 ? 0.55 : p.vy > 80 ? 1.15 : 0.9;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  for (const side of [-1, 1]) {
    const hx = side * 6;
    const kx = side * (9 + (tuck < 0.8 ? 5 : 1));
    const fy = -2 + (1 - tuck) * 14;
    ctx.beginPath();
    ctx.moveTo(hx, -9);
    ctx.lineTo(kx, -9 + (fy + 9) * 0.55);
    ctx.lineTo(side * 8 + side * (tuck < 0.8 ? 4 : 0), fy);
    ctx.stroke();
    // A little foot.
    ctx.beginPath();
    ctx.moveTo(side * 8 + side * (tuck < 0.8 ? 4 : 0), fy);
    ctx.lineTo(side * 8 + side * (tuck < 0.8 ? 4 : 0) + f * 6, fy);
    ctx.stroke();
  }

  // Body: a yellow highlighter bean outlined in blue ink.
  wobblyBlob(ctx, 0, -PLAYER_H * 0.52, 17, 19, 3.3, 0.9, boil);
  const g = ctx.createLinearGradient(-14, -PLAYER_H, 14, -4);
  g.addColorStop(0, "#fff08a");
  g.addColorStop(1, "#f7c948");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // Hatching on the shaded side.
  ctx.strokeStyle = "rgba(190,130,20,0.55)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const hx = -f * (6 + i * 3.2);
    scribbleLine(ctx, hx, -14 - i * 2, hx + f * 4, -26 - i * 2, i + boil, 0.6);
  }
  ctx.stroke();

  // Eyes look the way it is heading.
  const ex = f * 4;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (const dx of [-6, 6]) {
    ctx.beginPath();
    ctx.arc(ex + dx, -PLAYER_H * 0.58, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  if (!p.alive) {
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (const dx of [-6, 6]) {
      ctx.moveTo(ex + dx - 3, -PLAYER_H * 0.58 - 3);
      ctx.lineTo(ex + dx + 3, -PLAYER_H * 0.58 + 3);
      ctx.moveTo(ex + dx + 3, -PLAYER_H * 0.58 - 3);
      ctx.lineTo(ex + dx - 3, -PLAYER_H * 0.58 + 3);
    }
    ctx.stroke();
  } else {
    for (const dx of [-6, 6]) {
      ctx.beginPath();
      ctx.arc(ex + dx + f * 1.6, -PLAYER_H * 0.58 + (p.vy < 0 ? 1 : -0.5), 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Mouth.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  if (p.alive) {
    ctx.moveTo(ex - 4, -PLAYER_H * 0.38);
    ctx.quadraticCurveTo(ex, -PLAYER_H * 0.38 + (p.vy > 0 ? 5 : 2), ex + 4, -PLAYER_H * 0.38);
  } else {
    ctx.moveTo(ex - 4, -PLAYER_H * 0.34);
    ctx.quadraticCurveTo(ex, -PLAYER_H * 0.42, ex + 4, -PLAYER_H * 0.34);
  }
  ctx.stroke();

  // The pen-nib nose: points where you would shoot.
  ctx.save();
  ctx.translate(0, -PLAYER_H * 0.9);
  ctx.rotate(Math.PI / 2 - p.aim);
  const rec = p.firing > 0 ? -3 * (p.firing / 0.3) : 0;
  ctx.translate(0, rec);
  ctx.fillStyle = "#3d5afe";
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(-4, -13);
  ctx.lineTo(0, -19);
  ctx.lineTo(4, -13);
  ctx.lineTo(6, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-2, -4);
  ctx.lineTo(-1.5, -12);
  ctx.stroke();
  ctx.restore();

  // Dizzy stars after a monster hit.
  if (!p.alive && p.cause === "monster") {
    ctx.fillStyle = "#f5c542";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const a = p.deadT * 8 + (i / 3) * Math.PI * 2;
      const sx = Math.cos(a) * 18;
      const sy2 = -PLAYER_H - 8 + Math.sin(a) * 5;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? 2.4 : 5.5;
        const aa = (k / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(sx + Math.cos(aa) * r, sy2 + Math.sin(aa) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- monsters, pickups, bullets

export function drawMonster(ctx: Ctx, m: Monster, c: Cam, playerX: number, playerY: number) {
  const sy = toScreenY(c, m.y);
  if (sy < -80 || sy > c.h + 80) return;
  const boil = Math.floor(c.time * BOIL_RATE);
  ctx.save();
  ctx.translate(m.x, sy);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (!m.alive) {
    // A little puff of ink and stars.
    const t = m.deadT;
    if (t > 0.5) {
      ctx.restore();
      return;
    }
    ctx.globalAlpha = clamp(1 - t * 2, 0, 1);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 10 + t * 70, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (14 + t * 50), Math.sin(a) * (14 + t * 50));
      ctx.lineTo(Math.cos(a) * (24 + t * 80), Math.sin(a) * (24 + t * 80));
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  const bob = Math.sin(m.phase) * 2.5;
  ctx.translate(0, bob);
  // Which way the eyes look.
  const lx = clamp((playerX - m.x) / 90, -1, 1) * 2;
  const ly = clamp(-(playerY - m.y) / 90, -1, 1) * 2;

  if (m.kind === "blob") {
    wobblyBlob(ctx, 0, 0, 24, 21, m.id, 1, boil, 5, m.phase);
    ctx.fillStyle = "#c2a4f2";
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    // Spots and tentacles.
    ctx.fillStyle = "rgba(120,80,190,0.45)";
    for (const [dx, dy, r] of [[-11, 6, 4], [10, 9, 3], [3, -13, 3.4]] as const) {
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (const dx of [-14, 0, 14]) {
      ctx.moveTo(dx, 17);
      ctx.quadraticCurveTo(dx + Math.sin(m.phase + dx) * 5, 26, dx + 2, 29);
    }
    ctx.stroke();
    eyes(ctx, [-8, 8], -4, 6, lx, ly);
    // Zig-zag grin.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    for (let i = 0; i < 6; i++) ctx.lineTo(-10 + (i + 1) * 3.4, 8 + (i % 2 ? 0 : 5));
    ctx.stroke();
  } else if (m.kind === "bat") {
    const flap = Math.sin(m.phase * 3.2);
    ctx.fillStyle = "#59607a";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 8, -2);
      ctx.quadraticCurveTo(side * 26, -22 - flap * 12, side * 40, -6 - flap * 16);
      ctx.quadraticCurveTo(side * 34, 2 - flap * 6, side * 28, 4 - flap * 4);
      ctx.quadraticCurveTo(side * 22, 8, side * 17, 5 - flap * 2);
      ctx.quadraticCurveTo(side * 12, 9, side * 7, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    wobblyBlob(ctx, 0, 2, 13, 15, m.id, 0.8, boil);
    ctx.fillStyle = "#3a4058";
    ctx.fill();
    ctx.stroke();
    // Ears and angry red eyes.
    ctx.beginPath();
    ctx.moveTo(-9, -10);
    ctx.lineTo(-11, -22);
    ctx.lineTo(-3, -13);
    ctx.moveTo(9, -10);
    ctx.lineTo(11, -22);
    ctx.lineTo(3, -13);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ff5252";
    for (const dx of [-5, 5]) {
      ctx.beginPath();
      ctx.arc(dx + lx * 0.5, -2 + ly * 0.5, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(-4, 8);
    ctx.lineTo(-2, 13);
    ctx.lineTo(0, 8);
    ctx.moveTo(0, 8);
    ctx.lineTo(2, 13);
    ctx.lineTo(4, 8);
    ctx.fill();
  } else {
    // The brute: big, red and horned; cracks show as it takes hits.
    wobblyBlob(ctx, 0, 0, 33, 28, m.id, 1.3, boil, 3, m.phase * 0.5);
    ctx.fillStyle = m.hp < 3 ? "#f98b8b" : "#f46a6a";
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#fff4d6";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 16, -22);
      ctx.quadraticCurveTo(side * 30, -34, side * 28, -46);
      ctx.quadraticCurveTo(side * 22, -34, side * 8, -24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    eyes(ctx, [-12, 12], -5, 8, lx, ly);
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-20, -17);
    ctx.lineTo(-5, -11);
    ctx.moveTo(20, -17);
    ctx.lineTo(5, -11);
    ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-14, 12);
    for (let i = 0; i < 8; i++) ctx.lineTo(-14 + (i + 1) * 3.5, 12 + (i % 2 ? 0 : 7));
    ctx.stroke();
    if (m.hp < 3) {
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-3, -26);
      ctx.lineTo(1, -18);
      ctx.lineTo(-4, -12);
      if (m.hp < 2) {
        ctx.moveTo(18, 4);
        ctx.lineTo(10, 10);
        ctx.lineTo(14, 18);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function eyes(ctx: Ctx, xs: number[], y: number, r: number, lx: number, ly: number) {
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  for (const x of xs) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  for (const x of xs) {
    ctx.beginPath();
    ctx.arc(x + lx, y + ly, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawJetItem(ctx: Ctx, j: Jet, c: Cam) {
  if (j.taken) return;
  const sy = toScreenY(c, j.y);
  if (sy < -40 || sy > c.h + 40) return;
  const bob = Math.sin(c.time * 4 + j.x) * 3;
  ctx.save();
  ctx.translate(j.x, sy + bob);
  ctx.lineJoin = "round";
  ctx.fillStyle = "rgba(255,230,120,0.5)";
  ctx.beginPath();
  ctx.arc(0, 0, 22 + Math.sin(c.time * 5) * 2, 0, Math.PI * 2);
  ctx.fill();
  for (const dx of [-6, 6]) {
    ctx.fillStyle = "#e0463c";
    wobblyBox(ctx, dx - 5, -13, 10, 24, 4, 5 + dx, 0.5, 0);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = "#f5c542";
    ctx.fillRect(dx - 5, -6, 10, 4);
  }
  ctx.restore();
}

export function drawBullet(ctx: Ctx, x: number, y: number, vx: number, vy: number, c: Cam) {
  const sy = toScreenY(c, y);
  ctx.strokeStyle = "rgba(61,90,254,0.45)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, sy);
  ctx.lineTo(x - vx * 0.03, sy + vy * 0.03);
  ctx.stroke();
  ctx.fillStyle = "#3d5afe";
  ctx.beginPath();
  ctx.arc(x, sy, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
}
