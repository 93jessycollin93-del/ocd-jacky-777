// Items, tools, structures and crafting recipes for Primal Isle.
//
// Everything here is data. To add an item: give it an entry in ITEMS (with a real-world weight and a
// one-line description). To make it craftable: add one line to RECIPES. The crafting UI, queue, stations,
// weight and repair systems all read from these tables, so nothing else needs to change.

export type ItemId =
  | "wood" | "thatch" | "stone" | "flint" | "fiber" | "berries" | "narcoberry"
  | "raw_meat" | "cooked_meat" | "hide" | "cordage" | "leather"
  | "stone_pick" | "stone_hatchet" | "spear" | "club"
  | "bandage" | "tourniquet" | "splint" | "salve"
  | "campfire" | "foundation" | "wall" | "bed" | "storage" | "workbench"
  | "plank" | "cobblestone" | "thatch_block" | "torch"
  | "metal_ore" | "metal_ingot" | "metal_pick" | "metal_hatchet" | "metal_sword" | "forge" | "metal_block"
  | "dirt" | "sand" | "glass" | "stone_brick" | "log" | "door" | "stone_shovel"
  | "lootbag";

export type ItemKind = "resource" | "tool" | "consumable" | "structure" | "block";

/** Injuries a medical item can treat. */
export type Ailment = "bleeding" | "heavy_bleeding" | "fracture";

export interface ToolStats {
  damage: number;
  /** Knock-out damage dealt to creatures; builds their torpor. */
  torpor: number;
  reach: number;
  cooldown: number;
  /** Harvest multipliers; "ground" is digging dirt and sand. */
  harvest: Partial<Record<"tree" | "rock" | "bush" | "ore" | "ground" | "corpse", number>>;
}

export interface ItemDef {
  id: ItemId;
  name: string;
  kind: ItemKind;
  icon: string;
  /** Mass of one, in kilograms. Carried weight slows you down past your capacity. */
  weight: number;
  /** One line shown in the bag. */
  desc: string;
  tool?: ToolStats;
  /** Uses before a tool breaks (each hit on something counts as one). */
  durability?: number;
  /** For consumables: what using one restores (negative values hurt). */
  restores?: { hp?: number; food?: number; water?: number; stamina?: number };
  /** For medical items: injuries it fixes. */
  cures?: Ailment[];
  /** For medical items: health restored gradually. */
  regen?: { hp: number; seconds: number };
}

export const HAND: ToolStats = {
  damage: 8, torpor: 0, reach: 2.6, cooldown: 0.5,
  harvest: { tree: 1, rock: 1, bush: 1, ground: 1, corpse: 0.5 },
};

export const ITEMS: Record<ItemId, ItemDef> = {
  // -- raw resources
  wood: { id: "wood", name: "Wood", kind: "resource", icon: "🪵", weight: 0.5, desc: "Split branches and bark. Fuel, handles and building stock." },
  thatch: { id: "thatch", name: "Thatch", kind: "resource", icon: "🌾", weight: 0.05, desc: "Dry grass and leaves for roofing and kindling." },
  stone: { id: "stone", name: "Stone", kind: "resource", icon: "🪨", weight: 0.8, desc: "Fist-sized rock. Heavy; store it rather than carry it." },
  flint: { id: "flint", name: "Flint", kind: "resource", icon: "🔺", weight: 0.2, desc: "Knaps to a razor edge and throws sparks against stone." },
  fiber: { id: "fiber", name: "Plant Fiber", kind: "resource", icon: "🧵", weight: 0.02, desc: "Stringy stems from bushes. Twist it into cordage." },
  hide: { id: "hide", name: "Raw Hide", kind: "resource", icon: "🟤", weight: 0.4, desc: "Untreated animal skin. Tan it into leather at a workbench." },
  metal_ore: { id: "metal_ore", name: "Metal Ore", kind: "resource", icon: "🪙", weight: 1.5, desc: "Iron-bearing rock from the mountains. Smelt it at a forge." },
  narcoberry: { id: "narcoberry", name: "Sleepberries", kind: "resource", icon: "🍇", weight: 0.02, desc: "Sedative berries. Feed to a knocked-out creature to keep it under." },

  // -- processed materials
  cordage: { id: "cordage", name: "Cordage", kind: "resource", icon: "🪢", weight: 0.05, desc: "Twisted fiber rope. Binds tool heads, splints and frames." },
  leather: { id: "leather", name: "Leather", kind: "resource", icon: "🟫", weight: 0.3, desc: "Tanned hide: tough, flexible, and doesn't rot." },
  metal_ingot: { id: "metal_ingot", name: "Metal Ingot", kind: "resource", icon: "🔩", weight: 1.0, desc: "Smelted iron bar, ready to work into tools." },

  // -- food
  berries: {
    id: "berries", name: "Wild Berries", kind: "consumable", icon: "🫐", weight: 0.02,
    desc: "A handful of tart berries. A little food and water.", restores: { food: 6, water: 2 },
  },
  raw_meat: {
    id: "raw_meat", name: "Raw Meat", kind: "consumable", icon: "🥩", weight: 0.25,
    desc: "Fresh meat. Eating it raw will make you sick; cook it.", restores: { food: 10, hp: -4 },
  },
  cooked_meat: {
    id: "cooked_meat", name: "Cooked Meat", kind: "consumable", icon: "🍖", weight: 0.2,
    desc: "Fire-cooked meat. Filling and safe.", restores: { food: 30, hp: 6 },
  },

  // -- medical
  bandage: {
    id: "bandage", name: "Bandage", kind: "consumable", icon: "🩹", weight: 0.05,
    desc: "Woven fiber dressing. Stops light bleeding and patches you up a little.",
    restores: { hp: 10 }, cures: ["bleeding"],
  },
  tourniquet: {
    id: "tourniquet", name: "Tourniquet", kind: "consumable", icon: "🎗️", weight: 0.15,
    desc: "Leather strap and windlass. Stops heavy (arterial) bleeding.", cures: ["heavy_bleeding"],
  },
  splint: {
    id: "splint", name: "Splint", kind: "consumable", icon: "🦯", weight: 0.6,
    desc: "Wooden slats lashed with cordage. Sets a broken leg so you can run again.", cures: ["fracture"],
  },
  salve: {
    id: "salve", name: "Herbal Salve", kind: "consumable", icon: "🧴", weight: 0.1,
    desc: "Berry-and-fiber poultice boiled at a fire. Heals 40 health over 20 seconds.",
    regen: { hp: 40, seconds: 20 },
  },

  // -- tools
  stone_pick: {
    id: "stone_pick", name: "Stone Pick", kind: "tool", icon: "⛏️", weight: 2.2, durability: 150,
    desc: "Stone head lashed to a haft. Mines rock and ore.",
    tool: { damage: 14, torpor: 0, reach: 2.8, cooldown: 0.6, harvest: { rock: 3, ore: 1.5, tree: 1.5, bush: 1, ground: 1.5, corpse: 1 } },
  },
  stone_hatchet: {
    id: "stone_hatchet", name: "Stone Hatchet", kind: "tool", icon: "🪓", weight: 1.8, durability: 150,
    desc: "Knapped flint blade. Fells trees and butchers carcasses.",
    tool: { damage: 16, torpor: 0, reach: 2.8, cooldown: 0.6, harvest: { tree: 3, rock: 1.5, bush: 1, corpse: 2.5 } },
  },
  stone_shovel: {
    id: "stone_shovel", name: "Stone Shovel", kind: "tool", icon: "🛠️", weight: 2.0, durability: 150,
    desc: "Flat stone blade. Digs dirt and sand in one go.",
    tool: { damage: 10, torpor: 0, reach: 2.8, cooldown: 0.45, harvest: { ground: 4, bush: 1.5, corpse: 0.5 } },
  },
  metal_pick: {
    id: "metal_pick", name: "Metal Pick", kind: "tool", icon: "⚒️", weight: 3.0, durability: 500,
    desc: "Forged iron pick. Mines fast and lasts.",
    tool: { damage: 24, torpor: 0, reach: 3, cooldown: 0.5, harvest: { rock: 6, ore: 3, tree: 2, bush: 1.5, ground: 2, corpse: 1.5 } },
  },
  metal_hatchet: {
    id: "metal_hatchet", name: "Metal Hatchet", kind: "tool", icon: "🪓", weight: 2.4, durability: 500,
    desc: "Forged iron axe. Fells trees and butchers fast.",
    tool: { damage: 28, torpor: 0, reach: 3, cooldown: 0.5, harvest: { tree: 6, rock: 2, bush: 1.5, corpse: 4 } },
  },

  // -- weapons
  club: {
    id: "club", name: "Wooden Club", kind: "tool", icon: "🏏", weight: 1.4, durability: 100,
    desc: "Heavy blunt club. Knocks creatures out with little damage, for taming.",
    tool: { damage: 5, torpor: 22, reach: 2.8, cooldown: 0.7, harvest: { corpse: 0.5 } },
  },
  spear: {
    id: "spear", name: "Spear", kind: "tool", icon: "🔱", weight: 1.6, durability: 120,
    desc: "Flint-tipped spear. Hits hard from a step further away.",
    tool: { damage: 30, torpor: 0, reach: 3.8, cooldown: 0.8, harvest: { corpse: 1 } },
  },
  metal_sword: {
    id: "metal_sword", name: "Metal Sword", kind: "tool", icon: "🗡️", weight: 1.6, durability: 400,
    desc: "Forged iron blade with a leather grip. The best weapon you can make.",
    tool: { damage: 48, torpor: 0, reach: 3.2, cooldown: 0.55, harvest: { corpse: 1.5, bush: 1 } },
  },

  // -- structures and stations
  campfire: { id: "campfire", name: "Campfire", kind: "structure", icon: "🔥", weight: 8, desc: "Stone-ringed fire. Cooks food, boils salve, fires glass, lights the night." },
  workbench: { id: "workbench", name: "Workbench", kind: "structure", icon: "🪚", weight: 15, desc: "Sturdy bench for tanning, joinery, metalwork and tool repair." },
  forge: { id: "forge", name: "Forge", kind: "structure", icon: "🏭", weight: 30, desc: "Stone furnace hot enough to smelt ore into ingots." },
  foundation: { id: "foundation", name: "Thatch Foundation", kind: "structure", icon: "🟧", weight: 12, desc: "A raised 4 m floor to build on." },
  wall: { id: "wall", name: "Thatch Wall", kind: "structure", icon: "🧱", weight: 8, desc: "A 4 m wall section that snaps to foundations." },
  bed: { id: "bed", name: "Sleeping Bag", kind: "structure", icon: "🛏️", weight: 3, desc: "Leather bedroll. You respawn at the last one you placed." },
  storage: { id: "storage", name: "Storage Box", kind: "structure", icon: "📦", weight: 10, desc: "Plank chest. Keeps its contents when you die." },
  // Never crafted or carried: the bag your things drop into when you die.
  lootbag: { id: "lootbag", name: "Dropped Items", kind: "structure", icon: "💼", weight: 0, desc: "Everything you were carrying when you died." },

  // -- building blocks
  plank: { id: "plank", name: "Wood Planks", kind: "block", icon: "🟫", weight: 0.5, desc: "Sawn boards. Light, quick building block." },
  log: { id: "log", name: "Log", kind: "block", icon: "🌲", weight: 1.2, desc: "A trimmed trunk section. Sturdy pillars and corners." },
  cobblestone: { id: "cobblestone", name: "Cobblestone", kind: "block", icon: "⬜", weight: 1.0, desc: "Rough-set stones. Tough walls and foundations." },
  stone_brick: { id: "stone_brick", name: "Stone Bricks", kind: "block", icon: "◼️", weight: 1.0, desc: "Dressed stone. Tougher than cobblestone." },
  thatch_block: { id: "thatch_block", name: "Thatch Block", kind: "block", icon: "🟨", weight: 0.2, desc: "Bundled thatch. Cheap roofing, easy to break." },
  dirt: { id: "dirt", name: "Dirt", kind: "block", icon: "🌱", weight: 0.8, desc: "Turf with grass on top. Dig it from the ground." },
  sand: { id: "sand", name: "Sand", kind: "block", icon: "🏖️", weight: 0.8, desc: "Beach sand. Fire it into glass." },
  glass: { id: "glass", name: "Glass", kind: "block", icon: "🪟", weight: 0.4, desc: "Clear pane fired from sand. See out, keep things out." },
  metal_block: { id: "metal_block", name: "Metal Block", kind: "block", icon: "🔲", weight: 4, desc: "Riveted iron plate. Very hard to break through." },
  torch: { id: "torch", name: "Torch", kind: "block", icon: "🕯️", weight: 0.1, desc: "Burns all night and lights up the area around it." },
  door: { id: "door", name: "Door", kind: "block", icon: "🚪", weight: 3, desc: "Two-high plank door on cordage hinges. Keeps creatures out." },
};

export type Cost = Partial<Record<ItemId, number>>;

/** Where a recipe can be made. No station means by hand, anywhere. */
export type StationId = "campfire" | "workbench" | "forge";

export const STATION_NAMES: Record<StationId, string> = { campfire: "Campfire", workbench: "Workbench", forge: "Forge" };

export type RecipeCategory = "Materials" | "Tools" | "Weapons" | "Medical" | "Food" | "Stations" | "Building" | "Blocks";

export const RECIPE_CATEGORIES: RecipeCategory[] = ["Materials", "Tools", "Weapons", "Medical", "Food", "Stations", "Building", "Blocks"];

export interface Recipe {
  id: string;
  output: ItemId;
  count: number;
  cost: Cost;
  category: RecipeCategory;
  /** Seconds to make one batch in the craft queue. */
  time: number;
  /** Must be standing near this station while it crafts. */
  station?: StationId;
  level?: number;
}

/** One line per recipe. Add a line here (and the item in ITEMS) and it appears everywhere. */
export const RECIPES: Recipe[] = [
  // Materials
  { id: "cordage", output: "cordage", count: 1, cost: { fiber: 3 }, category: "Materials", time: 1.5 },
  { id: "leather", output: "leather", count: 1, cost: { hide: 2 }, category: "Materials", time: 4, station: "workbench" },
  { id: "metal_ingot", output: "metal_ingot", count: 1, cost: { metal_ore: 2, wood: 1 }, category: "Materials", time: 5, station: "forge" },
  // Tools
  { id: "stone_pick", output: "stone_pick", count: 1, cost: { wood: 1, stone: 2, cordage: 1 }, category: "Tools", time: 3 },
  { id: "stone_hatchet", output: "stone_hatchet", count: 1, cost: { wood: 1, flint: 2, cordage: 1 }, category: "Tools", time: 3 },
  { id: "stone_shovel", output: "stone_shovel", count: 1, cost: { wood: 2, stone: 2, cordage: 1 }, category: "Tools", time: 3 },
  { id: "metal_pick", output: "metal_pick", count: 1, cost: { metal_ingot: 3, wood: 2, leather: 1 }, category: "Tools", time: 8, station: "workbench", level: 3 },
  { id: "metal_hatchet", output: "metal_hatchet", count: 1, cost: { metal_ingot: 3, wood: 2, leather: 1 }, category: "Tools", time: 8, station: "workbench", level: 3 },
  // Weapons
  { id: "club", output: "club", count: 1, cost: { wood: 6, cordage: 1 }, category: "Weapons", time: 2 },
  { id: "spear", output: "spear", count: 1, cost: { wood: 4, flint: 2, cordage: 2 }, category: "Weapons", time: 4, level: 2 },
  { id: "metal_sword", output: "metal_sword", count: 1, cost: { metal_ingot: 4, wood: 1, leather: 1 }, category: "Weapons", time: 10, station: "workbench", level: 4 },
  // Medical
  { id: "bandage", output: "bandage", count: 1, cost: { fiber: 8 }, category: "Medical", time: 2 },
  { id: "splint", output: "splint", count: 1, cost: { wood: 2, cordage: 2 }, category: "Medical", time: 3 },
  { id: "tourniquet", output: "tourniquet", count: 1, cost: { leather: 1, cordage: 1 }, category: "Medical", time: 3 },
  { id: "salve", output: "salve", count: 1, cost: { berries: 6, fiber: 2 }, category: "Medical", time: 4, station: "campfire" },
  // Food
  { id: "cooked_meat", output: "cooked_meat", count: 1, cost: { raw_meat: 1, wood: 1 }, category: "Food", time: 3, station: "campfire" },
  // Stations
  { id: "campfire", output: "campfire", count: 1, cost: { stone: 12, wood: 4, flint: 1, thatch: 6 }, category: "Stations", time: 4 },
  { id: "workbench", output: "workbench", count: 1, cost: { wood: 20, stone: 10, cordage: 4 }, category: "Stations", time: 10, level: 2 },
  { id: "forge", output: "forge", count: 1, cost: { stone: 30, flint: 6, wood: 10, leather: 2 }, category: "Stations", time: 15, level: 3 },
  // Building
  { id: "bed", output: "bed", count: 1, cost: { leather: 2, fiber: 12, thatch: 10 }, category: "Building", time: 5 },
  { id: "storage", output: "storage", count: 1, cost: { plank: 12, cordage: 2 }, category: "Building", time: 6, level: 2 },
  { id: "foundation", output: "foundation", count: 1, cost: { wood: 15, thatch: 10, cordage: 2 }, category: "Building", time: 5, level: 2 },
  { id: "wall", output: "wall", count: 1, cost: { wood: 8, thatch: 6, cordage: 1 }, category: "Building", time: 4, level: 2 },
  { id: "door", output: "door", count: 1, cost: { plank: 6, cordage: 2 }, category: "Building", time: 4, station: "workbench" },
  // Blocks
  { id: "plank", output: "plank", count: 2, cost: { wood: 1 }, category: "Blocks", time: 1 },
  { id: "log", output: "log", count: 1, cost: { wood: 3 }, category: "Blocks", time: 1 },
  { id: "cobblestone", output: "cobblestone", count: 1, cost: { stone: 2 }, category: "Blocks", time: 1 },
  { id: "thatch_block", output: "thatch_block", count: 1, cost: { thatch: 4 }, category: "Blocks", time: 1 },
  { id: "torch", output: "torch", count: 4, cost: { wood: 1, fiber: 2, flint: 1 }, category: "Blocks", time: 2 },
  { id: "stone_brick", output: "stone_brick", count: 2, cost: { stone: 3 }, category: "Blocks", time: 3, station: "workbench" },
  { id: "glass", output: "glass", count: 1, cost: { sand: 2, wood: 1 }, category: "Blocks", time: 4, station: "campfire" },
  { id: "metal_block", output: "metal_block", count: 1, cost: { metal_ingot: 2 }, category: "Blocks", time: 5, station: "workbench", level: 3 },
];

export const isEquippable = (id: ItemId) => ITEMS[id].kind !== "resource";

export const recipeFor = (output: ItemId) => RECIPES.find((r) => r.output === output);
