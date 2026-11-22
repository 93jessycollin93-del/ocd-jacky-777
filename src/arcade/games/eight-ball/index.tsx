// 8-Ball Pool: physics, rules and the computer's shot search in logic.ts (the search runs in ai.worker.ts). This
// file draws the table, the aim guide (ghost ball and first-contact directions), and handles aiming, power, spin,
// ball in hand and the match flow.
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { DISPLAY_FONT, circle, fillRoundRect, text } from "../../kit/draw";
import { useKeyPress } from "../../kit/input";
import { noise, play, tone } from "../../kit/sfx";
import { randomSeed } from "../../kit/rng";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import {
  POCKETS, POCKET_R, R, TH, TW, aiShot, canPlace, cue, groupOf, moving, newGame, placeCue, resolve, step, strike, targets,
  type Difficulty, type PoolEvent, type PoolState,
} from "./logic";
import type { AiRequest } from "./ai.worker";

type Phase = "ready" | "playing" | "paused" | "over";
type Mode = "ai" | "two";
type WinRecord = { [k in Difficulty]?: { won: number; lost: number } };

const RAIL = 44;
const W = TW + RAIL * 2;
const H = TH + RAIL * 2 + 46;
const OX = RAIL;
const OY = RAIL + 46;
const COLORS = ["#f8fafc", "#facc15", "#2563eb", "#dc2626", "#7c3aed", "#f97316", "#16a34a", "#7f1d1d", "#0a0a0a"];
const ballColor = (n: number) => COLORS[n > 8 ? n - 8 : n];

function drawBall(ctx: CanvasRenderingContext2D, n: number, x: number, y: number, r = R) {
  circle(ctx, x + 1.5, y + 2, r, "rgba(0,0,0,0.35)");
  if (n > 8) {
    circle(ctx, x, y, r, "#f8fafc");
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = ballColor(n);
    ctx.fillRect(x - r, y - r * 0.55, r * 2, r * 1.1);
    ctx.restore();
  } else circle(ctx, x, y, r, ballColor(n));
  if (n > 0) {
    circle(ctx, x, y, r * 0.48, "#f8fafc");
    text(ctx, `${n}`, x, y + 0.5, { size: r * 0.62, weight: 900, color: "#111827" });
  }
  circle(ctx, x - r * 0.35, y - r * 0.4, r * 0.25, "rgba(255,255,255,0.55)");
}

/** Where the cue ball would first touch another ball along an angle (ghost-ball centre and the ball hit). */
function firstContact(s: PoolState, angle: number) {
  const c = cue(s);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best: { t: number; n: number; bx: number; by: number } | null = null;
  for (const b of s.balls) {
    if (b.potted || b.n === 0) continue;
    const fx = b.x - c.x;
    const fy = b.y - c.y;
    const along = fx * dx + fy * dy;
    if (along <= 0) continue;
    const off2 = fx * fx + fy * fy - along * along;
    const rr = 4 * R * R;
    if (off2 > rr) continue;
    const t = along - Math.sqrt(rr - off2);
    if (!best || t < best.t) best = { t, n: b.n, bx: b.x, by: b.y };
  }
  // Otherwise the nearest cushion.
  const tx = dx > 0 ? (TW - R - c.x) / dx : dx < 0 ? (R - c.x) / dx : Infinity;
  const ty = dy > 0 ? (TH - R - c.y) / dy : dy < 0 ? (R - c.y) / dy : Infinity;
  const tWall = Math.min(tx, ty);
  if (!best || tWall < best.t) return { gx: c.x + dx * tWall, gy: c.y + dy * tWall, ball: null };
  return { gx: c.x + dx * best.t, gy: c.y + dy * best.t, ball: best };
}

export default function EightBall({ touch, best, submitScore }: GameProps) {
  const game = useRef<PoolState>(newGame(1));
  const aim = useRef(Math.PI);
  const [power, setPower] = useState(0.55);
  const powerRef = useRef(0.55);
  powerRef.current = power;
  const [spin, setSpin] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [mode, setMode] = useState<Mode>("ai");
  const [level, setLevel] = useState<Difficulty>("normal");
  const [hud, setHud] = useState({ turn: 0, msg: "", groups: [null, null] as PoolState["groups"], hand: false, busy: false });
  const [result, setResult] = useState({ text: "", won: false, isBest: false });
  const thinking = useRef(false);
  const charging = useRef<number | null>(null);
  const record = useRef<WinRecord>(loadState<WinRecord>("eight-ball:record") ?? {});
  const worker = useRef<Worker | null>(null);
  const reqId = useRef(0);
  const shotMoving = useRef(false);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const syncHud = useCallback(() => {
    const g = game.current;
    setHud({ turn: g.turn, msg: g.message, groups: [...g.groups] as PoolState["groups"], hand: g.ballInHand, busy: moving(g) || thinking.current });
  }, []);

  useEffect(() => {
    try {
      worker.current = new Worker(new URL("./ai.worker.ts", import.meta.url), { type: "module" });
    } catch {
      worker.current = null;
    }
    return () => worker.current?.terminate();
  }, []);

  const isAiTurn = () => mode === "ai" && game.current.turn === 1 && !game.current.over;

  const start = useCallback(() => {
    game.current = newGame(randomSeed());
    aim.current = 0;
    shotMoving.current = false;
    thinking.current = false;
    play("select");
    go("playing");
    syncHud();
  }, [go, syncHud]);

  const shoot = useCallback((angle: number, p: number, sp: number) => {
    const g = game.current;
    if (strike(g, angle, p, sp)) {
      shotMoving.current = true;
      tone(160 + p * 220, 0.06, "triangle", 0.1);
      noise(0.05, 0.06 + p * 0.06, { type: "highpass", freq: 2000 });
      syncHud();
    }
  }, [syncHud]);

  const finish = useCallback(() => {
    const g = game.current;
    let won: boolean;
    let label: string;
    if (mode === "ai") {
      won = g.winner === 0;
      label = won ? "You win!" : "The computer wins";
      const rec = record.current;
      const r = rec[level] ?? { won: 0, lost: 0 };
      rec[level] = won ? { ...r, won: r.won + 1 } : { ...r, lost: r.lost + 1 };
      saveState("eight-ball:record", rec);
    } else {
      won = true;
      label = `Player ${(g.winner ?? 0) + 1} wins!`;
    }
    const isBest = mode === "ai" && won ? submitScore(Object.values(record.current).reduce((n, r) => n + (r?.won ?? 0), 0)) : false;
    setResult({ text: `${label} ${g.message}`, won, isBest });
    play(won ? "win" : "lose");
    window.setTimeout(() => go("over"), 900);
  }, [go, level, mode, submitScore]);

  const aiMove = useCallback(() => {
    const g = game.current;
    thinking.current = true;
    syncHud();
    const id = ++reqId.current;
    const apply = (m: { angle: number; power: number; place?: { x: number; y: number } }) => {
      if (id !== reqId.current || game.current !== g || phaseRef.current === "over") return;
      thinking.current = false;
      if (m.place) placeCue(g, m.place.x, m.place.y);
      aim.current = m.angle;
      window.setTimeout(() => shoot(m.angle, m.power, 0), 450);
    };
    const seed = randomSeed();
    if (worker.current) {
      const w = worker.current;
      const onMsg = (e: MessageEvent<{ id: number; move: { angle: number; power: number; place?: { x: number; y: number } } }>) => {
        if (e.data.id !== id) return;
        w.removeEventListener("message", onMsg);
        apply(e.data.move);
      };
      w.addEventListener("message", onMsg);
      const { rng: _rng, ...state } = g;
      void _rng;
      w.postMessage({ id, state, level, seed } satisfies AiRequest);
    } else window.setTimeout(() => apply(aiShot(g, level)), 50);
  }, [level, shoot, syncHud]);

  const handleEvents = (events: PoolEvent[]) => {
    for (const e of events) {
      if (e.type === "hit") tone(900 + Math.min(600, e.speed * 0.3), 0.03, "sine", Math.min(0.12, 0.02 + e.speed / 9000));
      else if (e.type === "rail") tone(140, 0.05, "sine", Math.min(0.08, e.speed / 12000));
      else if (e.type === "pot") {
        tone(200, 0.15, "triangle", 0.08, { slide: 90 });
        if (e.n !== 0) play("coin", 0.7);
      }
    }
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) go(p === "playing" ? "paused" : "playing");
  });

  // Hold Space to charge power on desktop; release to shoot.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || phaseRef.current !== "playing") return;
      const g = game.current;
      if (moving(g) || g.ballInHand || isAiTurn() || thinking.current) return;
      e.preventDefault();
      charging.current = performance.now();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || charging.current === null) return;
      const t = (performance.now() - charging.current) / 1000;
      charging.current = null;
      const p = Math.min(1, 0.15 + t * 0.6);
      setPower(p);
      shoot(aim.current, p, spin);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  const draw = (ctx: CanvasRenderingContext2D, _view: View, dt: number, time: number) => {
    const g = game.current;
    if (phaseRef.current === "playing") {
      if (moving(g)) {
        const n = Math.max(1, Math.round(Math.min(dt, 0.05) * 120));
        for (let i = 0; i < n; i++) handleEvents(step(g, Math.min(dt, 0.05) / n));
      } else if (shotMoving.current) {
        shotMoving.current = false;
        resolve(g);
        if (g.message.startsWith("Scratch") || g.message.includes("ball in hand")) play("error");
        syncHud();
        if (g.over) finish();
        else if (isAiTurn()) aiMove();
      }
    }

    // Rails, cloth and pockets.
    fillRoundRect(ctx, 0, 46, W, H - 46, 26, "#5b3416");
    fillRoundRect(ctx, 8, 54, W - 16, H - 62, 20, "#7c4a21");
    ctx.fillStyle = "#0f766e";
    ctx.fillRect(OX, OY, TW, TH);
    const cloth = ctx.createRadialGradient(OX + TW / 2, OY + TH / 2, 60, OX + TW / 2, OY + TH / 2, TW * 0.7);
    cloth.addColorStop(0, "rgba(255,255,255,0.08)");
    cloth.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = cloth;
    ctx.fillRect(OX, OY, TW, TH);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(OX + TW * 0.25, OY);
    ctx.lineTo(OX + TW * 0.25, OY + TH);
    ctx.stroke();
    for (const x of [0.25, 0.5, 0.75]) {
      circle(ctx, OX + TW * x, 54 + 18, 4, "#fde68a");
      circle(ctx, OX + TW * x, H - 26, 4, "#fde68a");
    }
    for (const p of POCKETS) circle(ctx, OX + p.x, OY + p.y, POCKET_R, "#0b0b0b");

    // Balls.
    for (const b of g.balls) if (!b.potted) drawBall(ctx, b.n, OX + b.x, OY + b.y);

    const c = cue(g);
    const canAim = phaseRef.current === "playing" && !moving(g) && !g.over && !thinking.current;
    if (canAim && g.ballInHand && !isAiTurn()) {
      circle(ctx, OX + c.x, OY + c.y, R + 6 + Math.sin(time * 5) * 2, "rgba(255,255,255,0.25)");
      text(ctx, touch ? "Tap the table to place the cue ball" : "Click the table to place the cue ball", W / 2, OY + TH / 2 - 60, { size: 18, weight: 800, color: "#fff", stroke: "rgba(0,0,0,0.6)", strokeWidth: 4 });
    } else if (canAim) {
      // Aim guide: a line to the ghost ball, then short lines for where each ball goes.
      const fc = firstContact(g, aim.current);
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(OX + c.x, OY + c.y);
      ctx.lineTo(OX + fc.gx, OY + fc.gy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(OX + fc.gx, OY + fc.gy, R, 0, Math.PI * 2);
      ctx.stroke();
      if (fc.ball) {
        const nx = fc.ball.bx - fc.gx;
        const ny = fc.ball.by - fc.gy;
        const nl = Math.hypot(nx, ny) || 1;
        const legal = targets(g, g.turn).includes(fc.ball.n) || (g.groups[g.turn] === null && fc.ball.n !== 8);
        ctx.strokeStyle = legal ? "rgba(253,224,71,0.9)" : "rgba(248,113,113,0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(OX + fc.ball.bx, OY + fc.ball.by);
        ctx.lineTo(OX + fc.ball.bx + (nx / nl) * 70, OY + fc.ball.by + (ny / nl) * 70);
        ctx.stroke();
        // The cue ball leaves at right angles to the object ball's path (without spin).
        const tx = -ny / nl;
        const ty = nx / nl;
        const side = Math.cos(aim.current) * tx + Math.sin(aim.current) * ty >= 0 ? 1 : -1;
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(OX + fc.gx, OY + fc.gy);
        ctx.lineTo(OX + fc.gx + tx * side * 40, OY + fc.gy + ty * side * 40);
        ctx.stroke();
      }
      // The cue stick, pulled back by the power (or the Space charge).
      const charge = charging.current !== null ? Math.min(1, 0.15 + ((performance.now() - charging.current) / 1000) * 0.6) : powerRef.current;
      const back = 14 + charge * 60;
      const ax = Math.cos(aim.current);
      const ay = Math.sin(aim.current);
      ctx.lineCap = "round";
      ctx.strokeStyle = "#d6a35c";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(OX + c.x - ax * back, OY + c.y - ay * back);
      ctx.lineTo(OX + c.x - ax * (back + 300), OY + c.y - ay * (back + 300));
      ctx.stroke();
      ctx.strokeStyle = "#1f2937";
      ctx.beginPath();
      ctx.moveTo(OX + c.x - ax * (back + 220), OY + c.y - ay * (back + 220));
      ctx.lineTo(OX + c.x - ax * (back + 300), OY + c.y - ay * (back + 300));
      ctx.stroke();
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(OX + c.x - ax * back, OY + c.y - ay * back);
      ctx.lineTo(OX + c.x - ax * (back + 6), OY + c.y - ay * (back + 6));
      ctx.stroke();
    }

    // Player panels with each player's group.
    const players = mode === "ai" ? ["You", "Computer"] : ["Player 1", "Player 2"];
    for (const p of [0, 1] as const) {
      const x = p === 0 ? 10 : W - 330;
      const active = g.turn === p && !g.over;
      fillRoundRect(ctx, x, 6, 320, 36, 10, active ? "rgba(14,165,233,0.35)" : "rgba(0,0,0,0.35)");
      text(ctx, `${players[p]}${thinking.current && p === 1 && mode === "ai" ? " · thinking…" : ""}`, x + 12, 24, { align: "left", size: 14, weight: 800, color: "#fff" });
      const grp = g.groups[p];
      const want = grp ? g.balls.filter((b) => !b.potted && groupOf(b.n) === grp).map((b) => b.n) : [];
      if (grp) {
        want.forEach((n, i) => drawBall(ctx, n, x + 150 + i * 22, 24, 9));
        if (!want.length) drawBall(ctx, 8, x + 150, 24, 9);
      } else text(ctx, "open table", x + 200, 24, { size: 12, color: "rgba(255,255,255,0.6)" });
    }
    if (g.message && !moving(g)) text(ctx, g.message, W / 2, 24, { size: 14, weight: 800, color: "#fde68a" });
    if (charging.current !== null) text(ctx, "Release Space to shoot", W / 2, OY + TH + 22, { size: 13, color: "#fff", font: DISPLAY_FONT });
  };

  const onPointer = (p: { type: string; x: number; y: number }) => {
    if (phaseRef.current !== "playing") return;
    const g = game.current;
    if (moving(g) || isAiTurn() || thinking.current || g.over) return;
    const tx = p.x - OX;
    const ty = p.y - OY;
    if (g.ballInHand) {
      if (p.type === "down" && canPlace(g, tx, ty)) {
        placeCue(g, tx, ty);
        play("place");
        syncHud();
      }
      return;
    }
    if (p.type === "move" && touch) return;
    if (p.type === "down" || p.type === "move") {
      const c = cue(g);
      if (Math.hypot(tx - c.x, ty - c.y) > 4) aim.current = Math.atan2(ty - c.y, tx - c.x);
    }
  };

  // Touch: dragging updates the aim (pointer "move" events arrive while a finger is down).
  const touchAim = (p: { type: string; x: number; y: number }) => {
    if (touch && p.type === "move") {
      const g = game.current;
      if (moving(g) || g.ballInHand || isAiTurn() || thinking.current) return;
      const c = cue(g);
      aim.current = Math.atan2(p.y - OY - c.y, p.x - OX - c.x);
    }
    onPointer(p);
  };

  const g = game.current;
  const myTurn = phase === "playing" && !hud.busy && !hud.hand && !(mode === "ai" && hud.turn === 1) && !g.over;
  const rec = record.current[level];

  return (
    <div className="absolute inset-0 flex flex-col bg-[#1c1008]" style={{ touchAction: "none" }}>
      <div className="relative min-h-0 flex-1">
        <GameCanvas width={W} height={H} draw={draw} background="#1c1008" onPointer={touchAim} cursor="crosshair" />
        {touch && phase === "playing" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] font-semibold text-white/70 [@media(orientation:landscape)]:hidden">
            ↻ Turn your phone sideways for a bigger table
          </div>
        )}
      </div>
      {phase === "playing" && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-white/10 bg-black/40 px-3 py-2 text-xs text-white">
          <label className="flex items-center gap-2">
            Power
            <input type="range" min={5} max={100} value={Math.round(power * 100)} onChange={(e) => setPower(Number(e.target.value) / 100)} className="w-28 accent-sky-400 sm:w-40" />
            <span className="w-8 tabular-nums">{Math.round(power * 100)}%</span>
          </label>
          <label className="flex items-center gap-2">
            Spin
            <input type="range" min={-100} max={100} step={25} value={Math.round(spin * 100)} onChange={(e) => setSpin(Number(e.target.value) / 100)} className="w-20 accent-amber-400 sm:w-28" />
            <span className="w-14">{spin > 0 ? "follow" : spin < 0 ? "draw" : "centre"}</span>
          </label>
          <button
            type="button"
            disabled={!myTurn}
            onClick={() => shoot(aim.current, power, spin)}
            className="rounded-lg bg-sky-400 px-5 py-1.5 text-sm font-black text-black disabled:opacity-40"
          >
            Shoot
          </button>
          {touch && (
            <button type="button" aria-label="Pause" className="rounded-full border border-white/25 px-3 py-1" onClick={() => go("paused")}>⏸</button>
          )}
        </div>
      )}
      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={best || undefined}
          bestLabel="Wins vs the computer"
          extra={
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {(["ai", "two"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-lg border py-2 text-sm font-bold ${mode === m ? "border-sky-400 bg-sky-400/20" : "border-white/15 bg-white/5"}`}>
                    {m === "ai" ? "vs Computer" : "2 Players"}
                  </button>
                ))}
              </div>
              {mode === "ai" && (
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "normal", "hard"] as const).map((l) => (
                    <button key={l} type="button" onClick={() => setLevel(l)} className={`rounded-lg border py-1.5 text-xs font-bold capitalize ${level === l ? "border-sky-400 bg-sky-400/20" : "border-white/15 bg-white/5"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
              {mode === "ai" && rec && <p className="text-xs text-white/55">Record vs {level}: {rec.won} won · {rec.lost} lost</p>}
            </div>
          }
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={start} />}
      {phase === "over" && (
        <GameOverPanel title={result.won ? "Game won!" : "Game lost"} accent={meta.accent} score={result.text} scoreLabel="Result" best={best || undefined} isBest={result.isBest} onRestart={start} />
      )}
    </div>
  );
}
