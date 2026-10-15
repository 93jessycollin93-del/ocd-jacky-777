// Road Hopper art: a chunky voxel diorama drawn on canvas with an isometric (2:1) projection. Everything is boxes
// with a lit top and two shaded sides, painted back to front. Column c grows to the lower right, row r grows to
// the upper right, z is height.
import { shade, withAlpha, type Ctx } from "../../kit/draw";
import { CYCLE, DRAW_COLS, HALF_COLS, trainState, wrapX, type Log, type Row, type Vehicle } from "./logic";

/** Half a tile's width and height on screen, and the height of one unit of z. */
export const HW = 28;
export const HH = 14;
export const ZU = 26;

export const H_GRASS = 0.55;
export const H_ROAD = 0.3;
export const H_RAIL = 0.3;
export const H_WATER = 0.12;

let OX = 0;
let OY = 0;
export function setOrigin(ox: number, oy: number) {
  OX = ox;
  OY = oy;
}
export const sx = (c: number, r: number) => OX + (c + r) * HW;
export const sy = (c: number, r: number, z: number) => OY + (c - r) * HH - z * ZU;

/** Inverse of the projection at z = 0 (used to work out which rows and columns are on screen). */
export function rowHeight(kind: Row["kind"]) {
  return kind === "grass" ? H_GRASS : kind === "river" ? H_WATER : kind === "rail" ? H_RAIL : H_ROAD;
}

// ---------------------------------------------------------------- boxes

type Faces = [string, string, string];
const faceCache = new Map<string, Faces>();
/** Lit top, left side, right side (the right is the darkest). */
export function faces(col: string): Faces {
  let f = faceCache.get(col);
  if (!f) {
    f = [shade(col, 0.03), shade(col, -0.1), shade(col, -0.22)];
    faceCache.set(col, f);
  }
  return f;
}

function quad(ctx: Ctx, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number, fill: string) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.lineTo(dx, dy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** A box centred on tile position (c, r) standing on height z, sized dc × dr × dz. */
export function box(ctx: Ctx, c: number, r: number, z: number, dc: number, dr: number, dz: number, col: string | Faces) {
  const [top, left, right] = typeof col === "string" ? faces(col) : col;
  const c0 = c - dc / 2;
  const c1 = c + dc / 2;
  const r0 = r - dr / 2;
  const r1 = r + dr / 2;
  const z1 = z + dz;
  // Left face (the side toward -r).
  quad(ctx, sx(c0, r0), sy(c0, r0, z), sx(c1, r0), sy(c1, r0, z), sx(c1, r0), sy(c1, r0, z1), sx(c0, r0), sy(c0, r0, z1), left);
  // Right face (the side toward +c).
  quad(ctx, sx(c1, r0), sy(c1, r0, z), sx(c1, r1), sy(c1, r1, z), sx(c1, r1), sy(c1, r1, z1), sx(c1, r0), sy(c1, r0, z1), right);
  // Top.
  quad(ctx, sx(c0, r0), sy(c0, r0, z1), sx(c1, r0), sy(c1, r0, z1), sx(c1, r1), sy(c1, r1, z1), sx(c0, r1), sy(c0, r1, z1), top);
}

/** A flat rectangle on the ground (or at height z). */
function flat(ctx: Ctx, c0: number, c1: number, r0: number, r1: number, z: number, fill: string) {
  quad(ctx, sx(c0, r0), sy(c0, r0, z), sx(c1, r0), sy(c1, r0, z), sx(c1, r1), sy(c1, r1, z), sx(c0, r1), sy(c0, r1, z), fill);
}

/** A soft round shadow or ring on the ground. */
export function groundEllipse(ctx: Ctx, c: number, r: number, z: number, radius: number, fill: string) {
  ctx.beginPath();
  ctx.ellipse(sx(c, r), sy(c, r, z), radius * HW * 1.414, radius * HH * 1.414, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function hash(a: number, b: number) {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// ---------------------------------------------------------------- ground rows

const PAL = {
  grassA: "#8ed46a", grassB: "#82ca5e", dirt: "#a9794c", dirtDark: "#8f633b", grassEdge: "#6db04b",
  roadA: "#555b6b", roadB: "#5d6474", roadSide: "#3d4351",
  railA: "#b9ab91", railB: "#b0a288", railSide: "#8c806b",
  waterA: "#55c9f3", waterB: "#4cc0ec", waterSide: "#2f9ccb",
};

/** Draw one row's ground between columns c0 and c1 (inclusive tile centres). */
export function drawGround(ctx: Ctx, row: Row, c0: number, c1: number, next: Row | undefined, time: number) {
  const r = row.index;
  const h = rowHeight(row.kind);
  const a = c0 - 0.5;
  const b = c1 + 0.5;
  const rn = r - 0.5;
  const rf = r + 0.5;

  // Front (left) face: a grass band over dirt, or plain slab.
  if (row.kind === "grass") {
    const band = 0.18;
    quad(ctx, sx(a, rn), sy(a, rn, 0), sx(b, rn), sy(b, rn, 0), sx(b, rn), sy(b, rn, h - band), sx(a, rn), sy(a, rn, h - band), shade(PAL.dirt, -0.08));
    quad(ctx, sx(a, rn), sy(a, rn, h - band), sx(b, rn), sy(b, rn, h - band), sx(b, rn), sy(b, rn, h), sx(a, rn), sy(a, rn, h), shade(PAL.grassEdge, -0.06));
  } else {
    const side = row.kind === "road" ? PAL.roadSide : row.kind === "rail" ? PAL.railSide : PAL.waterSide;
    quad(ctx, sx(a, rn), sy(a, rn, 0), sx(b, rn), sy(b, rn, 0), sx(b, rn), sy(b, rn, h), sx(a, rn), sy(a, rn, h), side);
  }
  // The end of the world, where the slab stops: a cliff.
  if (c1 >= DRAW_COLS) {
    quad(ctx, sx(b, rn), sy(b, rn, 0), sx(b, rf), sy(b, rf, 0), sx(b, rf), sy(b, rf, h), sx(b, rn), sy(b, rn, h), shade(row.kind === "grass" ? PAL.dirt : PAL.roadSide, -0.2));
  }

  // Top surface.
  const topA = row.kind === "grass" ? PAL.grassA : row.kind === "road" ? PAL.roadA : row.kind === "rail" ? PAL.railA : PAL.waterA;
  const topB = row.kind === "grass" ? PAL.grassB : row.kind === "road" ? PAL.roadB : row.kind === "rail" ? PAL.railB : PAL.waterB;
  flat(ctx, a, b, rn, rf, h, row.alt ? topB : topA);
  if (row.kind === "grass" || row.kind === "river") {
    // A checkerboard of slightly different tiles (cheap: one quad per other tile).
    ctx.fillStyle = row.alt ? topA : topB;
    ctx.beginPath();
    for (let c = c0; c <= c1; c++) {
      if ((c + r) & 1) continue;
      ctx.moveTo(sx(c - 0.5, rn), sy(c - 0.5, rn, h));
      ctx.lineTo(sx(c + 0.5, rn), sy(c + 0.5, rn, h));
      ctx.lineTo(sx(c + 0.5, rf), sy(c + 0.5, rf, h));
      ctx.lineTo(sx(c - 0.5, rf), sy(c - 0.5, rf, h));
      ctx.closePath();
    }
    ctx.fill();
  }

  if (row.kind === "road") {
    // Dashed centre line toward the next lane, and kerb stripes at the ends of a road.
    if (next && next.kind === "road") {
      ctx.fillStyle = "rgba(240,244,250,0.85)";
      ctx.beginPath();
      for (let k = Math.floor(c0 / 1.4) - 1; k * 1.4 < c1 + 1; k++) {
        const x0 = k * 1.4 + 0.3;
        const x1 = x0 + 0.7;
        const zz = h;
        ctx.moveTo(sx(x0, rf - 0.09), sy(x0, rf - 0.09, zz));
        ctx.lineTo(sx(x1, rf - 0.09), sy(x1, rf - 0.09, zz));
        ctx.lineTo(sx(x1, rf + 0.09), sy(x1, rf + 0.09, zz));
        ctx.lineTo(sx(x0, rf + 0.09), sy(x0, rf + 0.09, zz));
        ctx.closePath();
      }
      ctx.fill();
    }
  } else if (row.kind === "rail") {
    // Sleepers, then two steel rails.
    ctx.fillStyle = "#7b5b3b";
    ctx.beginPath();
    for (let k = Math.floor(c0 / 0.6) - 1; k * 0.6 < c1 + 1; k++) {
      const x0 = k * 0.6;
      const x1 = x0 + 0.2;
      ctx.moveTo(sx(x0, r - 0.4), sy(x0, r - 0.4, h));
      ctx.lineTo(sx(x1, r - 0.4), sy(x1, r - 0.4, h));
      ctx.lineTo(sx(x1, r + 0.4), sy(x1, r + 0.4, h));
      ctx.lineTo(sx(x0, r + 0.4), sy(x0, r + 0.4, h));
      ctx.closePath();
    }
    ctx.fill();
    box(ctx, (a + b) / 2, r - 0.22, h, b - a, 0.07, 0.06, "#d5dbe5");
    box(ctx, (a + b) / 2, r + 0.22, h, b - a, 0.07, 0.06, "#d5dbe5");
  } else if (row.kind === "river") {
    // Ripples drifting with the current.
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    const flow = row.speed ? row.dir * row.speed * 0.4 : 0.3;
    for (let k = 0; k < 6; k++) {
      const off = hash(r, k) * CYCLE;
      const x0 = wrapX(off + flow * time) ;
      const rr = r - 0.35 + hash(k, r) * 0.7;
      if (x0 < c0 - 1 || x0 > c1 + 1) continue;
      const x1 = x0 + 0.9;
      ctx.moveTo(sx(x0, rr - 0.04), sy(x0, rr - 0.04, h));
      ctx.lineTo(sx(x1, rr - 0.04), sy(x1, rr - 0.04, h));
      ctx.lineTo(sx(x1, rr + 0.04), sy(x1, rr + 0.04, h));
      ctx.lineTo(sx(x0, rr + 0.04), sy(x0, rr + 0.04, h));
      ctx.closePath();
    }
    ctx.fill();
  }

  // Out of bounds: tint everything beyond the playable columns so the edge of the world reads clearly.
  const edge = HALF_COLS + 0.5;
  if (c0 < -HALF_COLS) {
    flat(ctx, a, Math.min(b, -edge), rn, rf, h + 0.001, "rgba(18,52,90,0.22)");
  }
  if (c1 > HALF_COLS) {
    flat(ctx, Math.max(a, edge), b, rn, rf, h + 0.001, "rgba(18,52,90,0.22)");
  }
}

// ---------------------------------------------------------------- scenery

export function drawTree(ctx: Ctx, c: number, r: number, h: number) {
  const v = hash(c * 3.1, r * 1.7);
  const kind = v < 0.46 ? 0 : v < 0.7 ? 1 : v < 0.85 ? 2 : 3;
  groundEllipse(ctx, c + 0.08, r - 0.05, h, 0.42, "rgba(20,60,20,0.2)");
  const leaf = hash(r, c) < 0.5 ? "#3fae52" : "#35a34d";
  if (kind === 0) {
    box(ctx, c, r, h, 0.26, 0.26, 0.42, "#8b5a2b");
    box(ctx, c, r, h + 0.36, 0.82, 0.82, 0.55, leaf);
    box(ctx, c, r, h + 0.9, 0.52, 0.52, 0.34, shade(leaf, 0.07));
  } else if (kind === 1) {
    box(ctx, c, r, h, 0.24, 0.24, 0.3, "#7a4e25");
    box(ctx, c, r, h + 0.26, 0.86, 0.86, 0.4, "#2f9a4a");
    box(ctx, c, r, h + 0.62, 0.62, 0.62, 0.4, "#35a652");
    box(ctx, c, r, h + 0.98, 0.38, 0.38, 0.5, "#3cb35a");
  } else if (kind === 2) {
    box(ctx, c, r, h, 0.7, 0.6, 0.38, "#9aa3ad");
    box(ctx, c + 0.04, r + 0.02, h + 0.34, 0.42, 0.4, 0.22, "#adb6c0");
  } else {
    box(ctx, c, r, h, 0.72, 0.72, 0.36, "#4cb85f");
    box(ctx, c, r, h + 0.3, 0.46, 0.46, 0.2, "#5ccb70");
    if (hash(c, r * 2) < 0.5) box(ctx, c + 0.12, r - 0.1, h + 0.48, 0.14, 0.14, 0.1, "#f472b6");
  }
}

export function drawCoin(ctx: Ctx, c: number, r: number, h: number, time: number) {
  const bob = Math.sin(time * 4 + c) * 0.06;
  const z = h + 0.52 + bob;
  groundEllipse(ctx, c, r, h, 0.2, "rgba(0,0,0,0.16)");
  const x = sx(c, r);
  const y = sy(c, r, z);
  const w = Math.max(1.5, Math.abs(Math.cos(time * 3.2 + c * 0.7)) * 8);
  ctx.fillStyle = "#b45309";
  ctx.beginPath();
  ctx.ellipse(x + 1.5, y + 1.5, w, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.ellipse(x, y, w, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.ellipse(x - w * 0.25, y - 2, w * 0.4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPad(ctx: Ctx, c: number, r: number, time: number) {
  const bob = Math.sin(time * 2 + c * 1.3 + r) * 0.015;
  const z = H_WATER + 0.02 + bob;
  const x = sx(c, r);
  const y = sy(c, r, z);
  ctx.fillStyle = "rgba(20,90,120,0.3)";
  ctx.beginPath();
  ctx.ellipse(x + 1, y + 3, 19, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3fae52";
  ctx.beginPath();
  ctx.ellipse(x, y, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#58c96a";
  ctx.beginPath();
  ctx.ellipse(x - 1, y - 1, 14, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // The notch.
  ctx.fillStyle = PAL.waterA;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 18, y - 3);
  ctx.lineTo(x + 18, y + 3);
  ctx.closePath();
  ctx.fill();
  if (hash(c, r) < 0.35) {
    box(ctx, c - 0.1, r + 0.05, z, 0.16, 0.16, 0.14, "#f9a8d4");
    box(ctx, c - 0.1, r + 0.05, z + 0.12, 0.08, 0.08, 0.06, "#fde047");
  }
}

// ---------------------------------------------------------------- vehicles, logs, trains

const CAR_COLORS = ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#f97316", "#a855f7", "#ec4899"];
const TRUCK_COLORS = ["#e5e7eb", "#60a5fa", "#fbbf24", "#34d399"];
const CAB_COLORS = ["#ef4444", "#2563eb", "#f59e0b", "#16a34a"];

function wheels(ctx: Ctx, x: number, r: number, h: number, offsets: number[]) {
  for (const o of offsets) {
    box(ctx, x + o, r - 0.34, h, 0.3, 0.12, 0.24, "#1f2430");
    box(ctx, x + o, r + 0.34, h, 0.3, 0.12, 0.24, "#1f2430");
  }
}

export function drawCar(ctx: Ctx, x: number, r: number, dir: 1 | -1, colorIdx: number) {
  const h = H_ROAD;
  const col = CAR_COLORS[colorIdx % CAR_COLORS.length];
  groundEllipse(ctx, x, r, h, 0.8, "rgba(0,0,0,0.18)");
  wheels(ctx, x, r, h, [-0.45, 0.45]);
  box(ctx, x, r, h + 0.1, 1.5, 0.74, 0.34, col);
  box(ctx, x - dir * 0.12, r, h + 0.44, 0.8, 0.64, 0.3, "#dff3ff");
  box(ctx, x - dir * 0.12, r, h + 0.72, 0.8, 0.64, 0.05, shade(col, 0.05));
  // Lights: white at the front, red at the back.
  box(ctx, x + dir * 0.74, r - 0.24, h + 0.22, 0.05, 0.14, 0.1, "#fff7c2");
  box(ctx, x + dir * 0.74, r + 0.24, h + 0.22, 0.05, 0.14, 0.1, "#fff7c2");
  box(ctx, x - dir * 0.74, r - 0.24, h + 0.22, 0.05, 0.14, 0.1, "#ff3b3b");
  box(ctx, x - dir * 0.74, r + 0.24, h + 0.22, 0.05, 0.14, 0.1, "#ff3b3b");
}

export function drawTruck(ctx: Ctx, x: number, len: number, r: number, dir: 1 | -1, colorIdx: number) {
  const h = H_ROAD;
  const cab = CAB_COLORS[colorIdx % CAB_COLORS.length];
  const cargo = TRUCK_COLORS[colorIdx % TRUCK_COLORS.length];
  groundEllipse(ctx, x, r, h, len * 0.55, "rgba(0,0,0,0.18)");
  const cabLen = 0.95;
  const cargoLen = len - cabLen - 0.08;
  const cabX = x + dir * (len / 2 - cabLen / 2);
  const cargoX = x - dir * (len / 2 - cargoLen / 2);
  wheels(ctx, cabX, r, h, [0]);
  wheels(ctx, cargoX, r, h, [-cargoLen * 0.32, cargoLen * 0.32]);
  box(ctx, cargoX, r, h + 0.14, cargoLen, 0.82, 0.8, cargo);
  box(ctx, cabX, r, h + 0.1, cabLen, 0.8, 0.5, cab);
  box(ctx, cabX + dir * 0.1, r, h + 0.5, cabLen * 0.6, 0.7, 0.3, "#dff3ff");
  box(ctx, x + dir * (len / 2 + 0.01), r - 0.26, h + 0.2, 0.05, 0.14, 0.1, "#fff7c2");
  box(ctx, x + dir * (len / 2 + 0.01), r + 0.26, h + 0.2, 0.05, 0.14, 0.1, "#fff7c2");
  box(ctx, x - dir * (len / 2 + 0.01), r - 0.26, h + 0.2, 0.05, 0.14, 0.1, "#ff3b3b");
  box(ctx, x - dir * (len / 2 + 0.01), r + 0.26, h + 0.2, 0.05, 0.14, 0.1, "#ff3b3b");
}

export function drawVehicle(ctx: Ctx, row: Row, v: Vehicle, x: number) {
  if (row.vehicleKind === "truck") drawTruck(ctx, x, v.len, row.index, row.dir, v.color);
  else drawCar(ctx, x, row.index, row.dir, v.color);
}

export function drawLog(ctx: Ctx, row: Row, l: Log, x: number, time: number) {
  const r = row.index;
  const z = H_WATER - 0.04 + Math.sin(time * 2.2 + l.x0) * 0.012;
  groundEllipse(ctx, x, r, H_WATER + 0.005, l.len * 0.5 + 0.1, "rgba(20,70,110,0.22)");
  box(ctx, x, r, z, l.len, 0.76, 0.34, ["#a8743f", "#8a5a2e", "#d9a86a"]);
  // Bark stripes on the top.
  ctx.fillStyle = "rgba(70,40,15,0.35)";
  ctx.beginPath();
  for (let k = 0; k < l.len; k++) {
    const cx0 = x - l.len / 2 + 0.25 + k * 1;
    ctx.moveTo(sx(cx0, r - 0.2), sy(cx0, r - 0.2, z + 0.34));
    ctx.lineTo(sx(cx0 + 0.45, r - 0.2), sy(cx0 + 0.45, r - 0.2, z + 0.34));
    ctx.lineTo(sx(cx0 + 0.45, r - 0.14), sy(cx0 + 0.45, r - 0.14, z + 0.34));
    ctx.lineTo(sx(cx0, r - 0.14), sy(cx0, r - 0.14, z + 0.34));
    ctx.closePath();
  }
  ctx.fill();
}

const WAGON_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed"];

/** Draw the part of the train between columns c0 and c1 (wagons are centred on a 2.9-tile pitch). */
export function drawTrain(ctx: Ctx, row: Row, time: number, c0: number, c1: number, only: "all" | "before" | "after", splitC: number) {
  const st = trainState(row, time);
  if (!st.present) return;
  const r = row.index;
  const h = H_RAIL;
  const lo = Math.min(st.front, st.tail);
  const hi = Math.max(st.front, st.tail);
  const pitch = 2.9;
  const n = Math.ceil((hi - lo) / pitch);
  for (let i = 0; i < n; i++) {
    // Index 0 is the engine at the front.
    const x = st.front - row.dir * (1.5 + i * pitch);
    if (x < c0 - 2 || x > c1 + 2) continue;
    if (only === "before" && x >= splitC) continue;
    if (only === "after" && x < splitC) continue;
    if (i === 0) {
      groundEllipse(ctx, x, r, h, 1.5, "rgba(0,0,0,0.2)");
      box(ctx, x, r, h + 0.1, 2.7, 0.92, 0.7, "#374151");
      box(ctx, x - row.dir * 0.3, r, h + 0.8, 1.7, 0.86, 0.4, "#ef4444");
      box(ctx, x + row.dir * 0.75, r, h + 0.8, 0.7, 0.8, 0.36, "#dff3ff");
      box(ctx, x + row.dir * 1.36, r, h + 0.36, 0.06, 0.4, 0.16, "#fff3a3");
      for (const o of [-0.9, 0, 0.9]) {
        box(ctx, x + o, r - 0.4, h, 0.34, 0.12, 0.2, "#111827");
        box(ctx, x + o, r + 0.4, h, 0.34, 0.12, 0.2, "#111827");
      }
    } else {
      const col = WAGON_COLORS[(i + row.index) % WAGON_COLORS.length];
      groundEllipse(ctx, x, r, h, 1.5, "rgba(0,0,0,0.18)");
      box(ctx, x, r, h + 0.1, 2.7, 0.9, 0.82, col);
      box(ctx, x, r, h + 0.92, 2.5, 0.8, 0.07, shade(col, 0.08));
      // A row of windows on the long side.
      for (let k = -1; k <= 1; k++) box(ctx, x + k * 0.8, r - 0.455, h + 0.4, 0.4, 0.02, 0.3, "#e6f6ff");
      for (const o of [-0.9, 0.9]) {
        box(ctx, x + o, r - 0.4, h, 0.34, 0.12, 0.2, "#111827");
        box(ctx, x + o, r + 0.4, h, 0.34, 0.12, 0.2, "#111827");
      }
    }
  }
}

/** A railway crossing signal with two flashing lamps. */
export function drawSignal(ctx: Ctx, c: number, r: number, on: boolean, time: number) {
  const h = H_RAIL;
  box(ctx, c, r - 0.45, h, 0.14, 0.14, 1.2, "#4b5563");
  box(ctx, c, r - 0.45, h + 1.05, 0.46, 0.18, 0.34, "#1f2937");
  box(ctx, c, r - 0.45, h + 1.4, 0.26, 0.04, 0.06, "#e5e7eb");
  const lampY = sy(c, r - 0.45 - 0.1, h + 1.22);
  for (const side of [-1, 1]) {
    const lx = sx(c + side * 0.11, r - 0.56);
    const lit = on && (Math.floor(time * 4) % 2 === 0) === (side > 0);
    ctx.fillStyle = lit ? "#ff3030" : "#5b1d1d";
    ctx.beginPath();
    ctx.arc(lx, lampY, 4.2, 0, Math.PI * 2);
    ctx.fill();
    if (lit) {
      ctx.fillStyle = "rgba(255,60,60,0.28)";
      ctx.beginPath();
      ctx.arc(lx, lampY, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------- the bunny

export interface BunnyPose {
  c: number;
  r: number;
  /** Height above the ground the bunny stands on. */
  z: number;
  /** Vertical and horizontal stretch (squash-and-stretch). */
  sY: number;
  sXZ: number;
  facing: "up" | "down" | "left" | "right";
  ear: number;
  alpha: number;
}

/** An original voxel bunny with long ears, cheek-set eyes and a cotton tail. */
export function drawBunny(ctx: Ctx, p: BunnyPose) {
  const { c, r, sY, sXZ } = p;
  const z0 = p.z;
  const f = p.facing;
  const fc = f === "right" ? 1 : f === "left" ? -1 : 0;
  const fr = f === "up" ? 1 : f === "down" ? -1 : 0;
  const body = "#f3efe6";
  const head = "#fbf8f2";
  const pink = "#f9a8c4";
  ctx.save();
  ctx.globalAlpha = p.alpha;
  // A tiny helper that scales a box's size and height around the bunny's feet.
  const bx = (dc: number, dr: number, z: number, wc: number, wr: number, hz: number, col: string) => {
    box(ctx, c + dc * sXZ, r + dr * sXZ, z0 + z * sY, wc * sXZ, wr * sXZ, hz * sY, col);
  };
  // Feet.
  bx(-0.14, 0, 0, 0.16, 0.26, 0.08, pink);
  bx(0.14, 0, 0, 0.16, 0.26, 0.08, pink);
  // Tail: shows when it is on the visible side.
  const tailVisible = f === "up" || f === "left";
  const tailC = -fc * 0.3;
  const tailR = -fr * 0.3;
  if (!tailVisible) bx(tailC, tailR, 0.1, 0.17, 0.17, 0.17, "#ffffff");
  // Body and head.
  bx(0, 0, 0.06, 0.5, 0.5, 0.42, body);
  if (tailVisible) bx(tailC, tailR, 0.1, 0.17, 0.17, 0.17, "#ffffff");
  const hc = fc * 0.05;
  const hr = fr * 0.05;
  bx(hc, hr, 0.46, 0.46, 0.44, 0.36, head);
  // Ears, set across the head.
  const ec = fr !== 0 ? 0.13 : 0;
  const er = fc !== 0 ? 0.13 : 0;
  const wob = p.ear;
  for (const s of [-1, 1]) {
    bx(hc + s * ec - fc * 0.04 + wob * 0.03 * s, hr + s * er - fr * 0.04, 0.8, 0.12, 0.12, 0.46, head);
    bx(hc + s * ec + fc * 0.03 + wob * 0.03 * s, hr + s * er + fr * 0.03, 0.9, 0.05, 0.05, 0.32, pink);
  }
  // Eyes and nose on the sides that face the camera.
  bx(hc - 0.2 * (fc !== 0 ? 0 : 0), hr - 0.225, 0.62, 0.07, 0.03, 0.1, "#1f2430");
  bx(hc + 0.235, hr, 0.62, 0.03, 0.07, 0.1, "#1f2430");
  if (f === "down") {
    bx(hc, hr - 0.23, 0.55, 0.1, 0.03, 0.07, pink);
    bx(hc - 0.12, hr - 0.225, 0.62, 0.07, 0.03, 0.1, "#1f2430");
    bx(hc + 0.12, hr - 0.225, 0.62, 0.07, 0.03, 0.1, "#1f2430");
  } else if (f === "right") {
    bx(hc + 0.235, hr, 0.55, 0.03, 0.1, 0.07, pink);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the hawk

/** The predator: a big blocky hawk. Position in tile units; flap is a phase in radians. */
export function drawHawk(ctx: Ctx, c: number, r: number, z: number, flap: number, dir: number) {
  const body = "#7a4a2b";
  const wingLift = Math.sin(flap) * 0.28;
  groundEllipse(ctx, c, r, 0, 0.7, "rgba(0,0,0,0.0)");
  // Wings first (behind / in front depending on side).
  box(ctx, c, r + 1.0, z + 0.2 + wingLift, 0.6, 1.4, 0.1, "#5a3519");
  box(ctx, c, r - 1.0, z + 0.2 - wingLift, 0.6, 1.4, 0.1, "#5a3519");
  box(ctx, c, r, z, 0.5, 0.7, 0.42, body);
  box(ctx, c + dir * 0.34, r, z + 0.22, 0.34, 0.34, 0.32, "#f5efe6");
  box(ctx, c + dir * 0.56, r, z + 0.28, 0.16, 0.12, 0.12, "#fbbf24");
  box(ctx, c - dir * 0.38, r, z + 0.02, 0.4, 0.3, 0.14, "#5a3519");
}
