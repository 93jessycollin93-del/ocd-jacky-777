import { RacerState } from "./raceEngine";

export function makeCommentary(
  sorted: { id: string; name: string; progress: number }[],
  prevLeaderId: string | null,
  finishedNames: string[]
): { text: string; leaderId: string } {
  const leader = sorted[0];
  const second = sorted[1];
  const lines: string[] = [];

  if (finishedNames.length > 0) {
    lines.push(`🏁 ${finishedNames[finishedNames.length - 1]} crosses the membrane!`);
  }

  if (prevLeaderId && prevLeaderId !== leader.id) {
    lines.push(`⚡ ${leader.name} surges into the lead!`);
  } else if (second && leader.progress - second.progress < 4) {
    lines.push(`🔥 It's neck and neck — ${leader.name} barely ahead of ${second.name}!`);
  } else {
    const pool = [
      `${leader.name} powers through the cytoplasm!`,
      `${leader.name} leads the swim, tail thrashing!`,
      `Tight pack chasing ${leader.name}!`,
      `${leader.name} navigates the turbulence beautifully!`,
    ];
    lines.push(pool[Math.floor((leader.progress / 8) % pool.length)]);
  }

  return { text: lines[lines.length - 1], leaderId: leader.id };
}

export function rankSuffix(n: number) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

export type { RacerState };
