// Flap Dash: a one-tap flapper. Rules live in logic.ts and the art in art.ts; this file runs the loop, plays
// sounds, reads input (Space / click / tap) and drives the start / get-ready / pause / game-over flow.
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { clamp, damp, DISPLAY_FONT, Floaters, Particles, Shake, text } from "../../kit/draw";
import { useKeyPress } from "../../kit/input";
import { play, tone } from "../../kit/sfx";
import { randomSeed } from "../../kit/rng";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { drawBird, drawCity, drawClouds, drawGround, drawHills, drawPillar, drawSky, drawSkyBodies, MEDAL_STYLE } from "./art";
import { useBoxSize } from "./fit";
import { PILLAR_W, VIEW_H, flap, medalFor, newGame, nextMedal, nightAmount, speedFor, update, type FlapState, type MedalName } from "./logic";
import { meta } from "./meta";

type Phase = "menu" | "play" | "paused" | "over";

const FLAP_KEYS = new Set(["Space", "ArrowUp", "KeyW"]);

function Medal({ name }: { name: MedalName }) {
  const m = MEDAL_STYLE[name];
  return (
    <div className="mt-3 flex items-center justify-center gap-3">
      <div
        className="grid h-14 w-14 place-items-center rounded-full text-2xl shadow-lg"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${m.from}, ${m.to})`,
          border: `3px solid ${m.ring}`,
          boxShadow: `0 0 18px ${m.to}88`,
        }}
      >
        <span style={{ filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.35))" }}>★</span>
      </div>
      <div className="text-left">
        <div className="text-lg font-black leading-tight">{m.label} medal</div>
      </div>
    </div>
  );
}

export default function FlapDash({ touch, best, submitScore }: GameProps) {
  const root = useRef<HTMLDivElement>(null);
  const box = useBoxSize(root);
  const game = useRef<FlapState>(newGame(randomSeed()));
  const fx = useRef({
    particles: new Particles(), shake: new Shake(), floaters: new Floaters(),
    flash: 0, tilt: 0, idle: 0, resume: 0, lastMedal: null as MedalName | null, hint: 0, overAt: 0,
  });
  const [phase, setPhase] = useState<Phase>("menu");
  const phaseRef = useRef<Phase>("menu");
  const [result, setResult] = useState({ score: 0, isBest: false });
  const timer = useRef(0);

  // The world is always VIEW_H tall; its width follows the screen shape (within a phone-ish range).
  const zoom = box.h / VIEW_H;
  const viewW = clamp(box.w / zoom, 300, 480);


  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const reset = useCallback(() => {
    window.clearTimeout(timer.current);
    game.current = newGame(randomSeed());
    const f = fx.current;
    f.particles.clear();
    f.floaters.items = [];
    f.flash = 0;
    f.tilt = 0;
    f.resume = 0;
    f.lastMedal = null;
    f.hint = 0;
  }, []);

  const start = useCallback(() => {
    reset();
    play("select");
    go("play");
  }, [go, reset]);

  const doFlap = useCallback(() => {
    if (phaseRef.current !== "play" || fx.current.resume > 0) return;
    flap(game.current);
  }, []);

  const pause = useCallback(() => {
    if (phaseRef.current === "play") go("paused");
  }, [go]);

  const resume = useCallback(() => {
    fx.current.resume = game.current.phase === "playing" ? 1.5 : 0;
    go("play");
  }, [go]);

  useKeyPress((code) => {
    const p = phaseRef.current;
    if (FLAP_KEYS.has(code)) {
      if (p === "menu") start();
      else if (p === "play") doFlap();
      else if (p === "over" && performance.now() - fx.current.overAt > 450) start();
      return;
    }
    if (code === "KeyP" || code === "Escape") {
      if (p === "play") pause();
      else if (p === "paused") resume();
    } else if (code === "Enter" && (p === "menu" || (p === "over" && performance.now() - fx.current.overAt > 450))) start();
  });

  // Pause when the tab is hidden so a run isn't lost to a background tab.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [pause]);

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number, time: number) => {
    const g = game.current;
    const f = fx.current;
    const w = view.w;
    const running = phaseRef.current === "play";
    const birdScreenX = clamp(w * 0.3, 96, 140);

    // ---- simulate
    if (running && f.resume > 0) {
      f.resume = Math.max(0, f.resume - dt);
    } else if (running || (phaseRef.current === "over" && g.phase === "dead")) {
      const medalBefore = medalFor(g.score);
      const events = update(g, dt);
      for (const e of events) {
        if (e === "flap") {
          tone(430, 0.1, "triangle", 0.13, { slide: 720 });
          f.particles.burst(birdScreenX - 8, g.y + 8, 5, {
            color: ["#ffffff", "#ffe8c2"], speed: 70, size: 4, gravity: 120, angle: Math.PI * 0.8, spread: 1.6, life: 0.5,
          });
        } else if (e === "score") {
          play("coin", 1 + Math.min(0.5, g.score * 0.01));
          f.floaters.add(birdScreenX + 18, g.y - 28, "+1", "#fff6a8", 22);
          f.particles.burst(birdScreenX, g.y, 6, { color: ["#fde68a", "#ffffff"], speed: 90, size: 3.5, gravity: 0, shape: "spark", life: 0.5 });
        } else if (e === "hit") {
          f.flash = 1;
          f.shake.add(0.7);
          play("hit");
          f.particles.burst(birdScreenX, g.y, 22, {
            color: ["#ff9a6b", "#ffe8c2", "#26c9bb", "#ffffff"], speed: 220, size: 5, gravity: 500, life: 0.9,
          });
          window.setTimeout(() => play("drop"), 120);
          const isBest = submitScore(g.score);
          setResult({ score: g.score, isBest });
          timer.current = window.setTimeout(() => {
            f.overAt = performance.now();
            go("over");
            play(g.score >= 10 ? "win" : "lose");
          }, 950);
        } else if (e === "land") {
          f.shake.add(0.25);
          play("land");
        }
      }
      const medal = medalFor(g.score);
      if (medal && medal !== medalBefore && medal !== f.lastMedal) {
        f.lastMedal = medal;
        play("levelup");
        f.floaters.add(w / 2, 150, `${MEDAL_STYLE[medal].label} medal!`, MEDAL_STYLE[medal].to === "#d49a06" ? "#fde047" : "#ffffff", 26);
        f.particles.burst(w / 2, 100, 30, { color: [MEDAL_STYLE[medal].from, "#ffffff", MEDAL_STYLE[medal].to], speed: 240, size: 5, gravity: 220, shape: "spark" });
      }
    }
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);
    f.flash = Math.max(0, f.flash - dt * 2.4);
    f.hint += dt;
    if (g.phase === "ready") f.idle += speedFor(0) * 0.6 * dt;

    // Tilt follows the vertical speed: nose up on a flap, nose-dive when falling.
    const targetTilt = g.phase === "dead" && g.cause === "ground" ? 0.4 : clamp((g.vy + 130) / 460, -0.46, 1.4);
    f.tilt = damp(f.tilt, g.phase === "ready" ? 0 : targetTilt, g.vy < 0 ? 22 : 9, dt);

    // ---- scene
    const n = nightAmount(g.t);
    const camX = camXOf(g, birdScreenX);
    const scroll = camX + f.idle;
    const [sx, sy] = f.shake.offset(10);
    ctx.save();
    ctx.translate(sx, sy);
    drawSky(ctx, w + 20, n);
    drawSkyBodies(ctx, w, n, time);
    drawClouds(ctx, w, scroll, n, time);
    drawHills(ctx, w, scroll, n);
    drawCity(ctx, w, scroll, n, time);
    for (const p of g.pillars) {
      const px = p.x - camX;
      if (px < -PILLAR_W - 40 || px > w + PILLAR_W + 40) continue;
      drawPillar(ctx, p, camX, n);
    }
    drawGround(ctx, w, scroll, n);

    // ---- the bird
    const sinceFlap = g.sinceFlap;
    let wing: number;
    if (g.phase === "dead") wing = 0.9;
    else if (g.phase === "ready") wing = Math.sin(g.bob * 13) * 0.7 - 0.1;
    else if (sinceFlap < 0.26) wing = -0.95 * Math.cos((sinceFlap / 0.26) * Math.PI * 2) * (1 - sinceFlap);
    else wing = g.vy > 180 ? 0.7 : 0.25;
    const squash = sinceFlap < 0.14 && g.phase === "playing" ? 0.86 + (sinceFlap / 0.14) * 0.14 : 1;
    drawBird(ctx, { x: birdScreenX, y: g.y, tilt: f.tilt, wing, squash, dead: g.phase === "dead" });

    f.particles.draw(ctx);
    f.floaters.draw(ctx);
    ctx.restore();

    // ---- HUD
    if (g.phase === "ready") {
      const pulse = 1 + Math.sin(f.hint * 4) * 0.04;
      ctx.save();
      ctx.translate(w / 2, 150);
      ctx.scale(pulse, pulse);
      text(ctx, "Get Ready!", 0, 0, { size: 44, font: DISPLAY_FONT, color: "#ffffff", stroke: "#12315c", strokeWidth: 8, weight: 900 });
      ctx.restore();
      // A tapping finger hint.
      const tap = (Math.sin(f.hint * 5) + 1) / 2;
      const hx = w / 2;
      const hy = 360 + 40;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hx, hy, 26 + tap * 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(hx, hy, 14 - tap * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      text(ctx, touch ? "TAP to flap" : "SPACE or CLICK to flap", hx, hy + 62, { size: 17, color: "#ffffff", stroke: "#12315c", strokeWidth: 5, weight: 800 });
    } else {
      text(ctx, `${g.score}`, w / 2, 76, { size: 64, font: DISPLAY_FONT, color: "#ffffff", stroke: "#12315c", strokeWidth: 9, weight: 900 });
    }
    const nm = nextMedal(g.score);
    if (g.phase === "playing" && nm && g.score > 0) {
      text(ctx, `${nm.at - g.score} to ${nm.name}`, w / 2, 124, { size: 13, color: "rgba(255,255,255,0.85)", stroke: "rgba(18,49,92,0.9)", strokeWidth: 4, weight: 800 });
    }
    text(ctx, `BEST ${Math.max(best, g.score)}`, 14, 22, { size: 12, align: "left", color: "rgba(255,255,255,0.9)", stroke: "rgba(18,49,92,0.9)", strokeWidth: 4, weight: 800 });

    if (running && f.resume > 0) {
      const c = Math.ceil(f.resume / 0.5);
      text(ctx, `${c}`, w / 2, 300, { size: 90, font: DISPLAY_FONT, color: "#ffffff", stroke: "#12315c", strokeWidth: 10, weight: 900 });
    }
    if (f.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${f.flash * 0.75})`;
      ctx.fillRect(0, 0, w, VIEW_H);
    }
  };

  return (
    <div ref={root} className="absolute inset-0 select-none" style={{ touchAction: "none" }}>
      <GameCanvas
        width={viewW}
        height={VIEW_H}
        draw={draw}
        background="#0a1226"
        onPointer={(p) => {
          if (p.type === "down" && p.button === 0) doFlap();
        }}
      />
      {phase === "menu" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={best || undefined}
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={resume} onRestart={start} />}
      {phase === "over" && (
        <GameOverPanel accent={meta.accent} score={result.score} best={best} isBest={result.isBest} onRestart={start}>
          {medalFor(result.score) ? (
            <Medal name={medalFor(result.score)!} />
          ) : (
            <p className="mt-3 text-sm text-white/60">Score 10 for a bronze medal.</p>
          )}
          {nextMedal(result.score) && medalFor(result.score) ? (
            <p className="mt-2 text-xs text-white/55">Next: {nextMedal(result.score)!.name} at {nextMedal(result.score)!.at}</p>
          ) : null}
        </GameOverPanel>
      )}
      {touch && phase === "play" && (
        <button
          type="button"
          aria-label="Pause"
          className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white"
          onClick={pause}
        >
          ⏸
        </button>
      )}
    </div>
  );
}

/** World x of the left edge of the screen: the bird sits at a fixed spot on screen. */
function camXOf(g: FlapState, birdScreenX: number) {
  return g.x - birdScreenX;
}
