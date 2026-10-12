// Maze Muncher's maze: an original 28×31 layout, written as the left half and mirrored.
//   #  wall          .  dot          o  power pellet
//   (space) open corridor with no dot          -  hunter-pen door          =  inside the pen
// Row 14 runs off both edges: the wrap-around tunnel.

export const COLS = 28;
export const ROWS = 31;

const LEFT_HALF = [
  "##############",
  "#.........#...",
  "#.###.###.#.##",
  "#o###.###.#.##",
  "#.............",
  "#.###.#.######",
  "#.###.#.######",
  "#.....#......#",
  "#####.### ## #",
  "#####.### ## #",
  "#####.### ## #",
  "#####.###     ",
  "#####.### ###-",
  "#####.### #===",
  "     .    #===",
  "#####.### #===",
  "#####.### ####",
  "#####.###     ",
  "#####.###### #",
  "#####.###### #",
  "#............#",
  "#.###.#####.##",
  "#.###.#####.##",
  "#o............",
  "###.#.##.#####",
  "###.#.##.#####",
  "#.....##.....#",
  "#.##########.#",
  "#.##########.#",
  "#.............",
  "##############",
];

export const LAYOUT: string[] = LEFT_HALF.map((half) => half + half.split("").reverse().join(""));

export const OPEN = 0;
export const WALL = 1;
export const DOOR = 2;
export const PEN = 3;

/** Static tiles (walls, door, pen), row-major. */
export const TILES: Uint8Array = (() => {
  const t = new Uint8Array(COLS * ROWS);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = LAYOUT[y][x];
      t[y * COLS + x] = c === "#" ? WALL : c === "-" ? DOOR : c === "=" ? PEN : OPEN;
    }
  }
  return t;
})();

/** Fresh dots for a level: 1 = dot, 2 = power pellet. */
export function freshDots(): Uint8Array {
  const d = new Uint8Array(COLS * ROWS);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = LAYOUT[y][x];
      d[y * COLS + x] = c === "." ? 1 : c === "o" ? 2 : 0;
    }
  }
  return d;
}

export const wrapX = (x: number) => ((x % COLS) + COLS) % COLS;

export function tileAt(x: number, y: number): number {
  if (y < 0 || y >= ROWS) return WALL;
  return TILES[y * COLS + wrapX(x)];
}

/** Can the muncher (or a hunter roaming the maze) stand on this tile? */
export const isOpen = (x: number, y: number) => tileAt(x, y) === OPEN;

export const TUNNEL_ROW = 14;
/** Hunters slow down in the side tunnels. */
export const inTunnel = (x: number, y: number) => y === TUNNEL_ROW && (x <= 4.5 || x >= COLS - 5.5);

/** Where things start and where the bonus item appears (tile units, centres on integers). */
export const PLAYER_START = { x: 13.5, y: 23 };
export const PEN_DOOR = { x: 13.5, y: 11 };
export const PEN_CENTRE_Y = 14;
export const BONUS_SPOT = { x: 13.5, y: 17 };
