// Sugar Swap's heads-up display, drawn on the canvas: level name, moves, score with a three-star bar, and
// the goal. Portrait puts it in a strip above the board; landscape puts it in a column to the left.
import { DISPLAY_FONT, FONT, roundRect, text } from "../../kit/draw";
import { formatNumber } from "../../kit/format";
import type { Layout } from "./stage";

export interface HudInfo {
  levelNo: number;
  name: string;
  moves: number;
  shownScore: number;
  stars: [number, number, number];
  goalType: "score" | "frosting" | "ingredients";
  goalText: string;
  goalMet: boolean;
  best: number;
  time: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the menu (pause) button is, so the pointer handler and the drawing agree. */
export function menuButton(L: Layout): Rect {
  return L.landscape ? { x: 14, y: L.h - 50, w: 108, h: 38 } : { x: L.w - 54, y: 8, w: 42, h: 42 };
}

export const inRect = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

function starShape(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.48 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawStarBar(ctx: CanvasRenderingContext2D, info: HudInfo, x: number, y: number, w: number) {
  const h = 12;
  const max = info.stars[2] * 1.06;
  const frac = Math.min(1, info.shownScore / max);
  roundRect(ctx, x, y, w, h, 6);
  ctx.fillStyle = "rgba(20,5,40,0.65)";
  ctx.fill();
  if (frac > 0.01) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, "#f472b6");
    g.addColorStop(1, "#fde047");
    roundRect(ctx, x, y, Math.max(h, w * frac), h, 6);
    ctx.fillStyle = g;
    ctx.fill();
  }
  const marks =
    info.goalType === "score"
      ? [info.stars[0] / max, info.stars[1] / max, info.stars[2] / max]
      : [0.02, info.stars[1] / max, info.stars[2] / max];
  const reached = [info.goalType === "score" ? info.shownScore >= info.stars[0] : info.goalMet, info.shownScore >= info.stars[1] && info.goalMet, info.shownScore >= info.stars[2] && info.goalMet];
  marks.forEach((m, i) => {
    const sx = Math.min(x + w - 8, Math.max(x + 8, x + w * m));
    const sy = y + h / 2;
    const r = 10;
    starShape(ctx, sx, sy, r);
    ctx.fillStyle = reached[i] ? "#fde047" : "#4c2a7a";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = reached[i] ? "#b45309" : "rgba(255,255,255,0.55)";
    ctx.stroke();
  });
}

function drawMoves(ctx: CanvasRenderingContext2D, info: HudInfo, r: Rect) {
  const low = info.moves <= 5;
  const pulse = low ? 0.5 + 0.5 * Math.sin(info.time * 8) : 0;
  roundRect(ctx, r.x, r.y, r.w, r.h, 12);
  ctx.fillStyle = low ? `rgba(127,29,29,${0.7 + 0.2 * pulse})` : "rgba(20,5,40,0.65)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = low ? "#fca5a5" : "rgba(255,255,255,0.25)";
  ctx.stroke();
  text(ctx, "MOVES", r.x + r.w / 2, r.y + 12, { size: 10, color: "rgba(255,255,255,0.7)", weight: 800 });
  text(ctx, String(info.moves), r.x + r.w / 2, r.y + r.h / 2 + 8, { size: r.h > 50 ? 34 : 28, color: low ? "#fecaca" : "#ffffff", font: DISPLAY_FONT, weight: 900 });
}

function drawGoal(ctx: CanvasRenderingContext2D, info: HudInfo, x: number, y: number, maxW: number, align: CanvasTextAlign = "left") {
  const label = info.goalText;
  ctx.font = `700 13px ${FONT}`;
  const tw = Math.min(maxW - 24, ctx.measureText(label).width);
  const ix = align === "left" ? x + 8 : x + maxW / 2 - tw / 2 - 12;
  // Check mark or bullet.
  ctx.beginPath();
  ctx.arc(ix, y, 7, 0, Math.PI * 2);
  ctx.fillStyle = info.goalMet ? "#4ade80" : "rgba(255,255,255,0.25)";
  ctx.fill();
  if (info.goalMet) {
    ctx.strokeStyle = "#064e3b";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ix - 3, y);
    ctx.lineTo(ix - 0.5, y + 2.8);
    ctx.lineTo(ix + 3.5, y - 2.6);
    ctx.stroke();
  }
  text(ctx, label, ix + 14, y + 0.5, { size: 13, color: info.goalMet ? "#bbf7d0" : "#fdf2f8", align: "left", weight: 700 });
}

export function drawHud(ctx: CanvasRenderingContext2D, L: Layout, info: HudInfo) {
  const menu = menuButton(L);
  // Menu button: two pause bars.
  roundRect(ctx, menu.x, menu.y, menu.w, menu.h, 12);
  ctx.fillStyle = "rgba(20,5,40,0.65)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.stroke();
  if (L.landscape) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(menu.x + 16, menu.y + 11, 5, 16);
    ctx.fillRect(menu.x + 26, menu.y + 11, 5, 16);
    text(ctx, "Menu", menu.x + 40, menu.y + menu.h / 2 + 1, { size: 14, align: "left", weight: 800 });
  } else {
    ctx.fillStyle = "#fff";
    ctx.fillRect(menu.x + 14, menu.y + 12, 5, 18);
    ctx.fillRect(menu.x + 23, menu.y + 12, 5, 18);
  }

  const title = `LEVEL ${info.levelNo}  ·  ${info.name.toUpperCase()}`;
  if (!L.landscape) {
    text(ctx, title, 14, 14, { size: 12, color: "#f9a8d4", align: "left", weight: 800 });
    text(ctx, formatNumber(info.shownScore), 14, 40, { size: 30, color: "#fff", align: "left", font: DISPLAY_FONT, weight: 900 });
    if (info.best > 0) text(ctx, `Best ${formatNumber(Math.max(info.best, info.shownScore))}`, 14, 59, { size: 11, color: "rgba(255,255,255,0.55)", align: "left", weight: 600 });
    drawMoves(ctx, info, { x: L.w - 150, y: 6, w: 90, h: 46 });
    drawStarBar(ctx, info, 18, 70, L.w - 36);
    drawGoal(ctx, info, 12, 97, L.w - 24);
  } else {
    const w = L.bx - 8 - 14 - 10;
    text(ctx, `LEVEL ${info.levelNo}`, 14, 20, { size: 12, color: "#f9a8d4", align: "left", weight: 800 });
    text(ctx, info.name, 14, 42, { size: 22, color: "#fff", align: "left", font: DISPLAY_FONT, weight: 900 });
    text(ctx, formatNumber(info.shownScore), 14, 84, { size: 34, color: "#fff", align: "left", font: DISPLAY_FONT, weight: 900 });
    if (info.best > 0) text(ctx, `Best ${formatNumber(Math.max(info.best, info.shownScore))}`, 14, 106, { size: 11, color: "rgba(255,255,255,0.55)", align: "left", weight: 600 });
    drawStarBar(ctx, info, 24, 128, w - 22);
    drawMoves(ctx, info, { x: 14, y: 156, w: 104, h: 64 });
    drawGoal(ctx, info, 12, 246, w);
  }
}
