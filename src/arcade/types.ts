// Shared types for Arcade games. Every game lives in src/arcade/games/<id>/ with a meta.ts and an
// index.tsx; the registry finds them automatically.

export type Category =
  | "Arcade"
  | "Puzzle"
  | "Board & Cards"
  | "Action"
  | "Shooters"
  | "Sports & Racing"
  | "Strategy"
  | "Adventure & RPG"
  | "Casual";

export const CATEGORIES: Category[] = [
  "Shooters", "Action", "Arcade", "Sports & Racing", "Adventure & RPG", "Strategy", "Puzzle", "Board & Cards", "Casual",
];

export interface GameMeta {
  /** Folder name, kebab-case; the game lives at /arcade/<id>. */
  id: string;
  title: string;
  emoji: string;
  category: Category;
  /** One or two sentences: what you do and why it's fun. */
  blurb: string;
  controls: { desktop: string; touch: string };
  /** Brand colour for the card and the top bar, as #rrggbb. */
  accent: string;
  tags?: string[];
  /** Whether a bigger score is better (default) or a smaller one (golf strokes, fastest time). */
  scoreOrder?: "high" | "low";
  /** What the best score means, e.g. "Best", "Fastest", "Fewest strokes". */
  scoreLabel?: string;
  /** How to show the score: a plain number (default) or seconds as m:ss. */
  scoreFormat?: "number" | "time";
  /** Sort order within its category (lower first). */
  order?: number;
}

export interface GameProps {
  /** True on phones and tablets without a mouse: show on-screen controls. */
  touch: boolean;
  /** Best score so far in this browser (0 if none). */
  best: number;
  /** Record a finished run. Returns true if it's a new best. */
  submitScore: (score: number) => boolean;
}
