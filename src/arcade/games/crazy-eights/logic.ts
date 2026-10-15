// Crazy Eights rules, pure and seeded. Cards are 0..51: suit = floor(id / 13) (spades, hearts, diamonds, clubs),
// rank = id % 13 (0 = ace … 7 = eight … 12 = king). Play a card matching the top card's suit or rank; eights are
// wild and name the next suit. If you can't (or won't) play, draw one: play it if you can, otherwise pass.
// The first to empty their hand wins the round and scores everyone else's cards; the match goes to 200.
import { mulberry32, shuffle, type Rng } from "../../kit/rng";

export const EIGHT = 7;
export const MATCH_TARGET = 200;
export const SUIT_SYMBOLS = ["♠", "♥", "♦", "♣"];
export const SUIT_NAMES = ["spades", "hearts", "diamonds", "clubs"];
export const RANK_LABELS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export const suitOf = (c: number) => Math.floor(c / 13);
export const rankOf = (c: number) => c % 13;
export const cardLabel = (c: number) => `${RANK_LABELS[rankOf(c)]}${SUIT_SYMBOLS[suitOf(c)]}`;

/** Points a card left in hand gives the round winner. */
export function cardPoints(c: number): number {
  const r = rankOf(c);
  if (r === EIGHT) return 50;
  if (r >= 10) return 10;
  if (r === 0) return 1;
  return r + 1;
}

export const handPoints = (hand: number[]) => hand.reduce((n, c) => n + cardPoints(c), 0);

export interface C8State {
  rng: Rng;
  players: number;
  hands: number[][];
  stock: number[];
  discard: number[];
  /** The suit to follow (differs from the top card after an eight). */
  suit: number;
  turn: number;
  /** The player to move has drawn this turn, so they may only play that card or pass. */
  drawn: number | null;
  /** Consecutive turns that ended with nobody able to play or draw (ends a blocked round). */
  stuck: number;
  roundOver: boolean;
  roundWinner: number;
  roundPoints: number;
  scores: number[];
  dealer: number;
}

export function newMatch(seed: number, players: number): C8State {
  const s: C8State = {
    rng: mulberry32(seed), players, hands: [], stock: [], discard: [], suit: 0, turn: 0, drawn: null, stuck: 0,
    roundOver: false, roundWinner: -1, roundPoints: 0, scores: new Array(players).fill(0), dealer: players - 1,
  };
  deal(s);
  return s;
}

/** Shuffle and deal a new round: 7 cards each with two players, 5 with more. */
export function deal(s: C8State) {
  const deck = shuffle(s.rng, Array.from({ length: 52 }, (_, i) => i));
  const per = s.players === 2 ? 7 : 5;
  s.hands = Array.from({ length: s.players }, () => deck.splice(0, per));
  // The starter can't be an eight: bury any eight and turn the next card.
  let start = deck.shift()!;
  while (rankOf(start) === EIGHT) {
    deck.push(start);
    start = deck.shift()!;
  }
  s.discard = [start];
  s.stock = deck;
  s.suit = suitOf(start);
  s.dealer = (s.dealer + 1) % s.players;
  s.turn = (s.dealer + 1) % s.players;
  s.drawn = null;
  s.stuck = 0;
  s.roundOver = false;
  s.roundWinner = -1;
  s.roundPoints = 0;
}

export const top = (s: C8State) => s.discard[s.discard.length - 1];

export function canPlay(s: C8State, card: number): boolean {
  if (rankOf(card) === EIGHT) return true;
  return suitOf(card) === s.suit || rankOf(card) === rankOf(top(s));
}

/** Cards the player to move may play right now. */
export function playable(s: C8State, p = s.turn): number[] {
  if (s.roundOver || p !== s.turn) return [];
  if (s.drawn !== null) return canPlay(s, s.drawn) ? [s.drawn] : [];
  return s.hands[p].filter((c) => canPlay(s, c));
}

function nextTurn(s: C8State) {
  s.turn = (s.turn + 1) % s.players;
  s.drawn = null;
}

/** Play a card (an eight also names the suit). Returns false if the move isn't legal. */
export function playCard(s: C8State, card: number, suit?: number): boolean {
  if (!playable(s).includes(card)) return false;
  const hand = s.hands[s.turn];
  hand.splice(hand.indexOf(card), 1);
  s.discard.push(card);
  s.suit = rankOf(card) === EIGHT ? (suit ?? suitOf(card)) : suitOf(card);
  s.stuck = 0;
  if (hand.length === 0) {
    finishRound(s, s.turn);
    return true;
  }
  nextTurn(s);
  return true;
}

/** Turn the discards (all but the top) back into a shuffled stock. */
function refillStock(s: C8State) {
  if (s.stock.length || s.discard.length <= 1) return;
  const keep = s.discard.pop()!;
  s.stock = shuffle(s.rng, s.discard);
  s.discard = [keep];
}

/**
 * Draw one card. Returns it, or null if there was nothing to draw: then the turn simply passes, and a round in
 * which every player is stuck in a row ends with the lowest hand winning.
 */
export function drawCard(s: C8State): number | null {
  if (s.roundOver || s.drawn !== null) return null;
  refillStock(s);
  const card = s.stock.pop();
  if (card === undefined) {
    s.stuck++;
    if (s.stuck >= s.players) {
      const values = s.hands.map(handPoints);
      finishRound(s, values.indexOf(Math.min(...values)));
    } else nextTurn(s);
    return null;
  }
  s.hands[s.turn].push(card);
  s.drawn = card;
  s.stuck = 0;
  return card;
}

/** After drawing, keep the card and end the turn. */
export function pass(s: C8State): boolean {
  if (s.drawn === null || s.roundOver) return false;
  nextTurn(s);
  return true;
}

function finishRound(s: C8State, winner: number) {
  s.roundOver = true;
  s.roundWinner = winner;
  s.roundPoints = s.hands.reduce((n, h, i) => (i === winner ? n : n + handPoints(h)), 0);
  s.scores[winner] += s.roundPoints;
}

export const matchWinner = (s: C8State) => s.scores.findIndex((v) => v >= MATCH_TARGET);

/** The suit a player holds most of (ignoring eights), for naming after an eight. */
export function favouriteSuit(hand: number[]): number {
  const counts = [0, 0, 0, 0];
  for (const c of hand) if (rankOf(c) !== EIGHT) counts[suitOf(c)]++;
  return counts.indexOf(Math.max(...counts));
}

export type BotMove = { type: "play"; card: number; suit?: number } | { type: "draw" } | { type: "pass" };

/**
 * The computer's move: keep eights for when it's stuck, follow the suit it holds most of, and when an opponent
 * is about to go out, dump its most valuable cards.
 */
export function botMove(s: C8State): BotMove {
  const hand = s.hands[s.turn];
  const options = playable(s);
  if (!options.length) return s.drawn !== null ? { type: "pass" } : { type: "draw" };
  const danger = s.hands.some((h, i) => i !== s.turn && h.length <= 2);
  const plain = options.filter((c) => rankOf(c) !== EIGHT);
  const pickFrom = plain.length ? plain : options;
  const suitCount = (suit: number) => hand.filter((c) => suitOf(c) === suit && rankOf(c) !== EIGHT).length;
  const best = pickFrom.slice().sort((a, b) => {
    if (danger) return cardPoints(b) - cardPoints(a);
    // Prefer a card that leaves us in our longest suit, then the higher-value card.
    return suitCount(suitOf(b)) - suitCount(suitOf(a)) || cardPoints(b) - cardPoints(a);
  })[0];
  if (rankOf(best) === EIGHT) {
    const rest = hand.filter((c) => c !== best);
    return { type: "play", card: best, suit: favouriteSuit(rest) };
  }
  return { type: "play", card: best };
}
