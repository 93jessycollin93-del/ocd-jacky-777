// The hint shown under the crosshair.
import { SPECIES } from "./creatures";
import { ITEMS, type ItemId } from "./items";
import { BLOCKS, cellKey, hitsToBreak, isBlockItem } from "./blocks";
import { blockTarget, canDrink, count, equipped, lookTarget, nearCampfire, toolStats, type GameState } from "./game";

/** The hint under the crosshair for whatever you're looking at. */
export function promptFor(state: GameState): string | null {
  const p = state.player;
  if (p.dead) return null;
  const id = equipped(state);
  if (id && ITEMS[id].kind === "structure") return `Click: place ${ITEMS[id].name} · switch slot to cancel`;
  if (isBlockItem(id)) {
    return blockTarget(state)
      ? `Click: place ${ITEMS[id].name} (${count(state, id)} left)`
      : `Aim at the ground or a block to place ${ITEMS[id].name}`;
  }
  const near = lookTarget(state, 3.5);
  const tool = toolStats(state);
  const hit = blockTarget(state, Math.max(tool.reach, 3.5) + 1);
  if (hit?.block && (!near || hit.dist <= near.dist + 0.5)) {
    const key = cellKey(hit.cell[0], hit.cell[1], hit.cell[2]);
    const needed = hitsToBreak(hit.block, tool.harvest[BLOCKS[hit.block].breakAs] ?? 0.5);
    const done = state.blockDamage?.key === key ? state.blockDamage.hits : 0;
    return `${ITEMS[hit.block].name} · Click: break${done ? ` (${done}/${needed})` : needed > 1 ? ` (${needed} hits)` : ""}`;
  }
  if (near?.kind === "creature") {
    const c = near.creature;
    const sp = SPECIES[c.species];
    if (c.state === "dead") return c.harvestLeft > 0 ? `Click: harvest ${sp.name}` : null;
    if (c.state === "unconscious") {
      const foods = Object.keys(sp.tameFoods).map((f) => ITEMS[f as ItemId].name).join(" / ");
      return `${sp.name} unconscious · Taming ${Math.round(c.tameProgress * 100)}% · E: feed (${foods}) · torpor ${Math.round(c.torpor)}`;
    }
    if (c.tamed) {
      return `${c.name} (${c.state}) · E: ${c.state === "follow" ? "stay" : "follow"}${sp.rideSpeed && !p.mountId ? " · R: ride" : ""}`;
    }
  }
  if (near?.kind === "structure" && near.structure.kind === "storage") {
    const stored = Object.values(near.structure.items ?? {}).reduce((a, n) => a + (n ?? 0), 0);
    return `E: open Storage Box (${stored} items) · Click: pick up`;
  }
  if (near?.kind === "structure" && near.structure.kind === "bed") return "Your respawn point · Click: pick up";
  const reachTarget = lookTarget(state, toolStats(state).reach);
  if (reachTarget?.kind === "creature" && !reachTarget.creature.tamed) {
    const c = reachTarget.creature;
    const sp = SPECIES[c.species];
    return `${sp.name} · HP ${Math.ceil(c.hp)}/${sp.hp} · KO ${Math.round((c.torpor / sp.maxTorpor) * 100)}%`;
  }
  if (reachTarget?.kind === "node") return `Click: harvest ${reachTarget.node.kind}`;
  if (reachTarget?.kind === "structure") return `Click: pick up ${ITEMS[reachTarget.structure.kind].name}`;
  if (nearCampfire(state, 3) && count(state, "raw_meat") > 0) return "E: cook meat";
  if (canDrink(state)) return "E: drink";
  if (p.mountId) return "R: dismount";
  return null;
}
