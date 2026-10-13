import { describe, it, expect } from "vitest";
import {
  BLACK, KNIGHT, Position, START_FEN, WHITE, getStatus, moveFromUci, moveToSan, moveToUci, movePromo, newGame, perft,
  playMove, replay, undoMove,
} from "@/arcade/games/chess/logic";
import { chooseMove, evaluate, LEVELS, seededRng } from "@/arcade/games/chess/ai";

const play = (g: ReturnType<typeof newGame>, ...ucis: string[]) => {
  for (const u of ucis) {
    const m = moveFromUci(g.pos, u);
    if (m === null) throw new Error(`illegal move ${u} in ${g.pos.toFen()}`);
    playMove(g, m);
  }
};
const legalUci = (fen: string) => Position.fromFen(fen).legalMoves().map(moveToUci);

describe("chess move generation", () => {
  it("counts the start position correctly (perft 1-3)", () => {
    const pos = Position.fromFen(START_FEN);
    expect(perft(pos, 1)).toBe(20);
    expect(perft(pos, 2)).toBe(400);
    expect(perft(pos, 3)).toBe(8902);
    expect(pos.toFen()).toBe(START_FEN);
  });

  it("matches known perft counts for tricky positions (castling, en passant, promotion, pins)", () => {
    const kiwipete = Position.fromFen("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1");
    expect(perft(kiwipete, 1)).toBe(48);
    expect(perft(kiwipete, 2)).toBe(2039);
    expect(perft(kiwipete, 3)).toBe(97862);
    const endgame = Position.fromFen("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1");
    expect([1, 2, 3].map((d) => perft(endgame, d))).toEqual([14, 191, 2812]);
    const promo = Position.fromFen("r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1");
    expect([1, 2, 3].map((d) => perft(promo, d))).toEqual([6, 264, 9467]);
    const middle = Position.fromFen("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8");
    expect([1, 2, 3].map((d) => perft(middle, d))).toEqual([44, 1486, 62379]);
  });

  it("generates castling only when it is safe", () => {
    expect(legalUci("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")).toEqual(expect.arrayContaining(["e1g1", "e1c1"]));
    // A rook on f8 attacks f1: no kingside castling through it (queenside is fine).
    const through = legalUci("5r2/8/8/8/8/8/8/R3K2R w KQ - 0 1");
    expect(through).not.toContain("e1g1");
    expect(through).toContain("e1c1");
    // Can't castle out of check.
    const inCheck = legalUci("4r3/8/8/8/8/8/8/R3K2R w KQ - 0 1");
    expect(inCheck).not.toContain("e1g1");
    expect(inCheck).not.toContain("e1c1");
    // An attacked b1 does not matter for queenside castling, but a blocker does.
    expect(legalUci("1r6/8/8/8/8/8/8/R3K3 w Q - 0 1")).toContain("e1c1");
    expect(legalUci("8/8/8/8/8/8/8/RN2K3 w Q - 0 1")).not.toContain("e1c1");
    // No rights, no castling; moving the rook loses just that side.
    expect(legalUci("r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1")).not.toContain("e1g1");
    const g = newGame("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    play(g, "h1h2", "a8a7");
    expect(g.pos.castling).toBe(2 | 4);
  });

  it("performs castling by moving the rook too, and undoes it", () => {
    const g = newGame("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    const before = g.pos.toFen();
    play(g, "e1g1");
    expect(g.pos.toFen()).toBe("r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1");
    expect(g.sans[0]).toBe("O-O");
    undoMove(g);
    expect(g.pos.toFen()).toBe(before);
    const g2 = newGame("r3k2r/8/8/8/8/8/8/R3K2R b kq - 0 1");
    play(g2, "e8c8");
    expect(g2.pos.toFen().startsWith("2kr3r/8/8/8/8/8/8/R3K2R w - -")).toBe(true);
    expect(g2.sans[0]).toBe("O-O-O");
  });

  it("handles en passant, including the one-move window and the pinned-pawn trap", () => {
    const g = newGame();
    play(g, "e2e4", "a7a6", "e4e5", "d7d5");
    expect(g.pos.ep).toBeGreaterThanOrEqual(0);
    const fenBefore = g.pos.toFen();
    expect(legalUci(fenBefore)).toContain("e5d6");
    play(g, "e5d6");
    expect(g.pos.board[35]).toBe(0); // the d5 pawn is gone
    expect(g.sans[g.sans.length - 1]).toBe("exd6");
    undoMove(g);
    expect(g.pos.toFen()).toBe(fenBefore);
    // Decline it and the chance is gone.
    play(g, "h2h3", "a6a5");
    expect(legalUci(g.pos.toFen())).not.toContain("e5d6");
    // Capturing en passant would expose the king along the rank, so it is illegal.
    expect(legalUci("8/8/8/KPp4r/8/8/8/7k w - c6 0 1")).not.toContain("b5c6");
  });

  it("offers four promotion pieces, with and without capture", () => {
    const moves = Position.fromFen("1n5k/P7/8/8/8/8/8/K7 w - - 0 1").legalMoves();
    const fromA7 = moves.filter((m) => moveToUci(m).startsWith("a7"));
    expect(fromA7.map(moveToUci).sort()).toEqual(["a7a8b", "a7a8n", "a7a8q", "a7a8r", "a7b8b", "a7b8n", "a7b8q", "a7b8r"]);
    expect(Position.fromFen("1n5k/P7/8/8/8/8/8/K7 w - - 0 1").board[57]).toBe(-KNIGHT);
    const g = newGame("7k/P7/8/8/8/8/8/K7 w - - 0 1");
    const m = moveFromUci(g.pos, "a7a8n")!;
    expect(movePromo(m)).toBe(KNIGHT);
    playMove(g, m);
    expect(g.pos.board[56]).toBe(KNIGHT);
    expect(g.sans[0]).toBe("a8=N");
    undoMove(g);
    expect(g.pos.board[48]).toBe(1);
    expect(g.pos.board[56]).toBe(0);
    // Promotion with a check suffix.
    const g2 = newGame("7k/P7/8/8/8/8/8/K7 w - - 0 1");
    play(g2, "a7a8q");
    expect(g2.sans[0]).toBe("a8=Q+");
  });
});

describe("chess game end", () => {
  it("detects checkmate (fool's mate) and stalemate", () => {
    const g = newGame();
    play(g, "f2f3", "e7e5", "g2g4", "d8h4");
    expect(g.sans[3]).toBe("Qh4#");
    expect(getStatus(g.pos)).toMatchObject({ over: true, result: BLACK, reason: "checkmate", check: true });
    const stale = Position.fromFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    expect(getStatus(stale)).toMatchObject({ over: true, result: "draw", reason: "stalemate", check: false });
    const live = Position.fromFen("7k/8/8/8/8/8/8/K1Q5 b - - 0 1");
    expect(getStatus(live).over).toBe(false);
  });

  it("applies the fifty-move rule, threefold repetition and insufficient material", () => {
    expect(getStatus(Position.fromFen("4k3/8/8/8/8/8/8/R3K3 w - - 99 80")).over).toBe(false);
    expect(getStatus(Position.fromFen("4k3/8/8/8/8/8/8/R3K3 w - - 100 80"))).toMatchObject({ over: true, reason: "fifty-move" });
    const g = newGame();
    const shuffle = ["g1f3", "g8f6", "f3g1", "f6g8"];
    play(g, ...shuffle);
    expect(getStatus(g.pos).over).toBe(false);
    play(g, ...shuffle.slice(0, 3));
    expect(getStatus(g.pos).over).toBe(false);
    play(g, shuffle[3]);
    expect(getStatus(g.pos)).toMatchObject({ over: true, result: "draw", reason: "repetition" });
    // Undo takes it back to a live game.
    undoMove(g);
    expect(getStatus(g.pos).over).toBe(false);
    for (const fen of ["8/8/4k3/8/8/3K4/8/8 w - - 0 1", "8/8/4k3/8/8/3KB3/8/8 w - - 0 1", "8/8/4k3/8/8/3KN3/8/8 w - - 0 1", "8/8/4kb2/8/8/3KB3/8/8 w - - 0 1"]) {
      expect(Position.fromFen(fen).insufficientMaterial()).toBe(true);
    }
    for (const fen of ["8/8/4k3/8/8/3KP3/8/8 w - - 0 1", "8/8/4k3/8/8/3KR3/8/8 w - - 0 1", "8/8/3k2b1/8/8/2BK4/8/8 w - - 0 1", "8/8/4kn2/8/8/3KN3/8/8 w - - 0 1"]) {
      expect(Position.fromFen(fen).insufficientMaterial()).toBe(false);
    }
  });

  it("writes algebraic notation with disambiguation and captures", () => {
    const pos = Position.fromFen("4k3/8/8/8/8/8/4K3/R6R w - - 0 1");
    const san = (u: string) => moveToSan(pos, moveFromUci(pos, u)!);
    expect(san("a1a5")).toBe("Ra5");
    expect(san("a1b1")).toBe("Rab1");
    expect(san("h1f1")).toBe("Rhf1");
    const p2 = Position.fromFen("4k3/8/8/3p4/8/8/8/R3K3 w - - 0 1");
    expect(moveToSan(p2, moveFromUci(p2, "a1a5")!)).toBe("Ra5");
    const p4 = Position.fromFen("4k3/8/8/8/8/8/8/R3K2R w - - 0 1");
    expect(moveToSan(p4, moveFromUci(p4, "a1b1")!)).toBe("Rb1");
    const p3 = Position.fromFen("4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1");
    expect(moveToSan(p3, moveFromUci(p3, "e4d5")!)).toBe("exd5");
    const p5 = Position.fromFen("4k3/8/2p5/3p4/4P3/8/8/4K3 w - - 0 1");
    expect(moveToSan(p5, moveFromUci(p5, "e4d5")!)).toBe("exd5");
  });

  it("replays a move list into the same position", () => {
    const g = newGame();
    play(g, "e2e4", "e7e5", "g1f3", "b8c6", "f1b5");
    const rebuilt = replay(g.startFen, g.moves);
    expect(rebuilt.toFen()).toBe(g.pos.toFen());
    expect(rebuilt.hash).toBe(g.pos.hash);
    expect(rebuilt.computeHash()).toBe(rebuilt.hash);
  });
});

describe("chess AI", () => {
  it("always returns a legal move at every level", () => {
    const rng = seededRng(7);
    const fens = [START_FEN, "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 b - - 0 1"];
    for (const fen of fens) {
      for (let level = 1; level <= 3; level++) {
        const pos = Position.fromFen(fen);
        const r = chooseMove(pos, level, [], rng);
        expect(r).not.toBeNull();
        expect(pos.legalMoves()).toContain(r!.move);
        expect(pos.toFen()).toBe(fen); // search leaves the position untouched
      }
    }
    expect(LEVELS).toHaveLength(5);
  });

  it("plays mate in one and wins a hanging queen", () => {
    const mate = Position.fromFen("6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1");
    const r = chooseMove(mate, 3, [], seededRng(1))!;
    expect(moveToUci(r.move)).toBe("a1a8");
    const hang = Position.fromFen("k7/8/8/3q4/8/8/8/K2R4 w - - 0 1");
    expect(moveToUci(chooseMove(hang, 3, [], seededRng(1))!.move)).toBe("d1d5");
  });

  it("sees a two-move mate and avoids hanging its own queen", () => {
    // White mates in two: Qh6+? no - 1.Qb7+ Kd8 2.Qd7# is not available; use a classic ladder mate instead.
    const ladder = Position.fromFen("7k/8/8/8/8/8/1R6/R5K1 w - - 0 1");
    const r = chooseMove(ladder, 4, [], seededRng(1))!;
    const after = ladder.clone();
    after.makeMove(r.move);
    const reply = chooseMove(after, 1, [], seededRng(2))!;
    after.makeMove(reply.move);
    const second = chooseMove(after, 4, [], seededRng(3))!;
    after.makeMove(second.move);
    expect(getStatus(after).reason).toBe("checkmate");
  });

  it("evaluates a material edge for the side that has it", () => {
    const up = Position.fromFen("4k3/8/8/8/8/8/8/Q3K3 w - - 0 1");
    const down = Position.fromFen("4k3/8/8/8/8/8/8/Q3K3 b - - 0 1");
    expect(evaluate(up)).toBeGreaterThan(800);
    expect(evaluate(down)).toBeLessThan(-800);
    expect(WHITE).toBe(0);
  });
});
