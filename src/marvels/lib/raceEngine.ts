// ============================================================
// Sperm Racing — Race Engine
// Deterministic-ish simulation with speed, stamina, navigation
// and randomness attributes.
// ============================================================

export interface RacerAttributes {
  speed: number; // 1-100 base velocity
  stamina: number; // 1-100 resistance to fatigue
  navigation: number; // 1-100 ability to stay on optimal path
  luck: number; // 1-100 randomness amplitude
}

export interface Racer {
  id: string;
  name: string;
  color: string; // hsl color string
  tailColor: string;
  attrs: RacerAttributes;
}

export interface RacerState {
  racer: Racer;
  progress: number; // 0-100 along the course
  lane: number; // vertical offset -1..1 for wandering
  energy: number; // remaining stamina pool 0-100
  velocity: number;
  finished: boolean;
  finishTick: number | null;
  rank: number | null;
}

export interface CourseSegment {
  // multiplier on difficulty for this stretch
  turbulence: number;
}

export interface Course {
  seed: number;
  length: number; // ticks-ish
  segments: CourseSegment[];
  name: string;
}

// Seeded PRNG (mulberry32)
export function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COURSE_NAMES = [
  "Capillary Canyon",
  "Fallopian Frontier",
  "Membrane Maelstrom",
  "Cytoplasm Circuit",
  "Nucleus Nexus",
  "Plasma Plunge",
];

export function generateCourse(seed: number): Course {
  const rng = makeRng(seed);
  const name = COURSE_NAMES[Math.floor(rng() * COURSE_NAMES.length)];
  const segCount = 8;
  const segments: CourseSegment[] = Array.from({ length: segCount }, () => ({
    turbulence: 0.4 + rng() * 1.4,
  }));
  return { seed, length: 100, segments, name };
}

export interface RaceResult {
  states: RacerState[];
  // full history for replay: array per tick of {id, progress, lane}
  frames: { progress: number; lane: number }[][];
  totalTicks: number;
  winnerId: string;
}

export function simulateRace(racers: Racer[], course: Course): RaceResult {
  const rng = makeRng(course.seed ^ 0x9e3779b9);
  const states: RacerState[] = racers.map((r) => ({
    racer: r,
    progress: 0,
    lane: 0,
    energy: 50 + r.attrs.stamina / 2,
    velocity: 0,
    finished: false,
    finishTick: null,
    rank: null,
  }));

  const frames: { progress: number; lane: number }[][] = [];
  let tick = 0;
  let finishedCount = 0;
  let rankCounter = 1;
  const maxTicks = 2000;

  while (finishedCount < racers.length && tick < maxTicks) {
    for (const st of states) {
      if (st.finished) continue;
      const a = st.racer.attrs;
      const segIdx = Math.min(
        course.segments.length - 1,
        Math.floor((st.progress / 100) * course.segments.length)
      );
      const turb = course.segments[segIdx].turbulence;

      // fatigue reduces effective speed as energy depletes
      const fatigue = Math.max(0.45, st.energy / 100 + 0.2);
      // navigation reduces turbulence penalty
      const navFactor = 1 - (turb - 0.4) * (1 - a.navigation / 130) * 0.18;
      // randomness
      const chaos = (rng() - 0.5) * (a.luck / 100) * 2.2;

      const base = (a.speed / 100) * 1.5;
      st.velocity = Math.max(0.05, base * fatigue * navFactor + chaos * 0.4);
      st.progress += st.velocity;

      // wandering lane based on navigation (better nav = straighter)
      const wander = (rng() - 0.5) * (1 - a.navigation / 140) * 0.35 * turb;
      st.lane = Math.max(-1, Math.min(1, st.lane + wander));

      // deplete energy
      st.energy = Math.max(0, st.energy - (0.35 - a.stamina / 400));

      if (st.progress >= 100) {
        st.progress = 100;
        st.finished = true;
        st.finishTick = tick;
        st.rank = rankCounter++;
        finishedCount++;
      }
    }

    frames.push(
      states.map((s) => ({ progress: s.progress, lane: s.lane }))
    );
    tick++;
  }

  // assign ranks to any unfinished (shouldn't happen normally)
  states
    .filter((s) => s.rank === null)
    .sort((a, b) => b.progress - a.progress)
    .forEach((s) => (s.rank = rankCounter++));

  const winner = states.find((s) => s.rank === 1)!;

  return {
    states: [...states].sort((a, b) => (a.rank! - b.rank!)),
    frames,
    totalTicks: tick,
    winnerId: winner.racer.id,
  };
}

export function overall(attrs: RacerAttributes): number {
  return Math.round(
    (attrs.speed + attrs.stamina + attrs.navigation + attrs.luck) / 4
  );
}
