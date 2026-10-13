import type { WeaponClass } from "../engine/weapons";

/** How far down -z the muzzle is on each kind of gun model (for the flash). */
export const MUZZLE: Record<WeaponClass, number> = {
  pistol: 0.18, rifle: 0.7, smg: 0.38, shotgun: 0.67, lmg: 0.7, sniper: 0.72, revolver: 0.26, wonder: 0.42,
};
