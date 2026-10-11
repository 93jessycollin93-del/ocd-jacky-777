// The island: terrain height, water, and harvestable resource nodes.
import { fbm, mulberry32, smoothstep } from "./noise";

export const WORLD_SIZE = 400;
export const WORLD_HALF = WORLD_SIZE / 2;
export const WATER_LEVEL = 0;

export type NodeKind = "tree" | "rock" | "bush" | "ore";

export interface ResourceNode {
  id: number;
  kind: NodeKind;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  /** World time (seconds) at which a depleted node regrows; 0 while standing. */
  respawnAt: number;
}

export const NODE_HP: Record<NodeKind, number> = { tree: 60, rock: 80, bush: 20, ore: 90 };
export const NODE_RESPAWN_SECONDS = 180;
export const NODE_RADIUS: Record<NodeKind, number> = { tree: 0.6, rock: 1.1, bush: 0.7, ore: 1.1 };

/** Terrain height at a world position. An island: hills in the middle, beaches, then ocean. */
export function heightAt(x: number, z: number, seed: number): number {
  const d = Math.hypot(x, z) / WORLD_HALF;
  const falloff = 1 - smoothstep(0.45, 0.95, d);
  const hills = fbm(x / 70 + 100, z / 70 + 100, seed, 5);
  const ridges = 1 - Math.abs(fbm(x / 45, z / 45, seed + 7, 3) * 2 - 1);
  const h = (hills * 0.75 + ridges * 0.25 + 0.3) * falloff * 34 - 5;
  return h;
}

export function isWater(x: number, z: number, seed: number): boolean {
  return heightAt(x, z, seed) < WATER_LEVEL;
}

/** Where a fresh survivor washes up: the first dry beach walking inland from the south shore. */
export function spawnPoint(seed: number): { x: number; z: number } {
  for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
    for (let r = WORLD_HALF; r > 0; r -= 2) {
      const x = Math.sin(angle) * r;
      const z = Math.cos(angle) * r;
      const h = heightAt(x, z, seed);
      if (h > 1 && h < 6) return { x, z };
    }
  }
  return { x: 0, z: 0 };
}

export function generateNodes(seed: number): ResourceNode[] {
  const rng = mulberry32(seed ^ 0x51ed);
  const nodes: ResourceNode[] = [];
  const step = 6;
  let id = 1;
  for (let gx = -WORLD_HALF + step; gx < WORLD_HALF; gx += step) {
    for (let gz = -WORLD_HALF + step; gz < WORLD_HALF; gz += step) {
      const x = gx + (rng() - 0.5) * step * 0.9;
      const z = gz + (rng() - 0.5) * step * 0.9;
      const y = heightAt(x, z, seed);
      if (y < 1) continue;
      const forest = fbm(x / 40, z / 40, seed + 31, 3);
      const roll = rng();
      let kind: NodeKind | null = null;
      if (y > 2.5 && y < 20 && forest > 0.52 && roll < 0.75) kind = "tree";
      // Metal ore is a share of the mountain rocks, so adding it didn't move any other node.
      else if ((y > 14 && roll < 0.35) || roll < 0.04) kind = y > 14 && roll < 0.1 ? "ore" : "rock";
      else if (y < 14 && roll < 0.14) kind = "bush";
      if (!kind) continue;
      nodes.push({ id: id++, kind, x, y, z, hp: NODE_HP[kind], maxHp: NODE_HP[kind], respawnAt: 0 });
    }
  }
  return nodes;
}

/** A random dry, walkable spot, optionally kept away from a point (so spawns don't pop in on the player). */
export function randomLandPoint(
  seed: number,
  rng: () => number,
  avoid?: { x: number; z: number; radius: number },
  minHeight = 1.5,
  maxHeight = 18,
): { x: number; z: number } {
  for (let i = 0; i < 200; i++) {
    const x = (rng() * 2 - 1) * WORLD_HALF * 0.85;
    const z = (rng() * 2 - 1) * WORLD_HALF * 0.85;
    const h = heightAt(x, z, seed);
    if (h < minHeight || h > maxHeight) continue;
    if (avoid && Math.hypot(x - avoid.x, z - avoid.z) < avoid.radius) continue;
    return { x, z };
  }
  return spawnPoint(seed);
}
