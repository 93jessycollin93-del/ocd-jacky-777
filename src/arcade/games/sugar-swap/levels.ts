// Sugar Swap's levels: original layouts. Layout legend, one string per row:
//   o  a plain cell     .  no cell (a gap in the board)
//   f  frosting (1 layer)     F  thick frosting (2 layers)
//   i  starts with an ingredient
export type Goal = { type: "score"; target: number } | { type: "frosting" } | { type: "ingredients"; count: number };

export interface LevelDef {
  name: string;
  moves: number;
  /** How many sweet colours drop (4–6; more is harder). */
  colors: number;
  goal: Goal;
  /** Score for 1, 2 and 3 stars (1 star also needs the goal). */
  stars: [number, number, number];
  layout: string[];
  /** Most ingredients on the board at once. */
  maxIngredients?: number;
}

const FULL = ["oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo"];

export const LEVELS: LevelDef[] = [
  { name: "First Bite", moves: 18, colors: 5, goal: { type: "score", target: 3000 }, stars: [3000, 5000, 7000], layout: FULL },
  {
    name: "Rounded Tray", moves: 18, colors: 5, goal: { type: "score", target: 4000 }, stars: [4000, 6500, 9000],
    layout: [".oooooo.", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", ".oooooo."],
  },
  {
    name: "Icing Square", moves: 22, colors: 5, goal: { type: "frosting" }, stars: [1, 6000, 9000],
    layout: ["oooooooo", "oooooooo", "ooffffoo", "ooffffoo", "ooffffoo", "ooffffoo", "oooooooo", "oooooooo"],
  },
  {
    name: "Nut Drop", moves: 20, colors: 5, goal: { type: "ingredients", count: 2 }, stars: [1, 5000, 8000],
    layout: ["oooioooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo"],
  },
  {
    name: "Hourglass", moves: 20, colors: 5, goal: { type: "score", target: 4500 }, stars: [4500, 7000, 10000],
    layout: ["oooooooo", ".oooooo.", "..oooo..", "..oooo..", "..oooo..", "..oooo..", ".oooooo.", "oooooooo"],
  },
  {
    name: "Picture Frame", moves: 26, colors: 5, goal: { type: "frosting" }, stars: [1, 8000, 12000],
    layout: ["ffffffff", "foooooof", "foooooof", "foooooof", "foooooof", "foooooof", "foooooof", "ffffffff"],
  },
  {
    name: "Button Box", moves: 24, colors: 5, goal: { type: "ingredients", count: 3 }, stars: [1, 7000, 11000],
    layout: ["ooiooooo", "oooooooo", "oo.oo.oo", "oooooooo", "oooooooo", "oo.oo.oo", "oooooooo", "oooooooo"],
  },
  { name: "Rainbow Rush", moves: 20, colors: 6, goal: { type: "score", target: 4000 }, stars: [4000, 6500, 9000], layout: FULL },
  {
    name: "Iced Cross", moves: 24, colors: 5, goal: { type: "frosting" }, stars: [1, 9000, 13000],
    layout: ["oooFFooo", "oooFFooo", "oooFFooo", "FFFFFFFF", "FFFFFFFF", "oooFFooo", "oooFFooo", "oooFFooo"],
  },
  {
    name: "Twin Chutes", moves: 26, colors: 5, goal: { type: "ingredients", count: 4 }, stars: [1, 9000, 13000],
    layout: ["ooi..ooo", "ooo..ooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "ooo..ooo", "ooo..ooo"],
  },
  {
    name: "Checkerboard", moves: 24, colors: 5, goal: { type: "frosting" }, stars: [1, 9000, 13000],
    layout: ["fofofofo", "ofofofof", "fofofofo", "ofofofof", "fofofofo", "ofofofof", "fofofofo", "ofofofof"],
  },
  {
    name: "Sweetheart", moves: 22, colors: 5, goal: { type: "score", target: 6000 }, stars: [6000, 9000, 12000],
    layout: [".oo..oo.", "oooooooo", "oooooooo", "oooooooo", "oooooooo", ".oooooo.", "..oooo..", "...oo..."],
  },
  {
    name: "Spice Rack", moves: 28, colors: 6, goal: { type: "ingredients", count: 3 }, stars: [1, 8000, 12000],
    layout: ["ooooiooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo"],
  },
  {
    name: "Layer Cake", moves: 26, colors: 5, goal: { type: "frosting" }, stars: [1, 11000, 16000],
    layout: ["oooooooo", "oooooooo", "oooooooo", "oooooooo", "FFFFFFFF", "FFFFFFFF", "ffffffff", "ffffffff"],
  },
  {
    name: "Donut", moves: 22, colors: 6, goal: { type: "score", target: 6000 }, stars: [6000, 9000, 12500],
    layout: ["oooooooo", "oooooooo", "oooooooo", "ooo..ooo", "ooo..ooo", "oooooooo", "oooooooo", "oooooooo"],
  },
  {
    name: "Candy Stripes", moves: 26, colors: 5, goal: { type: "frosting" }, stars: [1, 10000, 15000],
    layout: ["Fooo Fooo".replace(" ", ""), "oFoooFoo", "ooFoooFo", "oooFoooF", "Fooo" + "Fooo", "oFoooFoo", "ooFoooFo", "oooFoooF"],
  },
  {
    name: "Narrow Pass", moves: 28, colors: 5, goal: { type: "ingredients", count: 4 }, stars: [1, 10000, 14000],
    layout: ["ooooiooo", ".oooooo.", "..oooo..", "..oooo..", "..oooo..", "..oooo..", ".oooooo.", "oooooooo"],
  },
  {
    name: "Frosted Heart", moves: 26, colors: 5, goal: { type: "frosting" }, stars: [1, 10000, 15000],
    layout: [".ff..ff.", "ffffffff", "fFFffFFf", "fFFFFFFf", "ffFFFFff", ".ffFFff.", "..ffff..", "...ff..."],
  },
  { name: "Sugar Sprint", moves: 16, colors: 6, goal: { type: "score", target: 5000 }, stars: [5000, 8000, 11000], layout: FULL },
  {
    name: "Islands", moves: 30, colors: 6, goal: { type: "ingredients", count: 4 }, stars: [1, 11000, 15000],
    layout: ["oioooooo", "oooooooo", "oo.oo.oo", "oooooooo", "oooooooo", "oo.oo.oo", "oooooooo", "oooooooo"],
  },
  {
    name: "Glazed Over", moves: 30, colors: 5, goal: { type: "frosting" }, stars: [1, 13000, 19000],
    layout: ["ffffffff", "ffffffff", "ffffffff", "ffffffff", "ffffffff", "ffffffff", "ffffffff", "ffffffff"],
  },
  {
    name: "Long Way Down", moves: 30, colors: 6, goal: { type: "ingredients", count: 5 }, stars: [1, 12000, 17000],
    layout: ["oooiiooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo", "oooooooo"],
    maxIngredients: 3,
  },
  {
    name: "Crossroads", moves: 30, colors: 6, goal: { type: "frosting" }, stars: [1, 12000, 18000],
    layout: ["FooooooF", "oFooooFo", "ooFooFoo", "oooFFooo", "oooFFooo", "ooFooFoo", "oFooooFo", "FooooooF"],
  },
  {
    name: "Grand Finale", moves: 26, colors: 6, goal: { type: "score", target: 9000 }, stars: [9000, 13000, 18000],
    layout: [".oooooo.", "oooooooo", "oooooooo", "ooo..ooo", "ooo..ooo", "oooooooo", "oooooooo", ".oooooo."],
  },
];
