import { describe, it, expect } from "vitest";
import {
  MAX_GUESSES, boardRows, checkHard, cleanStats, dailyAnswer, dailyStride, dateKey, dayNumber, emptyStats, keyStates, newBoard,
  randomAnswer, recordResult, restoreDaily, scoreGuess, shareText, submitGuess, winPercent, type TileState,
} from "@/arcade/games/word-guess/logic";
import { ANSWERS, EXTRA_GUESSES, GUESSES, isValidGuess } from "@/arcade/games/word-guess/words";
import { mulberry32 } from "@/arcade/kit/rng";

const C: TileState = "correct";
const P: TileState = "present";
const A: TileState = "absent";

describe("word-guess colouring", () => {
  it("marks exact, misplaced and missing letters", () => {
    expect(scoreGuess("crane", "crane")).toEqual([C, C, C, C, C]);
    expect(scoreGuess("sound", "crane")).toEqual([A, A, A, C, A]);
    expect(scoreGuess("nacre", "crane")).toEqual([P, P, P, P, C]);
  });

  it("gives greens first, so a repeated letter isn't coloured twice", () => {
    // ROBOT has two Os; FLOOR's second O is exactly right, the first one takes the other O.
    expect(scoreGuess("floor", "robot")).toEqual([A, A, P, C, P]);
    // Only one E is left over after the green one at the end, so the second E is grey.
    expect(scoreGuess("eerie", "there")).toEqual([P, A, P, A, C]);
    // SPEED has two Es but ABIDE only one: the first E is amber, the second grey.
    expect(scoreGuess("speed", "abide")).toEqual([A, A, P, A, P]);
  });

  it("only colours a letter as often as the answer contains it", () => {
    expect(scoreGuess("llama", "hello")).toEqual([P, P, A, A, A]);
    expect(scoreGuess("geese", "there")).toEqual([A, A, C, A, C]);
    // ALARM holds two As and one M: the first M and both As are amber, the other Ms grey.
    expect(scoreGuess("mamma", "alarm")).toEqual([P, P, A, A, P]);
  });

  it("never colours more of a letter than the answer holds (random pairs)", () => {
    const rng = mulberry32(7);
    for (let n = 0; n < 400; n++) {
      const g = GUESSES[Math.floor(rng() * GUESSES.length)];
      const a = ANSWERS[Math.floor(rng() * ANSWERS.length)];
      const t = scoreGuess(g, a);
      for (const ch of new Set(g)) {
        const coloured = [...g].filter((c, i) => c === ch && t[i] !== A).length;
        const inAnswer = [...a].filter((c) => c === ch).length;
        expect(coloured).toBeLessThanOrEqual(inAnswer);
      }
      t.forEach((s, i) => expect(s === C).toBe(g[i] === a[i]));
    }
  });
});

describe("word-guess hard mode and keyboard", () => {
  const rowsFor = (answer: string, ...guesses: string[]) => guesses.map((guess) => ({ guess, tiles: scoreGuess(guess, answer) }));

  it("makes greens stay put and known letters get reused", () => {
    const rows = rowsFor("grape", "crane"); // r, a, e green
    expect(checkHard(rows, "bread")).toBe("3rd letter must be A");
    expect(checkHard(rows, "trace")).toBeNull();
    const rows2 = rowsFor("grape", "pager"); // p a g e r all in the word
    expect(checkHard(rows2, "apple")).toBe("Guess must contain G");
    expect(checkHard(rows2, "gaper")).toBeNull();
  });

  it("counts repeated hints", () => {
    const rows = [{ guess: "eerie", tiles: [P, P, A, A, A] as TileState[] }];
    expect(checkHard(rows, "tread")).toBe("Guess must contain 2 Es");
    expect(checkHard(rows, "ember")).toBeNull();
  });

  it("is enforced by submitGuess only when switched on", () => {
    const b = newBoard("grape");
    expect(submitGuess(b, "crane", true).ok).toBe(true);
    const bad = submitGuess(b, "plumb", true);
    expect(bad).toMatchObject({ ok: false, reason: "hard" });
    expect(b.guesses).toHaveLength(1);
    expect(submitGuess(b, "plumb", false).ok).toBe(true);
  });

  it("keeps the best state of each letter on the keyboard", () => {
    const rows = [
      { guess: "level", tiles: [A, P, A, A, A] as TileState[] },
      { guess: "melee", tiles: [A, C, A, A, A] as TileState[] },
      { guess: "lemon", tiles: [A, A, A, A, A] as TileState[] },
    ];
    const k = keyStates(rows);
    expect(k.e).toBe(C);
    expect(k.l).toBe(A);
    expect(k.m).toBe(A);
    expect(k.z).toBeUndefined();
  });
});

describe("word-guess boards", () => {
  it("rejects short and unknown guesses without using one up", () => {
    const b = newBoard("crane");
    expect(submitGuess(b, "cran")).toMatchObject({ ok: false, reason: "short" });
    expect(submitGuess(b, "zzzzz")).toMatchObject({ ok: false, reason: "unknown", message: "Not in word list" });
    expect(b.guesses).toHaveLength(0);
  });

  it("wins on the right word and stops accepting guesses", () => {
    const b = newBoard("crane");
    submitGuess(b, "sound");
    expect(b.status).toBe("playing");
    const r = submitGuess(b, "CRANE");
    expect(r).toMatchObject({ ok: true, status: "won" });
    expect(b.guesses).toHaveLength(2);
    expect(submitGuess(b, "sound")).toMatchObject({ ok: false, reason: "finished" });
  });

  it("loses after six wrong guesses", () => {
    const b = newBoard("crane");
    for (const w of ["sound", "light", "pizza", "bumpy", "ghost", "fluff"]) submitGuess(b, w);
    expect(b.guesses).toHaveLength(MAX_GUESSES);
    expect(b.status).toBe("lost");
  });

  it("restores a saved daily board and refuses a tampered one", () => {
    const key = "2025-03-09";
    const answer = dailyAnswer(key);
    const b = newBoard(answer);
    submitGuess(b, "sound");
    submitGuess(b, answer);
    const back = restoreDaily({ date: key, guesses: b.guesses, status: "won" }, key, answer)!;
    expect(back.status).toBe("won");
    expect(boardRows(back)).toHaveLength(2);
    expect(restoreDaily({ date: "2025-03-08", guesses: b.guesses }, key, answer)).toBeNull();
    expect(restoreDaily({ date: key, guesses: ["qqqqq"] }, key, answer)).toBeNull();
    expect(restoreDaily(null, key, answer)).toBeNull();
  });

  it("builds a share grid", () => {
    const b = newBoard("crane");
    submitGuess(b, "sound");
    submitGuess(b, "crane");
    const text = shareText(b, "#5");
    expect(text.split("\n")[0]).toBe("Word Guess #5 2/6");
    expect(text).toContain("🟩🟩🟩🟩🟩");
    expect(shareText(b, "#5", true)).toContain("🟧🟧🟧🟧🟧");
  });
});

describe("word-guess daily word", () => {
  it("is the same for the same date and changes the next day", () => {
    expect(dailyAnswer("2026-10-12")).toBe(dailyAnswer("2026-10-12"));
    expect(dailyAnswer("2026-10-12")).not.toBe(dailyAnswer("2026-10-13"));
    expect(ANSWERS).toContain(dailyAnswer("2031-01-01"));
  });

  it("doesn't repeat a word until the whole answer list has been used", () => {
    expect(dailyStride(ANSWERS.length)).toBeGreaterThan(1);
    const seen = new Set<string>();
    const start = dayNumber("2026-01-01");
    for (let d = 0; d < ANSWERS.length; d++) {
      const date = new Date(Date.UTC(2024, 0, 1 + start + d));
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
      seen.add(dailyAnswer(key));
    }
    expect(seen.size).toBe(ANSWERS.length);
  });

  it("counts calendar days through daylight-saving changes and across years", () => {
    expect(dayNumber("2024-01-01")).toBe(0);
    expect(dayNumber("2024-03-11") - dayNumber("2024-03-10")).toBe(1);
    expect(dayNumber("2024-11-04") - dayNumber("2024-11-03")).toBe(1);
    expect(dayNumber("2025-01-01") - dayNumber("2024-01-01")).toBe(366);
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("picks random practice words that differ from the last one", () => {
    const rng = mulberry32(3);
    let last: string | undefined;
    for (let i = 0; i < 50; i++) {
      const w = randomAnswer(rng, last);
      expect(w).not.toBe(last);
      last = w;
    }
  });
});

describe("word-guess stats", () => {
  it("tracks played, wins, streaks and the distribution", () => {
    let s = emptyStats();
    s = recordResult(s, true, 3);
    s = recordResult(s, true, 4);
    s = recordResult(s, true, 3);
    expect(s).toMatchObject({ played: 3, wins: 3, streak: 3, maxStreak: 3 });
    expect(s.dist).toEqual([0, 0, 2, 1, 0, 0]);
    s = recordResult(s, false, 6);
    expect(s).toMatchObject({ played: 4, wins: 3, streak: 0, maxStreak: 3 });
    expect(winPercent(s)).toBe(75);
    s = recordResult(s, true, 1);
    expect(s.streak).toBe(1);
    expect(s.maxStreak).toBe(3);
  });

  it("breaks a daily streak when a day is missed, but not on consecutive days", () => {
    let s = recordResult(emptyStats(), true, 3, "2026-10-10");
    s = recordResult(s, true, 3, "2026-10-11");
    expect(s.streak).toBe(2);
    s = recordResult(s, true, 3, "2026-10-14");
    expect(s.streak).toBe(1);
    expect(s.maxStreak).toBe(2);
  });

  it("reads damaged saves safely", () => {
    expect(cleanStats(null)).toEqual(emptyStats());
    const s = cleanStats({ played: 5, wins: 99, streak: -3, dist: [1, "x", 2], maxStreak: "a" });
    expect(s.wins).toBeLessThanOrEqual(s.played);
    expect(s.streak).toBe(0);
    expect(s.dist).toHaveLength(6);
    expect(s.dist[1]).toBe(0);
  });
});

describe("word-guess word lists", () => {
  const blocked = [
    "bitch", "whore", "slut", "sluts", "twats", "fucks", "shits", "cunts", "dicks", "pussy", "penis", "nigga", "negro", "faggy",
    "fagot", "dykes", "chink", "gooks", "spics", "kikes", "coons", "wops", "retard", "porno", "nazis", "rapes", "raped", "boobs",
    "tits", "titty", "cocks", "anus", "horny", "sexed", "semen", "sperm", "vulva", "wanks", "skank", "bimbo", "hussy", "gypsy", "bongs",
  ];

  it("has plenty of answers and a bigger guess list", () => {
    expect(ANSWERS.length).toBeGreaterThanOrEqual(1500);
    expect(GUESSES.length).toBeGreaterThanOrEqual(6000);
    expect(GUESSES.length).toBeGreaterThan(ANSWERS.length);
  });

  it("only has five lowercase letters per word, with no duplicates", () => {
    for (const list of [ANSWERS, EXTRA_GUESSES, GUESSES]) {
      for (const w of list) expect(w).toMatch(/^[a-z]{5}$/);
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it("accepts every answer as a guess, and keeps the extra list separate", () => {
    for (const w of ANSWERS) expect(isValidGuess(w)).toBe(true);
    const answers = new Set(ANSWERS);
    expect(EXTRA_GUESSES.some((w) => answers.has(w))).toBe(false);
    expect(isValidGuess("CRANE")).toBe(true);
    expect(isValidGuess("qqqqq")).toBe(false);
  });

  it("keeps rude words out of both lists", () => {
    const all = new Set(GUESSES);
    for (const w of blocked) expect(all.has(w)).toBe(false);
  });

  it("can score every answer against itself", () => {
    for (const w of ANSWERS) expect(scoreGuess(w, w)).toEqual([C, C, C, C, C]);
  });
});
