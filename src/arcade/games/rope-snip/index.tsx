// Rope Snip: rope physics, mechanics and the 20 levels in logic.ts. This file draws the box, Munch and the candy,
// turns swipes into cuts and taps into pops and puffs, and runs the level select, pause and win / lose flow.
import { useCallback, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { DISPLAY_FONT, Particles, circle, fillRoundRect, text } from "../../kit/draw";
import { useKeyPress } from "../../kit/input";
import { noise, play, tone } from "../../kit/sfx";
import { loadState, saveState } from "../../kit/storage";
import { Overlay, PausePanel, PrimaryButton, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import { BH, BW, CANDY_R, DT, LEVELS, STAR_R, cut, load, popBubble, puff, starsGot, step, type World } from "./logic";

type Phase = "ready" | "levels" | "playing" | "paused" | "won" | "lost";
const STARS_KEY = "rope-snip:stars";

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function drawMunch(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, mood: "idle" | "eager" | "sad" | "chomp") {
  const bob = Math.sin(time * 3) * 2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 30, 30, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, 0, 0, 30, "#15803d");
  circle(ctx, -2, -3, 28, "#4ade80");
  // feet and ears
  circle(ctx, -16, 26, 8, "#15803d");
  circle(ctx, 16, 26, 8, "#15803d");
  circle(ctx, -24, -24, 7, "#4ade80");
  circle(ctx, 24, -24, 7, "#4ade80");
  // eyes (blink every few seconds)
  const blink = time % 3.4 < 0.12;
  for (const s of [-1, 1]) {
    if (blink || mood === "chomp") {
      ctx.strokeStyle = "#052e16";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(s * 11 - 5, -9);
      ctx.lineTo(s * 11 + 5, -9);
      ctx.stroke();
    } else {
      circle(ctx, s * 11, -9, 7, "#fff");
      circle(ctx, s * 11 + (mood === "eager" ? 0 : 1), -9 + (mood === "sad" ? 2 : -1), 3.5, "#052e16");
    }
  }
  // mouth
  ctx.fillStyle = "#7f1d1d";
  ctx.strokeStyle = "#052e16";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (mood === "eager") {
    ctx.ellipse(0, 10, 13, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === "sad") {
    ctx.arc(0, 18, 9, Math.PI + 0.3, -0.3);
    ctx.stroke();
  } else if (mood === "chomp") {
    ctx.arc(0, 8, 10, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else {
    ctx.arc(0, 6, 8, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

export default function RopeSnip({ touch, submitScore }: GameProps) {
  const world = useRef<World>(load(0));
  const fx = useRef({ particles: new Particles(300), trail: [] as { x: number; y: number; t: number }[], acc: 0, endT: 0 });
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [stars, setStars] = useState<number[]>(() => loadState<number[]>(STARS_KEY) ?? []);
  const starsRef = useRef(stars);
  starsRef.current = stars;
  const [got, setGot] = useState(0);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const startLevel = useCallback((i: number) => {
    world.current = load(i);
    fx.current.particles.clear();
    fx.current.trail = [];
    fx.current.acc = 0;
    play("select");
    go("playing");
  }, [go]);

  const unlocked = (i: number) => i === 0 || (stars[i - 1] ?? -1) >= 0;
  const totalStars = stars.reduce((n, v) => n + Math.max(0, v ?? 0), 0);

  const onWin = () => {
    const w = world.current;
    const g = starsGot(w);
    const next = starsRef.current.slice();
    next[w.level] = Math.max(next[w.level] ?? -1, g);
    for (let i = 0; i < w.level; i++) if (next[i] === undefined) next[i] = 0;
    saveState(STARS_KEY, next);
    setStars(next);
    setGot(g);
    submitScore(next.reduce((n, v) => n + Math.max(0, v ?? 0), 0));
    play("win");
    window.setTimeout(() => go("won"), 900);
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) go(p === "playing" ? "paused" : "playing");
    else if (code === "KeyR" && (p === "playing" || p === "lost")) startLevel(world.current.level);
  });

  const draw = (ctx: CanvasRenderingContext2D, _view: View, dt: number, time: number) => {
    const w = world.current;
    const f = fx.current;
    if (phaseRef.current === "playing") {
      f.acc += Math.min(dt, 0.05);
      while (f.acc >= DT) {
        f.acc -= DT;
        for (const e of step(w)) {
          if (e === "star") {
            play("coin", 1.3);
            f.particles.burst(w.candy.x, w.candy.y, 16, { color: ["#fde047", "#fff"], speed: 140, size: 3, gravity: 0 });
          } else if (e === "bubble") tone(700, 0.15, "sine", 0.05, { slide: 1100 });
          else if (e === "rope") play("click");
          else if (e === "win") {
            play("pop");
            f.particles.burst(w.munch.x, w.munch.y, 24, { color: ["#f472b6", "#fde047", "#a3e635"], speed: 160, size: 4, gravity: 200 });
            onWin();
          } else if (e === "lose") {
            play("lose");
            f.particles.burst(w.candy.x, Math.min(BH - 10, w.candy.y), 20, { color: ["#f472b6", "#fb7185"], speed: 140, size: 3, gravity: 300 });
            window.setTimeout(() => go("lost"), 900);
          }
        }
      }
    }
    f.particles.update(dt);
    f.trail = f.trail.filter((p) => time - p.t < 0.2);

    // Box: a cardboard backdrop with a soft pattern.
    const bg = ctx.createLinearGradient(0, 0, 0, BH);
    bg.addColorStop(0, "#fde7c4");
    bg.addColorStop(1, "#f3c98b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, BW, BH);
    ctx.fillStyle = "rgba(180,120,60,0.08)";
    for (let y = 0; y < BH; y += 40) for (let x = (y / 40) % 2 ? 20 : 0; x < BW; x += 40) ctx.fillRect(x, y, 20, 20);

    // Spikes.
    for (const s of w.spikes) {
      ctx.fillStyle = "#64748b";
      const n = Math.max(2, Math.round(s.w / 14));
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x0 = s.x + (i * s.w) / n;
        ctx.moveTo(x0, s.y + s.h);
        ctx.lineTo(x0 + s.w / n / 2, s.y - 4);
        ctx.lineTo(x0 + s.w / n, s.y + s.h);
      }
      ctx.fill();
      ctx.fillStyle = "#334155";
      ctx.fillRect(s.x, s.y + s.h - 5, s.w, 5);
    }
    // Stars.
    for (const s of w.stars) if (!s.got) drawStar(ctx, s.x, s.y + Math.sin(time * 3 + s.x) * 2, STAR_R * 0.8, "#facc15");
    // Puffers.
    for (const p of w.puffers) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.dir);
      fillRoundRect(ctx, -16, -14, 26, 28, 8, "#60a5fa");
      fillRoundRect(ctx, 6, -8, 12, 16, 4, "#2563eb");
      ctx.restore();
    }
    // Auto-rope pins.
    for (const a of w.autoPins) {
      if (!a.used) {
        ctx.strokeStyle = "rgba(124,45,18,0.3)";
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.arc(a.pin.x, a.pin.y, 70, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      circle(ctx, a.pin.x, a.pin.y, 8, "#92400e");
      circle(ctx, a.pin.x, a.pin.y, 4, "#fde68a");
    }
    // Ropes: attached ones run to the candy; cut ones dangle from their pin.
    for (const r of w.ropes) {
      ctx.strokeStyle = "#7c2d12";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(r.pin.x, r.pin.y);
      for (const n of r.nodes) ctx.lineTo(n.x, n.y);
      if (r.attached) ctx.lineTo(w.candy.x, w.candy.y);
      ctx.stroke();
      ctx.strokeStyle = "#c2410c";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      circle(ctx, r.pin.x, r.pin.y, 8, "#92400e");
      circle(ctx, r.pin.x, r.pin.y, 4, "#fde68a");
    }
    // Munch and the candy.
    const near = Math.hypot(w.candy.x - w.munch.x, w.candy.y - w.munch.y) < 130;
    const mood = w.status === "won" ? "chomp" : w.status === "lost" ? "sad" : near ? "eager" : "idle";
    drawMunch(ctx, w.munch.x, w.munch.y, time, mood);
    if (w.status !== "won") {
      const c = w.candy;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(time * 0.8);
      ctx.fillStyle = "#f472b6";
      ctx.beginPath();
      ctx.moveTo(-CANDY_R - 8, -7);
      ctx.lineTo(-CANDY_R + 2, 0);
      ctx.lineTo(-CANDY_R - 8, 7);
      ctx.moveTo(CANDY_R + 8, -7);
      ctx.lineTo(CANDY_R - 2, 0);
      ctx.lineTo(CANDY_R + 8, 7);
      ctx.fill();
      circle(ctx, 0, 0, CANDY_R, "#ec4899");
      ctx.strokeStyle = "#fdf2f8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, CANDY_R * 0.55, 0.3, 2.6);
      ctx.stroke();
      ctx.restore();
    }
    // Bubbles.
    for (const b of w.bubbles) {
      if (b.popped) continue;
      ctx.strokeStyle = "rgba(56,189,248,0.8)";
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(186,230,253,0.35)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 24 + Math.sin(time * 4) * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      circle(ctx, b.x - 8, b.y - 9, 4, "rgba(255,255,255,0.8)");
    }
    f.particles.draw(ctx);
    // Swipe trail.
    if (f.trail.length > 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineCap = "round";
      for (let i = 1; i < f.trail.length; i++) {
        ctx.lineWidth = 2 + (i / f.trail.length) * 6;
        ctx.beginPath();
        ctx.moveTo(f.trail[i - 1].x, f.trail[i - 1].y);
        ctx.lineTo(f.trail[i].x, f.trail[i].y);
        ctx.stroke();
      }
    }
    // HUD.
    const L = LEVELS[w.level];
    fillRoundRect(ctx, 8, 8, 230, 34, 10, "rgba(120,53,15,0.75)");
    text(ctx, `${w.level + 1}. ${L.name}`, 20, 25, { align: "left", size: 14, weight: 800, color: "#fff7ed" });
    for (let i = 0; i < 3; i++) drawStar(ctx, BW - 90 + i * 26, 25, 10, i < starsGot(w) ? "#facc15" : "rgba(120,53,15,0.35)");
    if (phaseRef.current === "playing" && w.time < 2) {
      text(ctx, touch ? "Swipe across a rope to cut it" : "Drag across a rope to cut it", BW / 2, BH - 18, { size: 14, weight: 700, color: `rgba(120,53,15,${1 - w.time / 2})` });
    }
  };

  const onPointer = (p: { type: string; x: number; y: number }) => {
    if (phaseRef.current !== "playing") return;
    const w = world.current;
    const now = performance.now() / 1000;
    if (p.type === "down") {
      // Taps: pop a bubble or fire a puffer if one is under the finger.
      const b = w.bubbles.find((x) => !x.popped && x.holding && Math.hypot(p.x - x.x, p.y - x.y) < 36);
      if (b && popBubble(w)) {
        noise(0.12, 0.06, { type: "highpass", freq: 1800 });
        fx.current.particles.burst(b.x, b.y, 10, { color: ["#bae6fd", "#fff"], speed: 120, size: 3, gravity: 0 });
      }
      const pi = w.puffers.findIndex((x) => Math.hypot(p.x - x.x, p.y - x.y) < 34);
      if (pi >= 0) {
        puff(w, pi);
        noise(0.25, 0.07, { type: "bandpass", freq: 600, sweep: 300 });
        const q = w.puffers[pi];
        fx.current.particles.burst(q.x + Math.cos(q.dir) * 22, q.y + Math.sin(q.dir) * 22, 10, { color: ["#e0f2fe", "#fff"], speed: 200, size: 3, gravity: 0, angle: q.dir, spread: 0.6 });
      }
      swipe.current = { x: p.x, y: p.y };
      fx.current.trail = [{ x: p.x, y: p.y, t: now }];
      return;
    }
    if (p.type === "move" && swipe.current) {
      const n = cut(w, swipe.current, { x: p.x, y: p.y });
      if (n) {
        play("swoosh");
        tone(1400, 0.06, "square", 0.04, { slide: 600 });
      }
      swipe.current = { x: p.x, y: p.y };
      fx.current.trail.push({ x: p.x, y: p.y, t: now });
      return;
    }
    if (p.type === "up" || p.type === "cancel") swipe.current = null;
  };

  const lvl = world.current.level;

  return (
    <div className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas width={BW} height={BH} draw={draw} background="#7c2d12" onPointer={onPointer} />
      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={() => go("levels")}
          accent={meta.accent}
          best={totalStars ? `${totalStars} / ${LEVELS.length * 3} ★` : undefined}
          bestLabel="Stars"
        />
      )}
      {phase === "levels" && (
        <Overlay>
          <h2 className="text-xl font-black" style={{ color: meta.accent }}>Choose a level</h2>
          <p className="mt-1 text-xs text-white/60">{totalStars} / {LEVELS.length * 3} stars</p>
          {[0, 1].map((box) => (
            <div key={box} className="mt-3">
              <div className="mb-1 text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">{box === 0 ? "Box 1 · Ropes" : "Box 2 · Bubbles and air"}</div>
              <div className="grid grid-cols-5 gap-1.5">
                {LEVELS.slice(box * 10, box * 10 + 10).map((l, k) => {
                  const i = box * 10 + k;
                  const open = unlocked(i);
                  const st = stars[i] ?? -1;
                  return (
                    <button key={i} type="button" disabled={!open} title={l.name} onClick={() => startLevel(i)}
                      className={`rounded-md border px-1 py-1.5 text-sm font-bold ${open ? "border-white/20 bg-white/5 hover:bg-white/15" : "border-white/10 opacity-35"}`}>
                      <div>{open ? i + 1 : "🔒"}</div>
                      <div className="text-[9px] text-amber-300">{st > 0 ? "★".repeat(st) : st === 0 ? "✓" : " "}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Overlay>
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={() => startLevel(lvl)} />}
      {phase === "won" && (
        <Overlay>
          <div className="text-3xl text-amber-300">{"★".repeat(got)}<span className="text-white/20">{"★".repeat(3 - got)}</span></div>
          <h2 className="mt-1 text-2xl font-black" style={{ color: meta.accent }}>Yum!</h2>
          <p className="mt-1 text-sm text-white/65">{LEVELS[lvl].name} · {got} of 3 stars</p>
          <div className="mt-4 space-y-2">
            {lvl + 1 < LEVELS.length
              ? <PrimaryButton onClick={() => startLevel(lvl + 1)} accent={meta.accent} autoFocus>Next level</PrimaryButton>
              : <p className="text-sm font-bold text-amber-200">That was the last level. Munch is full!</p>}
            <SecondaryButton onClick={() => startLevel(lvl)}>Replay for more stars</SecondaryButton>
            <SecondaryButton onClick={() => go("levels")}>Levels</SecondaryButton>
          </div>
        </Overlay>
      )}
      {phase === "lost" && (
        <Overlay>
          <div className="text-4xl">😢</div>
          <h2 className="mt-1 text-2xl font-black" style={{ color: meta.accent }}>{world.current.lostBy === "spikes" ? "Ouch, the spikes!" : "The candy fell"}</h2>
          <div className="mt-4 space-y-2">
            <PrimaryButton onClick={() => startLevel(lvl)} accent={meta.accent} autoFocus>Try again</PrimaryButton>
            <SecondaryButton onClick={() => go("levels")}>Levels</SecondaryButton>
          </div>
        </Overlay>
      )}
      {phase === "playing" && (
        <div className="absolute right-2 top-2 z-10 flex gap-1.5">
          <button type="button" aria-label="Restart level" className="h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white" onClick={() => startLevel(lvl)}>↻</button>
          {touch && <button type="button" aria-label="Pause" className="h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white" onClick={() => go("paused")}>⏸</button>}
        </div>
      )}
    </div>
  );
}
