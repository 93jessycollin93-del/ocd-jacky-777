// Sudoku: rules, generator and solver live in logic.ts (pure, seeded). This file is the board and number
// pad (DOM, so text stays crisp), the keyboard and touch input, the timer, saving, and the start /
// pause / solved flow.
import { memo, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Particles } from "../../kit/draw";
import { formatTime } from "../../kit/format";
import { useFrameLoop } from "../../kit/loop";
import { randomSeed } from "../../kit/rng";
import { play, tone } from "../../kit/sfx";
import { clearState, loadState, saveState } from "../../kit/storage";
import { GameOverPanel, PausePanel, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import {
  DIFFICULTIES, PEERS, bitOf, boxOf, canRedo, canUndo, cleanTimes, colOf, conflicts, difficultyById, digitCounts, enterDigit, erase,
  generatePuzzle, hintsLeft, isGiven, newGame, recordTime, redo, restore, rowOf, serialize, takeHint, toggleNote, undo,
  type Difficulty, type Game, type Times,
} from "./logic";

type Ui = "ready" | "play" | "paused" | "won";

const SAVE_KEY = "sudoku:save";
const TIMES_KEY = "sudoku:times";
const LEVEL_KEY = "sudoku:difficulty";

const THICK = "2px solid rgba(148,163,184,0.6)";
const THIN = "1px solid rgba(148,163,184,0.16)";

const CSS = `
@keyframes sd-pop { 0% { transform: scale(.35); opacity: .2; } 55% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(1); } }
@keyframes sd-wave-a { 0% { filter: brightness(1); transform: scale(1); } 35% { filter: brightness(2.3) saturate(1.4); transform: scale(1.1); } 100% { filter: brightness(1); transform: scale(1); } }
@keyframes sd-wave-b { 0% { filter: brightness(1); transform: scale(1); } 35% { filter: brightness(2.3) saturate(1.4); transform: scale(1.1); } 100% { filter: brightness(1); transform: scale(1); } }
@keyframes sd-shake-a { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-7px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
@keyframes sd-shake-b { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-7px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
`;

interface CellProps {
  i: number;
  v: number;
  notes: number;
  given: boolean;
  sel: boolean;
  peer: boolean;
  same: boolean;
  conflict: boolean;
  wrong: boolean;
  hinted: boolean;
  hide: boolean;
  /** Changes every time a digit lands here, to replay the pop. */
  pop: number;
  /** Delay (ms) of the completion flash, or -1 for none; waveName alternates to replay it. */
  wave: number;
  waveName: string;
  /** The digit selected in the cell that has focus, to light up matching pencil marks. */
  noteSel: number;
  fs: number;
  onPick: (i: number) => void;
}

const CellView = memo(function CellView(p: CellProps) {
  const r = rowOf(p.i);
  const c = colOf(p.i);
  const bg = p.conflict ? "rgba(239,68,68,0.34)" : p.sel ? "#2c7a50" : p.same ? "rgba(34,197,94,0.3)" : p.peer ? "#283052" : "#1d2342";
  const ink = p.conflict || p.wrong ? "#fca5a5" : p.given ? "#e8edf7" : p.hinted ? "#fde68a" : "#86efac";
  const showNotes = !p.hide && p.v === 0 && p.notes !== 0;
  return (
    <div
      role="gridcell"
      aria-label={`Row ${r + 1}, column ${c + 1}${p.v ? `, ${p.v}` : ", empty"}`}
      onPointerDown={(e) => {
        e.preventDefault();
        p.onPick(p.i);
      }}
      style={{
        background: bg,
        borderRight: c < 8 ? (c % 3 === 2 ? THICK : THIN) : "none",
        borderBottom: r < 8 ? (r % 3 === 2 ? THICK : THIN) : "none",
        boxShadow: p.sel ? "inset 0 0 0 2px #4ade80" : undefined,
        animation: p.wave >= 0 ? `${p.waveName} .75s ease-out ${p.wave}ms both` : undefined,
        position: "relative",
        zIndex: p.wave >= 0 ? 1 : 0,
        touchAction: "manipulation",
        transition: "background-color .12s",
        cursor: "pointer",
        userSelect: "none",
      }}
      className="flex items-center justify-center"
    >
      {!p.hide && p.v !== 0 && (
        <span
          key={p.pop}
          style={{ color: ink, fontSize: p.fs, fontWeight: p.given ? 800 : 700, lineHeight: 1, animation: p.pop ? "sd-pop .24s cubic-bezier(.2,1.2,.4,1)" : undefined }}
        >
          {p.v}
        </span>
      )}
      {showNotes && (
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 p-[8%]" style={{ fontSize: p.fs * 0.4, lineHeight: 1 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <span
              key={d}
              className="flex items-center justify-center font-bold"
              style={{ color: p.noteSel === d ? "#4ade80" : "#94a3b8", opacity: p.notes & bitOf(d) ? 1 : 0, transform: p.noteSel === d ? "scale(1.25)" : undefined }}
            >
              {d}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

/** Elapsed time that updates itself, so the board doesn't re-render every second. */
function Clock({ read }: { read: () => number }) {
  const [t, setT] = useState(read);
  useEffect(() => {
    setT(read());
    const id = window.setInterval(() => setT(read()), 500);
    return () => window.clearInterval(id);
  }, [read]);
  return <span className="font-mono tabular-nums">{formatTime(t)}</span>;
}

/** A shower of confetti on a canvas over the board while it is active. */
function Confetti({ active, seed }: { active: boolean; seed: number }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const parts = useRef(new Particles(500));
  const t0 = useRef(0);
  useEffect(() => {
    if (active) t0.current = performance.now();
    else parts.current.clear();
  }, [active, seed]);
  useFrameLoop((dt) => {
    const el = cv.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
    }
    const age = (performance.now() - t0.current) / 1000;
    if (age < 2.4 && Math.random() < dt * 14) {
      parts.current.burst(Math.random() * w, -10, 6, {
        color: ["#4ade80", "#fde047", "#f472b6", "#38bdf8", "#ffffff"], speed: 120, size: 8, life: 2.2, gravity: 260, shape: "square", angle: Math.PI / 2, spread: Math.PI * 0.7,
      });
    }
    parts.current.update(dt);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    parts.current.draw(ctx);
  }, active);
  return <canvas ref={cv} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

export default function SudokuGame({ touch, best, submitScore }: GameProps) {
  const game = useRef<Game | null>(null);
  if (game.current === null) game.current = newGame(generatePuzzle("easy", 20240601));
  const g = () => game.current as Game;
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const [ui, setUi] = useState<Ui>("ready");
  const uiRef = useRef<Ui>("ready");
  const [level, setLevel] = useState<Difficulty>(() => {
    const s = loadState<string>(LEVEL_KEY);
    return DIFFICULTIES.some((d) => d.id === s) ? (s as Difficulty) : "medium";
  });
  const [sel, setSel] = useState(-1);
  const [notesMode, setNotesMode] = useState(false);
  const [times, setTimes] = useState<Times>(() => cleanTimes(loadState(TIMES_KEY)));
  const [saved, setSaved] = useState<Game | null>(() => restore(loadState(SAVE_KEY)));
  const [result, setResult] = useState({ time: 0, isBest: false, mistakes: 0, hints: 0, level: "medium" as Difficulty });
  const [fx, setFx] = useState({ pop: { i: -1, n: 0 }, wave: { n: 0, delays: {} as Record<number, number> }, shake: 0, confetti: false });
  const [dims, setDims] = useState(() => ({ w: typeof window === "undefined" ? 800 : window.innerWidth, h: typeof window === "undefined" ? 600 : window.innerHeight }));
  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const go = useCallback((u: Ui) => {
    uiRef.current = u;
    setUi(u);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth && el.clientHeight) setDims({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- clock: counts only while playing and the page is visible; saves every few seconds
  const lastTick = useRef(0);
  useEffect(() => {
    lastTick.current = performance.now();
    let sinceSave = 0;
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTick.current) / 1000;
      lastTick.current = now;
      if (uiRef.current !== "play") return;
      game.current!.elapsed += Math.min(dt, 1);
      sinceSave += dt;
      if (sinceSave >= 5) {
        sinceSave = 0;
        saveState(SAVE_KEY, serialize(game.current!));
      }
    }, 250);
    return () => window.clearInterval(id);
  }, []);
  const readClock = useCallback(() => Math.floor(game.current?.elapsed ?? 0), []);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const persist = () => saveState(SAVE_KEY, serialize(g()));

  // ---- starting
  const begin = (game0: Game, level0: Difficulty) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    game.current = game0;
    saveState(LEVEL_KEY, level0);
    setLevel(level0);
    const first = game0.values.findIndex((v, i) => v === 0 && !isGiven(game0, i));
    setSel(first);
    setNotesMode(false);
    setFx({ pop: { i: -1, n: 0 }, wave: { n: 0, delays: {} }, shake: 0, confetti: false });
    lastTick.current = performance.now();
    persist();
    go("play");
    rerender();
  };
  const startNew = (d: Difficulty = level) => {
    play("select");
    begin(newGame(generatePuzzle(d, randomSeed())), d);
  };
  const restartSame = () => {
    play("select");
    begin(newGame(g().puzzle), g().puzzle.difficulty);
  };
  const resume = () => {
    if (!saved) return;
    play("select");
    begin(saved, saved.puzzle.difficulty);
    setSaved(null);
  };

  // ---- playing
  const finish = () => {
    const game1 = g();
    const t = Math.max(1, Math.round(game1.elapsed));
    const rec = recordTime(times, game1.puzzle.difficulty, t);
    if (rec.isBest) {
      setTimes(rec.times);
      saveState(TIMES_KEY, rec.times);
    }
    if (game1.puzzle.difficulty === "medium") submitScore(t);
    clearState(SAVE_KEY);
    setSaved(null);
    setResult({ time: t, isBest: rec.isBest, mistakes: game1.mistakes, hints: game1.hintsUsed, level: game1.puzzle.difficulty });
    uiRef.current = "won";
    setFx((f) => ({ ...f, confetti: true }));
    play("win");
    later(() => setUi("won"), 1700);
  };

  const flash = (cells: number[], origin: number) => {
    const delays: Record<number, number> = {};
    for (const c of cells) {
      const d = Math.hypot(rowOf(c) - rowOf(origin), colOf(c) - colOf(origin));
      delays[c] = Math.round(Math.min(delays[c] ?? 9999, d * 55));
    }
    setFx((f) => ({ ...f, wave: { n: f.wave.n + 1, delays } }));
    later(() => setFx((f) => ({ ...f, wave: { n: f.wave.n, delays: {} } })), 1500);
  };

  const put = (d: number, asNote: boolean) => {
    if (uiRef.current !== "play" || sel < 0) return;
    const game1 = g();
    if (asNote) {
      if (toggleNote(game1, sel, d)) {
        tone(900 + d * 40, 0.03, "triangle", 0.06);
        persist();
        rerender();
      }
      return;
    }
    const r = enterDigit(game1, sel, d);
    if (!r) return;
    persist();
    if (!r.correct) {
      play("error");
      setFx((f) => ({ ...f, shake: f.shake + 1, pop: { i: sel, n: f.pop.n + 1 } }));
      return;
    }
    setFx((f) => ({ ...f, pop: { i: sel, n: f.pop.n + 1 } }));
    tone(520 + d * 45, 0.07, "triangle", 0.12);
    const done = [...r.completed.rows.flatMap((x) => Array.from({ length: 9 }, (_, k) => x * 9 + k)), ...r.completed.cols.flatMap((x) => Array.from({ length: 9 }, (_, k) => k * 9 + x)),
      ...r.completed.boxes.flatMap((b) => Array.from({ length: 81 }, (_, k) => k).filter((k) => boxOf(k) === b))];
    if (done.length && !r.won) {
      play("match");
      flash(done, sel);
    }
    if (r.won) {
      flash(Array.from({ length: 81 }, (_, k) => k), sel);
      finish();
    }
  };
  const padPress = (d: number) => put(d, notesMode);

  const doErase = () => {
    if (uiRef.current !== "play" || sel < 0) return;
    if (erase(g(), sel)) {
      play("tick");
      persist();
      rerender();
    }
  };
  const doUndo = () => {
    if (uiRef.current !== "play") return;
    const cells = undo(g());
    if (cells) {
      play("flip");
      setSel(cells[0]);
      persist();
      rerender();
    }
  };
  const doRedo = () => {
    if (uiRef.current !== "play") return;
    const cells = redo(g());
    if (cells) {
      play("flip");
      setSel(cells[0]);
      persist();
      rerender();
    }
  };
  const doHint = () => {
    if (uiRef.current !== "play") return;
    const h = takeHint(g(), sel);
    if (!h) {
      tone(160, 0.1, "square", 0.08);
      return;
    }
    setSel(h.cell);
    play("powerup");
    setFx((f) => ({ ...f, pop: { i: h.cell, n: f.pop.n + 1 } }));
    persist();
    if (g().won) {
      flash(Array.from({ length: 81 }, (_, k) => k), h.cell);
      finish();
    } else rerender();
  };
  const doPause = () => {
    if (uiRef.current === "play") {
      persist();
      go("paused");
    } else if (uiRef.current === "paused") {
      lastTick.current = performance.now();
      go("play");
    }
  };
  const pick = useCallback((i: number) => {
    if (uiRef.current !== "play") return;
    setSel(i);
  }, []);

  const doPauseRef = useRef(doPause);
  doPauseRef.current = doPause;

  // ---- keyboard
  const onKey = useRef<(e: KeyboardEvent) => void>(() => {});
  onKey.current = (e) => {
    const u = uiRef.current;
    if (e.code === "KeyP" || e.code === "Escape") {
      if (!e.repeat && (u === "play" || u === "paused")) doPause();
      return;
    }
    if (u === "ready") {
      if (e.code === "Space" || e.code === "Enter") startNew();
      return;
    }
    if (u !== "play") return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.code === "KeyZ") {
      e.preventDefault();
      if (e.shiftKey) doRedo();
      else doUndo();
      return;
    }
    if (mod && e.code === "KeyY") {
      e.preventDefault();
      doRedo();
      return;
    }
    if (mod || e.altKey) return;
    const arrows: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (arrows[e.code]) {
      e.preventDefault();
      const cur = sel < 0 ? 40 : sel;
      const [dx, dy] = arrows[e.code];
      setSel(Math.max(0, Math.min(8, rowOf(cur) + dy)) * 9 + Math.max(0, Math.min(8, colOf(cur) + dx)));
      return;
    }
    const m = /^(?:Digit|Numpad)([0-9])$/.exec(e.code);
    if (m) {
      const d = Number(m[1]);
      if (d === 0) doErase();
      else put(d, notesMode !== e.shiftKey);
      return;
    }
    if (e.repeat) return;
    if (e.code === "Backspace" || e.code === "Delete") doErase();
    else if (e.code === "KeyN") setNotesMode((n) => !n);
    else if (e.code === "KeyU") doUndo();
    else if (e.code === "KeyY") doRedo();
    else if (e.code === "KeyH") doHint();
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => onKey.current(e);
    const away = () => {
      if (document.visibilityState === "hidden" && uiRef.current === "play") doPauseRef.current();
    };
    window.addEventListener("keydown", down);
    document.addEventListener("visibilitychange", away);
    window.addEventListener("blur", away);
    return () => {
      window.removeEventListener("keydown", down);
      document.removeEventListener("visibilitychange", away);
      window.removeEventListener("blur", away);
    };
  }, []);

  // ---- layout
  const wide = dims.w > dims.h * 1.1;
  const S = Math.floor(
    Math.max(
      180,
      wide ? Math.min(dims.h - 20, dims.w - 300) : Math.min(dims.w - 16, dims.h - 56 - 150),
    ),
  );
  const fs = (S / 9) * 0.56;

  const game1 = g();
  const confl = conflicts(game1.values);
  const selV = sel >= 0 ? game1.values[sel] : 0;
  const peerSet = new Uint8Array(81);
  if (sel >= 0) {
    peerSet[sel] = 1;
    for (const j of PEERS[sel]) peerSet[j] = 1;
  }
  const counts = digitCounts(game1);
  const hide = ui === "ready" || ui === "paused";
  const waveName = fx.wave.n % 2 ? "sd-wave-a" : "sd-wave-b";
  const shakeName = fx.shake % 2 ? "sd-shake-a" : "sd-shake-b";
  const lvl = difficultyById(game1.puzzle.difficulty);

  const cells = [];
  for (let i = 0; i < 81; i++) {
    const v = game1.values[i];
    cells.push(
      <CellView
        key={i}
        i={i}
        v={v}
        notes={game1.notes[i]}
        given={isGiven(game1, i)}
        sel={sel === i}
        peer={peerSet[i] === 1}
        same={selV !== 0 && v === selV}
        conflict={confl[i] === 1}
        wrong={v !== 0 && !isGiven(game1, i) && v !== game1.puzzle.solution[i]}
        hinted={game1.hinted[i] === 1}
        hide={hide}
        pop={fx.pop.i === i ? fx.pop.n : 0}
        wave={fx.wave.delays[i] ?? -1}
        waveName={waveName}
        noteSel={selV === 0 && sel >= 0 ? 0 : selV}
        fs={fs}
        onPick={pick}
      />,
    );
  }
  const boardEl = (
    <div
      className="relative shrink-0"
      style={{ width: S, height: S, animation: fx.shake > 0 ? `${shakeName} .32s ease-out` : undefined }}
    >
      <div
        role="grid"
        aria-label="Sudoku grid"
        className="grid h-full w-full grid-cols-9 grid-rows-9 overflow-hidden rounded-xl"
        style={{ border: THICK, background: "#1d2342", boxShadow: "0 8px 30px rgba(0,0,0,.45)" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {cells}
      </div>
      <Confetti active={fx.confetti} seed={fx.wave.n} />
    </div>
  );

  const toolBtn = "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl bg-white/[0.07] py-2 text-[11px] font-semibold text-white/80 transition enabled:hover:bg-white/15 enabled:active:scale-95 disabled:opacity-30";
  const playing = ui === "play";
  const tools = (
    <div className="flex w-full gap-1.5">
      <button type="button" className={toolBtn} onClick={doUndo} disabled={!playing || !canUndo(game1)} aria-label="Undo">
        <span className="text-xl leading-none">↶</span>Undo
      </button>
      <button type="button" className={toolBtn} onClick={doRedo} disabled={!playing || !canRedo(game1)} aria-label="Redo">
        <span className="text-xl leading-none">↷</span>Redo
      </button>
      <button type="button" className={toolBtn} onClick={doErase} disabled={!playing || sel < 0} aria-label="Erase">
        <span className="text-xl leading-none">⌫</span>Erase
      </button>
      <button
        type="button"
        className={`${toolBtn} ${notesMode ? "!bg-emerald-500/25 ring-2 ring-emerald-400/70" : ""}`}
        onClick={() => setNotesMode((n) => !n)}
        aria-pressed={notesMode}
        aria-label="Notes"
      >
        <span className="text-xl leading-none">✎</span>Notes {notesMode ? "on" : "off"}
      </button>
      <button type="button" className={toolBtn} onClick={doHint} disabled={!playing || hintsLeft(game1) <= 0} aria-label="Hint">
        <span className="text-xl leading-none">💡</span>Hint
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-black">{hintsLeft(game1)}</span>
      </button>
    </div>
  );
  const pad = (cols: number) => (
    <div className="grid w-full gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
        const used = counts[d] >= 9;
        return (
          <button
            key={d}
            type="button"
            disabled={!playing || used}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => padPress(d)}
            aria-label={used ? `${d}, all placed` : `${d}, ${9 - counts[d]} left`}
            className={`relative flex flex-col items-center justify-center rounded-xl py-2 text-2xl font-black transition enabled:active:scale-95 ${
              used ? "bg-white/[0.03] text-white/20 line-through" : notesMode ? "bg-emerald-500/15 text-emerald-200 enabled:hover:bg-emerald-500/25" : "bg-white/10 text-white enabled:hover:bg-white/20"
            }`}
            style={{ minHeight: cols === 9 ? 60 : 58, touchAction: "manipulation" }}
          >
            {d}
            {!used && <span className="text-[10px] font-semibold leading-none text-white/40">{9 - counts[d]}</span>}
          </button>
        );
      })}
    </div>
  );
  const info = (
    <div className="flex w-full items-center gap-3 text-sm">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/45">{lvl.label}</div>
        <div className="text-lg font-black text-white">
          <Clock read={readClock} />
        </div>
      </div>
      <div className="ml-auto text-right">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/45">Mistakes</div>
        <div className={`text-lg font-black tabular-nums ${game1.mistakes ? "text-red-300" : "text-white"}`}>{game1.mistakes}</div>
      </div>
      <button
        type="button"
        onClick={doPause}
        disabled={ui !== "play"}
        aria-label="Pause"
        title="Pause (P)"
        className="h-10 w-10 shrink-0 rounded-xl bg-white/10 text-sm transition enabled:hover:bg-white/20 disabled:opacity-35"
      >
        ⏸
      </button>
    </div>
  );

  const bestLine = times[game1.puzzle.difficulty] ? `Best ${lvl.label}: ${formatTime(times[game1.puzzle.difficulty] as number)}` : "";

  return (
    <div ref={root} className="absolute inset-0 overflow-hidden bg-[#0d1121] text-white" style={{ touchAction: "manipulation" }}>
      <style>{CSS}</style>
      {wide ? (
        <div className="flex h-full items-center justify-center gap-6 px-3">
          {boardEl}
          <div className="flex w-[272px] shrink-0 flex-col gap-3">
            {info}
            {tools}
            {pad(3)}
            {bestLine && <div className="text-center text-xs text-white/40">{bestLine}</div>}
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-2 py-2">
          <div className="w-full max-w-[560px] px-1">{info}</div>
          {boardEl}
          <div className="flex w-full max-w-[560px] flex-col gap-2 px-1 pb-2">
            {tools}
            {pad(9)}
          </div>
        </div>
      )}

      {ui === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={() => startNew(level)}
          accent={meta.accent}
          extra={
            <div className="mt-3 space-y-2 text-left">
              <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Difficulty">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={d.id === level}
                    onClick={() => setLevel(d.id)}
                    className={`rounded-xl border px-3 py-2 text-left transition ${d.id === level ? "border-emerald-400 bg-emerald-400/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                  >
                    <div className="text-sm font-black text-white">{d.label}</div>
                    <div className="text-[11px] text-white/50">{d.givens} clues</div>
                    <div className="text-[11px] font-semibold text-emerald-300/80">{times[d.id] ? `Best ${formatTime(times[d.id] as number)}` : "No time yet"}</div>
                  </button>
                ))}
              </div>
              {saved && (
                <SecondaryButton onClick={resume}>
                  Continue {difficultyById(saved.puzzle.difficulty).label} · {formatTime(saved.elapsed)}
                </SecondaryButton>
              )}
            </div>
          }
        />
      )}
      {ui === "paused" && <PausePanel accent={meta.accent} onResume={doPause} onRestart={restartSame} />}
      {ui === "won" && (
        <GameOverPanel
          accent={meta.accent}
          title="Solved!"
          scoreLabel="Time"
          score={formatTime(result.time)}
          best={times[result.level] ? formatTime(times[result.level] as number) : undefined}
          isBest={result.isBest}
          onRestart={() => startNew(result.level)}
        >
          <p className="mt-2 text-xs text-white/55">
            {difficultyById(result.level).label} · {result.mistakes} {result.mistakes === 1 ? "mistake" : "mistakes"} · {result.hints} {result.hints === 1 ? "hint" : "hints"}
          </p>
          {result.level === "medium" && best > 0 && <p className="mt-1 text-[11px] text-white/45">Arcade best (Medium): {formatTime(best)}</p>}
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => startNew(d.id)}
                className="rounded-lg border border-white/15 py-2 text-xs font-bold text-white/80 hover:bg-white/10"
              >
                {d.label}
              </button>
            ))}
          </div>
        </GameOverPanel>
      )}
    </div>
  );
}
