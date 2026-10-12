// Seeded random numbers, so game logic is repeatable in tests.

export type Rng = () => number;

/** Fast seeded generator: returns floats in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] inclusive. */
export const randInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

export const pick = <T,>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];

/** Shuffle in place (Fisher–Yates) and return the array. */
export function shuffle<T>(rng: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);
