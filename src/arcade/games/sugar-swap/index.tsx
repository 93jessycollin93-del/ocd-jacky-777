// Sugar Swap: a swap-and-match puzzle. The rules live in logic.ts and play back through stage.ts; this
// file wires up input (drag, tap, keyboard), the level flow (title → map → level intro → play → result)
// and saves your stars.
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type CanvasPointer, type View } from "../../kit/GameCanvas";
import { formatNumber } from "../../kit/format";
import { useKeyPress } from "../../kit/input";
import { randomSeed } from "../../kit/rng";
import { play } from "../../kit/sfx";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, Overlay, PausePanel, PrimaryButton, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { drawHud, inRect, menuButton } from "./hud";
import { LevelMap, BigStars, Stars } from "./LevelMap";
import { LEVELS, type LevelDef } from "./levels";
import {
  SIZE, adjacent, colOf, finaleWave, frostingLeft, goalMet, hintMove, idx, levelOver, newLevel, rowOf, starsFor, trySwap,
  type GameState,
} from "./logic";
import { meta } from "./meta";
import { Stage, makeLayout } from "./stage";

type Phase = "title" | "map" | "intro" | "playing" | "paused" | "won" | "lost";

const PROGRESS_KEY = "sugar-swap:progress";
const HINT_AFTER = 5;

function loadStars(): number[] {
  const saved = loadState<{ stars?: unknown }>(PROGRESS_KEY);
  const out = new Array(LEVELS.length).fill(0) as number[];
  if (saved && Array.isArray(saved.stars)) {
    saved.stars.slice(0, LEVELS.length).forEach((v, i) => {
      const n = Number(v);
      out[i] = Number.isFinite(n) ? Math.max(0, Math.min(3, Math.floor(n))) : 0;
    });
  }
  return out;
}

const sum = (a: number[]) => a.reduce((n, v) => n + v, 0);

function describeGoal(level: LevelDef): string {
  const g = level.goal;
  if (g.type === "score") return `Score ${formatNumber(g.target)} points`;
  if (g.type === "frosting") return "Clear all the frosting by matching sweets on top of it";
  return `Bring ${g.count} ingredient${g.count === 1 ? "" : "s"} down to the bottom`;
}

export default function SugarSwap({ touch, best, submitScore }: GameProps) {
  const root = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  if (!stageRef.current) stageRef.current = new Stage();
  const stage = stageRef.current;
  const game = useRef<GameState>(newLevel(LEVELS[0], 1));
  const [phase, setPhase] = useState<Phase>("title");
  const phaseRef = useRef<Phase>("title");
  const [level, setLevel] = useState(0);
  const levelRef = useRef(0);
  const [stars, setStars] = useState<number[]>(loadStars);
  const starsRef = useRef(stars);
  const [result, setResult] = useState({ stars: 0, score: 0, isBest: false, improved: false });
  const [shape, setShape] = useState({ landscape: false, tall: false });
  const { landscape, tall } = shape;
  const layoutRef = useRef(makeLayout(false));
  const offsetY = useRef(0);

  const drag = useRef<{ cell: number; x: number; y: number; id: number } | null>(null);
  const idleFor = useRef(0);
  const finale = useRef(false);
  const goalBanner = useRef(false);
  const timers = useRef<number[]>([]);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  // Pick the portrait or landscape layout from the shape of the play area.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const check = () => {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      const wide = w / h > 1.25;
      // A tall, narrow screen lets the canvas fill it and centres the board; anything else letterboxes.
      const portrait = makeLayout(false);
      const isTall = !wide && h / w >= portrait.h / portrait.w;
      setShape((s) => (s.landscape === wide && s.tall === isTall ? s : { landscape: wide, tall: isTall }));
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  layoutRef.current = makeLayout(landscape);
  stage.layout = layoutRef.current;

  // ---------------------------------------------------------------- level flow

  const openLevel = useCallback(
    (i: number, skipIntro = false) => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      levelRef.current = i;
      setLevel(i);
      game.current = newLevel(LEVELS[i], randomSeed());
      stage.load(game.current);
      finale.current = false;
      goalBanner.current = false;
      idleFor.current = 0;
      drag.current = null;
      if (skipIntro) {
        go("playing");
        stage.dropIn();
      } else {
        go("intro");
      }
    },
    [go, stage],
  );

  const beginPlay = useCallback(() => {
    play("select");
    go("playing");
    stage.dropIn();
  }, [go, stage]);

  const finishLevel = useCallback(() => {
    const g = game.current;
    const li = levelRef.current;
    if (goalMet(g)) {
      const earned = starsFor(g);
      const prev = starsRef.current[li] ?? 0;
      const next = starsRef.current.slice();
      if (earned > prev) next[li] = earned;
      starsRef.current = next;
      setStars(next);
      saveState(PROGRESS_KEY, { stars: next });
      const isBest = submitScore(sum(next));
      setResult({ stars: earned, score: g.score, isBest, improved: earned > prev });
      play("win");
      const L = stage.layout;
      for (let k = 0; k < 6; k++) {
        stage.particles.burst(L.bx + (L.cell * SIZE * (k + 0.5)) / 6, L.by, 26, {
          color: ["#f472b6", "#fde047", "#4ade80", "#60a5fa", "#c084fc"], speed: 300, size: 7, life: 1.4, gravity: 420, shape: "square", angle: Math.PI / 2, spread: 2,
        });
      }
      later(() => go("won"), 1100);
    } else {
      play("lose");
      stage.showBanner("Out of moves", "#fca5a5", 34, 1.4);
      later(() => go("lost"), 1300);
    }
  }, [go, later, stage, submitScore]);

  // When a move has fully played out: end the level, run the victory lap, or wait for the next swap.
  useEffect(() => {
    stage.onIdle = () => {
      if (phaseRef.current !== "playing") return;
      const g = game.current;
      if (finale.current) {
        const steps = finaleWave(g);
        if (steps.length) stage.push(steps);
        else finishLevel();
        return;
      }
      if (levelOver(g)) {
        if (goalMet(g)) {
          finale.current = true;
          stage.showBanner(g.moves > 0 ? "Sugar rush!" : "Level complete!", "#fde047", 38, 1.3);
          play("levelup");
          const steps = finaleWave(g);
          if (steps.length) stage.push(steps);
          else later(finishLevel, 700);
        } else {
          finishLevel();
        }
        return;
      }
      if (g.level.goal.type === "score" && goalMet(g) && !goalBanner.current) {
        goalBanner.current = true;
        stage.showBanner("Goal reached!  Keep going for stars", "#bbf7d0", 22, 1.6);
        play("levelup");
      }
    };
    return () => {
      stage.onIdle = null;
    };
  }, [finishLevel, later, stage]);

  const attemptSwap = (a: number, b: number) => {
    if (phaseRef.current !== "playing" || stage.busy || levelOver(game.current)) return;
    const steps = trySwap(game.current, a, b);
    if (!steps.length) return;
    stage.push(steps);
    stage.sel = -1;
    stage.hint = null;
    idleFor.current = 0;
  };

  // ---------------------------------------------------------------- input

  const onPointer = (p: CanvasPointer) => {
    if (phaseRef.current !== "playing") return;
    const L = layoutRef.current;
    const px = p.x;
    const py = p.y - offsetY.current;
    if (p.type === "down" && inRect(menuButton(L), px, py)) {
      go("paused");
      return;
    }
    if (stage.busy) {
      if (p.type !== "move") drag.current = null;
      return;
    }
    if (p.type === "down") {
      const c = stage.cellAt(px, py);
      if (c < 0) {
        stage.sel = -1;
        return;
      }
      idleFor.current = 0;
      stage.hint = null;
      stage.kb = -1;
      drag.current = { cell: c, x: px, y: py, id: p.id };
      if (stage.sel >= 0 && adjacent(stage.sel, c)) {
        attemptSwap(stage.sel, c);
        drag.current = null;
      } else if (stage.sel === c) {
        stage.sel = -1;
      } else {
        stage.sel = c;
        play("tick");
      }
    } else if (p.type === "move") {
      const d = drag.current;
      if (!d || d.id !== p.id) return;
      const dx = px - d.x;
      const dy = py - d.y;
      if (Math.hypot(dx, dy) < L.cell * 0.32) return;
      const r = rowOf(d.cell) + (Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0);
      const c = colOf(d.cell) + (Math.abs(dy) > Math.abs(dx) ? 0 : Math.sign(dx));
      drag.current = null;
      if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) return;
      stage.sel = -1;
      attemptSwap(d.cell, idx(r, c));
    } else {
      drag.current = null;
    }
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) {
      go(p === "playing" ? "paused" : "playing");
      return;
    }
    if (p !== "playing") return;
    if (code === "KeyH") {
      if (!stage.busy) stage.hint = hintMove(game.current);
      return;
    }
    const dirs: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], KeyW: [-1, 0], ArrowDown: [1, 0], KeyS: [1, 0], ArrowLeft: [0, -1], KeyA: [0, -1], ArrowRight: [0, 1], KeyD: [0, 1],
    };
    if (stage.busy) return;
    idleFor.current = 0;
    stage.hint = null;
    if (stage.kb < 0) stage.kb = idx(Math.floor(SIZE / 2), Math.floor(SIZE / 2));
    const d = dirs[code];
    if (d) {
      let r = rowOf(stage.kb);
      let c = colOf(stage.kb);
      if (stage.sel >= 0) {
        const nr = r + d[0];
        const nc = c + d[1];
        if (nr >= 0 && nc >= 0 && nr < SIZE && nc < SIZE) {
          const sel = stage.sel;
          stage.sel = -1;
          attemptSwap(sel, idx(nr, nc));
          stage.kb = idx(nr, nc);
        }
        return;
      }
      for (let k = 0; k < SIZE; k++) {
        r += d[0];
        c += d[1];
        if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) break;
        if (!stage.holes[idx(r, c)]) {
          stage.kb = idx(r, c);
          play("tick");
          break;
        }
      }
    } else if (code === "Space" || code === "Enter") {
      stage.sel = stage.sel === stage.kb ? -1 : stage.kb;
    }
  });

  // ---------------------------------------------------------------- drawing

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number, time: number) => {
    const L = layoutRef.current;
    const g = game.current;
    const p = phaseRef.current;
    if (p !== "paused") stage.update(dt);

    // Idle hint after a few quiet seconds.
    if (p === "playing" && !stage.busy && !levelOver(g)) {
      idleFor.current += dt;
      if (idleFor.current > HINT_AFTER && !stage.hint) stage.hint = hintMove(g);
    }

    // Slow floating bubbles over the candy-coloured page background.
    for (let i = 0; i < 14; i++) {
      const r = 8 + (i % 5) * 6;
      const x = ((i * 97 + Math.sin(time * 0.3 + i) * 20) % view.w + view.w) % view.w;
      const span = view.h + r * 2;
      const y = view.h + r - ((time * (8 + (i % 4) * 4) + i * 83) % span);
      const edge = Math.min(1, Math.max(0, Math.min(y, view.h - y) / 50));
      ctx.fillStyle = `rgba(255,255,255,${(0.04 + (i % 3) * 0.02) * edge})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    offsetY.current = Math.max(0, (view.h - L.h) / 2);
    ctx.save();
    ctx.translate(0, offsetY.current);
    stage.draw(ctx, view.scale);

    const goal = g.level.goal;
    const left = stage.frosting.reduce((n, v) => n + v, 0);
    let goalText: string;
    let met: boolean;
    if (goal.type === "score") {
      goalText = `Reach ${formatNumber(goal.target)} points`;
      met = stage.shownScore >= goal.target;
    } else if (goal.type === "frosting") {
      met = left === 0;
      goalText = met ? "Frosting cleared!" : `Clear the frosting · ${left} left`;
    } else {
      met = stage.collected >= goal.count;
      goalText = `Ingredients ${Math.min(goal.count, stage.collected)} / ${goal.count}`;
    }
    drawHud(ctx, L, {
      levelNo: levelRef.current + 1, name: g.level.name, moves: g.moves, shownScore: stage.shownScore, stars: g.level.stars,
      goalType: goal.type, goalText, goalMet: met, best: 0, time,
    });
    ctx.restore();
  };

  // ---------------------------------------------------------------- screens

  const total = sum(stars);
  const lv = LEVELS[level];
  const introStars = stars[level] ?? 0;
  const isLast = level >= LEVELS.length - 1;

  return (
    <div ref={root} className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas
        width={layoutRef.current.w}
        height={layoutRef.current.h}
        fit={tall ? "fill" : "contain"}
        draw={draw}
        onPointer={onPointer}
        background="linear-gradient(180deg,#2a1055 0%,#5b21b6 55%,#be185d 100%)"
      />

      {phase === "title" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={() => go("map")}
          accent={meta.accent}
          best={best || undefined}
          bestLabel="Total stars"
          extra={total > 0 ? <p className="mt-1 text-xs text-white/60">Your progress is saved: {total} / {LEVELS.length * 3} stars</p> : null}
        />
      )}

      {phase === "map" && (
        <LevelMap
          stars={stars}
          totalStars={total}
          accent={meta.accent}
          onBack={() => go("title")}
          onPick={(i) => {
            play("select");
            openLevel(i);
          }}
        />
      )}

      {phase === "intro" && (
        <Overlay>
          <div className="text-xs font-bold uppercase tracking-widest text-white/50">Level {level + 1}</div>
          <h2 className="text-3xl font-black" style={{ color: meta.accent }}>{lv.name}</h2>
          <div className="mt-3 rounded-xl bg-white/10 p-3 text-sm">
            <div className="font-semibold">{describeGoal(lv)}</div>
            <div className="mt-1 text-white/70">in {lv.moves} moves</div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-white/70">
            {([0, 1, 2] as const).map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Stars n={i + 1} size={13} />
                <span className="tabular-nums">
                  {i === 0 ? (lv.goal.type === "score" ? formatNumber(lv.stars[0]) : "Goal") : formatNumber(lv.stars[i])}
                </span>
              </div>
            ))}
          </div>
          {introStars > 0 && <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/60">Your best <Stars n={introStars} size={14} /></div>}
          <div className="mt-4 space-y-2">
            <PrimaryButton onClick={beginPlay} accent={meta.accent} autoFocus>Play</PrimaryButton>
            <SecondaryButton onClick={() => go("map")}>Back to map</SecondaryButton>
          </div>
        </Overlay>
      )}

      {phase === "paused" && (
        <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={() => openLevel(level, true)}>
          <p className="mt-2 text-sm text-white/60">Level {level + 1} · {lv.name}</p>
          <div className="mt-3">
            <SecondaryButton onClick={() => go("map")}>Level map</SecondaryButton>
          </div>
        </PausePanel>
      )}

      {phase === "won" && (
        <Overlay>
          <h2 className="text-3xl font-black" style={{ color: meta.accent }}>{result.stars === 3 ? "Sugar-tastic!" : "Level complete!"}</h2>
          <div className="mt-3"><BigStars n={result.stars} /></div>
          <div className="mt-3 text-sm text-white/60">Score</div>
          <div className="text-4xl font-black tabular-nums">{formatNumber(result.score)}</div>
          {result.isBest ? (
            <div className="mt-1 text-sm font-bold text-amber-300">New best total: {total} stars!</div>
          ) : (
            <div className="mt-1 text-xs text-white/55">{result.improved ? "More stars than before! " : ""}Total {total} / {LEVELS.length * 3} stars</div>
          )}
          <div className="mt-4 space-y-2">
            {!isLast ? (
              <PrimaryButton onClick={() => openLevel(level + 1)} accent={meta.accent} autoFocus>Next level</PrimaryButton>
            ) : (
              <p className="text-sm font-semibold text-amber-300">You finished every level!</p>
            )}
            <SecondaryButton onClick={() => openLevel(level, true)}>{result.stars < 3 ? "Replay for more stars" : "Replay"}</SecondaryButton>
            <SecondaryButton onClick={() => go("map")}>Level map</SecondaryButton>
          </div>
        </Overlay>
      )}

      {phase === "lost" && (
        <GameOverPanel
          title="Out of moves"
          scoreLabel="Score"
          score={formatNumber(game.current.score)}
          accent={meta.accent}
          onRestart={() => openLevel(level, true)}
        >
          <p className="mt-2 text-sm text-white/65">{describeGoal(lv)}.</p>
          {lv.goal.type === "frosting" && <p className="text-xs text-white/50">{frostingLeft(game.current)} frosting left</p>}
          {lv.goal.type === "ingredients" && <p className="text-xs text-white/50">{game.current.collected} of {lv.goal.count} brought down</p>}
          <div className="mt-3">
            <SecondaryButton onClick={() => go("map")}>Level map</SecondaryButton>
          </div>
        </GameOverPanel>
      )}
    </div>
  );
}
