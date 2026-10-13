import { describe, expect, it } from "vitest";
import {
  EIGHT, MATCH_TARGET, botMove, canPlay, cardPoints, drawCard, handPoints, matchWinner, newMatch, pass, playCard, playable, rankOf, suitOf, top,
  type C8State,
} from "@/arcade/games/crazy-eights/logic";

const card = (rank: number, suit: number) => suit * 13 + rank;

/** Put the table in a known position. */
function setup(hands: number[][], topCard: number, stock: number[] = [card(1, 0)]): C8State {
  const s = newMatch(1, hands.length);
  s.hands = hands.map((h) => h.slice());
  s.discard = [topCard];
  s.suit = suitOf(topCard);
  s.stock = stock.slice();
  s.turn = 0;
  s.drawn = null;
  return s;
}

describe("crazy eights", () => {
  it("deals 7 cards each to two players and 5 to more, with a non-eight starter", () => {
    for (let seed = 1; seed < 30; seed++) {
      const two = newMatch(seed, 2);
      expect(two.hands.map((h) => h.length)).toEqual([7, 7]);
      expect(rankOf(top(two))).not.toBe(EIGHT);
      const four = newMatch(seed, 4);
      expect(four.hands.map((h) => h.length)).toEqual([5, 5, 5, 5]);
      const all = [...four.hands.flat(), ...four.stock, ...four.discard];
      expect(new Set(all).size).toBe(52);
    }
  });

  it("allows matching suit, matching rank, or any eight", () => {
    const s = setup([[], []], card(4, 1)); // 5 of hearts
    expect(canPlay(s, card(10, 1))).toBe(true); // jack of hearts
    expect(canPlay(s, card(4, 3))).toBe(true); // 5 of clubs
    expect(canPlay(s, card(EIGHT, 0))).toBe(true); // 8 of spades
    expect(canPlay(s, card(10, 0))).toBe(false); // jack of spades
  });

  it("lets an eight name the next suit", () => {
    const s = setup([[card(EIGHT, 0), card(2, 2)], [card(5, 3), card(6, 3)]], card(4, 1));
    expect(playCard(s, card(EIGHT, 0), 3)).toBe(true);
    expect(s.suit).toBe(3);
    expect(s.turn).toBe(1);
    expect(canPlay(s, card(5, 3))).toBe(true);
  });

  it("rejects illegal plays and out-of-turn plays", () => {
    const s = setup([[card(10, 0)], [card(4, 1)]], card(4, 1));
    expect(playCard(s, card(10, 0))).toBe(false);
    expect(s.hands[0]).toHaveLength(1);
  });

  it("after drawing you may only play the drawn card, or pass", () => {
    const s = setup([[card(10, 0)], [card(9, 2)]], card(4, 1), [card(6, 1)]);
    expect(playable(s)).toEqual([]);
    const drawn = drawCard(s);
    expect(drawn).toBe(card(6, 1));
    expect(playable(s)).toEqual([card(6, 1)]);
    expect(drawCard(s)).toBeNull();
    expect(pass(s)).toBe(true);
    expect(s.turn).toBe(1);
    expect(s.hands[0]).toHaveLength(2);
  });

  it("reshuffles the discards (all but the top card) when the deck runs out", () => {
    const s = setup([[card(10, 0)], [card(9, 2)]], card(4, 1), []);
    s.discard = [card(1, 2), card(2, 2), card(4, 1)];
    const drawn = drawCard(s);
    expect(drawn === card(1, 2) || drawn === card(2, 2)).toBe(true);
    expect(s.discard).toEqual([card(4, 1)]);
  });

  it("scores the other hands for the player who goes out: 8 = 50, faces 10, ace 1, others face value", () => {
    expect(cardPoints(card(EIGHT, 2))).toBe(50);
    expect(cardPoints(card(12, 0))).toBe(10);
    expect(cardPoints(card(0, 1))).toBe(1);
    expect(cardPoints(card(6, 3))).toBe(7);
    const s = setup([[card(6, 1)], [card(EIGHT, 0), card(12, 2), card(0, 3)]], card(4, 1));
    playCard(s, card(6, 1));
    expect(s.roundOver).toBe(true);
    expect(s.roundWinner).toBe(0);
    expect(s.roundPoints).toBe(61);
    expect(s.scores[0]).toBe(61);
  });

  it("ends a blocked round (no one can play or draw) with the lowest hand winning", () => {
    const s = setup([[card(10, 0)], [card(9, 2), card(12, 2)]], card(4, 1), []);
    expect(drawCard(s)).toBeNull();
    expect(drawCard(s)).toBeNull();
    expect(s.roundOver).toBe(true);
    expect(s.roundWinner).toBe(0);
    expect(s.roundPoints).toBe(handPoints([card(9, 2), card(12, 2)]));
  });

  it("the computer saves eights, follows its longest suit, and names its best suit", () => {
    const many = [card(2, 0), card(3, 0), card(5, 0), card(6, 0)];
    const s = setup([many, [card(EIGHT, 0), card(4, 3), card(9, 1), card(10, 3), card(11, 3)]], card(4, 1));
    s.turn = 1;
    // Both the 5 of clubs (rank match) and the 10 of hearts (suit match) are legal; clubs is its long suit.
    expect(botMove(s)).toEqual({ type: "play", card: card(4, 3) });
    // With an opponent down to one card it dumps the most valuable card instead.
    s.hands[0] = [card(2, 0)];
    expect(botMove(s)).toEqual({ type: "play", card: card(9, 1) });
    const stuck = setup([many, [card(EIGHT, 0), card(10, 3), card(11, 3)]], card(4, 1));
    stuck.turn = 1;
    expect(botMove(stuck)).toEqual({ type: "play", card: card(EIGHT, 0), suit: 3 });
  });

  it("plays whole matches between computer players to 200 without getting stuck", () => {
    for (const seed of [3, 4, 5]) {
      const s = newMatch(seed, 4);
      let moves = 0;
      while (matchWinner(s) < 0 && moves < 20000) {
        if (s.roundOver) {
          s.roundOver = false;
          // deal() is exercised through newMatch; reuse it for the next round
          s.hands = [];
          const next = newMatch(seed + moves, 4);
          Object.assign(s, { hands: next.hands, stock: next.stock, discard: next.discard, suit: next.suit, turn: next.turn, drawn: null, stuck: 0 });
          continue;
        }
        const m = botMove(s);
        if (m.type === "play") expect(playCard(s, m.card, m.suit)).toBe(true);
        else if (m.type === "draw") drawCard(s);
        else pass(s);
        moves++;
      }
      expect(Math.max(...s.scores)).toBeGreaterThanOrEqual(MATCH_TARGET);
    }
  });
});
