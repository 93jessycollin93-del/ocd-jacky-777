// Maze Muncher's characters, drawn in code: the muncher, the four hunters (each with its own head
// decoration) and the eight bonus items.
import { shade, withAlpha } from "../../kit/draw";

type Ctx = CanvasRenderingContext2D;

const ROT = [-Math.PI / 2, Math.PI, Math.PI / 2, 0]; // up, left, down, right

export function drawMuncher(ctx: Ctx, x: number, y: number, r: number, dir: number, mouth: number, collapse = 0) {
  // `mouth` runs 0..1 (closed..open); `collapse` 0..1 plays the death animation.
  const open = collapse > 0 ? collapse * Math.PI : mouth * 0.75;
  const rot = ROT[dir];
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, "#ffe27a");
  g.addColorStop(1, "#ffab1f");
  ctx.fillStyle = g;
  ctx.beginPath();
  if (open >= Math.PI - 0.01) return;
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, rot + open, rot + Math.PI * 2 - open);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(180,90,0,0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // A little eye, on the upper side of the face.
  const ex = x + Math.cos(rot - 0.95) * r * 0.5;
  const ey = y + Math.sin(rot - 0.95) * r * 0.5;
  if (collapse < 0.5) {
    ctx.fillStyle = "#3b1d00";
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
}

export type HunterLook = "normal" | "scared" | "flash" | "eyes";

export function drawHunter(
  ctx: Ctx, x: number, y: number, r: number, color: string, id: number, dir: number, frame: number, look: HunterLook,
) {
  if (look !== "eyes") {
    const scared = look === "scared" || look === "flash";
    const body = look === "scared" ? "#2336d4" : look === "flash" ? "#f4f6ff" : color;
    const bot = y + r * 0.95;
    const w = (r * 2) / 4;
    ctx.beginPath();
    // The skirt is a zigzag whose teeth swap every few frames.
    const hem = (i: number) => bot - ((i + frame) & 1 ? 0 : r * 0.28);
    ctx.moveTo(x - r, hem(4));
    ctx.lineTo(x - r, y);
    ctx.arc(x, y, r, Math.PI, 0);
    ctx.lineTo(x + r, hem(0));
    for (let i = 1; i <= 4; i++) ctx.lineTo(x + r - i * w, hem(i));
    ctx.closePath();
    if (!scared) {
      const g = ctx.createLinearGradient(x, y - r, x, bot);
      g.addColorStop(0, shade(body, 0.12));
      g.addColorStop(1, shade(body, -0.12));
      ctx.fillStyle = g;
    } else ctx.fillStyle = body;
    ctx.fill();
    if (!scared) drawHat(ctx, x, y, r, color, id, frame);
    if (scared) {
      const face = look === "flash" ? "#e0301e" : "#ffd9c2";
      ctx.fillStyle = face;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + s * r * 0.36, y - r * 0.12, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = face;
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath();
      const mx = x - r * 0.62;
      const my = y + r * 0.4;
      ctx.moveTo(mx, my);
      for (let i = 1; i <= 5; i++) ctx.lineTo(mx + (i * r * 1.24) / 5, my + (i & 1 ? -r * 0.14 : r * 0.14));
      ctx.stroke();
      return;
    }
  }
  // Eyes looking where the hunter is heading.
  const dx = dir === 3 ? 1 : dir === 1 ? -1 : 0;
  const dy = dir === 2 ? 1 : dir === 0 ? -1 : 0;
  for (const s of [-1, 1]) {
    const ex = x + s * r * 0.4;
    const ey = y - r * 0.12;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.27, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look === "eyes" ? "#3a63ff" : "#16213e";
    ctx.beginPath();
    ctx.arc(ex + dx * r * 0.13, ey + dy * r * 0.17, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Each hunter wears something different on its head, so you can tell them apart at a glance. */
function drawHat(ctx: Ctx, x: number, y: number, r: number, color: string, id: number, frame: number) {
  ctx.save();
  if (id === 0) {
    // A flickering flame tuft.
    ctx.fillStyle = "#ffd25a";
    ctx.beginPath();
    const f = frame & 1 ? 1 : 0.8;
    ctx.moveTo(x - r * 0.3, y - r * 0.85);
    ctx.quadraticCurveTo(x - r * 0.3, y - r * 1.4 * f, x - r * 0.05, y - r * 1.5 * f);
    ctx.quadraticCurveTo(x, y - r * 1.2, x + r * 0.12, y - r * 1.3);
    ctx.quadraticCurveTo(x + r * 0.4, y - r * 1.1, x + r * 0.3, y - r * 0.85);
    ctx.closePath();
    ctx.fill();
  } else if (id === 1) {
    // Two little horns.
    ctx.fillStyle = "#f4e4ff";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * r * 0.35, y - r * 0.9);
      ctx.lineTo(x + s * r * 0.75, y - r * 1.4);
      ctx.lineTo(x + s * r * 0.75, y - r * 0.6);
      ctx.closePath();
      ctx.fill();
    }
  } else if (id === 2) {
    // Ice crystals.
    ctx.fillStyle = "#e8fffb";
    for (const [dx, h] of [[-0.45, 0.45], [0, 0.65], [0.45, 0.45]] as const) {
      ctx.beginPath();
      ctx.moveTo(x + dx * r - r * 0.17, y - r * 0.88);
      ctx.lineTo(x + dx * r, y - r * (1 + h));
      ctx.lineTo(x + dx * r + r * 0.17, y - r * 0.88);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // A leaf on a stem.
    ctx.strokeStyle = shade(color, -0.3);
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.98);
    ctx.lineTo(x + r * 0.1, y - r * 1.3);
    ctx.stroke();
    ctx.fillStyle = "#6fd04f";
    ctx.beginPath();
    ctx.ellipse(x + r * 0.35, y - r * 1.3, r * 0.34, r * 0.17, -0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The eight bonus items, centred on (x, y), about 2r across. */
export function drawBonus(ctx: Ctx, kind: number, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = "round";
  switch (kind) {
    case 0: {
      // Berry
      ctx.fillStyle = "#e5284a";
      ctx.beginPath();
      ctx.arc(0, r * 0.15, r * 0.78, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(-r * 0.28, -r * 0.1, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.ellipse(r * 0.2, -r * 0.7, r * 0.4, r * 0.18, -0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 1: {
      // Lemon
      ctx.fillStyle = "#ffe14d";
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.quadraticCurveTo(-r * 0.6, -r * 0.85, 0, -r * 0.8);
      ctx.quadraticCurveTo(r * 0.6, -r * 0.85, r, 0);
      ctx.quadraticCurveTo(r * 0.6, r * 0.85, 0, r * 0.8);
      ctx.quadraticCurveTo(-r * 0.6, r * 0.85, -r, 0);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.ellipse(-r * 0.2, -r * 0.3, r * 0.3, r * 0.12, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 2: {
      // Plum
      ctx.fillStyle = "#8b3fd9";
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.82, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5b1fa0";
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.65);
      ctx.quadraticCurveTo(r * 0.15, 0, 0, r * 0.7);
      ctx.stroke();
      ctx.strokeStyle = "#6b4a2a";
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.lineTo(r * 0.2, -r);
      ctx.stroke();
      break;
    }
    case 3: {
      // Pear
      ctx.fillStyle = "#b7e23f";
      ctx.beginPath();
      ctx.arc(0, r * 0.38, r * 0.62, 0, Math.PI * 2);
      ctx.arc(0, -r * 0.3, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#6b4a2a";
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.65);
      ctx.lineTo(r * 0.15, -r);
      ctx.stroke();
      break;
    }
    case 4: {
      // Mushroom
      ctx.fillStyle = "#f6e9d0";
      ctx.fillRect(-r * 0.3, 0, r * 0.6, r * 0.8);
      ctx.fillStyle = "#e5413a";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      for (const [dx, dy, rr] of [[-0.45, -0.3, 0.17], [0.15, -0.55, 0.2], [0.5, -0.2, 0.14]] as const) {
        ctx.beginPath();
        ctx.arc(dx * r, dy * r, rr * r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 5: {
      // Melon
      ctx.fillStyle = "#2f9e44";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7ddc8c";
      ctx.lineWidth = r * 0.12;
      for (const k of [-0.5, 0, 0.5]) {
        ctx.beginPath();
        ctx.ellipse(k * r, 0, r * 0.28, r * 0.88, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 6: {
      // Crown
      ctx.fillStyle = "#ffcf3d";
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, r * 0.6);
      ctx.lineTo(-r * 0.9, -r * 0.5);
      ctx.lineTo(-r * 0.4, 0);
      ctx.lineTo(0, -r * 0.8);
      ctx.lineTo(r * 0.4, 0);
      ctx.lineTo(r * 0.9, -r * 0.5);
      ctx.lineTo(r * 0.9, r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e5284a";
      ctx.beginPath();
      ctx.arc(0, r * 0.2, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      // Gem
      ctx.fillStyle = "#3de0ff";
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.2);
      ctx.lineTo(-r * 0.45, -r * 0.8);
      ctx.lineTo(r * 0.45, -r * 0.8);
      ctx.lineTo(r * 0.9, -r * 0.2);
      ctx.lineTo(0, r * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = withAlpha("#ffffff", 0.7);
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.2);
      ctx.lineTo(r * 0.9, -r * 0.2);
      ctx.moveTo(-r * 0.45, -r * 0.8);
      ctx.lineTo(-r * 0.2, -r * 0.2);
      ctx.lineTo(0, r * 0.9);
      ctx.moveTo(r * 0.45, -r * 0.8);
      ctx.lineTo(r * 0.2, -r * 0.2);
      ctx.lineTo(0, r * 0.9);
      ctx.stroke();
    }
  }
  ctx.restore();
}
