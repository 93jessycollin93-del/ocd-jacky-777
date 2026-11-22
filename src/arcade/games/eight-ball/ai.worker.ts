// Runs the pool AI's shot search off the main thread so the table never stutters while the computer thinks.
import { mulberry32 } from "../../kit/rng";
import { aiShot, type Difficulty, type PoolState } from "./logic";

export interface AiRequest {
  id: number;
  state: Omit<PoolState, "rng">;
  level: Difficulty;
  seed: number;
}

const scope = self as unknown as { onmessage: ((e: MessageEvent<AiRequest>) => void) | null; postMessage: (m: unknown) => void };

scope.onmessage = (e) => {
  const { id, state, level, seed } = e.data;
  const move = aiShot({ ...state, rng: mulberry32(seed) } as PoolState, level);
  scope.postMessage({ id, move });
};
