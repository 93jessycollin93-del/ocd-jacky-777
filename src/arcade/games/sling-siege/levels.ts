// Handcrafted levels for Sling Siege. Everything is placed with a tiny builder that works in
// ground-relative metres (x to the right, y UP from the ground) so forts are easy to read and stack
// exactly: each helper returns the top of what it placed.
import type { CritterKind, GrumblerKind, MatId } from "./materials";

export interface PieceDef {
  shape: "box" | "ball" | "tri" | "wedge";
  mat: MatId;
  /** Centre (for wedges: centre of the bounding box), y up from the ground. */
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number;
  /** Wedges: +1 = right angle at the bottom left, -1 = bottom right. */
  dir?: number;
}

export interface GrumblerDef {
  kind: GrumblerKind;
  x: number;
  /** Centre height above the ground. */
  y: number;
}

export interface LevelDef {
  id: string;
  name: string;
  /** 0 Meadow, 1 Canyon, 2 Frost. */
  world: number;
  critters: CritterKind[];
  pieces: PieceDef[];
  grumblers: GrumblerDef[];
  hint?: string;
  /** Visible width in metres. */
  width: number;
  /** The score a very good (bot-assisted) player reaches; the star targets are measured against it. */
  par: number;
}

const R: Record<GrumblerKind, number> = { small: 0.38, normal: 0.5, helmet: 0.5, king: 0.78 };

class Builder {
  pieces: PieceDef[] = [];
  grumblers: GrumblerDef[] = [];

  /** A box with its bottom edge at `bottom`; returns its top. */
  box(mat: MatId, x: number, bottom: number, w: number, h: number): number {
    this.pieces.push({ shape: "box", mat, x, y: bottom + h / 2, w, h });
    return bottom + h;
  }
  /** A fixed, indestructible box (cliffs, ledges). */
  rock(x: number, bottom: number, w: number, h: number): number {
    return this.box("rock", x, bottom, w, h);
  }
  /** A vertical post. */
  post(mat: MatId, x: number, bottom: number, h: number, w = 0.4): number {
    return this.box(mat, x, bottom, w, h);
  }
  /** A horizontal plank. */
  plank(mat: MatId, x: number, bottom: number, len: number, t = 0.3): number {
    return this.box(mat, x, bottom, len, t);
  }
  /** A ball resting on `bottom`. */
  ball(mat: MatId, x: number, bottom: number, d: number): number {
    this.pieces.push({ shape: "ball", mat, x, y: bottom + d / 2, w: d, h: d });
    return bottom + d;
  }
  /** An isosceles triangle, apex up, base on `bottom`. */
  tri(mat: MatId, x: number, bottom: number, w: number, h: number): number {
    this.pieces.push({ shape: "tri", mat, x, y: bottom + h / 3, w, h });
    return bottom + h;
  }
  /** A right-angled wedge; dir +1 slopes down to the right. */
  wedge(mat: MatId, x: number, bottom: number, w: number, h: number, dir = 1): number {
    this.pieces.push({ shape: "wedge", mat, x, y: bottom + h / 2, w, h, dir });
    return bottom + h;
  }
  /** A grumbler standing on `bottom`. */
  g(kind: GrumblerKind, x: number, bottom: number) {
    this.grumblers.push({ kind, x, y: bottom + R[kind] });
  }
  /** A stack of blocks, bottom to top; returns the top. */
  stack(mat: MatId, x: number, bottom: number, w: number, heights: number[]): number {
    let y = bottom;
    for (const h of heights) y = this.box(mat, x, y, w, h);
    return y;
  }
  /** Two posts with a plank across them: a table or a hut frame. Returns the top of the plank. */
  frame(mat: MatId, x: number, bottom: number, width: number, h: number, roof: MatId = mat, postW = 0.4, roofT = 0.3): number {
    const half = width / 2 - postW / 2;
    this.post(mat, x - half, bottom, h, postW);
    this.post(mat, x + half, bottom, h, postW);
    return this.plank(roof, x, bottom + h, width + 0.2, roofT);
  }
}

/** Scores of a strong shot-by-shot search (see the level-solving test), used to set the star targets. */
const PARS: Record<string, number> = {
  m1: 26000, m2: 31250, m3: 28000, m4: 37500, m5: 44000, m6: 42000,
  c1: 22100, c2: 23000, c3: 28600, c4: 42000, c5: 35000, c6: 64500,
  f1: 40500, f2: 27000, f3: 34350, f4: 60500, f5: 65500, f6: 90000,
};

function level(
  id: string, name: string, world: number, critters: CritterKind[], hint: string | undefined,
  build: (b: Builder) => void, width = 44,
): LevelDef {
  const b = new Builder();
  build(b);
  return { id, name, world, critters, pieces: b.pieces, grumblers: b.grumblers, hint, width, par: PARS[id] ?? 0 };
}

export const LEVELS: LevelDef[] = [
  // ------------------------------------------------------------ world 1: Meadow Mischief
  level("m1", "Hello, Grumbler", 0, ["basic", "basic", "basic"], "Drag back from the slingshot, then let go.", (b) => {
    b.frame("wood", 27, 0, 2.2, 2.2);
    b.g("normal", 27, 0);
    b.box("wood", 27, 2.5, 1, 1);
    b.stack("wood", 31, 0, 1, [1, 1]);
  }),

  level("m2", "Glass House", 0, ["basic", "basic", "basic"], "Glass shatters at a touch, but the crates up top will rain down.", (b) => {
    for (const x of [25, 28.5, 32]) b.post("glass", x, 0, 2.4, 0.3);
    b.plank("glass", 26.75, 2.4, 3.5);
    b.plank("glass", 30.25, 2.4, 3.5);
    b.g("normal", 26.75, 0);
    b.g("normal", 30.25, 0);
    b.box("wood", 26.75, 2.7, 1, 1);
    b.box("wood", 30.25, 2.7, 1, 1);
    b.box("wood", 30.25, 3.7, 1, 1);
  }),

  level("m3", "Twin Towers", 0, ["basic", "splitter", "basic"], "Tap while the Trio is flying and it splits into three.", (b) => {
    const t1 = b.stack("wood", 24.5, 0, 1, [1, 1, 1]);
    b.plank("wood", 24.5, t1, 2.4);
    b.g("normal", 24.5, t1 + 0.3);
    const t2 = b.stack("wood", 31.5, 0, 1, [1, 1, 1, 1]);
    b.plank("wood", 31.5, t2, 2.4);
    b.g("normal", 31.5, t2 + 0.3);
    b.g("small", 28, 0);
    b.box("wood", 28, 0.75, 0.4, 0.5);
  }),

  level("m4", "Plank Bridge", 0, ["basic", "splitter", "basic", "basic"], "Knock out a stack and the whole bridge comes down.", (b) => {
    const top = b.stack("wood", 22.5, 0, 1.2, [1, 1, 1]);
    b.stack("wood", 32.5, 0, 1.2, [1, 1, 1]);
    b.plank("wood", 27.5, top, 11.4);
    b.box("wood", 25.2, top + 0.3, 1, 1);
    b.box("wood", 29.8, top + 0.3, 1, 1);
    b.g("normal", 27.5, top + 0.3);
    b.g("normal", 27.5, 0);
    b.g("small", 22.5, top + 0.3);
  }),

  level("m5", "Pyramid Party", 0, ["basic", "splitter", "basic", "basic"], "Pull the bottom out and the pyramid takes everyone with it.", (b) => {
    for (let row = 0; row < 4; row++) {
      const n = 4 - row;
      for (let i = 0; i < n; i++) b.box("wood", 28.5 + 0.5 * row + i, row, 1, 1);
    }
    b.g("normal", 30, 4);
    b.tri("wood", 24.5, 0, 1.6, 1);
    b.g("normal", 24.5, 1);
    b.box("wood", 35.5, 0, 1, 1);
    b.g("small", 35.5, 1);
  }),

  level("m6", "Meadow Keep", 0, ["basic", "dasher", "splitter", "basic", "basic"], "Tap Zippy to burst through the walls.", (b) => {
    b.frame("wood", 22, 0, 2.4, 2.2);
    b.g("normal", 22, 0);
    for (const x of [27.2, 29.5, 31.8]) b.post("wood", x, 0, 2.4, 0.6);
    b.plank("wood", 28.35, 2.4, 2.3);
    b.plank("wood", 30.65, 2.4, 2.3);
    b.box("wood", 28.35, 0, 1, 1);
    b.post("wood", 27.6, 2.7, 2, 0.4);
    b.post("wood", 31.4, 2.7, 2, 0.4);
    b.plank("wood", 29.5, 4.7, 4.6);
    b.g("king", 29.5, 2.7);
    b.tri("wood", 29.5, 5, 4.8, 1.4);
    const t = b.stack("wood", 36.5, 0, 1, [1, 1, 1, 1]);
    b.plank("wood", 36.5, t, 2.4);
    b.g("normal", 36.5, t + 0.3);
    b.post("wood", 38.9, 0, 1.6);
    b.g("small", 40, 0);
  }),

  // ------------------------------------------------------------ world 2: Dusty Canyon
  level("c1", "Stone Gate", 1, ["basic", "bomber", "basic"], "Tap Boomer to blow up right where it counts.", (b) => {
    b.stack("stone", 26.6, 0, 0.9, [1.5, 1.5]);
    b.stack("stone", 31.4, 0, 0.9, [1.5, 1.5]);
    b.plank("stone", 29, 3, 5.4, 0.5);
    b.box("wood", 27.6, 3.5, 1, 1);
    b.box("wood", 30.4, 3.5, 1, 1);
    b.g("normal", 29, 3.5);
    b.g("normal", 29, 0);
  }),

  level("c2", "Mesa Cliff", 1, ["basic", "dasher", "bomber", "basic"], "The cliff is solid rock; aim for the tower on top.", (b) => {
    b.rock(31, 0, 9, 3.5);
    const t = b.stack("wood", 28.8, 3.5, 1, [1, 1, 1]);
    b.plank("wood", 28.8, t, 2.4);
    b.g("normal", 28.8, t + 0.3);
    b.frame("wood", 33.4, 3.5, 2.2, 1.8);
    b.g("small", 33.4, 3.5);
    b.g("normal", 22.5, 0);
    b.post("wood", 23.7, 0, 1.8);
    b.g("normal", 39, 0);
    b.box("stone", 37.5, 0, 1, 1.6);
  }),

  level("c3", "TNT Shack", 1, ["basic", "basic", "bomber"], "Red crates go off with a bang when they are hit hard.", (b) => {
    for (const x of [26, 29, 32]) b.post("wood", x, 0, 2.5);
    b.box("tnt", 27.5, 0, 1, 1);
    b.box("tnt", 30.5, 0, 1, 1);
    b.plank("wood", 27.5, 2.5, 3);
    b.plank("wood", 30.5, 2.5, 3);
    b.g("normal", 27.5, 2.8);
    b.g("normal", 30.5, 2.8);
    b.box("wood", 29, 2.8, 1, 1);
    b.g("small", 35, 0);
  }),

  level("c4", "Rock Wall", 1, ["heavy", "basic", "bomber", "heavy"], "Boulder smashes stone: tap to slam it down.", (b) => {
    b.stack("stone", 25.6, 0, 1.2, [1.5, 1.5, 1.5]);
    b.stack("stone", 26.8, 0, 1.2, [1.5, 1.5, 1.5]);
    b.plank("stone", 26.2, 4.5, 2.6, 0.4);
    b.g("normal", 26.2, 4.9);
    b.frame("wood", 31.5, 0, 2.4, 2.2);
    b.g("normal", 31.5, 0);
    b.box("wood", 31.5, 2.5, 1, 1);
    b.g("small", 34.6, 0);
    b.stack("stone", 37, 0, 0.8, [1.5]);
    b.stack("stone", 39.6, 0, 0.8, [1.5]);
    b.plank("stone", 38.3, 1.5, 3.6, 0.4);
    b.g("helmet", 38.3, 0);
  }),

  level("c5", "Canyon Crossing", 1, ["splitter", "dasher", "heavy", "basic"], "Lob your shot over the cliff and down into the canyon.", (b) => {
    b.rock(21.5, 0, 6, 4);
    b.rock(36.5, 0, 6, 4);
    b.plank("stone", 29, 4, 9.4, 0.4);
    b.g("normal", 29, 4.4);
    b.box("wood", 27, 4.4, 1, 1);
    b.g("normal", 29, 0);
    b.g("normal", 37, 4);
    b.box("wood", 38.5, 4, 1, 1);
  }),

  level("c6", "Mesa Fortress", 1, ["heavy", "bomber", "splitter", "dasher", "basic"], "Stone shields the king, but TNT does not care.", (b) => {
    for (const x of [26, 30, 34]) b.stack("stone", x, 0, 0.9, [1.5, 1.5]);
    b.plank("stone", 28, 3, 4, 0.4);
    b.plank("stone", 32, 3, 4, 0.4);
    b.g("normal", 28, 0);
    b.g("normal", 32, 0);
    b.box("tnt", 27.2, 3.4, 1, 1);
    b.g("helmet", 33, 3.4);
    b.post("wood", 29.1, 3.4, 2, 0.4);
    b.post("wood", 30.9, 3.4, 2, 0.4);
    b.plank("wood", 30, 5.4, 2.6);
    b.g("small", 30, 3.4);
    b.g("king", 36.5, 0);
  }),

  // ------------------------------------------------------------ world 3: Frostbite Peaks
  level("f1", "Ice Cabin", 2, ["basic", "splitter", "basic", "bomber"], "Ice is slick and brittle: knock it about.", (b) => {
    b.post("ice", 26, 0, 2.6, 0.5);
    b.post("ice", 30.5, 0, 2.6, 0.5);
    b.plank("ice", 28.25, 2.6, 5.2, 0.35);
    b.tri("wood", 28.25, 2.95, 5.4, 1.6);
    b.g("normal", 27.5, 0);
    b.g("normal", 29, 0);
    b.stack("ice", 34, 0, 1, [1, 1]);
    b.g("small", 34, 2);
    b.stack("ice", 38, 0, 1, [1, 1, 1]);
    b.g("small", 38, 3);
  }),

  level("f2", "Snowball Run", 2, ["basic", "dasher", "splitter", "basic"], "Free the snowballs and let gravity do the rest.", (b) => {
    b.rock(26, 0, 4, 2.5);
    b.wedge("rock", 30, 0, 4, 2.5, 1);
    b.ball("ice", 24.9, 2.5, 1.2);
    b.ball("ice", 26.1, 2.5, 1.2);
    b.g("normal", 27.3, 2.5);
    b.frame("wood", 35, 0, 3.2, 2.2);
    b.g("normal", 34.2, 0);
    b.g("normal", 35.8, 0);
    b.box("wood", 35, 2.5, 1, 1);
  }),

  level("f3", "Icicle Alley", 2, ["dasher", "splitter", "basic", "basic"], "Tall ice posts topple like dominoes.", (b) => {
    for (const x of [24, 26.5, 29.5, 32, 34.5]) b.post("ice", x, 0, 4, 0.6);
    b.plank("glass", 25.25, 4, 3.4, 0.3);
    b.plank("glass", 30.75, 4, 3.4, 0.3);
    b.g("normal", 25.25, 4.3);
    b.g("normal", 30.75, 4.3);
    b.g("normal", 28, 0);
    b.box("glass", 33.2, 0, 0.8, 0.8);
    b.frame("wood", 38.4, 0, 2.4, 2);
    b.g("helmet", 38.4, 0);
  }),

  level("f4", "Glacier Gate", 2, ["heavy", "bomber", "dasher", "splitter", "basic"], "Heavy pillars hold a sheet of ice over the grumblers.", (b) => {
    b.stack("stone", 25, 0, 1, [1.5, 1.5, 1.5]);
    b.stack("stone", 31, 0, 1, [1.5, 1.5, 1.5]);
    b.plank("ice", 28, 4.5, 7, 0.5);
    b.g("helmet", 28, 5);
    b.box("glass", 26.2, 5, 0.8, 0.8);
    b.box("glass", 29.8, 5, 0.8, 0.8);
    b.frame("wood", 28, 0, 3.6, 2.2);
    b.box("tnt", 27.1, 0, 1, 1);
    b.g("normal", 28.7, 0);
    b.stack("stone", 36.2, 0, 0.8, [1.5, 1.5]);
    b.stack("stone", 39, 0, 0.8, [1.5, 1.5]);
    b.plank("ice", 37.6, 3, 3.8, 0.4);
    b.g("king", 37.6, 0);
    b.g("small", 37.6, 3.4);
  }),

  level("f5", "Frozen Spire", 2, ["dasher", "heavy", "splitter", "bomber", "basic", "basic"], "Take out the bottom floor and the spire folds in on itself.", (b) => {
    b.post("wood", 26.5, 0, 2, 0.5);
    b.post("wood", 29.5, 0, 2, 0.5);
    b.plank("stone", 28, 2, 3.8, 0.4);
    b.g("normal", 28, 0);
    b.post("ice", 26.8, 2.4, 2, 0.5);
    b.post("ice", 29.2, 2.4, 2, 0.5);
    b.plank("wood", 28, 4.4, 3.4, 0.3);
    b.g("normal", 28, 2.4);
    b.post("glass", 27.1, 4.7, 1.8, 0.4);
    b.post("glass", 28.9, 4.7, 1.8, 0.4);
    b.plank("wood", 28, 6.5, 2.8, 0.3);
    b.g("helmet", 28, 4.7);
    b.g("small", 28, 6.8);
    b.post("ice", 36.7, 0, 2, 0.5);
    b.post("ice", 38.7, 0, 2, 0.5);
    b.plank("wood", 37.7, 2, 3.0, 0.3);
    b.g("normal", 37.7, 0);
    b.post("glass", 36.9, 2.3, 1.6, 0.4);
    b.post("glass", 38.5, 2.3, 1.6, 0.4);
    b.plank("wood", 37.7, 3.9, 2.4, 0.3);
    b.g("small", 37.7, 2.3);
    b.box("wood", 33, 0, 1, 1);
  }),

  level("f6", "Grumble King's Castle", 2, ["heavy", "bomber", "splitter", "dasher", "heavy", "basic", "basic"], "The whole gang is home. Good luck!", (b) => {
    const t1 = b.stack("stone", 24.8, 0, 1.6, [1.5, 1.5, 1.5]);
    const t2 = b.stack("stone", 35.2, 0, 1.6, [1.5, 1.5, 1.5]);
    b.plank("wood", 24.8, t1, 2.4, 0.3);
    b.plank("wood", 35.2, t2, 2.4, 0.3);
    b.g("small", 24.8, t1 + 0.3);
    b.g("small", 35.2, t2 + 0.3);
    b.post("wood", 27.3, 0, 3, 0.5);
    b.post("wood", 32.7, 0, 3, 0.5);
    b.plank("stone", 30, 3, 6.4, 0.5);
    b.box("tnt", 28.4, 0, 1, 1);
    b.box("tnt", 31.6, 0, 1, 1);
    b.g("helmet", 30, 0);
    b.post("stone", 28.55, 3.5, 2.2, 0.5);
    b.post("stone", 31.45, 3.5, 2.2, 0.5);
    b.plank("stone", 30, 5.7, 3.5, 0.4);
    b.g("king", 30, 3.5);
    b.box("wood", 30, 6.1, 0.8, 0.8);
    b.box("stone", 21.4, 0, 1, 1.6);
    b.g("normal", 20.2, 0);
    b.box("stone", 38.4, 0, 1, 1.6);
    b.g("normal", 39.6, 0);
  }),
];
