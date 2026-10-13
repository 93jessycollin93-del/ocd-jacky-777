// Checkers sounds from the shared sfx kit: a tap for steps, a hop for jumps, a crack for captures.
import { melody, noise, tone } from "../../kit/sfx";

export const stepSound = () => {
  noise(0.04, 0.2, { freq: 800 });
  tone(240, 0.06, "triangle", 0.15, { slide: 170 });
};

export const hopSound = (n = 0) => tone(330 + n * 70, 0.12, "triangle", 0.15, { slide: 520 + n * 70 });

export const captureSound = () => {
  noise(0.1, 0.35, { freq: 1800, sweep: 500 });
  tone(180, 0.1, "square", 0.08, { slide: 80 });
};

export const crownSound = () => melody([[523, 0.07], [659, 0.07], [784, 0.07], [1046, 0.16]], "square", 0.1);
export const selectSound = () => tone(760, 0.04, "square", 0.06);
export const blockedSound = () => tone(150, 0.14, "square", 0.09);
export const winSound = () => melody([[523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.12], [1318, 0.35]], "triangle", 0.13);
export const loseSound = () => melody([[392, 0.18], [330, 0.18], [277, 0.18], [196, 0.5]], "triangle", 0.14);
export const drawSound = () => melody([[440, 0.16], [440, 0.16], [330, 0.4]], "triangle", 0.12);
