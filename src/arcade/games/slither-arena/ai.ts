// Bot brains for Slither Arena. Each bot "thinks" a few times a second: pick a goal (eat, flee from big
// heads, cut off or circle smaller worms), then probe a fan of directions for bodies and the world edge
// and steer along the safest one that still heads toward the goal.
import type { World } from "./logic";
import { BASE_SPEED, BODY_HIT, BOOST_MULT, HEAD_HIT, MIN_BOOST_MASS, WORLD_R, angDiff, clamp, turnRate, type Orb } from "./model";

const MARGIN = 34;
/** Fractions of the maximum turn rate to try. */
const TURNS = [0, 0.25, -0.25, 0.55, -0.55, 1, -1];
const SAMPLES = 7;
const whiskX = new Float64Array(12);
const whiskY = new Float64Array(12);
const whiskG = new Float64Array(12);
let nWhisk = 0;

/** How dangerous it is for a head of radius myG to be at (px, py): 0 safe .. 1 certain death. */
export function dangerAt(s: World, self: number, px: number, py: number, myG: number): number {
  let danger = 0;
  const rr = Math.sqrt(px * px + py * py);
  const edgeStart = WORLD_R - 150;
  if (rr > edgeStart) danger = clamp((rr - edgeStart) / 110, 0, 1);
  const grid = s.grid;
  grid.range(px, py, HEAD_HIT * myG + BODY_HIT * s.maxG + MARGIN);
  const worms = s.worms;
  for (let gy = grid.gy0; gy <= grid.gy1; gy++) {
    for (let gx = grid.gx0; gx <= grid.gx1; gx++) {
      for (let e = grid.head[gy * grid.size + gx]; e !== -1; e = grid.next[e]) {
        const wi = grid.wormOf[e];
        if (wi === self) continue;
        const si = grid.segOf[e];
        const o = worms[wi];
        const dx = o.sx[si] - px;
        const dy = o.sy[si] - py;
        const hit = HEAD_HIT * myG + BODY_HIT * o.g;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < hit + MARGIN) {
          const k = 1 - (d - hit) / MARGIN;
          if (k > danger) danger = k > 1 ? 1 : k;
        }
      }
    }
  }
  return danger;
}

// Scratch state for the orb scan (avoids a closure per think).
let qx = 0;
let qy = 0;
let qa = 0;
let bestScore = 0;
let bestX = 0;
let bestY = 0;
let bestV = 0;
const scoreOrb = (o: Orb) => {
  const dx = o.x - qx;
  const dy = o.y - qy;
  const d = Math.sqrt(dx * dx + dy * dy);
  const ahead = 0.55 + 0.45 * Math.max(0, Math.cos(angDiff(qa, Math.atan2(dy, dx))));
  const sc = ((o.v * (o.amb ? 1 : 1.7) + 0.3) / (d + 45)) * ahead;
  if (sc > bestScore) {
    bestScore = sc;
    bestX = o.x;
    bestY = o.y;
    bestV = o.v;
  }
};

export function think(s: World, wi: number) {
  const w = s.worms[wi];
  const b = w.brain;
  const rng = s.rng;
  const skill = b.skill;
  const rr = Math.sqrt(w.x * w.x + w.y * w.y);

  // ---- who is around?
  let fleeX = 0;
  let fleeY = 0;
  let fleeW = 0;
  let nearestPrey = -1;
  let preyScore = 0;
  for (let j = 0; j < s.worms.length; j++) {
    if (j === wi) continue;
    const o = s.worms[j];
    if (!o.alive) continue;
    const dx = o.x - w.x;
    const dy = o.y - w.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > 640 * 640) continue;
    const d = Math.sqrt(d2) + 0.001;
    if (o.mass > w.mass * 1.1 && d < 230) {
      // Only a head that is coming our way is a threat worth running from.
      const toward = (-dx * Math.cos(o.ang) - dy * Math.sin(o.ang)) / d;
      const wgt = ((230 - d) / 230) * (toward > 0.25 ? 1 : 0);
      if (wgt > 0) {
        fleeX -= (dx / d) * wgt * 0.5 + Math.cos(o.ang + 1.57 * (dx * Math.sin(o.ang) - dy * Math.cos(o.ang) > 0 ? -1 : 1)) * wgt * 0.5;
        fleeY -= (dy / d) * wgt * 0.5 + Math.sin(o.ang + 1.57 * (dx * Math.sin(o.ang) - dy * Math.cos(o.ang) > 0 ? -1 : 1)) * wgt * 0.5;
        fleeW += wgt;
      }
    } else if (o.mass < w.mass * 0.95 && o.shield <= 0) {
      const sc = (o.isPlayer ? 1.5 : 1) / (d + 120);
      if (sc > preyScore) {
        preyScore = sc;
        nearestPrey = j;
      }
    }
  }

  // ---- keep or choose a prey
  b.preyT -= b.thinkEvery;
  if (b.prey >= 0) {
    const o = s.worms[b.prey];
    if (!o.alive || b.preyT <= 0 || o.mass > w.mass * 1.05) b.prey = -1;
  }
  if (b.prey < 0 && nearestPrey >= 0 && rng() < b.aggr * 0.5) {
    b.prey = nearestPrey;
    b.preyT = 3 + rng() * 5;
    b.circleDir = rng() < 0.5 ? 1 : -1;
  }

  // ---- goal
  let gx = 0;
  let gy = 0;
  let haveGoal = false;
  let wantBoost = false;
  let mode = "forage";

  if (fleeW > 0.25) {
    mode = "flee";
    gx = w.x + fleeX * 300;
    gy = w.y + fleeY * 300;
    haveGoal = true;
    wantBoost = fleeW > 0.7;
  } else if (b.prey >= 0) {
    const o = s.worms[b.prey];
    const dx = o.x - w.x;
    const dy = o.y - w.y;
    const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
    if (o.mass < w.mass * 0.65 && d < 260 && b.aggr > 0.35) {
      // Circle: orbit the prey so our body walls it in.
      mode = "circle";
      const th = Math.atan2(w.y - o.y, w.x - o.x) + b.circleDir * 0.75;
      const rad = clamp(95 + o.n * 0.35, 100, 170);
      gx = o.x + Math.cos(th) * rad;
      gy = o.y + Math.sin(th) * rad;
      wantBoost = d > 120 && w.mass > 40;
    } else {
      // Cut off: aim at a point ahead of its head.
      mode = "hunt";
      const lead = clamp(d * 0.9, 90, 300);
      gx = o.x + Math.cos(o.ang) * lead;
      gy = o.y + Math.sin(o.ang) * lead;
      wantBoost = d < 330 && w.mass > 28;
    }
    haveGoal = true;
  }

  if (!haveGoal) {
    qx = w.x;
    qy = w.y;
    qa = w.ang;
    bestScore = 0;
    bestV = 0;
    s.orbs.near(w.x, w.y, 230 + 190 * skill, scoreOrb);
    if (bestScore > 0) {
      gx = bestX;
      gy = bestY;
      haveGoal = true;
      wantBoost = bestV >= 4 && w.mass > 40 && Math.hypot(bestX - w.x, bestY - w.y) > 140;
    }
  }

  if (!haveGoal) {
    // Wander to a random waypoint, biased inward.
    b.wanderT -= b.thinkEvery;
    if (b.wanderT <= 0 || Math.hypot(b.wanderX - w.x, b.wanderY - w.y) < 120) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * (WORLD_R - 500);
      b.wanderX = Math.cos(a) * r;
      b.wanderY = Math.sin(a) * r;
      b.wanderT = 4 + rng() * 5;
    }
    gx = b.wanderX;
    gy = b.wanderY;
  }

  // Too close to the edge: head for the middle whatever else is going on.
  if (rr > WORLD_R - 340) {
    gx = -w.x * 0.6;
    gy = -w.y * 0.6;
    wantBoost = false;
  }

  let ta = Math.atan2(gy - w.y, gx - w.x);
  ta += (rng() - 0.5) * (1 - skill) * 0.7;

  // ---- probe a fan of turning arcs (so the turning circle is respected) and keep the safest that heads for the goal
  const v = BASE_SPEED * (wantBoost && w.mass > MIN_BOOST_MASS ? BOOST_MULT : 1);
  const horizon = 0.55 + 0.75 * skill;
  const dtp = horizon / SAMPLES;
  const omega = turnRate(w.mass);
  // Where the nearby heads will be soon: they are dangerous even before their bodies get there.
  nWhisk = 0;
  for (let j = 0; j < s.worms.length && nWhisk < 10; j++) {
    if (j === wi) continue;
    const o = s.worms[j];
    if (!o.alive) continue;
    if (Math.abs(o.x - w.x) > 420 || Math.abs(o.y - w.y) > 420) continue;
    const ov = BASE_SPEED * (o.boosting ? BOOST_MULT : 1);
    for (let k = 1; k <= 2; k++) {
      whiskX[nWhisk] = o.x + Math.cos(o.ang) * ov * 0.3 * k;
      whiskY[nWhisk] = o.y + Math.sin(o.ang) * ov * 0.3 * k;
      whiskG[nWhisk] = o.g;
      nWhisk++;
    }
  }
  const careless = rng() < (1 - skill) * 0.09;
  let bestSc = -1e9;
  let bestDanger = 0;
  let bestC = 0;
  for (let k = 0; k < TURNS.length; k++) {
    const c = TURNS[k];
    let a = w.ang;
    let px = w.x;
    let py = w.y;
    let dg = 0;
    for (let i = 0; i < SAMPLES; i++) {
      a += c * omega * dtp * 0.5;
      px += Math.cos(a) * v * dtp;
      py += Math.sin(a) * v * dtp;
      a += c * omega * dtp * 0.5;
      const d = dangerAt(s, wi, px, py, w.g);
      if (d > dg) dg = d;
      for (let q = 0; q < nWhisk; q++) {
        const dx = whiskX[q] - px;
        const dy = whiskY[q] - py;
        const hit = HEAD_HIT * w.g + BODY_HIT * whiskG[q];
        const dd = Math.sqrt(dx * dx + dy * dy);
        if (dd < hit + MARGIN) {
          const kk = 1 - (dd - hit) / MARGIN;
          if (kk > dg) dg = kk > 1 ? 1 : kk;
        }
      }
    }
    const sc = Math.cos(angDiff(a, ta)) - (careless ? 0 : 6 * dg) - 0.12 * Math.abs(c) + (c === b.lastTurn ? 0.12 : 0);
    if (sc > bestSc) {
      bestSc = sc;
      bestDanger = dg;
      bestC = c;
    }
  }
  b.lastTurn = bestC;
  w.turnCmd = bestC;
  if (bestDanger > 0.25) wantBoost = false;
  if (w.mass < MIN_BOOST_MASS + 10) wantBoost = false;
  w.wantBoost = wantBoost;
  b.mode = mode;
  b.danger = bestDanger;
}
