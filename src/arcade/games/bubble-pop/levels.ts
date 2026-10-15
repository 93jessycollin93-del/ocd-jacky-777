// Bubble Pop's ten handmade levels. Colours: r red, o orange, y yellow, g green, b blue, p purple. Rows
// alternate 11 and 10 bubbles wide (the short rows sit half a bubble in); "." is an empty cell.
export interface LevelDef {
  name: string;
  /** Misses in a row before the ceiling drops one row; 0 means it never does. */
  missesPerDrop: number;
  rows: string[];
}

export const COLOR_LETTERS = "roygbp";

export const LEVELS: LevelDef[] = [
  {
    name: "First Pop", missesPerDrop: 0,
    rows: ["rrrrgggbbbb", "rrrgggbbbb", "rrggggbbbbb", ".rgggbbbb.", "..gggbbb..."],
  },
  {
    name: "Bands", missesPerDrop: 0,
    rows: ["rrroooyyygg", "rrooyyyggg", "rrroooyyygg", "rrooyyyggg", "rrroooyyygg", "rrooyyyggg"],
  },
  {
    name: "Pyramid", missesPerDrop: 8,
    rows: ["rrggbbyyrrg", "rgggbbyyrr", ".rggbbyyrr.", "..ggbbyyr.", "...gbbyyr..", "....bbyy..", ".....by...."],
  },
  {
    name: "Checkers", missesPerDrop: 8,
    rows: ["rrggbbrrggb", "ggbbrrggbb", "bbrrggbbrrg", "rrggbbrrgg", "ggbbrrggbbr", "bbrrggbbrr"],
  },
  {
    name: "Heart", missesPerDrop: 7,
    rows: [".rrr...rrr.", "rooorrooor", "rooyyyyyoor", ".rooyyyoor", "..rooyyoor.", "...rooooor", ".....rpr..."],
  },
  {
    name: "Diamond", missesPerDrop: 7,
    rows: [
      "...rogor...", "..ogbbgo..", ".rgbyyybgr.", "rgbyyyybgr", "orgbyyybgro", "rgbyyyybgr", ".rgbyyybgr.", "..ogbbgo..", "...rogor...",
    ],
  },
  {
    name: "Hanging Gardens", missesPerDrop: 6,
    rows: ["rrgobbbyypp", ".r...b..y.", "rrr.ooo.bbb", "yyp.ggg.pp", ".yy..gg..pp"],
  },
  {
    name: "Zigzag", missesPerDrop: 6,
    rows: ["rrooggyybbr", "rooggyybbr", "ooggyybbrro", "oggyybbrro", "oggyybbrroo", "ooggyybbrr", "rooggyybbrr"],
  },
  {
    name: "Crossroads", missesPerDrop: 5,
    rows: [
      "....ggy....", "...gyyb...", "....bbr....", "yybbrroogg", "bbrrooggyyb", "rrooggyybb", "....yyb....", "...ybbr...", "....rro....",
    ],
  },
  {
    name: "Grand Finale", missesPerDrop: 5,
    rows: ["oooyobpprrb", "ogbyyboprr", "yggypbyybbg", "yygrppbbgg", "gggorggpppo", "ooobbbgggy", "obbbyyyobyy", "ggobppoooy"],
  },
];
