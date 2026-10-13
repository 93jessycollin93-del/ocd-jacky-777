// Territory: rules live in logic.ts and ai.ts; this file draws the raised-tile board, trails, claim flashes and
// ripples, handles keys / mouse / touch steering, and runs the start-pause-over flow.
import { useCallback, useRef, useState } from "react";
import { GameCanvas, type CanvasPointer, type View } from "../../kit/GameCanvas";
import { Particles, Shake, clamp, damp, shade } from "../../kit/draw";
import { useKeyPress } from "../../kit/input";
import { randomSeed } from "../../kit/rng";
import { play, tone } from "../../kit/sfx";
import { Joystick } from "../../kit/TouchPad";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { gated } from "./audio";
import { advance, newWorld, opposite, percent, turn, DX, DY, type TPlayer, type TWorld } from "./logic";
import { meta } from "./meta";
import { useViewWidth } from "./useViewWidth";

type Phase = "ready" | "playing" | "paused" | "over";

const TAU = Math.PI * 2;
/** How tall the raised land looks, in cells. */
const LIFT = 0.13;
const KEY_DIRS: Record<string, number> = {
  ArrowRight: 0, KeyD: 0, ArrowDown: 1, KeyS: 1, ArrowLeft: 2, KeyA: 2, ArrowUp: 3, KeyW: 3,
};
const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

interface Ripple {
  x: number;
  y: number;
  t: number;
  color: string;
  size: number;
}

export default function TerritoryGame({ touch, best, submitScore }: GameProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const viewW = useViewWidth(wrap);
  const world = useRef<TWorld>(null as unknown as TWorld);
  if (!world.current) world.current = newWorld(randomSeed(), { player: false });
  const cam = useRef({ x: 60, y: 60, init: false });
  const fx = useRef({
    particles: new Particles(300),
    shake: new Shake(),
    ripples: [] as Ripple[],
    toasts: [] as { text: string; life: number; color: string }[],
    mini: null as HTMLCanvasElement | null,
    miniT: 0,
    hint: 0,
    runTime: 0,
    rank: 0,
    bestRank: 99,
  });
  const input = useRef({ mx: 0, my: 0, mouseActive: false, joyX: 0, joyY: 0, lastJoy: -1 });
  const phaseRef = useRef<Phase>("ready");
  const [phase, setPhase] = useState<Phase>("ready");
  const [result, setResult] = useState({ pct: 0, kills: 0, by: "", time: 0, bestRank: 0, isBest: false });

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const start = useCallback(() => {
    world.current = newWorld(randomSeed(), { player: true });
    const me = world.current.me!;
    me.hold = true;
    const f = fx.current;
    f.particles.clear();
    f.ripples = [];
    f.toasts = [];
    f.hint = 9;
    f.runTime = 0;
    f.bestRank = 99;
    f.miniT = 0;
    cam.current.init = false;
    input.current.lastJoy = -1;
    input.current.joyX = 0;
    input.current.joyY = 0;
    play("select");
    go("playing");
  }, [go]);

  /** Ask the player's head to go in direction d (the first request also gets it moving). */
  const steer = (d: number) => {
    const me = world.current.me;
    if (!me || !me.alive || phaseRef.current !== "playing") return;
    if (me.hold) {
      me.hold = false;
      me.dir = d;
      fx.current.hint = Math.min(fx.current.hint, 3);
      return;
    }
    turn(me, d);
  };

  useKeyPress((code, e) => {
    const p = phaseRef.current;
    if (code in KEY_DIRS) {
      input.current.mouseActive = false;
      e.preventDefault();
      steer(KEY_DIRS[code]);
    } else if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) go(p === "playing" ? "paused" : "playing");
    else if ((code === "Enter" || code === "Space") && (p === "ready" || p === "over")) start();
  }, true);

  const onPointer = (p: CanvasPointer) => {
    if (touch && p.pointerType === "touch") return;
    const inp = input.current;
    if (p.type === "move" || p.type === "down") {
      if (Math.hypot(p.x - inp.mx, p.y - inp.my) > 6) inp.mouseActive = true;
      inp.mx = p.x;
      inp.my = p.y;
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number, time: number) => {
    const s = world.current;
    const f = fx.current;
    const inp = input.current;
    const phase = phaseRef.current;
    const me = s.me;
    const c = cam.current;
    const cellPx = clamp(Math.min(view.w, view.h) / 16, 22, 44);

    // ------------------------------------------------------------ steering by mouse / joystick
    if (phase === "playing" && me && me.alive) {
      if (touch) {
        const mag = Math.hypot(inp.joyX, inp.joyY);
        if (mag > 0.45) {
          const d = Math.abs(inp.joyX) > Math.abs(inp.joyY) ? (inp.joyX > 0 ? 0 : 2) : inp.joyY > 0 ? 1 : 3;
          if (d !== inp.lastJoy) {
            inp.lastJoy = d;
            steer(d);
          }
        } else inp.lastJoy = -1;
      } else if (inp.mouseActive) {
        const hx = (me.x - c.x) * cellPx + view.w / 2;
        const hy = (me.y - c.y) * cellPx + view.h / 2;
        const dx = inp.mx - hx;
        const dy = inp.my - hy;
        if (Math.hypot(dx, dy) > cellPx * 1.6) {
          const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : dy > 0 ? 1 : 3;
          const last = me.queue.length ? me.queue[me.queue.length - 1] : me.dir;
          if (d !== last && d !== opposite(last)) steer(d);
        }
      }
    }

    // ------------------------------------------------------------ simulate
    if (phase !== "paused") {
      const evs = advance(s, dt);
      if (phase === "playing" && !(me && me.hold)) f.runTime += dt;
      for (let i = 0; i < evs.length; i++) {
        const e = evs[i];
        const owner = s.players[("pid" in e ? e.pid : e.type === "kill" ? e.killer : 1) - 1];
        if (e.type === "claim") {
          if (e.gained > 0) {
            f.ripples.push({ x: e.x, y: e.y, t: 0, color: owner.color, size: clamp(Math.sqrt(e.gained) * 0.9, 3, 14) });
            if (f.ripples.length > 12) f.ripples.shift();
          }
          if (owner.isPlayer) {
            f.particles.burst(e.x, e.y, Math.min(40, 10 + e.gained / 6), { color: [owner.color, "#ffffff", shade(owner.color, 0.25)], speed: 5, size: 0.22, gravity: 0, life: 0.8, drag: 1.8 });
            f.shake.add(Math.min(0.4, e.gained / 400));
            gated("claim", 90, () => {
              tone(300 + Math.min(300, e.gained), 0.16, "triangle", 0.09, { slide: 640 + Math.min(500, e.gained * 1.5) });
              if (e.gained > 60) play("coin");
            });
            if (e.gained >= 12) f.toasts.push({ text: `+${e.gained} cells`, life: 1.6, color: "#fde68a" });
            if (f.toasts.length > 3) f.toasts.shift();
          }
        } else if (e.type === "kill") {
          const victim = s.players[e.victim - 1];
          if (owner.isPlayer) {
            f.toasts.push({ text: `You cut ${victim.name}!`, life: 2.2, color: "#fca5a5" });
            play("hit");
            f.shake.add(0.3);
          }
        } else if (e.type === "death") {
          const victim = owner;
          f.particles.burst(e.x, e.y, victim.isPlayer ? 50 : 24, { color: [victim.color, "#ffffff"], speed: 6, size: 0.26, gravity: 0, life: 0.9, drag: 1.6 });
          if (victim.isPlayer && me) {
            play("explode");
            window.setTimeout(() => play("lose"), 450);
            f.shake.add(0.8);
            const isBest = submitScore(Math.round(me.peakPct * 10));
            setResult({ pct: me.peakPct, kills: me.kills, by: me.diedBy, time: f.runTime, bestRank: f.bestRank === 99 ? f.rank : f.bestRank, isBest });
            window.setTimeout(() => {
              if (phaseRef.current === "playing" || phaseRef.current === "paused") go("over");
            }, 1000);
          } else if (!victim.isPlayer) gated("botdeath", 160, () => tone(220, 0.1, "sine", 0.04, { slide: 110 }));
        }
      }
      f.particles.update(dt);
      f.shake.update(dt);
      for (const r of f.ripples) r.t += dt;
      f.ripples = f.ripples.filter((r) => r.t < 1.1);
      for (let i = f.toasts.length - 1; i >= 0; i--) {
        f.toasts[i].life -= dt;
        if (f.toasts[i].life <= 0) f.toasts.splice(i, 1);
      }
      f.hint = Math.max(0, f.hint - dt * (me && me.hold ? 0 : 1));
    }

    // Rank by land.
    const order = s.players.filter((p) => p.alive).sort((a, b) => s.counts[b.id] - s.counts[a.id]);
    if (me && me.alive) {
      f.rank = order.indexOf(me) + 1;
      if (f.rank < f.bestRank) f.bestRank = f.rank;
    }

    // ------------------------------------------------------------ camera
    let focus: TPlayer | null = me && me.alive ? me : null;
    if (!focus && phase !== "over") focus = order[0] ?? null;
    if (focus) {
      if (!c.init) {
        c.x = focus.x;
        c.y = focus.y;
        c.init = true;
      } else {
        c.x = damp(c.x, focus.x, 7, dt);
        c.y = damp(c.y, focus.y, 7, dt);
      }
    }

    // ------------------------------------------------------------ board
    ctx.fillStyle = "#070912";
    ctx.fillRect(0, 0, view.w, view.h);
    const [shx, shy] = f.shake.offset(8);
    ctx.save();
    ctx.translate(view.w / 2 + shx, view.h / 2 + shy);
    ctx.scale(cellPx, cellPx);
    ctx.translate(-c.x, -c.y);
    const hw = view.w / 2 / cellPx + 1;
    const hh = view.h / 2 / cellPx + 1;
    const cx0 = Math.max(0, Math.floor(c.x - hw));
    const cx1 = Math.min(s.w - 1, Math.ceil(c.x + hw));
    const cy0 = Math.max(0, Math.floor(c.y - hh));
    const cy1 = Math.min(s.h - 1, Math.ceil(c.y + hh));

    // Floor: a quiet checkerboard.
    for (let y = cy0; y <= cy1; y++) {
      for (let x = cx0; x <= cx1; x++) {
        ctx.fillStyle = (x + y) & 1 ? "#151a2d" : "#171d31";
        ctx.fillRect(x, y, 1.02, 1.02);
      }
    }
    // The wall.
    ctx.strokeStyle = "rgba(248,113,113,0.9)";
    ctx.lineWidth = 0.14;
    ctx.strokeRect(0, 0, s.w, s.h);
    ctx.strokeStyle = "rgba(248,113,113,0.25)";
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-0.2, -0.2, s.w + 0.4, s.h + 0.4);

    // Land: raised plates, row by row so lower rows cover the sides of higher ones.
    const tops: string[] = [];
    const sides: string[] = [];
    const lights: string[] = [];
    for (const p of s.players) {
      tops[p.id] = shade(p.color, 0.02);
      sides[p.id] = shade(p.color, -0.32);
      lights[p.id] = shade(p.color, 0.3);
    }
    const w = s.w;
    for (let y = cy0; y <= cy1; y++) {
      for (let x = cx0; x <= cx1; x++) {
        const o = s.owner[y * w + x];
        if (!o) continue;
        const below = y + 1 < s.h ? s.owner[(y + 1) * w + x] : 0;
        if (below !== o) {
          ctx.fillStyle = sides[o];
          ctx.fillRect(x, y + 1 - LIFT, 1.01, LIFT + 0.01);
        }
      }
      for (let x = cx0; x <= cx1; x++) {
        const o = s.owner[y * w + x];
        if (!o) continue;
        ctx.fillStyle = tops[o];
        ctx.fillRect(x, y - LIFT, 1.01, 1.01);
        const above = y > 0 ? s.owner[(y - 1) * w + x] : 0;
        const left = x > 0 ? s.owner[y * w + x - 1] : 0;
        const right = x + 1 < w ? s.owner[y * w + x + 1] : 0;
        if (above !== o) {
          ctx.fillStyle = lights[o];
          ctx.fillRect(x, y - LIFT, 1.01, 0.07);
        }
        if (left !== o) {
          ctx.fillStyle = sides[o];
          ctx.fillRect(x, y - LIFT, 0.05, 1);
        }
        if (right !== o) {
          ctx.fillStyle = sides[o];
          ctx.fillRect(x + 0.95, y - LIFT, 0.05, 1);
        }
        const age = s.time - s.flashT[y * w + x];
        if (age < 0.75) {
          ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - age / 0.75)})`;
          ctx.fillRect(x, y - LIFT, 1.01, 1.01);
        }
      }
    }
    // Cells that just became free flash too (so a death reads clearly).
    for (let y = cy0; y <= cy1; y++) {
      for (let x = cx0; x <= cx1; x++) {
        const i = y * w + x;
        if (s.owner[i]) continue;
        const age = s.time - s.flashT[i];
        if (age < 0.5) {
          ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - age / 0.5)})`;
          ctx.fillRect(x, y, 1.01, 1.01);
        }
      }
    }

    // Trails, with a flowing highlight, then heads.
    for (const p of s.players) {
      if (!p.alive || !p.trail.length) continue;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      const trace = () => {
        ctx.beginPath();
        for (let i = 0; i < p.trail.length; i++) {
          const cc = p.trail[i];
          const tx = (cc % w) + 0.5;
          const ty = Math.floor(cc / w) + 0.5 - LIFT;
          if (i === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        }
        ctx.lineTo(p.x, p.y - LIFT);
      };
      trace();
      ctx.strokeStyle = shade(p.color, -0.25);
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      trace();
      ctx.strokeStyle = shade(p.color, 0.18);
      ctx.lineWidth = 0.42;
      ctx.stroke();
      trace();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 0.1;
      ctx.setLineDash([0.3, 0.5]);
      ctx.lineDashOffset = -time * 2.2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // Fresh trail cells pop in.
      for (let i = p.trail.length - 1; i >= 0 && i > p.trail.length - 4; i--) {
        const age = s.time - p.trailT[i];
        if (age < 0.25) {
          const cc = p.trail[i];
          ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - age / 0.25)})`;
          ctx.beginPath();
          ctx.arc((cc % w) + 0.5, Math.floor(cc / w) + 0.5 - LIFT, 0.3 + age * 1.5, 0, TAU);
          ctx.fill();
        }
      }
    }
    for (const p of s.players) {
      if (!p.alive) continue;
      const hx = p.x;
      const hy = p.y - LIFT;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(hx, p.y + 0.12, 0.44, 0.22, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = shade(p.color, -0.2);
      ctx.beginPath();
      ctx.arc(hx, hy, 0.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = shade(p.color, 0.1);
      ctx.beginPath();
      ctx.arc(hx, hy - 0.04, 0.45, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(hx - 0.14, hy - 0.18, 0.13, 0, TAU);
      ctx.fill();
      // Eyes look where it's heading.
      const ex = DX[p.dir];
      const ey = DY[p.dir];
      for (const side of [-1, 1]) {
        const px = hx + ex * 0.12 - ey * side * 0.17;
        const py = hy + ey * 0.12 + ex * side * 0.17;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(px, py, 0.1, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.arc(px + ex * 0.04, py + ey * 0.04, 0.05, 0, TAU);
        ctx.fill();
      }
    }
    // Claim ripples.
    for (const r of f.ripples) {
      const k = r.t / 1.1;
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = 0.65 * (1 - k);
      ctx.lineWidth = 0.22 * (1 - k * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y - LIFT, 0.5 + k * r.size, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    f.particles.draw(ctx);
    ctx.restore();

    // Names above heads (screen space so they stay crisp).
    ctx.font = "700 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    for (const p of s.players) {
      if (!p.alive) continue;
      const sx = (p.x - c.x) * cellPx + view.w / 2 + shx;
      const sy = (p.y - c.y) * cellPx + view.h / 2 + shy - cellPx * 0.95;
      if (sx < -40 || sx > view.w + 40 || sy < -20 || sy > view.h + 20) continue;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.strokeText(p.name, sx, sy);
      ctx.fillStyle = p.isPlayer ? "#fff" : "rgba(255,255,255,0.88)";
      ctx.fillText(p.name, sx, sy);
    }

    // ------------------------------------------------------------ minimap (rebuilt a few times a second)
    f.miniT -= dt;
    if (!f.mini || f.miniT <= 0) {
      f.miniT = 0.2;
      if (!f.mini) {
        f.mini = document.createElement("canvas");
        f.mini.width = s.w;
        f.mini.height = s.h;
      }
      const mctx = f.mini.getContext("2d");
      if (mctx) {
        const img = mctx.createImageData(s.w, s.h);
        const rgb: number[][] = [];
        for (const p of s.players) {
          const n = parseInt(p.color.slice(1), 16);
          rgb[p.id] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        }
        for (let i = 0; i < s.owner.length; i++) {
          const o = s.owner[i];
          const k = i * 4;
          if (o) {
            img.data[k] = rgb[o][0];
            img.data[k + 1] = rgb[o][1];
            img.data[k + 2] = rgb[o][2];
            img.data[k + 3] = 255;
          } else {
            img.data[k] = 20;
            img.data[k + 1] = 25;
            img.data[k + 2] = 42;
            img.data[k + 3] = 255;
          }
        }
        mctx.putImageData(img, 0, 0);
      }
    }
    drawHud(ctx, view, s, me, order, f, touch, phase, c, cellPx);
  };

  return (
    <div ref={wrap} className="absolute inset-0 select-none" style={{ touchAction: "none" }}>
      <GameCanvas width={viewW} fit="fill" draw={draw} onPointer={onPointer} background="#070912" cursor="crosshair" />
      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={best ? fmtPct(best / 10) : undefined}
          bestLabel="Best land"
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={start} />}
      {phase === "over" && (
        <GameOverPanel
          title="Cut down!"
          accent={meta.accent}
          score={fmtPct(result.pct)}
          scoreLabel="Peak land owned"
          best={best ? fmtPct(best / 10) : undefined}
          isBest={result.isBest}
          onRestart={start}
        >
          <p className="mt-2 text-sm text-white/70">
            Out by <b className="text-white">{result.by || "the wall"}</b>
          </p>
          <p className="mt-1 text-xs text-white/55">
            {result.kills} {result.kills === 1 ? "kill" : "kills"} · best rank #{result.bestRank || "-"} · lasted {Math.floor(result.time)}s
          </p>
        </GameOverPanel>
      )}
      {touch && (phase === "playing" || phase === "paused") && (
        <Joystick
          className="absolute inset-0 z-10"
          radius={46}
          hint={phase === "playing" ? "drag to steer" : undefined}
          onChange={(x, y) => {
            input.current.joyX = x;
            input.current.joyY = y;
          }}
        />
      )}
      {touch && phase === "playing" && (
        <button
          type="button"
          aria-label="Pause"
          className="absolute left-2 top-2 z-20 h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white"
          onClick={() => go("paused")}
        >
          ⏸
        </button>
      )}
    </div>
  );
}

function drawHud(
  ctx: CanvasRenderingContext2D, view: View, s: TWorld, me: TPlayer | null, order: TPlayer[],
  f: { mini: HTMLCanvasElement | null; toasts: { text: string; life: number; color: string }[]; hint: number; rank: number },
  touch: boolean, phase: Phase, c: { x: number; y: number }, cellPx: number,
) {
  const compact = view.w < 620 || view.h < 460;
  ctx.textBaseline = "middle";

  // ---- leaderboard by % owned
  const lbW = compact ? 138 : 176;
  const rowH = compact ? 14 : 18;
  const fs = compact ? 10.5 : 12.5;
  const lbX = view.w - lbW - 8;
  const lbY = 8;
  const rows = Math.min(9, order.length);
  const myIdx = me ? order.indexOf(me) : -1;
  const extra = me && me.alive && myIdx >= rows ? 1 : 0;
  const lbH = 20 + (rows + extra) * rowH + 6;
  ctx.fillStyle = "rgba(6,8,18,0.6)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(lbX, lbY, lbW, lbH, 10);
  else ctx.rect(lbX, lbY, lbW, lbH);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.font = `800 ${fs - 1}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("LAND OWNED", lbX + 10, lbY + 11);
  ctx.font = `700 ${fs}px system-ui, sans-serif`;
  const row = (rank: number, p: TPlayer, y: number) => {
    if (p === me) {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(lbX + 4, y - rowH / 2 + 1, lbW - 8, rowH - 1);
    }
    ctx.fillStyle = p.color;
    ctx.fillRect(lbX + 9, y - 4, 8, 8);
    ctx.fillStyle = p === me ? "#fff" : "rgba(255,255,255,0.82)";
    ctx.textAlign = "left";
    ctx.fillText(`${rank}. ${trunc(p.name, compact ? 8 : 11)}`, lbX + 21, y);
    ctx.textAlign = "right";
    ctx.fillText(fmtPct(percent(s, p)), lbX + lbW - 10, y);
  };
  for (let i = 0; i < rows; i++) row(i + 1, order[i], lbY + 20 + i * rowH + rowH / 2);
  if (extra && me) row(myIdx + 1, me, lbY + 20 + rows * rowH + rowH / 2);

  // ---- your land and kills
  if (me && (me.alive || phase === "over")) {
    const pct = percent(s, me);
    const x = touch ? 54 : 14;
    ctx.textAlign = "left";
    if (!touch) {
      ctx.fillStyle = "rgba(6,8,18,0.6)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(8, 8, 168, 70, 12);
      else ctx.rect(8, 8, 168, 70);
      ctx.fill();
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText("YOUR LAND", x, 22);
      ctx.font = "900 30px system-ui, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText(fmtPct(pct), x, 46);
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.fillStyle = "#fca5a5";
      ctx.fillText(`Kills ${me.kills} · Rank ${f.rank || "-"} of ${order.length}`, x, 66);
    } else {
      ctx.font = "900 22px system-ui, sans-serif";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.strokeText(fmtPct(pct), x, 18);
      ctx.fillStyle = "#fff";
      ctx.fillText(fmtPct(pct), x, 18);
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.fillText(`Kills ${me.kills} · #${f.rank || "-"}`, x, 36);
    }
  }

  // ---- minimap
  if (f.mini) {
    const ms = compact ? 84 : 118;
    const mx = view.w - ms - 10;
    const my = view.h - ms - 10;
    ctx.fillStyle = "rgba(6,8,18,0.7)";
    ctx.fillRect(mx - 3, my - 3, ms + 6, ms + 6);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(f.mini, mx, my, ms, ms);
    ctx.imageSmoothingEnabled = true;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, ms, ms);
    const k = ms / s.w;
    const vw = (view.w / cellPx) * k;
    const vh = (view.h / cellPx) * k;
    ctx.strokeRect(mx + c.x * k - vw / 2, my + c.y * k - vh / 2, vw, vh);
    if (me && me.alive) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(mx + me.x * k, my + me.y * k, 2.6, 0, TAU);
      ctx.fill();
    }
  }

  // ---- toasts and hint
  ctx.textAlign = "center";
  for (let i = 0; i < f.toasts.length; i++) {
    const t = f.toasts[i];
    ctx.globalAlpha = Math.min(1, t.life * 2);
    ctx.font = "800 16px system-ui, sans-serif";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.strokeText(t.text, view.w / 2, view.h * 0.18 + i * 24);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, view.w / 2, view.h * 0.18 + i * 24);
  }
  if (f.hint > 0 && phase === "playing") {
    ctx.globalAlpha = Math.min(1, f.hint);
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    const msg = me && me.hold ? (touch ? "Drag to pick a direction and start" : "Press an arrow key or WASD to start") : "Leave your land, then loop back to claim what you circle";
    ctx.strokeText(msg, view.w / 2, view.h * 0.84);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(msg, view.w / 2, view.h * 0.84);
  }
  ctx.globalAlpha = 1;
}
