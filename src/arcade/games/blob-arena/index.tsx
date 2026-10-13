// Blob Arena: rules live in logic.ts and ai.ts; this file draws the world (glossy blobs, pellets, thorns),
// plays sounds, reads mouse / keys / touch and runs the start-pause-over flow.
import { useCallback, useRef, useState } from "react";
import { GameCanvas, type CanvasPointer, type View } from "../../kit/GameCanvas";
import { Particles, Shake, clamp, damp } from "../../kit/draw";
import { useHeldKeys, useKeyPress } from "../../kit/input";
import { randomSeed } from "../../kit/rng";
import { noise, play, tone } from "../../kit/sfx";
import { loadState, saveState } from "../../kit/storage";
import { Joystick, TouchButton } from "../../kit/TouchPad";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { gated } from "./audio";
import {
  HALF, THORN_FEEDS, advance, aim, centroid, eject, extent, newWorld, radiusOf, split, totalMass, zoomFor,
  type BlobWorld, type Cell, type Player, type Thorn,
} from "./logic";
import { meta } from "./meta";
import { cellSprite, pelletSprite, thornSprite } from "./sprites";
import { useViewWidth } from "./useViewWidth";

type Phase = "ready" | "playing" | "paused" | "over";

interface Item {
  mass: number;
  cell: Cell | null;
  thorn: Thorn | null;
  owner: Player | null;
}

const TAU = Math.PI * 2;
const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const NAME_KEY = "blob-arena:name";

export default function BlobArena({ touch, best, submitScore }: GameProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const viewW = useViewWidth(wrap);
  const world = useRef<BlobWorld>(null as unknown as BlobWorld);
  if (!world.current) world.current = newWorld(randomSeed(), { player: false });
  const cam = useRef({ x: 0, y: 0, z: 0.5, init: false });
  const fx = useRef({
    particles: new Particles(360),
    shake: new Shake(),
    items: [] as Item[],
    lastRank: 0,
    bestRank: 99,
    hint: 0,
    runTime: 0,
    peakShown: 0,
    combo: 0,
    lastEat: 0,
    toasts: [] as { text: string; life: number; color: string }[],
  });
  const input = useRef({ px: 0, py: 0, active: false, joyX: 0, joyY: 0, ejecting: false, touchEject: false });
  const keys = useHeldKeys();
  const phaseRef = useRef<Phase>("ready");
  const [phase, setPhase] = useState<Phase>("ready");
  const [name, setName] = useState(() => loadState<string>(NAME_KEY) ?? "");
  const [result, setResult] = useState({ peak: 0, eaten: 0, by: "", bestRank: 0, time: 0, isBest: false });

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const start = useCallback(() => {
    world.current = newWorld(randomSeed(), { player: true });
    const me = world.current.me!;
    const nm = name.trim().slice(0, 14);
    me.name = nm || "You";
    saveState(NAME_KEY, nm);
    const f = fx.current;
    f.particles.clear();
    f.toasts = [];
    f.bestRank = 99;
    f.hint = 7;
    f.runTime = 0;
    f.combo = 0;
    cam.current.init = false;
    input.current.joyX = 0;
    input.current.joyY = 0;
    input.current.touchEject = false;
    play("select");
    go("playing");
  }, [go, name]);

  const doSplit = () => {
    const s = world.current;
    if (phaseRef.current === "playing" && s.me?.alive) split(s, 0);
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) go(p === "playing" ? "paused" : "playing");
    else if (code === "Space" && p === "playing") doSplit();
    else if ((code === "Enter" || code === "Space") && (p === "ready" || p === "over")) start();
  });

  const onPointer = (p: CanvasPointer) => {
    if (touch && p.pointerType === "touch") return;
    input.current.px = p.x;
    input.current.py = p.y;
    input.current.active = true;
  };

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number, time: number) => {
    const s = world.current;
    const f = fx.current;
    const inp = input.current;
    const phase = phaseRef.current;
    const me = s.me;
    const c = cam.current;

    // ------------------------------------------------------------ input -> player
    if (phase === "playing" && me && me.alive) {
      const ctr = centroid(me);
      if (touch) {
        const mag = Math.hypot(inp.joyX, inp.joyY);
        if (mag > 0.12) aim(me, ctr.x + (inp.joyX / mag) * 900, ctr.y + (inp.joyY / mag) * 900, clamp(mag * 1.15, 0.2, 1));
        else aim(me, ctr.x, ctr.y, 0);
      } else if (inp.active) {
        aim(me, c.x + (inp.px - view.w / 2) / c.z, c.y + (inp.py - view.h / 2) / c.z, 1);
      } else {
        aim(me, ctr.x, ctr.y, 0);
      }
      if (keys.current.has("KeyW") || inp.touchEject) eject(s, 0);
    }

    // ------------------------------------------------------------ simulate
    if (phase !== "paused") {
      const evs = advance(s, dt);
      if (phase === "playing") f.runTime += dt;
      for (let i = 0; i < evs.length; i++) {
        const e = evs[i];
        switch (e.type) {
          case "pellet": {
            const now = performance.now();
            f.combo = now - f.lastEat < 300 ? Math.min(f.combo + 1, 10) : 0;
            f.lastEat = now;
            gated("pellet", 60, () => tone(480 + f.combo * 30, 0.04, "sine", 0.03));
            break;
          }
          case "eat": {
            const victim = s.players[e.victim];
            const mine = e.eater === 0 && !!me;
            const near = me && me.alive ? Math.hypot(e.x - c.x, e.y - c.y) < 1200 : true;
            if (near) {
              f.particles.burst(e.x, e.y, Math.min(34, 8 + e.mass / 8), { color: [victim.color, "#ffffff"], speed: 120 + radiusOf(e.mass) * 2, size: 6 + radiusOf(e.mass) * 0.08, gravity: 0, life: 0.7, drag: 2.4 });
            }
            if (mine) {
              gated("eatcell", 90, () => {
                play("pop", 0.8);
                tone(160, 0.12, "sine", 0.07, { slide: 90 });
              });
              if (e.mass >= 30) f.toasts.push({ text: `Ate ${victim.name}`, life: 2.2, color: "#fde047" });
              if (f.toasts.length > 3) f.toasts.shift();
              f.shake.add(Math.min(0.35, e.mass / 600));
            } else if (near) gated("botpop", 160, () => tone(300, 0.05, "sine", 0.025, { slide: 160 }));
            break;
          }
          case "split":
            if (e.owner === 0) gated("split", 120, () => {
              noise(0.1, 0.07, { type: "bandpass", freq: 700, sweep: 1800, q: 1 });
              tone(260, 0.1, "triangle", 0.06, { slide: 520 });
            });
            f.particles.burst(e.x, e.y, 8, { color: s.players[e.owner].color, speed: 160, size: 5, gravity: 0, life: 0.4 });
            break;
          case "eject":
            if (e.owner === 0) gated("eject", 70, () => tone(330, 0.045, "sine", 0.045, { slide: 190 }));
            break;
          case "burst":
            f.particles.burst(e.x, e.y, 26, { color: ["#4ade80", "#22c55e", s.players[e.owner].color], speed: 280, size: 7, gravity: 0, life: 0.7 });
            if (e.owner === 0 || Math.hypot(e.x - c.x, e.y - c.y) < 900) {
              gated("burst", 200, () => noise(0.3, 0.11, { freq: 1100, sweep: 160 }));
              f.shake.add(e.owner === 0 ? 0.5 : 0.15);
            }
            break;
          case "thorn-fed":
            gated("thornfed", 90, () => tone(900, 0.03, "square", 0.025));
            break;
          case "thorn-shot":
            gated("thornshot", 200, () => play("powerup", 1.4));
            break;
          case "merge":
            if (e.owner === 0) gated("merge", 150, () => tone(420, 0.09, "sine", 0.05, { slide: 640 }));
            break;
          case "death":
            if (e.owner === 0 && me) {
              play("explode");
              window.setTimeout(() => play("lose"), 450);
              const isBest = submitScore(Math.floor(me.peak));
              setResult({ peak: Math.floor(me.peak), eaten: me.eaten, by: me.eatenBy, bestRank: f.bestRank === 99 ? f.lastRank : f.bestRank, time: f.runTime, isBest });
              f.shake.add(0.8);
              window.setTimeout(() => {
                if (phaseRef.current === "playing" || phaseRef.current === "paused") go("over");
              }, 1000);
            }
            break;
        }
      }
      f.particles.update(dt);
      f.shake.update(dt);
      for (let i = f.toasts.length - 1; i >= 0; i--) {
        f.toasts[i].life -= dt;
        if (f.toasts[i].life <= 0) f.toasts.splice(i, 1);
      }
      f.hint = Math.max(0, f.hint - dt);
      if (me && me.alive) {
        const r = s.board.indexOf(0) + 1;
        if (r > 0) {
          f.lastRank = r;
          if (r < f.bestRank) f.bestRank = r;
        }
      }
    }

    // ------------------------------------------------------------ camera
    let focus: Player | null = me && me.alive ? me : null;
    if (!focus && phase !== "over") focus = s.board.length ? s.players[s.board[0]] : null;
    const viewMin = Math.min(view.w, view.h);
    if (focus && focus.cells.length) {
      const ctr = centroid(focus);
      const zt = zoomFor(totalMass(focus), extent(focus), viewMin);
      if (!c.init) {
        c.x = ctr.x;
        c.y = ctr.y;
        c.z = zt;
        c.init = true;
      } else {
        c.x = damp(c.x, ctr.x, 8, dt);
        c.y = damp(c.y, ctr.y, 8, dt);
        c.z = damp(c.z, zt, 2.5, dt);
      }
    }
    const z = c.z;

    // ------------------------------------------------------------ world
    ctx.fillStyle = "#04070f";
    ctx.fillRect(0, 0, view.w, view.h);
    const [shx, shy] = f.shake.offset(10);
    ctx.save();
    ctx.translate(view.w / 2 + shx, view.h / 2 + shy);
    ctx.scale(z, z);
    ctx.translate(-c.x, -c.y);
    const hw = view.w / 2 / z + 30;
    const hh = view.h / 2 / z + 30;
    const x0 = c.x - hw;
    const x1 = c.x + hw;
    const y0 = c.y - hh;
    const y1 = c.y + hh;

    // The arena floor with a faint grid.
    ctx.fillStyle = "#0c1424";
    ctx.fillRect(-HALF, -HALF, HALF * 2, HALF * 2);
    ctx.strokeStyle = "rgba(148,180,255,0.07)";
    ctx.lineWidth = Math.max(1 / z, 1.2);
    ctx.beginPath();
    const step = 100;
    for (let gx = Math.max(-HALF, Math.ceil(x0 / step) * step); gx <= Math.min(HALF, x1); gx += step) {
      ctx.moveTo(gx, Math.max(-HALF, y0));
      ctx.lineTo(gx, Math.min(HALF, y1));
    }
    for (let gy = Math.max(-HALF, Math.ceil(y0 / step) * step); gy <= Math.min(HALF, y1); gy += step) {
      ctx.moveTo(Math.max(-HALF, x0), gy);
      ctx.lineTo(Math.min(HALF, x1), gy);
    }
    ctx.stroke();
    // Border glow.
    for (const [wd, a] of [[40, 0.06], [18, 0.12], [6, 0.35], [2.5, 0.9]] as [number, number][]) {
      ctx.strokeStyle = `rgba(56,189,248,${a})`;
      ctx.lineWidth = wd / Math.min(1, z + 0.3);
      ctx.strokeRect(-HALF, -HALF, HALF * 2, HALF * 2);
    }

    // Pellets.
    const pg = s.pellets;
    const gx0 = pg.idx(x0 - 10);
    const gx1 = pg.idx(x1 + 10);
    const gy0 = pg.idx(y0 - 10);
    const gy1 = pg.idx(y1 + 10);
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const list = pg.cells[gy * pg.size + gx];
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          const h = p.r * 1.7 * (1 + 0.08 * Math.sin(time * 3 + p.x));
          ctx.drawImage(pelletSprite(p.c), p.x - h, p.y - h, h * 2, h * 2);
        }
      }
    }
    // Mass shot out by blobs.
    for (const e of s.ejected) {
      if (e.x < x0 || e.x > x1 || e.y < y0 || e.y > y1) continue;
      const r = radiusOf(e.mass);
      ctx.drawImage(cellSprite(e.color), e.x - r, e.y - r, r * 2, r * 2);
    }

    // Blobs and thorns, smallest first so bigger ones cover smaller ones.
    const items = f.items;
    let n = 0;
    const push = (mass: number, cell: Cell | null, thorn: Thorn | null, owner: Player | null) => {
      let it = items[n];
      if (!it) it = items[n] = { mass: 0, cell: null, thorn: null, owner: null };
      it.mass = mass;
      it.cell = cell;
      it.thorn = thorn;
      it.owner = owner;
      n++;
    };
    for (const p of s.players) {
      if (!p.alive) continue;
      for (const cell of p.cells) {
        const r = radiusOf(cell.mass);
        if (cell.x + r < x0 || cell.x - r > x1 || cell.y + r < y0 || cell.y - r > y1) continue;
        push(cell.mass, cell, null, p);
      }
    }
    for (const t of s.thorns) {
      const r = radiusOf(t.mass);
      if (t.x + r < x0 || t.x - r > x1 || t.y + r < y0 || t.y - r > y1) continue;
      push(t.mass, null, t, null);
    }
    const list = items.slice(0, n).sort((a, b) => a.mass - b.mass);
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (it.thorn) {
        const t = it.thorn;
        const r = radiusOf(t.mass);
        const sc = 1 + t.pulse * 0.12 + 0.02 * Math.sin(time * 4 + t.id);
        const size = r * 2 * sc * 1.12;
        ctx.drawImage(thornSprite(), t.x - size / 2, t.y - size / 2, size, size);
        if (t.feeds > 0) {
          ctx.strokeStyle = "rgba(255,255,255,0.7)";
          ctx.lineWidth = 3 / z;
          ctx.beginPath();
          ctx.arc(t.x, t.y, r * 0.55, -Math.PI / 2, -Math.PI / 2 + (t.feeds / THORN_FEEDS) * TAU);
          ctx.stroke();
        }
        continue;
      }
      const cell = it.cell!;
      const p = it.owner!;
      const r = radiusOf(cell.mass);
      const wob = 0.022 * Math.sin(time * 5 + cell.id * 1.7);
      const w = r * 2 * (1 + wob);
      const h = r * 2 * (1 - wob);
      ctx.drawImage(cellSprite(p.color), cell.x - w / 2, cell.y - h / 2, w, h);
      if (p.isPlayer) {
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = Math.max(2 / z, r * 0.04);
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, r * 0.97, 0, TAU);
        ctx.stroke();
      }
      const screenR = r * z;
      if (screenR >= 15) {
        const fs = clamp(r * 0.48, 9 / z, 60 / z * 1.6);
        ctx.font = `800 ${fs}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.lineWidth = Math.max(2, fs * 0.16);
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        const label = trunc(p.name, 14);
        const ly = screenR >= 34 ? cell.y - fs * 0.28 : cell.y;
        ctx.strokeText(label, cell.x, ly);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, cell.x, ly);
        if (screenR >= 34) {
          ctx.font = `800 ${fs * 0.6}px system-ui, sans-serif`;
          ctx.lineWidth = Math.max(2, fs * 0.1);
          const ms = `${Math.floor(cell.mass)}`;
          ctx.strokeText(ms, cell.x, cell.y + fs * 0.55);
          ctx.fillStyle = "rgba(255,255,255,0.88)";
          ctx.fillText(ms, cell.x, cell.y + fs * 0.55);
        }
      }
    }
    f.particles.draw(ctx);
    ctx.restore();

    drawHud(ctx, view, s, me, f, touch, phase, c);
  };

  return (
    <div ref={wrap} className="absolute inset-0 select-none" style={{ touchAction: "none" }}>
      <GameCanvas width={viewW} fit="fill" draw={draw} onPointer={onPointer} background="#04070f" cursor="crosshair" />
      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={best ? Math.floor(best).toLocaleString("en-US") : undefined}
          bestLabel="Peak mass"
          extra={
            <input
              value={name}
              maxLength={14}
              placeholder="Your name"
              aria-label="Your name"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") start();
              }}
              className="mt-3 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-center text-sm text-white outline-none placeholder:text-white/35 focus:border-sky-300/70"
            />
          }
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={start} />}
      {phase === "over" && (
        <GameOverPanel
          title="You got eaten!"
          accent={meta.accent}
          score={result.peak.toLocaleString("en-US")}
          scoreLabel="Peak mass"
          best={best ? Math.floor(best).toLocaleString("en-US") : undefined}
          isBest={result.isBest}
          onRestart={start}
        >
          <p className="mt-2 text-sm text-white/70">
            Swallowed by <b className="text-white">{result.by || "a bigger blob"}</b>
          </p>
          <p className="mt-1 text-xs text-white/55">
            {result.eaten} {result.eaten === 1 ? "blob" : "blobs"} eaten · best rank #{result.bestRank || "-"} · survived {Math.floor(result.time)}s
          </p>
        </GameOverPanel>
      )}
      {touch && (phase === "playing" || phase === "paused") && (
        <>
          <Joystick
            className="absolute inset-y-0 left-0 z-10 w-1/2"
            radius={54}
            hint={phase === "playing" ? "drag to steer" : undefined}
            onChange={(x, y) => {
              input.current.joyX = x;
              input.current.joyY = y;
            }}
          />
          <div className="pointer-events-none absolute bottom-5 right-4 z-10 flex items-end gap-3">
            <TouchButton
              label="Eject mass"
              size={64}
              className="border-sky-300/50"
              onDown={() => (input.current.touchEject = true)}
              onUp={() => (input.current.touchEject = false)}
            >
              <span className="text-center text-[10px] font-black leading-tight">
                <span className="text-base">●</span>
                <br />
                EJECT
              </span>
            </TouchButton>
            <TouchButton label="Split" size={80} className="border-fuchsia-300/60" onDown={doSplit}>
              <span className="text-center text-[11px] font-black leading-tight">
                <span className="text-lg">✂</span>
                <br />
                SPLIT
              </span>
            </TouchButton>
          </div>
        </>
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
  ctx: CanvasRenderingContext2D, view: View, s: BlobWorld, me: Player | null,
  f: { toasts: { text: string; life: number; color: string }[]; hint: number; lastRank: number },
  touch: boolean, phase: Phase, c: { x: number; y: number; z: number },
) {
  const compact = view.w < 620 || view.h < 460;
  ctx.textBaseline = "middle";

  // ---- leaderboard
  const lbW = compact ? 142 : 188;
  const rowH = compact ? 14 : 18;
  const fs = compact ? 10.5 : 12.5;
  const lbX = view.w - lbW - 8;
  const lbY = 8;
  // Sorted live so the rows never show a smaller blob above a bigger one between board refreshes.
  const order = s.board.slice().sort((a, b) => totalMass(s.players[b]) - totalMass(s.players[a]));
  const rows = Math.min(10, order.length);
  const myIdx = me ? order.indexOf(0) : -1;
  const extra = me && me.alive && myIdx >= 10 ? 1 : 0;
  const lbH = 20 + (rows + extra) * rowH + 6;
  ctx.fillStyle = "rgba(6,10,22,0.55)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(lbX, lbY, lbW, lbH, 10);
  else ctx.rect(lbX, lbY, lbW, lbH);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.font = `800 ${fs - 1}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("LEADERBOARD", lbX + 10, lbY + 11);
  ctx.font = `700 ${fs}px system-ui, sans-serif`;
  const row = (rank: number, p: Player, y: number) => {
    if (p.isPlayer) {
      ctx.fillStyle = "rgba(56,189,248,0.3)";
      ctx.fillRect(lbX + 4, y - rowH / 2 + 1, lbW - 8, rowH - 1);
    }
    ctx.fillStyle = p.isPlayer ? "#e0f2fe" : "rgba(255,255,255,0.82)";
    ctx.textAlign = "left";
    ctx.fillText(`${rank}. ${trunc(p.name, compact ? 10 : 14)}`, lbX + 10, y);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.floor(totalMass(p))}`, lbX + lbW - 10, y);
  };
  for (let i = 0; i < rows; i++) row(i + 1, s.players[order[i]], lbY + 20 + i * rowH + rowH / 2);
  if (extra && me) row(myIdx + 1, me, lbY + 20 + rows * rowH + rowH / 2);

  // ---- your mass
  if (me && me.alive) {
    const m = Math.floor(totalMass(me));
    const x = touch ? 54 : 14;
    ctx.textAlign = "left";
    if (!touch) {
      ctx.fillStyle = "rgba(6,10,22,0.55)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(8, 8, 150, 62, 12);
      else ctx.rect(8, 8, 150, 62);
      ctx.fill();
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText("YOUR MASS", x, 22);
      ctx.font = "900 28px system-ui, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText(`${m}`, x, 44);
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.fillStyle = "#7dd3fc";
      ctx.fillText(`Rank ${f.lastRank || "-"} of ${s.board.length} · ${me.cells.length} cell${me.cells.length === 1 ? "" : "s"}`, x, 62);
    } else {
      ctx.font = "900 22px system-ui, sans-serif";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineJoin = "round";
      ctx.strokeText(`${m}`, x, 18);
      ctx.fillStyle = "#fff";
      ctx.fillText(`${m}`, x, 18);
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(`Rank ${f.lastRank || "-"} of ${s.board.length}`, x, 36);
    }
  }

  // ---- minimap
  const ms = touch || compact ? 78 : 96;
  const mx = touch ? 10 : 8;
  const my = touch ? 56 : 78;
  ctx.fillStyle = "rgba(6,10,22,0.6)";
  ctx.fillRect(mx, my, ms, ms);
  ctx.strokeStyle = "rgba(56,189,248,0.55)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mx, my, ms, ms);
  const k = ms / (HALF * 2);
  for (const p of s.players) {
    if (!p.alive) continue;
    ctx.fillStyle = p.color;
    for (const cell of p.cells) {
      ctx.globalAlpha = p.isPlayer ? 1 : 0.8;
      ctx.beginPath();
      ctx.arc(mx + (cell.x + HALF) * k, my + (cell.y + HALF) * k, p.isPlayer ? 2.6 : 1 + Math.min(2.4, Math.sqrt(cell.mass) * 0.05), 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // The part of the world on screen.
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  const vw = (view.w / c.z) * k;
  const vh = (view.h / c.z) * k;
  ctx.strokeRect(mx + (c.x + HALF) * k - vw / 2, my + (c.y + HALF) * k - vh / 2, vw, vh);

  // ---- toasts and the how-to hint
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
    const msg = touch ? "Drag on the left to steer · SPLIT to pounce" : "Mouse to steer · Space splits · W shoots mass";
    ctx.strokeText(msg, view.w / 2, view.h * 0.86);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(msg, view.w / 2, view.h * 0.86);
  }
  ctx.globalAlpha = 1;
}
