// Dead Hours weapons: one data table. Damage is per bullet (per pellet for shotguns).

export type WeaponId =
  | "sidearm" | "carbine" | "coach" | "vandal" | "trench" | "storm" | "marksman" | "lmg" | "cannon" | "arc";

/** Shapes the first-person model and the gunshot sound. */
export type WeaponClass = "pistol" | "rifle" | "shotgun" | "smg" | "lmg" | "sniper" | "revolver" | "wonder";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  /** Name after the Upgrade Station. */
  upgradedName: string;
  cls: WeaponClass;
  damage: number;
  /** Multiplier for a headshot. */
  head: number;
  /** Shots per second. */
  rate: number;
  auto: boolean;
  mag: number;
  reserve: number;
  /** Seconds to reload. */
  reload: number;
  /** Hip-fire cone half-angle in radians; aiming cuts it to a fraction. */
  spread: number;
  pellets: number;
  /** How many zombies one bullet can pass through. */
  penetration: number;
  range: number;
  /** Movement speed multiplier while holding it. */
  move: number;
  /** Camera kick per shot (radians). */
  kick: number;
  /** Wall-buy price; absent means box only. */
  cost?: number;
  /** Mystery box weight (0 = never in the box). */
  boxWeight: number;
  /** Arcs to nearby zombies on a kill. */
  chain?: number;
  color: string;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  sidearm: {
    id: "sidearm", name: "P-9 Sidearm", upgradedName: "Viper Fang", cls: "pistol",
    damage: 40, head: 2.5, rate: 5, auto: false, mag: 8, reserve: 80, reload: 1.5, spread: 0.022, pellets: 1,
    penetration: 1, range: 60, move: 1, kick: 0.018, boxWeight: 0, color: "#3b3b3f",
  },
  carbine: {
    id: "carbine", name: "Ranger Carbine", upgradedName: "Long Shadow", cls: "rifle",
    damage: 100, head: 2.2, rate: 4.5, auto: false, mag: 8, reserve: 120, reload: 2.0, spread: 0.016, pellets: 1,
    penetration: 2, range: 90, move: 0.95, kick: 0.03, cost: 500, boxWeight: 0, color: "#6b4a2b",
  },
  coach: {
    id: "coach", name: "Coach Gun", upgradedName: "Widow's Kiss", cls: "shotgun",
    damage: 32, head: 1.5, rate: 3.5, auto: false, mag: 2, reserve: 60, reload: 2.2, spread: 0.1, pellets: 8,
    penetration: 1, range: 20, move: 0.97, kick: 0.07, cost: 500, boxWeight: 0, color: "#5a3a22",
  },
  vandal: {
    id: "vandal", name: "Vandal SMG", upgradedName: "Ripper", cls: "smg",
    damage: 45, head: 2, rate: 11, auto: true, mag: 30, reserve: 180, reload: 2.3, spread: 0.035, pellets: 1,
    penetration: 1, range: 45, move: 1, kick: 0.012, cost: 1000, boxWeight: 6, color: "#2f3338",
  },
  trench: {
    id: "trench", name: "Trench Gun", upgradedName: "Gravedigger", cls: "shotgun",
    damage: 48, head: 1.5, rate: 1.4, auto: false, mag: 6, reserve: 54, reload: 3.0, spread: 0.075, pellets: 8,
    penetration: 1, range: 22, move: 0.95, kick: 0.08, cost: 1500, boxWeight: 6, color: "#4a4038",
  },
  storm: {
    id: "storm", name: "Storm Rifle", upgradedName: "Thunderhead", cls: "rifle",
    damage: 70, head: 2.5, rate: 10, auto: true, mag: 30, reserve: 240, reload: 2.4, spread: 0.028, pellets: 1,
    penetration: 2, range: 80, move: 0.93, kick: 0.016, cost: 1200, boxWeight: 6, color: "#3d4436",
  },
  marksman: {
    id: "marksman", name: "Marksman Rifle", upgradedName: "Night Owl", cls: "sniper",
    damage: 280, head: 3, rate: 2.2, auto: false, mag: 10, reserve: 60, reload: 2.6, spread: 0.06, pellets: 1,
    penetration: 4, range: 150, move: 0.9, kick: 0.05, cost: 1750, boxWeight: 5, color: "#2b2f26",
  },
  lmg: {
    id: "lmg", name: "Drum LMG", upgradedName: "Hellstorm", cls: "lmg",
    damage: 90, head: 2, rate: 9, auto: true, mag: 100, reserve: 400, reload: 5.0, spread: 0.04, pellets: 1,
    penetration: 3, range: 80, move: 0.85, kick: 0.014, boxWeight: 5, color: "#33302b",
  },
  cannon: {
    id: "cannon", name: "Hand Cannon", upgradedName: "The Judge", cls: "revolver",
    damage: 320, head: 2, rate: 2.5, auto: false, mag: 6, reserve: 48, reload: 2.8, spread: 0.02, pellets: 1,
    penetration: 2, range: 60, move: 1, kick: 0.07, boxWeight: 5, color: "#8a8f96",
  },
  arc: {
    id: "arc", name: "Arc Caster", upgradedName: "Tempest", cls: "wonder",
    damage: 1100, head: 1, rate: 3, auto: false, mag: 20, reserve: 160, reload: 3.0, spread: 0.01, pellets: 1,
    penetration: 1, range: 70, move: 1, kick: 0.04, boxWeight: 1.5, chain: 5, color: "#58e1ff",
  },
};

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];

export interface OwnedWeapon {
  id: WeaponId;
  upgraded: boolean;
  mag: number;
  reserve: number;
}

export const weaponName = (w: OwnedWeapon) => (w.upgraded ? WEAPONS[w.id].upgradedName : WEAPONS[w.id].name);
export const magSize = (w: OwnedWeapon) => Math.round(WEAPONS[w.id].mag * (w.upgraded ? 1.5 : 1));
export const reserveSize = (w: OwnedWeapon) => Math.round(WEAPONS[w.id].reserve * (w.upgraded ? 1.5 : 1));
/** Upgraded guns hit twice as hard. */
export const weaponDamage = (w: OwnedWeapon) => WEAPONS[w.id].damage * (w.upgraded ? 2 : 1);
/** Buying ammo off the wall costs half the gun's price; upgraded ammo costs more. */
export const ammoCost = (w: OwnedWeapon) => (w.upgraded ? 2500 : Math.round((WEAPONS[w.id].cost ?? 0) / 2));

export function newWeapon(id: WeaponId, upgraded = false): OwnedWeapon {
  const w: OwnedWeapon = { id, upgraded, mag: 0, reserve: 0 };
  w.mag = magSize(w);
  w.reserve = reserveSize(w);
  return w;
}

// ---------------------------------------------------------------- perks

export type PerkId = "iron" | "hands" | "wind" | "tap" | "step";

export interface PerkDef {
  id: PerkId;
  name: string;
  cost: number;
  desc: string;
  /** Short label on the HUD badge. */
  badge: string;
  color: string;
  /** Works without the power on. */
  noPower?: boolean;
}

export const PERKS: Record<PerkId, PerkDef> = {
  iron: { id: "iron", name: "Iron Hide", cost: 2500, desc: "Take five hits instead of two", badge: "IH", color: "#d1352b" },
  hands: { id: "hands", name: "Fast Hands", cost: 3000, desc: "Reload twice as fast", badge: "FH", color: "#3fbf4f" },
  wind: { id: "wind", name: "Second Wind", cost: 500, desc: "Get back up once when you go down", badge: "SW", color: "#3a8ee6", noPower: true },
  tap: { id: "tap", name: "Double Tap", cost: 2000, desc: "Fire faster and hit harder", badge: "DT", color: "#e0a526" },
  step: { id: "step", name: "Swift Step", cost: 2000, desc: "Sprint twice as long and move faster", badge: "SS", color: "#e8762b" },
};

export const MAX_PERKS = 4;

// ---------------------------------------------------------------- power-ups

export type PowerUpId = "max_ammo" | "insta_kill" | "double_points" | "nuke" | "carpenter";

export const POWER_UPS: Record<PowerUpId, { name: string; icon: string; color: string }> = {
  max_ammo: { name: "Max Ammo", icon: "🧰", color: "#7dd3fc" },
  insta_kill: { name: "Insta-Kill", icon: "💀", color: "#f87171" },
  double_points: { name: "Double Points", icon: "✖️2", color: "#fde047" },
  nuke: { name: "Nuke", icon: "☢️", color: "#a3e635" },
  carpenter: { name: "Carpenter", icon: "🔨", color: "#fb923c" },
};
