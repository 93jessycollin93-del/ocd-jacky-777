// Word Guess rules: pure and testable. A five-letter secret word, six guesses, classic colouring (greens
// first, then amber only up to the number of that letter still unmatched in the answer), an optional
// hard mode, a deterministic daily word, and the streak / distribution stats.
import { pick, type Rng } from "../../kit/rng";
import { ANSWERS, isValidGuess } from "./words";

export const WORD_LEN = 5;
export const MAX_GUESSES = 6;

export type TileState = "correct" | "present" | "absent";
export type Status = "playing" | "won" | "lost";

/** Colour one guess against the answer, with the classic rules for repeated letters. */
export function scoreGuess(guess: string, answer: string): TileState[] {
  const g = guess.toLowerCase();
  const a = answer.toLowerCase();
  const out: TileState[] = Array.from({ length: g.length }, () => "absent" as TileState);
  const left: Record<string, number> = {};
  // Greens first; every other answer letter goes into the pool amber can draw from.
  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) out[i] = "correct";
    else left[a[i]] = (left[a[i]] ?? 0) + 1;
  }
  for (let i = 0; i < g.length; i++) {
    if (out[i] === "correct") continue;
    if ((left[g[i]] ?? 0) > 0) {
      out[i] = "present";
      left[g[i]]--;
    }
  }
  return out;
}

// ---- dates and the daily word

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Whole days from 2024-01-01 to the given YYYY-MM-DD (calendar arithmetic, immune to DST). */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2024, 0, 1)) / 86400000);
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** A step that visits every answer once before repeating (coprime with the list length). */
export function dailyStride(n: number): number {
  let s = Math.max(1, Math.round(n * 0.618));
  while (gcd(s, n) !== 1) s++;
  return s;
}

/** Everyone gets the same word on the same local date, and no word repeats until the list is used up. */
export function dailyAnswer(key: string, answers: readonly string[] = ANSWERS): string {
  const n = answers.length;
  const day = ((dayNumber(key) % n) + n) % n;
  return answers[(day * dailyStride(n) + 137) % n];
}

/** A random answer that isn't the one just played. */
export function randomAnswer(rng: Rng, avoid?: string, answers: readonly string[] = ANSWERS): string {
  for (let i = 0; i < 20; i++) {
    const w = pick(rng, answers);
    if (w !== avoid) return w;
  }
  return answers[0];
}

// ---- hard mode and keyboard

export interface Row {
  guess: string;
  tiles: TileState[];
}

const ORD = ["1st", "2nd", "3rd", "4th", "5th"];

/**
 * Hard mode: every revealed hint must be used. Greens stay in place and every letter known to be in the
 * word (as many times as it was revealed in one guess) must appear. Returns the complaint, or null.
 */
export function checkHard(rows: readonly Row[], next: string): string | null {
  const n = next.toLowerCase();
  for (const r of rows) {
    for (let i = 0; i < r.guess.length; i++) {
      if (r.tiles[i] === "correct" && n[i] !== r.guess[i]) return `${ORD[i]} letter must be ${r.guess[i].toUpperCase()}`;
    }
  }
  const need: Record<string, number> = {};
  for (const r of rows) {
    const here: Record<string, number> = {};
    for (let i = 0; i < r.guess.length; i++) if (r.tiles[i] !== "absent") here[r.guess[i]] = (here[r.guess[i]] ?? 0) + 1;
    for (const [ch, c] of Object.entries(here)) need[ch] = Math.max(need[ch] ?? 0, c);
  }
  for (const [ch, c] of Object.entries(need)) {
    const have = n.split(ch).length - 1;
    if (have < c) return c > 1 ? `Guess must contain ${c} ${ch.toUpperCase()}s` : `Guess must contain ${ch.toUpperCase()}`;
  }
  return null;
}

const RANK: Record<TileState, number> = { absent: 1, present: 2, correct: 3 };

/** Best known state of each letter, for colouring the on-screen keyboard. */
export function keyStates(rows: readonly Row[]): Record<string, TileState> {
  const out: Record<string, TileState> = {};
  for (const r of rows) {
    for (let i = 0; i < r.guess.length; i++) {
      const ch = r.guess[i];
      if (!out[ch] || RANK[r.tiles[i]] > RANK[out[ch]]) out[ch] = r.tiles[i];
    }
  }
  return out;
}

// ---- one board

export interface Board {
  answer: string;
  guesses: string[];
  status: Status;
}

export const newBoard = (answer: string): Board => ({ answer, guesses: [], status: "playing" });

export const boardRows = (b: Board): Row[] => b.guesses.map((g) => ({ guess: g, tiles: scoreGuess(g, b.answer) }));

/** `ok` guesses come with their colours; refused ones with a reason and the message to show. */
export interface SubmitResult {
  ok: boolean;
  tiles: TileState[];
  status: Status;
  reason?: "finished" | "short" | "unknown" | "hard";
  message?: string;
}

const refused = (reason: NonNullable<SubmitResult["reason"]>, message: string, status: Status): SubmitResult => ({ ok: false, reason, message, tiles: [], status });

/** Try a guess. Valid guesses are added to the board (which also updates its status). */
export function submitGuess(b: Board, word: string, hard = false): SubmitResult {
  const w = word.toLowerCase();
  if (b.status !== "playing") return refused("finished", "Game over", b.status);
  if (w.length < WORD_LEN) return refused("short", "Not enough letters", b.status);
  if (!isValidGuess(w)) return refused("unknown", "Not in word list", b.status);
  if (hard) {
    const complaint = checkHard(boardRows(b), w);
    if (complaint) return refused("hard", complaint, b.status);
  }
  const tiles = scoreGuess(w, b.answer);
  b.guesses.push(w);
  if (w === b.answer) b.status = "won";
  else if (b.guesses.length >= MAX_GUESSES) b.status = "lost";
  return { ok: true, tiles, status: b.status };
}

// ---- stats

export interface Stats {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
  /** dist[i] = games won in i + 1 guesses. */
  dist: number[];
  /** Daily only: the last date (YYYY-MM-DD) a result was recorded, so a missed day breaks the streak. */
  lastDate?: string;
}

export const emptyStats = (): Stats => ({ played: 0, wins: 0, streak: 0, maxStreak: 0, dist: Array.from({ length: MAX_GUESSES }, () => 0) });

/** Read saved stats defensively: anything odd becomes zeros. */
export function cleanStats(raw: unknown): Stats {
  const s = emptyStats();
  if (!raw || typeof raw !== "object") return s;
  const r = raw as Partial<Stats>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  s.played = num(r.played);
  s.wins = Math.min(s.played, num(r.wins));
  s.streak = num(r.streak);
  s.maxStreak = Math.max(s.streak, num(r.maxStreak));
  if (Array.isArray(r.dist)) s.dist = s.dist.map((_, i) => num(r.dist![i]));
  if (typeof r.lastDate === "string") s.lastDate = r.lastDate;
  return s;
}

/**
 * Record a finished game. `key` is the date for daily games: a streak only carries on from yesterday, so a
 * missed day starts it again.
 */
export function recordResult(prev: Stats, won: boolean, guesses: number, key?: string): Stats {
  const s: Stats = { ...prev, dist: [...prev.dist] };
  if (key && s.lastDate && dayNumber(key) - dayNumber(s.lastDate) > 1) s.streak = 0;
  s.played++;
  if (won) {
    s.wins++;
    s.streak++;
    s.maxStreak = Math.max(s.maxStreak, s.streak);
    const i = Math.min(MAX_GUESSES, Math.max(1, guesses)) - 1;
    s.dist[i]++;
  } else {
    s.streak = 0;
  }
  if (key) s.lastDate = key;
  return s;
}

export const winPercent = (s: Stats) => (s.played ? Math.round((s.wins / s.played) * 100) : 0);

/** The shareable emoji grid for a finished board. */
export function shareText(b: Board, label: string, contrast = false): string {
  const sq: Record<TileState, string> = contrast
    ? { correct: "🟧", present: "🟦", absent: "⬛" }
    : { correct: "🟩", present: "🟨", absent: "⬛" };
  const score = b.status === "won" ? `${b.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const grid = boardRows(b).map((r) => r.tiles.map((t) => sq[t]).join(""));
  return [`Word Guess ${label} ${score}`, "", ...grid].join("\n");
}

// ---- the daily save

export interface DailySave {
  date: string;
  guesses: string[];
  status: Status;
}

/** Rebuild today's board from a save, or null if it's missing, from another day, or has been tampered with. */
export function restoreDaily(raw: unknown, key: string, answer: string): Board | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<DailySave>;
  if (r.date !== key || !Array.isArray(r.guesses)) return null;
  const b = newBoard(answer);
  for (const g of r.guesses) {
    if (typeof g !== "string") return null;
    const res = submitGuess(b, g, false);
    if (!res.ok) return null;
  }
  return b;
}
