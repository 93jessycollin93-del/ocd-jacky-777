// Word Guess: rules live in logic.ts, the word lists in words.ts. This file is the DOM board: tiles that pop,
// flip, shake and bounce, an on-screen keyboard that remembers each letter's best result, the Daily /
// Practice flow, hard mode, colour-blind colours and the stats panel.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useKeyPress } from "../../kit/input";
import { randomSeed, mulberry32 } from "../../kit/rng";
import { play, tone } from "../../kit/sfx";
import { clearState, loadState, saveState } from "../../kit/storage";
import { GameOverPanel, Overlay, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import {
  MAX_GUESSES, WORD_LEN, boardRows, cleanStats, dailyAnswer, dateKey, dayNumber, emptyStats, keyStates, newBoard, randomAnswer,
  recordResult, restoreDaily, shareText, submitGuess, winPercent,
  type Board, type DailySave, type Stats, type TileState,
} from "./logic";
import { meta } from "./meta";

type Phase = "ready" | "playing" | "over";
type Mode = "daily" | "practice";

interface Session {
  mode: Mode;
  board: Board;
  /** Letters typed for the guess in progress. */
  cur: string;
  /** The row that was flipped most recently (-1: none yet). */
  revealRow: number;
  /** How many rows have finished flipping (the keyboard only learns from those). */
  revealed: number;
  /** True while a row is flipping: typing waits. */
  busy: boolean;
}

interface Settings {
  hard: boolean;
  contrast: boolean;
}

const DAILY_KEY = "word-guess:daily";
const SETTINGS_KEY = "word-guess:settings";
const statsKey = (m: Mode) => `word-guess:stats:${m}`;

const FLIP_STEP = 0.3; // seconds between tiles flipping
const FLIP_TIME = 0.55;
const REVEAL_MS = Math.round(((WORD_LEN - 1) * FLIP_STEP + FLIP_TIME) * 1000) + 80;

const PALETTE = {
  normal: { correct: "#2f9e5b", present: "#d4952a" },
  contrast: { correct: "#f2762e", present: "#3a9bdc" },
  absent: "#3d4351",
};

const WIN_WORDS = ["Genius", "Magnificent", "Impressive", "Splendid", "Great", "Phew"];
const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

const CSS = `
@keyframes wg-pop { 0% { transform: scale(1); } 45% { transform: scale(1.14); } 100% { transform: scale(1); } }
@keyframes wg-flip {
  0% { transform: perspective(320px) rotateX(0deg); background-color: transparent; border-color: #5d667a; }
  45% { transform: perspective(320px) rotateX(90deg); background-color: transparent; border-color: #5d667a; }
  55% { transform: perspective(320px) rotateX(90deg); background-color: var(--to); border-color: var(--to); }
  100% { transform: perspective(320px) rotateX(0deg); background-color: var(--to); border-color: var(--to); }
}
@keyframes wg-shake {
  10%, 90% { transform: translateX(-2px); } 20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-7px); } 40%, 60% { transform: translateX(7px); }
}
@keyframes wg-bounce {
  0%, 20% { transform: translateY(0); } 40% { transform: translateY(-26px); } 50% { transform: translateY(4px); }
  60% { transform: translateY(-12px); } 80% { transform: translateY(2px); } 100% { transform: translateY(0); }
}
@keyframes wg-toast { 0% { opacity: 0; transform: translate(-50%, -8px); } 12% { opacity: 1; transform: translate(-50%, 0); } 100% { opacity: 1; transform: translate(-50%, 0); } }
.wg-tile { box-sizing: border-box; display: grid; place-items: center; border: 2px solid #2e3441; border-radius: 4px; font-weight: 800; text-transform: uppercase; line-height: 1; color: #fff; user-select: none; }
.wg-tile.filled { border-color: #5d667a; }
.wg-pop { animation: wg-pop 0.12s ease-out; }
.wg-flip { animation: wg-flip ${FLIP_TIME}s ease-in-out both; }
.wg-shake { animation: wg-shake 0.55s ease-in-out; }
.wg-bounce { animation: wg-bounce 0.9s ease-in-out both; }
.wg-toast { animation: wg-toast 0.2s ease-out both; }
.wg-key { transition: background-color 0.25s, transform 0.06s; }
.wg-key:active { transform: scale(0.94); }
@media (prefers-reduced-motion: reduce) { .wg-flip, .wg-bounce, .wg-pop, .wg-shake { animation-duration: 0.01s; animation-delay: 0s !important; } }
`;

function useBox(ref: React.RefObject<HTMLElement>) {
  const [box, setBox] = useState({ w: 390, h: 700 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox((b) => (b.w === el.clientWidth && b.h === el.clientHeight ? b : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return box;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function niceDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function msUntilTomorrow() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime() - n.getTime();
}

function useClock(active: boolean) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setN((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);
}

function loadSettings(): Settings {
  const s = loadState<Partial<Settings>>(SETTINGS_KEY);
  return { hard: !!s?.hard, contrast: !!s?.contrast };
}

// ---------------------------------------------------------------------------------------------------------

function Chip({ children, onClick, label, active, disabled, title }: { children: ReactNode; onClick: () => void; label: string; active?: boolean; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`h-8 shrink-0 rounded-lg border px-2.5 text-xs font-bold transition ${
        active ? "border-emerald-400/70 bg-emerald-400/15 text-emerald-200" : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
      } ${disabled ? "opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}

function Switch({ label, hint, on, onChange, disabled }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${on ? "border-emerald-400/60 bg-emerald-400/10" : "border-white/15 bg-white/5"} ${disabled ? "opacity-50" : "hover:bg-white/10"}`}
    >
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-emerald-500" : "bg-white/25"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-white">{label}</span>
        <span className="block text-[10px] leading-tight text-white/50">{hint}</span>
      </span>
    </button>
  );
}

function ModeCard({ active, title, sub, onClick }: { active: boolean; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-left transition ${active ? "border-emerald-400/70 bg-emerald-400/15" : "border-white/15 bg-white/5 hover:bg-white/10"}`}
    >
      <span className="block text-sm font-black text-white">{title}</span>
      <span className="block text-[11px] leading-tight text-white/60">{sub}</span>
    </button>
  );
}

function StatsBlock({ stats, highlight }: { stats: Stats; highlight?: number }) {
  const max = Math.max(1, ...stats.dist);
  const nums: [string, number][] = [["Played", stats.played], ["Win %", winPercent(stats)], ["Streak", stats.streak], ["Max streak", stats.maxStreak]];
  return (
    <div className="mt-3 text-left">
      <div className="grid grid-cols-4 gap-1 text-center">
        {nums.map(([label, v]) => (
          <div key={label}>
            <div className="text-2xl font-black tabular-nums leading-none">{v}</div>
            <div className="mt-1 text-[10px] leading-tight text-white/55">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[11px] font-bold uppercase tracking-widest text-white/50">Guess distribution</div>
      <div className="mt-1 space-y-1">
        {stats.dist.map((n, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-right font-bold tabular-nums text-white/80">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div
                className="rounded-sm px-1.5 py-[1px] text-right text-[11px] font-bold tabular-nums text-white"
                style={{ width: `${Math.max(9, (n / max) * 100)}%`, background: highlight === i + 1 ? "var(--wg-correct)" : "#4a5163" }}
              >
                {n}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------

export default function WordGuessGame({ touch, best, submitScore }: GameProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [pick, setPick] = useState<Mode>("daily");
  const [stats, setStats] = useState<Record<Mode, Stats>>(() => ({
    daily: cleanStats(loadState(statsKey("daily"))),
    practice: cleanStats(loadState(statsKey("practice"))),
  }));
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [shake, setShake] = useState<number | null>(null);
  const [bounceRow, setBounceRow] = useState(-1);
  const [showPanel, setShowPanel] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [result, setResult] = useState({ streakBest: false });
  // Today's saved daily game, read again whenever the menu opens (the date may have changed).
  const [dailyPeek, setDailyPeek] = useState<Board | null>(null);

  const root = useRef<HTMLDivElement>(null);
  const box = useBox(root);
  const timers = useRef<number[]>([]);
  const toastId = useRef(0);
  const lastPractice = useRef<string | undefined>(undefined);
  const rng = useRef(mulberry32(randomSeed()));

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);

  const showToast = useCallback((text: string, ms = 1600) => {
    const id = ++toastId.current;
    setToast({ text, id });
    window.setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), ms);
  }, []);

  const peekDaily = useCallback(() => {
    const key = dateKey();
    return restoreDaily(loadState<DailySave>(DAILY_KEY), key, dailyAnswer(key));
  }, []);

  useEffect(() => {
    if (phase === "ready") setDailyPeek(peekDaily());
  }, [phase, peekDaily]);

  const setSetting = (patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      saveState(SETTINGS_KEY, next);
      return next;
    });
  };

  // ---- starting games

  const beginPractice = useCallback(() => {
    const answer = randomAnswer(rng.current, lastPractice.current);
    lastPractice.current = answer;
    setSession({ mode: "practice", board: newBoard(answer), cur: "", revealRow: -1, revealed: 0, busy: false });
    setShowPanel(false);
    setBounceRow(-1);
    setPhase("playing");
    play("select");
  }, []);

  const beginDaily = useCallback(() => {
    const key = dateKey();
    const answer = dailyAnswer(key);
    const saved = restoreDaily(loadState<DailySave>(DAILY_KEY), key, answer) ?? newBoard(answer);
    setSession({ mode: "daily", board: saved, cur: "", revealRow: -1, revealed: saved.guesses.length, busy: false });
    setBounceRow(-1);
    play("select");
    if (saved.status !== "playing") {
      setShowPanel(true);
      setPhase("over");
    } else {
      setShowPanel(false);
      setPhase("playing");
    }
  }, []);

  const startPicked = useCallback(() => {
    // Opening the menu mid-game and pressing Play again just resumes that game.
    if (session && session.mode === pick && session.board.status === "playing" && (pick === "practice" || session.board.answer === dailyAnswer(dateKey()))) {
      setPhase("playing");
      return;
    }
    if (pick === "daily") beginDaily();
    else beginPractice();
  }, [session, pick, beginDaily, beginPractice]);

  const toMenu = useCallback(() => {
    setShowPanel(false);
    setShowStats(false);
    setPhase("ready");
  }, []);

  // ---- typing

  const typeLetter = (ch: string) => {
    if (phase !== "playing" || !session || session.busy || session.cur.length >= WORD_LEN || showStats) return;
    setSession({ ...session, cur: session.cur + ch });
    tone(520 + session.cur.length * 40, 0.04, "triangle", 0.06);
  };

  const backspace = () => {
    if (phase !== "playing" || !session || session.busy || !session.cur || showStats) return;
    setSession({ ...session, cur: session.cur.slice(0, -1) });
    play("click", 0.8);
  };

  const reject = (msg: string) => {
    showToast(msg);
    setShake(session ? session.board.guesses.length : null);
    play("error");
    later(() => setShake(null), 600);
  };

  const enter = () => {
    if (phase !== "playing" || !session || session.busy || showStats) return;
    const board: Board = { ...session.board, guesses: [...session.board.guesses] };
    const res = submitGuess(board, session.cur, settings.hard);
    if (!res.ok) {
      reject(res.message ?? "Try again");
      return;
    }
    const row = board.guesses.length - 1;
    setSession({ ...session, board, cur: "", revealRow: row, busy: true });
    // Flip sounds, one per tile.
    res.tiles.forEach((t, i) => {
      later(() => {
        play("flip");
        if (t === "correct") tone(660 + i * 55, 0.09, "sine", 0.07, { delay: 0.1 });
      }, i * FLIP_STEP * 1000 + 120);
    });

    const finished = board.status !== "playing";
    const won = board.status === "won";
    let nextStats: Stats | null = null;
    if (session.mode === "daily") {
      const save: DailySave = { date: dateKey(), guesses: board.guesses, status: board.status };
      saveState(DAILY_KEY, save);
    }
    if (finished) {
      const prevStats = stats[session.mode];
      nextStats = recordResult(prevStats, won, board.guesses.length, session.mode === "daily" ? dateKey() : undefined);
      saveState(statsKey(session.mode), nextStats);
      setStats((s) => ({ ...s, [session.mode]: nextStats! }));
      if (won) {
        const isBest = submitScore(nextStats.streak);
        setResult({ streakBest: isBest });
      } else {
        setResult({ streakBest: false });
      }
    }

    later(() => {
      setSession((s) => (s ? { ...s, busy: false, revealed: s.board.guesses.length } : s));
      if (!finished) return;
      if (won) {
        setBounceRow(row);
        showToast(WIN_WORDS[Math.min(row, WIN_WORDS.length - 1)], 2000);
        play("win");
        later(() => {
          setShowPanel(true);
          setPhase("over");
        }, 1700);
      } else {
        showToast(board.answer.toUpperCase(), 2600);
        play("lose");
        later(() => {
          setShowPanel(true);
          setPhase("over");
        }, 1500);
      }
    }, REVEAL_MS);
  };

  useKeyPress((code, e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (code === "Escape") {
      if (showStats) setShowStats(false);
      else if (phase === "playing") toMenu();
      else if (phase === "ready" && session && session.board.status === "playing") setPhase("playing");
      return;
    }
    if (phase !== "playing") return;
    if (e.key === "Enter") {
      if (!e.repeat) enter();
    } else if (e.key === "Backspace") backspace();
    else if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key.toLowerCase());
  }, true);

  // ---- derived

  const rows = session ? boardRows(session.board) : [];
  const keyRows = rows.slice(0, session?.revealed ?? 0);
  const kStates = keyStates(keyRows);
  const pal = settings.contrast ? PALETTE.contrast : PALETTE.normal;
  const colorOf = (t: TileState) => (t === "correct" ? pal.correct : t === "present" ? pal.present : PALETTE.absent);
  const cssVars = { "--wg-correct": pal.correct, "--wg-present": pal.present } as CSSProperties;

  const wide = box.w > box.h * 1.4 && box.h < 520;
  const headerH = wide ? 38 : 46;
  const gap = clamp(Math.round(box.h / 130), 4, 6);
  let tile: number;
  let keyH: number;
  if (wide) {
    tile = clamp(Math.floor((box.h - headerH - 14 - gap * 5) / 6), 26, 56);
    keyH = clamp(Math.floor((box.h - headerH - 30) / 3.5), 34, 54);
  } else {
    keyH = clamp(Math.floor(box.h * 0.072), 40, 58);
    const kbH = keyH * 3 + 14 + 16;
    const byH = Math.floor((box.h - headerH - kbH - 28 - gap * 5) / 6);
    const byW = Math.floor((box.w - 28 - gap * 4) / 5);
    tile = clamp(Math.min(byH, byW), 28, 70);
  }
  const boardW = tile * 5 + gap * 4;

  const canToggleHard = !(session && session.board.status === "playing" && session.board.guesses.length > 0);

  const dailyLabel =
    dailyPeek && dailyPeek.status === "won" ? `Solved in ${dailyPeek.guesses.length}/${MAX_GUESSES}`
    : dailyPeek && dailyPeek.status === "lost" ? "Missed today's word"
    : dailyPeek && dailyPeek.guesses.length ? `${dailyPeek.guesses.length}/${MAX_GUESSES} guesses so far`
    : `#${dayNumber(dateKey()) + 1} · ${niceDate(dateKey())}`;

  // ---- pieces

  const renderTile = (r: number, c: number) => {
    if (!session) return null;
    const guesses = session.board.guesses;
    const done = r < guesses.length;
    const typing = r === guesses.length && session.board.status === "playing";
    const ch = done ? guesses[r][c] : typing ? session.cur[c] ?? "" : "";
    const state = done ? rows[r].tiles[c] : undefined;
    const isFlip = done && r === session.revealRow;
    const cls = ["wg-tile"];
    const style: CSSProperties & Record<string, string | number> = { width: tile, height: tile, fontSize: Math.round(tile * 0.56) };
    if (state) {
      style.backgroundColor = colorOf(state);
      style.borderColor = colorOf(state);
      if (isFlip) {
        cls.push("wg-flip");
        style["--to"] = colorOf(state);
        style.animationDelay = `${c * FLIP_STEP}s`;
      }
      if (bounceRow === r) {
        // After the flip has finished the tile may bounce; the two animations take turns.
        cls.length = 1;
        cls.push("wg-bounce");
        style.animationDelay = `${c * 0.09}s`;
      }
    } else if (ch) {
      cls.push("filled", "wg-pop");
    }
    return (
      <div key={`${r}-${c}-${ch}`} className={cls.join(" ")} style={style} aria-label={ch ? `${ch}${state ? ` ${state}` : ""}` : "empty"}>
        {ch}
      </div>
    );
  };

  const keyBtn = (k: string, wideKey = false) => {
    const isEnter = k === "enter";
    const isDel = k === "del";
    const st = !isEnter && !isDel ? kStates[k] : undefined;
    const bg = st ? colorOf(st) : isEnter || isDel ? "#4a5163" : "#3b4252";
    const dim = st === "absent";
    return (
      <button
        key={k}
        type="button"
        tabIndex={-1}
        aria-label={isEnter ? "Enter" : isDel ? "Backspace" : k}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (isEnter ? enter() : isDel ? backspace() : typeLetter(k))}
        className={`wg-key flex min-w-0 items-center justify-center rounded-md font-bold text-white ${isEnter ? "" : "uppercase"}`}
        style={{
          flex: wideKey ? 1.65 : 1, height: keyH, background: bg, color: dim ? "rgba(255,255,255,0.45)" : "#fff",
          fontSize: isEnter ? Math.round(keyH * 0.25) : Math.round(keyH * 0.36),
        }}
      >
        {isEnter ? "Enter" : isDel ? "⌫" : k}
      </button>
    );
  };

  const keyboard = (
    <div className="flex flex-col" style={{ gap: 6, width: wide ? Math.min(box.w - boardW - 48, 520) : Math.min(box.w - 12, 520) }}>
      <div className="flex" style={{ gap: 5 }}>{KEY_ROWS[0].split("").map((k) => keyBtn(k))}</div>
      <div className="flex" style={{ gap: 5 }}>
        <div style={{ flex: 0.5 }} />
        {KEY_ROWS[1].split("").map((k) => keyBtn(k))}
        <div style={{ flex: 0.5 }} />
      </div>
      <div className="flex" style={{ gap: 5 }}>
        {keyBtn("enter", true)}
        {KEY_ROWS[2].split("").map((k) => keyBtn(k))}
        {keyBtn("del", true)}
      </div>
    </div>
  );

  const boardEl = session && (
    <div className="flex flex-col" style={{ gap }} aria-label="Game board">
      {Array.from({ length: MAX_GUESSES }, (_, r) => (
        <div key={r} className={`flex ${shake === r ? "wg-shake" : ""}`} style={{ gap }}>
          {Array.from({ length: WORD_LEN }, (_, c) => renderTile(r, c))}
        </div>
      ))}
    </div>
  );

  const finished = session && session.board.status !== "playing";
  const won = session?.board.status === "won";
  const nGuess = session?.board.guesses.length ?? 0;
  const modeStats = session ? stats[session.mode] : stats[pick];

  useClock(phase === "over" && showPanel && session?.mode === "daily");
  const left = msUntilTomorrow();
  const countdown = [Math.floor(left / 3600000), Math.floor((left % 3600000) / 60000), Math.floor((left % 60000) / 1000)].map((n) => String(n).padStart(2, "0")).join(":");

  const share = async () => {
    if (!session) return;
    const label = session.mode === "daily" ? `#${dayNumber(dateKey()) + 1}` : "Practice";
    try {
      await navigator.clipboard.writeText(shareText(session.board, label, settings.contrast));
      showToast("Result copied to clipboard");
    } catch {
      showToast("Couldn't copy the result");
    }
  };

  const resetStats = () => {
    clearState(statsKey(session?.mode ?? pick));
    setStats((s) => ({ ...s, [session?.mode ?? pick]: emptyStats() }));
  };

  return (
    <div ref={root} className="absolute inset-0 select-none overflow-hidden" style={{ background: "#0f1218", color: "#fff", touchAction: "manipulation", ...cssVars }}>
      <style>{CSS}</style>

      {/* top strip */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-1.5 border-b border-white/10 px-2" style={{ height: headerH, background: "#141821" }}>
        <Chip label="Menu" onClick={toMenu}>☰ Menu</Chip>
        <div className="min-w-0 flex-1 truncate text-center text-xs font-bold text-white/80 sm:text-sm">
          {session ? (session.mode === "daily" ? `Daily #${dayNumber(dateKey()) + 1}` : "Practice") : "Word Guess"}
        </div>
        {session?.mode === "practice" && (
          <Chip label="New word" onClick={beginPractice} disabled={phase !== "playing"}>↻</Chip>
        )}
        <Chip
          label={`Hard mode ${settings.hard ? "on" : "off"}`}
          title={canToggleHard ? "Hard mode: revealed hints must be used in later guesses" : "Hard mode can only be changed before your first guess"}
          active={settings.hard}
          disabled={!canToggleHard}
          onClick={() => setSetting({ hard: !settings.hard })}
        >
          Hard
        </Chip>
        <Chip label="High contrast colours" active={settings.contrast} onClick={() => setSetting({ contrast: !settings.contrast })}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M7 1a6 6 0 0 1 0 12z" fill="currentColor" />
          </svg>
        </Chip>
        <Chip label="Statistics" onClick={() => session && setShowStats(true)}>📊</Chip>
      </div>

      {/* toast */}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="wg-toast pointer-events-none absolute left-1/2 z-30 rounded-lg bg-white px-3.5 py-2 text-sm font-bold text-zinc-900 shadow-xl"
          style={{ top: headerH + 10 }}
        >
          {toast.text}
        </div>
      )}

      {/* board + keyboard */}
      {session && (
        <div
          className={`absolute inset-x-0 bottom-0 flex items-center justify-center ${wide ? "flex-row gap-6 px-3" : "flex-col justify-between pb-3 pt-2"}`}
          style={{ top: headerH }}
        >
          {wide ? (
            <>
              {boardEl}
              {keyboard}
            </>
          ) : (
            <>
              <div className="flex min-h-0 flex-1 items-center justify-center">{boardEl}</div>
              <div className="flex shrink-0 justify-center pb-1 pt-2">{keyboard}</div>
            </>
          )}
        </div>
      )}

      {/* menu */}
      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={startPicked}
          accent={meta.accent}
          best={best || undefined}
          bestLabel="Best streak"
          extra={
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <ModeCard active={pick === "daily"} title="Daily" sub={dailyLabel} onClick={() => setPick("daily")} />
                <ModeCard active={pick === "practice"} title="Practice" sub="Unlimited random words" onClick={() => setPick("practice")} />
              </div>
              <div className="flex gap-2">
                <Switch label="Hard mode" hint="Use every hint you reveal" on={settings.hard} disabled={!canToggleHard} onChange={(v) => setSetting({ hard: v })} />
                <Switch label="High contrast" hint="Orange and blue tiles" on={settings.contrast} onChange={(v) => setSetting({ contrast: v })} />
              </div>
            </div>
          }
        />
      )}

      {/* statistics on demand */}
      {showStats && phase !== "ready" && (
        <Overlay>
          <h2 className="text-2xl font-black" style={{ color: meta.accent }}>Statistics</h2>
          <p className="text-xs text-white/50">{session?.mode === "daily" ? "Daily games" : "Practice games"}</p>
          <StatsBlock stats={modeStats} />
          <div className="mt-4 space-y-2">
            <SecondaryButton onClick={() => setShowStats(false)}>Close</SecondaryButton>
            <button type="button" className="text-[11px] text-white/35 underline hover:text-white/60" onClick={resetStats}>Reset these statistics</button>
          </div>
        </Overlay>
      )}

      {/* end of game */}
      {phase === "over" && showPanel && finished && session && (
        <GameOverPanel
          accent={meta.accent}
          title={won ? WIN_WORDS[Math.min(nGuess - 1, WIN_WORDS.length - 1)] : "Out of guesses"}
          score={won ? `${nGuess}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`}
          scoreLabel={session.mode === "daily" ? `Daily #${dayNumber(dateKey()) + 1}` : "Practice"}
          isBest={won && result.streakBest}
          onRestart={beginPractice}
        >
          {!won && (
            <p className="mt-1 text-sm text-white/75">
              The word was <b className="tracking-widest text-white">{session.board.answer.toUpperCase()}</b>
            </p>
          )}
          <StatsBlock stats={modeStats} highlight={won ? nGuess : undefined} />
          {session.mode === "daily" && (
            <p className="mt-3 text-xs text-white/60">
              Next daily word in <b className="tabular-nums text-white">{countdown}</b>. Play again for a practice word.
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <SecondaryButton onClick={share}>Share result</SecondaryButton>
            <SecondaryButton onClick={() => setShowPanel(false)}>View board</SecondaryButton>
          </div>
          <div className="mt-2">
            <SecondaryButton onClick={toMenu}>Menu</SecondaryButton>
          </div>
        </GameOverPanel>
      )}
      {phase === "over" && !showPanel && finished && (
        <button
          type="button"
          className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/25 bg-black/70 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-black/85"
          onClick={() => setShowPanel(true)}
        >
          Show results
        </button>
      )}
    </div>
  );
}
