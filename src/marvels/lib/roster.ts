import { Racer } from "./raceEngine";

const TRAITS = [
  "Turbo Flagellum",
  "Iron Membrane",
  "Quantum Tail",
  "Neon Mitochondria",
  "Hyperdrive Helix",
  "Stealth Cytoplasm",
  "Plasma Booster",
  "Echo Navigator",
];

const PALETTE: { body: string; tail: string }[] = [
  { body: "168 90% 55%", tail: "190 90% 60%" },
  { body: "315 85% 62%", tail: "330 85% 70%" },
  { body: "265 85% 66%", tail: "280 85% 72%" },
  { body: "45 95% 60%", tail: "30 95% 60%" },
  { body: "0 85% 62%", tail: "12 90% 60%" },
  { body: "140 80% 55%", tail: "120 80% 60%" },
];

const NAMES = [
  "Usain Boltzmann",
  "Speedy Gamete",
  "Flagella Fierce",
  "Tailspin Tycoon",
  "Nano Nemo",
  "Sir Swimsalot",
  "Velocity Vex",
  "Cell Phelps",
  "Zoomocyte",
  "Captain Squiggle",
];

export function randomAttrs() {
  const r = () => 40 + Math.floor(Math.random() * 60);
  return { speed: r(), stamina: r(), navigation: r(), luck: r() };
}

export function buildRoster(count = 6): Racer[] {
  const names = [...NAMES].sort(() => Math.random() - 0.5);
  return Array.from({ length: count }, (_, i) => {
    const pal = PALETTE[i % PALETTE.length];
    return {
      id: `racer-${i}`,
      name: names[i],
      color: pal.body,
      tailColor: pal.tail,
      attrs: randomAttrs(),
    };
  });
}

export { TRAITS };
