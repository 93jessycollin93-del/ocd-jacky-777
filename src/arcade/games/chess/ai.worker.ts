// Runs the chess search off the main thread so the board never freezes while the AI thinks.
import { chooseMove } from "./ai";
import { replay } from "./logic";

export interface AiRequest {
  id: number;
  startFen: string;
  moves: number[];
  level: number;
}

export interface AiReply {
  id: number;
  move: number | null;
  score: number;
  depth: number;
}

const scope = self as unknown as { onmessage: ((e: MessageEvent<AiRequest>) => void) | null; postMessage: (m: AiReply) => void };

scope.onmessage = (e) => {
  const { id, startFen, moves, level } = e.data;
  try {
    const pos = replay(startFen, moves);
    const r = chooseMove(pos, level, moves);
    scope.postMessage({ id, move: r ? r.move : null, score: r?.score ?? 0, depth: r?.depth ?? 0 });
  } catch {
    scope.postMessage({ id, move: null, score: 0, depth: 0 });
  }
};
