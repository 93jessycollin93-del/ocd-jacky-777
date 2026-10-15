// Sea Battle: rules and the computer admirals in logic.ts; this file is the DOM board, ship placement, the
// turn-by-turn battle with splashes and fire, and the start / end panels.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { play, noise, tone } from "../../kit/sfx";
import { mulberry32, randomSeed } from "../../kit/rng";
import { loadState, saveState } from "../../kit/storage";
import { useKeyPress } from "../../kit/input";
import { GameOverPanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import {
  FLEET, HIT, MISS, N, SHIP_NAMES, SUNK, aiShot, allSunk, canPlace, fireAt, newBoard, randomFleet, shipCells, shipsLeft,
  type Board, type Difficulty, type Ship,
} from "./logic";

type Phase = "ready" | "setup" | "battle" | "over";
type WinRecord = { [k in Difficulty]?: { won: number; lost: number } };

const LEVELS: { id: Difficulty; label: string; note: string }[] = [
  { id: "easy", label: "Easy", note: "Fires wild" },
  { id: "normal", label: "Normal", note: "Hunts in a checkerboard" },
  { id: "hard", label: "Hard", note: "Works out where you are" },
];

function useBox(ref: React.RefObject<HTMLElement>) {
  const [box, setBox] = useState({ w: 800, h: 600 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(read);
    ro.observe(el);
    read();
    return () => ro.disconnect();
  }, [ref]);
  return box;
}

/** One grid. `reveal` shows ships (yours); `onCell` makes cells clickable. */
function Grid({
  board, ships, reveal, size, onCell, onHover, preview, previewOk, flash, label, disabled,
}: {
  board: Board | null;
  ships: Ship[];
  reveal: boolean;
  size: number;
  onCell?: (i: number) => void;
  onHover?: (i: number | null) => void;
  preview?: number[] | null;
  previewOk?: boolean;
  flash?: number | null;
  label: string;
  disabled?: boolean;
}) {
  const cell = size / N;
  const owner = new Map<number, number>();
  ships.forEach((s, si) => s.cells.forEach((c) => owner.set(c, si)));
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-white/60">{label}</div>
      <div
        className="relative grid overflow-hidden rounded-lg border border-sky-300/30 bg-[linear-gradient(160deg,#0c4a6e,#082f49)]"
        style={{ width: size, height: size, gridTemplateColumns: `repeat(${N}, 1fr)` }}
        onMouseLeave={() => onHover?.(null)}
      >
        {Array.from({ length: N * N }, (_, i) => {
          const shot = board ? board.shots[i] : 0;
          const si = owner.get(i);
          const showShip = si !== undefined && (reveal || shot === SUNK);
          const inPreview = preview?.includes(i);
          const sunkShip = shot === SUNK;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled || !onCell}
              onClick={() => onCell?.(i)}
              onMouseEnter={() => onHover?.(i)}
              className={`relative border-[0.5px] border-sky-200/10 ${onCell && !disabled ? "hover:bg-sky-300/20" : ""}`}
              style={{ width: cell, height: cell }}
              aria-label={`Row ${Math.floor(i / N) + 1}, column ${(i % N) + 1}`}
            >
              {showShip && (
                <span className={`absolute inset-[3px] rounded-[30%] ${sunkShip ? "bg-rose-950/90 ring-1 ring-rose-400/70" : "bg-slate-300/85 ring-1 ring-slate-100/60"}`} />
              )}
              {inPreview && <span className={`absolute inset-[3px] rounded-[30%] ${previewOk ? "bg-emerald-300/60" : "bg-rose-400/60"}`} />}
              {shot === MISS && <span className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-200/70" />}
              {(shot === HIT || shot === SUNK) && (
                <span className="absolute inset-0 flex items-center justify-center" style={{ fontSize: cell * 0.62 }}>
                  {shot === HIT ? "🔥" : "✖"}
                </span>
              )}
              {flash === i && <span className="absolute inset-0 animate-ping rounded-full bg-amber-200/50" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Tracker({ board, title }: { board: Board; title: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-[11px]">
      <div className="mb-0.5 font-semibold text-white/70">{title}</div>
      {board.ships.map((s, i) => (
        <div key={i} className={`flex items-center gap-1.5 ${s.hits >= s.len ? "text-white/30 line-through" : "text-white/80"}`}>
          <span className="flex gap-[2px]">
            {Array.from({ length: s.len }, (_, k) => (
              <span key={k} className={`h-2 w-2 rounded-sm ${s.hits >= s.len ? "bg-rose-500/50" : "bg-slate-300/80"}`} />
            ))}
          </span>
          {SHIP_NAMES[i]}
        </div>
      ))}
    </div>
  );
}

export default function SeaBattle({ touch, best, submitScore }: GameProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [level, setLevel] = useState<Difficulty>("normal");
  const [fleet, setFleet] = useState<Ship[]>([]);
  const [selected, setSelected] = useState<number>(0);
  const [horizontal, setHorizontal] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState({ won: false, shots: 0, isBest: false });
  const [lastAi, setLastAi] = useState<number | null>(null);
  const [view, setView] = useState<"enemy" | "mine">("enemy");
  const game = useRef<{ mine: Board; enemy: Board; rng: ReturnType<typeof mulberry32>; turn: "you" | "ai"; shots: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const { w: width, h: height } = useBox(root);
  // Short screens (a phone held sideways) put the controls and trackers beside the grids.
  const short = height < 520;
  const record = useRef<WinRecord>(loadState<WinRecord>("sea-battle:record") ?? {});

  const toSetup = useCallback(() => {
    setFleet([]);
    setSelected(0);
    setPhase("setup");
    play("select");
  }, []);

  useKeyPress((code) => {
    if (code === "KeyR" && phase === "setup") setHorizontal((h) => !h);
  });

  const placedLens = fleet.map((s) => s.len);
  const remainingIdx = FLEET.map((len, i) => i).filter((i) => fleet.filter((s) => s.len === FLEET[i]).length < FLEET.slice(0, i + 1).filter((l) => l === FLEET[i]).length);
  const nextLen = remainingIdx.includes(selected) ? FLEET[selected] : remainingIdx.length ? FLEET[remainingIdx[0]] : 0;
  const preview = phase === "setup" && hover !== null && nextLen ? shipCells(nextLen, Math.floor(hover / N), hover % N, horizontal) : null;
  const previewOk = !!preview && canPlace(fleet, preview);

  const place = (i: number) => {
    const at = fleet.findIndex((s) => s.cells.includes(i));
    if (at >= 0) {
      // Tap a placed ship to pick it back up.
      const lenIdx = FLEET.findIndex((l, k) => l === fleet[at].len && !remainingIdx.includes(k));
      setFleet(fleet.filter((_, k) => k !== at));
      setSelected(lenIdx >= 0 ? lenIdx : 0);
      play("click");
      return;
    }
    if (!nextLen) return;
    const cells = shipCells(nextLen, Math.floor(i / N), i % N, horizontal);
    if (!canPlace(fleet, cells)) {
      play("error");
      return;
    }
    const next = [...fleet, { len: nextLen, cells: cells!, hits: 0 }];
    setFleet(next);
    play("place");
    const left = FLEET.map((_, k) => k).filter((k) => next.filter((s) => s.len === FLEET[k]).length < FLEET.slice(0, k + 1).filter((l) => l === FLEET[k]).length);
    setSelected(left[0] ?? 0);
  };

  const startBattle = () => {
    const seed = randomSeed();
    const rng = mulberry32(seed);
    // Keep ships in fleet order so the trackers line up with the names.
    const ordered = [...fleet].sort((a, b) => b.len - a.len);
    game.current = { mine: newBoard(ordered), enemy: newBoard(randomFleet(rng)), rng, turn: "you", shots: 0 };
    setStatus("Your shot: pick a square in the enemy sea");
    setLastAi(null);
    setView("enemy");
    setPhase("battle");
    play("select");
  };

  const finish = (won: boolean) => {
    const g = game.current!;
    const rec = record.current;
    const r = rec[level] ?? { won: 0, lost: 0 };
    rec[level] = won ? { ...r, won: r.won + 1 } : { ...r, lost: r.lost + 1 };
    saveState("sea-battle:record", rec);
    const isBest = won ? submitScore(g.shots) : false;
    setResult({ won, shots: g.shots, isBest });
    play(won ? "win" : "lose");
    window.setTimeout(() => setPhase("over"), 900);
  };

  const shoot = (i: number) => {
    const g = game.current;
    if (!g || phase !== "battle" || g.turn !== "you") return;
    const r = fireAt(g.enemy, i);
    if (r.type === "repeat") return;
    g.shots++;
    if (r.type === "miss") {
      noise(0.3, 0.05, { type: "bandpass", freq: 900 });
      setStatus("Splash. Their turn…");
    } else if (r.type === "hit") {
      play("explode");
      setStatus("Hit! Their turn…");
    } else {
      play("explode");
      tone(180, 0.5, "sawtooth", 0.06, { slide: 60 });
      setStatus(`You sank their ${SHIP_NAMES[r.ship].toLowerCase()}!`);
    }
    setTick((t) => t + 1);
    if (allSunk(g.enemy)) {
      finish(true);
      return;
    }
    g.turn = "ai";
  };

  // The computer answers each shot after a short pause; on narrow screens the view swaps to your fleet to show it.
  const g = game.current;
  const aiTurn = phase === "battle" && g?.turn === "ai";
  const narrow = width < 640;
  useEffect(() => {
    if (!aiTurn || !game.current) return;
    const s = game.current;
    const a = window.setTimeout(() => {
      if (narrow) setView("mine");
      const i = aiShot(level, s.mine.shots, shipsLeft(s.mine), s.rng);
      const r = fireAt(s.mine, i);
      setLastAi(i);
      if (r.type === "miss") {
        noise(0.25, 0.04, { type: "bandpass", freq: 700 });
        setStatus("They missed. Your shot");
      } else if (r.type === "hit") {
        play("hurt");
        setStatus("They hit your ship! Your shot");
      } else if (r.type === "sunk") {
        play("hurt");
        setStatus(`They sank your ${SHIP_NAMES[r.ship].toLowerCase()}! Your shot`);
      }
      if (allSunk(s.mine)) {
        finish(false);
        return;
      }
      s.turn = "you";
      setTick((t) => t + 1);
      if (narrow) window.setTimeout(() => setView("enemy"), 900);
    }, narrow ? 500 : 650);
    return () => window.clearTimeout(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiTurn]);

  // ---- sizes
  const big = Math.floor(Math.min(narrow ? width - 24 : (width - (short ? 230 : 80)) / 2, short ? height - 72 : narrow ? height - 250 : height - 150, 440) / N) * N;
  const setupSize = Math.floor(Math.min(width - (short ? 260 : 24), height - (short ? 50 : 170), 420) / N) * N;
  const mini = Math.floor(Math.min(width * 0.36, 150) / N) * N;
  const rec = record.current[level];

  return (
    <div ref={root} className="absolute inset-0 overflow-y-auto bg-[radial-gradient(ellipse_at_top,#0c4a6e_0%,#06223a_55%,#020c16_100%)] text-white">
      {phase === "setup" && (
        <div className={`flex min-h-full items-center justify-center gap-3 p-3 ${short ? "flex-row" : "flex-col"}`}>
          <div className={`flex flex-col items-center gap-2 ${short ? "order-2 max-w-[230px]" : "contents"}`}>
          <h2 className="text-lg font-black">Place your fleet</h2>
          <div className="flex flex-wrap justify-center gap-1.5">
            {FLEET.map((len, i) => {
              const done = !remainingIdx.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={done}
                  onClick={() => setSelected(i)}
                  className={`rounded-lg border px-2 py-1 text-xs ${done ? "border-white/10 text-white/30 line-through" : selected === i ? "border-emerald-300 bg-emerald-300/20" : "border-white/20"}`}
                >
                  {SHIP_NAMES[i]} · {len}
                </button>
              );
            })}
          </div>
          </div>
          <Grid
            board={null}
            ships={fleet}
            reveal
            size={setupSize}
            onCell={place}
            onHover={setHover}
            preview={touch ? null : preview}
            previewOk={previewOk}
            label={nextLen ? `Place your ${SHIP_NAMES[FLEET.indexOf(nextLen)].toLowerCase()} (${nextLen})` : "Fleet ready"}
          />
          <div className={`flex flex-col items-center gap-2 ${short ? "order-3 max-w-[230px]" : "contents"}`}>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => setHorizontal((h) => !h)} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm">⟳ {horizontal ? "Across" : "Down"}</button>
            <button type="button" onClick={() => { setFleet([...randomFleet(mulberry32(randomSeed()))]); play("slide"); }} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm">🎲 Random</button>
            <button type="button" onClick={() => { setFleet([]); setSelected(0); }} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm">Clear</button>
            <button
              type="button"
              disabled={placedLens.length < FLEET.length}
              onClick={startBattle}
              className="rounded-lg bg-sky-400 px-4 py-1.5 text-sm font-black text-black disabled:opacity-40"
            >
              Battle!
            </button>
          </div>
          <p className="text-center text-[11px] text-white/45">Ships can't touch, not even at the corners. Tap a placed ship to move it.</p>
          </div>
        </div>
      )}

      {(phase === "battle" || phase === "over") && g && (
        <div className="flex min-h-full flex-col items-center justify-center gap-3 p-3">
          <div className="min-h-[1.25rem] text-center text-sm font-semibold">{status}</div>
          {narrow ? (
            <>
              {view === "enemy" ? (
                <Grid board={g.enemy} ships={g.enemy.ships} reveal={phase === "over"} size={big} onCell={shoot} disabled={g.turn !== "you" || phase !== "battle"} label={`Enemy sea · ${g.shots} shots`} />
              ) : (
                <Grid board={g.mine} ships={g.mine.ships} reveal size={big} flash={lastAi} label="Your fleet" />
              )}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1">
                  {view === "enemy"
                    ? <Grid board={g.mine} ships={g.mine.ships} reveal size={mini} flash={lastAi} label="Your fleet" />
                    : <Grid board={g.enemy} ships={g.enemy.ships} reveal={false} size={mini} label="Enemy" />}
                  <button type="button" onClick={() => setView(view === "enemy" ? "mine" : "enemy")} className="rounded-md border border-white/20 px-2 py-0.5 text-[11px]">
                    ⇄ Show {view === "enemy" ? "your fleet" : "enemy sea"}
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  <Tracker board={g.enemy} title="Enemy fleet" />
                  <Tracker board={g.mine} title="Your fleet" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={`flex items-start ${short ? "gap-4" : "gap-8"}`}>
                <Grid board={g.mine} ships={g.mine.ships} reveal size={big} flash={lastAi} label="Your fleet" />
                <Grid board={g.enemy} ships={g.enemy.ships} reveal={phase === "over"} size={big} onCell={shoot} disabled={g.turn !== "you" || phase !== "battle"} label={`Enemy sea · ${g.shots} shots`} />
                {short && (
                  <div className="flex flex-col gap-2 pt-5">
                    <Tracker board={g.mine} title="Your fleet" />
                    <Tracker board={g.enemy} title="Enemy fleet" />
                  </div>
                )}
              </div>
              {!short && (
                <div className="flex gap-3">
                  <Tracker board={g.mine} title="Your fleet" />
                  <Tracker board={g.enemy} title="Enemy fleet" />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={toSetup}
          accent={meta.accent}
          best={best || undefined}
          bestLabel="Fewest shots to win"
          extra={
            <div className="mt-3">
              <div className="mb-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">Admiral</div>
              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map((l) => (
                  <button key={l.id} type="button" onClick={() => setLevel(l.id)} className={`rounded-lg border px-1 py-2 text-xs ${level === l.id ? "border-sky-400 bg-sky-400/20" : "border-white/15 bg-white/5"}`}>
                    <div className="font-bold">{l.label}</div>
                    <div className="text-[10px] text-white/50">{l.note}</div>
                  </button>
                ))}
              </div>
              {rec && <p className="mt-2 text-xs text-white/55">Your record vs {level}: {rec.won} won · {rec.lost} lost</p>}
            </div>
          }
        />
      )}
      {phase === "over" && (
        <GameOverPanel
          title={result.won ? "Victory at sea!" : "Your fleet is sunk"}
          accent={meta.accent}
          score={result.won ? `${result.shots} shots` : "—"}
          scoreLabel={result.won ? "Shots to win" : "Result"}
          best={best || undefined}
          isBest={result.isBest}
          onRestart={toSetup}
        >
          <p className="mt-2 text-xs text-white/55">Record vs {level}: {record.current[level]?.won ?? 0} won · {record.current[level]?.lost ?? 0} lost</p>
        </GameOverPanel>
      )}
    </div>
  );
}
