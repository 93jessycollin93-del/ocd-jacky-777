// Balloon Pop TD: rules in logic.ts. This file draws the map, balloons, towers and the side panel (shop,
// upgrades, start button) on one canvas, and turns clicks, taps, drags and keys into actions.
import { useCallback, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { Floaters, Particles, Shake, circle, fillRoundRect, text, FONT } from "../../kit/draw";
import { useKeyPress } from "../../kit/input";
import { noise, play, tone } from "../../kit/sfx";
import { mulberry32 } from "../../kit/rng";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, Overlay, PausePanel, PrimaryButton, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import {
  BALLOONS, DIFFICULTY, MAPS, MAP_H, MAP_W, ROAD, TARGETING, TOWERS, WIN_ROUND, along, canPlace, newGame, nextUpgrade, pathLocked, place, price, sell,
  sellValue, startRound, stats, step, towerDef, upgrade,
  type BalloonKind, type Difficulty, type TDEvent, type TDState, type Tower, type TowerId,
} from "./logic";

const W = 960;
const H = MAP_H;
const PX = MAP_W; // side panel x
const PW = W - MAP_W;
const CARD_W = 92;
const CARD_H = 76;
const cardPos = (i: number) => ({ x: PX + 6 + (i % 2) * (CARD_W + 4), y: 86 + Math.floor(i / 2) * (CARD_H + 5) });
const START_BTN = { x: PX + 8, y: H - 74, w: PW - 16, h: 64 };
const AUTO_BTN = { x: PX + 8, y: H - 110, w: PW - 16, h: 30 };
const UP_BTN = (p: 0 | 1) => ({ x: PX + 8, y: 166 + p * 108, w: PW - 16, h: 100 });
const SELL_BTN = { x: PX + 8, y: 388, w: PW - 16, h: 34 };
const TARGET_BTN = { x: PX + 8, y: 126, w: PW - 16, h: 32 };
const CLOSE_BTN = { x: PX + PW - 34, y: 84, w: 28, h: 28 };
const inBox = (b: { x: number; y: number; w: number; h: number }, x: number, y: number) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

type Phase = "ready" | "playing" | "paused" | "won" | "over";
const MEDALS_KEY = "balloon-defense:medals";

/** Balloon sprites are painted once per kind into small canvases (2x for sharpness). */
const spriteCache = new Map<BalloonKind, HTMLCanvasElement>();
function balloonSprite(kind: BalloonKind): HTMLCanvasElement {
  let c = spriteCache.get(kind);
  if (c) return c;
  const def = BALLOONS[kind];
  const r = def.r;
  const size = Math.ceil(r * 2.6);
  c = document.createElement("canvas");
  c.width = size * 2;
  c.height = size * 2;
  const g = c.getContext("2d")!;
  g.scale(2, 2);
  g.translate(size / 2, size / 2 - r * 0.12);
  // String and knot.
  g.strokeStyle = "rgba(255,255,255,0.5)";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, r * 1.05);
  g.quadraticCurveTo(r * 0.3, r * 1.25, 0, r * 1.25);
  g.stroke();
  g.fillStyle = def.color;
  g.beginPath();
  g.moveTo(-r * 0.18, r * 1.08);
  g.lineTo(r * 0.18, r * 1.08);
  g.lineTo(0, r * 0.9);
  g.fill();
  // Body: an egg shape.
  g.beginPath();
  g.ellipse(0, 0, r * 0.88, r, 0, 0, Math.PI * 2);
  g.fillStyle = def.color;
  g.fill();
  g.lineWidth = 1.2;
  g.strokeStyle = kind === "white" || kind === "zebra" ? "#64748b" : "rgba(0,0,0,0.35)";
  g.stroke();
  if (kind === "zebra") {
    g.save();
    g.clip();
    g.fillStyle = "#111827";
    for (let i = -3; i <= 3; i++) g.fillRect(-r, i * r * 0.32 - r * 0.08, r * 2, r * 0.14);
    g.restore();
  }
  if (kind === "lead") {
    g.strokeStyle = "#475569";
    g.lineWidth = 1.5;
    g.beginPath();
    g.ellipse(0, 0, r * 0.6, r * 0.72, 0, 0, Math.PI * 2);
    g.stroke();
  }
  if (kind === "ceramic") {
    g.strokeStyle = "#78350f";
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(0, 0, r * 0.88, r * 0.35, 0, 0, Math.PI * 2);
    g.stroke();
  }
  // Shine.
  g.fillStyle = "rgba(255,255,255,0.55)";
  g.beginPath();
  g.ellipse(-r * 0.35, -r * 0.4, r * 0.18, r * 0.3, -0.5, 0, Math.PI * 2);
  g.fill();
  spriteCache.set(kind, c);
  return c;
}

/** The map (grass, decorations, road) is painted once per map. */
const mapCache = new Map<number, HTMLCanvasElement>();
function mapLayer(m: number): HTMLCanvasElement {
  let c = mapCache.get(m);
  if (c) return c;
  const map = MAPS[m];
  c = document.createElement("canvas");
  c.width = MAP_W * 2;
  c.height = MAP_H * 2;
  const g = c.getContext("2d")!;
  g.scale(2, 2);
  g.fillStyle = map.grass;
  g.fillRect(0, 0, MAP_W, MAP_H);
  const rng = mulberry32(m * 977 + 13);
  const tmp = newGame(m);
  for (let i = 0; i < 260; i++) {
    const x = rng() * MAP_W;
    const y = rng() * MAP_H;
    g.fillStyle = `rgba(255,255,255,${0.03 + rng() * 0.05})`;
    g.fillRect(x, y, 2 + rng() * 3, 2 + rng() * 3);
  }
  // A few trees and rocks away from the road (purely decorative; you can still build on them).
  for (let i = 0; i < 26; i++) {
    const x = 20 + rng() * (MAP_W - 40);
    const y = 20 + rng() * (MAP_H - 40);
    if (!canPlace(tmp, x, y)) continue;
    if (rng() < 0.6) {
      circle(g, x + 2, y + 3, 10, "rgba(0,0,0,0.18)");
      circle(g, x, y, 10, "rgba(21,128,61,0.75)");
      circle(g, x - 3, y - 3, 5, "rgba(134,239,172,0.35)");
    } else {
      circle(g, x, y, 5, "rgba(120,113,108,0.7)");
      circle(g, x - 1.5, y - 1.5, 2, "rgba(255,255,255,0.25)");
    }
  }
  const path = () => {
    g.beginPath();
    map.path.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  };
  g.lineJoin = "round";
  g.lineCap = "round";
  path();
  g.strokeStyle = "rgba(0,0,0,0.25)";
  g.lineWidth = ROAD * 2 + 8;
  g.stroke();
  path();
  g.strokeStyle = map.road;
  g.lineWidth = ROAD * 2;
  g.stroke();
  path();
  g.strokeStyle = "rgba(255,255,255,0.18)";
  g.setLineDash([10, 14]);
  g.lineWidth = 2;
  g.stroke();
  g.setLineDash([]);
  // Portal at the end if the road stops inside the map.
  const [ex, ey] = map.path[map.path.length - 1];
  if (ex > 0 && ex < MAP_W && ey > 0 && ey < MAP_H) {
    circle(g, ex, ey, 26, "#1e1b4b");
    circle(g, ex, ey, 20, "#6d28d9");
    circle(g, ex, ey, 11, "#c4b5fd");
  }
  mapCache.set(m, c);
  return c;
}

function wrap(ctx: CanvasRenderingContext2D, s: string, maxW: number, size: number): string[] {
  ctx.font = `600 ${size}px ${FONT}`;
  const out: string[] = [];
  let line = "";
  for (const w of s.split(" ")) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) {
      out.push(line);
      line = w;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

interface Fx {
  particles: Particles; floaters: Floaters; shake: Shake;
  rings: { x: number; y: number; r: number; t: number; color: string }[];
  lines: { x1: number; y1: number; x2: number; y2: number; t: number }[];
  banner: string; bannerT: number; popT: number; flashLives: number;
}

export default function BalloonDefense({ touch, best, submitScore }: GameProps) {
  const game = useRef<TDState>(newGame(0));
  const fx = useRef<Fx>({ particles: new Particles(600), floaters: new Floaters(), shake: new Shake(), rings: [], lines: [], banner: "", bannerT: 0, popT: 0, flashLives: 0 });
  const ui = useRef<{ placing: TowerId | null; ghost: { x: number; y: number } | null; sel: number | null; speed: number; acc: number; dragging: boolean }>({
    placing: null, ghost: null, sel: null, speed: 1, acc: 0, dragging: false,
  });
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [mapPick, setMapPick] = useState(0);
  const [diff, setDiff] = useState<Difficulty>("normal");
  const [medals, setMedals] = useState<Record<string, boolean>>(() => loadState<Record<string, boolean>>(MEDALS_KEY) ?? {});
  const [result, setResult] = useState({ rounds: 0, isBest: false, pops: 0 });

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const start = (m = mapPick, d = diff) => {
    game.current = newGame(m, d);
    const f = fx.current;
    f.particles.clear();
    f.rings = [];
    f.lines = [];
    f.banner = `${MAPS[m].name} · ${DIFFICULTY[d].name}`;
    f.bannerT = 2;
    Object.assign(ui.current, { placing: null, ghost: null, sel: null, speed: 1, acc: 0, dragging: false });
    play("select");
    go("playing");
  };

  const roundsCleared = (s: TDState) => s.round - (s.active ? 1 : 0);

  const selected = (): Tower | undefined => game.current.towers.find((t) => t.uid === ui.current.sel);

  const pressStart = () => {
    const s = game.current;
    const u = ui.current;
    if (!s.active) {
      if (startRound(s)) {
        play("click");
        fx.current.banner = `Round ${s.round}`;
        fx.current.bannerT = 1.2;
      }
    } else {
      u.speed = u.speed === 1 ? 2 : u.speed === 2 ? 3 : 1;
      play("tick");
    }
  };

  const pickTower = (id: TowerId) => {
    const s = game.current;
    const u = ui.current;
    if (u.placing === id) {
      u.placing = null;
      return;
    }
    if (s.cash < price(s, towerDef(id).cost)) {
      play("error");
      return;
    }
    u.placing = id;
    u.sel = null;
    play("click");
  };

  const tryPlace = (x: number, y: number) => {
    const s = game.current;
    const u = ui.current;
    if (!u.placing) return false;
    const t = place(s, u.placing, x, y);
    if (!t) {
      play("error");
      return false;
    }
    play("place");
    fx.current.particles.burst(x, y, 12, { color: ["#fde68a", "#fff"], speed: 90, size: 3, life: 0.4, gravity: 0 });
    // Keep the shop open after building; click the tower to upgrade it.
    u.placing = null;
    u.ghost = null;
    return true;
  };

  const doUpgrade = (path: 0 | 1) => {
    const s = game.current;
    const t = selected();
    if (!t) return;
    if (upgrade(s, t, path)) {
      play("powerup");
      fx.current.particles.burst(t.x, t.y, 18, { color: ["#fde047", "#fff"], speed: 120, size: 3, life: 0.5, gravity: 0 });
    } else play("error");
  };

  const doSell = () => {
    const s = game.current;
    const t = selected();
    if (!t) return;
    sell(s, t);
    fx.current.floaters.add(t.x, t.y - 16, `+$${sellValue(t)}`, "#fde047", 14);
    ui.current.sel = null;
    play("coin");
  };

  const cycleTarget = () => {
    const t = selected();
    if (!t) return;
    t.target = TARGETING[(TARGETING.indexOf(t.target) + 1) % TARGETING.length];
    play("tick");
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    const u = ui.current;
    if (code === "KeyP" && (p === "playing" || p === "paused")) return go(p === "playing" ? "paused" : "playing");
    if (code === "Escape") {
      if (p === "playing" && (u.placing || u.sel !== null)) {
        u.placing = null;
        u.sel = null;
      } else if (p === "playing" || p === "paused") go(p === "playing" ? "paused" : "playing");
      return;
    }
    if (p !== "playing") return;
    if (/^Digit[1-7]$/.test(code)) pickTower(TOWERS[Number(code.slice(5)) - 1].id);
    else if (code === "Space") pressStart();
    else if (code === "KeyZ") doUpgrade(0);
    else if (code === "KeyX") doUpgrade(1);
    else if (code === "KeyT") cycleTarget();
    else if (code === "Delete" || code === "Backspace") doSell();
  });

  const onPointer = (p: { type: string; x: number; y: number }) => {
    if (phaseRef.current !== "playing") return;
    const s = game.current;
    const u = ui.current;
    const onMap = p.x < MAP_W;
    if (p.type === "move") {
      u.ghost = onMap ? { x: p.x, y: p.y } : null;
      return;
    }
    if (p.type === "up") {
      if (u.dragging && u.placing && onMap) tryPlace(p.x, p.y);
      u.dragging = false;
      return;
    }
    if (p.type !== "down") return;
    if (onMap) {
      if (u.placing) {
        u.ghost = { x: p.x, y: p.y };
        tryPlace(p.x, p.y);
        return;
      }
      let hit: Tower | undefined;
      for (const t of s.towers) if (Math.hypot(t.x - p.x, t.y - p.y) < 20) hit = t;
      u.sel = hit ? hit.uid : null;
      if (hit) play("click");
      return;
    }
    // Side panel.
    if (inBox(START_BTN, p.x, p.y)) return pressStart();
    if (inBox(AUTO_BTN, p.x, p.y)) {
      s.auto = !s.auto;
      play("tick");
      return;
    }
    const t = selected();
    if (t) {
      if (inBox(CLOSE_BTN, p.x, p.y)) u.sel = null;
      else if (inBox(TARGET_BTN, p.x, p.y)) cycleTarget();
      else if (inBox(UP_BTN(0), p.x, p.y)) doUpgrade(0);
      else if (inBox(UP_BTN(1), p.x, p.y)) doUpgrade(1);
      else if (inBox(SELL_BTN, p.x, p.y)) doSell();
      return;
    }
    TOWERS.forEach((d, i) => {
      const c = cardPos(i);
      if (inBox({ ...c, w: CARD_W, h: CARD_H }, p.x, p.y)) {
        pickTower(d.id);
        u.dragging = ui.current.placing === d.id;
      }
    });
  };

  const finish = (won: boolean) => {
    const s = game.current;
    const rounds = roundsCleared(s);
    const isBest = submitScore(rounds);
    setResult({ rounds, isBest, pops: s.pops });
    if (won) {
      const next = { ...medals, [`${MAPS[s.map].id}:${s.diff}`]: true };
      setMedals(next);
      saveState(MEDALS_KEY, next);
    }
  };

  const handle = (events: TDEvent[]) => {
    const f = fx.current;
    const s = game.current;
    for (const e of events) {
      if (e.type === "pop") {
        f.particles.burst(e.x, e.y, e.kind === "blimp" ? 50 : e.kind === "ceramic" ? 10 : 5, { color: [BALLOONS[e.kind].color, "#fff"], speed: e.kind === "blimp" ? 220 : 110, size: e.kind === "blimp" ? 4 : 2.5, life: 0.3, gravity: 0 });
        if (s.time - f.popT > 0.045) {
          f.popT = s.time;
          const fq = 500 + Math.random() * 500;
          tone(fq, 0.04, "triangle", 0.035, { slide: fq * 0.4 });
        }
        if (e.kind === "blimp") {
          f.shake.add(0.6);
          play("explode");
        }
      } else if (e.type === "leak") {
        f.flashLives = 0.6;
        tone(140, 0.12, "sawtooth", 0.06);
      } else if (e.type === "blast") {
        f.rings.push({ x: e.x, y: e.y, r: e.r, t: 0.35, color: "251,146,60" });
        noise(0.12, 0.06, { type: "lowpass", freq: 900 });
      } else if (e.type === "freeze") {
        f.rings.push({ x: e.x, y: e.y, r: e.r, t: 0.45, color: "165,243,252" });
        tone(1800, 0.08, "sine", 0.025, { slide: 900 });
      } else if (e.type === "shot") {
        f.lines.push({ ...e, t: 0.12 });
        noise(0.05, 0.04, { type: "highpass", freq: 2000 });
      } else if (e.type === "clink") {
        f.particles.burst(e.x, e.y, 3, { color: ["#e2e8f0"], speed: 80, size: 2, life: 0.2, gravity: 0 });
      } else if (e.type === "roundEnd") {
        f.floaters.add(MAP_W / 2, MAP_H / 2, `Round ${e.round} cleared · +$${e.bonus}`, "#fde047", 20);
        play("coin");
        ui.current.speed = s.auto ? ui.current.speed : 1;
      } else if (e.type === "win") {
        play("win");
        finish(true);
        go("won");
      } else if (e.type === "lose") {
        play("lose");
        finish(false);
        window.setTimeout(() => go("over"), 900);
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, _view: View, dt: number, time: number) => {
    const s = game.current;
    const f = fx.current;
    const u = ui.current;
    if (phaseRef.current === "playing") {
      u.acc = Math.min(u.acc + dt * u.speed, 0.25);
      let n = 0;
      while (u.acc >= 1 / 60 && n++ < 12 && phaseRef.current === "playing") {
        u.acc -= 1 / 60;
        handle(step(s, 1 / 60));
      }
    }
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);
    f.bannerT = Math.max(0, f.bannerT - dt);
    f.flashLives = Math.max(0, f.flashLives - dt);
    for (const r of f.rings) r.t -= dt;
    f.rings = f.rings.filter((r) => r.t > 0);
    for (const l of f.lines) l.t -= dt;
    f.lines = f.lines.filter((l) => l.t > 0);

    const [sx, sy] = f.shake.offset(6);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.drawImage(mapLayer(s.map), 0, 0, MAP_W, MAP_H);
    const sel = selected();
    // Range of the selected tower or the one being placed.
    if (sel && towerDef(sel.id).attack !== "farm" && sel.id !== "sniper") {
      circle(ctx, sel.x, sel.y, stats(sel).range, "rgba(255,255,255,0.14)");
    }
    // Towers.
    for (const t of s.towers) {
      const def = towerDef(t.id);
      circle(ctx, t.x + 2, t.y + 3, 17, "rgba(0,0,0,0.3)");
      circle(ctx, t.x, t.y, 17, t.uid === u.sel ? "#fef3c7" : "#334155");
      circle(ctx, t.x, t.y, 14, t.id === "farm" ? "#365314" : t.id === "frost" ? "#0e7490" : t.id === "wizard" ? "#4c1d95" : "#1e293b");
      if (def.attack !== "farm" && def.attack !== "freeze" && def.attack !== "ring") {
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x + Math.cos(t.angle) * 18, t.y + Math.sin(t.angle) * 18);
        ctx.stroke();
      }
      text(ctx, def.icon, t.x, t.y + 1, { size: 17 });
      for (let p = 0; p < 2; p++) {
        for (let i = 0; i < t.tiers[p]; i++) circle(ctx, t.x - 9 + i * 5 + p * 12, t.y + 20, 2, p ? "#38bdf8" : "#fb923c");
      }
    }
    // Balloons, last ones first so the leaders are on top.
    for (let i = 0; i < s.balloons.length; i++) {
      const b = s.balloons[i];
      const def = BALLOONS[b.kind];
      if (b.kind === "blimp") {
        const [, , a] = along(s.track, b.d);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(a);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.ellipse(4, 6, 42, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1d4ed8";
        ctx.beginPath();
        ctx.moveTo(-34, 0);
        ctx.lineTo(-48, -16);
        ctx.lineTo(-48, 16);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, 0, 42, 22, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#2563eb";
        ctx.fill();
        ctx.strokeStyle = "#1e3a8a";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.ellipse(-6, -9, 22, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        const k = b.hp / (def.hp * (s.round > WIN_ROUND ? 1 + (s.round - WIN_ROUND) * 0.08 : 1));
        fillRoundRect(ctx, b.x - 26, b.y - 34, 52, 5, 2, "rgba(0,0,0,0.5)");
        fillRoundRect(ctx, b.x - 26, b.y - 34, 52 * Math.max(0, k), 5, 2, "#f87171");
        continue;
      }
      const img = balloonSprite(b.kind);
      const sz = img.width / 2;
      const bob = Math.sin(time * 4 + b.id) * 1.2;
      ctx.drawImage(img, b.x - sz / 2, b.y - sz / 2 + bob, sz, sz);
      if (b.kind === "ceramic" && b.hp < def.hp) {
        ctx.strokeStyle = "rgba(41,22,4,0.8)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const cracks = Math.ceil((1 - b.hp / def.hp) * 4);
        for (let c = 0; c < cracks; c++) {
          const a = c * 1.7 + b.id;
          ctx.moveTo(b.x, b.y + bob);
          ctx.lineTo(b.x + Math.cos(a) * def.r * 0.8, b.y + bob + Math.sin(a) * def.r * 0.8);
        }
        ctx.stroke();
      }
      if (b.frozen > 0) circle(ctx, b.x, b.y + bob, def.r + 3, "rgba(186,230,253,0.55)");
    }
    // Projectiles.
    for (const p of s.projs) {
      const a = Math.atan2(p.vy, p.vx);
      if (p.kind === "bomb") {
        circle(ctx, p.x, p.y, 6, "#111827");
        circle(ctx, p.x - 2, p.y - 2, 2, "#6b7280");
      } else if (p.kind === "bolt") {
        circle(ctx, p.x, p.y, 7, p.splash ? "rgba(249,115,22,0.45)" : "rgba(168,85,247,0.4)");
        circle(ctx, p.x, p.y, 3.5, p.splash ? "#fed7aa" : "#e9d5ff");
      } else {
        ctx.strokeStyle = p.kind === "tack" ? (p.type === "fire" ? "#fb923c" : "#e5e7eb") : "#f8fafc";
        ctx.lineWidth = p.kind === "tack" ? 2.5 : 2;
        ctx.beginPath();
        const len = p.kind === "tack" ? 6 : 10;
        ctx.moveTo(p.x - Math.cos(a) * len, p.y - Math.sin(a) * len);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }
    for (const r of f.rings) {
      const k = r.t / 0.4;
      ctx.strokeStyle = `rgba(${r.color},${Math.min(1, k)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * (1.1 - k * 0.4), 0, Math.PI * 2);
      ctx.stroke();
      circle(ctx, r.x, r.y, r.r * (1.1 - k * 0.4), `rgba(${r.color},${k * 0.25})`);
    }
    for (const l of f.lines) {
      ctx.strokeStyle = `rgba(254,240,138,${l.t / 0.12})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    }
    f.particles.draw(ctx);
    f.floaters.draw(ctx);
    // Placement ghost.
    if (u.placing && u.ghost) {
      const ok = canPlace(s, u.ghost.x, u.ghost.y) && s.cash >= price(s, towerDef(u.placing).cost);
      const st = stats({ id: u.placing, tiers: [0, 0] });
      if (u.placing !== "farm" && u.placing !== "sniper") circle(ctx, u.ghost.x, u.ghost.y, st.range, ok ? "rgba(255,255,255,0.16)" : "rgba(239,68,68,0.2)");
      circle(ctx, u.ghost.x, u.ghost.y, 17, ok ? "rgba(255,255,255,0.5)" : "rgba(239,68,68,0.6)");
      text(ctx, towerDef(u.placing).icon, u.ghost.x, u.ghost.y + 1, { size: 17 });
    }
    if (f.bannerT > 0) {
      const a = Math.min(1, f.bannerT * 2);
      text(ctx, f.banner, MAP_W / 2, MAP_H * 0.3, { size: 30, weight: 900, color: `rgba(255,255,255,${a})`, stroke: `rgba(0,0,0,${a * 0.6})`, strokeWidth: 6 });
    }
    if (!s.active && s.round === 0 && phaseRef.current === "playing") {
      text(ctx, touch ? "Build a tower, then tap ▶ to start" : "Build a tower, then press Space to start", MAP_W / 2, MAP_H - 24, { size: 16, weight: 800, color: "#fff", stroke: "rgba(0,0,0,0.6)", strokeWidth: 5 });
    }
    ctx.restore();

    // ---------------- side panel
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(PX, 0, PW, H);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(PX, 0, 1, H);
    text(ctx, `❤️ ${s.lives}`, PX + 12, 20, { align: "left", size: 17, weight: 900, color: f.flashLives > 0 ? "#f87171" : "#fff" });
    text(ctx, `💰 ${s.cash}`, PX + 12, 46, { align: "left", size: 17, weight: 900, color: "#fde047" });
    text(ctx, `Round ${Math.max(1, s.round)}${s.round <= WIN_ROUND ? ` / ${WIN_ROUND}` : ""}`, PX + PW - 10, 20, { align: "right", size: 13, weight: 800, color: "#cbd5e1" });
    text(ctx, DIFFICULTY[s.diff].name, PX + PW - 10, 46, { align: "right", size: 11, weight: 700, color: "#64748b" });
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(PX + 8, 66, PW - 16, 1);

    if (sel) {
      const def = towerDef(sel.id);
      text(ctx, `${def.icon} ${def.name}`, PX + 10, 98, { align: "left", size: 15, weight: 900 });
      fillRoundRect(ctx, CLOSE_BTN.x, CLOSE_BTN.y, CLOSE_BTN.w, CLOSE_BTN.h, 8, "rgba(255,255,255,0.08)");
      text(ctx, "✕", CLOSE_BTN.x + 14, CLOSE_BTN.y + 14, { size: 13, color: "#cbd5e1" });
      text(ctx, `${sel.pops} pops`, PX + 10, 116, { align: "left", size: 11, weight: 700, color: "#94a3b8" });
      if (def.attack !== "farm" && def.attack !== "freeze") {
        fillRoundRect(ctx, TARGET_BTN.x, TARGET_BTN.y, TARGET_BTN.w, TARGET_BTN.h, 8, "rgba(255,255,255,0.08)");
        text(ctx, `Target: ${sel.target}${touch ? "" : "  (T)"}`, TARGET_BTN.x + TARGET_BTN.w / 2, TARGET_BTN.y + 16, { size: 13, weight: 800, color: "#e2e8f0" });
      } else {
        text(ctx, def.attack === "farm" ? `Earns $${stats(sel).income} a round` : "Freezes everything nearby", PX + PW / 2, TARGET_BTN.y + 16, { size: 12, weight: 700, color: "#94a3b8" });
      }
      for (const p of [0, 1] as const) {
        const b = UP_BTN(p);
        const up = nextUpgrade(sel, p);
        const cost = up ? price(s, up.cost) : 0;
        const can = !!up && s.cash >= cost;
        fillRoundRect(ctx, b.x, b.y, b.w, b.h, 10, can ? (p ? "rgba(56,189,248,0.22)" : "rgba(251,146,60,0.22)") : "rgba(255,255,255,0.05)");
        for (let i = 0; i < 3; i++) circle(ctx, b.x + 14 + i * 12, b.y + 14, 4, i < sel.tiers[p] ? (p ? "#38bdf8" : "#fb923c") : "rgba(255,255,255,0.15)");
        text(ctx, touch ? "" : p ? "X" : "Z", b.x + b.w - 12, b.y + 14, { size: 11, weight: 800, color: "#64748b" });
        if (!up) {
          text(ctx, sel.tiers[p] >= 3 ? "Path maxed" : pathLocked(sel, p) ? "Path closed" : "", b.x + b.w / 2, b.y + 50, { size: 13, weight: 800, color: "#64748b" });
          if (pathLocked(sel, p)) text(ctx, "Only one path can reach tier 3", b.x + b.w / 2, b.y + 70, { size: 10, weight: 600, color: "#64748b" });
          continue;
        }
        text(ctx, up.name, b.x + 10, b.y + 34, { align: "left", size: 14, weight: 900, color: can ? "#fff" : "#94a3b8" });
        wrap(ctx, up.blurb, b.w - 20, 11).slice(0, 2).forEach((l, i) => text(ctx, l, b.x + 10, b.y + 54 + i * 14, { align: "left", size: 11, weight: 600, color: "#94a3b8" }));
        text(ctx, `$${cost}`, b.x + b.w - 10, b.y + b.h - 14, { align: "right", size: 14, weight: 900, color: can ? "#fde047" : "#f87171" });
      }
      fillRoundRect(ctx, SELL_BTN.x, SELL_BTN.y, SELL_BTN.w, SELL_BTN.h, 8, "rgba(239,68,68,0.2)");
      text(ctx, `Sell for $${sellValue(sel)}`, SELL_BTN.x + SELL_BTN.w / 2, SELL_BTN.y + 17, { size: 13, weight: 800, color: "#fecaca" });
    } else {
      TOWERS.forEach((d, i) => {
        const c = cardPos(i);
        const cost = price(s, d.cost);
        const can = s.cash >= cost;
        const on = u.placing === d.id;
        fillRoundRect(ctx, c.x, c.y, CARD_W, CARD_H, 10, on ? "rgba(253,224,71,0.3)" : "rgba(255,255,255,0.07)");
        if (on) {
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(c.x + 1, c.y + 1, CARD_W - 2, CARD_H - 2, 10);
          ctx.stroke();
        }
        ctx.globalAlpha = can ? 1 : 0.4;
        text(ctx, d.icon, c.x + CARD_W / 2, c.y + 24, { size: 26 });
        text(ctx, d.name, c.x + CARD_W / 2, c.y + 50, { size: 11, weight: 800 });
        text(ctx, `$${cost}`, c.x + CARD_W / 2, c.y + 65, { size: 12, weight: 900, color: "#fde047" });
        ctx.globalAlpha = 1;
        if (!touch) text(ctx, `${i + 1}`, c.x + 9, c.y + 10, { size: 9, weight: 800, color: "#64748b" });
      });
      const hov = u.placing ? towerDef(u.placing) : null;
      if (hov) wrap(ctx, hov.blurb, PW - 20, 11).slice(0, 3).forEach((l, i) => text(ctx, l, PX + 10, 418 + i * 14, { align: "left", size: 11, weight: 600, color: "#cbd5e1" }));
    }
    // Auto-start and start / speed button.
    fillRoundRect(ctx, AUTO_BTN.x, AUTO_BTN.y, AUTO_BTN.w, AUTO_BTN.h, 8, s.auto ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.06)");
    text(ctx, `Auto-start: ${s.auto ? "on" : "off"}`, AUTO_BTN.x + AUTO_BTN.w / 2, AUTO_BTN.y + 15, { size: 12, weight: 800, color: s.auto ? "#86efac" : "#94a3b8" });
    const sb = START_BTN;
    fillRoundRect(ctx, sb.x, sb.y, sb.w, sb.h, 12, s.active ? "#1e293b" : "#16a34a");
    if (!s.active) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 5);
      ctx.strokeStyle = `rgba(134,239,172,${0.4 + pulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(sb.x + 1, sb.y + 1, sb.w - 2, sb.h - 2, 12);
      ctx.stroke();
    }
    text(ctx, s.active ? (u.speed === 1 ? "▶  1×" : u.speed === 2 ? "⏩  2×" : "⏩  3×") : `▶  Round ${s.round + 1}`, sb.x + sb.w / 2, sb.y + (s.active ? 24 : 32), { size: 20, weight: 900 });
    if (s.active) text(ctx, "tap to change speed", sb.x + sb.w / 2, sb.y + 46, { size: 10, weight: 700, color: "#94a3b8" });
  };

  const s = game.current;

  return (
    <div className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas width={W} height={H} draw={draw} background="#0f172a" onPointer={onPointer} />
      {touch && phase === "playing" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] font-semibold text-white/70 [@media(orientation:landscape)]:hidden">
          ↻ Turn your phone sideways for a bigger map
        </div>
      )}
      {touch && phase === "playing" && (
        <button type="button" aria-label="Pause" className="absolute left-2 top-2 z-10 h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white" onClick={() => go("paused")}>
          ⏸
        </button>
      )}
      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={() => start()}
          accent={meta.accent}
          best={best || undefined}
          bestLabel="Most rounds"
          extra={
            <div className="mt-3 text-left">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">Map</div>
              <div className="grid grid-cols-3 gap-1.5">
                {MAPS.map((m, i) => (
                  <button key={m.id} type="button" onClick={() => setMapPick(i)}
                    className={`rounded-md border px-1 py-1.5 text-sm font-bold ${mapPick === i ? "border-red-400 bg-red-400/25" : "border-white/15 bg-white/5"}`}>
                    {m.name}
                    <span className="ml-1 text-xs">{(["easy", "normal", "hard"] as Difficulty[]).map((d) => (medals[`${m.id}:${d}`] ? ({ easy: "🥉", normal: "🥈", hard: "🥇" } as const)[d] : "")).join("")}</span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-white/60">{MAPS[mapPick].blurb}</p>
              <div className="mb-1.5 mt-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">Difficulty</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
                  <button key={d} type="button" onClick={() => setDiff(d)}
                    className={`rounded-md border py-1.5 text-sm font-bold ${diff === d ? "border-red-400 bg-red-400/25" : "border-white/15 bg-white/5"}`}>
                    {DIFFICULTY[d].name}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-white/60">{DIFFICULTY[diff].lives} lives{diff === "easy" ? " · towers cost less" : diff === "hard" ? " · towers cost more" : ""}</p>
            </div>
          }
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={() => start(s.map, s.diff)} />}
      {phase === "won" && (
        <Overlay>
          <div className="text-5xl">🏆</div>
          <h2 className="mt-1 text-2xl font-black" style={{ color: meta.accent }}>All {WIN_ROUND} rounds popped!</h2>
          <p className="mt-1 text-sm text-white/65">{MAPS[s.map].name} · {DIFFICULTY[s.diff].name} · {s.lives} lives left · {s.pops.toLocaleString()} pops</p>
          <div className="mt-4 space-y-2">
            <PrimaryButton accent={meta.accent} autoFocus onClick={() => go("playing")}>Keep going (freeplay)</PrimaryButton>
            <SecondaryButton onClick={() => go("ready")}>Choose another map</SecondaryButton>
          </div>
        </Overlay>
      )}
      {phase === "over" && (
        <GameOverPanel title="The balloons got through!" accent={meta.accent} score={result.rounds} scoreLabel="Rounds survived" best={best || undefined} isBest={result.isBest}
          onRestart={() => start(s.map, s.diff)}>
          <p className="mt-2 text-xs text-white/55">{result.pops.toLocaleString()} balloons popped. Tip: bombs and sniper shots pop lead; frost can&apos;t touch white.</p>
        </GameOverPanel>
      )}
    </div>
  );
}
