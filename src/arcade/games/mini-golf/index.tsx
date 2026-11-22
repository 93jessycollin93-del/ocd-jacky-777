// Mini Golf: rules and the 18 holes in logic.ts; this file draws the course, handles the drag-to-putt input,
// plays the sounds and runs the scorecard between holes and at the end of the round.
import { useCallback, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { DISPLAY_FONT, Floaters, Particles, circle, fillRoundRect, text } from "../../kit/draw";
import { useKeyPress } from "../../kit/input";
import { noise, play, tone } from "../../kit/sfx";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, Overlay, PausePanel, PrimaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import {
  BALL_R, CH, COURSE_PAR, CUP_R, CW, HOLES, MAX_STROKES, finishHole, newRound, parSoFar, shoot, startHole, step, total, wallsAt,
  type GolfEvent, type GolfState,
} from "./logic";

type Phase = "ready" | "playing" | "paused" | "card" | "over";
const PULL = 170;
const HOLE_BEST_KEY = "mini-golf:hole-best";

const termFor = (strokes: number, par: number) => {
  if (strokes === 1) return "Hole in one!";
  const d = strokes - par;
  return ["Albatross!", "Eagle!", "Birdie!", "Par", "Bogey", "Double bogey"][d + 3] ?? `+${d}`;
};

export default function MiniGolf({ touch, best, submitScore }: GameProps) {
  const game = useRef<GolfState>(newRound());
  const fx = useRef({ particles: new Particles(300), floaters: new Floaters(), sink: 0, banner: "", bannerT: 0 });
  const aim = useRef<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [result, setResult] = useState({ score: 0, isBest: false });
  const holeBest = useRef<number[]>(loadState<number[]>(HOLE_BEST_KEY) ?? []);
  const [, setTick] = useState(0);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const announce = (s: string) => {
    fx.current.banner = s;
    fx.current.bannerT = 2;
  };

  const start = useCallback(() => {
    game.current = newRound();
    fx.current.sink = 0;
    announce(`Hole 1 · Par ${HOLES[0].par}`);
    play("select");
    go("playing");
  }, [go]);

  const endHole = () => {
    const g = game.current;
    const strokes = Math.min(MAX_STROKES, g.strokes);
    const hb = holeBest.current;
    if (!hb[g.hole] || strokes < hb[g.hole]) {
      hb[g.hole] = strokes;
      saveState(HOLE_BEST_KEY, hb);
    }
    window.setTimeout(() => {
      go("card");
      setTick((t) => t + 1);
    }, 1100);
  };

  const nextHole = () => {
    const g = game.current;
    const done = finishHole(g);
    fx.current.sink = 0;
    if (done) {
      const score = total(g.card);
      const isBest = submitScore(score);
      setResult({ score, isBest });
      play(score <= COURSE_PAR ? "win" : "levelup");
      go("over");
      return;
    }
    announce(`Hole ${g.hole + 1} · Par ${HOLES[g.hole].par}`);
    go("playing");
  };

  const handle = (events: GolfEvent[]) => {
    const g = game.current;
    const f = fx.current;
    for (const e of events) {
      if (e.type === "wall") tone(320, 0.05, "square", 0.04);
      else if (e.type === "lipout") {
        tone(700, 0.08, "triangle", 0.05);
        f.floaters.add(g.ball.x, g.ball.y - 16, "Lip out!", "#fde68a", 16);
      } else if (e.type === "water") {
        noise(0.4, 0.08, { type: "lowpass", freq: 900 });
        f.particles.burst(g.ball.x, g.ball.y, 16, { color: ["#7dd3fc", "#e0f2fe"], speed: 120, size: 3, gravity: 200 });
        f.floaters.add(g.ball.x, g.ball.y - 16, "Splash! +1", "#7dd3fc", 16);
      } else if (e.type === "portal") play("powerup");
      else if (e.type === "sunk") {
        const h = HOLES[g.hole];
        play("coin");
        tone(880, 0.3, "sine", 0.05, { slide: 1320, delay: 0.1 });
        f.particles.burst(h.cup.x, h.cup.y, 30, { color: ["#fde047", "#ffffff", "#22c55e"], speed: 180, size: 4, gravity: 80 });
        f.sink = 1;
        announce(termFor(g.strokes, h.par));
        endHole();
      } else if (e.type === "maxed") {
        announce(`Stroke limit (${MAX_STROKES})`);
        play("lose");
        endHole();
      }
    }
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) go(p === "playing" ? "paused" : "playing");
    else if (code === "KeyR" && p === "playing" && !game.current.ball.moving && !game.current.ball.sunk) {
      startHole(game.current, game.current.hole);
      play("click");
    } else if ((code === "Space" || code === "Enter") && p === "card") nextHole();
  });

  const draw = (ctx: CanvasRenderingContext2D, _view: View, dt: number, time: number) => {
    const g = game.current;
    const f = fx.current;
    const h = HOLES[g.hole];
    if (phaseRef.current === "playing") {
      const steps = Math.max(1, Math.round(dt * 120));
      for (let i = 0; i < steps; i++) handle(step(g, Math.min(dt, 0.05) / steps));
    }
    f.particles.update(dt);
    f.floaters.update(dt);
    f.bannerT = Math.max(0, f.bannerT - dt);
    if (f.sink > 0) f.sink = Math.max(0, f.sink - dt * 2);

    // Table and felt.
    ctx.fillStyle = "#3f2a14";
    ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = "#4a3219";
    for (let y = 0; y < CH; y += 26) ctx.fillRect(0, y, CW, 2);
    // Felt: fill the area inside the outer walls by filling the hole's bounding box, then the walls draw on top.
    const xs = h.walls.flatMap((w) => [w.a.x, w.b.x]);
    const ys = h.walls.flatMap((w) => [w.a.y, w.b.y]);
    const outer = h.walls.slice(0, h.walls.findIndex((w, i) => i > 0 && w.b.x === h.walls[0].a.x && w.b.y === h.walls[0].a.y) + 1 || h.walls.length);
    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.moveTo(outer[0].a.x, outer[0].a.y);
    for (const w of outer) ctx.lineTo(w.b.x, w.b.y);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let x = Math.min(...xs); x < Math.max(...xs); x += 40) ctx.fillRect(x, Math.min(...ys), 20, Math.max(...ys) - Math.min(...ys));
    // Zones.
    for (const z of h.zones) {
      if (z.kind === "sand") {
        fillRoundRect(ctx, z.x, z.y, z.w, z.h, 24, "#e7c98b");
        ctx.fillStyle = "rgba(161,98,7,0.25)";
        for (let i = 0; i < 40; i++) ctx.fillRect(z.x + ((i * 37) % z.w), z.y + ((i * 53) % z.h), 2, 2);
      } else if (z.kind === "water") {
        fillRoundRect(ctx, z.x, z.y, z.w, z.h, 18, "#0ea5e9");
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const yy = z.y + ((i + 1) * z.h) / 5;
          ctx.beginPath();
          for (let x = z.x + 10; x < z.x + z.w - 10; x += 8) ctx.lineTo(x, yy + Math.sin(x * 0.08 + time * 2 + i) * 3);
          ctx.stroke();
        }
      } else if (z.kind === "ice") {
        fillRoundRect(ctx, z.x, z.y, z.w, z.h, 10, "rgba(224,242,254,0.75)");
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          ctx.moveTo(z.x + ((i * 71) % z.w), z.y + ((i * 41) % z.h));
          ctx.lineTo(z.x + ((i * 71 + 30) % z.w), z.y + ((i * 41 + 18) % z.h));
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = "rgba(21,128,61,0.55)";
        ctx.fillRect(z.x, z.y, z.w, z.h);
        const a = Math.atan2(z.gy ?? 0, z.gx ?? 0);
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 3;
        for (let yy = z.y + 30; yy < z.y + z.h; yy += 60) {
          for (let xx = z.x + 30; xx < z.x + z.w; xx += 60) {
            const o = ((time * 30) % 20) - 10;
            const cx = xx + Math.cos(a) * o;
            const cy = yy + Math.sin(a) * o;
            ctx.beginPath();
            ctx.moveTo(cx - Math.cos(a - 0.6) * 10, cy - Math.sin(a - 0.6) * 10);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx - Math.cos(a + 0.6) * 10, cy - Math.sin(a + 0.6) * 10);
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
    // Portals.
    for (const p of h.portals) {
      for (const [pt, col] of [[p.a, "#a855f7"], [p.b, "#22d3ee"]] as const) {
        circle(ctx, pt.x, pt.y, 16, col);
        circle(ctx, pt.x, pt.y, 11 + Math.sin(time * 4) * 2, "#1e1b4b");
      }
    }
    // Cup and flag.
    circle(ctx, h.cup.x, h.cup.y, CUP_R + 2, "#14532d");
    circle(ctx, h.cup.x, h.cup.y, CUP_R, "#0b0f0a");
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(h.cup.x, h.cup.y);
    ctx.lineTo(h.cup.x, h.cup.y - 46);
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(h.cup.x, h.cup.y - 46);
    ctx.quadraticCurveTo(h.cup.x + 14, h.cup.y - 44 + Math.sin(time * 5) * 3, h.cup.x + 26, h.cup.y - 40);
    ctx.lineTo(h.cup.x, h.cup.y - 32);
    ctx.fill();
    // Walls, including moving ones.
    ctx.lineCap = "round";
    for (const [w, mover] of wallsAt(h, g.time).map((w, i) => [w, i >= h.walls.length] as const)) {
      ctx.strokeStyle = mover ? "#7c2d12" : "#92400e";
      ctx.lineWidth = mover ? 9 : 10;
      ctx.beginPath();
      ctx.moveTo(w.a.x, w.a.y);
      ctx.lineTo(w.b.x, w.b.y);
      ctx.stroke();
      ctx.strokeStyle = mover ? "#f97316" : "#d97706";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    for (const m of h.movers) if (m.kind === "spinner") circle(ctx, m.cx, m.cy, 8, "#fde68a");

    // Aim line: a dotted guide in the shot direction, as long as the power (no bounce prediction).
    const b = g.ball;
    if (aim.current && !b.moving && !b.sunk) {
      const dx = b.x - aim.current.x;
      const dy = b.y - aim.current.y;
      const pull = Math.min(PULL, Math.hypot(dx, dy));
      const ang = Math.atan2(dy, dx);
      const k = pull / PULL;
      ctx.fillStyle = `hsl(${120 - k * 120}, 90%, 60%)`;
      for (let d = 18; d < 18 + k * 150; d += 12) ctx.fillRect(b.x + Math.cos(ang) * d - 2, b.y + Math.sin(ang) * d - 2, 4, 4);
      fillRoundRect(ctx, b.x - 30, b.y + 16, 60, 6, 3, "rgba(0,0,0,0.5)");
      fillRoundRect(ctx, b.x - 30, b.y + 16, 60 * k, 6, 3, `hsl(${120 - k * 120}, 90%, 55%)`);
    }
    // Ball (shrinks into the cup).
    const r = BALL_R * (b.sunk ? f.sink : 1);
    if (r > 0.2) {
      circle(ctx, b.x + 2, b.y + 3, r, "rgba(0,0,0,0.3)");
      circle(ctx, b.x, b.y, r, "#ffffff");
      circle(ctx, b.x - r * 0.3, b.y - r * 0.3, r * 0.35, "#e5e7eb");
    }
    if (!b.moving && !b.sunk && !aim.current && phaseRef.current === "playing") {
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + Math.sin(time * 5) * 0.25})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    f.particles.draw(ctx);
    f.floaters.draw(ctx);

    // HUD.
    fillRoundRect(ctx, 10, 8, 250, 34, 10, "rgba(0,0,0,0.45)");
    text(ctx, `Hole ${g.hole + 1}/18 · ${h.name}`, 22, 25, { align: "left", size: 14, weight: 800, color: "#fff" });
    fillRoundRect(ctx, CW - 214, 8, 204, 34, 10, "rgba(0,0,0,0.45)");
    text(ctx, `Par ${h.par} · Strokes ${g.strokes}`, CW - 112, 25, { size: 14, weight: 800, color: g.strokes > h.par ? "#fca5a5" : "#bbf7d0" });
    if (f.bannerT > 0) {
      const a = Math.min(1, f.bannerT * 2);
      text(ctx, f.banner, CW / 2, CH / 2, { size: 38, font: DISPLAY_FONT, weight: 900, color: `rgba(254,249,195,${a})`, stroke: `rgba(20,83,45,${a})`, strokeWidth: 7 });
    }
  };

  const g = game.current;
  const card = g.card.slice();
  if (phase === "card") card[g.hole] = Math.min(MAX_STROKES, g.strokes);
  const played = card.length;

  return (
    <div className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas
        width={CW}
        height={CH}
        draw={draw}
        background="#2a1c0d"
        onPointer={(p) => {
          if (phaseRef.current === "ready" && p.type === "down") return start();
          if (phaseRef.current !== "playing") return;
          const b = game.current.ball;
          if (p.type === "down" && !b.moving && !b.sunk && Math.hypot(p.x - b.x, p.y - b.y) < 90) aim.current = { x: p.x, y: p.y };
          else if (p.type === "move" && aim.current) aim.current = { x: p.x, y: p.y };
          else if ((p.type === "up" || p.type === "cancel") && aim.current) {
            const dx = b.x - aim.current.x;
            const dy = b.y - aim.current.y;
            const pull = Math.hypot(dx, dy);
            aim.current = null;
            if (p.type === "up" && pull > 12 && shoot(game.current, Math.atan2(dy, dx), Math.min(1, pull / PULL))) {
              tone(220 + Math.min(1, pull / PULL) * 300, 0.08, "triangle", 0.08);
            }
          }
        }}
      />
      {touch && phase === "playing" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] font-semibold text-white/70 [@media(orientation:landscape)]:hidden">
          ↻ Turn your phone sideways for a bigger course
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
          bestLabel={`Best round (par ${COURSE_PAR})`}
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={start} />}
      {phase === "card" && (
        <Overlay>
          <h2 className="text-xl font-black" style={{ color: meta.accent }}>Scorecard</h2>
          <div className="mt-3 grid grid-cols-9 gap-1 text-center text-[11px]">
            {HOLES.map((h, i) => (
              <div key={i} className={`rounded border px-0.5 py-1 ${i === g.hole ? "border-emerald-300 bg-emerald-300/15" : "border-white/10"}`}>
                <div className="text-white/45">{i + 1}</div>
                <div className={`font-bold ${card[i] === undefined ? "text-white/25" : card[i] < h.par ? "text-emerald-300" : card[i] > h.par ? "text-rose-300" : "text-white"}`}>
                  {card[i] ?? h.par}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-white/70">
            {total(card)} strokes after {played} hole{played === 1 ? "" : "s"} ({total(card) - parSoFar(card) >= 0 ? "+" : ""}{total(card) - parSoFar(card)} vs par)
            {holeBest.current[g.hole] ? ` · best on this hole: ${holeBest.current[g.hole]}` : ""}
          </p>
          <div className="mt-4">
            <PrimaryButton onClick={nextHole} accent={meta.accent} autoFocus>{g.hole + 1 >= HOLES.length ? "Finish round" : `Hole ${g.hole + 2}`}</PrimaryButton>
          </div>
        </Overlay>
      )}
      {phase === "over" && (
        <GameOverPanel title="Round complete" accent={meta.accent} score={`${result.score} (${result.score - COURSE_PAR >= 0 ? "+" : ""}${result.score - COURSE_PAR})`} scoreLabel="Strokes" best={best || undefined} isBest={result.isBest} onRestart={start} />
      )}
      {touch && phase === "playing" && (
        <button type="button" aria-label="Pause" className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white" onClick={() => go("paused")}>
          ⏸
        </button>
      )}
    </div>
  );
}
