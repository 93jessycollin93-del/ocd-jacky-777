// Items, tools, structures and crafting recipes for Primal Isle.

export type ItemId =
  | "wood" | "thatch" | "stone" | "flint" | "fiber" | "berries" | "narcoberry"
  | "raw_meat" | "cooked_meat" | "hide"
  | "stone_pick" | "stone_hatchet" | "spear" | "club" | "bandage"
  | "campfire" | "foundation" | "wall" | "bed" | "storage"
  | "plank" | "cobblestone" | "thatch_block" | "torch"
  | "metal_ore" | "metal_ingot" | "metal_pick" | "metal_hatchet" | "metal_sword" | "forge" | "metal_block";

export type ItemKind = "resource" | "tool" | "consumable" | "structure" | "block";

export interface ToolStats {
  damage: number;
  /** Knock-out damage dealt to creatures; builds their torpor. */
  torpor: number;
  reach: number;
  cooldown: number;
  /** Harvest multipliers per node kind. */
  harvest: Partial<Record<"tree" | "rock" | "bush" | "ore" | "corpse", number>>;
}

export interface ItemDef {
  id: ItemId;
  name: string;
  kind: ItemKind;
  icon: string;
  tool?: ToolStats;
  /** For consumables: what using one restores. */
  restores?: { hp?: number; food?: number; water?: number; stamina?: number };
}

export const HAND: ToolStats = { damage: 8, torpor: 0, reach: 2.6, cooldown: 0.5, harvest: { tree: 1, rock: 1, bush: 1, corpse: 0.5 } };

export const ITEMS: Record<ItemId, ItemDef> = {
  wood: { id: "wood", name: "Wood", kind: "resource", icon: "🪵" },
  thatch: { id: "thatch", name: "Thatch", kind: "resource", icon: "🌾" },
  stone: { id: "stone", name: "Stone", kind: "resource", icon: "🪨" },
  flint: { id: "flint", name: "Flint", kind: "resource", icon: "🔺" },
  fiber: { id: "fiber", name: "Fiber", kind: "resource", icon: "🧵" },
  hide: { id: "hide", name: "Hide", kind: "resource", icon: "🟤" },
  berries: { id: "berries", name: "Wild Berries", kind: "consumable", icon: "🫐", restores: { food: 6, water: 2 } },
  narcoberry: { id: "narcoberry", name: "Sleepberries", kind: "resource", icon: "🍇" },
  raw_meat: { id: "raw_meat", name: "Raw Meat", kind: "consumable", icon: "🥩", restores: { food: 10, hp: -4 } },
  cooked_meat: { id: "cooked_meat", name: "Cooked Meat", kind: "consumable", icon: "🍖", restores: { food: 30, hp: 6 } },
  bandage: { id: "bandage", name: "Bandage", kind: "consumable", icon: "🩹", restores: { hp: 35 } },
  stone_pick: {
    id: "stone_pick", name: "Stone Pick", kind: "tool", icon: "⛏️",
    tool: { damage: 14, torpor: 0, reach: 2.8, cooldown: 0.6, harvest: { rock: 3, ore: 1.5, tree: 1.5, bush: 1, corpse: 1 } },
  },
  stone_hatchet: {
    id: "stone_hatchet", name: "Stone Hatchet", kind: "tool", icon: "🪓",
    tool: { damage: 16, torpor: 0, reach: 2.8, cooldown: 0.6, harvest: { tree: 3, rock: 1.5, bush: 1, corpse: 2.5 } },
  },
  spear: {
    id: "spear", name: "Spear", kind: "tool", icon: "🔱",
    tool: { damage: 30, torpor: 0, reach: 3.8, cooldown: 0.8, harvest: { corpse: 1 } },
  },
  club: {
    id: "club", name: "Wooden Club", kind: "tool", icon: "🏏",
    tool: { damage: 5, torpor: 22, reach: 2.8, cooldown: 0.7, harvest: { corpse: 0.5 } },
  },
  campfire: { id: "campfire", name: "Campfire", kind: "structure", icon: "🔥" },
  foundation: { id: "foundation", name: "Thatch Foundation", kind: "structure", icon: "🟧" },
  wall: { id: "wall", name: "Thatch Wall", kind: "structure", icon: "🧱" },
  bed: { id: "bed", name: "Sleeping Bag", kind: "structure", icon: "🛏️" },
  storage: { id: "storage", name: "Storage Box", kind: "structure", icon: "📦" },
  plank: { id: "plank", name: "Wood Planks", kind: "block", icon: "🟫" },
  cobblestone: { id: "cobblestone", name: "Cobblestone", kind: "block", icon: "⬜" },
  thatch_block: { id: "thatch_block", name: "Thatch Block", kind: "block", icon: "🟨" },
  torch: { id: "torch", name: "Torch", kind: "block", icon: "🕯️" },
  metal_ore: { id: "metal_ore", name: "Metal Ore", kind: "resource", icon: "🪙" },
  metal_ingot: { id: "metal_ingot", name: "Metal Ingot", kind: "resource", icon: "🔩" },
  metal_pick: {
    id: "metal_pick", name: "Metal Pick", kind: "tool", icon: "⚒️",
    tool: { damage: 24, torpor: 0, reach: 3, cooldown: 0.5, harvest: { rock: 6, ore: 3, tree: 2, bush: 1.5, corpse: 1.5 } },
  },
  metal_hatchet: {
    id: "metal_hatchet", name: "Metal Hatchet", kind: "tool", icon: "🪓",
    tool: { damage: 28, torpor: 0, reach: 3, cooldown: 0.5, harvest: { tree: 6, rock: 2, bush: 1.5, corpse: 4 } },
  },
  metal_sword: {
    id: "metal_sword", name: "Metal Sword", kind: "tool", icon: "🗡️",
    tool: { damage: 48, torpor: 0, reach: 3.2, cooldown: 0.55, harvest: { corpse: 1.5, bush: 1 } },
  },
  forge: { id: "forge", name: "Forge", kind: "structure", icon: "🏭" },
  metal_block: { id: "metal_block", name: "Metal Block", kind: "block", icon: "🔲" },
};

export type Cost = Partial<Record<ItemId, number>>;

export interface Recipe {
  id: string;
  output: ItemId;
  count: number;
  cost: Cost;
  /** Must be standing near a lit campfire. */
  needsCampfire?: boolean;
  /** Must be standing near a forge. */
  needsForge?: boolean;
  level?: number;
}

export const RECIPES: Recipe[] = [
  { id: "stone_pick", output: "stone_pick", count: 1, cost: { wood: 1, thatch: 10, stone: 1 } },
  { id: "stone_hatchet", output: "stone_hatchet", count: 1, cost: { wood: 1, flint: 1, stone: 1, thatch: 10 } },
  { id: "club", output: "club", count: 1, cost: { wood: 10, fiber: 6 } },
  { id: "spear", output: "spear", count: 1, cost: { wood: 8, flint: 2, fiber: 12 }, level: 2 },
  { id: "bandage", output: "bandage", count: 1, cost: { fiber: 10, berries: 4 } },
  { id: "campfire", output: "campfire", count: 1, cost: { thatch: 12, flint: 1, stone: 16, wood: 2 } },
  { id: "foundation", output: "foundation", count: 1, cost: { wood: 15, thatch: 10, fiber: 6 }, level: 2 },
  { id: "wall", output: "wall", count: 1, cost: { wood: 8, thatch: 6, fiber: 4 }, level: 2 },
  { id: "bed", output: "bed", count: 1, cost: { fiber: 15, hide: 6, thatch: 10 } },
  { id: "storage", output: "storage", count: 1, cost: { wood: 25, thatch: 15, fiber: 10 }, level: 2 },
  { id: "plank", output: "plank", count: 2, cost: { wood: 1 } },
  { id: "cobblestone", output: "cobblestone", count: 1, cost: { stone: 2 } },
  { id: "thatch_block", output: "thatch_block", count: 1, cost: { thatch: 4 } },
  { id: "torch", output: "torch", count: 4, cost: { wood: 1, fiber: 2, flint: 1 } },
  { id: "cooked_meat", output: "cooked_meat", count: 1, cost: { raw_meat: 1, wood: 1 }, needsCampfire: true },
  { id: "forge", output: "forge", count: 1, cost: { stone: 30, flint: 6, wood: 10, hide: 3 }, level: 3 },
  { id: "metal_ingot", output: "metal_ingot", count: 1, cost: { metal_ore: 2, wood: 1 }, needsForge: true },
  { id: "metal_pick", output: "metal_pick", count: 1, cost: { metal_ingot: 3, wood: 2, hide: 1 }, level: 3 },
  { id: "metal_hatchet", output: "metal_hatchet", count: 1, cost: { metal_ingot: 3, wood: 2, hide: 1 }, level: 3 },
  { id: "metal_sword", output: "metal_sword", count: 1, cost: { metal_ingot: 4, wood: 1, hide: 2 }, level: 4 },
  { id: "metal_block", output: "metal_block", count: 1, cost: { metal_ingot: 2 }, level: 3 },
];

export const isEquippable = (id: ItemId) => ITEMS[id].kind !== "resource";
