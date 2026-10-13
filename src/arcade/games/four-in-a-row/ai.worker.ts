// Runs the connect-four search off the main thread.
import { chooseColumn } from "./ai";
import { fromMoves } from "./logic";

export interface AiRequest {
  id: number;
  moves: number[];
  level: number;
}

export interface AiReply {
  id: number;
  col: number | null;
}

const scope = self as unknown as { onmessage: ((e: MessageEvent<AiRequest>) => void) | null; postMessage: (m: AiReply) => void };

scope.onmessage = (e) => {
  const { id, moves, level } = e.data;
  try {
    const r = chooseColumn(fromMoves(moves), level);
    scope.postMessage({ id, col: r ? r.col : null });
  } catch {
    scope.postMessage({ id, col: null });
  }
};
