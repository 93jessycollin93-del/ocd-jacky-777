// Bot brains for Blob Arena: farm pellets, run from anything that could eat them, chase smaller prey (leading
// the target), hide behind thorns when too small to pop them, and sometimes split to finish a kill.
import type { BlobWorld } from "./logic";
import { biggestCell } from "./logic";
import { EAT_RATIO, HALF, SPLIT_MIN, THORN_POP_RATIO, clamp, radiusOf, speedOf, type Cell, type Pellet } from "./model";

let qx = 0;
let qy = 0;
let bestScore = 0;
let bestX = 0;
let bestY = 0;
const scorePellet = (p: Pellet) => {
  const d = Math.sqrt((p.x - qx) * (p.x - qx) + (p.y - qy) * (p.y - qy));
  const sc = p.m / (d + 70);
  if (sc > bestScore) {
    bestScore = sc;
    bestX = p.x;
    bestY = p.y;
  }
};

export function think(s: BlobWorld, pi: number) {
  const p = s.players[pi];
  const b = p.brain;
  const rng = s.rng;
  const main: Cell | null = biggestCell(p);
  if (!main) return;
  const mr = radiusOf(main.mass);
  const cx = main.x;
  const cy = main.y;
  const skill = b.skill;
  const vision = 520 + mr * 2.5 + 260 * skill;

  let fleeX = 0;
  let fleeY = 0;
  let fleeW = 0;
  let threat: Cell | null = null;
  let prey: Cell | null = null;
  let preyScore = 0;
  for (const o of s.players) {
    if (o === p || !o.alive) continue;
    for (const c of o.cells) {
      const dx = c.x - cx;
      const dy = c.y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
      if (d > vision) continue;
      const rc = radiusOf(c.mass);
      if (c.mass >= EAT_RATIO * main.mass * 0.92) {
        const range = rc + mr + 150 + 150 * skill + speedOf(c.mass) * 0.3;
        if (d < range) {
          const w = (range - d) / range;
          fleeX -= (dx / d) * w;
          fleeY -= (dy / d) * w;
          fleeW += w;
          if (!threat || c.mass > threat.mass) threat = c;
        }
      } else if (main.mass >= EAT_RATIO * c.mass * 1.04) {
        const sc = c.mass / (d + 120);
        if (sc > preyScore) {
          preyScore = sc;
          prey = c;
        }
      }
    }
  }

  // Thorns: pop-sized blobs steer round them; smaller ones can duck behind them.
  const canPop = main.mass >= 120 * THORN_POP_RATIO;
  let hideX = 0;
  let hideY = 0;
  let hide = false;
  for (const t of s.thorns) {
    const dx = t.x - cx;
    const dy = t.y - cy;
    const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
    const rt = radiusOf(t.mass);
    if (canPop) {
      const range = rt + mr + 110;
      if (d < range) {
        const w = ((range - d) / range) * 0.9;
        fleeX -= (dx / d) * w;
        fleeY -= (dy / d) * w;
        fleeW += w;
      }
    } else if (threat && d < 320 && !hide && skill > 0.5 && threat.mass >= t.mass * THORN_POP_RATIO) {
      hide = true;
      hideX = t.x;
      hideY = t.y;
    }
  }

  let tx = cx;
  let ty = cy;
  let mode = "farm";
  let have = false;
  if (fleeW > 0.2) {
    mode = "flee";
    if (hide) {
      tx = hideX;
      ty = hideY;
    } else {
      const m = Math.hypot(fleeX, fleeY) || 1;
      tx = cx + (fleeX / m) * 700;
      ty = cy + (fleeY / m) * 700;
    }
    have = true;
  } else if (prey && rng() < 0.55 + b.aggr * 0.45) {
    mode = "chase";
    const pc: Cell = prey;
    const d = Math.hypot(pc.x - cx, pc.y - cy);
    const lead = clamp(d / Math.max(60, speedOf(main.mass)), 0, 1.1) * (0.4 + 0.6 * skill);
    tx = pc.x + pc.mx * lead;
    ty = pc.y + pc.my * lead;
    have = true;
    // Split to finish it: the thrown half must still be able to eat it.
    const gap = d - mr - radiusOf(pc.mass);
    if (
      b.aggr > 0.35 && b.splitCd <= 0 && p.cells.length <= 3 && main.mass >= SPLIT_MIN * 2 &&
      main.mass / 2 >= EAT_RATIO * pc.mass * 1.05 && gap < 190 && gap > -mr
    ) {
      p.wantSplit = true;
      b.splitCd = 9 + rng() * 9;
    }
  }
  if (!have) {
    qx = cx;
    qy = cy;
    bestScore = 0;
    s.pellets.near(cx, cy, 380 + 220 * skill + mr, scorePellet);
    for (const e of s.ejected) {
      if (e.owner === pi && e.age < 1) continue;
      const d = Math.hypot(e.x - cx, e.y - cy);
      if (d < 500) {
        const sc = e.mass / (d + 70);
        if (sc > bestScore) {
          bestScore = sc;
          bestX = e.x;
          bestY = e.y;
        }
      }
    }
    if (bestScore > 0) {
      tx = bestX;
      ty = bestY;
      have = true;
    }
  }
  if (!have) {
    b.wanderT -= b.thinkEvery;
    if (b.wanderT <= 0 || Math.hypot(b.wanderX - cx, b.wanderY - cy) < 100) {
      b.wanderX = (rng() * 2 - 1) * (HALF - 300);
      b.wanderY = (rng() * 2 - 1) * (HALF - 300);
      b.wanderT = 5 + rng() * 6;
    }
    tx = b.wanderX;
    ty = b.wanderY;
  }
  const m = HALF - 60;
  p.aimX = clamp(tx, -m, m);
  p.aimY = clamp(ty, -m, m);
  p.aimMag = 1;
  b.mode = mode;
}
