// Alien Wave: rules live in logic.ts and the pixel art in sprites.ts; this file draws, plays sounds, reads
// the keyboard / mouse / touch drags, and runs the start / pause / game-over flow.
import { useCallback, useRef, useState } from "react";
import { GameCanvas, type CanvasPointer, type View } from "../../kit/GameCanvas";
import { DISPLAY_FONT, Floaters, Particles, Shake, fillRoundRect, text } from "../../kit/draw";
import { useHeldKeys, useKeyPress } from "../../kit/input";
import { mulberry32, randomSeed } from "../../kit/rng";
import { melody, noise, play, tone } from "../../kit/sfx";
import { loadState, saveState } from "../../kit/storage";
import { TouchButton } from "../../kit/TouchPad";
import { GameOverPanel, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import {
  BUNKER_COLS, BUNKER_ROWS, CELL, H, PLAYER_H, PLAYER_Y, UPGRADE_TIME, W, newGame, setTarget, update, type WaveEvent, type WaveState,
} from "./logic";
import { ALIEN_COLORS, alienSprite, flashSprite, saucerSprite, shipSprite, stamp } from "./sprites";
import { meta } from "./meta";

type Phase = "ready" | "playing" | "paused" | "over";

const MARCH = [98, 87, 78, 65];

/** The starfield: fixed positions, drifting slowly down in three layers. */
const STARS = (() => {
  const r = mulberry32(42);
  return Array.from({ length: 90 }, () => ({ x: r() * W, y: r() * H, z: 0.3 + r() * 0.7, tw: r() * 6 }));
})();

export default function AlienWave({ touch, best, submitScore }: GameProps) {
  const game = useRef<WaveState>(newGame(randomSeed()));
  const fx = useRef({
    particles: new Particles(700), shake: new Shake(), floaters: new Floaters(), flashes: [] as { x: number; y: number; type: number; t: number }[],
    siren: 0, sirenFlip: false, banner: 0, touchDown: false, drag: null as null | { id: number; startX: number; shipX: number }, mouse: false,
  });
  const keys = useHeldKeys();
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [result, setResult] = useState({ score: 0, isBest: false, wave: 1, invaded: false });
  const [auto, setAuto] = useState<boolean>(() => loadState<boolean>("alien-wave:autofire") ?? true);
  const autoRef = useRef(auto);
  const padFire = useRef(false);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const start = useCallback(() => {
    game.current = newGame(randomSeed());
    const f = fx.current;
    f.particles.clear();
    f.floaters.items = [];
    f.flashes = [];
    f.banner = 2;
    f.touchDown = false;
    f.drag = null;
    padFire.current = false;
    melody([[262, 0.08], [330, 0.08], [392, 0.08], [523, 0.16]], "square", 0.07);
    go("playing");
  }, [go]);

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) go(p === "playing" ? "paused" : "playing");
    else if ((code === "Space" || code === "Enter") && (p === "ready" || p === "over")) start();
  });

  const onPointer = (p: CanvasPointer) => {
    const f = fx.current;
    const g = game.current;
    if (phaseRef.current !== "playing") return;
    if (p.pointerType === "mouse") {
      // Mouse: the ship follows the pointer while it is over the field; click and hold to fire.
      if (p.type === "move" || p.type === "down") {
        setTarget(g, p.x);
        f.mouse = true;
      }
      if (p.type === "down") f.touchDown = true;
      else if (p.type === "up" || p.type === "cancel") f.touchDown = false;
      return;
    }
    if (p.type === "down") {
      f.drag = { id: p.id, startX: p.x, shipX: g.player.target };
      f.touchDown = true;
    } else if (p.type === "move" && f.drag && f.drag.id === p.id) {
      setTarget(g, f.drag.shipX + (p.x - f.drag.startX) * 1.1);
    } else if (p.type === "up" || p.type === "cancel") {
      f.drag = null;
      f.touchDown = false;
    }
  };

  const handle = (events: WaveEvent[], g: WaveState) => {
    const f = fx.current;
    for (const e of events) {
      switch (e.type) {
        case "step":
          if (g.aliens.length) tone(MARCH[g.stepCount % 4], 0.09, "square", 0.08);
          break;
        case "shoot":
          tone(1100, 0.1, "square", 0.05, { slide: 320 });
          break;
        case "alien-die": {
          const type = e.alienType ?? 0;
          noise(0.18, 0.22, { freq: 2200, sweep: 300 });
          tone(520 - type * 70, 0.1, "square", 0.07, { slide: 120 });
          f.flashes.push({ x: e.x, y: e.y, type, t: 0.16 });
          f.particles.burst(e.x, e.y, 14, { color: [ALIEN_COLORS[type].body, ALIEN_COLORS[type].accent, "#ffffff"], speed: 150, size: 3.5, gravity: 140, shape: "square", life: 0.6 });
          if (e.diving) f.floaters.add(e.x, e.y - 8, `${e.points}`, "#fde047", 15);
          f.shake.add(0.07);
          break;
        }
        case "dive":
          tone(700, 0.35, "sawtooth", 0.05, { slide: 220 });
          break;
        case "alien-shot":
          tone(240, 0.12, "triangle", 0.05, { slide: 120 });
          break;
        case "bunker-hit":
          noise(0.08, 0.14, { freq: 900 });
          f.particles.burst(e.x, e.y, 5, { color: ["#4ade80", "#bbf7d0"], speed: 70, size: 2.5, gravity: 200, shape: "square", life: 0.4 });
          break;
        case "saucer-spawn":
          f.siren = 0;
          break;
        case "saucer-die":
          play("coin");
          noise(0.3, 0.25, { freq: 2000, sweep: 200 });
          f.particles.burst(e.x, e.y, 26, { color: ["#fb7185", "#fde68a", "#ffffff"], speed: 200, size: 3.5, gravity: 80, shape: "spark", life: 0.9 });
          f.floaters.add(e.x, e.y - 10, `+${e.points}`, "#fde047", 22);
          f.shake.add(0.2);
          break;
        case "player-die":
          play("explode");
          f.particles.burst(e.x, PLAYER_Y, 36, { color: ["#7dd3fc", "#ffffff", "#fb923c"], speed: 220, size: 4, gravity: 120, shape: "square", life: 1 });
          f.shake.add(0.9);
          break;
        case "respawn":
          tone(300, 0.25, "sine", 0.1, { slide: 800 });
          break;
        case "upgrade":
          play("powerup");
          f.floaters.add(g.player.x, PLAYER_Y - 30, "TWIN SHOT!", "#a5f3fc", 20);
          break;
        case "extra-life":
          play("levelup");
          f.floaters.add(W / 2, H / 2, "EXTRA SHIP!", "#86efac", 26);
          break;
        case "wave":
          f.banner = 2;
          if (g.wave > 1) play("levelup");
          break;
        case "over": {
          play("lose");
          const isBest = submitScore(g.score);
          setResult({ score: g.score, isBest, wave: g.wave, invaded: g.invaded });
          go("over");
          break;
        }
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, _view: View, dt: number, time: number) => {
    const g = game.current;
    const f = fx.current;
    if (phaseRef.current === "playing") {
      const k = keys.current;
      const wantFire = k.has("Space") || padFire.current || (autoRef.current && f.touchDown);
      const events = update(g, dt, { left: k.has("ArrowLeft") || k.has("KeyA"), right: k.has("ArrowRight") || k.has("KeyD"), fire: wantFire });
      handle(events, g);
      // The saucer's warbling siren.
      if (g.saucer) {
        f.siren -= dt;
        if (f.siren <= 0) {
          f.sirenFlip = !f.sirenFlip;
          tone(f.sirenFlip ? 760 : 620, 0.08, "triangle", 0.04);
          f.siren = 0.12;
        }
      }
      f.banner = Math.max(0, f.banner - dt);
    }
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);
    for (const fl of f.flashes) fl.t -= dt;
    f.flashes = f.flashes.filter((fl) => fl.t > 0);

    const [sx, sy] = f.shake.offset(8);
    ctx.save();
    ctx.translate(sx, sy);

    // ---- space
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a0720");
    bg.addColorStop(1, "#04030d");
    ctx.fillStyle = bg;
    ctx.fillRect(-20, -20, W + 40, H + 40);
    for (const st of STARS) {
      const y = (st.y + time * 14 * st.z) % H;
      ctx.fillStyle = `rgba(200,210,255,${0.25 + 0.35 * st.z * (0.6 + 0.4 * Math.sin(time * 2 + st.tw))})`;
      ctx.fillRect(st.x, y, st.z * 1.8, st.z * 1.8);
    }
    // The ground line.
    ctx.fillStyle = "rgba(167,139,250,0.5)";
    ctx.fillRect(0, PLAYER_Y + PLAYER_H / 2 + 6, W, 2);

    // ---- bunkers
    for (const b of g.bunkers) {
      ctx.fillStyle = "#34d399";
      ctx.beginPath();
      for (let r = 0; r < BUNKER_ROWS; r++) {
        for (let c = 0; c < BUNKER_COLS; c++) if (b.cells[r * BUNKER_COLS + c]) ctx.rect(b.x + c * CELL, b.y + r * CELL, CELL, CELL);
      }
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      for (let c = 0; c < BUNKER_COLS; c++) if (b.cells[3 * BUNKER_COLS + c]) ctx.rect(b.x + c * CELL, b.y + 3 * CELL, CELL, 1);
      ctx.fill();
    }

    // ---- aliens
    const scale = 2.4;
    for (const a of g.aliens) {
      const frame = a.state === "form" ? g.anim : Math.floor(time * 6) & 1;
      let rot = 0;
      if (a.state === "dive" && a.path) rot = Math.sin(a.t * 14) * 0.25;
      if (rot) {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(rot);
        stamp(ctx, alienSprite(a.type, frame), 0, 0, scale);
        ctx.restore();
      } else stamp(ctx, alienSprite(a.type, frame), a.x, a.y, scale);
    }
    for (const fl of f.flashes) {
      ctx.globalAlpha = Math.min(1, fl.t / 0.16);
      stamp(ctx, flashSprite(fl.type), fl.x, fl.y, 2.4 + (0.16 - fl.t) * 8);
    }
    ctx.globalAlpha = 1;

    // ---- the mystery saucer
    if (g.saucer) stamp(ctx, saucerSprite(), g.saucer.x, g.saucer.y, 2.2);

    // ---- capsules
    for (const c of g.capsules) {
      ctx.fillStyle = "rgba(165,243,252,0.25)";
      fillRoundRect(ctx, c.x - 15, c.y - 11, 30, 22, 11, "rgba(165,243,252,0.22)");
      fillRoundRect(ctx, c.x - 12, c.y - 8, 24, 16, 8, "#22d3ee");
      fillRoundRect(ctx, c.x - 12, c.y - 8, 24, 8, 8, "#67e8f9");
      text(ctx, "2×", c.x, c.y + 0.5, { size: 11, weight: 900, color: "#04202a" });
    }

    // ---- shots
    for (const b of g.bolts) {
      ctx.fillStyle = "rgba(165,243,252,0.3)";
      ctx.fillRect(b.x - 3, b.y - 7, 6, 15);
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(b.x - 1.5, b.y - 6, 3, 12);
    }
    for (const s of g.shots) {
      ctx.fillStyle = "rgba(251,113,133,0.3)";
      ctx.fillRect(s.x - 3, s.y - 7, 6, 14);
      ctx.fillStyle = "#fecdd3";
      const seg = Math.floor(s.phase * 2) % 2;
      ctx.fillRect(s.x - 1.5 + (seg ? 1 : -1), s.y - 6, 3, 6);
      ctx.fillRect(s.x - 1.5 + (seg ? -1 : 1), s.y, 3, 6);
    }

    // ---- the player
    const p = g.player;
    if (p.alive && !(p.invuln > 0 && Math.floor(time * 12) % 2 === 0)) {
      stamp(ctx, shipSprite(), p.x, PLAYER_Y, 2.2);
      // A flickering engine glow.
      ctx.fillStyle = `rgba(251,146,60,${0.6 + Math.random() * 0.4})`;
      ctx.fillRect(p.x - 2, PLAYER_Y + PLAYER_H / 2 - 1, 4, 3 + Math.random() * 4);
      if (g.upgrade > 0) {
        ctx.fillStyle = "#67e8f9";
        ctx.fillRect(p.x - 11, PLAYER_Y - 12, 3, 8);
        ctx.fillRect(p.x + 8, PLAYER_Y - 12, 3, 8);
      }
    }

    f.particles.draw(ctx);
    f.floaters.draw(ctx);

    // ---- messages
    if (f.banner > 0 && g.phase === "play" && phaseRef.current === "playing") {
      ctx.globalAlpha = Math.min(1, f.banner);
      text(ctx, `WAVE ${g.wave}`, W / 2, H / 2 + 30, { size: 36, font: DISPLAY_FONT, color: "#ddd6fe", weight: 900, stroke: "#04030d", strokeWidth: 5 });
      ctx.globalAlpha = 1;
    }
    if (!p.alive && g.lives <= 0 && g.phase === "play") {
      text(ctx, g.invaded ? "THEY LANDED!" : "GAME OVER", W / 2, H / 2, { size: 38, font: DISPLAY_FONT, color: "#fb7185", weight: 900, stroke: "#04030d", strokeWidth: 6 });
    }
    ctx.restore();

    // ---- HUD
    text(ctx, `${g.score}`, 14, 22, { align: "left", size: 24, font: DISPLAY_FONT, color: "#ddd6fe", weight: 900 });
    text(ctx, "SCORE", 15, 40, { align: "left", size: 9, color: "rgba(255,255,255,0.45)" });
    text(ctx, `WAVE ${g.wave}`, W / 2, 18, { size: 13, font: DISPLAY_FONT, color: "#c4b5fd", weight: 900 });
    text(ctx, `BEST ${Math.max(best, g.score)}`, W / 2, 35, { size: 10.5, color: "rgba(255,255,255,0.5)", weight: 800 });
    const ship = shipSprite();
    for (let i = 0; i < Math.min(g.lives, 6); i++) stamp(ctx, ship, W - 22 - i * 26, 22, 1.5);
    if (g.upgrade > 0) {
      const w = 90;
      fillRoundRect(ctx, W - w - 14, 42, w, 11, 5.5, "rgba(255,255,255,0.12)");
      fillRoundRect(ctx, W - w - 14, 42, Math.max(6, (w * g.upgrade) / UPGRADE_TIME), 11, 5.5, "#22d3ee");
      text(ctx, "TWIN SHOT", W - w / 2 - 14, 48, { size: 8, weight: 900, color: "#04202a" });
    }
  };

  const toggleAuto = () => {
    const v = !auto;
    setAuto(v);
    autoRef.current = v;
    saveState("alien-wave:autofire", v);
  };
  autoRef.current = auto;

  return (
    <div className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas width={W} height={H} draw={draw} background="#02010a" onPointer={onPointer} />
      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={best || undefined}
          extra={
            <div className="mt-3 hidden justify-center gap-3 text-[11px] text-white/70 [@media(min-height:560px)]:flex">
              {ALIEN_COLORS.map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c.body }} />
                  {[40, 30, 20, 10][i]}
                </span>
              ))}
              <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-400" />???</span>
            </div>
          }
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={start} />}
      {phase === "over" && (
        <GameOverPanel accent={meta.accent} score={result.score} best={best} isBest={result.isBest} onRestart={start} title={result.invaded ? "They landed!" : "Game over"}>
          <p className="mt-2 text-xs text-white/55">You reached wave {result.wave}</p>
        </GameOverPanel>
      )}
      {touch && phase === "playing" && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <button
            type="button"
            aria-label="Pause"
            className="pointer-events-auto absolute right-2 top-2 h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white"
            onClick={() => go("paused")}
          >
            ⏸
          </button>
          <button
            type="button"
            aria-label="Toggle auto-fire"
            className={`pointer-events-auto absolute left-2 top-2 h-9 rounded-full border px-3 text-xs font-bold text-white ${auto ? "border-white/70 bg-white/25" : "border-white/25 bg-black/40"}`}
            onClick={toggleAuto}
          >
            Auto-fire {auto ? "on" : "off"}
          </button>
          <div className="absolute bottom-4 right-3">
            <TouchButton label="Fire" size={70} onDown={() => (padFire.current = true)} onUp={() => (padFire.current = false)} className="border-violet-300/60">
              <span className="text-sm font-black">FIRE</span>
            </TouchButton>
          </div>
        </div>
      )}
    </div>
  );
}
