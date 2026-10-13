// Connect-four sounds from the shared sfx kit: a swoosh as the disc drops, a click-clack on landing.
import { melody, noise, tone } from "../../kit/sfx";

export const dropSound = () => noise(0.16, 0.12, { type: "bandpass", freq: 500, sweep: 1400, q: 1.1 });

export const landSound = (strength: number, col: number) => {
  const k = Math.min(1, strength);
  noise(0.06, 0.12 + 0.2 * k, { freq: 1400, sweep: 500 });
  tone(300 + col * 22, 0.08, "triangle", 0.06 + 0.12 * k, { slide: 190 + col * 12 });
};

export const tickSound = () => tone(1500, 0.02, "square", 0.025);
export const poofSound = () => noise(0.12, 0.15, { type: "bandpass", freq: 900, q: 0.8 });
export const winSound = () => melody([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.1], [784, 0.08], [1046, 0.08], [1318, 0.35]], "triangle", 0.12);
export const loseSound = () => melody([[392, 0.18], [330, 0.18], [277, 0.18], [196, 0.5]], "triangle", 0.14);
export const drawSound = () => melody([[440, 0.16], [440, 0.16], [330, 0.4]], "triangle", 0.12);
