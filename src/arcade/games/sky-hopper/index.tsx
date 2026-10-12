// Sky Hopper: an endless climber on a hand-drawn notebook page. Rules live in logic.ts and the art in art.ts;
// this file runs the loop, plays sounds, reads input (keys, mouse, touch zones) and the menu / pause / game-over flow.
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { clamp, Floaters, Particles, Shake, text } from "../../kit/draw";
import { useHeldKeys, useKeyPress } from "../../kit/input";
import { noise, play, tone } from "../../kit/sfx";
import { randomSeed } from "../../kit/rng";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { drawBullet, drawJetItem, drawMonster, drawPaper, drawPlatform, drawPlayer, HAND_FONT, INK, type Cam } from "./art";
import { useBoxSize } from "./fit";
import { W, aimAngle, ensureWorld, newGame, scoreOf, setDir, shoot, update, PLAYER_H, type HopState } from "./logic";
import { meta } from "./meta";

type Phase = "menu" | "play" | "paused" | "over";

const MIN_H = 560;
/** Phones held sideways are short: show a little less page so the doodle isn't tiny. */
const MIN_H_SHORT = 450;
const MAX_H = 820;
/** Touch: the middle band of the screen shoots; the rest steers by half. */
const BAND = 0.12;

export default function SkyHopper({ touch, best, submitScore }: GameProps) {
  const root = useRef<HTMLDivElement>(null);
  const box = useBoxSize(root);
  const held = useHeldKeys();
  const viewH = useRef(640);
  const game = useRef<HopState>(newGame(randomSeed(), 640));
  const fx = useRef({
    particles: new Particles(), shake: new Shake(), floaters: new Floaters(), hint: 0, kills: 0, jetTick: 0, over: 0,
    /** Where the mouse is pointing, in page coordinates (null until it moves). */
    mouse: null as { x: number; y: number } | null,
    /** Pointers holding left or right on a touch screen. */
    holds: new Map<number, "left" | "right">(),
    lastScore: 0, highlight: 0,
  });
  const [phase, setPhase] = useState<Phase>("menu");
  const phaseRef = useRef<Phase>("menu");
  const [result, setResult] = useState({ score: 0, isBest: false, cause: "fell" as "fell" | "monster", kills: 0 });
  const timer = useRef(0);

  // The page is always W wide; its height follows the screen so tall phones see further up.
  const logicalH = clamp((W * box.h) / box.w, box.h < 520 ? MIN_H_SHORT : MIN_H, MAX_H);

  // DBG-REMOVE
  if (typeof window !== "undefined" && window.location.search.includes("dbg")) (window as unknown as Record<string, unknown>).__dbg = { game, fx, ensureWorld };

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const start = useCallback(() => {
    window.clearTimeout(timer.current);
    game.current = newGame(randomSeed(), viewH.current);
    const f = fx.current;
    f.particles.clear();
    f.floaters.items = [];
    f.hint = 0;
    f.kills = 0;
    f.holds.clear();
    f.lastScore = 0;
    play("select");
    go("play");
  }, [go]);

  const pause = useCallback(() => {
    if (phaseRef.current === "play") go("paused");
  }, [go]);
  const resume = useCallback(() => {
    fx.current.holds.clear();
    go("play");
  }, [go]);

  useKeyPress((code) => {
    const p = phaseRef.current;
    if (code === "KeyP" || code === "Escape") {
      if (p === "play") pause();
      else if (p === "paused") resume();
    } else if ((code === "Space" || code === "Enter") && (p === "menu" || (p === "over" && performance.now() - fx.current.over > 500))) start();
    else if (p === "play" && (code === "Space" || code === "ArrowUp" || code === "KeyW")) {
      // Keyboard shot: straight up (or at the mouse if it has moved over the page).
      const g = game.current;
      const m = fx.current.mouse;
      shoot(g, m ? m.x : g.x, m ? m.y : g.y + 400);
    }
  });

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [pause]);

  /** Screen position to a point on the page (world units, y up). */
  const toWorld = (px: number, py: number) => ({ x: px, y: game.current.camY + (viewH.current - py) });

  const onPointer = (p: { type: string; x: number; y: number; id: number; button: number; pointerType: string }) => {
    const f = fx.current;
    const g = game.current;
    const w = toWorld(p.x, p.y);
    if (p.pointerType === "mouse" || p.pointerType === "pen") {
      f.mouse = w;
      if (p.type === "down" && p.button === 0 && phaseRef.current === "play") shoot(g, w.x, w.y);
      return;
    }
    // Touch: hold the left or right half to steer; tap the middle band to shoot.
    const inBand = Math.abs(p.x - W / 2) < W * BAND;
    if (p.type === "down") {
      if (phaseRef.current !== "play") return;
      if (inBand) {
        f.mouse = w;
        shoot(g, w.x, w.y);
      } else f.holds.set(p.id, p.x < W / 2 ? "left" : "right");
    } else if (p.type === "move") {
      if (f.holds.has(p.id) && !inBand) f.holds.set(p.id, p.x < W / 2 ? "left" : "right");
    } else {
      f.holds.delete(p.id);
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number, time: number) => {
    const g = game.current;
    const f = fx.current;
    const running = phaseRef.current === "play";
    viewH.current = view.h;
    g.viewH = view.h;

    if (running) {
      // Steering: arrow keys / A D, plus any finger holding the left or right half.
      let dir = 0;
      if (held.current.has("ArrowLeft") || held.current.has("KeyA")) dir -= 1;
      if (held.current.has("ArrowRight") || held.current.has("KeyD")) dir += 1;
      for (const side of f.holds.values()) dir += side === "left" ? -1 : 1;
      setDir(g, clamp(dir, -1, 1));
      const wasAlive = g.alive;
      const events = update(g, dt);
      f.hint += dt;
      for (const e of events) {
        const bx = g.x;
        const by = g.y;
        switch (e) {
          case "bounce":
            tone(260 + Math.random() * 40, 0.12, "sine", 0.16, { slide: 540 });
            f.particles.burst(bx, -by, 6, { color: ["#d6ccb0", "#bdb391"], speed: 70, size: 3.5, gravity: 260, angle: -Math.PI / 2, spread: 2.6, life: 0.4 });
            break;
          case "spring":
            tone(240, 0.3, "sine", 0.2, { slide: 980 });
            tone(480, 0.2, "triangle", 0.08, { slide: 1500, delay: 0.04 });
            f.particles.burst(bx, -by, 12, { color: ["#e0463c", "#f5c542", "#ffffff"], speed: 150, size: 4, gravity: 200, angle: -Math.PI / 2, spread: 1.6, life: 0.6, shape: "spark" });
            f.shake.add(0.15);
            break;
          case "crumble":
            noise(0.3, 0.28, { freq: 1200, sweep: 180 });
            f.particles.burst(bx, -by, 12, { color: ["#d6a579", "#8c5a34", "#bd8b5f"], speed: 110, size: 5, gravity: 520, life: 0.7, shape: "square" });
            break;
          case "vanish":
            play("pop");
            f.particles.burst(bx, -by, 8, { color: ["#e4d4f5", "#a688d0", "#ffffff"], speed: 90, size: 3, gravity: -60, life: 0.6 });
            tone(520, 0.1, "sine", 0.1, { slide: 760 });
            break;
          case "stomp":
            play("hit");
            play("coin", 0.8);
            f.kills++;
            f.shake.add(0.3);
            f.floaters.add(bx, -by - 40, "squish!", "#27324f", 18);
            f.particles.burst(bx, -by, 14, { color: ["#c2a4f2", "#3d5afe", "#27324f"], speed: 170, size: 5, gravity: 400, life: 0.6 });
            break;
          case "shoot":
            play("shoot", 1.2);
            break;
          case "monster-shot":
            noise(0.25, 0.25, { freq: 1500, sweep: 300 });
            tone(300, 0.18, "square", 0.1, { slide: 120 });
            f.kills++;
            break;
          case "monster-hit":
            play("hit");
            f.shake.add(0.2);
            break;
          case "jet":
            play("powerup");
            f.floaters.add(bx, -by - 50, "JETPACK!", "#e0463c", 20);
            break;
          case "jet-end":
            tone(500, 0.25, "sawtooth", 0.1, { slide: 150 });
            break;
          case "hit":
            play("hurt");
            play("explode");
            f.shake.add(0.8);
            f.particles.burst(bx, -by - 20, 24, { color: ["#27324f", "#f7c948", "#ff5252"], speed: 240, size: 5, gravity: 500, life: 0.8 });
            break;
          case "fall":
            play("lose");
            break;
        }
      }
      if (g.jetT > 0) {
        f.jetTick -= dt;
        if (f.jetTick <= 0) {
          f.jetTick = 0.09;
          noise(0.14, 0.1, { type: "bandpass", freq: 900, q: 0.8 });
          f.particles.burst(g.x - g.facing * 17, -(g.y + 10), 3, { color: ["#ffb03a", "#fff3a0", "#e0463c"], speed: 80, size: 5, gravity: 200, angle: Math.PI / 2, spread: 0.7, life: 0.45 });
        }
      }
      if (wasAlive && !g.alive) {
        const score = scoreOf(g);
        const isBest = submitScore(score);
        setResult({ score, isBest, cause: g.cause === "monster" ? "monster" : "fell", kills: f.kills });
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          f.over = performance.now();
          go("over");
        }, g.cause === "monster" ? 1100 : 700);
      }
      const sc = scoreOf(g);
      if (sc >= f.lastScore + 100 && sc > 0) {
        f.lastScore = Math.floor(sc / 100) * 100;
        play("levelup");
        f.floaters.add(W / 2, -(g.camY + view.h * 0.62), `${f.lastScore}!`, "#2f7d32", 30);
      }
    } else if (phaseRef.current === "over") {
      // Let the tumbling doodle finish falling behind the panel.
      update(g, dt);
    }
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);

    // ---- scene
    const cam: Cam = { h: view.h, camY: g.camY, time };
    const [sx, sy] = f.shake.offset(9);
    ctx.save();
    ctx.translate(sx, sy);
    drawPaper(ctx, cam, best);
    for (const p of g.platforms) drawPlatform(ctx, p, cam);
    for (const j of g.jets) drawJetItem(ctx, j, cam);
    for (const m of g.monsters) drawMonster(ctx, m, cam, g.x, g.y + PLAYER_H / 2);
    for (const b of g.bullets) drawBullet(ctx, b.x, b.y, b.vx, b.vy, cam);

    // The doodle, aimed at the mouse when there is one; also drawn across the seam when near a side.
    let aim = g.aim;
    if (g.aimT <= 0) {
      const m = f.mouse;
      if (m && !touch) aim = aimAngle(g.x, g.y + PLAYER_H * 0.7, m.x, m.y);
      else aim = Math.PI / 2 + g.facing * -0.35;
    }
    const pose = {
      x: g.x, y: g.y, vx: g.vx, vy: g.vy, facing: g.facing, aim, firing: g.aimT, sinceBounce: g.sinceBounce, jet: g.jetT,
      alive: g.alive, deadT: g.deadT, cause: g.cause,
    };
    drawPlayer(ctx, pose, cam);
    if (g.x < 36) drawPlayer(ctx, { ...pose, x: g.x + W }, cam);
    else if (g.x > W - 36) drawPlayer(ctx, { ...pose, x: g.x - W }, cam);

    ctx.save();
    ctx.translate(0, view.h + g.camY);
    f.particles.draw(ctx);
    f.floaters.draw(ctx);
    ctx.restore();
    ctx.restore();

    // ---- HUD: score on a highlighter swipe, best underneath
    const score = scoreOf(g);
    const label = `${score}`;
    ctx.save();
    ctx.font = `700 34px ${HAND_FONT}`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(255,226,89,0.75)";
    ctx.beginPath();
    ctx.moveTo(14, 18);
    ctx.lineTo(24 + tw, 14);
    ctx.lineTo(28 + tw, 52);
    ctx.lineTo(12, 55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    text(ctx, label, 22, 36, { align: "left", size: 34, font: HAND_FONT, color: INK, weight: 700 });
    text(ctx, `best ${Math.max(best, score)}`, 16, 72, { align: "left", size: 14, font: HAND_FONT, color: "rgba(39,50,79,0.65)", weight: 700 });
    if (g.jetT > 0) {
      ctx.fillStyle = "rgba(39,50,79,0.25)";
      ctx.fillRect(W / 2 - 40, 16, 80, 8);
      ctx.fillStyle = "#e0463c";
      ctx.fillRect(W / 2 - 40, 16, 80 * (g.jetT / 2.5), 8);
    }
    // Controls hint for the first few seconds.
    if (running && f.hint < 6) {
      const a = clamp(Math.min(1, (6 - f.hint) / 1.2), 0, 1);
      ctx.globalAlpha = a;
      if (touch) {
        ctx.strokeStyle = "rgba(39,50,79,0.25)";
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        for (const x of [W * (0.5 - BAND), W * (0.5 + BAND)]) {
          ctx.beginPath();
          ctx.moveTo(x, view.h * 0.45);
          ctx.lineTo(x, view.h - 84);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        text(ctx, "◀ hold to steer", W * 0.22, view.h - 100, { size: 15, font: HAND_FONT, color: INK, weight: 700 });
        text(ctx, "hold to steer ▶", W * 0.78, view.h - 100, { size: 15, font: HAND_FONT, color: INK, weight: 700 });
        text(ctx, "tap = shoot", W / 2, view.h - 124, { size: 15, font: HAND_FONT, color: "#3d5afe", weight: 700 });
      } else {
        text(ctx, "← → steer  ·  click to shoot", W / 2, view.h - 90, { size: 16, font: HAND_FONT, color: INK, weight: 700 });
      }
      ctx.globalAlpha = 1;
    }
  };

  return (
    <div ref={root} className="absolute inset-0 select-none" style={{ touchAction: "none" }}>
      <GameCanvas width={W} height={logicalH} draw={draw} background="#2b2420" onPointer={onPointer} cursor={touch ? undefined : "crosshair"} />
      {phase === "menu" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={best || undefined}
          bestLabel="Best height"
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={resume} onRestart={start} />}
      {phase === "over" && (
        <GameOverPanel
          title={result.cause === "monster" ? "Inked out!" : "Off the page!"}
          accent={meta.accent}
          score={result.score}
          scoreLabel="Height"
          best={best}
          isBest={result.isBest}
          onRestart={start}
        >
          <p className="mt-2 text-xs text-white/55">
            {result.cause === "monster" ? "A monster got you. Stomp them from above or shoot them." : "You fell off the bottom of the page."}
            {result.kills > 0 ? ` Monsters beaten: ${result.kills}.` : ""}
          </p>
        </GameOverPanel>
      )}
      {touch && phase === "play" && (
        <button
          type="button"
          aria-label="Pause"
          className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full border border-black/20 bg-white/70 text-sm text-slate-800"
          onClick={pause}
        >
          ⏸
        </button>
      )}
    </div>
  );
}
