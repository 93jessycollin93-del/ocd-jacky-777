// Garden Defense: the ten handmade levels. Each level lists the plants and gnomes it introduces and a wave script
// (when each wave arrives and which gnomes are in it). The last wave of every level is a big one led by a flag gnome.
import { GNOME_ORDER, type GnomeKind, type PlantId } from "./defs";

export type Theme = "day" | "dusk" | "night";

export interface WaveDef {
  /** Seconds after the level starts when the wave begins. */
  at: number;
  /** A big wave: a flag gnome leads it and a banner announces it. */
  big?: boolean;
  gnomes: GnomeKind[];
}

export interface LevelDef {
  id: number;
  name: string;
  blurb: string;
  /** The lanes in play (0 is the top lane); the others are bare dirt. */
  lanes: number[];
  /** Plants this level introduces / plants available (everything introduced so far). */
  newPlants: PlantId[];
  plants: PlantId[];
  newGnomes: GnomeKind[];
  gnomes: GnomeKind[];
  startSun: number;
  /** Seconds between sun drops from the sky. */
  sky: number;
  theme: Theme;
  waves: WaveDef[];
}

type Spec = Partial<Record<"b" | "c" | "k" | "r" | "v" | "g", number>>;
const KIND: Record<keyof Spec, GnomeKind> = { b: "basic", c: "cone", k: "bucket", r: "runner", v: "vaulter", g: "gate" };

/** A wave from a compact spec like {b: 3, c: 1}: basic, cone, bucket(k), runner, vaulter, gate. */
function wave(at: number, spec: Spec, big = false): WaveDef {
  const gnomes: GnomeKind[] = [];
  // Interleave the kinds so a wave isn't all one type in a row.
  const left = Object.entries(spec).map(([k, n]) => [KIND[k as keyof Spec], n as number] as [GnomeKind, number]);
  let more = true;
  while (more) {
    more = false;
    for (const e of left) {
      if (e[1] > 0) {
        gnomes.push(e[0]);
        e[1]--;
        more = true;
      }
    }
  }
  return { at, big, gnomes };
}

interface Raw {
  name: string;
  blurb: string;
  lanes: number[];
  plants: PlantId[];
  gnomes: GnomeKind[];
  startSun: number;
  sky: number;
  theme: Theme;
  waves: WaveDef[];
}

const ALL = [0, 1, 2, 3, 4];

const RAW: Raw[] = [
  {
    name: "First Sprouts", blurb: "One lane, a few gnomes. Collect sun, plant a Pea Pod.",
    lanes: [2], plants: ["pea"], gnomes: ["basic", "flag"], startSun: 150, sky: 7, theme: "day",
    waves: [wave(20, { b: 1 }), wave(45, { b: 2 }), wave(72, { b: 2 }), wave(100, { b: 4 }, true)],
  },
  {
    name: "Sunbloom Row", blurb: "Three lanes. Sunbloom makes sun, so build an economy first.",
    lanes: [1, 2, 3], plants: ["sun"], gnomes: [], startSun: 150, sky: 7, theme: "day",
    waves: [wave(22, { b: 1 }), wave(48, { b: 2 }), wave(74, { b: 3 }), wave(100, { b: 3 }), wave(130, { b: 6 }, true)],
  },
  {
    name: "Hard Hats", blurb: "The whole lawn. Cone gnomes take a lot of peas: stall them with Walnut Walls.",
    lanes: ALL, plants: ["nut"], gnomes: ["cone"], startSun: 150, sky: 7.5, theme: "day",
    waves: [
      wave(22, { b: 2 }), wave(44, { b: 2, c: 1 }), wave(68, { b: 3, c: 1 }), wave(94, { b: 2, c: 2 }),
      wave(122, { b: 3, c: 2 }), wave(152, { b: 5, c: 3 }, true),
    ],
  },
  {
    name: "Boom Time", blurb: "Sprinters are fast! Boom Cherries clear a whole bunch at once.",
    lanes: ALL, plants: ["cherry"], gnomes: ["runner"], startSun: 125, sky: 8.5, theme: "day",
    waves: [
      wave(18, { b: 2, r: 1 }), wave(38, { b: 2, c: 1, r: 1 }), wave(58, { b: 3, c: 2, r: 2 }), wave(80, { b: 2, c: 3, r: 2 }),
      wave(105, { b: 2, c: 3, r: 3 }), wave(135, { b: 6, c: 3, r: 3 }, true),
    ],
  },
  {
    name: "Cold Snap", blurb: "Buckets are tanky. Frost Pods slow them down so everything else can catch up.",
    lanes: ALL, plants: ["frost"], gnomes: ["bucket"], startSun: 125, sky: 9, theme: "day",
    waves: [
      wave(18, { b: 2, c: 1 }), wave(40, { b: 3, k: 1, r: 1 }), wave(62, { k: 1, c: 2, r: 2, b: 2 }),
      wave(85, { b: 4, c: 2, k: 1, r: 2 }, true), wave(118, { k: 2, c: 2, b: 3 }), wave(145, { b: 3, k: 2, c: 3, r: 2 }),
      wave(175, { b: 6, c: 3, k: 3, r: 3 }, true),
    ],
  },
  {
    name: "Pole Position", blurb: "Pole Vaulters hop over the first plant they meet. Mines wait for them behind it.",
    lanes: ALL, plants: ["mine"], gnomes: ["vaulter"], startSun: 150, sky: 9, theme: "day",
    waves: [
      wave(18, { b: 2, v: 1 }), wave(40, { v: 2, c: 1, b: 2 }), wave(62, { v: 2, c: 2, r: 1, b: 2 }), wave(85, { k: 1, v: 2, c: 2 }),
      wave(112, { v: 3, b: 4, c: 2, k: 1 }, true), wave(145, { v: 2, k: 2, c: 2, r: 2 }),
      wave(178, { v: 4, k: 2, c: 3, r: 2, b: 4 }, true),
    ],
  },
  {
    name: "Dusk Rush", blurb: "Evening: less sun falls from the sky. Twin Pods double your firepower.",
    lanes: ALL, plants: ["twin"], gnomes: [], startSun: 175, sky: 14, theme: "dusk",
    waves: [
      wave(16, { b: 3, c: 1 }), wave(36, { v: 2, b: 2, c: 1 }), wave(56, { k: 1, c: 2, r: 2, b: 2 }), wave(80, { v: 2, k: 1, r: 2, c: 2 }),
      wave(105, { v: 3, k: 2, c: 3, b: 3, r: 2 }, true), wave(138, { k: 2, v: 2, c: 2, r: 3 }), wave(168, { k: 3, c: 3, v: 2, b: 3 }),
      wave(200, { k: 4, v: 4, c: 4, r: 3, b: 4 }, true),
    ],
  },
  {
    name: "Over the Fence", blurb: "Gate Gnomes hide behind a garden gate that stops peas. Lobbers arc right over it.",
    lanes: ALL, plants: ["lobber"], gnomes: ["gate"], startSun: 150, sky: 9, theme: "day",
    waves: [
      wave(16, { b: 2, g: 1 }), wave(36, { g: 2, c: 2, b: 1 }), wave(56, { g: 2, v: 2, r: 2 }), wave(80, { k: 2, g: 2, c: 2, v: 1 }),
      wave(105, { g: 3, v: 3, k: 2, c: 2, r: 2 }, true), wave(138, { g: 3, k: 2, v: 2, c: 3 }), wave(170, { k: 3, g: 3, v: 3, r: 3 }),
      wave(202, { g: 4, k: 3, v: 4, c: 3, r: 3, b: 3 }, true),
    ],
  },
  {
    name: "Stampede", blurb: "Everything at once. Keep your sun coming and your lanes covered.",
    lanes: ALL, plants: [], gnomes: [], startSun: 200, sky: 9, theme: "day",
    waves: [
      wave(12, { v: 2, r: 2, c: 2, b: 2 }), wave(32, { g: 2, k: 2, c: 2, v: 2 }), wave(52, { r: 4, v: 2, g: 2, k: 2 }),
      wave(74, { k: 3, g: 3, v: 3, c: 3, r: 3 }, true), wave(104, { g: 3, k: 3, v: 3, r: 4, c: 2 }), wave(130, { k: 4, g: 3, v: 4, r: 3 }),
      wave(158, { k: 4, g: 4, v: 4, c: 4, r: 4, b: 4 }, true), wave(190, { k: 4, g: 4, v: 4, r: 4, c: 4 }),
      wave(220, { k: 5, g: 5, v: 5, c: 5, r: 5, b: 5 }, true),
    ],
  },
  {
    name: "Garden Showdown", blurb: "The finale. A moonlit lawn, little sky sun and three huge waves.",
    lanes: ALL, plants: [], gnomes: [], startSun: 250, sky: 12, theme: "night",
    waves: [
      wave(14, { b: 3, c: 2, v: 2, r: 2 }), wave(34, { k: 2, g: 2, v: 3, c: 2 }), wave(56, { k: 3, g: 3, v: 3, r: 3 }),
      wave(80, { k: 3, g: 3, v: 4, c: 4, r: 3, b: 3 }, true), wave(112, { k: 4, g: 4, v: 4, r: 4 }), wave(140, { k: 4, g: 4, v: 5, c: 4, r: 4 }),
      wave(170, { k: 5, g: 5, v: 5, c: 5, r: 5, b: 5 }, true), wave(204, { k: 5, g: 5, v: 5, r: 5, c: 5 }),
      wave(236, { k: 5, g: 5, v: 6, c: 5, r: 6 }), wave(270, { k: 6, g: 6, v: 6, c: 6, r: 6, b: 6 }, true),
    ],
  },
];

// Seeds introduced per level (in order), so every level can say what is new.
const NEW_PLANTS: PlantId[][] = [["pea"], ["sun"], ["nut"], ["cherry"], ["frost"], ["mine"], ["twin"], ["lobber"], [], []];
// Gnomes introduced per level, matching the waves above.
const NEW_GNOMES: GnomeKind[][] = [["basic", "flag"], [], ["cone"], ["runner"], ["bucket"], ["vaulter"], [], ["gate"], [], []];

export const LEVELS: LevelDef[] = RAW.map((r, i) => {
  const plants = NEW_PLANTS.slice(0, i + 1).flat();
  const gnomes = GNOME_ORDER.filter((g) => NEW_GNOMES.slice(0, i + 1).flat().includes(g));
  return { id: i + 1, name: r.name, blurb: r.blurb, lanes: r.lanes, newPlants: NEW_PLANTS[i], plants, newGnomes: NEW_GNOMES[i], gnomes, startSun: r.startSun, sky: r.sky, theme: r.theme, waves: r.waves };
});

export const LEVEL_COUNT = LEVELS.length;
