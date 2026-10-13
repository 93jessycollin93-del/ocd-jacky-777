// Chess sounds, synthesised from the shared sfx kit: a wooden tap for moves, a sharper one for captures.
import { melody, noise, tone } from "../../kit/sfx";

export const moveSound = () => {
  noise(0.05, 0.22, { freq: 700 });
  tone(190, 0.07, "triangle", 0.16, { slide: 130 });
};

export const captureSound = () => {
  noise(0.1, 0.38, { freq: 1500, sweep: 400 });
  tone(150, 0.12, "triangle", 0.2, { slide: 70 });
  tone(300, 0.05, "square", 0.06);
};

export const castleSound = () => {
  moveSound();
  tone(210, 0.07, "triangle", 0.14, { slide: 140, delay: 0.1 });
  noise(0.05, 0.2, { freq: 700, delay: 0.1 });
};

export const checkSound = () => {
  tone(880, 0.09, "square", 0.08);
  tone(1175, 0.16, "square", 0.08, { delay: 0.08 });
};

export const promoteSound = () => melody([[523, 0.06], [659, 0.06], [784, 0.06], [1046, 0.14]], "triangle", 0.12);

export const illegalSound = () => tone(140, 0.12, "square", 0.08);

export const winSound = () => melody([[523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.12], [1318, 0.35]], "triangle", 0.13);
export const loseSound = () => melody([[392, 0.18], [330, 0.18], [277, 0.18], [196, 0.5]], "triangle", 0.14);
export const drawSound = () => melody([[440, 0.16], [440, 0.16], [330, 0.4]], "triangle", 0.12);
