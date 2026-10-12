// 2048: slide and merge tiles. Rules live in logic.ts (pure, seeded); this file animates the board on a
// canvas (tiles slide, spawns pop in, merges pulse), handles keys and swipes, saves the game in
// progress and runs the start / win / game-over flow.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import {
  DISPLAY_FONT, Floaters, Particles, Shake, easeInOutQuad, easeOutBack, fillRoundRect, lerp, roundRect, shade, text, withAlpha,
} from "../../kit/draw";
import { formatNumber } from "../../kit/format";
import { randomSeed } from "../../kit/rng";
import { play, tone } from "../../kit/sfx";
import { clearState, loadState, saveState } from "../../kit/storage";
import { GameOverPanel, HudPill, Overlay, PrimaryButton, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import { SIZE, applyMove, maxTile, newGame, restore, serialize, undo, type Dir, type GameState, type MoveResult, type Spawn } from "./logic";

type Phase = "ready" | "playing" | "won" | "over";

const SAVE_KEY = "merge-2048:save";

// Board geometry in logical units.
const BOARD = 440;
/** Breathing room around the board inside the canvas. */
const MARGIN = 18;
const PAD = 14;
const GAP = 12;
const CELL = (BOARD - PAD * 2 - GAP * (SIZE - 1)) / SIZE;
const cellPos = (i: number) => PAD + i * (CELL + GAP);

const SLIDE = 0.11;
const POP = 0.2;
const PULSE = 0.22;

// Tile colours: a cool teal → violet ramp that ends in gold at 2048.
const PALETTE: Record<number, [string, string]> = {
  2: ["#d1fae5", "#134e4a"],
  4: ["#a7f3d0", "#134e4a"],
  8: ["#6ee7b7", "#064e3b"],
  16: ["#2dd4bf", "#042f2e"],
  32: ["#22d3ee", "#083344"],
  64: ["#38bdf8", "#082f49"],
  128: ["#818cf8", "#1e1b4b"],
  256: ["#a78bfa", "#2e1065"],
  512: ["#c084fc", "#3b0764"],
  1024: ["#e879f9", "#4a044e"],
  2048: ["#fbbf24", "#451a03"],
  4096: ["#fb923c", "#431407"],
  8192: ["#f87171", "#450a0a"],
};
const tileColors = (v: number): [string, string] => PALETTE[v] ?? ["#f1f5f9", "#0f172a"];

interface VTile {
  value: number;
  fr: number;
  fc: number;
  r: number;
  c: number;
  merged: boolean;
}
interface Anim {
  /** Seconds since the move started. */
  t: number;
  tiles: VTile[];
  /** The two tiles that fold into a merged one, shown sliding until they meet. */
  ghosts: VTile[];
  spawn: Spawn | null;
  /** Everything fades in (new game, undo, resumed save). */
  fresh: boolean;
  fxDone: boolean;
}

const DIR_VEC: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEYS: Record<string, Dir> = {
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
};

/** The board as it stands, with no motion. */
function staticAnim(g: GameState, fresh = true): Anim {
  const tiles: VTile[] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (g.grid[r][c]) tiles.push({ value: g.grid[r][c], fr: r, fc: c, r, c, merged: false });
  return { t: 99, tiles, ghosts: [], spawn: null, fresh, fxDone: true };
}

function moveAnim(res: MoveResult, spawn: Spawn | null): Anim {
  const tiles: VTile[] = [];
  const ghosts: VTile[] = [];
  for (const m of res.moves) {
    tiles.push({ value: m.value, fr: m.from[0][0], fc: m.from[0][1], r: m.to[0], c: m.to[1], merged: m.merged });
    if (m.merged) for (const f of m.from) ghosts.push({ value: m.value / 2, fr: f[0], fc: f[1], r: m.to[0], c: m.to[1], merged: false });
  }
  return { t: 0, tiles, ghosts, spawn, fresh: false, fxDone: false };
}

function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, value: number, scale = 1) {
  const [fill, ink] = tileColors(value);
  const s = CELL;
  const r = 14;
  ctx.save();
  ctx.translate(x + s / 2, y + s / 2);
  ctx.scale(scale, scale);
  if (value >= 2048) {
    // golden glow from a few widening strokes (cheaper and safer than a blur filter)
    for (let i = 5; i >= 1; i--) {
      ctx.strokeStyle = withAlpha(fill, 0.1 + (5 - i) * 0.05);
      ctx.lineWidth = i * 5;
      roundRect(ctx, -s / 2, -s / 2, s, s - 2, r + i * 2);
      ctx.stroke();
    }
  }
  fillRoundRect(ctx, -s / 2, -s / 2 + 3, s, s, r, shade(fill, -0.2));
  fillRoundRect(ctx, -s / 2, -s / 2, s, s - 2, r, fill);
  fillRoundRect(ctx, -s / 2 + 4, -s / 2 + 4, s - 8, s * 0.38, r - 4, "rgba(255,255,255,0.2)");
  const digits = String(value).length;
  const size = digits <= 2 ? 46 : digits === 3 ? 40 : digits === 4 ? 32 : digits === 5 ? 26 : 21;
  text(ctx, String(value), 0, 2, { size, color: ink, font: DISPLAY_FONT, weight: 900 });
  ctx.restore();
}

export default function Merge2048Game({ touch, best, submitScore }: GameProps) {
  const game = useRef<GameState>(newGame(randomSeed()));
  const anim = useRef<Anim>({ t: 99, tiles: [], ghosts: [], spawn: null, fresh: false, fxDone: true });
  const fx = useRef({ particles: new Particles(500), shake: new Shake(), floaters: new Floaters(), bump: 0, bumpDir: [0, 0] as [number, number], emptyT: 0 });
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [hud, setHud] = useState({ score: 0, canUndo: false, reached: false, top: 0 });
  const [result, setResult] = useState({ score: 0, isBest: false, top: 0 });
  const [confirmNew, setConfirmNew] = useState(false);
  const [saved, setSaved] = useState<GameState | null>(() => restore(loadState(SAVE_KEY)));
  const root = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.innerWidth > window.innerHeight * 1.2);
  const panelTimer = useRef(0);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const sync = useCallback(() => {
    const g = game.current;
    setHud({ score: g.score, canUndo: !!g.prev, reached: g.reached, top: maxTile(g.grid) });
  }, []);

  const begin = useCallback(
    (g: GameState) => {
      window.clearTimeout(panelTimer.current);
      game.current = g;
      anim.current = staticAnim(g);
      fx.current.particles.clear();
      fx.current.floaters.items = [];
      setConfirmNew(false);
      sync();
      play("select");
      go("playing");
    },
    [go, sync],
  );

  /** Start a fresh game. A run that was going counts toward the best. */
  const newRun = useCallback(() => {
    const g = game.current;
    if (phaseRef.current === "playing" && g.score > 0) submitScore(g.score);
    clearState(SAVE_KEY);
    setSaved(null);
    begin(newGame(randomSeed()));
  }, [begin, submitScore]);

  const resume = useCallback(() => {
    if (saved) begin(saved);
  }, [begin, saved]);

  const finish = (g: GameState) => {
    const isBest = submitScore(g.score);
    clearState(SAVE_KEY);
    setSaved(null);
    setResult({ score: g.score, isBest, top: Math.max(...g.grid.map((row) => Math.max(...row))) });
    phaseRef.current = "over";
    play("lose");
    panelTimer.current = window.setTimeout(() => setPhase("over"), 700);
  };

  const doMove = (dir: Dir) => {
    if (phaseRef.current !== "playing") return;
    const g = game.current;
    const f = fx.current;
    const t = applyMove(g, dir);
    f.bumpDir = DIR_VEC[dir];
    if (!t.moved || !t.move) {
      f.bump = 1;
      tone(150, 0.06, "square", 0.06);
      return;
    }
    anim.current = moveAnim(t.move, t.spawn);
    f.bump = 0.35;
    play("slide");
    sync();
    if (t.won) {
      submitScore(g.score);
      saveState(SAVE_KEY, serialize(g));
      phaseRef.current = "won";
      panelTimer.current = window.setTimeout(() => setPhase("won"), 650);
      return;
    }
    if (g.over) finish(g);
    else saveState(SAVE_KEY, serialize(g));
  };

  const takeBack = () => {
    const g = game.current;
    if (phaseRef.current === "ready" || phaseRef.current === "won") return;
    if (!undo(g)) {
      tone(150, 0.06, "square", 0.06);
      return;
    }
    window.clearTimeout(panelTimer.current);
    anim.current = staticAnim(g);
    saveState(SAVE_KEY, serialize(g));
    sync();
    play("flip");
    go("playing");
  };

  const keepGoing = () => {
    saveState(SAVE_KEY, serialize(game.current));
    go("playing");
  };

  const onKey = useRef<(e: KeyboardEvent) => void>(() => {});
  onKey.current = (e) => {
    const dir = KEYS[e.code];
    const p = phaseRef.current;
    if (dir) {
      e.preventDefault();
      if (!e.repeat) doMove(dir);
      return;
    }
    if (e.repeat) return;
    if (e.code === "KeyU" || e.code === "KeyZ" || e.code === "Backspace") takeBack();
    else if (e.code === "KeyR" && p === "playing") newRun();
    else if ((e.code === "Space" || e.code === "Enter") && p === "ready") newRun();
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => onKey.current(e);
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  // Swipe anywhere in the play area: fire as soon as the finger has travelled far enough.
  const swipe = useRef<{ id: number; x: number; y: number; done: boolean } | null>(null);
  const onDown = (e: ReactPointerEvent) => {
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false };
  };
  const onMove = (e: ReactPointerEvent) => {
    const s = swipe.current;
    if (!s || s.done || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 26) return;
    s.done = true;
    doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  };
  const onUp = () => {
    swipe.current = null;
  };

  useEffect(() => () => window.clearTimeout(panelTimer.current), []);

  // Wide windows put the scoreboard in a column beside the board; tall ones put it on top.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth && el.clientHeight) setWide(el.clientWidth > el.clientHeight * 1.2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The confirm prompt on "New" expires on its own.
  useEffect(() => {
    if (!confirmNew) return;
    const id = window.setTimeout(() => setConfirmNew(false), 2600);
    return () => window.clearTimeout(id);
  }, [confirmNew]);

  const draw = (ctx: CanvasRenderingContext2D, _view: View, dt: number) => {
    const a = anim.current;
    const f = fx.current;
    const ph = phaseRef.current;
    const prevT = a.t;
    a.t += dt;
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);
    f.bump = Math.max(0, f.bump - dt * 5);
    f.emptyT += dt;

    // When the slide ends: merge pops, score floaters, particles, win fanfare.
    if (!a.fxDone && prevT < SLIDE && a.t >= SLIDE) {
      a.fxDone = true;
      let top = 0;
      for (const m of a.tiles) {
        if (!m.merged) continue;
        top = Math.max(top, m.value);
        const cx = cellPos(m.c) + CELL / 2;
        const cy = cellPos(m.r) + CELL / 2;
        f.floaters.add(cx, cy - CELL * 0.35, `+${m.value}`, "#fde68a", m.value >= 128 ? 22 : 18);
        if (m.value >= 64) {
          const [fill] = tileColors(m.value);
          f.particles.burst(cx, cy, Math.min(26, 6 + Math.log2(m.value) * 2), { color: [fill, "#ffffff"], speed: 150, size: 5, life: 0.6, gravity: 220 });
        }
      }
      if (top) {
        tone(260 + Math.log2(top) * 55, 0.09, "triangle", 0.16);
        tone(390 + Math.log2(top) * 80, 0.12, "sine", 0.1, { delay: 0.05 });
        if (top >= 2048) {
          f.shake.add(0.7);
          play("win");
          const cx = BOARD / 2;
          f.particles.burst(cx, BOARD / 2, 90, { color: ["#fbbf24", "#e879f9", "#38bdf8", "#6ee7b7", "#ffffff"], speed: 380, size: 6, life: 1.3, gravity: 260, shape: "square" });
        } else if (top >= 256) f.shake.add(0.2);
      }
    }

    const [sx, sy] = f.shake.offset(8);
    const bk = f.bump * f.bump * 7;
    ctx.save();
    ctx.translate(MARGIN + sx + f.bumpDir[0] * bk, MARGIN + sy + f.bumpDir[1] * bk);

    // ---- board
    // soft drop shadow: a few stacked translucent plates under the board
    for (let i = 4; i >= 1; i--) fillRoundRect(ctx, -i * 2, i * 2.5, BOARD + i * 4, BOARD + i * 2, 22 + i * 2, `rgba(0,0,0,${0.09})`);
    fillRoundRect(ctx, 0, 0, BOARD, BOARD, 22, "#201d36");
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) fillRoundRect(ctx, cellPos(c), cellPos(r), CELL, CELL, 14, "#2c2848");

    if (ph !== "ready") {
      const s = Math.min(1, a.t / SLIDE);
      const e = easeInOutQuad(s);
      if (a.fresh) {
        const k = Math.min(1, a.t / 0.3);
        for (const t of a.tiles) drawTile(ctx, cellPos(t.c), cellPos(t.r), t.value, 0.4 + 0.6 * easeOutBack(k));
      } else {
        // sliding tiles; a merged tile exists only after its two halves have met
        if (s < 1) for (const gh of a.ghosts) drawTile(ctx, lerp(cellPos(gh.fc), cellPos(gh.c), e), lerp(cellPos(gh.fr), cellPos(gh.r), e), gh.value);
        for (const t of a.tiles) {
          if (t.merged) {
            if (s < 1) continue;
            const k = Math.min(1, (a.t - SLIDE) / PULSE);
            drawTile(ctx, cellPos(t.c), cellPos(t.r), t.value, 1 + 0.2 * Math.sin(k * Math.PI));
          } else {
            drawTile(ctx, lerp(cellPos(t.fc), cellPos(t.c), e), lerp(cellPos(t.fr), cellPos(t.r), e), t.value);
          }
        }
        if (a.spawn && a.t > SLIDE) {
          const k = Math.min(1, (a.t - SLIDE) / POP);
          drawTile(ctx, cellPos(a.spawn.c), cellPos(a.spawn.r), a.spawn.value, Math.max(0.01, easeOutBack(k)));
        }
      }
    }
    f.particles.draw(ctx);
    f.floaters.draw(ctx);
    ctx.restore();
  };

  const progress = hud.top ? Math.min(1, Math.log2(hud.top) / 11) : 0;

  return (
    <div
      ref={root}
      className={`absolute inset-0 flex ${wide ? "flex-row" : "flex-col"}`}
      style={{ background: "radial-gradient(120% 90% at 50% 0%, #1d1a33 0%, #0e0d1a 70%)" }}
    >
      <div className={wide ? "flex w-44 shrink-0 flex-col justify-center gap-2 p-3 sm:w-56 sm:gap-3 sm:p-4" : "shrink-0 px-3 pb-1 pt-2"}>
        <div className={wide ? "flex flex-col gap-2 sm:gap-3" : "flex items-center gap-2"}>
          <div className="mr-auto min-w-0">
            <div className="text-3xl font-black leading-none tracking-tight sm:text-4xl" style={{ color: meta.accent, fontFamily: DISPLAY_FONT }}>
              2048
            </div>
            <div className={`mt-1 text-[11px] text-white/45 ${wide ? "" : "hidden sm:block"}`}>
              {hud.reached ? "Past the goal: keep climbing" : "Merge your way to the 2048 tile"}
            </div>
          </div>
          <div className={wide ? "grid grid-cols-2 gap-2" : "contents"}>
            <HudPill label="Score" value={formatNumber(hud.score)} color="#fde68a" />
            <HudPill label="Best" value={formatNumber(Math.max(best, hud.score))} />
          </div>
          <div className={wide ? "grid grid-cols-2 gap-2" : "contents"}>
            <button
              type="button"
              onClick={takeBack}
              disabled={!hud.canUndo || phase === "ready"}
              className="h-11 rounded-lg bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-35 disabled:hover:bg-white/10"
            >
              ↶ Undo
            </button>
            <button
              type="button"
              onClick={() => {
                if (phase === "playing" && game.current.moves > 0 && !confirmNew) setConfirmNew(true);
                else newRun();
              }}
              className="h-11 min-w-[3.6rem] rounded-lg px-3 text-sm font-black text-black transition hover:brightness-110"
              style={{ background: confirmNew ? "#fb7185" : meta.accent }}
            >
              {confirmNew ? "Sure?" : "New"}
            </button>
          </div>
        </div>
        {/* how close the biggest tile is to the goal */}
        <div className="mt-2" aria-label="Progress to 2048">
          <div className="flex justify-between text-[10px] font-semibold uppercase tracking-widest text-white/45">
            <span>Biggest tile {hud.top ? formatNumber(hud.top) : "-"}</span>
            <span>2048</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${progress * 100}%`, background: "linear-gradient(90deg,#34d399,#818cf8,#fbbf24)" }} />
          </div>
        </div>
      </div>
      <div
        className="relative min-h-0 min-w-0 flex-1"
        style={{ touchAction: "none" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <GameCanvas width={BOARD + MARGIN * 2} height={BOARD + MARGIN * 2} draw={draw} background="transparent" />
        {touch && phase === "playing" && !wide && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-white/35">Swipe anywhere to slide</div>
        )}
        {phase === "ready" && (
          <StartPanel
            title={meta.title}
            emoji={meta.emoji}
            blurb={meta.blurb}
            controls={touch ? meta.controls.touch : meta.controls.desktop}
            onStart={newRun}
            accent={meta.accent}
            best={best ? formatNumber(best) : undefined}
            extra={
              saved ? (
                <div className="mt-4">
                  <SecondaryButton onClick={resume}>Continue game · {formatNumber(saved.score)} pts</SecondaryButton>
                </div>
              ) : undefined
            }
          />
        )}
        {phase === "won" && (
          <Overlay>
            <div className="text-5xl">🏆</div>
            <h2 className="mt-1 text-3xl font-black" style={{ color: "#fbbf24" }}>You made 2048!</h2>
            <p className="mt-2 text-sm text-white/70">Score {formatNumber(hud.score)}. Nice. Want to see how far the tiles can go?</p>
            <div className="mt-4 space-y-2">
              <PrimaryButton onClick={keepGoing} accent="#fbbf24" autoFocus>Keep going</PrimaryButton>
              <SecondaryButton onClick={newRun}>New game</SecondaryButton>
            </div>
          </Overlay>
        )}
        {phase === "over" && (
          <GameOverPanel accent={meta.accent} score={formatNumber(result.score)} best={formatNumber(best)} isBest={result.isBest} onRestart={newRun}>
            <p className="mt-2 text-xs text-white/55">Biggest tile {formatNumber(result.top)}</p>
            <div className="mt-3">
              <SecondaryButton onClick={takeBack}>↶ Undo last move</SecondaryButton>
            </div>
          </GameOverPanel>
        )}
      </div>
    </div>
  );
}
