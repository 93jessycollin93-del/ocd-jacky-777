// Dead Hours map: an ASCII grid parsed into rooms (zones), buyable doors, boarded windows and things
// on the walls. Pure TypeScript so the rules can be tested without a browser.
import type { PerkId, WeaponId } from "./weapons";

/** Metres per grid cell. */
export const CELL = 2;
export const WALL_HEIGHT = 3.2;
export const EYE_HEIGHT = 1.6;
export const MAX_BOARDS = 6;

export type Tile = "outside" | "wall" | "floor" | "window" | "door" | "object";
export type SpotKind = "wallbuy" | "perk" | "box" | "upgrade" | "power";

export interface Vec2 {
  x: number;
  z: number;
}

export interface DoorDef {
  id: number;
  cost: number;
  cells: [number, number][];
  /** The rooms on either side. */
  zones: number[];
}

export interface WindowDef {
  id: number;
  cx: number;
  cz: number;
  inside: [number, number];
  outside: [number, number];
  /** Unit vector pointing out of the building. */
  normal: Vec2;
  zone: number;
}

export interface Spot {
  id: number;
  kind: SpotKind;
  cx: number;
  cz: number;
  /** Unit vector from the wall it stands against, into the room. */
  facing: Vec2;
  zone: number;
  perk?: PerkId;
  weapon?: WeaponId;
}

export interface Arena {
  w: number;
  h: number;
  tiles: Tile[];
  /** Room index per cell (-1 for walls, doors, windows and outside). */
  zone: number[];
  zoneNames: string[];
  /** Door id per cell (0 = none). */
  doorAt: number[];
  /** Window id per cell (-1 = none). */
  windowAt: number[];
  doors: DoorDef[];
  windows: WindowDef[];
  spots: Spot[];
  spawn: Vec2;
  startZone: number;
}

// ,  outside (zombies come from here)     #  wall        .  floor        W  boarded window
// 1-4  doors you buy                      S  you start   X  mystery box spot
// a-f  wall-bought guns                   Q D J F K  perk machines
// U  upgrade station                      Z  power switch
export const MAP_ROWS = [
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  ",,,,###W########W####W#######W######,,,,,",
  ",,,,#.a......#......c..D#..X......F#,,,,,",
  ",,,,#........#..........#..........#,,,,,",
  ",,,,W........1..........3..........#,,,,,",
  ",,,,#...S....1..........3..........W,,,,,",
  ",,,,#........#..........#..........#,,,,,",
  ",,,,W........#d.........#K.........#,,,,,",
  ",,,,#Q.....b.#...X......#.........f#,,,,,",
  ",,,,######W#######22#####..........#,,,,,",
  ",,,,,,,,,,,,,#.........X#..........W,,,,,",
  ",,,,,,,,,,,,,#..........4..........#,,,,,",
  ",,,,,,,,,,,,,#..........4........U.#,,,,,",
  ",,,,,,,,,,,,,W..........######W#####,,,,,",
  ",,,,,,,,,,,,,#..........#,,,,,,,,,,,,,,,,",
  ",,,,,,,,,,,,,#..........#,,,,,,,,,,,,,,,,",
  ",,,,,,,,,,,,,#.........e#,,,,,,,,,,,,,,,,",
  ",,,,,,,,,,,,,#J....Z....#,,,,,,,,,,,,,,,,",
  ",,,,,,,,,,,,,###W####W###,,,,,,,,,,,,,,,,",
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
];

export const DOOR_COSTS: Record<number, number> = { 1: 750, 2: 1000, 3: 1250, 4: 1000 };
const WALL_BUYS: Record<string, WeaponId> = { a: "carbine", b: "coach", c: "vandal", d: "trench", e: "storm", f: "marksman" };
const PERK_SPOTS: Record<string, PerkId> = { Q: "wind", D: "tap", J: "iron", F: "hands", K: "step" };
/** A cell inside each room, to name it. */
const ROOM_LABELS: [number, number, string][] = [
  [6, 6, "Lobby"], [15, 6, "Dining Hall"], [26, 6, "Chapel"], [15, 14, "Workshop"],
];

const DIRS: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];

export function parseArena(rows: string[] = MAP_ROWS): Arena {
  const h = rows.length;
  const w = rows[0].length;
  const tiles: Tile[] = [];
  const doorAt: number[] = [];
  const windowAt: number[] = Array(w * h).fill(-1);
  let spawn: Vec2 = { x: 0, z: 0 };
  const marks: { ch: string; cx: number; cz: number }[] = [];
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[z][x] ?? ",";
      let t: Tile = "floor";
      let door = 0;
      if (ch === ",") t = "outside";
      else if (ch === "#") t = "wall";
      else if (ch === "W") t = "window";
      else if (ch >= "1" && ch <= "9") {
        t = "door";
        door = Number(ch);
      } else if ("QDJFKXU".includes(ch)) t = "object";
      if (ch === "S") spawn = { x: (x + 0.5) * CELL, z: (z + 0.5) * CELL };
      if (ch !== "," && ch !== "#" && ch !== "." && ch !== "W" && ch !== "S" && !(ch >= "1" && ch <= "9")) {
        marks.push({ ch, cx: x, cz: z });
      }
      tiles.push(t);
      doorAt.push(door);
    }
  }
  const idx = (x: number, z: number) => z * w + x;
  const at = (x: number, z: number): Tile => (x < 0 || z < 0 || x >= w || z >= h ? "outside" : tiles[idx(x, z)]);

  // Rooms: flood-fill floor and objects, with walls, doors and windows as borders.
  const zone: number[] = Array(w * h).fill(-1);
  let zones = 0;
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const t = at(x, z);
      if ((t !== "floor" && t !== "object") || zone[idx(x, z)] >= 0) continue;
      const stack: [number, number][] = [[x, z]];
      zone[idx(x, z)] = zones;
      while (stack.length) {
        const [cx, cz] = stack.pop()!;
        for (const [dx, dz] of DIRS) {
          const nx = cx + dx;
          const nz = cz + dz;
          const nt = at(nx, nz);
          if ((nt === "floor" || nt === "object") && zone[idx(nx, nz)] < 0) {
            zone[idx(nx, nz)] = zones;
            stack.push([nx, nz]);
          }
        }
      }
      zones++;
    }
  }
  const zoneNames = Array.from({ length: zones }, (_, i) => `Room ${i + 1}`);
  for (const [x, z, name] of ROOM_LABELS) if (zone[idx(x, z)] >= 0) zoneNames[zone[idx(x, z)]] = name;

  // Doors: group cells by digit; note the rooms they join.
  const doorMap = new Map<number, DoorDef>();
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const id = doorAt[idx(x, z)];
      if (!id) continue;
      const d = doorMap.get(id) ?? { id, cost: DOOR_COSTS[id] ?? 1000, cells: [], zones: [] };
      d.cells.push([x, z]);
      for (const [dx, dz] of DIRS) {
        const zn = zone[idx(x + dx, z + dz)] ?? -1;
        if (x + dx >= 0 && z + dz >= 0 && x + dx < w && z + dz < h && zn >= 0 && !d.zones.includes(zn)) d.zones.push(zn);
      }
      doorMap.set(id, d);
    }
  }

  // Windows: a gap in an outside wall, with floor on one side and open ground on the other.
  const windows: WindowDef[] = [];
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      if (at(x, z) !== "window") continue;
      for (const [dx, dz] of DIRS) {
        const inT = at(x - dx, z - dz);
        if (at(x + dx, z + dz) === "outside" && (inT === "floor" || inT === "object")) {
          const id = windows.length;
          windows.push({
            id, cx: x, cz: z, inside: [x - dx, z - dz], outside: [x + dx, z + dz], normal: { x: dx, z: dz },
            zone: zone[idx(x - dx, z - dz)],
          });
          windowAt[idx(x, z)] = id;
          break;
        }
      }
    }
  }

  // Things against the walls face into the room.
  const facingOf = (cx: number, cz: number): Vec2 => {
    for (const [dx, dz] of DIRS) {
      const t = at(cx + dx, cz + dz);
      if (t === "wall" || t === "window" || t === "door") return { x: -dx, z: -dz };
    }
    return { x: 0, z: 1 };
  };
  const spots: Spot[] = [];
  for (const m of marks) {
    const base = { id: spots.length, cx: m.cx, cz: m.cz, facing: facingOf(m.cx, m.cz), zone: zone[idx(m.cx, m.cz)] };
    if (WALL_BUYS[m.ch]) spots.push({ ...base, kind: "wallbuy", weapon: WALL_BUYS[m.ch] });
    else if (PERK_SPOTS[m.ch]) spots.push({ ...base, kind: "perk", perk: PERK_SPOTS[m.ch] });
    else if (m.ch === "X") spots.push({ ...base, kind: "box" });
    else if (m.ch === "U") spots.push({ ...base, kind: "upgrade" });
    else if (m.ch === "Z") spots.push({ ...base, kind: "power" });
  }

  return {
    w, h, tiles, zone, zoneNames, doorAt, windowAt,
    doors: [...doorMap.values()].sort((a, b) => a.id - b.id),
    windows, spots, spawn,
    startZone: zone[idx(Math.floor(spawn.x / CELL), Math.floor(spawn.z / CELL))],
  };
}

export const cellOf = (v: number) => Math.floor(v / CELL);
export const cellCenter = (c: number) => (c + 0.5) * CELL;

export function tileAt(a: Arena, cx: number, cz: number): Tile {
  if (cx < 0 || cz < 0 || cx >= a.w || cz >= a.h) return "outside";
  return a.tiles[cz * a.w + cx];
}

export function zoneAt(a: Arena, cx: number, cz: number): number {
  if (cx < 0 || cz < 0 || cx >= a.w || cz >= a.h) return -1;
  return a.zone[cz * a.w + cx];
}

/** Rooms you can reach from the start through the doors bought so far. */
export function reachableZones(a: Arena, openDoors: readonly number[]): Set<number> {
  const seen = new Set<number>([a.startZone]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const d of a.doors) {
      if (!openDoors.includes(d.id) || !d.zones.some((z) => seen.has(z))) continue;
      for (const z of d.zones) {
        if (!seen.has(z)) {
          seen.add(z);
          grew = true;
        }
      }
    }
  }
  return seen;
}

/** Walls, shut doors, windows and machines block people; zombies also stay off the open ground once inside. */
export function blocksWalker(a: Arena, openDoors: readonly number[], cx: number, cz: number): boolean {
  const t = tileAt(a, cx, cz);
  if (t === "floor") return false;
  if (t === "door") return !openDoors.includes(a.doorAt[cz * a.w + cx]);
  return true;
}

/** Bullets fly through windows (boards and all) and open doors, but not walls, shut doors or machines. */
export function blocksBullet(a: Arena, openDoors: readonly number[], cx: number, cz: number): boolean {
  const t = tileAt(a, cx, cz);
  if (t === "wall" || t === "object") return true;
  if (t === "door") return !openDoors.includes(a.doorAt[cz * a.w + cx]);
  return false;
}

/**
 * Distance along a horizontal ray (dx, dz normalised) to the first blocking cell, up to `max`.
 * Grid DDA, so it never skips a corner.
 */
export function rayDistance(
  blocked: (cx: number, cz: number) => boolean,
  ox: number, oz: number, dx: number, dz: number, max: number,
): number {
  let cx = cellOf(ox);
  let cz = cellOf(oz);
  if (blocked(cx, cz)) return 0;
  const stepX = dx > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? Math.abs(CELL / dx) : Infinity;
  const tDeltaZ = dz !== 0 ? Math.abs(CELL / dz) : Infinity;
  let tMaxX = dx !== 0 ? ((dx > 0 ? (cx + 1) * CELL - ox : ox - cx * CELL) / Math.abs(dx)) : Infinity;
  let tMaxZ = dz !== 0 ? ((dz > 0 ? (cz + 1) * CELL - oz : oz - cz * CELL) / Math.abs(dz)) : Infinity;
  for (let i = 0; i < 256; i++) {
    let t: number;
    if (tMaxX < tMaxZ) {
      t = tMaxX;
      tMaxX += tDeltaX;
      cx += stepX;
    } else {
      t = tMaxZ;
      tMaxZ += tDeltaZ;
      cz += stepZ;
    }
    if (t > max) return max;
    if (blocked(cx, cz)) return t;
  }
  return max;
}

/** Clear straight line between two points (for zombies deciding to cut the corner and charge). */
export function clearLine(
  blocked: (cx: number, cz: number) => boolean, ax: number, az: number, bx: number, bz: number, radius = 0,
): boolean {
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 1e-6) return true;
  const dx = (bx - ax) / len;
  const dz = (bz - az) / len;
  if (radius <= 0) return rayDistance(blocked, ax, az, dx, dz, len) >= len;
  // Check both shoulders too, so a body doesn't snag a corner.
  const px = -dz * radius;
  const pz = dx * radius;
  return (
    rayDistance(blocked, ax, az, dx, dz, len) >= len &&
    rayDistance(blocked, ax + px, az + pz, dx, dz, len) >= len &&
    rayDistance(blocked, ax - px, az - pz, dx, dz, len) >= len
  );
}

/** Push a circle out of any blocking cells around it. */
export function collideCircle(blocked: (cx: number, cz: number) => boolean, x: number, z: number, r: number): Vec2 {
  for (let pass = 0; pass < 2; pass++) {
    const cx0 = cellOf(x);
    const cz0 = cellOf(z);
    for (let cz = cz0 - 1; cz <= cz0 + 1; cz++) {
      for (let cx = cx0 - 1; cx <= cx0 + 1; cx++) {
        if (!blocked(cx, cz)) continue;
        const nx = Math.max(cx * CELL, Math.min(x, (cx + 1) * CELL));
        const nz = Math.max(cz * CELL, Math.min(z, (cz + 1) * CELL));
        const ddx = x - nx;
        const ddz = z - nz;
        const d = Math.hypot(ddx, ddz);
        if (d >= r) continue;
        if (d > 1e-6) {
          x = nx + (ddx / d) * r;
          z = nz + (ddz / d) * r;
        } else {
          // Centre inside the cell: push out the shortest way.
          const left = x - cx * CELL;
          const right = (cx + 1) * CELL - x;
          const top = z - cz * CELL;
          const bottom = (cz + 1) * CELL - z;
          const m = Math.min(left, right, top, bottom);
          if (m === left) x = cx * CELL - r;
          else if (m === right) x = (cx + 1) * CELL + r;
          else if (m === top) z = cz * CELL - r;
          else z = (cz + 1) * CELL + r;
        }
      }
    }
  }
  return { x, z };
}

/** Steps from every walkable cell to the target cell (breadth-first). -1 = unreachable. */
export function flowField(a: Arena, blocked: (cx: number, cz: number) => boolean, tx: number, tz: number): Int32Array {
  const dist = new Int32Array(a.w * a.h).fill(-1);
  if (tx < 0 || tz < 0 || tx >= a.w || tz >= a.h) return dist;
  const queue = new Int32Array(a.w * a.h);
  let head = 0;
  let tail = 0;
  dist[tz * a.w + tx] = 0;
  queue[tail++] = tz * a.w + tx;
  while (head < tail) {
    const i = queue[head++];
    const x = i % a.w;
    const z = (i - x) / a.w;
    for (const [dx, dz] of DIRS) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= a.w || nz >= a.h) continue;
      const j = nz * a.w + nx;
      if (dist[j] >= 0 || blocked(nx, nz)) continue;
      dist[j] = dist[i] + 1;
      queue[tail++] = j;
    }
  }
  return dist;
}
