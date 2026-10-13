// Sling Siege sound effects built from the kit's tone() and noise(): thuds, cracks and booms that scale
// with how hard something hit. Hits are rate limited so a collapsing tower is a rumble, not a buzz.
import { noise, play, tone } from "../../kit/sfx";
import type { MatId } from "./materials";

let lastHit = 0;
let lastBreak = 0;
let lastStretch = 0;
const now = () => performance.now() / 1000;

export function soundHit(mat: MatId | "critter" | "grumbler" | "ground" | undefined, v: number) {
  const t = now();
  if (t - lastHit < 0.045) return;
  lastHit = t;
  const k = Math.min(1, v / 14);
  const j = 0.9 + Math.random() * 0.2;
  switch (mat) {
    case "wood":
      noise(0.09, 0.1 + 0.25 * k, { freq: 900 });
      tone(170 * j, 0.1, "triangle", 0.08 + 0.14 * k, { slide: 90 });
      break;
    case "stone":
    case "rock":
      noise(0.07, 0.1 + 0.25 * k, { type: "highpass", freq: 1800 });
      tone(95 * j, 0.14, "sine", 0.1 + 0.2 * k, { slide: 55 });
      break;
    case "glass":
      tone(2300 * j, 0.06, "triangle", 0.05 + 0.1 * k);
      tone(3100 * j, 0.05, "triangle", 0.04 + 0.08 * k, { delay: 0.02 });
      break;
    case "ice":
      tone(1500 * j, 0.09, "sine", 0.06 + 0.1 * k, { slide: 900 });
      noise(0.05, 0.08, { type: "highpass", freq: 3500 });
      break;
    case "tnt":
      noise(0.08, 0.2 * k + 0.05, { freq: 600 });
      tone(120 * j, 0.1, "square", 0.08 * k + 0.03, { slide: 70 });
      break;
    case "grumbler":
      tone(260 * j, 0.14, "sine", 0.1 + 0.15 * k, { slide: 480 * j });
      break;
    default:
      noise(0.06, 0.08 + 0.15 * k, { freq: 500 });
      tone(120 * j, 0.08, "sine", 0.08 + 0.1 * k, { slide: 70 });
  }
}

export function soundBreak(mat: MatId | undefined) {
  const t = now();
  if (t - lastBreak < 0.05) return;
  lastBreak = t;
  switch (mat) {
    case "glass":
      noise(0.25, 0.22, { type: "highpass", freq: 5000 });
      tone(2600, 0.1, "triangle", 0.09, { slide: 1200 });
      tone(3400, 0.12, "triangle", 0.07, { delay: 0.03, slide: 1500 });
      tone(1900, 0.14, "triangle", 0.06, { delay: 0.06, slide: 900 });
      break;
    case "ice":
      noise(0.22, 0.2, { type: "bandpass", freq: 3000, q: 1.5 });
      tone(1800, 0.2, "sine", 0.1, { slide: 600 });
      break;
    case "stone":
      noise(0.35, 0.34, { freq: 700, sweep: 120 });
      tone(80, 0.3, "sine", 0.28, { slide: 40 });
      break;
    case "tnt":
      break;
    default:
      noise(0.22, 0.3, { type: "bandpass", freq: 1300, sweep: 400, q: 1 });
      tone(200, 0.12, "square", 0.07, { slide: 70 });
  }
}

export function soundKill() {
  tone(520, 0.22, "sine", 0.2, { slide: 160 });
  tone(780, 0.1, "triangle", 0.1, { delay: 0.05, slide: 1100 });
}

export function soundLaunch(power: number) {
  noise(0.2, 0.18, { type: "bandpass", freq: 500, sweep: 2600, q: 1.1 });
  tone(240 + 200 * power, 0.18, "triangle", 0.14, { slide: 120 });
}

/** A rubbery creak as the sling is drawn back. */
export function soundStretch(pull: number) {
  const t = now();
  if (t - lastStretch < 0.07) return;
  lastStretch = t;
  tone(180 + pull * 160, 0.05, "triangle", 0.05);
}

export function soundAbility(kind: string) {
  if (kind === "splitter") {
    tone(660, 0.1, "square", 0.08, { slide: 990 });
    tone(880, 0.1, "square", 0.08, { delay: 0.05, slide: 1320 });
  } else if (kind === "dasher") {
    noise(0.28, 0.3, { type: "bandpass", freq: 900, sweep: 5000, q: 1.4 });
    tone(500, 0.2, "sawtooth", 0.08, { slide: 1500 });
  } else if (kind === "heavy") {
    tone(300, 0.25, "sawtooth", 0.14, { slide: 70 });
    noise(0.25, 0.2, { freq: 800, sweep: 150 });
  } else play("blip", 1.4);
}

export function soundBoom() {
  play("explode");
}

export function soundBonus(i: number) {
  play("coin", 1 + i * 0.12);
}

export function soundStar(i: number) {
  tone(660 + i * 220, 0.18, "triangle", 0.16, { slide: 880 + i * 260 });
  tone(990 + i * 330, 0.3, "sine", 0.1, { delay: 0.08 });
}
