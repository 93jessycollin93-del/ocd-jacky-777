// Alien Wave's pixel art, drawn in code: each design is a small grid of characters, painted once into a
// glowing offscreen bitmap and then stamped onto the playfield.
//   X = body colour    O = accent colour (eyes, lights)    . = empty

export const ALIEN_ART: string[][][] = [
  // 0: Jelly (top row)
  [
    ["...XXXXX...", ".XXXXXXXXX.", "XXOXXXXXOXX", "XXXXXXXXXXX", ".XX.XXX.XX.", "..X.....X..", ".X..XXX..X.", "X.........X"],
    ["...XXXXX...", ".XXXXXXXXX.", "XXOXXXXXOXX", "XXXXXXXXXXX", "..XX.X.XX..", ".X.X...X.X.", "X...XXX...X", ".X.......X."],
  ],
  // 1: Mantis
  [
    ["X.........X", ".X..XXX..X.", ".XXXXXXXXX.", "XXOXXXXXOXX", "XXXXXXXXXXX", "X.XXXXXXX.X", "X.X.....X.X", "..XX...XX.."],
    [".X.......X.", "X..XXXXX..X", "XXXXXXXXXXX", "XXOXXXXXOXX", ".XXXXXXXXX.", "..XXXXXXX..", ".X.X...X.X.", "X.X.....X.X"],
  ],
  // 2: Beetle
  [
    ["...X...X...", "....XXX....", "..XXXXXXX..", ".XXOXXXOXX.", "XXXXXXXXXXX", "XXXXXXXXXXX", ".XX.XXX.XX.", "X.X.....X.X"],
    ["...X...X...", "....XXX....", "..XXXXXXX..", ".XXOXXXOXX.", "XXXXXXXXXXX", "XXXXXXXXXXX", ".XX.XXX.XX.", ".X.X...X.X."],
  ],
  // 3: Pod (bottom row)
  [
    ["....XXX....", "..XXXXXXX..", ".XXXXXXXXX.", "XXOXXXXXOXX", "XXXXXXXXXXX", "..XX...XX..", ".XX.XXX.XX.", "XX.......XX"],
    ["....XXX....", "..XXXXXXX..", ".XXXXXXXXX.", "XXOXXXXXOXX", "XXXXXXXXXXX", "..X.XXX.X..", ".X.X...X.X.", ".X.......X."],
  ],
];

export const SHIP_ART = [
  "......X......",
  ".....XOX.....",
  "....XXXXX....",
  ".X..XXXXX..X.",
  ".XX.XXXXX.XX.",
  "XXXXXXXXXXXXX",
  "XXX.XXXXX.XXX",
  "X.X..XXX..X.X",
];

export const SAUCER_ART = [
  ".....XXXXXX.....",
  "...XXXXXXXXXX...",
  "..XXXXXXXXXXXX..",
  ".XXOXXOXXOXXOXX.",
  "XXXXXXXXXXXXXXXX",
  "..XXX..XX..XXX..",
  "...X........X...",
];

export const ALIEN_COLORS = [
  { body: "#f472b6", accent: "#fff1f9" },
  { body: "#a78bfa", accent: "#f5f0ff" },
  { body: "#4ade80", accent: "#eafff2" },
  { body: "#fbbf24", accent: "#fffbe6" },
];

/** Art pixels are painted this many bitmap pixels wide, with room around them for the glow. */
const PX = 4;
const PAD = 10;

const cache = new Map<string, HTMLCanvasElement>();

function paint(art: string[], body: string, accent: string, glow: number): HTMLCanvasElement {
  const w = art[0].length;
  const h = art.length;
  const cv = document.createElement("canvas");
  cv.width = w * PX + PAD * 2;
  cv.height = h * PX + PAD * 2;
  const c = cv.getContext("2d");
  if (!c) return cv;
  // First pass blurs for the glow, second draws crisp pixels on top.
  for (const pass of [0, 1]) {
    c.shadowColor = pass === 0 ? body : "transparent";
    c.shadowBlur = pass === 0 ? glow : 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = art[y][x];
        if (ch === "." || ch === " ") continue;
        c.fillStyle = ch === "O" ? accent : body;
        c.fillRect(PAD + x * PX, PAD + y * PX, PX, PX);
      }
    }
  }
  return cv;
}

export interface Sprite {
  canvas: HTMLCanvasElement;
  /** Size of the art itself, in art pixels. */
  w: number;
  h: number;
}

function get(key: string, art: string[], body: string, accent: string, glow = 10): Sprite {
  let cv = cache.get(key);
  if (!cv) {
    cv = paint(art, body, accent, glow);
    cache.set(key, cv);
  }
  return { canvas: cv, w: art[0].length, h: art.length };
}

export const alienSprite = (type: number, frame: number): Sprite =>
  get(`a${type}${frame}`, ALIEN_ART[type][frame & 1], ALIEN_COLORS[type].body, ALIEN_COLORS[type].accent);
export const shipSprite = (): Sprite => get("ship", SHIP_ART, "#7dd3fc", "#ffffff");
export const saucerSprite = (): Sprite => get("saucer", SAUCER_ART, "#fb7185", "#fff1f2");
/** A flash used for dying aliens: the same shape, all white. */
export const flashSprite = (type: number): Sprite => get(`f${type}`, ALIEN_ART[type][0], "#ffffff", "#ffffff", 14);

/** Stamp a sprite centred on (x, y), with each art pixel `scale` logical units wide. */
export function stamp(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, scale: number) {
  const k = scale / PX;
  const w = s.canvas.width * k;
  const h = s.canvas.height * k;
  ctx.drawImage(s.canvas, x - w / 2, y - h / 2, w, h);
}
