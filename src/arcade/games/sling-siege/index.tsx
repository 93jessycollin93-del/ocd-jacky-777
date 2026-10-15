// Sling Siege: a slingshot destruction game. The rules and physics live in logic.ts / physics.ts, the art in
// art.ts, the effects in fx.ts and the camera in camera.ts; this file runs the loop, reads input (drag to
// aim, tap for tricks), plays sounds and drives the title / level select / play / pause / result flow.
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { clamp, damp, DISPLAY_FONT, easeOutElastic, Shake, text } from "../../kit/draw";
import { formatNumber } from "../../kit/format";
import { useKeyPress } from "../../kit/input";
import { play } from "../../kit/sfx";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, PausePanel, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import {
  drawBackdrop, drawBlock, drawCritter, drawCritterIcon, drawGround, drawGrumbler, drawScenery, drawSlingBack, drawSlingFront, THEMES,
} from "./art";
import {
  clampCamX, screenToWorld, stepCam, targetCam, worldToScreen, type Cam, type CamMode,
} from "./camera";
import { Effects } from "./fx";
import { useBoxSize } from "./fit";
import { LevelSelect } from "./LevelSelect";
import { LEVELS } from "./levels";
import {
  abilityTarget, clampPull, isUnlocked, launch, normalizeProgress, recordResult, startSiege, starTargets,
  stepSiege, totalScore, totalStars, trajectory, triggerAbility, type Progress, type SiegeEvent, type SiegeState,
} from "./logic";
import { CRITTERS, LEFTOVER_BONUS, SLING, WORLDS, type MatId } from "./materials";
import { meta } from "./meta";
import { WinPanel, type WinInfo } from "./ResultPanel";
import {
  soundAbility, soundBonus, soundBoom, soundBreak, soundHit, soundKill, soundLaunch, soundStar, soundStretch,
} from "./sound";

type Phase = "title" | "levels" | "play" | "paused" | "result";

const SAVE_KEY = "sling-siege:progress";

interface Ui {
  levelIndex: number;
  drag: { id: number; px: number; py: number } | null;
  pan: { id: number; sx: number; camX: number } | null;
  panX: number | undefined;
  introT: number;
  holdT: number;
  lastX: number;
  lastY: number;
  recoil: { t: number; px: number; py: number } | null;
  loadT: number;
  scoreShown: number;
  endTimer: number;
  banner: number;
  hintT: number;
  flash: number;
  abilityHintT: number;
  pulledOnce: boolean;
  shotLook: number;
}

const newUi = (levelIndex: number): Ui => ({
  levelIndex, drag: null, pan: null, panX: undefined, introT: 0, holdT: 0, lastX: SLING.x, lastY: SLING.y, recoil: null, loadT: 1,
  scoreShown: 0, endTimer: -1, banner: 0, hintT: 0, flash: 0, abilityHintT: 0, pulledOnce: false, shotLook: 0,
});

const loadLevel = startSiege;

const MAT_SPARK: Record<string, string> = {
  wood: "#f0c88e", stone: "#e5e7eb", glass: "#e0f2fe", ice: "#ffffff", tnt: "#fca5a5", grumbler: "#bbf7d0", critter: "#f1f5f9", ground: "#e7d5b8", rock: "#e5e7eb",
};

export default function SlingSiege({ touch, best, submitScore }: GameProps) {
  const root = useRef<HTMLDivElement>(null);
  const box = useBoxSize(root);
  const startIndex = useRef(0);
  const siege = useRef<SiegeState | null>(null);
  if (!siege.current) siege.current = loadLevel(startIndex.current);
  const ui = useRef<Ui>(newUi(0));
  const fx = useRef({ effects: new Effects(), shake: new Shake() });
  const cam = useRef<Cam | null>(null);
  const aimBuf = useRef<{ x: number; y: number }[]>([]);
  const timers = useRef<number[]>([]);

  const [phase, setPhase] = useState<Phase>("title");
  const phaseRef = useRef<Phase>("title");
  const [progress, setProgress] = useState<Progress>(() => normalizeProgress(loadState<Progress>(SAVE_KEY)));
  const progressRef = useRef(progress);
  const [win, setWin] = useState<WinInfo | null>(null);
  const [lose, setLose] = useState<{ score: number; level: string } | null>(null);
  const viewRef = useRef({ w: box.w, h: box.h });
  viewRef.current = { w: box.w, h: box.h };

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const snapCamera = useCallback((s: SiegeState) => {
    const v = viewRef.current;
    cam.current = targetCam(v, s.level.width, { mode: "intro", fx: 0, fy: 0 });
  }, []);

  const startLevel = useCallback((i: number) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const s = loadLevel(i);
    siege.current = s;
    ui.current = newUi(i);
    ui.current.hintT = 0;
    fx.current.effects.clear();
    snapCamera(s);
    setWin(null);
    setLose(null);
    play("select");
    go("play");
  }, [go, snapCamera]);

  const openLevels = useCallback(() => {
    play("click");
    go("levels");
  }, [go]);

  // The scene behind the title and level select: level 1, quietly there.
  useEffect(() => {
    if (!cam.current && siege.current) snapCamera(siege.current);
  }, [snapCamera]);

  const finish = useCallback(() => {
    const s = siege.current!;
    const u = ui.current;
    const r = s.result;
    if (!r) return;
    if (r.won) {
      const prev = progressRef.current.scores[u.levelIndex];
      const { progress: np } = recordResult(progressRef.current, u.levelIndex, r.score, r.stars);
      progressRef.current = np;
      setProgress(np);
      saveState(SAVE_KEY, np);
      const total = totalScore(np);
      const isTotalBest = submitScore(total);
      const targets = starTargets(s.level);
      setWin({
        levelName: s.level.name, levelNumber: u.levelIndex + 1, stars: Math.max(r.stars, 1), score: r.score, destruction: r.destruction,
        bonus: r.bonus, left: r.left, prevBest: prev, total, isTotalBest, hasNext: u.levelIndex + 1 < LEVELS.length,
        nextStarScore: r.stars < 2 ? targets[0] : targets[1],
      });
      play("win");
      for (let i = 0; i < r.stars; i++) later(() => soundStar(i), 350 + i * 350);
    } else {
      setLose({ score: s.score, level: s.level.name });
      play("lose");
    }
    go("result");
  }, [go, later, submitScore]);

  const handleEvents = useCallback((evs: SiegeEvent[], s: SiegeState) => {
    const f = fx.current;
    const u = ui.current;
    for (const e of evs) {
      switch (e.t) {
        case "launch":
          soundLaunch(Math.min(1, (e.v ?? 0) / 24));
          f.effects.dust(e.x, e.y, 0.5, "#f1f5f9", 3);
          f.shake.add(0.06);
          break;
        case "hit":
          soundHit(e.mat, e.v ?? 0);
          f.effects.impact(e.x, e.y, e.v ?? 0, MAT_SPARK[e.mat ?? "ground"] ?? "#fff");
          if ((e.v ?? 0) > 9) f.shake.add(0.08);
          break;
        case "break":
          soundBreak(e.mat as MatId);
          f.effects.debris(e.mat as MatId, e.x, e.y, e.w ?? 1, e.h ?? 1);
          f.shake.add(e.mat === "stone" ? 0.14 : 0.06);
          break;
        case "kill":
          soundKill();
          f.effects.poof(e.x, e.y, (e.w ?? 1) * 1.2);
          f.shake.add(0.12);
          break;
        case "boom":
          soundBoom();
          f.effects.boom(e.x, e.y, e.v ?? 3);
          f.shake.add(0.55);
          u.flash = 0.7;
          break;
        case "ability":
          soundAbility(e.kind ?? "");
          if (e.kind === "splitter") f.effects.dust(e.x, e.y, 0.4, "#fed7aa", 4);
          if (e.kind === "dasher") f.effects.impact(e.x, e.y, 6, "#fde047");
          if (e.kind === "heavy") f.effects.dust(e.x, e.y, 0.6, "#d6d3d1", 4);
          break;
        case "score":
          f.effects.popup(e.x, e.y, `+${formatNumber(e.v ?? 0)}`, (e.v ?? 0) >= 4000 ? "#bbf7d0" : "#fde047", (e.v ?? 0) >= 4000 ? 26 : 19);
          break;
        case "poof":
          f.effects.puff(e.x, e.y);
          break;
        case "fall":
          break;
        case "next":
          u.loadT = 0;
          u.holdT = 0;
          break;
        case "won": {
          u.endTimer = 1.9 + s.queue.length * 0.35;
          f.effects.confetti(s.level.width * 0.6, -6, 60);
          for (let i = 0; i < s.queue.length; i++) {
            later(() => {
              soundBonus(i);
              f.effects.popup(SLING.x - 0.5 + i * 0.4, SLING.y - 1.4 - i * 0.2, `+${formatNumber(LEFTOVER_BONUS)}`, "#fde047", 22);
            }, 500 + i * 350);
          }
          break;
        }
        case "lost":
          u.endTimer = 1.3;
          break;
      }
    }
  }, [later]);

  const trick = useCallback(() => {
    const s = siege.current!;
    if (phaseRef.current !== "play") return;
    if (s.phase !== "fly") return;
    if (!triggerAbility(s)) {
      play("blip", 1.5);
      return;
    }
    handleEvents(s.events, s);
    s.events.length = 0;
  }, [handleEvents]);

  const restart = useCallback(() => startLevel(ui.current.levelIndex), [startLevel]);

  const nextLevel = useCallback(() => {
    const i = ui.current.levelIndex + 1;
    if (i < LEVELS.length) startLevel(i);
    else go("levels");
  }, [go, startLevel]);

  const pause = useCallback(() => {
    if (phaseRef.current === "play") go("paused");
  }, [go]);

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "play" || p === "paused")) go(p === "play" ? "paused" : "play");
    else if (code === "Escape" && p === "levels") go("title");
    else if (p === "play") {
      if (code === "Space" || code === "Enter" || code === "ArrowUp") trick();
      else if (code === "KeyR") restart();
    }
  });

  // ---------------------------------------------------------------- pointer

  const onPointer = (p: { type: "down" | "move" | "up" | "cancel"; x: number; y: number; id: number }) => {
    if (phaseRef.current !== "play" || !cam.current) return;
    const s = siege.current!;
    const u = ui.current;
    const v = viewRef.current;
    const c = cam.current;
    const [wx, wy] = screenToWorld(c, v, p.x, p.y);
    if (p.type === "down") {
      if (s.phase === "fly") {
        trick();
        return;
      }
      if (s.phase !== "aim" || s.queue.length === 0 || u.drag || u.pan) return;
      const reach = Math.max(touch ? 5.2 : 3.8, (touch ? 64 : 44) / c.z);
      if (Math.hypot(wx - SLING.x, wy - SLING.y) < reach) {
        const pull = clampPull(wx - SLING.x, wy - SLING.y);
        u.drag = { id: p.id, px: pull.x, py: pull.y };
        u.recoil = null;
        u.pulledOnce = true;
        play("tick");
      } else {
        u.pan = { id: p.id, sx: p.x, camX: u.panX ?? c.x };
      }
    } else if (p.type === "move") {
      if (u.drag && u.drag.id === p.id) {
        const pull = clampPull(wx - SLING.x, wy - SLING.y);
        if (Math.abs(pull.len - Math.hypot(u.drag.px, u.drag.py)) > 0.05) soundStretch(pull.len / SLING.maxPull);
        u.drag.px = pull.x;
        u.drag.py = pull.y;
      } else if (u.pan && u.pan.id === p.id) {
        const nx = u.pan.camX - (p.x - u.pan.sx) / c.z;
        u.panX = clampCamX(v, c.z, nx, s.level.width);
      }
    } else {
      if (u.drag && u.drag.id === p.id) {
        const d = u.drag;
        u.drag = null;
        if (p.type === "up" && launch(s, d.px, d.py)) {
          u.recoil = { t: 0, px: d.px, py: d.py };
          handleEvents(s.events, s);
          s.events.length = 0;
        } else if (Math.hypot(d.px, d.py) > 0.3) {
          u.recoil = { t: 0, px: d.px, py: d.py };
        }
      }
      if (u.pan && u.pan.id === p.id) u.pan = null;
    }
  };

  // ---------------------------------------------------------------- frame

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number, time: number) => {
    const s = siege.current!;
    const u = ui.current;
    const f = fx.current;
    const ph = phaseRef.current;
    const running = ph === "play";
    const frozen = ph === "paused";
    const level = s.level;
    const theme = THEMES[level.world];
    const vp = { w: view.w, h: view.h };
    if (!cam.current) snapCamera(s);
    const c = cam.current!;

    if (running) {
      handleEvents(stepSiege(s, dt), s);
      u.introT += dt;
      u.banner += dt;
      u.hintT += dt;
      u.scoreShown = damp(u.scoreShown, s.score, 8, dt);
      if (Math.abs(u.scoreShown - s.score) < 1) u.scoreShown = s.score;
      if (u.loadT < 1) u.loadT = Math.min(1, u.loadT + dt * 2.2);
      if (u.recoil) {
        u.recoil.t += dt * 4.5;
        if (u.recoil.t >= 1) u.recoil = null;
      }
      if (s.phase === "settle") u.holdT += dt;
      u.abilityHintT = abilityTarget(s) ? u.abilityHintT + dt : 0;
      if (u.endTimer >= 0) {
        u.endTimer -= dt;
        if (u.endTimer < 0) finish();
      }
    }
    if (!frozen) {
      f.effects.update(dt);
      f.shake.update(dt);
      u.flash = Math.max(0, u.flash - dt * 2.5);
    }

    // ---- camera
    let mode: CamMode = "home";
    if (running || ph === "paused") {
      if (s.phase === "aim" && s.shots === 0 && u.introT < 0.75) mode = "intro";
      else if (s.phase === "fly") {
        const crits = s.pieces.filter((p) => p.kind === "critter");
        const lead = crits.reduce<(typeof crits)[number] | null>((a, p) => (!a || p.body.x > a.body.x ? p : a), null);
        if (lead) {
          u.lastX = lead.body.x;
          u.lastY = lead.body.y;
        }
        mode = "follow";
      } else if (s.phase === "settle" && u.holdT < 1.7) mode = "hold";
    }
    if (!frozen) {
      const target = targetCam(vp, level.width, { mode, fx: u.lastX, fy: u.lastY, panX: u.panX });
      if (u.pan && mode === "home") {
        c.x = target.x;
        c.y = target.y;
        c.z = target.z;
      } else stepCam(c, target, dt, mode === "follow" ? 5 : mode === "intro" ? 2.4 : 3.2);
    }

    // ---- world
    drawBackdrop(ctx, vp, c, theme, time);
    ctx.save();
    const [shx, shy] = f.shake.offset(12);
    ctx.translate(vp.w / 2 + shx, vp.h / 2 + shy);
    ctx.scale(c.z, c.z);
    ctx.translate(-c.x, -c.y);
    const left = c.x - vp.w / 2 / c.z - 2;
    const right = c.x + vp.w / 2 / c.z + 2;
    drawScenery(ctx, theme, c.z, level.width);
    drawGround(ctx, theme, c.z, left, right, vp.h / c.z);

    // Blocks first, then grumblers, then critters.
    for (const p of s.pieces) if (p.kind === "block" && p.mat === "rock") drawBlock(ctx, p, c.z, theme);

    // The sling and the critter being loaded.
    const aiming = s.phase === "aim" && s.queue.length > 0;
    let pouchX = SLING.x;
    let pouchY = SLING.y;
    let pull = 0;
    if (u.drag) {
      pouchX += u.drag.px;
      pouchY += u.drag.py;
      pull = Math.hypot(u.drag.px, u.drag.py) / SLING.maxPull;
    } else if (u.recoil) {
      const k = easeOutElastic(clamp(u.recoil.t, 0, 1));
      pouchX = SLING.x + u.recoil.px * (1 - k);
      pouchY = SLING.y + u.recoil.py * (1 - k);
    }
    drawSlingBack(ctx, pouchX, pouchY, c.z);

    for (const p of s.pieces) if (p.kind === "block" && p.mat !== "rock") drawBlock(ctx, p, c.z, theme);

    for (const p of s.pieces) {
      if (p.kind !== "grumbler") continue;
      const b = p.body;
      const r = (b.shape as { r: number }).r;
      drawGrumbler(ctx, p.gkind!, b.x, b.y, r, { time, hurt: 1 - p.hp / p.maxHp, sq: p.sq, flash: p.flash, id: p.id, angle: b.a }, c.z);
    }

    if (aiming) {
      const kind = s.queue[0];
      const spec = CRITTERS[kind];
      let cx = pouchX;
      let cy = pouchY;
      if (u.loadT < 1) {
        // The next critter hops up from the ground behind the sling.
        const t = u.loadT;
        const sx = SLING.x - 2.4;
        cx = sx + (SLING.x - sx) * t;
        cy = -spec.r + (SLING.y - -spec.r) * t - Math.sin(t * Math.PI) * 1.6;
      }
      const bob = u.drag || u.recoil ? 0 : Math.sin(time * 2.2) * 0.03;
      drawCritter(ctx, kind, cx, cy + bob, spec.r, {
        angle: u.drag ? Math.atan2(-u.drag.py, -u.drag.px) * 0.0 : 0, strain: pull, time, lit: false, boost: false, lookX: 1, lookY: u.drag ? -0.2 : 0,
      }, c.z);
    }
    for (const p of s.pieces) {
      if (p.kind !== "critter") continue;
      const b = p.body;
      const sp = Math.hypot(b.vx, b.vy);
      drawCritter(ctx, p.ckind!, b.x, b.y, (b.shape as { r: number }).r, {
        angle: b.a, strain: 0, time, lit: (p.fuse ?? -1) >= 0 && !p.used, boost: p.used === true && p.ckind === "dasher" && sp > 22,
        lookX: clamp(b.vx / 20, -1, 1), lookY: clamp(b.vy / 20, -1, 1),
      }, c.z);
    }
    drawSlingFront(ctx, pouchX, pouchY, c.z, aiming && u.loadT >= 1);

    // Aim: the reach ring and the dotted arc for the first part of the flight.
    if (u.drag && aiming) {
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = Math.max(0.04, 1.5 / c.z);
      ctx.setLineDash([0.25, 0.3]);
      ctx.beginPath();
      ctx.arc(SLING.x, SLING.y, SLING.maxPull, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const pts = trajectory(u.drag.px, u.drag.py, 17, 0.085, aimBuf.current);
      const dotR = Math.max(0.12, 4.2 / c.z);
      for (let i = 0; i < pts.length; i++) {
        if (pts[i].y > -0.1) break;
        const k = 1 - i / pts.length;
        ctx.globalAlpha = 0.25 + 0.75 * k;
        ctx.fillStyle = "rgba(15,23,42,0.5)";
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, dotR * (0.65 + 0.5 * k) + 0.5 / c.z, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, dotR * (0.65 + 0.5 * k), 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    f.effects.draw(ctx, c.z);
    ctx.restore();

    if (u.flash > 0) {
      ctx.fillStyle = `rgba(255,244,214,${u.flash * 0.45})`;
      ctx.fillRect(0, 0, vp.w, vp.h);
    }

    // ---- popups (screen space so the text stays crisp)
    for (const pu of f.effects.popups) {
      const [sx, sy] = worldToScreen(c, vp, pu.x, pu.y);
      const k = pu.life / pu.max;
      ctx.globalAlpha = Math.min(1, k * 2.2);
      const grow = 1 + Math.max(0, k - 0.8) * 2.5;
      text(ctx, pu.text, sx, sy, { size: pu.size * grow, color: pu.color, stroke: "rgba(40,20,0,0.75)", strokeWidth: 5, weight: 900, font: DISPLAY_FONT });
    }
    ctx.globalAlpha = 1;

    if (ph === "play" || ph === "paused" || ph === "result") drawHud(ctx, vp, s, u, time, touch);
  };

  const showSelect = phase === "levels";
  const playing = phase === "play" || phase === "paused";
  const firstUnlocked = (() => {
    for (let i = 0; i < LEVELS.length; i++) if (isUnlocked(progress, i) && progress.stars[i] === 0) return i;
    return LEVELS.length - 1;
  })();

  return (
    <div ref={root} className="absolute inset-0 select-none" style={{ touchAction: "none" }}>
      <GameCanvas width={box.w} height={box.h} draw={draw} background="#7dd3fc" onPointer={onPointer} cursor="crosshair" />
      {playing && box.h > box.w * 1.1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] font-semibold text-white/80 drop-shadow">
          ↻ Turn your phone sideways to see the whole fort
        </div>
      )}
      {phase === "title" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={() => {
            play("select");
            go("levels");
          }}
          accent={meta.accent}
          best={best ? formatNumber(best) : undefined}
          bestLabel="Best total"
          extra={
            totalStars(progress) > 0 ? (
              <p className="mt-1 text-xs text-white/60">
                Stars: <b className="text-amber-300">{totalStars(progress)}</b> / {LEVELS.length * 3} · Next up: level {firstUnlocked + 1}
              </p>
            ) : null
          }
        />
      )}
      {showSelect && (
        <LevelSelect
          progress={progress}
          accent={meta.accent}
          onBack={() => go("title")}
          onPick={(i) => {
            if (isUnlocked(progress, i)) startLevel(i);
          }}
        />
      )}
      {playing && (
        <div className="absolute right-2 top-2 z-10 flex gap-2">
          <button
            type="button"
            aria-label="Restart level"
            title="Restart level (R)"
            className="h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white"
            onClick={restart}
          >
            ↻
          </button>
          <button
            type="button"
            aria-label="Pause"
            title="Pause (P)"
            className="h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white"
            onClick={pause}
          >
            ⏸
          </button>
        </div>
      )}
      {phase === "paused" && (
        <PausePanel accent={meta.accent} onResume={() => go("play")} onRestart={restart}>
          <div className="mt-3">
            <SecondaryButton onClick={openLevels}>Level select</SecondaryButton>
          </div>
        </PausePanel>
      )}
      {phase === "result" && win && (
        <WinPanel info={win} accent={meta.accent} onNext={nextLevel} onReplay={restart} onLevels={openLevels} />
      )}
      {phase === "result" && !win && lose && (
        <GameOverPanel title="Out of critters!" accent={meta.accent} score={formatNumber(lose.score)} scoreLabel="Score so far" onRestart={restart}>
          <p className="mt-2 text-xs text-white/55">The grumblers are still giggling. Try a different angle on {lose.level}.</p>
          <div className="mt-3">
            <SecondaryButton onClick={openLevels}>Level select</SecondaryButton>
          </div>
        </GameOverPanel>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- HUD

function drawHud(ctx: CanvasRenderingContext2D, v: { w: number; h: number }, s: SiegeState, u: Ui, time: number, touch: boolean) {
  const level = s.level;
  const world = WORLDS[level.world];
  const pad = 14;
  // Score card.
  ctx.fillStyle = "rgba(10,14,24,0.5)";
  ctx.beginPath();
  ctx.roundRect?.(pad - 6, 8, 214, 78, 12);
  ctx.fill();
  text(ctx, `${world.short.toUpperCase()} ${u.levelIndex + 1} · ${level.name}`, pad + 2, 22, { align: "left", size: 11, color: "rgba(255,255,255,0.7)", weight: 800 });
  text(ctx, formatNumber(u.scoreShown), pad + 2, 46, { align: "left", size: 28, font: DISPLAY_FONT, color: "#fef08a", weight: 900, stroke: "rgba(0,0,0,0.45)", strokeWidth: 4 });
  // Star progress bar with the two-star and three-star marks.
  const [t2, t3] = starTargets(level);
  const max = t3 * 1.15;
  const bx = pad + 2;
  const by = 66;
  const bw = 190;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(bx, by, bw, 7);
  const potential = s.score + s.queue.length * LEFTOVER_BONUS;
  ctx.fillStyle = "rgba(253,224,71,0.3)";
  ctx.fillRect(bx, by, bw * clamp(potential / max, 0, 1), 7);
  ctx.fillStyle = "#facc15";
  ctx.fillRect(bx, by, bw * clamp(s.score / max, 0, 1), 7);
  const marks = [[t2, 2], [t3, 3]] as const;
  for (const [tv, n] of marks) {
    const mx = bx + bw * clamp(tv / max, 0, 1);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(mx - 0.5, by - 3, 1.5, 13);
    text(ctx, "★".repeat(n === 2 ? 2 : 3), mx, by - 8, { size: 8, color: s.score + (s.phase === "won" ? 0 : 0) >= tv ? "#fbbf24" : "rgba(255,255,255,0.55)", weight: 900 });
  }
  // Critters waiting, along the bottom.
  const n = s.queue.length;
  if (n > 0) {
    const size = clamp(v.h * 0.065, 26, 40);
    const gap = size * 1.15;
    const baseY = v.h - Math.max(26, Math.min(50, v.h * 0.07)) ;
    ctx.fillStyle = "rgba(10,14,24,0.5)";
    ctx.beginPath();
    ctx.roundRect?.(pad - 6, baseY - size * 0.78, n * gap + 12, size * 1.56, 12);
    ctx.fill();
    for (let i = 0; i < n; i++) {
      const bounce = i === 0 && s.phase === "aim" ? Math.sin(time * 5) * 2 : 0;
      ctx.globalAlpha = i === 0 && s.phase === "aim" ? 1 : 0.9;
      drawCritterIcon(ctx, s.queue[i], pad + size * 0.5 + i * gap, baseY + bounce, size * 0.9, time);
    }
    ctx.globalAlpha = 1;
    if (s.phase === "aim") text(ctx, CRITTERS[s.queue[0]].name, pad + size * 0.5, baseY - size * 0.95, { align: "left", size: 11, color: "#fff", weight: 800, stroke: "rgba(0,0,0,0.6)", strokeWidth: 3 });
  }
  // Prompts.
  const ab = abilityTarget(s);
  if (ab) {
    const pulse = 0.85 + 0.15 * Math.sin(time * 9);
    const label = `${touch ? "TAP" : "CLICK"}: ${CRITTERS[ab.ckind!].ability.replace(/^Tap (to )?/, "")}`;
    const w = Math.min(v.w - 24, 40 + label.length * 8.6);
    ctx.globalAlpha = Math.min(1, u.abilityHintT * 6);
    ctx.fillStyle = "rgba(10,14,24,0.65)";
    ctx.beginPath();
    ctx.roundRect?.(v.w / 2 - w / 2, 14, w, 34 * pulse, 17);
    ctx.fill();
    text(ctx, label.toUpperCase(), v.w / 2, 31, { size: 13, color: "#fde047", weight: 900 });
    ctx.globalAlpha = 1;
  }
  if (s.phase === "aim" && s.shots === 0 && !u.pulledOnce && u.banner > 2.6) {
    const a = 0.55 + 0.45 * Math.sin(time * 4);
    ctx.globalAlpha = a;
    text(ctx, touch ? "Drag back from the slingshot" : "Drag back from the slingshot and let go", v.w / 2, v.h * 0.3, {
      size: clamp(v.w / 28, 15, 22), color: "#fff", stroke: "rgba(0,40,70,0.7)", strokeWidth: 5, weight: 900,
    });
    ctx.globalAlpha = 1;
  }
  if (u.banner < 2.6) {
    const k = u.banner < 0.4 ? u.banner / 0.4 : u.banner > 2 ? Math.max(0, (2.6 - u.banner) / 0.6) : 1;
    ctx.globalAlpha = k;
    text(ctx, `Level ${u.levelIndex + 1}`, v.w / 2, v.h * 0.4 - 18, { size: clamp(v.w / 18, 20, 40), font: DISPLAY_FONT, color: "#fff", stroke: "rgba(0,40,70,0.75)", strokeWidth: 8, weight: 900 });
    text(ctx, level.name, v.w / 2, v.h * 0.4 + 18, { size: clamp(v.w / 28, 15, 26), color: "#fef08a", stroke: "rgba(0,40,70,0.75)", strokeWidth: 6, weight: 900 });
    if (level.hint && u.banner > 0.6) text(ctx, level.hint, v.w / 2, v.h * 0.4 + 48, { size: clamp(v.w / 46, 12, 16), color: "#fff", stroke: "rgba(0,40,70,0.7)", strokeWidth: 4, weight: 700 });
    ctx.globalAlpha = 1;
  }
}

