// A bot that searches for a way through a level using only presses on a coarse time grid. It is how levels are
// checked: if the bot can finish with inputs only every `quantum` steps, the obstacles leave real timing slack.
import { STEP, cloneRun, newRun, press, release, tick, type Level, type PulseState } from "./logic";

export interface SolveResult {
  ok: boolean;
  /** The furthest the cube got in any branch (blocks), useful to see where a level is too hard. */
  maxX: number;
  /** The inputs of a winning line: one entry per decision (1 = holding the button). */
  line: number[];
}

const key = (s: PulseState) => {
  let used = 0;
  for (const i of s.used) used = (used * 31 + i + 7) | 0;
  return `${Math.round(s.y * 30)}|${Math.round(s.vy * 6)}|${s.grav}|${s.onGround ? 1 : 0}|${s.held ? 1 : 0}|${used}|${s.speedM}|${s.pressBuf > 0 ? 1 : 0}`;
};

/**
 * Breadth-first search over "hold or release" decisions made every `quantum` steps. States that look the same are
 * merged, and the frontier is thinned if it ever grows past `maxStates`.
 */
export function solve(level: Level, quantum = 6, maxStates = 1500): SolveResult {
  // Only the current layer keeps full states; every node remembers just its parent and the action taken.
  const parent: number[] = [-1];
  const action: number[] = [0];
  let layer: { s: PulseState; id: number }[] = [{ s: newRun(level), id: 0 }];
  let maxX = 0;
  let guard = 0;
  while (layer.length && guard++ < 100000) {
    const seen = new Set<string>();
    let next: { s: PulseState; id: number }[] = [];
    for (const node of layer) {
      for (const a of [0, 1]) {
        const s = cloneRun(node.s);
        if (a === 1) {
          if (!s.held) press(s);
        } else release(s);
        for (let k = 0; k < quantum && s.alive && !s.won; k++) tick(s);
        if (s.x > maxX) maxX = s.x;
        if (s.won) {
          const line: number[] = [a];
          for (let n = node.id; parent[n] >= 0; n = parent[n]) line.push(action[n]);
          return { ok: true, maxX: s.x, line: line.reverse() };
        }
        if (!s.alive) continue;
        const k = key(s);
        if (seen.has(k)) continue;
        seen.add(k);
        parent.push(node.id);
        action.push(a);
        next.push({ s, id: parent.length - 1 });
      }
    }
    if (next.length > maxStates) {
      const stride = next.length / maxStates;
      const thin: typeof next = [];
      for (let i = 0; i < maxStates; i++) thin.push(next[Math.floor(i * stride)]);
      next = thin;
    }
    layer = next;
  }
  return { ok: false, maxX, line: [] };
}

export const seconds = (steps: number) => steps * STEP;
