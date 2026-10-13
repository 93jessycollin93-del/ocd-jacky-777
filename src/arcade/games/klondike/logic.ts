// Klondike solitaire rules: pure TypeScript with no DOM. A card is a number: id (0-51) plus 64 when it is
// face up. id = suit * 13 + rank, rank 0 = Ace .. 12 = King, suits 0 spades, 1 hearts, 2 diamonds, 3 clubs.
import { mulberry32, shuffle } from "../../kit/rng";

export type Card = number;
export const FACE_UP = 64;
export const idOf = (c: Card) => c & 63;
export const rankOf = (c: Card) => (c & 63) % 13;
export const suitOf = (c: Card) => Math.floor((c & 63) / 13);
export const isUp = (c: Card) => (c & FACE_UP) !== 0;
export const isRed = (c: Card) => {
  const s = suitOf(c);
  return s === 1 || s === 2;
};
export const up = (c: Card): Card => c | FACE_UP;
export const down = (c: Card): Card => c & 63;

export const RANK_NAMES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const SUIT_NAMES = ["spades", "hearts", "diamonds", "clubs"];
export const cardName = (c: Card) => `${RANK_NAMES[rankOf(c)]} of ${SUIT_NAMES[suitOf(c)]}`;

export type Source = { type: "waste" } | { type: "foundation"; pile: number } | { type: "tableau"; col: number; index: number };
export type Dest = { type: "foundation"; pile: number } | { type: "tableau"; col: number };

export interface Snapshot {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  score: number;
  moves: number;
  passes: number;
}

export interface MoveResult {
  /** Points gained or lost by the move itself, including a turned-over card. */
  delta: number;
  /** Did the move turn over a face-down tableau card? */
  flipped: boolean;
  /** The card that was turned over, if any. */
  flippedCard?: Card;
}

export interface DrawResult {
  /** Cards moved stock -> waste, or 0 when the waste was recycled back into the stock. */
  drew: number;
  recycled: boolean;
  delta: number;
}

/** Windows-style scoring: waste->tableau 5, ->foundation 10, turn a card 5, foundation->tableau -15. */
export const SCORE = { wasteToTableau: 5, toFoundation: 10, flip: 5, foundationToTableau: -15 };

/** Time bonus on a win: 700000 / seconds, but only for games that took at least 30 seconds. */
export const timeBonus = (seconds: number) => (seconds < 30 ? 0 : Math.floor(700000 / seconds));

export class Klondike {
  stock: Card[] = [];
  waste: Card[] = [];
  foundations: Card[][] = [[], [], [], []];
  tableau: Card[][] = [[], [], [], [], [], [], []];
  score = 0;
  moves = 0;
  /** How many times the waste has been turned back into the stock. */
  passes = 0;
  history: Snapshot[] = [];

  constructor(public drawCount: 1 | 3 = 1) {}

  /** Deal a new game: 7 columns of 1..7 cards (the last face up) and 24 cards in the stock. */
  static deal(seed: number, drawCount: 1 | 3 = 1): Klondike {
    const g = new Klondike(drawCount);
    const deck = shuffle(mulberry32(seed), Array.from({ length: 52 }, (_, i) => i));
    let n = 0;
    for (let col = 0; col < 7; col++) {
      for (let i = 0; i <= col; i++) {
        const id = deck[n++];
        g.tableau[col].push(i === col ? up(id) : id);
      }
    }
    while (n < 52) g.stock.push(deck[n++]);
    return g;
  }

  snapshot(): Snapshot {
    return {
      stock: this.stock.slice(),
      waste: this.waste.slice(),
      foundations: this.foundations.map((p) => p.slice()),
      tableau: this.tableau.map((p) => p.slice()),
      score: this.score,
      moves: this.moves,
      passes: this.passes,
    };
  }

  private restore(s: Snapshot) {
    this.stock = s.stock;
    this.waste = s.waste;
    this.foundations = s.foundations;
    this.tableau = s.tableau;
    this.score = s.score;
    this.moves = s.moves;
    this.passes = s.passes;
  }

  get canUndo() {
    return this.history.length > 0;
  }

  /** Take back the last move (draws and recycles included), restoring score and move count. */
  undo(): boolean {
    const s = this.history.pop();
    if (!s) return false;
    this.restore(s);
    return true;
  }

  // ------------------------------------------------------------ the stock
  draw(): DrawResult {
    if (this.stock.length === 0 && this.waste.length === 0) return { drew: 0, recycled: false, delta: 0 };
    this.history.push(this.snapshot());
    this.moves++;
    if (this.stock.length === 0) {
      // Turn the waste over to make a new stock: the card that was drawn first comes out first again.
      this.stock = this.waste.reverse().map(down);
      this.waste = [];
      this.passes++;
      let delta = 0;
      if (this.drawCount === 1) delta = -100;
      else if (this.passes >= 3) delta = -20;
      const before = this.score;
      this.score = Math.max(0, this.score + delta);
      return { drew: 0, recycled: true, delta: this.score - before };
    }
    const n = Math.min(this.drawCount, this.stock.length);
    for (let i = 0; i < n; i++) this.waste.push(up(this.stock.pop()!));
    return { drew: n, recycled: false, delta: 0 };
  }

  // ------------------------------------------------------------ legality
  /** The cards a source would pick up (a tableau run, or a single card), or [] if it is not movable. */
  cardsAt(src: Source): Card[] {
    if (src.type === "waste") return this.waste.length ? [this.waste[this.waste.length - 1]] : [];
    if (src.type === "foundation") {
      const p = this.foundations[src.pile];
      return p.length ? [p[p.length - 1]] : [];
    }
    const col = this.tableau[src.col];
    if (src.index < 0 || src.index >= col.length || !isUp(col[src.index])) return [];
    return col.slice(src.index);
  }

  /** Can a card go on a foundation pile? Aces start empty piles, then the same suit climbs. */
  canFoundation(card: Card, pile: number): boolean {
    const p = this.foundations[pile];
    if (p.length === 0) return rankOf(card) === 0;
    const top = p[p.length - 1];
    return suitOf(top) === suitOf(card) && rankOf(card) === rankOf(top) + 1;
  }

  canTableau(head: Card, col: number): boolean {
    const c = this.tableau[col];
    if (c.length === 0) return rankOf(head) === 12;
    const top = c[c.length - 1];
    return isUp(top) && isRed(top) !== isRed(head) && rankOf(top) === rankOf(head) + 1;
  }

  canMove(src: Source, dst: Dest): boolean {
    const cards = this.cardsAt(src);
    if (cards.length === 0) return false;
    if (dst.type === "foundation") return cards.length === 1 && this.canFoundation(cards[0], dst.pile);
    if (src.type === "tableau" && src.col === dst.col) return false;
    return this.canTableau(cards[0], dst.col);
  }

  /** Make a move if it is legal. Returns what happened, or null if it was not legal. */
  move(src: Source, dst: Dest): MoveResult | null {
    if (!this.canMove(src, dst)) return null;
    this.history.push(this.snapshot());
    this.moves++;
    let delta = 0;
    let cards: Card[];
    if (src.type === "waste") cards = [this.waste.pop()!];
    else if (src.type === "foundation") cards = [this.foundations[src.pile].pop()!];
    else cards = this.tableau[src.col].splice(src.index);
    if (dst.type === "foundation") {
      this.foundations[dst.pile].push(...cards);
      delta += src.type === "foundation" ? 0 : SCORE.toFoundation;
    } else {
      this.tableau[dst.col].push(...cards);
      if (src.type === "waste") delta += SCORE.wasteToTableau;
      else if (src.type === "foundation") delta += SCORE.foundationToTableau;
    }
    let flipped = false;
    let flippedCard: Card | undefined;
    if (src.type === "tableau") {
      const col = this.tableau[src.col];
      if (col.length && !isUp(col[col.length - 1])) {
        col[col.length - 1] = up(col[col.length - 1]);
        flipped = true;
        flippedCard = col[col.length - 1];
        delta += SCORE.flip;
      }
    }
    const before = this.score;
    this.score = Math.max(0, this.score + delta);
    return { delta: this.score - before, flipped, flippedCard };
  }

  /** Which foundation pile would take this card (the matching suit, or the first empty one for an ace)? */
  foundationFor(card: Card): number {
    for (let i = 0; i < 4; i++) if (this.canFoundation(card, i) && this.foundations[i].length > 0) return i;
    for (let i = 0; i < 4; i++) if (this.canFoundation(card, i)) return i;
    return -1;
  }

  /** The best place to send a card or run when tapped: a foundation first, then a tableau column. */
  bestMove(src: Source): Dest | null {
    const cards = this.cardsAt(src);
    if (cards.length === 0) return null;
    if (cards.length === 1 && src.type !== "foundation") {
      const f = this.foundationFor(cards[0]);
      if (f >= 0) return { type: "foundation", pile: f };
    }
    let fallback: Dest | null = null;
    for (let col = 0; col < 7; col++) {
      if (!this.canMove(src, { type: "tableau", col })) continue;
      const target = this.tableau[col];
      // Moving a column's own base card (a king, or a whole run) to an empty column gains nothing.
      if (target.length === 0 && src.type === "tableau" && src.index === 0) continue;
      // Prefer a move that uncovers a face-down card; otherwise remember the first legal one.
      if (src.type === "tableau" && src.index > 0 && !isUp(this.tableau[src.col][src.index - 1])) return { type: "tableau", col };
      if (!fallback || (target.length > 0 && fallback.type === "tableau" && this.tableau[fallback.col].length === 0)) fallback = { type: "tableau", col };
    }
    return fallback;
  }

  /** The foundation move for a specific card on top of a pile (double-click), or null. */
  toFoundation(src: Source): Dest | null {
    const cards = this.cardsAt(src);
    if (cards.length !== 1 || src.type === "foundation") return null;
    const f = this.foundationFor(cards[0]);
    return f >= 0 ? { type: "foundation", pile: f } : null;
  }

  // ------------------------------------------------------------ end of game
  get won(): boolean {
    return this.foundations.every((p) => p.length === 13);
  }

  /** Everything is face up and the stock and waste are empty: the rest is a formality. */
  get canAutoComplete(): boolean {
    if (this.won || this.stock.length || this.waste.length) return false;
    return this.tableau.every((col) => col.every(isUp));
  }

  /** The next card that can go to a foundation (waste or the top of a column), or null. */
  nextFoundationMove(): { src: Source; dst: Dest } | null {
    if (this.waste.length) {
      const dst = this.toFoundation({ type: "waste" });
      if (dst) return { src: { type: "waste" }, dst };
    }
    for (let col = 0; col < 7; col++) {
      const n = this.tableau[col].length;
      if (!n) continue;
      const src: Source = { type: "tableau", col, index: n - 1 };
      if (!isUp(this.tableau[col][n - 1])) continue;
      const dst = this.toFoundation(src);
      if (dst) return { src, dst };
    }
    return null;
  }

  /** Any legal move at all (a draw or recycle counts)? Used to tell the player when they are stuck. */
  get hasMoves(): boolean {
    if (this.stock.length || this.waste.length) {
      // Cycling the stock may still reveal a move; only call it stuck when nothing in reach works.
      const seen = new Set<number>();
      for (const c of [...this.stock, ...this.waste]) seen.add(idOf(c));
      for (const id of seen) {
        const card = up(id);
        for (let i = 0; i < 4; i++) if (this.canFoundation(card, i)) return true;
        for (let col = 0; col < 7; col++) if (this.canTableau(card, col)) return true;
      }
    }
    for (let col = 0; col < 7; col++) {
      const c = this.tableau[col];
      for (let i = 0; i < c.length; i++) {
        if (!isUp(c[i])) continue;
        const src: Source = { type: "tableau", col, index: i };
        for (let d = 0; d < 7; d++) {
          if (!this.canMove(src, { type: "tableau", col: d })) continue;
          if (!(i === 0 && this.tableau[d].length === 0)) return true;
        }
        if (i === c.length - 1) for (let f = 0; f < 4; f++) if (this.canMove(src, { type: "foundation", pile: f })) return true;
      }
    }
    return false;
  }
}
