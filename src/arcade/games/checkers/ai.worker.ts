// Runs the checkers search off the main thread.
import { chooseMove } from "./ai";
import type { Move, State } from "./logic";

export interface AiRequest {
  id: number;
  state: State;
  level: number;
}

export interface AiReply {
  id: number;
  move: Move | null;
}

const scope = self as unknown as { onmessage: ((e: MessageEvent<AiRequest>) => void) | null; postMessage: (m: AiReply) => void };

scope.onmessage = (e) => {
  const { id, state, level } = e.data;
  try {
    const r = chooseMove(state, level);
    scope.postMessage({ id, move: r ? r.move : null });
  } catch {
    scope.postMessage({ id, move: null });
  }
};
