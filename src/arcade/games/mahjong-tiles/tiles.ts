// The 144-tile set. Kinds are numbered so that suits are easy to tell apart:
//   0-8 dots, 9-17 bamboo, 18-26 characters (one to nine), 27-30 winds (E S W N), 31-33 dragons (red, green, white),
//   34-37 flowers, 38-41 seasons. Each of the first 34 kinds has four copies; flowers and seasons have one each.

export const KIND_COUNT = 42;
export const FIRST_FLOWER = 34;
export const FIRST_SEASON = 38;

export type Suit = "dots" | "bamboo" | "characters" | "wind" | "dragon" | "flower" | "season";

export function suitOf(kind: number): Suit {
  if (kind < 9) return "dots";
  if (kind < 18) return "bamboo";
  if (kind < 27) return "characters";
  if (kind < 31) return "wind";
  if (kind < 34) return "dragon";
  if (kind < 38) return "flower";
  return "season";
}

/** Which tiles match: identical kinds, any flower with any flower, any season with any season. */
export const matchClass = (kind: number) => (kind >= FIRST_SEASON ? FIRST_SEASON : kind >= FIRST_FLOWER ? FIRST_FLOWER : kind);

export const matches = (a: number, b: number) => matchClass(a) === matchClass(b);

/** All 144 tiles, in kind order. */
export function fullSet(): number[] {
  const out: number[] = [];
  for (let k = 0; k < FIRST_FLOWER; k++) for (let c = 0; c < 4; c++) out.push(k);
  for (let k = FIRST_FLOWER; k < KIND_COUNT; k++) out.push(k);
  return out;
}

const NUM = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const WINDS = ["East", "South", "West", "North"];
const DRAGONS = ["Red dragon", "Green dragon", "White dragon"];
const FLOWERS = ["Plum", "Orchid", "Chrysanthemum", "Bamboo"];
const SEASONS = ["Spring", "Summer", "Autumn", "Winter"];

export function kindName(kind: number): string {
  switch (suitOf(kind)) {
    case "dots": return `${NUM[kind]} of dots`;
    case "bamboo": return `${NUM[kind - 9]} of bamboo`;
    case "characters": return `${NUM[kind - 18]} of characters`;
    case "wind": return `${WINDS[kind - 27]} wind`;
    case "dragon": return DRAGONS[kind - 31];
    case "flower": return `${FLOWERS[kind - 34]} flower`;
    default: return `${SEASONS[kind - 38]} season`;
  }
}
