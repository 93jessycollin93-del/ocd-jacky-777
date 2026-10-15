// Mahjong Tiles: rules and deals live in logic.ts, the layouts in layouts.ts and the tile art in art.tsx.
// This file draws the board as one SVG (so it scales to any screen), handles taps, hints, undo and shuffle,
// the timer and the start / pause / stuck / win flow, with a best time per layout.
import { memo, useCallback, useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import { useKeyPress } from "../../kit/input";
import { formatTime } from "../../kit/format";
import { mulberry32, randomSeed } from "../../kit/rng";
import { play } from "../../kit/sfx";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, Overlay, PrimaryButton, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { TileDefs } from "./art";
import { LAYOUTS, layoutById, slotsOf, type LayoutDef } from "./layouts";
import {
  canPair, findMoves, freeFlags, hint, isStuck, newGame, removePair, reshuffle, restart, undo, type Game, type Pair,
} from "./logic";
import { DEPTH, PH, PW, boardBox, shouldRotate, tilePos } from "./metrics";
import { meta } from "./meta";
import { kindName } from "./tiles";

type Phase = "ready" | "playing" | "paused" | "won";
type Bests = Record<string, number>;

const BEST_KEY = "mahjong-tiles:best";
const LAYOUT_KEY = "mahjong-tiles:layout";

interface Ghost {
  id: number;
  kind: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rot: number;
}

const CSS = `
@keyframes mj-fly { 0% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1.08); } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0.3); } }
.mj-fly { animation: mj-fly 0.52s cubic-bezier(0.35, 0, 0.8, 0.55) forwards; transform-box: fill-box; transform-origin: center; }
@keyframes mj-pop { 0% { opacity: 0; transform: scale(0.55); } 60% { opacity: 1; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
.mj-fresh { animation: mj-pop 0.36s ease-out; transform-box: fill-box; transform-origin: center; }
@keyframes mj-hint { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.75; } }
.mj-hint { animation: mj-hint 0.55s ease-in-out infinite; }
@keyframes mj-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
.mj-shake { animation: mj-shake 0.26s ease-in-out; }
@keyframes mj-spark { 0% { opacity: 1; transform: translate(0, 0) scale(1); } 100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0.2); } }
.mj-spark { animation: mj-spark 0.55s ease-out forwards; }
@keyframes mj-shuf { 0% { opacity: 1; } 40% { opacity: 0.05; } 60% { opacity: 0.05; } 100% { opacity: 1; } }
.mj-shuf { animation: mj-shuf 0.5s ease-in-out; }
@keyframes mj-rise { 0% { opacity: 0; transform: translate(-50%, 12px); } 100% { opacity: 1; transform: translate(-50%, 0); } }
.mj-rise { animation: mj-rise 0.25s ease-out both; }
@media (prefers-reduced-motion: reduce) { .mj-fly, .mj-fresh, .mj-hint, .mj-shuf, .mj-spark { animation-duration: 0.01s; } }
`;

// ---------------------------------------------------------------------------------------------------------

function TileBody({ kind }: { kind: number }) {
  return (
    <>
      <rect x={DEPTH} y={DEPTH} width={PW} height={PH} rx={7} fill="url(#mj-jade)" stroke="#0f4f40" strokeWidth={0.8} />
      <rect x={DEPTH * 0.5} y={DEPTH * 0.5} width={PW} height={PH} rx={7} fill="#2d977b" />
      <rect x={0} y={0} width={PW} height={PH} rx={7} fill="url(#mj-ivory)" stroke="#b4a36f" strokeWidth={1} />
      <rect x={2.6} y={2.6} width={PW - 5.2} height={PH - 5.2} rx={5} fill="none" stroke="rgba(160,140,90,0.28)" strokeWidth={1} />
      <use href={`#mj-k${kind}`} />
    </>
  );
}

interface TileProps {
  i: number;
  x: number;
  y: number;
  kind: number;
  free: boolean;
  sel: boolean;
  hint: boolean;
  cand: boolean;
  fresh: boolean;
  shake: boolean;
  onTap: (i: number) => void;
}

const TileView = memo(function TileView({ i, x, y, kind, free, sel, hint: hinted, cand, fresh, shake, onTap }: TileProps) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ cursor: free ? "pointer" : "default" }}
      onClick={() => onTap(i)}
      role={free ? "button" : undefined}
      aria-label={free ? kindName(kind) : undefined}
    >
      <g className={fresh ? "mj-fresh" : shake ? "mj-shake" : undefined}>
        <TileBody kind={kind} />
        {!free && <rect width={PW} height={PH} rx={7} fill="#0b1f2a" opacity={0.2} pointerEvents="none" />}
        {cand && !sel && <rect x={1.5} y={1.5} width={PW - 3} height={PH - 3} rx={6} fill="rgba(52,211,153,0.16)" stroke="#34d399" strokeWidth={2.4} pointerEvents="none" />}
        {sel && <rect x={1.5} y={1.5} width={PW - 3} height={PH - 3} rx={6} fill="rgba(250,204,21,0.4)" stroke="#f59e0b" strokeWidth={3.4} pointerEvents="none" />}
        {hinted && <rect className="mj-hint" x={1.5} y={1.5} width={PW - 3} height={PH - 3} rx={6} fill="#67e8f9" stroke="#0891b2" strokeWidth={3.4} pointerEvents="none" />}
      </g>
    </g>
  );
});

const SPARKS = [0, 1, 2, 3, 4, 5].map((k) => {
  const a = (k / 6) * Math.PI * 2 + 0.4;
  return { sx: Math.cos(a) * 46, sy: Math.sin(a) * 46 };
});

function GhostView({ g }: { g: Ghost }) {
  return (
    <g transform={`translate(${g.x} ${g.y})`} pointerEvents="none">
      <g className="mj-fly" style={{ "--dx": `${g.dx}px`, "--dy": `${g.dy}px`, "--rot": `${g.rot}deg` } as CSSProperties}>
        <TileBody kind={g.kind} />
      </g>
      {SPARKS.map((s, k) => (
        <circle
          key={k}
          className="mj-spark"
          cx={PW / 2}
          cy={PH / 2}
          r={3.2}
          fill={k % 2 ? "#fde68a" : "#5eead4"}
          style={{ "--sx": `${s.sx}px`, "--sy": `${s.sy}px` } as CSSProperties}
        />
      ))}
    </g>
  );
}

/** A tiny picture of a layout for the start panel. */
function Thumb({ layout }: { layout: LayoutDef }) {
  const slots = slotsOf(layout);
  let w = 0;
  let h = 0;
  for (const s of slots) {
    w = Math.max(w, s.x + 2);
    h = Math.max(h, s.y + 2);
  }
  const top = layout.layers.length;
  const shades = ["#7dd3c0", "#a7e9d8", "#d6f5ec", "#f3fbf7", "#ffffff"];
  return (
    <svg viewBox={`${-top * 0.4 - 0.3} ${-top * 0.4 - 0.3} ${w + top * 0.4 + 0.8} ${h + top * 0.4 + 0.8}`} className="h-12 w-full" aria-hidden="true">
      {slots.map((s, i) => (
        <rect key={i} x={s.x - s.z * 0.4} y={s.y - s.z * 0.4} width={1.8} height={1.8} rx={0.3} fill={shades[Math.min(s.z, shades.length - 1)]} stroke="#0f766e" strokeWidth={0.22} />
      ))}
    </svg>
  );
}

function useBox(ref: React.RefObject<HTMLElement>) {
  const [box, setBox] = useState({ w: 800, h: 500 });
  useEffect(() => {
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

function cleanBests(raw: unknown): Bests {
  const out: Bests = {};
  if (raw && typeof raw === "object") {
    for (const l of LAYOUTS) {
      const v = (raw as Record<string, unknown>)[l.id];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) out[l.id] = v;
    }
  }
  return out;
}

function HudBtn({ icon, label, onClick, disabled, compact, primary }: { icon: string; label: string; onClick: () => void; disabled?: boolean; compact?: boolean; primary?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg border font-bold text-white transition active:scale-95 disabled:opacity-35 ${
        primary ? "border-teal-300/60 bg-teal-500/30 hover:bg-teal-500/40" : "border-white/20 bg-white/10 hover:bg-white/20"
      } ${compact ? "h-8 min-w-8 px-2 text-sm" : "h-9 px-3 text-sm"}`}
    >
      <span aria-hidden="true">{icon}</span>
      {!compact && <span>{label}</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------------------------------------

export default function MahjongTilesGame({ touch, best, submitScore }: GameProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [layoutId, setLayoutId] = useState<string>(() => {
    const saved = loadState<string>(LAYOUT_KEY);
    return LAYOUTS.some((l) => l.id === saved) ? (saved as string) : LAYOUTS[0].id;
  });
  const [bests, setBests] = useState<Bests>(() => cleanBests(loadState(BEST_KEY)));
  const game = useRef<Game | null>(null);
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [selected, setSelected] = useState<number | null>(null);
  const [hinted, setHinted] = useState<Pair | null>(null);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [fresh, setFresh] = useState<number[]>([]);
  const [shakeTile, setShakeTile] = useState<number | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [result, setResult] = useState({ time: 0, isBest: false, prev: 0, name: "", moves: 0, undos: 0, shuffles: 0 });

  const root = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const rootBox = useBox(root);
  const areaBox = useBox(area);
  const rng = useRef(mulberry32(randomSeed()));
  const timers = useRef<number[]>([]);
  const ghostId = useRef(0);
  const clock = useRef({ acc: 0, last: 0 });
  const tally = useRef({ moves: 0, undos: 0, shuffles: 0 });

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const say = useCallback((text: string) => {
    setToast(text);
    later(() => setToast((t) => (t === text ? null : t)), 1500);
  }, [later]);

  // ---- clock: counts real time only while playing
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      if (phaseRef.current === "playing") clock.current.acc += now - clock.current.last;
      clock.current.last = now;
      setElapsed(Math.floor(clock.current.acc / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && phaseRef.current === "playing") go("paused");
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [go]);

  // ---- starting
  const begin = useCallback(
    (id: string) => {
      const layout = layoutById(id);
      const rotated = shouldRotate(layout, areaBox.w, areaBox.h);
      game.current = newGame(layout, rotated, randomSeed());
      tally.current = { moves: 0, undos: 0, shuffles: 0 };
      clock.current = { acc: 0, last: performance.now() };
      setElapsed(0);
      setSelected(null);
      setHinted(null);
      setGhosts([]);
      setFresh([]);
      saveState(LAYOUT_KEY, id);
      go("playing");
      play("select");
    },
    [areaBox.w, areaBox.h, go],
  );

  const g = game.current;

  const win = (gm: Game) => {
    const c = clock.current;
    c.acc += performance.now() - c.last;
    c.last = performance.now();
    const time = Math.max(1, Math.round(c.acc / 1000));
    const prev = bests[gm.layoutId] ?? 0;
    let isBest = !prev || time < prev;
    if (isBest) {
      const next = { ...bests, [gm.layoutId]: time };
      setBests(next);
      saveState(BEST_KEY, next);
    }
    // The leaderboard score is the best time on the first layout.
    if (gm.layoutId === LAYOUTS[0].id) isBest = submitScore(time) || isBest;
    setResult({ time, isBest, prev, name: layoutById(gm.layoutId).name, ...tally.current });
    play("win");
    phaseRef.current = "won"; // stop the clock now; the panel appears once the last pair has flown away
    later(() => go("won"), 800);
  };

  // ---- actions
  const onTap = (i: number) => {
    const gm = game.current;
    if (phaseRef.current !== "playing" || !gm || gm.gone[i]) return;
    const free = freeFlags(gm);
    if (!free[i]) {
      setShakeTile(i);
      later(() => setShakeTile((s) => (s === i ? null : s)), 300);
      play("error");
      return;
    }
    setHinted(null);
    if (selected === null) {
      setSelected(i);
      play("blip");
      return;
    }
    if (selected === i) {
      setSelected(null);
      play("click");
      return;
    }
    if (!canPair(gm, selected, i)) {
      // Not a match: the new tile becomes the selected one.
      setSelected(i);
      play("blip", 0.8);
      return;
    }
    const a = selected;
    const kinds = [gm.faces[a], gm.faces[i]];
    removePair(gm, a, i);
    tally.current.moves++;
    const added: Ghost[] = [a, i].map((slot, k) => {
      const p = tilePos(gm.board.slots[slot]);
      return { id: ++ghostId.current, kind: kinds[k], x: p.x, y: p.y, dx: (k ? 1 : -1) * (40 + Math.random() * 40), dy: -70 - Math.random() * 40, rot: (k ? 1 : -1) * (15 + Math.random() * 25) };
    });
    setGhosts((cur) => [...cur, ...added]);
    later(() => setGhosts((cur) => cur.filter((x) => !added.includes(x))), 650);
    setSelected(null);
    play("match");
    if (gm.remaining === 0) win(gm);
    else if (isStuck(gm)) later(() => play("lose", 1), 500);
    bump();
  };

  const doHint = () => {
    const gm = game.current;
    if (phaseRef.current !== "playing" || !gm) return;
    const h = hint(gm, rng.current);
    if (!h) {
      say("No moves left");
      return;
    }
    setSelected(null);
    setHinted(h);
    play("coin");
    later(() => setHinted((cur) => (cur === h ? null : cur)), 2200);
  };

  const doUndo = () => {
    const gm = game.current;
    if (phaseRef.current !== "playing" || !gm) return;
    const p = undo(gm);
    if (!p) {
      say("Nothing to undo");
      return;
    }
    tally.current.undos++;
    tally.current.moves = Math.max(0, tally.current.moves - 1);
    setSelected(null);
    setHinted(null);
    setFresh(p);
    later(() => setFresh([]), 450);
    play("slide");
    bump();
  };

  const doShuffle = () => {
    const gm = game.current;
    if (phaseRef.current !== "playing" || !gm) return;
    if (!reshuffle(gm, rng.current)) {
      say("Too few tiles to shuffle");
      return;
    }
    tally.current.shuffles++;
    setSelected(null);
    setHinted(null);
    setShuffling(true);
    later(() => setShuffling(false), 520);
    play("swoosh");
    bump();
  };

  const doRestart = () => {
    const gm = game.current;
    if (!gm) return;
    restart(gm);
    tally.current = { moves: 0, undos: 0, shuffles: 0 };
    clock.current = { acc: 0, last: performance.now() };
    setElapsed(0);
    setSelected(null);
    setHinted(null);
    setGhosts([]);
    go("playing");
    play("select");
    bump();
  };

  const togglePause = () => {
    if (phaseRef.current === "playing") go("paused");
    else if (phaseRef.current === "paused") {
      clock.current.last = performance.now();
      go("playing");
    }
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if (code === "KeyP" || code === "Escape") togglePause();
    else if (p === "playing") {
      if (code === "KeyH") doHint();
      else if (code === "KeyU" || code === "Backspace") doUndo();
      else if (code === "KeyS") doShuffle();
    }
  });

  // ---- derived for drawing
  const free = g ? freeFlags(g) : [];
  const moves = g && phase !== "won" ? findMoves(g) : [];
  const stuck = !!g && g.remaining > 0 && moves.length === 0 && phase === "playing";
  const partners = new Set<number>();
  if (selected !== null) for (const [a, b] of moves) {
    if (a === selected) partners.add(b);
    else if (b === selected) partners.add(a);
  }
  const box = g ? boardBox(g.board.slots) : { x: 0, y: 0, w: 100, h: 100 };

  const landscapePhone = rootBox.h < 440;
  const narrow = rootBox.w < 560 && !landscapePhone;
  const compact = landscapePhone || narrow;
  const layout = layoutById(layoutId);
  const actions = (
    <>
      <HudBtn icon="💡" label="Hint" onClick={doHint} disabled={phase !== "playing" || stuck} compact={landscapePhone} />
      <HudBtn icon="↶" label="Undo" onClick={doUndo} disabled={phase !== "playing" || !g || g.history.length === 0} compact={landscapePhone} />
      <HudBtn icon="🔀" label="Shuffle" onClick={doShuffle} disabled={phase !== "playing" || !g || g.remaining < 4} compact={landscapePhone} primary={stuck} />
    </>
  );

  return (
    <div
      ref={root}
      className="absolute inset-0 flex select-none flex-col text-white"
      style={{ background: "radial-gradient(ellipse at 50% 45%, #14675a 0%, #0c4a43 55%, #072a2d 100%)", touchAction: "manipulation" }}
    >
      <style>{CSS}</style>

      {/* top strip */}
      <div className={`flex shrink-0 items-center gap-2 bg-black/30 px-2 ${landscapePhone ? "h-9" : "h-12"}`}>
        <HudBtn icon="⏸" label="Pause" onClick={togglePause} disabled={phase !== "playing" && phase !== "paused"} compact={compact} />
        <div className="min-w-0 flex-1 truncate text-center leading-tight">
          <span className="text-lg font-black tabular-nums">⏱ {formatTime(elapsed)}</span>
          <span className="ml-3 text-xs text-white/75 sm:text-sm">
            Pairs left <b className="tabular-nums text-white">{g ? g.remaining / 2 : 72}</b>
          </span>
          <span className="ml-3 text-xs text-white/75 sm:text-sm">
            Moves <b className={`tabular-nums ${stuck ? "text-rose-300" : "text-teal-200"}`}>{moves.length}</b>
          </span>
        </div>
        {!narrow && <div className="flex gap-2">{actions}</div>}
      </div>

      {/* board */}
      <div ref={area} className="relative min-h-0 flex-1">
        {g && (
          <svg
            viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full"
            style={{ visibility: phase === "paused" ? "hidden" : "visible" }}
            aria-label="Mahjong board"
          >
            <TileDefs />
            <g className={shuffling ? "mj-shuf" : undefined}>
              {g.board.slots.map((s, i) => {
                if (g.gone[i]) return null;
                const p = tilePos(s);
                return (
                  <TileView
                    key={i}
                    i={i}
                    x={p.x}
                    y={p.y}
                    kind={g.faces[i]}
                    free={free[i]}
                    sel={selected === i}
                    hint={!!hinted && (hinted[0] === i || hinted[1] === i)}
                    cand={partners.has(i)}
                    fresh={fresh.includes(i)}
                    shake={shakeTile === i}
                    onTap={onTap}
                  />
                );
              })}
            </g>
            {ghosts.map((gh) => <GhostView key={gh.id} g={gh} />)}
          </svg>
        )}

        {toast && (
          <div className="mj-rise pointer-events-none absolute bottom-3 left-1/2 z-10 rounded-full bg-black/70 px-4 py-1.5 text-sm font-bold" role="status">
            {toast}
          </div>
        )}

        {stuck && (
          <div className="mj-rise absolute bottom-2 left-1/2 z-10 w-[min(92%,26rem)] rounded-2xl border border-rose-300/40 bg-zinc-950/90 p-3 text-center shadow-2xl">
            <div className="text-base font-black text-rose-200">No moves left</div>
            <p className="mt-0.5 text-xs text-white/65">Shuffle the remaining tiles (the board stays solvable), undo, or restart.</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button type="button" onClick={doShuffle} className="rounded-lg bg-teal-400 py-2 text-sm font-black text-black active:scale-95">🔀 Shuffle</button>
              <button type="button" onClick={doUndo} disabled={!g || g.history.length === 0} className="rounded-lg border border-white/25 py-2 text-sm font-bold disabled:opacity-40 active:scale-95">↶ Undo</button>
              <button type="button" onClick={doRestart} className="rounded-lg border border-white/25 py-2 text-sm font-bold active:scale-95">Restart</button>
            </div>
          </div>
        )}
      </div>

      {/* bottom bar on narrow phones */}
      {narrow && <div className="grid shrink-0 grid-cols-3 gap-2 bg-black/30 p-2 [&>button]:h-11 [&>button]:w-full">{actions}</div>}

      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={() => begin(layoutId)}
          accent={meta.accent}
          best={best ? formatTime(best) : undefined}
          bestLabel={`Best time (${LAYOUTS[0].name})`}
          extra={
            <div className="mt-3 text-left">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/50">Layout</div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={l.id === layoutId}
                    onClick={() => setLayoutId(l.id)}
                    className={`w-[5.6rem] shrink-0 rounded-xl border p-1.5 text-center transition ${l.id === layoutId ? "border-teal-300 bg-teal-400/15" : "border-white/15 bg-white/5 hover:bg-white/10"}`}
                  >
                    <Thumb layout={l} />
                    <div className="mt-0.5 truncate text-xs font-black">{l.name}</div>
                    <div className="text-[10px] text-white/55">{bests[l.id] ? formatTime(bests[l.id]) : "no time yet"}</div>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-white/55">{layout.blurb}</p>
            </div>
          }
        />
      )}

      {phase === "paused" && (
        <Overlay>
          <h2 className="text-2xl font-black">Paused</h2>
          <p className="mt-1 text-xs text-white/55">Time {formatTime(elapsed)} · the board is hidden while paused.</p>
          <div className="mt-4 space-y-2">
            <PrimaryButton onClick={togglePause} accent={meta.accent} autoFocus>Resume</PrimaryButton>
            <SecondaryButton onClick={doRestart}>Restart this deal</SecondaryButton>
            <SecondaryButton onClick={() => go("ready")}>Menu (leave this game)</SecondaryButton>
          </div>
        </Overlay>
      )}

      {phase === "won" && (
        <GameOverPanel
          accent={meta.accent}
          title="Board cleared!"
          scoreLabel={`Time on ${result.name}`}
          score={formatTime(result.time)}
          isBest={result.isBest}
          best={!result.isBest && result.prev ? formatTime(result.prev) : undefined}
          onRestart={() => begin(game.current?.layoutId ?? layoutId)}
        >
          <p className="mt-2 text-xs text-white/55">{result.moves} moves · {result.undos} {result.undos === 1 ? "undo" : "undos"} · {result.shuffles} {result.shuffles === 1 ? "shuffle" : "shuffles"}</p>
          <div className="mt-3">
            <SecondaryButton onClick={() => go("ready")}>Menu</SecondaryButton>
          </div>
        </GameOverPanel>
      )}
    </div>
  );
}
