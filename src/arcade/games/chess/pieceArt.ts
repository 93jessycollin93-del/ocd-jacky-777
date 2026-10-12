// Original piece silhouettes for the chess board, drawn as SVG paths in a 100x100 box. Each piece is a few
// filled shapes (the body), some detail strokes, and round dots. The Piece component paints them in
// ivory or ink with a soft gradient and an outline.

export interface PieceArt {
  /** Filled and outlined shapes, back to front. */
  body: string[];
  /** Stroke-only details drawn on top (folds, slits, mane lines). */
  lines: string[];
  /** Round details: [cx, cy, r]. */
  dots: [number, number, number][];
}

const FOOT = "M22 90 H78 Q82 90 82 86 V84 Q82 80 78 80 H22 Q18 80 18 84 V86 Q18 90 22 90 Z";

export const ART: Record<number, PieceArt> = {
  // Pawn
  1: {
    body: [
      "M38 78 C40 66 43 58 44 50 H56 C57 58 60 66 62 78 Z",
      "M36 50 Q36 45 41 45 H59 Q64 45 64 50 Z",
      "M50 17 A13 13 0 1 1 49.99 17 Z",
      FOOT,
    ],
    lines: ["M44 58 Q50 61 56 58"],
    dots: [],
  },
  // Knight (faces left)
  2: {
    body: [
      "M30 80 C29 62 33 52 42 44 C37 44 32 47 27 51 C23 52 20 49 21 45 C23 39 30 31 35 25 L35 12 L44 20 C54 17 64 21 70 30 C77 40 78 62 74 80 Z",
      FOOT,
    ],
    lines: ["M52 24 C60 28 66 38 66 54", "M46 30 C54 33 58 40 58 52", "M24 47 Q27 45 30 46"],
    dots: [[42, 30, 2.6]],
  },
  // Bishop
  3: {
    body: [
      "M42 74 C42 66 44 62 44 58 H56 C56 62 58 66 58 74 Z",
      "M50 14 C62 24 68 36 63 47 C61 52 57 55 56 58 H44 C43 55 39 52 37 47 C32 36 38 24 50 14 Z",
      "M36 58 Q36 54 40 54 H60 Q64 54 64 58 V60 H36 Z",
      "M50 8 A6 6 0 1 1 49.99 8 Z",
      FOOT,
    ],
    lines: ["M44 30 L56 42"],
    dots: [],
  },
  // Rook
  4: {
    body: [
      "M34 76 L37 48 H63 L66 76 Z",
      "M30 48 H70 V40 L67 36 V22 H58 V28 H54 V22 H46 V28 H42 V22 H33 V36 L30 40 Z",
      "M32 80 H68 V76 H32 Z",
      FOOT,
    ],
    lines: ["M36 48 H64", "M40 60 H60"],
    dots: [],
  },
  // Queen
  5: {
    body: [
      "M34 76 C36 66 38 60 36 52 H64 C62 60 64 66 66 76 Z",
      "M30 56 L20 28 L36 42 L38 20 L46 40 L50 16 L54 40 L62 20 L64 42 L80 28 L70 56 Z",
      "M30 56 H70 V62 H30 Z",
      FOOT,
    ],
    lines: ["M40 66 Q50 69 60 66"],
    dots: [[20, 26, 4], [38, 17, 4], [50, 13, 4], [62, 17, 4], [80, 26, 4]],
  },
  // King
  6: {
    body: [
      "M34 76 C36 66 38 60 36 52 H64 C62 60 64 66 66 76 Z",
      "M30 56 C26 42 34 30 50 30 C66 30 74 42 70 56 Z",
      "M30 56 H70 V62 H30 Z",
      "M45 6 H55 V13 H62 V21 H55 V28 H45 V21 H38 V13 H45 Z",
      FOOT,
    ],
    lines: ["M40 66 Q50 69 60 66", "M42 38 Q50 34 58 38"],
    dots: [],
  },
};
