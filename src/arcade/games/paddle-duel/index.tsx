// Paddle Duel: neon Pong. The rules and the AI live in logic.ts; this file draws the court (rotated to
// stand up on a phone held upright), maps keys, mouse and touch drags onto the paddles, plays synthesised
// blips and runs the menu, pause and match-over screens.
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type CanvasPointer, type View } from "../../kit/GameCanvas";
import { DISPLAY_FONT, Particles, Shake, roundRect, text, withAlpha } from "../../kit/draw";
import { useHeldKeys, useKeyPress } from "../../kit/input";
import { randomSeed } from "../../kit/rng";
import { play, tone } from "../../kit/sfx";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import {
  AI_LEVELS, BALL_R, COURT_H, COURT_W, PADDLE_H, PADDLE_SPEED, PADDLE_W, WIN_SCORE, aiStep, ballSpeed, movePaddle, movePaddleToward, newAi,
  newMatch, paddleX, stepMatch, type AiState, type Difficulty, type Match, type MatchEvent,
} from "./logic";
import { meta } from "./meta";

type Phase = "menu" | "playing" | "paused" | "over";
type Players = 1 | 2;

const STREAK_KEY = "paddle-duel:streak";
const CYAN = "#22d3ee";
const PINK = "#f472b6";
const TOUCH_SPEED = 1400;
const DIFFS: Difficulty[] = ["easy", "medium", "hard"];

interface TrailDot {
  x: number;
  y: number;
}

export default function PaddleDuel({ touch, best, submitScore }: GameProps) {
  const root = useRef<HTMLDivElement>(null);
  const [portrait, setPortrait] = useState(false);
  const portraitRef = useRef(false);
  portraitRef.current = portrait;
  const [phase, setPhase] = useState<Phase>("menu");
  const phaseRef = useRef<Phase>("menu");
  const [players, setPlayers] = useState<Players>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const config = useRef({ players: 1 as Players, difficulty: "medium" as Difficulty });
  const [streak, setStreak] = useState(() => loadState<{ streak?: number }>(STREAK_KEY)?.streak ?? 0);
  const [result, setResult] = useState({ winner: 0 as 0 | 1, score: [0, 0] as [number, number], isBest: false, streak: 0, longest: 0 });
  const held = useHeldKeys();
  const timers = useRef<number[]>([]);

  const match = useRef<Match>(newMatch(1));
  const ai = useRef<AiState>(newAi());
  const input = useRef({ target: [null, null] as [number | null, number | null], pointers: new Map<number, 0 | 1>() });
  const fx = useRef({
    particles: new Particles(300),
    shake: new Shake(),
    trail: [] as TrailDot[],
    hit: [0, 0] as [number, number],
    flash: 0,
    time: 0,
    countPulse: 0,
    lastCount: 3,
    scorePop: [0, 0] as [number, number],
    hintT: 0,
    scanlines: null as CanvasPattern | null,
    ending: false,
  });

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const check = () => setPortrait(el.clientHeight > el.clientWidth * 1.1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const start = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    config.current = { players, difficulty };
    match.current = newMatch(randomSeed());
    ai.current = newAi();
    input.current.target = [null, null];
    input.current.pointers.clear();
    const f = fx.current;
    f.particles.clear();
    f.trail = [];
    f.hit = [0, 0];
    f.hintT = 4;
    f.lastCount = 3;
    f.ending = false;
    play("select");
    go("playing");
  }, [difficulty, go, players]);

  const finish = (winner: 0 | 1) => {
    const m = match.current;
    const cfg = config.current;
    let isBest = false;
    let nextStreak = streak;
    if (cfg.players === 1 && cfg.difficulty === "hard") {
      if (winner === 0) {
        nextStreak = streak + 1;
        isBest = submitScore(nextStreak);
      } else {
        nextStreak = 0;
      }
      setStreak(nextStreak);
      saveState(STREAK_KEY, { streak: nextStreak });
    }
    play(cfg.players === 1 && winner === 1 ? "lose" : "win");
    setResult({ winner, score: [m.score[0], m.score[1]], isBest, streak: nextStreak, longest: m.longest });
    go("over");
  };

  // ---------------------------------------------------------------- input

  /** Canvas point (screen) to court coordinates: portrait play is the court turned a quarter turn. */
  const toCourt = (x: number, y: number) => (portraitRef.current ? { x: COURT_W - y, y: x } : { x, y });

  const onPointer = (p: CanvasPointer) => {
    const inp = input.current;
    const view = portraitRef.current ? { w: COURT_H, h: COURT_W } : { w: COURT_W, h: COURT_H };
    if (p.type === "down" && phaseRef.current === "playing") {
      const m = pauseRect(view.w);
      if (p.x >= m.x && p.x <= m.x + m.w && p.y >= m.y && p.y <= m.y + m.h) {
        go("paused");
        return;
      }
    }
    if (phaseRef.current !== "playing") return;
    const c = toCourt(p.x, p.y);
    const two = config.current.players === 2;
    if (p.type === "down") {
      const side: 0 | 1 = two ? (c.x < COURT_W / 2 ? 0 : 1) : 0;
      inp.pointers.set(p.id, side);
      inp.target[side] = c.y;
    } else if (p.type === "move") {
      if (p.pointerType === "mouse" && !two) {
        inp.target[0] = c.y;
        return;
      }
      const side = inp.pointers.get(p.id);
      if (side !== undefined) inp.target[side] = c.y;
    } else {
      inp.pointers.delete(p.id);
    }
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) go(p === "playing" ? "paused" : "playing");
  });

  // ---------------------------------------------------------------- events

  const handleEvents = (events: MatchEvent[]) => {
    const m = match.current;
    const f = fx.current;
    for (const e of events) {
      if (e.type === "paddle") {
        const px = paddleX(e.player);
        const col = e.player === 0 ? CYAN : PINK;
        f.hit[e.player] = 1;
        f.particles.burst(px + (e.player === 0 ? 10 : -10), m.ball.y, 10 + (e.fast ? 12 : 0), {
          color: [col, "#ffffff"], speed: 200 + e.speed * 0.25, size: 3, life: 0.45, gravity: 0, drag: 2.5, shape: "spark", angle: e.player === 0 ? 0 : Math.PI, spread: 1.8,
        });
        if (e.fast) f.shake.add(0.4);
        else f.shake.add(0.1);
        tone(320 + Math.min(900, e.speed) * 0.5, 0.07, "square", 0.1);
        tone(160, 0.05, "triangle", 0.12);
      } else if (e.type === "wall") {
        tone(210, 0.05, "triangle", 0.1);
        f.particles.burst(m.ball.x, m.ball.y < COURT_H / 2 ? 2 : COURT_H - 2, 4, { color: "#cbd5e1", speed: 120, size: 2, life: 0.3, gravity: 0, drag: 3, shape: "spark" });
      } else if (e.type === "score") {
        f.scorePop[e.player] = 1;
        f.shake.add(0.5);
        f.flash = 0.5;
        const x = e.player === 0 ? COURT_W : 0;
        f.particles.burst(x, m.ball.y, 36, {
          color: [e.player === 0 ? PINK : CYAN, "#ffffff"], speed: 380, size: 4, life: 0.8, gravity: 0, drag: 2, shape: "spark", angle: e.player === 0 ? Math.PI : 0, spread: 2.4,
        });
        tone(520, 0.12, "square", 0.1, { slide: 180 });
        f.trail = [];
      } else if (e.type === "tick") {
        tone(520, 0.08, "square", 0.08);
        f.countPulse = 1;
        f.lastCount = e.n;
      } else if (e.type === "launch") {
        tone(880, 0.14, "square", 0.1);
        f.countPulse = 0;
      } else if (e.type === "win") {
        f.ending = true;
        const winner = e.player;
        timers.current.push(window.setTimeout(() => finish(winner), 900));
      }
    }
  };

  // ---------------------------------------------------------------- drawing

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number) => {
    const f = fx.current;
    const m = match.current;
    const cfg = config.current;
    f.time += dt;
    const playing = phaseRef.current === "playing";

    if (playing) {
      const inp = input.current;
      const k = held.current;
      const two = cfg.players === 2;
      // Left paddle: W / S (and the arrows too when playing the AI).
      const up0 = k.has("KeyW") || (!two && k.has("ArrowUp"));
      const dn0 = k.has("KeyS") || (!two && k.has("ArrowDown"));
      const d0 = (dn0 ? 1 : 0) - (up0 ? 1 : 0);
      if (d0) {
        inp.target[0] = null;
        movePaddle(m.paddles[0], d0, dt, PADDLE_SPEED);
      } else if (inp.target[0] !== null) {
        movePaddleToward(m.paddles[0], inp.target[0], dt, TOUCH_SPEED);
      } else {
        m.paddles[0].vy = 0;
      }
      if (two) {
        const d1 = (k.has("ArrowDown") ? 1 : 0) - (k.has("ArrowUp") ? 1 : 0);
        if (d1) {
          inp.target[1] = null;
          movePaddle(m.paddles[1], d1, dt, PADDLE_SPEED);
        } else if (inp.target[1] !== null) {
          movePaddleToward(m.paddles[1], inp.target[1], dt, TOUCH_SPEED);
        } else {
          m.paddles[1].vy = 0;
        }
      } else {
        aiStep(m, 1, ai.current, AI_LEVELS[cfg.difficulty], dt);
      }
      handleEvents(stepMatch(m, dt));
      f.hintT = Math.max(0, f.hintT - dt);
      // Ball trail: a new dot every frame while the ball is live.
      if (m.countdown <= 0 && m.winner < 0) {
        f.trail.push({ x: m.ball.x, y: m.ball.y });
        if (f.trail.length > 16) f.trail.shift();
      }
    }
    if (phaseRef.current !== "paused") {
      f.particles.update(dt);
      f.shake.update(dt);
      f.hit[0] = Math.max(0, f.hit[0] - dt * 4);
      f.hit[1] = Math.max(0, f.hit[1] - dt * 4);
      f.flash = Math.max(0, f.flash - dt * 2.5);
      f.countPulse = Math.max(0, f.countPulse - dt * 1.4);
      f.scorePop[0] = Math.max(0, f.scorePop[0] - dt * 2.5);
      f.scorePop[1] = Math.max(0, f.scorePop[1] - dt * 2.5);
      if (m.countdown <= 0 && m.winner < 0 && f.trail.length > 0 && !playing) f.trail.shift();
    }

    const port = view.w < view.h;
    const sw = view.w;
    const sh = view.h;
    // Screen-space point for a court position (used to place upright text).
    const S = (x: number, y: number) => (port ? { x: y, y: COURT_W - x } : { x, y });

    ctx.save();
    ctx.fillStyle = "#04050d";
    ctx.fillRect(0, 0, sw, sh);
    ctx.save();
    const [shx, shy] = f.shake.offset(10);
    ctx.translate(shx, shy);
    if (port) {
      ctx.translate(0, COURT_W);
      ctx.rotate(-Math.PI / 2);
    }

    // Arena: soft grid, glowing border and the centre net.
    ctx.fillStyle = "#070a1a";
    roundRect(ctx, 6, 6, COURT_W - 12, COURT_H - 12, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(34,211,238,0.07)";
    ctx.lineWidth = 1;
    for (let x = 40; x < COURT_W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.lineTo(x, COURT_H - 8);
      ctx.stroke();
    }
    for (let y = 40; y < COURT_H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(COURT_W - 8, y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "lighter";
    for (const [w, a] of [[10, 0.05], [5, 0.1], [2, 0.7]] as const) {
      const g = ctx.createLinearGradient(0, 0, COURT_W, 0);
      g.addColorStop(0, withAlpha(CYAN, a));
      g.addColorStop(0.5, withAlpha("#a78bfa", a));
      g.addColorStop(1, withAlpha(PINK, a));
      ctx.strokeStyle = g;
      ctx.lineWidth = w;
      roundRect(ctx, 6, 6, COURT_W - 12, COURT_H - 12, 14);
      ctx.stroke();
    }
    ctx.setLineDash([14, 14]);
    ctx.strokeStyle = "rgba(148,163,255,0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(COURT_W / 2, 14);
    ctx.lineTo(COURT_W / 2, COURT_H - 14);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = "source-over";

    // Ball trail, then the ball with a halo (and a colour fringe when it is fast).
    const b = m.ball;
    const speed = ballSpeed(b);
    const heat = Math.min(1, Math.max(0, (speed - 400) / 560));
    const ballColor = heat < 0.5 ? CYAN : PINK;
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < f.trail.length; i++) {
      const t = f.trail[i];
      const k = (i + 1) / f.trail.length;
      ctx.fillStyle = withAlpha(ballColor, 0.35 * k * k);
      ctx.beginPath();
      ctx.arc(t.x, t.y, BALL_R * (0.35 + 0.65 * k), 0, Math.PI * 2);
      ctx.fill();
    }
    if (!f.ending || m.winner < 0) {
      const halo = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, BALL_R * 4);
      halo.addColorStop(0, withAlpha(ballColor, 0.55));
      halo.addColorStop(1, withAlpha(ballColor, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(b.x - BALL_R * 4, b.y - BALL_R * 4, BALL_R * 8, BALL_R * 8);
      if (heat > 0.3) {
        const off = 2 + heat * 3;
        ctx.fillStyle = "rgba(255,40,80,0.45)";
        ctx.beginPath();
        ctx.arc(b.x - off, b.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(40,120,255,0.45)";
        ctx.beginPath();
        ctx.arc(b.x + off, b.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = "source-over";
    if (m.winner < 0) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
    }

    // Paddles with layered neon glow.
    for (const player of [0, 1] as const) {
      const p = m.paddles[player];
      const col = player === 0 ? CYAN : PINK;
      const x = paddleX(player) - PADDLE_W / 2;
      const y = p.y - PADDLE_H / 2;
      const flash = f.hit[player];
      ctx.globalCompositeOperation = "lighter";
      for (const [grow, a] of [[14, 0.06], [8, 0.12], [4, 0.2]] as const) {
        ctx.fillStyle = withAlpha(col, a + flash * 0.15);
        roundRect(ctx, x - grow, y - grow, PADDLE_W + grow * 2, PADDLE_H + grow * 2, PADDLE_W / 2 + grow);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = col;
      roundRect(ctx, x, y, PADDLE_W, PADDLE_H, PADDLE_W / 2);
      ctx.fill();
      ctx.fillStyle = flash > 0 ? "#ffffff" : "rgba(255,255,255,0.75)";
      roundRect(ctx, x + PADDLE_W * 0.3, y + 5, PADDLE_W * 0.4, PADDLE_H - 10, PADDLE_W * 0.2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "lighter";
    f.particles.draw(ctx);
    ctx.globalCompositeOperation = "source-over";
    if (f.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${f.flash * 0.12})`;
      ctx.fillRect(0, 0, COURT_W, COURT_H);
    }
    ctx.restore();

    // Upright text: scores, names, the serve countdown, hints.
    const names: [string, string] = cfg.players === 1 ? ["YOU", `AI · ${cfg.difficulty.toUpperCase()}`] : ["PLAYER 1", "PLAYER 2"];
    for (const player of [0, 1] as const) {
      const pos = S(COURT_W / 2 + (player === 0 ? -86 : 86), 62);
      const pop = f.scorePop[player];
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(1 + pop * 0.35, 1 + pop * 0.35);
      text(ctx, String(m.score[player]), 0, 0, { size: 64, font: DISPLAY_FONT, weight: 900, color: player === 0 ? "#a5f3fc" : "#fbcfe8", shadow: player === 0 ? CYAN : PINK });
      ctx.restore();
      const label = S(COURT_W / 2 + (player === 0 ? -86 : 86), 104);
      text(ctx, names[player], label.x, label.y, { size: 12, weight: 800, color: player === 0 ? "rgba(165,243,252,0.7)" : "rgba(251,207,232,0.7)" });
    }
    if (m.score[0] >= WIN_SCORE - 1 && m.score[1] >= WIN_SCORE - 1 && Math.abs(m.score[0] - m.score[1]) < 2 && m.winner < 0) {
      const p = S(COURT_W / 2, COURT_H - 34);
      text(ctx, m.score[0] === m.score[1] ? "DEUCE · WIN BY 2" : "ADVANTAGE", p.x, p.y, { size: 14, weight: 800, color: "#fde68a", shadow: "#f59e0b" });
    }
    if (m.countdown > 0 && m.winner < 0 && playing) {
      const c = S(COURT_W / 2, COURT_H / 2);
      const n = Math.ceil(m.countdown);
      const k = f.countPulse;
      ctx.save();
      ctx.translate(c.x, c.y);
      const s = 1 + k * 0.4;
      ctx.scale(s, s);
      ctx.globalAlpha = 0.5 + 0.5 * (1 - (m.countdown % 1));
      text(ctx, String(n), 0, 0, { size: 110, font: DISPLAY_FONT, weight: 900, color: "#ffffff", shadow: "#a78bfa" });
      ctx.restore();
      ctx.globalAlpha = 1;
      const hint = S(COURT_W / 2, COURT_H / 2 + 86);
      text(ctx, "SERVE", hint.x, hint.y, { size: 14, weight: 800, color: "rgba(255,255,255,0.6)" });
    }
    if (f.hintT > 0 && playing) {
      ctx.globalAlpha = Math.min(1, f.hintT);
      for (const player of [0, 1] as const) {
        if (player === 1 && cfg.players === 1) continue;
        const pp = S(player === 0 ? 120 : COURT_W - 120, COURT_H / 2);
        const msg = touch ? (cfg.players === 2 ? (player === 0 ? "P1 drags here" : "P2 drags here") : "Drag to move") : player === 0 ? "W / S" : "↑ / ↓";
        text(ctx, msg, pp.x, pp.y, { size: 14, weight: 800, color: "rgba(255,255,255,0.55)" });
      }
      ctx.globalAlpha = 1;
    }
    if (cfg.players === 1 && cfg.difficulty === "hard" && streak > 0) {
      const p = S(COURT_W / 2, 24);
      text(ctx, `Hard streak ${streak}`, p.x, p.y, { size: 12, weight: 800, color: "rgba(253,230,138,0.8)" });
    }

    // Pause button and CRT finish: scanlines and a vignette.
    const pr = pauseRect(sw);
    roundRect(ctx, pr.x, pr.y, pr.w, pr.h, 10);
    ctx.fillStyle = "rgba(10,14,40,0.7)";
    ctx.fill();
    ctx.strokeStyle = "rgba(165,180,252,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#e0e7ff";
    ctx.fillRect(pr.x + 14, pr.y + 11, 5, 18);
    ctx.fillRect(pr.x + 23, pr.y + 11, 5, 18);

    if (!f.scanlines) {
      const c = document.createElement("canvas");
      c.width = 4;
      c.height = 4;
      const g = c.getContext("2d")!;
      g.fillStyle = "rgba(0,0,0,0.22)";
      g.fillRect(0, 0, 4, 1.4);
      f.scanlines = ctx.createPattern(c, "repeat");
    }
    if (f.scanlines) {
      ctx.fillStyle = f.scanlines;
      ctx.fillRect(0, 0, sw, sh);
    }
    const v = ctx.createRadialGradient(sw / 2, sh / 2, Math.min(sw, sh) * 0.35, sw / 2, sh / 2, Math.max(sw, sh) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, sw, sh);
    ctx.restore();
  };

  // ---------------------------------------------------------------- screens

  const Seg = <T extends string | number>({ value, options, onPick, label }: { value: T; options: { v: T; label: string }[]; onPick: (v: T) => void; label: string }) => (
    <div className="mt-2" role="group" aria-label={label}>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            aria-pressed={value === o.v}
            onClick={() => onPick(o.v)}
            className={`flex-1 rounded-xl border px-2 py-2 text-sm font-bold transition ${
              value === o.v ? "border-cyan-300 bg-cyan-500/25 text-white" : "border-white/15 text-white/60 hover:bg-white/10"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );

  const menuExtra = (
    <div className="mt-3">
      {Seg<Players>({ value: players, label: "Players", onPick: setPlayers, options: [{ v: 1 as Players, label: "vs AI" }, { v: 2 as Players, label: "2 Players" }] })}
      {players === 1 &&
        Seg<Difficulty>({ value: difficulty, label: "Difficulty", onPick: setDifficulty, options: DIFFS.map((d) => ({ v: d, label: d[0].toUpperCase() + d.slice(1) })) })}
      <p className="mt-2 text-xs text-white/60">
        {players === 2
          ? touch
            ? "Each player drags their own half of the screen."
            : "Left paddle W / S, right paddle ↑ / ↓."
          : difficulty === "hard"
            ? `Hard is the one that counts: win in a row to build a streak. Current streak ${streak}, best ${best}.`
            : "First to 11, win by 2."}
      </p>
    </div>
  );

  const cfg = config.current;
  const youWon = cfg.players === 1 ? result.winner === 0 : true;

  return (
    <div ref={root} className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas
        width={portrait ? COURT_H : COURT_W}
        height={portrait ? COURT_W : COURT_H}
        draw={draw}
        onPointer={onPointer}
        background="#04050d"
        cursor="none"
      />

      {phase === "menu" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={best ? `${best} in a row` : undefined}
          bestLabel="Best streak vs Hard"
          extra={menuExtra}
        />
      )}

      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={start} />}

      {phase === "over" && (
        <GameOverPanel
          title={cfg.players === 2 ? `Player ${result.winner + 1} wins!` : youWon ? "You win!" : "AI wins"}
          scoreLabel="Final score"
          score={`${result.score[0]} – ${result.score[1]}`}
          accent={meta.accent}
          isBest={result.isBest}
          onRestart={start}
        >
          <p className="mt-2 text-xs text-white/55">Longest rally {result.longest}</p>
          {cfg.players === 1 && cfg.difficulty === "hard" && (
            <p className="mt-1 text-sm text-amber-300">{youWon ? `Win streak vs Hard: ${result.streak}` : "Streak reset. Take another run at Hard."}</p>
          )}
          <div className="mt-3">
            <button
              type="button"
              className="w-full rounded-xl border border-white/20 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              onClick={() => go("menu")}
            >
              Change mode
            </button>
          </div>
        </GameOverPanel>
      )}
    </div>
  );
}

function pauseRect(viewW: number) {
  return { x: viewW - 54, y: 10, w: 42, h: 42 };
}
