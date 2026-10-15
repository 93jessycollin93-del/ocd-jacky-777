import { describe, it, expect } from "vitest";
import { Klondike, idOf, isUp, rankOf, suitOf, timeBonus, up, down, type Card } from "@/arcade/games/klondike/logic";

const card = (suit: number, rank: number, faceUp = true): Card => (faceUp ? up(suit * 13 + rank) : down(suit * 13 + rank));
const empty = (draw: 1 | 3 = 1) => new Klondike(draw);

describe("klondike deal", () => {
  it("deals 28 cards to the tableau (1..7, only the last face up) and 24 to the stock", () => {
    const g = Klondike.deal(42, 1);
    expect(g.tableau.map((c) => c.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(g.tableau.flat()).toHaveLength(28);
    expect(g.stock).toHaveLength(24);
    expect(g.stock.every((c) => !isUp(c))).toBe(true);
    for (const col of g.tableau) {
      col.forEach((c, i) => expect(isUp(c)).toBe(i === col.length - 1));
    }
    expect(g.waste).toHaveLength(0);
    expect(g.foundations.every((p) => p.length === 0)).toBe(true);
    expect(g.score).toBe(0);
    // A real deck: 52 distinct cards.
    const ids = [...g.stock, ...g.tableau.flat()].map(idOf);
    expect(new Set(ids).size).toBe(52);
    // Same seed, same deal; a different seed differs.
    expect(Klondike.deal(42, 1).stock).toEqual(g.stock);
    expect(Klondike.deal(43, 1).stock).not.toEqual(g.stock);
  });
});

describe("klondike moves", () => {
  it("builds tableau columns down in alternating colours, and only kings fill empty columns", () => {
    const g = empty();
    g.tableau[0] = [card(0, 5)]; // 6 of spades
    g.tableau[1] = [card(1, 4)]; // 5 of hearts (red on black, one lower): fits
    g.tableau[2] = [card(3, 4)]; // 5 of clubs (black on black): doesn't fit
    g.tableau[3] = [card(1, 6)]; // 7 of hearts
    expect(g.canMove({ type: "tableau", col: 1, index: 0 }, { type: "tableau", col: 0 })).toBe(true);
    expect(g.canMove({ type: "tableau", col: 2, index: 0 }, { type: "tableau", col: 0 })).toBe(false);
    expect(g.canMove({ type: "tableau", col: 0, index: 0 }, { type: "tableau", col: 3 })).toBe(true);
    // Empty column 4: a king goes, a queen doesn't.
    g.tableau[5] = [card(2, 12)];
    g.tableau[6] = [card(2, 11)];
    expect(g.canMove({ type: "tableau", col: 5, index: 0 }, { type: "tableau", col: 4 })).toBe(true);
    expect(g.canMove({ type: "tableau", col: 6, index: 0 }, { type: "tableau", col: 4 })).toBe(false);
  });

  it("moves a whole face-up run, flips the card underneath and scores it", () => {
    const g = empty();
    g.tableau[0] = [card(0, 9, false), card(1, 7), card(3, 6), card(2, 5)]; // hidden, 8H, 7C, 6D
    g.tableau[1] = [card(0, 8)]; // 9 of spades
    expect(g.canMove({ type: "tableau", col: 0, index: 1 }, { type: "tableau", col: 1 })).toBe(true);
    const r = g.move({ type: "tableau", col: 0, index: 1 }, { type: "tableau", col: 1 })!;
    expect(r.flipped).toBe(true);
    expect(r.delta).toBe(5);
    expect(g.tableau[1].map(idOf)).toEqual([card(0, 8), card(1, 7), card(3, 6), card(2, 5)].map(idOf));
    expect(g.tableau[0]).toEqual([card(0, 9, true)]);
    expect(g.moves).toBe(1);
    // A face-down card can't be picked up.
    g.tableau[2] = [card(3, 3, false), card(2, 2)];
    expect(g.cardsAt({ type: "tableau", col: 2, index: 0 })).toEqual([]);
  });

  it("builds foundations from aces up in suit, and scores the Windows way", () => {
    const g = empty();
    g.waste = [card(1, 0)]; // ace of hearts
    g.tableau[0] = [card(1, 1)]; // 2 of hearts
    g.tableau[1] = [card(0, 1)]; // 2 of spades
    expect(g.canFoundation(card(1, 1), 0)).toBe(false); // empty pile needs an ace
    expect(g.move({ type: "waste" }, { type: "foundation", pile: 2 })!.delta).toBe(10);
    expect(g.canMove({ type: "tableau", col: 1, index: 0 }, { type: "foundation", pile: 2 })).toBe(false); // wrong suit
    expect(g.move({ type: "tableau", col: 0, index: 0 }, { type: "foundation", pile: 2 })!.delta).toBe(10);
    expect(g.score).toBe(20);
    // Pulling a card back down costs 15.
    g.tableau[3] = [card(3, 2)]; // 3 of clubs: the 2 of hearts may go back onto it
    const back = g.move({ type: "foundation", pile: 2 }, { type: "tableau", col: 3 })!;
    expect(back.delta).toBe(-15);
    expect(g.score).toBe(5);
  });

  it("sends a tapped card to the best place: foundation first, tableau second, king to empty column", () => {
    const g = empty();
    g.waste = [card(1, 0)];
    expect(g.bestMove({ type: "waste" })).toEqual({ type: "foundation", pile: 0 });
    g.waste = [card(0, 6)]; // 7 of spades
    g.tableau[2] = [card(1, 7)]; // 8 of hearts
    expect(g.bestMove({ type: "waste" })).toEqual({ type: "tableau", col: 2 });
    g.waste = [card(2, 12)]; // king waiting for an empty column
    g.tableau = [[card(0, 3)], [card(0, 3)], [card(0, 3)], [card(0, 3)], [card(0, 3)], [card(0, 3)], []];
    expect(g.bestMove({ type: "waste" })).toEqual({ type: "tableau", col: 6 });
    // A king already at the base of a column has nowhere better to go.
    g.waste = [];
    g.tableau[0] = [card(2, 12)];
    expect(g.bestMove({ type: "tableau", col: 0, index: 0 })).toBeNull();
    // double-click target: only single cards, only onto a foundation
    g.tableau[1] = [card(2, 0)];
    expect(g.toFoundation({ type: "tableau", col: 1, index: 0 })).toEqual({ type: "foundation", pile: 0 });
    expect(g.toFoundation({ type: "tableau", col: 2, index: 0 })).toBeNull();
  });
});

describe("klondike stock", () => {
  it("draws one card at a time in draw-1 and recycles for -100 (never below zero)", () => {
    const g = Klondike.deal(7, 1);
    const first = g.stock[g.stock.length - 1];
    const r = g.draw();
    expect(r).toMatchObject({ drew: 1, recycled: false });
    expect(g.waste).toEqual([up(first)]);
    expect(g.stock).toHaveLength(23);
    while (g.stock.length) g.draw();
    expect(g.waste).toHaveLength(24);
    g.score = 130;
    const rec = g.draw();
    expect(rec).toMatchObject({ recycled: true, delta: -100 });
    expect(g.score).toBe(30);
    expect(g.stock).toHaveLength(24);
    expect(g.waste).toHaveLength(0);
    expect(g.stock.every((c) => !isUp(c))).toBe(true);
    // The first card drawn comes out first again.
    g.draw();
    expect(idOf(g.waste[0])).toBe(idOf(first));
    g.score = 0;
    while (g.stock.length) g.draw();
    expect(g.draw().delta).toBe(0);
    expect(g.score).toBe(0);
  });

  it("draws three at a time in draw-3, turns the stock over when it runs out, and charges only after pass three", () => {
    const g = Klondike.deal(11, 3);
    const order = g.stock.slice().reverse().map(idOf); // the order cards come out of the stock
    g.draw();
    expect(g.waste).toHaveLength(3);
    expect(g.waste.map(idOf)).toEqual(order.slice(0, 3)); // the third drawn card ends up on top
    expect(g.waste.every(isUp)).toBe(true);
    expect(g.stock).toHaveLength(21);
    for (let i = 0; i < 7; i++) g.draw();
    expect(g.stock).toHaveLength(0);
    expect(g.waste).toHaveLength(24);
    g.score = 50;
    expect(g.draw()).toMatchObject({ recycled: true, delta: 0 }); // 1st recycle is free
    expect(g.stock.map(idOf)).toEqual(order.slice().reverse()); // same cards, same order as the original deal
    for (let i = 0; i < 8; i++) g.draw();
    expect(g.draw()).toMatchObject({ recycled: true, delta: 0 }); // 2nd free
    for (let i = 0; i < 8; i++) g.draw();
    expect(g.draw()).toMatchObject({ recycled: true, delta: -20 }); // 3rd pays
    expect(g.score).toBe(30);
    // A partial last draw: 24 cards in threes is exact, so test with 2 left.
    const h = empty(3);
    h.stock = [card(0, 0, false), card(0, 1, false)];
    expect(h.draw().drew).toBe(2);
  });
});

describe("klondike end of game and undo", () => {
  it("recognises a win when all four foundations hold 13 cards", () => {
    const g = empty();
    for (let s = 0; s < 4; s++) for (let r = 0; r < 12; r++) g.foundations[s].push(card(s, r));
    expect(g.won).toBe(false);
    for (let s = 0; s < 4; s++) g.tableau[s] = [card(s, 12)];
    expect(g.canAutoComplete).toBe(true);
    for (let i = 0; i < 4; i++) {
      const next = g.nextFoundationMove()!;
      expect(g.move(next.src, next.dst)).not.toBeNull();
    }
    expect(g.won).toBe(true);
    expect(g.nextFoundationMove()).toBeNull();
    expect(g.score).toBe(40);
    expect(timeBonus(10)).toBe(0);
    expect(timeBonus(100)).toBe(7000);
  });

  it("only offers auto-complete when everything is face up and the stock and waste are empty", () => {
    const g = empty();
    g.tableau[0] = [card(0, 4, false), card(1, 3)];
    expect(g.canAutoComplete).toBe(false);
    g.tableau[0] = [card(0, 4), card(1, 3)];
    expect(g.canAutoComplete).toBe(true);
    g.stock = [card(2, 2, false)];
    expect(g.canAutoComplete).toBe(false);
  });

  it("undoes any move exactly, restoring cards, score and move count", () => {
    const g = Klondike.deal(99, 3);
    const start = JSON.stringify(g.snapshot());
    g.draw();
    g.draw();
    expect(g.canUndo).toBe(true);
    expect(g.undo()).toBe(true);
    expect(g.undo()).toBe(true);
    expect(JSON.stringify(g.snapshot())).toBe(start);
    expect(g.undo()).toBe(false);
    // Undo after a scoring move with a flip.
    const h = empty();
    h.tableau[0] = [card(0, 9, false), card(1, 0)];
    const before = JSON.stringify(h.snapshot());
    h.move({ type: "tableau", col: 0, index: 1 }, { type: "foundation", pile: 0 });
    expect(h.score).toBe(15);
    expect(h.tableau[0].every(isUp)).toBe(true);
    h.undo();
    expect(JSON.stringify(h.snapshot())).toBe(before);
    expect(h.tableau[0].map(isUp)).toEqual([false, true]);
    expect(rankOf(card(2, 7))).toBe(7);
    expect(suitOf(card(2, 7))).toBe(2);
  });

  it("knows when the player is stuck", () => {
    const g = empty();
    g.tableau = [[card(0, 3)], [card(0, 5)], [card(3, 7)], [card(0, 9)], [card(3, 11)], [card(0, 2)], [card(3, 1)]];
    expect(g.hasMoves).toBe(false);
    g.tableau[1] = [card(1, 2)]; // the 3 of hearts fits on the 4 of spades
    g.tableau[0] = [card(0, 3)];
    expect(g.hasMoves).toBe(true);
  });
});
