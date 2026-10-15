// Solitaire sounds from the shared sfx kit: card flips, slaps, a foundation chime and a win fanfare.
import { melody, noise, tone } from "../../kit/sfx";

export const dealSound = () => noise(0.05, 0.14, { type: "bandpass", freq: 2600, q: 1.6 });
export const flipSound = () => {
  noise(0.06, 0.16, { type: "bandpass", freq: 3000, sweep: 1500, q: 1.4 });
};
export const placeSound = () => {
  noise(0.045, 0.2, { freq: 1100 });
  tone(210, 0.05, "triangle", 0.1, { slide: 150 });
};
export const foundationSound = (n: number) => {
  placeSound();
  tone(660 + n * 40, 0.12, "triangle", 0.1, { delay: 0.04 });
  tone(990 + n * 60, 0.18, "sine", 0.08, { delay: 0.1 });
};
export const recycleSound = () => noise(0.25, 0.18, { type: "bandpass", freq: 500, sweep: 2400, q: 1 });
export const errorSound = () => tone(150, 0.12, "square", 0.08);
export const undoSound = () => tone(420, 0.1, "triangle", 0.1, { slide: 260 });
export const winSound = () => melody([[523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.12], [784, 0.1], [1046, 0.1], [1318, 0.4]], "triangle", 0.13);
export const bounceSound = (k: number) => tone(260 + k * 140, 0.05, "sine", 0.05);
