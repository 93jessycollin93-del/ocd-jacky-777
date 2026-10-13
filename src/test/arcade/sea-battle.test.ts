import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/arcade/kit/rng";
import {
  FLEET, HIT, MISS, N, SUNK, UNKNOWN, aiShot, allSunk, canPlace, fireAt, halo, heatmap, idx, newBoard, randomFleet, shipCells, shipsLeft, simulate,
  type Difficulty,
} from "@/arcade/games/sea-battle/logic";

describe("sea battle", () => {
  it("random fleets have every ship, inside the grid, never touching", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const ships = randomFleet(mulberry32(seed));
      expect(ships.map((s) => s.len).sort()).toEqual([...FLEET].sort());
      for (const s of ships) {
        expect(s.cells.every((c) => c >= 0 && c < N * N)).toBe(true);
        const others = ships.filter((o) => o !== s);
        expect(canPlace(others, s.cells)).toBe(true);
      }
    }
  });

  it("rejects ships off the grid, overlapping, or touching at a corner", () => {
    expect(shipCells(5, 0, 7, true)).toBeNull();
    expect(shipCells(3, 8, 0, false)).toBeNull();
    const ships = [{ len: 3, cells: shipCells(3, 2, 2, true)!, hits: 0 }];
    expect(canPlace(ships, shipCells(2, 2, 3, false))).toBe(false); // overlaps
    expect(canPlace(ships, shipCells(2, 3, 5, true))).toBe(false); // diagonal corner
    expect(canPlace(ships, shipCells(2, 4, 2, true))).toBe(true); // a row of water between
  });

  it("marks misses, hits, and a sunk ship with the water around it", () => {
    const b = newBoard([{ len: 2, cells: [idx(0, 0), idx(0, 1)], hits: 0 }]);
    expect(fireAt(b, idx(5, 5)).type).toBe("miss");
    expect(fireAt(b, idx(5, 5)).type).toBe("repeat");
    expect(fireAt(b, idx(0, 0)).type).toBe("hit");
    expect(b.shots[idx(0, 0)]).toBe(HIT);
    const r = fireAt(b, idx(0, 1));
    expect(r.type).toBe("sunk");
    expect(b.shots[idx(0, 0)]).toBe(SUNK);
    expect(b.shots[idx(1, 2)]).toBe(MISS);
    expect(allSunk(b)).toBe(true);
    expect(halo([idx(0, 0)]).size).toBe(4);
  });

  it("the computer never fires at the same square twice and always finishes", () => {
    for (const level of ["easy", "normal", "hard"] as Difficulty[]) {
      const rng = mulberry32(42);
      const b = newBoard(randomFleet(rng));
      const seen = new Set<number>();
      while (!allSunk(b)) {
        const i = aiShot(level, b.shots, shipsLeft(b), rng);
        expect(b.shots[i]).toBe(UNKNOWN);
        expect(seen.has(i)).toBe(false);
        seen.add(i);
        fireAt(b, i);
      }
      expect(seen.size).toBeLessThanOrEqual(100);
    }
  });

  it("harder admirals need fewer shots on average", () => {
    const avg = (level: Difficulty) => {
      let t = 0;
      for (let s = 1; s <= 30; s++) t += simulate(level, s);
      return t / 30;
    };
    const easy = avg("easy");
    const normal = avg("normal");
    const hard = avg("hard");
    expect(normal).toBeLessThan(easy);
    expect(hard).toBeLessThan(normal);
  });

  it("the heatmap focuses on squares next to an open hit", () => {
    const shots = new Uint8Array(N * N);
    shots[idx(5, 5)] = HIT;
    const heat = heatmap(shots, FLEET);
    const near = Math.max(heat[idx(4, 5)], heat[idx(6, 5)], heat[idx(5, 4)], heat[idx(5, 6)]);
    expect(near).toBeGreaterThan(heat[idx(0, 0)]);
    expect(heat[idx(5, 5)]).toBe(0);
  });
});
