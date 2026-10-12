// Brick Breaker's levels. Ten hand-made layouts, then endless generated ones. Each row is 13 characters:
//   .  empty        1-8  a normal brick (the digit picks its colour)
//   a  tough brick (2 hits)        b  tougher brick (3 hits)        #  steel (can't be broken)
import { mulberry32, randInt, type Rng } from "../../kit/rng";

export const COLS = 13;

export interface LevelDef {
  name: string;
  rows: string[];
}

export const AUTHORED: LevelDef[] = [
  {
    name: "Warm Up",
    rows: [
      ".............",
      "1111111111111",
      "2222222222222",
      "3333333333333",
      "4444444444444",
      "5555555555555",
    ],
  },
  {
    name: "Stairs",
    rows: [
      ".............",
      "1............",
      "22...........",
      "333..........",
      "4444.........",
      "55555........",
      "666666.......",
      "7777777......",
      "88888888.....",
    ],
  },
  {
    name: "Checkerboard",
    rows: [
      ".............",
      "1.1.1.1.1.1.1",
      ".2.2.2.2.2.2.",
      "3.3.3.3.3.3.3",
      ".a.a.a.a.a.a.",
      "5.5.5.5.5.5.5",
      ".6.6.6.6.6.6.",
    ],
  },
  {
    name: "Diamond",
    rows: [
      ".............",
      "......1......",
      ".....222.....",
      "....33333....",
      "...4444444...",
      "..555555555..",
      "...6666666...",
      "....77777....",
      ".....888.....",
      "......a......",
    ],
  },
  {
    name: "Gatehouse",
    rows: [
      ".............",
      "1111#...#1111",
      "2222#.a.#2222",
      "3333#...#3333",
      "4444#.b.#4444",
      "55555...55555",
      "6666666666666",
    ],
  },
  {
    name: "Zigzag",
    rows: [
      ".............",
      "111..........",
      "..222........",
      "....333......",
      "......444....",
      "........555..",
      "..........666",
      "........777..",
      "......888....",
      "....111......",
      "..222........",
    ],
  },
  {
    name: "Pillars",
    rows: [
      ".............",
      "#.#.#.#.#.#.#",
      "1.2.3.4.5.6.7",
      "1.2.3.4.5.6.7",
      "a.a.a.a.a.a.a",
      "1.2.3.4.5.6.7",
      "1.2.3.4.5.6.7",
    ],
  },
  {
    name: "Picture Frame",
    rows: [
      ".............",
      "aaaaaaaaaaaaa",
      "a1.2.3.2.1..a",
      "a...........a",
      "a.5.4.3.4.5.a",
      "a...........a",
      "aaaaaaaaaaaaa",
    ],
  },
  {
    name: "Arrowhead",
    rows: [
      ".............",
      "......1......",
      ".....222.....",
      "....33333....",
      "...4444444...",
      "..555555555..",
      ".....666.....",
      ".....777.....",
      ".....888.....",
      ".....a.a.....",
    ],
  },
  {
    name: "Bunker Run",
    rows: [
      ".............",
      "b1b1b1b1b1b1b",
      "1b1b1b1b1b1b1",
      ".............",
      "#.#.#.#.#.#.#",
      "2a2a2a2a2a2a2",
      ".............",
      "3.3.3.3.3.3.3",
    ],
  },
];

export const AUTHORED_COUNT = AUTHORED.length;

/** Every breakable brick must be reachable: steel can't wall one in completely. */
export function isSolvable(rows: string[]): boolean {
  const h = rows.length;
  const key = (c: number, r: number) => r * COLS + c;
  const seen = new Set<number>();
  const stack: [number, number][] = [];
  // Start from everything below the bottom row and from open cells on the side margins.
  for (let c = 0; c < COLS; c++) stack.push([c, h]);
  while (stack.length) {
    const [c, r] = stack.pop()!;
    for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr > h) continue;
      if (seen.has(key(nc, nr))) continue;
      const ch = nr >= h ? "." : rows[nr][nc];
      if (ch === "#") continue;
      seen.add(key(nc, nr));
      stack.push([nc, nr]);
    }
  }
  for (let r = 0; r < h; r++) for (let c = 0; c < COLS; c++) if (rows[r][c] !== "." && rows[r][c] !== "#" && !seen.has(key(c, r))) return false;
  return true;
}

export const breakableCount = (rows: string[]) => rows.reduce((n, r) => n + [...r].filter((ch) => ch !== "." && ch !== "#").length, 0);

type Motif = "stripes" | "checker" | "blocks" | "diamond" | "waves" | "scatter";
const MOTIFS: Motif[] = ["stripes", "checker", "blocks", "diamond", "waves", "scatter"];

/** A seeded, left-right symmetric layout for level 11 and up. Harder levels have more tough and steel bricks. */
export function generateLevel(level: number): LevelDef {
  for (let attempt = 0; attempt < 20; attempt++) {
    const rng = mulberry32(level * 7919 + 13 + attempt * 104729);
    const def = tryGenerate(level, rng);
    if (isSolvable(def.rows) && breakableCount(def.rows) >= 24) return def;
  }
  return { name: `Stage ${level}`, rows: AUTHORED[level % AUTHORED.length].rows };
}

function tryGenerate(level: number, rng: Rng): LevelDef {
  const extra = level - AUTHORED_COUNT;
  const rowCount = Math.min(13, 7 + Math.floor(extra / 2) + randInt(rng, 0, 2));
  const motif = MOTIFS[randInt(rng, 0, MOTIFS.length - 1)];
  const toughChance = Math.min(0.5, 0.12 + extra * 0.03);
  const steelChance = Math.min(0.14, 0.03 + extra * 0.01);
  const phase = randInt(rng, 0, 3);
  const rows: string[] = ["............."];
  for (let r = 0; r < rowCount; r++) {
    const half: string[] = [];
    for (let c = 0; c <= 6; c++) {
      let fill: boolean;
      switch (motif) {
        case "stripes": fill = r % 2 === 0 || c % 3 === phase % 3; break;
        case "checker": fill = (r + c + phase) % 2 === 0; break;
        case "blocks": fill = (Math.floor(r / 2) + Math.floor(c / 2)) % 2 === 0; break;
        case "diamond": fill = Math.abs(c - 6) + Math.abs(r - rowCount / 2) <= rowCount / 2 + 1; break;
        case "waves": fill = Math.abs(((r + Math.round(Math.sin(c * 0.9 + phase) * 1.5)) % 4) - 1.5) < 1.2; break;
        default: fill = rng() < 0.72; break;
      }
      let ch = ".";
      if (fill) {
        const roll = rng();
        if (roll < steelChance && r > 0 && r < rowCount - 1 && c % 2 === 0) ch = "#";
        else if (roll < steelChance + toughChance) ch = rng() < 0.3 + extra * 0.02 ? "b" : "a";
        else ch = String(1 + ((r + (motif === "stripes" ? 0 : c)) % 8));
      }
      half.push(ch);
    }
    const left = half.join("");
    rows.push(left + [...left].slice(0, 6).reverse().join(""));
  }
  return { name: `Stage ${level}`, rows };
}

export function levelDef(level: number): LevelDef {
  return level >= 1 && level <= AUTHORED_COUNT ? AUTHORED[level - 1] : generateLevel(level);
}
