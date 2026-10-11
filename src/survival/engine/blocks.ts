// Minecraft-style building blocks on a 1 m grid, layered on top of the heightfield island.
// Pure data helpers: a block map, ray casting, and collision. Game actions live in game.ts.
import type { ItemId } from "./items";
import { heightAt } from "./world";

export type BlockId =
  | "plank" | "cobblestone" | "thatch_block" | "torch" | "metal_block"
  | "dirt" | "sand" | "glass" | "stone_brick" | "log" | "door" | "door_open";

/** Blocks you can hold and place (an open door is only ever a door you've opened). */
export type PlaceableBlock = Exclude<BlockId, "door_open">;

/** "x,y,z" of the cell's minimum corner; the block fills [x, x+1) × [y, y+1) × [z, z+1). */
export type BlockMap = Record<string, BlockId>;

export interface BlockDef {
  id: BlockId;
  /** Hits with a 1× tool to break it. */
  hardness: number;
  /** Which tool multiplier applies when breaking it. */
  breakAs: "tree" | "rock" | "bush" | "ground";
  /** Solid blocks stop the player and creatures; torches and open doors don't. */
  solid: boolean;
  /** What breaking it gives back, when that isn't the block itself. */
  drop?: PlaceableBlock;
}

export const BLOCKS: Record<BlockId, BlockDef> = {
  plank: { id: "plank", hardness: 3, breakAs: "tree", solid: true },
  cobblestone: { id: "cobblestone", hardness: 5, breakAs: "rock", solid: true },
  thatch_block: { id: "thatch_block", hardness: 1, breakAs: "bush", solid: true },
  torch: { id: "torch", hardness: 1, breakAs: "bush", solid: false },
  metal_block: { id: "metal_block", hardness: 18, breakAs: "rock", solid: true },
  dirt: { id: "dirt", hardness: 1.5, breakAs: "ground", solid: true },
  sand: { id: "sand", hardness: 1.5, breakAs: "ground", solid: true },
  glass: { id: "glass", hardness: 1, breakAs: "rock", solid: true },
  stone_brick: { id: "stone_brick", hardness: 6, breakAs: "rock", solid: true },
  log: { id: "log", hardness: 4, breakAs: "tree", solid: true },
  door: { id: "door", hardness: 3, breakAs: "tree", solid: true },
  door_open: { id: "door_open", hardness: 3, breakAs: "tree", solid: false, drop: "door" },
};

export const isDoor = (b: BlockId | undefined): b is "door" | "door_open" => b === "door" || b === "door_open";

/** The other half of a two-high door, if there is one. */
export function doorPartner(blocks: BlockMap, x: number, y: number, z: number): [number, number, number] | null {
  if (isDoor(blocks[cellKey(x, y + 1, z)])) return [x, y + 1, z];
  if (isDoor(blocks[cellKey(x, y - 1, z)])) return [x, y - 1, z];
  return null;
}

// "door_open" is never an item, so any item id found in BLOCKS is a placeable block.
export const isBlockItem = (id: ItemId | null | undefined): id is PlaceableBlock & ItemId => !!id && id in BLOCKS;

export const cellKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

export function parseKey(key: string): [number, number, number] {
  const [x, y, z] = key.split(",").map(Number);
  return [x, y, z];
}

export function blockAt(blocks: BlockMap, x: number, y: number, z: number): BlockId | undefined {
  return blocks[cellKey(Math.floor(x), Math.floor(y), Math.floor(z))];
}

export function solidAt(blocks: BlockMap, x: number, y: number, z: number): boolean {
  const b = blockAt(blocks, x, y, z);
  return !!b && BLOCKS[b].solid;
}

export const PLAYER_RADIUS = 0.3;
export const PLAYER_HEIGHT = 1.75;
const CORNERS: [number, number][] = [
  [-PLAYER_RADIUS, -PLAYER_RADIUS],
  [PLAYER_RADIUS, -PLAYER_RADIUS],
  [-PLAYER_RADIUS, PLAYER_RADIUS],
  [PLAYER_RADIUS, PLAYER_RADIUS],
];

/** Would a player standing with feet at (x, y, z) overlap a solid block? */
export function bodyBlocked(blocks: BlockMap, x: number, y: number, z: number): boolean {
  for (const [dx, dz] of CORNERS) {
    for (const h of [0.05, 0.9, PLAYER_HEIGHT]) {
      if (solidAt(blocks, x + dx, y + h, z + dz)) return true;
    }
  }
  return false;
}

/** Top of the highest solid block under the player's footprint that they could be standing on, or -Infinity. */
export function blockSupport(blocks: BlockMap, x: number, y: number, z: number): number {
  let top = -Infinity;
  for (const [dx, dz] of CORNERS) {
    const cx = Math.floor(x + dx);
    const cz = Math.floor(z + dz);
    // Only blocks whose top is at or a little above the feet count; scan a few cells down.
    for (let cy = Math.floor(y + 0.5) - 1; cy >= Math.floor(y) - 4; cy--) {
      const b = blocks[cellKey(cx, cy, cz)];
      if (b && BLOCKS[b].solid) {
        top = Math.max(top, cy + 1);
        break;
      }
    }
  }
  return top;
}

/** Cell a block placed on bare ground at (x, z) should occupy: sitting on, or slightly sunk into, the slope. */
export function groundCell(seed: number, x: number, z: number): [number, number, number] {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  return [cx, Math.floor(heightAt(cx + 0.5, cz + 0.5, seed) + 0.3), cz];
}

export interface BlockHit {
  /** The block that was hit, or null when the ray hit the ground. */
  block: BlockId | null;
  /** Cell that was hit (for a ground hit, the cell just above the ground). */
  cell: [number, number, number];
  /** Where a new block would go. */
  place: [number, number, number];
  dist: number;
}

/**
 * March a ray from the eye and report the first block or ground it meets within reach.
 * Fine-stepped rather than a DDA: reach is short and the ground is a heightfield, not voxels.
 */
export function raycastBlocks(
  blocks: BlockMap,
  seed: number,
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  reach: number,
): BlockHit | null {
  const stepLen = 0.05;
  let prev: [number, number, number] = [Math.floor(origin.x), Math.floor(origin.y), Math.floor(origin.z)];
  for (let t = stepLen; t <= reach; t += stepLen) {
    const x = origin.x + dir.x * t;
    const y = origin.y + dir.y * t;
    const z = origin.z + dir.z * t;
    const cell: [number, number, number] = [Math.floor(x), Math.floor(y), Math.floor(z)];
    const b = blocks[cellKey(cell[0], cell[1], cell[2])];
    if (b) return { block: b, cell, place: prev, dist: t };
    if (y <= heightAt(x, z, seed)) {
      const place = groundCell(seed, x, z);
      // If a block already sits in the ground cell, stack on top of it.
      while (blocks[cellKey(place[0], place[1], place[2])]) place[1]++;
      return { block: null, cell: place, place, dist: t };
    }
    if (cell[0] !== prev[0] || cell[1] !== prev[1] || cell[2] !== prev[2]) prev = cell;
  }
  return null;
}

/** Hits needed to break a block with a given harvest multiplier. */
export function hitsToBreak(block: BlockId, mult: number): number {
  return Math.max(1, Math.ceil(BLOCKS[block].hardness / Math.max(mult, 0.25)));
}
