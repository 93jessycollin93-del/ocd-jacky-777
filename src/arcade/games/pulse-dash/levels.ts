// The three handmade levels. They are written in beats so every obstacle lines up with the music: one beat is four
// blocks at normal speed, a jump lasts exactly one beat, and "tap on beat b" is the best moment to press for an
// obstacle placed with the same beat number. (The test suite runs a bot through each level to prove it can be won.)
import { BLOCKS_PER_BEAT, CEIL, type Level, type Obj, type Theme } from "./logic";

class Builder {
  objects: Obj[] = [];
  zones: { beat: number; m: number }[] = [{ beat: 0, m: 1 }];
  constructor(readonly bpm: number) {}

  /** Where the left edge of the cube is (in blocks) at a given beat, following the speed zones. */
  x(beat: number): number {
    let x = 0;
    for (let i = 0; i < this.zones.length; i++) {
      const a = this.zones[i].beat;
      const b = i + 1 < this.zones.length ? this.zones[i + 1].beat : Infinity;
      if (beat <= a) break;
      x += (Math.min(beat, b) - a) * BLOCKS_PER_BEAT * this.zones[i].m;
    }
    return x;
  }

  /** `n` spikes side by side, centred so that a jump started ("tapped") on `tap` peaks right over their middle. */
  spikes(tap: number, n = 1, y = 0, down = false) {
    const centre = this.x(tap + 0.5);
    for (let i = 0; i < n; i++) this.objects.push({ t: "spike", x: centre + 0.5 - n / 2 + i, y, down });
  }
  /** A solid block whose left edge is where the cube's left edge is at `beat`. */
  block(beat: number, w: number, h: number, y = 0) {
    this.objects.push({ t: "block", x: this.x(beat), y, w, h });
  }
  /** A low ceiling (a tunnel) `w` blocks long: you have to stay on the floor underneath, so no jumping inside. */
  tunnel(beat: number, w: number) {
    this.objects.push({ t: "block", x: this.x(beat), y: 2, w, h: CEIL - 2 });
  }
  pad(beat: number, y = 0, down = false) {
    this.objects.push({ t: "pad", x: this.x(beat), y, down });
  }
  orb(beat: number, y: number) {
    this.objects.push({ t: "orb", x: this.x(beat), y });
  }
  /** A gravity portal the cube passes through at `beat` (dir 1 = normal gravity, -1 = upside down). */
  grav(beat: number, dir: 1 | -1, y = 0) {
    this.objects.push({ t: "grav", x: this.x(beat) + 1, y, dir });
  }
  /** A speed portal: from `beat` on the level runs at `m` times normal speed. */
  speed(beat: number, m: number) {
    this.objects.push({ t: "speed", x: this.x(beat) + 1, m });
    this.zones.push({ beat, m });
  }

  finish(name: string, id: string, difficulty: Level["difficulty"], endBeats: number, theme: Theme): Level {
    const objects = this.objects.slice().sort((a, b) => a.x - b.x);
    return { id, name, difficulty, bpm: this.bpm, endX: this.x(endBeats), endBeats, objects, zones: this.zones, theme };
  }
}

// ---------------------------------------------------------------- level 1: easy

function level1(): Level {
  const b = new Builder(120);
  // Bars 0-1: a gentle run-in. Then single spikes on the beat.
  for (const t of [8, 12, 16, 18, 20]) b.spikes(t);
  b.spikes(22.5); // the first one off the beat
  b.spikes(24);
  b.spikes(26, 2);
  // A low tunnel: stay on the floor (do not hold the button here).
  b.tunnel(29.5, 8);
  b.spikes(33);
  b.spikes(35);
  b.spikes(37, 2);
  b.spikes(39.5);
  // Hop up onto low blocks and off again.
  b.block(41.5, 4, 1);
  b.spikes(44);
  b.block(46.5, 4, 1);
  b.spikes(49);
  b.block(51.5, 4, 1);
  b.block(55.5, 4, 1);
  // Hold the button: a spike on every beat, then let go for the tunnel.
  for (const t of [58, 59, 60, 61]) b.spikes(t);
  b.tunnel(63.5, 8);
  b.spikes(66);
  b.spikes(68, 2);
  b.spikes(70.5);
  // A jump pad throws you up onto a tower.
  b.pad(75, 0);
  b.block(75.75, 5, 3);
  b.spikes(78);
  b.pad(82, 0);
  b.block(82.75, 5, 3);
  b.spikes(85);
  b.spikes(87);
  // Speed portal: a faster stretch, still one spike per jump.
  b.speed(89, 1.25);
  b.spikes(91);
  b.spikes(93);
  b.spikes(95, 2);
  b.spikes(97.5);
  b.tunnel(99.5, 10);
  b.spikes(102);
  b.speed(104, 1);
  // Finale: everything so far.
  b.block(105.5, 4, 1);
  b.spikes(108);
  b.spikes(110, 2);
  b.spikes(112);
  b.spikes(113);
  b.spikes(114);
  b.tunnel(116.5, 8);
  b.pad(120, 0);
  b.block(120.75, 5, 3);
  b.spikes(123);
  b.block(125.5, 4, 1);
  b.spikes(128);
  b.spikes(130, 2);
  b.spikes(132.5);
  b.spikes(134);
  b.spikes(135);
  b.spikes(136);
  return b.finish("Neon Start", "neon-start", "Easy", 140, {
    top: "#0b1a3a", bottom: "#17387a", accent: "#22d3ee", accent2: "#a5f3fc", spike: "#f0abfc",
  });
}

// ---------------------------------------------------------------- level 2: medium

function level2(): Level {
  const b = new Builder(132);
  for (const t of [8, 10, 12, 14]) b.spikes(t);
  b.spikes(16, 2);
  b.spikes(18.5);
  b.spikes(20, 2);
  b.spikes(22);
  // Syncopated: taps on the off-beat.
  b.spikes(24.5);
  b.spikes(26.5);
  b.spikes(28, 2);
  b.tunnel(31.5, 8);
  // A staircase of blocks.
  b.block(34.5, 4, 1);
  b.block(35.5, 4, 2);
  b.spikes(38);
  b.block(41.5, 4, 1);
  b.spikes(43.5, 2);
  b.spikes(46);
  b.spikes(47);
  b.spikes(48);
  b.tunnel(50.5, 8);
  // Orbs: a long spike field you cross with a mid-air tap.
  b.spikes(53, 5);
  b.orb(53.5, 2.2);
  b.spikes(57);
  b.spikes(59, 5);
  b.orb(59.5, 2.2);
  b.spikes(63);
  b.spikes(65, 2);
  // Pads.
  b.pad(68, 0);
  b.block(68.75, 5, 3);
  b.spikes(71);
  b.pad(74, 0);
  b.block(74.75, 5, 3);
  b.block(78, 3, 1);
  b.spikes(80);
  // Slow-down and speed-up portals.
  b.speed(83, 0.75);
  b.spikes(85);
  b.spikes(86);
  b.spikes(87, 2);
  b.tunnel(89.5, 6);
  b.spikes(91.5);
  b.speed(93, 1.25);
  b.spikes(95);
  b.spikes(97);
  b.spikes(99, 2);
  b.spikes(101.5);
  b.spikes(103, 3);
  b.speed(106, 1);
  // Orb chain over spikes.
  b.spikes(108, 4);
  b.orb(108.5, 2.2);
  b.spikes(112, 4);
  b.orb(112.5, 2.2);
  b.spikes(116);
  b.spikes(117);
  b.spikes(118);
  b.tunnel(120.5, 8);
  b.spikes(123, 2);
  b.block(125.5, 4, 1);
  b.block(126.5, 4, 2);
  b.spikes(129);
  b.pad(132, 0);
  b.block(132.75, 5, 3);
  b.spikes(135);
  b.spikes(137, 2);
  b.spikes(139.5);
  b.spikes(141);
  b.spikes(142);
  b.spikes(144, 3);
  b.tunnel(147.5, 8);
  b.spikes(150, 2);
  b.spikes(152);
  b.spikes(153);
  b.spikes(154);
  b.spikes(156, 5);
  b.orb(156.5, 2.2);
  b.spikes(160);
  b.spikes(162, 2);
  b.pad(165, 0);
  b.block(165.75, 5, 3);
  b.spikes(168);
  b.spikes(170, 2);
  b.spikes(172.5);
  return b.finish("Prism Run", "prism-run", "Medium", 176, {
    top: "#2a0b3a", bottom: "#6b1f8f", accent: "#f472b6", accent2: "#fbcfe8", spike: "#fde047",
  });
}

// ---------------------------------------------------------------- level 3: hard

function level3(): Level {
  const b = new Builder(144);
  for (const t of [8, 10, 12, 13.5]) b.spikes(t);
  b.spikes(15, 2);
  b.spikes(17, 2);
  b.spikes(19, 3);
  b.spikes(22);
  b.spikes(23);
  b.spikes(24);
  b.tunnel(26.5, 6);
  // Orbs and spike fields.
  b.spikes(29, 5);
  b.orb(29.5, 2.2);
  b.spikes(33, 5);
  b.orb(33.5, 2.2);
  b.spikes(37, 2);
  b.pad(40, 0);
  b.block(40.75, 5, 3);
  b.spikes(43, 2);
  b.block(46.5, 4, 1);
  b.block(47.5, 4, 2);
  b.spikes(50);
  b.spikes(51);
  b.spikes(52);
  // Faster section.
  b.speed(54, 1.25);
  b.spikes(56);
  b.spikes(57.5, 2);
  b.tunnel(60, 10);
  b.spikes(62.5);
  b.spikes(64, 3);
  b.spikes(66);
  b.spikes(67);
  b.speed(69, 1);
  // Gravity: run along the ceiling.
  b.spikes(71, 2);
  b.grav(73, -1);
  b.spikes(76, 1, CEIL - 1, true);
  b.spikes(78, 1, CEIL - 1, true);
  b.spikes(80, 2, CEIL - 1, true);
  b.spikes(82, 1, CEIL - 1, true);
  b.spikes(83, 1, CEIL - 1, true);
  b.spikes(85, 2, CEIL - 1, true);
  b.spikes(87, 1, CEIL - 1, true);
  b.grav(89, 1, CEIL - 3);
  b.spikes(92, 2);
  b.spikes(94);
  b.spikes(95);
  b.pad(97, 0);
  b.block(97.75, 5, 3);
  b.spikes(100, 3);
  b.block(103.5, 4, 1);
  b.spikes(106);
  b.spikes(108, 2);
  b.spikes(110, 5);
  b.orb(110.5, 2.2);
  b.spikes(114, 5);
  b.orb(114.5, 2.2);
  b.spikes(118);
  b.spikes(119);
  b.spikes(120);
  b.tunnel(122.5, 6);
  b.speed(124, 1.25);
  b.spikes(126, 2);
  b.spikes(128);
  b.spikes(129);
  b.spikes(131, 2);
  b.spikes(133, 3);
  b.spikes(136);
  b.spikes(137);
  b.speed(139, 1);
  b.grav(140, -1);
  b.spikes(142, 2, CEIL - 1, true);
  b.spikes(144, 1, CEIL - 1, true);
  b.spikes(145, 1, CEIL - 1, true);
  b.spikes(147, 3, CEIL - 1, true);
  b.spikes(150, 1, CEIL - 1, true);
  b.grav(152, 1, CEIL - 3);
  b.spikes(155, 2);
  b.spikes(157);
  b.spikes(158);
  b.spikes(160, 3);
  b.pad(163, 0);
  b.block(163.75, 5, 3);
  b.spikes(166, 2);
  b.spikes(168);
  b.spikes(169);
  b.spikes(170);
  b.spikes(172, 5);
  b.orb(172.5, 2.2);
  b.spikes(176, 5);
  b.orb(176.5, 2.2);
  b.spikes(180, 2);
  b.spikes(182);
  b.spikes(183);
  b.spikes(184);
  b.tunnel(186.5, 6);
  b.spikes(189, 3);
  b.spikes(192, 2);
  b.spikes(194);
  b.spikes(195);
  b.spikes(196);
  return b.finish("Hyper Drift", "hyper-drift", "Hard", 200, {
    top: "#1a0a0a", bottom: "#7a1d12", accent: "#fb923c", accent2: "#fed7aa", spike: "#fde047",
  });
}

export const LEVELS: Level[] = [level1(), level2(), level3()];
