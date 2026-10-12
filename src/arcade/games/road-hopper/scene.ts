// Road Hopper scene: works out where the bunny is on screen (hop arcs, squash and stretch, death animations),
// follows it with the camera, and paints the world back to front.
import { clamp, damp, lerp, withAlpha, type Ctx } from "../../kit/draw";
import {
  H_GRASS, H_RAIL, H_ROAD, H_WATER, HH, HW, drawBunny, drawCoin, drawGround, drawHawk, drawLog, drawPad, drawSignal, drawTrain,
  drawTree, drawVehicle, groundEllipse, rowHeight, setOrigin, sx, sy,
} from "./art";
import {
  BACK_GRAB, DRAW_COLS, HALF_COLS, HOP_TIME, IDLE_GRAB, IDLE_WARN, birdWarn, logX, rowAt, supportingLog, trainState, vehicleX,
  type HopperState, type Row,
} from "./logic";

export interface Vis {
  camC: number;
  camR: number;
  /** Seconds since the last landing, for the landing squash. */
  landT: number;
  /** Computed each frame from the game state. */
  pc: number;
  pr: number;
  z: number;
  sY: number;
  sXZ: number;
  alpha: number;
  ear: number;
  hawk: { c: number; r: number; z: number; flap: number } | null;
  warn: number;
  groundZ: number;
  /** Ripple rings from a splash, seconds since the splash (-1 for none). */
  splashT: number;
}

export function newVis(): Vis {
  return { camC: 0, camR: 0, landT: 9, pc: 0, pr: 0, z: H_GRASS, sY: 1, sXZ: 1, alpha: 1, ear: 0, hawk: null, warn: 0, groundZ: H_GRASS, splashT: -1 };
}

/** The height of the surface the bunny stands on at (row, x). */
function standZ(s: HopperState, row: number, x: number) {
  const r = rowAt(s, row);
  if (!r) return H_GRASS;
  if (r.kind === "river") {
    if (r.lane === "pads") return H_WATER + 0.05;
    const saved = s.x;
    const savedRow = s.row;
    s.x = x;
    s.row = row;
    const on = supportingLog(s, r);
    s.x = saved;
    s.row = savedRow;
    return on ? H_WATER + 0.3 : H_WATER;
  }
  return rowHeight(r.kind);
}

/** Work out everything about the bunny's pose for this frame. */
export function updateVis(v: Vis, s: HopperState, dt: number, time: number) {
  const hopping = s.hopT < HOP_TIME;
  const u = hopping ? s.hopT / HOP_TIME : 1;
  const e = hopping ? u * (2 - u) : 1;
  v.pc = hopping ? lerp(s.hopFrom.x, s.x, e) : s.x;
  v.pr = hopping ? lerp(s.hopFrom.row, s.row, e) : s.row;
  const baseZ = hopping ? lerp(standZ(s, s.hopFrom.row, s.hopFrom.x), standZ(s, s.row, s.x), e) : standZ(s, s.row, s.x);
  v.groundZ = baseZ;
  v.z = baseZ + (hopping ? Math.sin(Math.PI * u) * 0.8 : 0);
  v.alpha = 1;
  v.hawk = null;
  v.ear = Math.sin(time * 5) * 0.4;
  v.landT += dt;
  if (hopping) {
    v.landT = 0;
    // Stretch in the air, a little squashed as it pushes off.
    v.sY = 1 + 0.3 * Math.sin(Math.PI * u) - 0.2 * Math.max(0, 1 - u * 6);
    v.ear = -0.9;
  } else if (v.landT < 0.2) {
    v.sY = 1 - 0.24 * Math.sin((v.landT / 0.2) * Math.PI) * (1 - v.landT / 0.2 * 0.4);
  } else {
    v.sY = 1 + Math.sin(time * 3) * 0.015;
  }
  v.warn = s.alive ? birdWarn(s) : 0;
  v.splashT = !s.alive && s.cause === "water" ? s.deadT : -1;

  // The hawk circles lower and lower as its warning runs out.
  if (s.alive && v.warn > 0) {
    const w = v.warn;
    const a = time * 1.9;
    const rad = 6.5 * (1 - w) + 1.6;
    v.hawk = { c: v.pc + Math.cos(a) * rad, r: v.pr + Math.sin(a) * rad, z: 5.5 * (1 - w) + 2.6, flap: time * 11 };
  }

  if (!s.alive) {
    const t = s.deadT;
    if (s.cause === "car" || s.cause === "train") {
      const k = Math.min(1, t / 0.07);
      v.sY = lerp(1, 0.12, k);
      v.sXZ = 1 / Math.sqrt(Math.max(0.12, v.sY));
      v.z = baseZ;
      v.ear = 0;
    } else if (s.cause === "water") {
      v.sY = Math.max(0.3, 1 - t * 1.5);
      v.z = H_WATER - Math.min(0.5, t * 0.9);
      v.alpha = clamp(1 - t / 0.55, 0, 1);
    } else if (s.cause === "edge") {
      v.sY = 1;
      v.z = baseZ - Math.max(0, t - 0.5) * Math.max(0, t - 0.5) * 6;
      v.alpha = clamp(1 - (t - 0.5) / 0.6, 0, 1);
    } else if (s.cause === "bird") {
      // Swoop in, grab, and carry the bunny away.
      const swoop = clamp(t / 0.4, 0, 1);
      const away = Math.max(0, t - 0.4);
      const hc0 = v.pc + 4;
      const hr0 = v.pr + 4;
      const hz0 = 4.2;
      const hc = lerp(hc0, v.pc, swoop * swoop) - away * 7;
      const hr = lerp(hr0, v.pr, swoop * swoop) + away * 7;
      const hz = lerp(hz0, baseZ + 0.7, swoop * swoop) + away * away * 9 + away * 3;
      v.hawk = { c: hc, r: hr, z: hz, flap: time * 14 };
      if (t > 0.4) {
        v.pc = hc;
        v.pr = hr;
        v.z = hz - 0.65;
        v.sY = 1.15;
        v.sXZ = 0.92;
      }
      v.alpha = away > 0.9 ? clamp(1 - (away - 0.9) * 2, 0, 1) : 1;
    }
  }
  if (s.alive || s.cause === "bird" || (s.cause !== "car" && s.cause !== "train")) {
    v.sXZ = 1 / Math.sqrt(Math.max(0.3, v.sY));
  }
  if (!s.alive && s.cause === "bird" && s.deadT > 0.4) v.sXZ = 0.92;

  // The camera follows with a little smoothing, looking ahead of the bunny a touch.
  if (v.camC === 0 && v.camR === 0 && time < 0.05) {
    v.camC = v.pc;
    v.camR = v.pr;
  }
  const lookC = v.pc;
  const lookR = v.pr;
  v.camC = damp(v.camC, lookC, 7, dt);
  v.camR = damp(v.camR, lookR, 7, dt);
}

export function snapCamera(v: Vis, s: HopperState) {
  v.camC = s.x;
  v.camR = s.row;
  v.pc = s.x;
  v.pr = s.row;
  v.landT = 9;
}

// ---------------------------------------------------------------- painting

function drawBackdrop(ctx: Ctx, w: number, h: number, time: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#9fd8ff");
  g.addColorStop(1, "#e6f5ff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (let i = 0; i < 6; i++) {
    const x = ((i * 233 + time * (6 + i * 2)) % (w + 240)) - 120;
    const y = 40 + ((i * 97) % Math.max(60, h * 0.7));
    ctx.beginPath();
    ctx.ellipse(x, y, 60, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 30, y - 8, 30, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 26, y - 10, 34, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

type Only = "all" | "before" | "after";

function drawRowObjects(ctx: Ctx, s: HopperState, row: Row, c0: number, c1: number, time: number, only: Only, split: number) {
  const r = row.index;
  const flatPhase = only !== "after";
  const solidBefore = only === "all" || only === "before";
  const solidAfter = only === "all" || only === "after";
  switch (row.kind) {
    case "grass": {
      const h = H_GRASS;
      if (flatPhase) for (const c of row.coins) if (c >= c0 - 1 && c <= c1 + 1) drawCoin(ctx, c, r, h, time);
      for (let c = c0; c <= c1; c++) {
        if (!row.trees.includes(c)) continue;
        if (only === "before" && c >= split) continue;
        if (only === "after" && c < split) continue;
        drawTree(ctx, c, r, h);
      }
      break;
    }
    case "road": {
      if (flatPhase) for (const c of row.coins) if (c >= c0 - 1 && c <= c1 + 1) drawCoin(ctx, c, r, H_ROAD, time);
      for (const v of row.vehicles) {
        const x = vehicleX(row, v, time);
        if (x < c0 - 2 || x > c1 + 2) continue;
        if ((only === "before" && x >= split) || (only === "after" && x < split)) continue;
        drawVehicle(ctx, row, v, x);
      }
      break;
    }
    case "rail": {
      const st = trainState(row, time);
      if (flatPhase) {
        for (const c of row.coins) if (c >= c0 - 1 && c <= c1 + 1) drawCoin(ctx, c, r, H_RAIL, time);
        if (c0 <= -5 && c1 >= -6) drawSignal(ctx, -5.4, r, st.light, time);
      }
      if (solidAfter && c1 >= 5) drawSignal(ctx, 5.4, r, st.light, time);
      if (solidBefore || solidAfter) drawTrain(ctx, row, time, c0, c1, only, split);
      break;
    }
    case "river": {
      if (flatPhase) {
        if (row.lane === "pads") {
          for (const c of row.pads) {
            drawPad(ctx, c, r, time);
          }
          for (const c of row.coins) drawCoin(ctx, c, r, H_WATER + 0.05, time);
        } else {
          for (const l of row.logs) {
            const x = logX(row, l, time);
            if (x < c0 - 3 || x > c1 + 3) continue;
            drawLog(ctx, row, l, x, time);
          }
        }
      }
      break;
    }
  }
}

/** Paint the whole scene. (w, h) is the logical canvas size. */
export function drawWorld(ctx: Ctx, w: number, h: number, s: HopperState, v: Vis, time: number) {
  drawBackdrop(ctx, w, h, time);
  // The bunny sits a bit left of and below the middle so there is more room ahead (up and to the right).
  const ax = w * 0.4;
  const ay = h * 0.64;
  setOrigin(ax - (v.camC + v.camR) * HW, ay - (v.camC - v.camR) * HH + (v.groundZ > 0 ? 0 : 0));
  const ox = ax - (v.camC + v.camR) * HW;
  const oy = ay - (v.camC - v.camR) * HH;

  const pRow = Math.round(v.pr);
  const rLo = Math.max(-10, Math.floor(v.camR) - 48);
  const rHi = Math.min(s.rows.length - 11, Math.floor(v.camR) + 48);
  const M = 70;
  for (let r = rHi; r >= rLo; r--) {
    const row = rowAt(s, r);
    if (!row) continue;
    // Which columns of this row can be on screen at all?
    const xLo = (-M - ox) / HW - r;
    const xHi = (w + M - ox) / HW - r;
    const yLo = (-M - 40 - oy) / HH + r;
    const yHi = (h + 40 - oy) / HH + r;
    const c0 = Math.max(-DRAW_COLS, Math.ceil(Math.max(xLo, yLo)));
    const c1 = Math.min(DRAW_COLS, Math.floor(Math.min(xHi, yHi)));
    if (c0 > c1) continue;
    drawGround(ctx, row, c0, c1, rowAt(s, r + 1), time);

    if (r === pRow) {
      // Shadow (and the hawk's warning shadow) under the bunny, then the row in depth order around it.
      const gz = rowHeight(row.kind);
      if (v.alpha > 0 && (s.alive || s.cause !== "water")) groundEllipse(ctx, v.pc, v.pr, row.kind === "river" ? H_WATER + 0.005 : gz, 0.34 * (1 - Math.min(0.5, (v.z - v.groundZ) * 0.5)), "rgba(0,0,0,0.22)");
      if (v.warn > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 14);
        groundEllipse(ctx, v.pc, v.pr, row.kind === "river" ? H_WATER + 0.01 : gz, 0.5 + v.warn * 0.7, withAlpha("#1a1a2e", 0.2 + v.warn * 0.25 + pulse * 0.08 * v.warn));
      }
      if (v.splashT >= 0) drawSplash(ctx, v, v.splashT);
      drawRowObjects(ctx, s, row, c0, c1, time, "before", v.pc);
      if (v.alpha > 0) {
        drawBunny(ctx, { c: v.pc, r: v.pr, z: v.z, sY: v.sY, sXZ: v.sXZ, facing: s.facing, ear: v.ear, alpha: v.alpha });
      }
      drawRowObjects(ctx, s, row, c0, c1, time, "after", v.pc);
    } else {
      drawRowObjects(ctx, s, row, c0, c1, time, "all", 0);
    }
  }
  if (v.hawk) drawHawk(ctx, v.hawk.c, v.hawk.r, v.hawk.z, v.hawk.flap, 1);
  // Soft vignette so the corners fall away.
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(10,30,60,0)");
  g.addColorStop(1, "rgba(10,30,60,0.22)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  void HALF_COLS;
  void IDLE_GRAB;
  void IDLE_WARN;
  void BACK_GRAB;
  void H_RAIL;
  void sx;
  void sy;
}

/** Expanding rings where the bunny went in. */
function drawSplash(ctx: Ctx, v: Vis, t: number) {
  for (let i = 0; i < 3; i++) {
    const k = clamp((t - i * 0.12) / 0.8, 0, 1);
    if (k <= 0 || k >= 1) continue;
    ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.8})`;
    ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath();
    ctx.ellipse(sx(v.pc, v.pr), sy(v.pc, v.pr, H_WATER + 0.01), (0.3 + k * 1.1) * HW * 1.414, (0.3 + k * 1.1) * HH * 1.414, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}
