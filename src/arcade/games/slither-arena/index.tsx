// Slither Arena: rules live in logic.ts and ai.ts; this file draws the world (hexagon floor, glowing orbs,
// striped worms with eyes), plays sounds, reads mouse / keys / touch and runs the start-pause-over flow.
import { useCallback, useRef, useState } from "react";
import { GameCanvas, type CanvasPointer, type View } from "../../kit/GameCanvas";
import { Particles, Shake, clamp, damp } from "../../kit/draw";
import { useHeldKeys, useKeyPress } from "../../kit/input";
import { randomSeed } from "../../kit/rng";
import { noise, play, tone } from "../../kit/sfx";
import { Joystick, TouchButton } from "../../kit/TouchPad";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { gated } from "./audio";
import { MIN_BOOST_MASS, TAU, WORLD_R, advance, newWorld, type Worm, type World } from "./logic";
import { meta } from "./meta";
import { RAMP, SEG_HALF, SKINS, auraGlow, hexTile, orbGlow, segmentSprite } from "./sprites";
import { useViewWidth } from "./useViewWidth";

type Phase = "ready" | "playing" | "paused" | "over";

interface Suck {
  x: number;
  y: number;
  c: number;
  t: number;
}
interface Toast {
  text: string;
  life: number;
  color: string;
}

const skinSprites: HTMLCanvasElement[][] = [];
function spritesFor(skin: number): HTMLCanvasElement[] {
  let set = skinSprites[skin];
  if (!set) {
    set = [];
    for (let k = 0; k < RAMP; k++) set.push(segmentSprite(skin, k));
    skinSprites[skin] = set;
  }
  return set;
}

const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export default function SlitherArena({ touch, best, submitScore }: GameProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const viewW = useViewWidth(wrap);
  const world = useRef<World>(null as unknown as World);
  if (!world.current) world.current = newWorld(randomSeed(), { player: false });
  const cam = useRef({ x: 0, y: 0, z: 1 });
  const fx = useRef({
    particles: new Particles(420),
    shake: new Shake(),
    toasts: [] as Toast[],
    suck: [] as Suck[],
    pattern: null as CanvasPattern | null,
    tile: null as ReturnType<typeof hexTile> | null,
    combo: 0,
    lastEat: 0,
    lastRank: 0,
    bestRank: 99,
    hint: 0,
    runTime: 0,
    boostSnd: false,
  });
  const input = useRef({ aimX: 0, aimY: 0, aimActive: false, mouseBoost: false, touchBoost: false, joyX: 0, joyY: 0 });
  const keys = useHeldKeys();
  const phaseRef = useRef<Phase>("ready");
  const [phase, setPhase] = useState<Phase>("ready");
  const [boostOn, setBoostOn] = useState(false);
  const [result, setResult] = useState({ len: 0, kills: 0, by: "", rank: 0, bestRank: 0, time: 0, isBest: false });

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const start = useCallback(() => {
    world.current = newWorld(randomSeed(), { player: true });
    const f = fx.current;
    f.particles.clear();
    f.toasts = [];
    f.suck = [];
    f.combo = 0;
    f.bestRank = 99;
    f.hint = 7;
    f.runTime = 0;
    const me = world.current.player!;
    cam.current.x = me.x;
    cam.current.y = me.y;
    input.current.mouseBoost = false;
    input.current.touchBoost = false;
    input.current.joyX = 0;
    input.current.joyY = 0;
    play("select");
    go("playing");
  }, [go]);

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) go(p === "playing" ? "paused" : "playing");
    else if ((code === "Enter" || (code === "Space" && p === "ready")) && (p === "ready" || p === "over")) start();
  });

  const onPointer = (p: CanvasPointer) => {
    if (touch && p.pointerType === "touch") return;
    const inp = input.current;
    if (p.type === "move" || p.type === "down") {
      inp.aimX = p.x;
      inp.aimY = p.y;
      inp.aimActive = true;
    }
    if (p.type === "down" && (p.button === 0 || p.button === 2)) inp.mouseBoost = true;
    if (p.type === "up" || p.type === "cancel") inp.mouseBoost = false;
  };

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number, time: number) => {
    const s = world.current;
    const f = fx.current;
    const inp = input.current;
    const phase = phaseRef.current;
    const me = s.player;
    const c = cam.current;

    // ------------------------------------------------------------ input -> player worm
    if (phase === "playing" && me && me.alive) {
      const k = keys.current;
      const left = k.has("KeyA") || k.has("ArrowLeft");
      const right = k.has("KeyD") || k.has("ArrowRight");
      if (touch) {
        if (Math.hypot(inp.joyX, inp.joyY) > 0.2) {
          me.targetAng = Math.atan2(inp.joyY, inp.joyX);
          me.turnCmd = null;
        }
      } else if (left || right) {
        me.targetAng = me.ang + (right ? 0.9 : 0) - (left ? 0.9 : 0);
        me.turnCmd = null;
        inp.aimActive = false;
      } else if (inp.aimActive) {
        const hx = (me.x - c.x) * c.z + view.w / 2;
        const hy = (me.y - c.y) * c.z + view.h / 2;
        if (Math.hypot(inp.aimX - hx, inp.aimY - hy) > 10) {
          me.targetAng = Math.atan2(inp.aimY - hy, inp.aimX - hx);
          me.turnCmd = null;
        }
      }
      me.wantBoost = inp.mouseBoost || inp.touchBoost || k.has("Space");
    }

    // ------------------------------------------------------------ simulate
    if (phase !== "paused") {
      const evs = advance(s, dt);
      if (phase === "playing") f.runTime += dt;
      for (let i = 0; i < evs.length; i++) {
        const e = evs[i];
        if (e.type === "eat") {
          f.suck.push({ x: e.x, y: e.y, c: e.c, t: 0 });
          if (f.suck.length > 60) f.suck.shift();
          const now = performance.now();
          f.combo = now - f.lastEat < 380 ? Math.min(f.combo + 1, 12) : 0;
          f.lastEat = now;
          gated("eat", 55, () => tone(430 + f.combo * 38, 0.05, "sine", 0.03));
        } else if (e.type === "death") {
          const victim = s.worms.find((w) => w.id === e.wormId)!;
          const near = me ? Math.hypot(e.x - me.x, e.y - me.y) < 900 : true;
          if (near) {
            const cols = SKINS[victim.skin].colors;
            f.particles.burst(e.x, e.y, victim.isPlayer ? 46 : 22, { color: cols, speed: 260, size: 7, gravity: 0, life: 0.9, drag: 2.2 });
            f.particles.burst(e.x, e.y, 10, { color: "#ffffff", speed: 340, size: 3, gravity: 0, life: 0.5, shape: "spark" });
            if (!victim.isPlayer) gated("pop", 140, () => play("pop", 0.7));
          }
          if (victim.isPlayer) {
            f.shake.add(0.9);
            play("explode");
            window.setTimeout(() => play("lose"), 450);
            const isBest = submitScore(Math.floor(victim.mass));
            setResult({
              len: Math.floor(victim.mass), kills: victim.kills, by: victim.killedBy, rank: f.lastRank, bestRank: f.bestRank === 99 ? f.lastRank : f.bestRank,
              time: f.runTime, isBest,
            });
            window.setTimeout(() => {
              if (phaseRef.current === "playing" || phaseRef.current === "paused") go("over");
            }, 1100);
          }
        } else if (e.type === "kill") {
          if (me && e.killer === me.id) {
            const victim = s.worms.find((w) => w.id === e.victim);
            f.toasts.push({ text: `You eliminated ${victim?.name ?? "a worm"}`, life: 2.6, color: "#fde047" });
            if (f.toasts.length > 3) f.toasts.shift();
            play("coin");
            f.shake.add(0.2);
          }
        }
      }
      // Boost sound: a quiet whoosh while boosting, no more than a few times a second.
      if (me && me.alive && me.boosting) {
        gated("boost", 300, () => noise(0.16, 0.035, { type: "bandpass", freq: 500, sweep: 1400, q: 1 }));
        if (Math.random() < dt * 30) {
          const tail = me.n - 1;
          f.particles.burst(me.sx[tail], me.sy[tail], 1, { color: SKINS[me.skin].colors[0], speed: 30, size: me.g * 0.5, gravity: 0, life: 0.45 });
        }
      }
      f.particles.update(dt);
      f.shake.update(dt);
      for (let i = f.suck.length - 1; i >= 0; i--) {
        f.suck[i].t += dt / 0.2;
        if (f.suck[i].t >= 1) f.suck.splice(i, 1);
      }
      for (let i = f.toasts.length - 1; i >= 0; i--) {
        f.toasts[i].life -= dt;
        if (f.toasts[i].life <= 0) f.toasts.splice(i, 1);
      }
      f.hint = Math.max(0, f.hint - dt);
      if (me) {
        const r = s.board.indexOf(0) + 1;
        if (me.alive && r > 0) {
          f.lastRank = r;
          if (r < f.bestRank) f.bestRank = r;
        }
      }
    }
    const boosting = !!me && me.alive && me.boosting;
    if (boosting !== (f.boostSnd)) {
      f.boostSnd = boosting;
      setBoostOn(boosting);
    }

    // ------------------------------------------------------------ camera
    let focus: Worm | null = me && me.alive ? me : null;
    if (!focus && phase !== "over") focus = s.board.length ? s.worms[s.board[0]] : null;
    const base = clamp(Math.sqrt(view.w * view.h) / 700, 0.55, 1.4);
    if (focus) {
      const zt = base * clamp(Math.pow(7.6 / focus.g, 0.5), 0.3, 1.1);
      const first = Math.abs(c.x) + Math.abs(c.y) < 1e-6;
      c.x = first ? focus.x : damp(c.x, focus.x, 9, dt);
      c.y = first ? focus.y : damp(c.y, focus.y, 9, dt);
      c.z = damp(c.z, zt, 2.2, dt);
    }
    const z = c.z;

    // ------------------------------------------------------------ world
    ctx.fillStyle = "#050813";
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

    if (!f.tile) {
      f.tile = hexTile(38, 2);
      f.pattern = ctx.createPattern(f.tile.canvas, "repeat");
      try {
        f.pattern?.setTransform(new DOMMatrix().scale(1 / f.tile.px));
      } catch {
        // Older browsers: the pattern just renders at double size.
      }
    }
    if (f.pattern) {
      ctx.fillStyle = f.pattern;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    // Beyond the edge: dark, with a glowing red wall.
    const farthest = Math.hypot(Math.abs(c.x) + hw, Math.abs(c.y) + hh);
    if (farthest > WORLD_R - 120) {
      ctx.beginPath();
      ctx.rect(x0 - 10, y0 - 10, x1 - x0 + 20, y1 - y0 + 20);
      ctx.arc(0, 0, WORLD_R, 0, TAU);
      ctx.fillStyle = "rgba(4,6,12,0.93)";
      ctx.fill("evenodd");
      const pulse = 0.75 + 0.25 * Math.sin(time * 3);
      const rings: [number, number][] = [[70, 0.07], [38, 0.12], [18, 0.22], [7, 0.55], [3, 1]];
      for (const [wd, a] of rings) {
        ctx.strokeStyle = `rgba(255,${wd > 10 ? 70 : 110},${wd > 10 ? 90 : 120},${a * pulse})`;
        ctx.lineWidth = wd;
        ctx.beginPath();
        ctx.arc(0, 0, WORLD_R + (wd > 10 ? wd * 0.3 : 0), 0, TAU);
        ctx.stroke();
      }
    }

    // Orbs: pulsing glows, drawn additively.
    ctx.globalCompositeOperation = "lighter";
    const orbs = s.orbs;
    const gx0 = orbs.idx(x0 - 20);
    const gx1 = orbs.idx(x1 + 20);
    const gy0 = orbs.idx(y0 - 20);
    const gy1 = orbs.idx(y1 + 20);
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const list = orbs.cells[gy * orbs.size + gx];
        for (let i = 0; i < list.length; i++) {
          const o = list[i];
          const half = o.r * (2.4 + 0.35 * Math.sin(time * 3.3 + o.ph));
          ctx.drawImage(orbGlow(o.c), o.x - half, o.y - half, half * 2, half * 2);
        }
      }
    }
    // Orbs flying into a mouth.
    if (me && me.alive) {
      for (const sk of f.suck) {
        const k = sk.t * sk.t;
        const x = sk.x + (me.x - sk.x) * k;
        const y = sk.y + (me.y - sk.y) * k;
        const half = 9 * (1 - sk.t * 0.7);
        ctx.drawImage(orbGlow(sk.c), x - half, y - half, half * 2, half * 2);
      }
    }
    ctx.globalCompositeOperation = "source-over";

    // Worms, smallest first so the big ones sit on top.
    const order = s.board.slice().sort((a, b) => s.worms[a].mass - s.worms[b].mass);
    const tags: Worm[] = [];
    for (let oi = 0; oi < order.length; oi++) {
      const w = s.worms[order[oi]];
      const pad = w.g * 2 + 40;
      if (w.maxX < x0 - pad || w.minX > x1 + pad || w.maxY < y0 - pad || w.minY > y1 + pad) continue;
      drawWorm(ctx, w, time, x0, x1, y0, y1, w.isPlayer ? aimAngle(w, inp, c, view, touch) : w.ang + (w.turnCmd ?? 0) * 0.5);
      tags.push(w);
    }
    f.particles.draw(ctx);
    ctx.restore();

    // ------------------------------------------------------------ screen-space HUD
    const proj = (wx: number, wy: number): [number, number] => [(wx - c.x) * z + view.w / 2 + shx, (wy - c.y) * z + view.h / 2 + shy];

    // Danger glow when the player nears the edge.
    if (me && me.alive) {
      const edge = WORLD_R - Math.hypot(me.x, me.y);
      if (edge < 320) {
        const a = (1 - edge / 320) * (0.5 + 0.15 * Math.sin(time * 9));
        const g = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.3, view.w / 2, view.h / 2, Math.hypot(view.w, view.h) * 0.55);
        g.addColorStop(0, "rgba(255,40,60,0)");
        g.addColorStop(1, `rgba(255,40,60,${a})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, view.w, view.h);
      }
    }

    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.font = "700 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i < tags.length; i++) {
      const w = tags[i];
      const [px, py] = proj(w.x, w.y - w.g);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      const label = w.isPlayer ? "You" : w.name;
      ctx.strokeText(label, px, py - 11 * Math.min(1, z + 0.4) - 4);
      ctx.fillStyle = w.isPlayer ? "#a5f3fc" : "rgba(255,255,255,0.9)";
      ctx.fillText(label, px, py - 11 * Math.min(1, z + 0.4) - 4);
    }

    drawHud(ctx, view, s, me, f, time, touch, phase);
  };

  return (
    <div ref={wrap} className="absolute inset-0 select-none" style={{ touchAction: "none" }}>
      <GameCanvas width={viewW} fit="fill" draw={draw} onPointer={onPointer} background="#050813" cursor="crosshair" />
      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={best ? Math.floor(best).toLocaleString("en-US") : undefined}
          bestLabel="Longest"
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={start} />}
      {phase === "over" && (
        <GameOverPanel
          title="Wiped out!"
          accent={meta.accent}
          score={result.len.toLocaleString("en-US")}
          scoreLabel="Final length"
          best={best ? Math.floor(best).toLocaleString("en-US") : undefined}
          isBest={result.isBest}
          onRestart={start}
        >
          <p className="mt-2 text-sm text-white/70">
            Taken out by <b className="text-white">{result.by || "another worm"}</b>
          </p>
          <p className="mt-1 text-xs text-white/55">
            {result.kills} {result.kills === 1 ? "kill" : "kills"} · best rank #{result.bestRank || "-"} · survived {Math.floor(result.time)}s
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
          <div className="pointer-events-none absolute bottom-5 right-5 z-10">
            <TouchButton
              label="Boost"
              size={84}
              active={boostOn}
              className="border-cyan-300/60"
              onDown={() => (input.current.touchBoost = true)}
              onUp={() => (input.current.touchBoost = false)}
            >
              <span className="text-center text-[11px] font-black leading-tight">
                <span className="text-lg">⚡</span>
                <br />
                BOOST
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

/** Where the player's eyes look: toward the cursor (mouse) or along the steering stick. */
function aimAngle(w: Worm, inp: { aimX: number; aimY: number; aimActive: boolean; joyX: number; joyY: number }, c: { x: number; y: number; z: number }, view: View, touch: boolean) {
  if (touch) return Math.hypot(inp.joyX, inp.joyY) > 0.2 ? Math.atan2(inp.joyY, inp.joyX) : w.ang;
  if (!inp.aimActive) return w.ang;
  const hx = (w.x - c.x) * c.z + view.w / 2;
  const hy = (w.y - c.y) * c.z + view.h / 2;
  return Math.atan2(inp.aimY - hy, inp.aimX - hx);
}

function drawWorm(ctx: CanvasRenderingContext2D, w: Worm, time: number, x0: number, x1: number, y0: number, y1: number, lookAng: number) {
  const n = w.n;
  const g = w.g;
  const set = spritesFor(w.skin);
  const size = g * 2 * (SEG_HALF + 2) / SEG_HALF;
  const half = size / 2;
  const sx = w.sx;
  const sy = w.sy;
  if (w.boosting) {
    // Glowing aura along the body.
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.5;
    const aura = auraGlow(w.skin);
    const ah = g * 2.6;
    for (let i = n - 1; i >= 0; i -= 3) {
      if (sx[i] < x0 - ah || sx[i] > x1 + ah || sy[i] < y0 - ah || sy[i] > y1 + ah) continue;
      ctx.drawImage(aura, sx[i] - ah, sy[i] - ah, ah * 2, ah * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  if (w.shield > 0) ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 20);
  for (let i = n - 1; i >= 0; i--) {
    const x = sx[i];
    const y = sy[i];
    if (x < x0 - g || x > x1 + g || y < y0 - g || y > y1 + g) continue;
    ctx.drawImage(set[Math.floor(i * 0.65) % RAMP], x - half, y - half, size, size);
  }
  // Eyes: white with a pupil that looks toward `lookAng`.
  const a = w.ang;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const hx = sx[0];
  const hy = sy[0];
  const er = g * 0.44;
  for (let side = -1; side <= 1; side += 2) {
    const ex = hx + ca * g * 0.3 - sa * side * g * 0.5;
    const ey = hy + sa * g * 0.3 + ca * g * 0.5 * side;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, TAU);
    ctx.fill();
    const px = ex + Math.cos(lookAng) * er * 0.38;
    const py = ey + Math.sin(lookAng) * er * 0.38;
    ctx.fillStyle = "#0b1020";
    ctx.beginPath();
    ctx.arc(px, py, er * 0.58, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(px - er * 0.15, py - er * 0.18, er * 0.17, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHud(
  ctx: CanvasRenderingContext2D, view: View, s: World, me: Worm | null, f: { toasts: Toast[]; hint: number; lastRank: number },
  time: number, touch: boolean, phase: Phase,
) {
  const compact = view.w < 620 || view.h < 460;
  const alive = s.board.length;

  // ---- leaderboard (top 10, player highlighted)
  const lbW = compact ? 142 : 184;
  const rowH = compact ? 14 : 18;
  const fs = compact ? 10.5 : 12.5;
  const lbX = view.w - lbW - 8;
  const lbY = 8;
  const rows = Math.min(10, s.board.length);
  const myIdx = me ? s.board.indexOf(0) : -1;
  const extra = me && me.alive && myIdx >= 10 ? 1 : 0;
  const lbH = 20 + (rows + extra) * rowH + 6;
  ctx.fillStyle = "rgba(6,10,22,0.55)";
  ctx.beginPath();
  ctx.roundRect?.(lbX, lbY, lbW, lbH, 10);
  if (!ctx.roundRect) ctx.rect(lbX, lbY, lbW, lbH);
  ctx.fill();
  ctx.textBaseline = "middle";
  ctx.font = `800 ${fs - 1}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("LEADERBOARD", lbX + 10, lbY + 11);
  ctx.font = `700 ${fs}px system-ui, sans-serif`;
  const drawRow = (rank: number, w: Worm, y: number) => {
    const mine = w.isPlayer;
    if (mine) {
      ctx.fillStyle = "rgba(34,211,238,0.28)";
      ctx.fillRect(lbX + 4, y - rowH / 2 + 1, lbW - 8, rowH - 1);
    }
    ctx.fillStyle = mine ? "#cffafe" : "rgba(255,255,255,0.82)";
    ctx.textAlign = "left";
    ctx.fillText(`${rank}. ${trunc(mine ? "You" : w.name, compact ? 11 : 15)}`, lbX + 10, y);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.floor(w.mass)}`, lbX + lbW - 10, y);
  };
  for (let i = 0; i < rows; i++) drawRow(i + 1, s.worms[s.board[i]], lbY + 20 + i * rowH + rowH / 2);
  if (extra && me) drawRow(myIdx + 1, me, lbY + 20 + rows * rowH + rowH / 2);

  // ---- minimap
  const mr = touch || compact ? 40 : 58;
  const mx = touch ? 10 + mr : view.w - 12 - mr;
  const my = touch ? 54 + mr : view.h - 12 - mr;
  ctx.fillStyle = "rgba(6,10,22,0.6)";
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,90,110,0.65)";
  ctx.lineWidth = 2;
  ctx.stroke();
  const mk = mr / WORLD_R;
  for (let i = 0; i < s.worms.length; i++) {
    const w = s.worms[i];
    if (!w.alive || w.isPlayer) continue;
    ctx.fillStyle = SKINS[w.skin].colors[0];
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(mx + w.x * mk, my + w.y * mk, 1.2 + Math.min(2, Math.sqrt(w.mass) * 0.08), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (me && me.alive) {
    const px = mx + me.x * mk;
    const py = my + me.y * mk;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(px, py, 3.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(34,211,238,${0.5 + 0.4 * Math.sin(time * 6)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 5.5 + Math.sin(time * 6), 0, TAU);
    ctx.stroke();
  }

  // ---- your length and rank
  if (me && (phase === "playing" || phase === "paused" || me.alive)) {
    const len = Math.floor(me.mass);
    if (touch) {
      ctx.textAlign = "left";
      ctx.font = "900 22px system-ui, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.strokeText(`${len}`, 54, 18);
      ctx.fillText(`${len}`, 54, 18);
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(`Rank ${f.lastRank || "-"} of ${alive}`, 54, 36);
    } else {
      const bx = 14;
      const by = view.h - 14;
      ctx.fillStyle = "rgba(6,10,22,0.55)";
      ctx.beginPath();
      ctx.roundRect?.(bx - 4, by - 66, 170, 66, 12);
      if (!ctx.roundRect) ctx.rect(bx - 4, by - 66, 170, 66);
      ctx.fill();
      ctx.textAlign = "left";
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText("YOUR LENGTH", bx + 6, by - 52);
      ctx.font = "900 30px system-ui, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText(`${len}`, bx + 6, by - 28);
      ctx.font = "700 12px system-ui, sans-serif";
      ctx.fillStyle = "#67e8f9";
      ctx.fillText(`Rank ${f.lastRank || "-"} of ${alive}`, bx + 6, by - 8);
    }
    if (me.alive && me.wantBoost && me.mass <= MIN_BOOST_MASS + 0.01 && phase === "playing") {
      ctx.textAlign = "center";
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillText("too short to boost: eat some orbs", view.w / 2, view.h - 14);
    }
  }

  // ---- toasts and the how-to hint
  ctx.textAlign = "center";
  for (let i = 0; i < f.toasts.length; i++) {
    const t = f.toasts[i];
    ctx.globalAlpha = Math.min(1, t.life * 2);
    ctx.font = "800 16px system-ui, sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.strokeText(t.text, view.w / 2, view.h * 0.2 + i * 24);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, view.w / 2, view.h * 0.2 + i * 24);
  }
  if (f.hint > 0 && phase === "playing") {
    ctx.globalAlpha = Math.min(1, f.hint);
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    const msg = touch ? "Drag on the left to steer · hold BOOST to speed up" : "Mouse to steer · hold click or Space to boost";
    ctx.strokeText(msg, view.w / 2, view.h * 0.82);
    ctx.fillText(msg, view.w / 2, view.h * 0.82);
  }
  ctx.globalAlpha = 1;
}
