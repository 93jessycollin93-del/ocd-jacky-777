// Garden Defense: rules in logic.ts (with defs.ts and levels.ts); this file draws the garden on a canvas, plays
// the sounds and handles input: pick a seed (click, number key or drag) and plant it, collect falling sun, dig up
// plants with the shovel, plus the level select, pause and win / lose flow.
import { useCallback, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { DISPLAY_FONT, Floaters, Particles, Shake, circle, fillRoundRect, text } from "../../kit/draw";
import { useKeyPress } from "../../kit/input";
import { play, tone } from "../../kit/sfx";
import { randomSeed } from "../../kit/rng";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, Overlay, PausePanel, PrimaryButton, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import { COLS, GNOMES, LANES, PLANTS, type PlantId } from "./defs";
import { LEVELS } from "./levels";
import {
  bigWaveMarks, collectSun, isUnlocked, levelsCleared, markCleared, newGame, nextLevel, normalizeProgress, placePlant, plantCheck, removePlant,
  update, waveFraction, type GameEvent, type GameState, type Gnome, type Plant, type Progress,
} from "./logic";

type Phase = "ready" | "playing" | "paused" | "won" | "lost";

const TW = 80;
const TH = 86;
const LX = 92;
const LY = 104;
const W = LX + COLS * TW + 74;
const H = LY + LANES * TH + 12;
const CARD_W = 66;
const CARD_H = 84;
const BAR_X = 100;
const BAR_Y = 10;
const PROGRESS_KEY = "garden-defense:progress";

const px = (x: number) => LX + x * TW;
const py = (y: number) => LY + y * TH;
const THEMES = {
  day: { sky: "#7dd3fc", a: "#65a30d", b: "#4d7c0f", dirt: "#7c5a3a" },
  dusk: { sky: "#fb923c", a: "#4d7c0f", b: "#3f6212", dirt: "#6b4a2e" },
  night: { sky: "#1e1b4b", a: "#365314", b: "#2c4410", dirt: "#4a3420" },
};

// ---------------------------------------------------------------- art

function drawPlant(ctx: CanvasRenderingContext2D, kind: PlantId, x: number, y: number, time: number, p?: Plant) {
  const kick = p ? Math.max(0, 1 - p.kick * 6) : 0;
  const sway = Math.sin(time * 2 + x * 0.05) * 2;
  ctx.save();
  ctx.translate(x, y);
  if (p && p.hurt > 0) ctx.globalAlpha = 0.75 + 0.25 * Math.sin(time * 40);
  const stem = () => {
    ctx.strokeStyle = "#166534";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.quadraticCurveTo(sway, 10, sway * 0.6, -4);
    ctx.stroke();
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.ellipse(-12, 24, 12, 5, -0.4, 0, Math.PI * 2);
    ctx.ellipse(12, 24, 12, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
  };
  const pod = (cx: number, cy: number, body: string, dark: string) => {
    circle(ctx, cx, cy, 15, dark);
    circle(ctx, cx - 1, cy - 1, 14, body);
    fillRoundRect(ctx, cx + 9 + kick * 3, cy - 6, 12, 12, 4, dark);
    circle(ctx, cx + 21 + kick * 3, cy, 4, "#052e16");
    circle(ctx, cx + 3, cy - 5, 3, "#fff");
    circle(ctx, cx + 4, cy - 5, 1.6, "#000");
  };
  switch (kind) {
    case "pea":
      stem();
      pod(sway * 0.6, -14, "#4ade80", "#15803d");
      break;
    case "frost":
      stem();
      pod(sway * 0.6, -14, "#bae6fd", "#0284c7");
      circle(ctx, sway * 0.6 - 8, -24, 3, "#fff");
      break;
    case "twin":
      stem();
      pod(sway * 0.6 - 6, -22, "#4ade80", "#15803d");
      pod(sway * 0.6 + 2, -4, "#86efac", "#166534");
      break;
    case "sun": {
      stem();
      ctx.save();
      ctx.translate(sway * 0.6, -14);
      ctx.rotate(time * 0.6);
      ctx.fillStyle = "#facc15";
      for (let i = 0; i < 10; i++) {
        ctx.rotate((Math.PI * 2) / 10);
        ctx.beginPath();
        ctx.ellipse(0, -15, 5, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      circle(ctx, sway * 0.6, -14, 11, "#f59e0b");
      circle(ctx, sway * 0.6 - 4, -16, 1.8, "#422006");
      circle(ctx, sway * 0.6 + 4, -16, 1.8, "#422006");
      ctx.strokeStyle = "#422006";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sway * 0.6, -12, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();
      break;
    }
    case "nut": {
      const hp = p ? p.hp / p.maxHp : 1;
      ctx.fillStyle = "#92400e";
      ctx.beginPath();
      ctx.ellipse(0, 4, 24, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b45309";
      ctx.beginPath();
      ctx.ellipse(-3, 0, 20, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      circle(ctx, -8, -4, 3, "#fff");
      circle(ctx, 6, -4, 3, "#fff");
      circle(ctx, -7, -4, 1.5, "#000");
      circle(ctx, 7, -4, 1.5, "#000");
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 2;
      if (hp < 0.66) {
        ctx.beginPath();
        ctx.moveTo(-14, -18);
        ctx.lineTo(-6, -8);
        ctx.lineTo(-12, 2);
        ctx.stroke();
      }
      if (hp < 0.33) {
        ctx.beginPath();
        ctx.moveTo(14, 10);
        ctx.lineTo(4, 18);
        ctx.lineTo(10, 28);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 8, 5, 0.2, Math.PI - 0.2);
      ctx.stroke();
      break;
    }
    case "cherry": {
      const fuse = p ? 1 - Math.max(0, p.fuse) / 0.9 : 0;
      const grow = 1 + fuse * 0.35;
      ctx.strokeStyle = "#166534";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, -2);
      ctx.quadraticCurveTo(0, -30, 6, -26);
      ctx.moveTo(10, 0);
      ctx.quadraticCurveTo(4, -26, 6, -26);
      ctx.stroke();
      const red = fuse > 0.5 && Math.floor(time * 16) % 2 ? "#fca5a5" : "#dc2626";
      circle(ctx, -10, 8, 13 * grow, "#7f1d1d");
      circle(ctx, -11, 7, 12 * grow, red);
      circle(ctx, 11, 10, 13 * grow, "#7f1d1d");
      circle(ctx, 10, 9, 12 * grow, red);
      circle(ctx, -14, 3, 3, "rgba(255,255,255,0.6)");
      circle(ctx, 7, 5, 3, "rgba(255,255,255,0.6)");
      break;
    }
    case "mine": {
      const armed = !p || p.fuse <= 0;
      if (!armed) {
        ctx.fillStyle = "#7c5a3a";
        ctx.beginPath();
        ctx.ellipse(0, 26, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        circle(ctx, 0, 22, 4, "#a16207");
        break;
      }
      ctx.fillStyle = "#a16207";
      ctx.beginPath();
      ctx.ellipse(0, 16, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      circle(ctx, -6, 13, 2.5, "#1c1917");
      circle(ctx, 6, 13, 2.5, "#1c1917");
      ctx.strokeStyle = "#57534e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(0, -10);
      ctx.stroke();
      circle(ctx, 0, -12, 4, Math.floor(time * 3) % 2 ? "#ef4444" : "#7f1d1d");
      break;
    }
    case "lobber": {
      ctx.fillStyle = "#b45309";
      ctx.beginPath();
      ctx.moveTo(-18, 10);
      ctx.lineTo(18, 10);
      ctx.lineTo(13, 32);
      ctx.lineTo(-13, 32);
      ctx.fill();
      circle(ctx, sway * 0.4, -6 - kick * 6, 18, "#4d7c0f");
      circle(ctx, sway * 0.4, -6 - kick * 6, 14, "#84cc16");
      ctx.strokeStyle = "#3f6212";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sway * 0.4, -6 - kick * 6, 8, 0, Math.PI * 2);
      ctx.stroke();
      circle(ctx, -5, -8 - kick * 6, 2, "#000");
      circle(ctx, 5, -8 - kick * 6, 2, "#000");
      break;
    }
  }
  ctx.restore();
}

function drawGnome(ctx: CanvasRenderingContext2D, g: Gnome, time: number) {
  const x = px(g.x);
  const ground = py(g.lane + 0.86);
  const walking = g.state === "walk";
  const bob = walking ? Math.abs(Math.sin(time * 6 + g.phase)) * 3 : 0;
  const munch = g.state === "eat" ? Math.sin(time * 14) * 2 : 0;
  ctx.save();
  let lift = 0;
  if (g.state === "vault") {
    const k = 1 - Math.max(0, g.vaultT);
    lift = Math.sin(Math.min(1, k) * Math.PI) * 40;
  }
  ctx.translate(x, ground - bob - lift);
  if (g.state === "die") {
    const k = Math.min(1, 1 - g.dieT / 1.2);
    ctx.globalAlpha = 1 - Math.max(0, k - 0.5) * 2;
    ctx.rotate(k * 1.3);
  }
  ctx.scale(-1, 1);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 2 + bob + lift, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const tint = g.slow > 0 ? "#93c5fd" : "#2563eb";
  const step = walking ? Math.sin(time * 6 + g.phase) * 4 : 0;
  fillRoundRect(ctx, -9 + step, -10, 7, 10, 2, "#1e293b");
  fillRoundRect(ctx, 3 - step, -10, 7, 10, 2, "#1e293b");
  ctx.fillStyle = g.flash > 0 ? "#fff" : tint;
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.lineTo(14, -8);
  ctx.lineTo(10, -34);
  ctx.lineTo(-10, -34);
  ctx.closePath();
  ctx.fill();
  circle(ctx, 0, -40 + munch * 0.3, 10, g.flash > 0 ? "#fff" : "#fcd9b6");
  circle(ctx, 3, -42, 1.6, "#000");
  circle(ctx, 7, -38, 3, "#f87171");
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.moveTo(-9, -37);
  ctx.quadraticCurveTo(0, -12 + munch, 10, -37);
  ctx.closePath();
  ctx.fill();
  const def = GNOMES[g.kind];
  if (g.armor > 0 && g.kind === "cone") {
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(-11, -46);
    ctx.lineTo(11, -46);
    ctx.lineTo(0, -76);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-6, -60, 12, 4);
  } else if (g.armor > 0 && g.kind === "bucket") {
    fillRoundRect(ctx, -13, -64, 26, 20, 3, "#94a3b8");
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(-13, -64, 26, 4);
  } else if (g.hat) {
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.moveTo(-11, -46);
    ctx.lineTo(11, -46);
    ctx.lineTo(-2, -78);
    ctx.fill();
  }
  if (g.kind === "flag") {
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, -20);
    ctx.lineTo(-14, -78);
    ctx.stroke();
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.moveTo(-14, -78);
    ctx.lineTo(-38, -70 + Math.sin(time * 8) * 3);
    ctx.lineTo(-14, -62);
    ctx.fill();
  }
  if (g.kind === "vaulter" && !g.vaulted) {
    ctx.strokeStyle = "#a16207";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-20, -30);
    ctx.lineTo(26, -44);
    ctx.stroke();
  }
  if (g.shield > 0) {
    // The garden gate he hides behind, on the house side.
    const worn = def.shield && g.shield < def.shield * 0.5;
    for (let k = 0; k < 4; k++) fillRoundRect(ctx, 14 + k * 5, -44, 4, 40, 1, worn ? "#a8a29e" : "#f5f5f4");
    ctx.fillStyle = "#e7e5e4";
    ctx.fillRect(14, -36, 20, 3);
    ctx.fillRect(14, -16, 20, 3);
  }
  ctx.restore();
  const total = g.hp + g.armor + g.shield;
  const max = g.maxHp + def.armor + def.shield;
  if (g.state !== "die" && total < max) {
    const k = Math.max(0, total / max);
    fillRoundRect(ctx, x - 16, ground - 92 - bob - lift, 32, 4, 2, "rgba(0,0,0,0.5)");
    fillRoundRect(ctx, x - 16, ground - 92 - bob - lift, 32 * k, 4, 2, k > 0.5 ? "#4ade80" : k > 0.25 ? "#facc15" : "#ef4444");
  }
}

// ---------------------------------------------------------------- component

export default function GardenDefense({ touch, best, submitScore }: GameProps) {
  const game = useRef<GameState>(newGame(0, 1));
  const fx = useRef({ particles: new Particles(700), shake: new Shake(), floaters: new Floaters(), banner: "", bannerT: 0, sunFlash: 0, biteT: 0 });
  const sel = useRef<PlantId | "shovel" | null>(null);
  const drag = useRef(false);
  const hover = useRef<{ lane: number; col: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [progress, setProgress] = useState<Progress>(() => normalizeProgress(loadState(PROGRESS_KEY)));
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const [levelPick, setLevelPick] = useState(() => nextLevel(normalizeProgress(loadState(PROGRESS_KEY))));

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const startLevel = useCallback((i: number) => {
    game.current = newGame(i, randomSeed());
    sel.current = null;
    const f = fx.current;
    f.particles.clear();
    f.banner = `Level ${i + 1}: ${LEVELS[i].name}`;
    f.bannerT = 2.6;
    setLevelPick(i);
    play("select");
    go("playing");
  }, [go]);


  const tryPlant = (lane: number, col: number) => {
    const s = game.current;
    const choice = sel.current;
    if (!choice) return;
    if (choice === "shovel") {
      if (removePlant(s, lane, col)) {
        play("drop");
        sel.current = null;
      }
      return;
    }
    const check = plantCheck(s, choice, lane, col);
    if (check === "ok") {
      placePlant(s, choice, lane, col);
      play("place");
      fx.current.particles.burst(px(col + 0.5), py(lane + 0.8), 10, { color: ["#7c5a3a", "#a16207"], speed: 80, size: 3, gravity: 300 });
      sel.current = null;
    } else {
      if (check === "sun") fx.current.sunFlash = 1;
      play("error");
    }
  };

  const handleEvents = (events: GameEvent[]) => {
    const f = fx.current;
    for (const e of events) {
      const x = px(e.x);
      const y = py(e.lane + 0.5);
      switch (e.type) {
        case "pea":
        case "frost-pea":
          tone(e.type === "pea" ? 420 : 520, 0.05, "triangle", 0.025, { slide: 300 });
          break;
        case "lob":
          tone(300, 0.12, "sine", 0.03, { slide: 500 });
          break;
        case "hit":
        case "splat":
          f.particles.burst(x, y - 10, 5, { color: e.kind === "frost" ? ["#bae6fd", "#fff"] : ["#86efac", "#22c55e"], speed: 90, size: 2.5, gravity: 200 });
          break;
        case "shield-hit":
          tone(900, 0.04, "square", 0.02);
          break;
        case "hat":
        case "shield-break":
          play("hit");
          f.particles.burst(x, y - 40, 10, { color: ["#f97316", "#94a3b8", "#e7e5e4"], speed: 140, size: 4, gravity: 400 });
          break;
        case "blast":
        case "mine-boom":
          play("explode");
          f.shake.add(0.6);
          f.particles.burst(x, y, 50, { color: ["#fde047", "#f97316", "#dc2626", "#57534e"], speed: 260, size: 5, gravity: 120 });
          break;
        case "mine-armed":
          tone(880, 0.08, "square", 0.03);
          break;
        case "gnome-die":
          f.particles.burst(x, y - 20, 12, { color: ["#2563eb", "#dc2626", "#f8fafc"], speed: 120, size: 3, gravity: 300 });
          break;
        case "plant-die":
          play("pop", 0.7);
          f.particles.burst(x, y, 14, { color: ["#22c55e", "#15803d"], speed: 120, size: 3, gravity: 300 });
          break;
        case "bite":
          if (game.current.time - f.biteT > 0.35) {
            f.biteT = game.current.time;
            tone(140, 0.05, "square", 0.02);
          }
          break;
        case "sun-make":
          tone(1200, 0.08, "sine", 0.03, { slide: 1600 });
          break;
        case "mower":
          play("swoosh");
          tone(110, 0.6, "sawtooth", 0.04, { slide: 160 });
          break;
        case "bigwave":
          f.banner = e.flag ? "The final wave!" : "A huge wave of gnomes is coming!";
          f.bannerT = 3;
          play("levelup");
          break;
        case "vault":
          play("jump");
          break;
        case "win": {
          play("win");
          const next = markCleared(progressRef.current, game.current.levelIndex);
          saveState(PROGRESS_KEY, next);
          setProgress(next);
          submitScore(levelsCleared(next));
          window.setTimeout(() => go("won"), 1200);
          break;
        }
        case "lose":
          play("lose");
          f.shake.add(0.8);
          window.setTimeout(() => go("lost"), 1400);
          break;
        default:
          break;
      }
    }
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) {
      go(p === "playing" ? "paused" : "playing");
      return;
    }
    if (p !== "playing") return;
    const n = code.startsWith("Digit") ? Number(code.slice(5)) - 1 : -1;
    const plants = game.current.level.plants;
    if (n >= 0 && n < plants.length) sel.current = sel.current === plants[n] ? null : plants[n];
    if (code === "KeyX") sel.current = sel.current === "shovel" ? null : "shovel";
  });

  const seedAt = (x: number, y: number): PlantId | "shovel" | null => {
    if (y < BAR_Y || y > BAR_Y + CARD_H) return null;
    const plants = game.current.level.plants;
    const k = Math.floor((x - BAR_X) / (CARD_W + 6));
    if (k >= 0 && k < plants.length && x - BAR_X - k * (CARD_W + 6) <= CARD_W) return plants[k];
    const shovelX = BAR_X + plants.length * (CARD_W + 6) + 8;
    if (x >= shovelX && x <= shovelX + 58) return "shovel";
    return null;
  };
  const cellAt = (x: number, y: number) => {
    const col = Math.floor((x - LX) / TW);
    const lane = Math.floor((y - LY) / TH);
    if (col < 0 || col >= COLS || lane < 0 || lane >= LANES) return null;
    return { lane, col };
  };

  const onPointer = (p: { type: string; x: number; y: number }) => {
    if (phaseRef.current !== "playing") return;
    const s = game.current;
    if (p.type === "move") {
      hover.current = cellAt(p.x, p.y);
      return;
    }
    if (p.type === "down") {
      // Sun first: it floats above everything.
      for (const u of s.suns) {
        if ((px(u.x) - p.x) ** 2 + (py(u.y) - p.y) ** 2 < 34 ** 2) {
          const v = collectSun(s, u.uid);
          play("coin", 1.2);
          fx.current.floaters.add(px(u.x), py(u.y) - 10, `+${v}`, "#fde047", 16);
          return;
        }
      }
      const seed = seedAt(p.x, p.y);
      if (seed) {
        sel.current = sel.current === seed ? null : seed;
        drag.current = sel.current !== null;
        play("click");
        return;
      }
      const cell = cellAt(p.x, p.y);
      if (cell) tryPlant(cell.lane, cell.col);
      return;
    }
    if (p.type === "up" && drag.current) {
      drag.current = false;
      const cell = cellAt(p.x, p.y);
      if (cell) tryPlant(cell.lane, cell.col);
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, _view: View, dt: number, time: number) => {
    const s = game.current;
    const f = fx.current;
    if (phaseRef.current === "playing") handleEvents(update(s, Math.min(dt, 0.05)));
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);
    f.bannerT = Math.max(0, f.bannerT - dt);
    f.sunFlash = Math.max(0, f.sunFlash - dt * 2.5);
    const th = THEMES[s.level.theme];

    const [sx, sy] = f.shake.offset(8);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = th.sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#78350f";
    ctx.fillRect(0, LY - 8, LX - 22, H);
    ctx.fillStyle = "#a16207";
    for (let y = LY; y < H; y += 22) ctx.fillRect(4, y, LX - 30, 3);
    for (let lane = 0; lane < LANES; lane++) {
      const live = s.level.lanes.includes(lane);
      for (let col = 0; col < COLS; col++) {
        ctx.fillStyle = live ? ((lane + col) % 2 ? th.a : th.b) : th.dirt;
        ctx.fillRect(px(col), py(lane), TW, TH);
      }
    }
    ctx.fillStyle = th.dirt;
    ctx.fillRect(px(COLS), LY, W - px(COLS), LANES * TH);
    const hv = hover.current;
    if (!touch && hv && sel.current) {
      const ok = sel.current === "shovel" ? !!s.grid[hv.lane * COLS + hv.col] : plantCheck(s, sel.current, hv.lane, hv.col) === "ok";
      ctx.fillStyle = ok ? "rgba(255,255,255,0.22)" : "rgba(239,68,68,0.25)";
      ctx.fillRect(px(hv.col), py(hv.lane), TW, TH);
      if (ok && sel.current !== "shovel") {
        ctx.globalAlpha = 0.5;
        drawPlant(ctx, sel.current, px(hv.col + 0.5), py(hv.lane + 0.55), time);
        ctx.globalAlpha = 1;
      }
    }
    for (const m of s.mowers) {
      if (m.state === "gone") continue;
      const mx = px(m.x);
      const my = py(m.lane + 0.7);
      fillRoundRect(ctx, mx - 18, my - 12, 30, 16, 4, "#dc2626");
      ctx.strokeStyle = "#1f2937";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx - 16, my - 10);
      ctx.lineTo(mx - 28, my - 30);
      ctx.stroke();
      circle(ctx, mx - 10, my + 6, 5, "#111827");
      circle(ctx, mx + 8, my + 6, 5, "#111827");
    }
    for (const p of s.plants) drawPlant(ctx, p.kind, px(p.col + 0.5), py(p.lane + 0.55), time, p);
    const gs = s.gnomes.slice().sort((a, b) => a.lane - b.lane || b.x - a.x);
    for (const gn of gs) drawGnome(ctx, gn, time);
    for (const pr of s.projs) {
      if (pr.kind === "lob") {
        const k = Math.min(1, pr.t / pr.dur);
        const x = px(pr.x0 + (pr.x1 - pr.x0) * k);
        const y = py(pr.lane + 0.45) - Math.sin(k * Math.PI) * 70;
        circle(ctx, x, y, 8, "#65a30d");
        circle(ctx, x - 2, y - 2, 4, "#a3e635");
      } else {
        circle(ctx, px(pr.x), py(pr.lane + 0.38), 7, pr.kind === "frost" ? "#0284c7" : "#15803d");
        circle(ctx, px(pr.x) - 1, py(pr.lane + 0.38) - 1, 5.5, pr.kind === "frost" ? "#bae6fd" : "#86efac");
      }
    }
    for (const u of s.suns) {
      const x = px(u.x);
      const y = py(u.y);
      const fade = u.life < 2 && Math.floor(time * 8) % 2 ? 0.45 : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(x, y);
      ctx.rotate(time * 1.4);
      ctx.fillStyle = "rgba(253,224,71,0.55)";
      for (let i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-3, -28, 6, 12);
      }
      ctx.restore();
      circle(ctx, x, y, 17, `rgba(250,204,21,${fade})`);
      circle(ctx, x - 4, y - 4, 6, `rgba(254,249,195,${fade})`);
    }
    f.particles.draw(ctx);
    f.floaters.draw(ctx);
    ctx.restore();

    // Seed bar.
    fillRoundRect(ctx, 6, 6, 88, CARD_H + 8, 10, "#422006");
    circle(ctx, 50, 36, 16, "#facc15");
    text(ctx, `${s.sun}`, 50, 76, { size: 20, font: DISPLAY_FONT, weight: 900, color: f.sunFlash > 0 && Math.floor(time * 12) % 2 ? "#ef4444" : "#fef9c3" });
    s.level.plants.forEach((id, k) => {
      const x = BAR_X + k * (CARD_W + 6);
      const def = PLANTS[id];
      const ready = s.cool[id] <= 0;
      const afford = s.sun >= def.cost;
      const chosen = sel.current === id;
      const lift = chosen ? -4 : 0;
      fillRoundRect(ctx, x, BAR_Y + lift, CARD_W, CARD_H, 8, chosen ? "#fef3c7" : "#fde68a");
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, BAR_Y + lift, CARD_W, CARD_H);
      ctx.clip();
      ctx.translate(x + CARD_W / 2, BAR_Y + 36 + lift);
      ctx.scale(0.62, 0.62);
      drawPlant(ctx, id, 0, 0, time);
      ctx.restore();
      text(ctx, `${def.cost}`, x + CARD_W / 2, BAR_Y + CARD_H - 10 + lift, { size: 14, weight: 900, color: "#422006" });
      if (!touch) text(ctx, `${k + 1}`, x + 8, BAR_Y + 10, { size: 10, weight: 800, color: "rgba(66,32,6,0.6)" });
      if (!ready || !afford) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(x, BAR_Y, CARD_W, CARD_H);
        if (!ready) {
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(x, BAR_Y, CARD_W, CARD_H * (s.cool[id] / def.cooldown));
        }
      }
    });
    const shovelX = BAR_X + s.level.plants.length * (CARD_W + 6) + 8;
    fillRoundRect(ctx, shovelX, BAR_Y, 58, CARD_H, 8, sel.current === "shovel" ? "#e7e5e4" : "#a8a29e");
    text(ctx, "⛏", shovelX + 29, BAR_Y + 34, { size: 28 });
    text(ctx, "Dig", shovelX + 29, BAR_Y + 70, { size: 12, weight: 800, color: "#292524" });
    // Level progress: the gnome head walks from right to left as the waves arrive.
    const mx = W - 190;
    text(ctx, s.level.name, mx + 90, 24, { size: 13, weight: 800, color: "#fff", stroke: "rgba(0,0,0,0.5)", strokeWidth: 3 });
    fillRoundRect(ctx, mx, 40, 180, 12, 6, "rgba(0,0,0,0.45)");
    fillRoundRect(ctx, mx + 180 * (1 - waveFraction(s)), 40, 180 * waveFraction(s), 12, 6, "#84cc16");
    for (const mark of bigWaveMarks(s.level, s.schedule)) text(ctx, "⚑", mx + 180 * (1 - mark), 46, { size: 14, color: "#ef4444" });
    if (f.bannerT > 0) {
      const a = Math.min(1, f.bannerT * 2);
      text(ctx, f.banner, W / 2, H * 0.5, { size: 30, font: DISPLAY_FONT, weight: 900, color: `rgba(254,243,199,${a})`, stroke: `rgba(66,32,6,${a})`, strokeWidth: 6 });
    }
    if (drag.current && sel.current && sel.current !== "shovel" && hover.current) {
      ctx.globalAlpha = 0.7;
      drawPlant(ctx, sel.current, px(hover.current.col + 0.5), py(hover.current.lane + 0.55), time);
      ctx.globalAlpha = 1;
    }
  };

  const cleared = levelsCleared(progress);
  const pickUnlocked = isUnlocked(progress, levelPick);
  const lvl = LEVELS[game.current.levelIndex];

  return (
    <div className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas width={W} height={H} draw={draw} background="#14532d" onPointer={onPointer} />
      {touch && phase === "playing" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] font-semibold text-white/70 [@media(orientation:landscape)]:hidden">
          ↻ Turn your phone sideways for a bigger garden
        </div>
      )}
      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={() => startLevel(pickUnlocked ? levelPick : nextLevel(progress))}
          accent={meta.accent}
          best={cleared ? `${cleared} / ${LEVELS.length}` : undefined}
          bestLabel="Levels cleared"
          extra={
            <div className="mt-3">
              <div className="mb-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">Level</div>
              <div className="grid grid-cols-5 gap-1.5">
                {LEVELS.map((l, i) => {
                  const open = isUnlocked(progress, i);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      disabled={!open}
                      onClick={() => setLevelPick(i)}
                      title={l.name}
                      className={`rounded-md border py-1.5 text-sm font-bold ${levelPick === i ? "border-lime-400 bg-lime-400/25" : "border-white/15 bg-white/5"} ${open ? "" : "opacity-35"}`}
                    >
                      {progress.done[i] ? "✓" : open ? i + 1 : "🔒"}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-left text-xs text-white/60">{LEVELS[levelPick].name}: {LEVELS[levelPick].blurb}</p>
            </div>
          }
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={() => startLevel(game.current.levelIndex)} />}
      {phase === "won" && (
        <Overlay>
          <div className="text-5xl">🌻</div>
          <h2 className="mt-1 text-2xl font-black" style={{ color: meta.accent }}>{lvl.name} saved!</h2>
          <p className="mt-1 text-sm text-white/65">{game.current.killed} gnomes stopped · {cleared} of {LEVELS.length} levels cleared</p>
          <div className="mt-4 space-y-2">
            {game.current.levelIndex + 1 < LEVELS.length
              ? <PrimaryButton onClick={() => startLevel(game.current.levelIndex + 1)} accent={meta.accent} autoFocus>Next level</PrimaryButton>
              : <p className="text-sm font-bold text-amber-200">You cleared every level. The garden is safe!</p>}
            <SecondaryButton onClick={() => go("ready")}>Level select</SecondaryButton>
          </div>
        </Overlay>
      )}
      {phase === "lost" && (
        <GameOverPanel title="The gnomes got in!" accent={meta.accent} score={`${cleared} / ${LEVELS.length}`} scoreLabel="Levels cleared" best={best || undefined} onRestart={() => startLevel(game.current.levelIndex)}>
          <p className="mt-2 text-xs text-white/55">Try more sunblooms early, and a walnut wall in front of your pods.</p>
        </GameOverPanel>
      )}
      {touch && phase === "playing" && (
        <button
          type="button"
          aria-label="Pause"
          className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white"
          onClick={() => go("paused")}
        >
          ⏸
        </button>
      )}
    </div>
  );
}
