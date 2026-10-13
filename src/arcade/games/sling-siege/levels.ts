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

function level(
  id: string, name: string, world: number, critters: CritterKind[], hint: string | undefined,
  build: (b: Builder) => void, width = 44,
): LevelDef {
  const b = new Builder();
  build(b);
  return { id, name, world, critters, pieces: b.pieces, grumblers: b.grumblers, hint, width };
}

export const LEVELS: LevelDef[] = [
  level("m1", "Hello, Grumbler", 0, ["basic", "basic", "basic"], "Drag back from the slingshot, then let go.", (b) => {
    b.frame("wood", 27, 0, 2.2, 2.2);
    b.g("normal", 27, 0);
    b.box("wood", 27, 2.5, 1, 1);
  }),
];
