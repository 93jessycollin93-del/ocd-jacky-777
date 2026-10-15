// Board layouts, all in one shared format. A layout is a stack of layers; each layer is rows of text where
// "X" is a tile and "." is empty. Tiles sit on a half-tile grid: slot x / y count half tiles, so a tile is two
// units wide and tall, and a layer can be shifted by half a tile (ox / oy = 1) to straddle the tiles below.
// Every layout holds exactly 144 tiles (a test enforces it) and is at most seven tile rows tall so that the
// tiles stay a good size on a phone held sideways.

export interface Layer {
  rows: string[];
  /** Half-tile shift of the whole layer (0 or 1). */
  ox?: number;
  oy?: number;
}

export interface LayoutDef {
  id: string;
  name: string;
  blurb: string;
  layers: Layer[];
}

/** One place a tile can sit. x and y are in half tiles; z is the layer (0 = bottom). */
export interface Slot {
  x: number;
  y: number;
  z: number;
}

export const LAYOUTS: LayoutDef[] = [
  {
    id: "pyramid",
    name: "Pyramid",
    blurb: "A tidy stepped pyramid: five layers, wide open edges. Start here.",
    layers: [
      { rows: ["XXXXXXXXXXXX", "XXXXXXXXXXXX", "XXXXXXXXXXXX", "XXXXXXXXXXXX", "XXXXXXXXXXXX", "XXXXXXXXXXXX"] },
      { rows: ["............", ".XXXXXXXXXX.", ".XXXXXXXXXX.", ".XXXXXXXXXX.", ".XXXXXXXXXX."] },
      { rows: ["............", "............", "..XXXXXXXX..", "..XXXXXXXX.."] },
      { rows: ["............", "............", "...XXXXXX...", "...XXXXXX..."] },
      { rows: ["............", "............", ".....XX.....", ".....XX....."] },
    ],
  },
  {
    id: "towers",
    name: "Twin Towers",
    blurb: "Two tall towers joined by a low bridge. Free tiles hide in the middle.",
    layers: [
      { rows: ["XXX.........XXX", "XXX.........XXX", "XXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXX", "XXX.........XXX", "XXX.........XXX"] },
      { rows: ["...............", "XXX.........XXX", "XXX.........XXX", "XXX.XXXXXXX.XXX", "XXX.........XXX", "XXX.........XXX"] },
      { rows: ["...............", "...............", "XXX.........XXX", "XXX.........XXX", "XXX.........XXX"] },
      { rows: ["...............", "...............", "XXX.........XXX", "XXX.........XXX", "XXX.........XXX"] },
      { rows: ["...............", "...............", "...............", ".X...........X."] },
    ],
  },
  {
    id: "hourglass",
    name: "Hourglass",
    blurb: "Wide at the top and bottom, pinched in the middle with a spire of tiles.",
    layers: [
      { rows: ["XXXXXXXXXXXXXXX", ".XXXXXXXXXXXXX.", "...XXXXXXXXX...", ".....XXXXX.....", "...XXXXXXXXX...", ".XXXXXXXXXXXXX.", "XXXXXXXXXXXXXXX"] },
      { rows: ["...............", "..XXXXXXXXXXX..", "....XXXXXXX....", "......XXX......", "....XXXXXXX....", "..XXXXXXXXXXX.."] },
      { rows: ["...............", "....XXXXXXX....", ".....XXXXX.....", ".......X.......", ".....XXXXX.....", "....XXXXXXX...."] },
      { rows: ["...............", "...............", "...............", ".......X......."] },
    ],
  },
  {
    id: "castle",
    name: "Castle",
    blurb: "A broad wall with battlements and a stepped keep rising in the centre.",
    layers: [
      { rows: ["X.X.X.X.X.X.X.X.X", "XXXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXXX"] },
      { rows: [".................", "......XXXXX......", "......XXXXX......", "......XXXXX......", "......XXXXX......", "......XXXXX......"] },
      { rows: [".................", ".................", ".......XXX.......", ".......XXX......."] },
      { rows: [".................", ".................", ".......XX........"] },
    ],
  },
  {
    id: "diamond",
    name: "Diamond",
    blurb: "A faceted diamond with a three-tile crown. Looks easy, plays tight.",
    layers: [
      { rows: [".....XXXXX.....", "...XXXXXXXXX...", ".XXXXXXXXXXXXX.", "XXXXXXXXXXXXXXX", ".XXXXXXXXXXXXX.", "...XXXXXXXXX...", ".....XXXXX....."] },
      { rows: ["...............", "....XXXXXXX....", "..XXXXXXXXXXX..", ".XXXXXXXXXXXXX.", "..XXXXXXXXXXX..", "....XXXXXXX...."] },
      { rows: ["...............", "...............", "....XXXXXXX....", "...XXXXXXXXX...", "....XXXXXXX...."] },
      { rows: ["...............", "...............", "...............", "......XXX......"] },
    ],
  },
];

export const layoutById = (id: string): LayoutDef => LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];

/**
 * The slots of a layout, ordered bottom layer first and then top to bottom, left to right: the order to
 * draw them in. `rotated` swaps the board's x and y, which is how a wide layout is laid out on a tall phone;
 * the rules (free tiles, matching) apply to what you see, so the deal is made for the rotated board.
 */
export function slotsOf(layout: LayoutDef, rotated = false): Slot[] {
  const out: Slot[] = [];
  layout.layers.forEach((layer, z) => {
    layer.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        if (row[c] !== "X") continue;
        const x = c * 2 + (layer.ox ?? 0);
        const y = r * 2 + (layer.oy ?? 0);
        out.push(rotated ? { x: y, y: x, z } : { x, y, z });
      }
    });
  });
  return out.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
}

/** Size of the board in half tiles (the box around every slot, including the tile itself). */
export function extents(slots: readonly Slot[]) {
  let w = 0;
  let h = 0;
  let zMax = 0;
  for (const s of slots) {
    w = Math.max(w, s.x + 2);
    h = Math.max(h, s.y + 2);
    zMax = Math.max(zMax, s.z);
  }
  return { w, h, zMax };
}
