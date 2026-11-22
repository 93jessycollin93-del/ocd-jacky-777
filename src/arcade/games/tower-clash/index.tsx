// Tower Clash: rules in logic.ts. This file draws the arena, troops and card bar on one portrait canvas,
// and turns taps, drags and keys into deployments. The deck builder and trophy road live on the start screen.
import { useCallback, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { Floaters, Particles, Shake, circle, fillRoundRect, text } from "../../kit/draw";
import { useKeyPress } from "../../kit/input";
import { noise, play as sfx, tone } from "../../kit/sfx";
import { randomSeed } from "../../kit/rng";
import { loadState, saveState } from "../../kit/storage";
import { formatTime } from "../../kit/format";
import { Overlay, PausePanel, PrimaryButton, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import {
  AI, BRIDGES, CARDS, CARD_IDS, COLS, DECK_SIZE, DEFAULT_DECK, MANA_MAX, RIVER_BOT, RIVER_TOP, ROWS, arenaFor, canDeploy, manaBoost, newMatch, play, step,
  timeLeft, trophyChange,
  type CardId, type ClashEvent, type ClashState, type Difficulty, type Side,
} from "./logic";

const T = 20;
const W = COLS * T;
const AH = ROWS * T;
const H = AH + 124;
const BLUE = "#3b82f6";
const RED = "#ef4444";
const CARD = { x: (i: number) => 66 + i * 73, y: AH + 8, w: 68, h: 86 };
const NEXT = { x: 6, y: AH + 22, w: 52, h: 66 };
const DECK_KEY = "tower-clash:deck";
const TROPHY_KEY = "tower-clash:trophies";
type Phase = "ready" | "playing" | "paused" | "over";

interface Fx {
  particles: Particles; floaters: Floaters; shake: Shake;
  shots: { x1: number; y1: number; x2: number; y2: number; t: number; side: Side }[];
  rings: { x: number; y: number; r: number; t: number; color: string }[];
  banner: string; bannerT: number; boosted: boolean; hitT: number;
}

const px = (v: number) => v * T;

export default function TowerClash({ touch, submitScore }: GameProps) {
  const game = useRef<ClashState>(newMatch(1));
  const fx = useRef<Fx>({ particles: new Particles(500), floaters: new Floaters(), shake: new Shake(), shots: [], rings: [], banner: "", bannerT: 0, boosted: false, hitT: 0 });
  const ui = useRef<{ sel: number | null; ghost: { x: number; y: number } | null; drag: boolean; acc: number }>({ sel: null, ghost: null, drag: false, acc: 0 });
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [diff, setDiff] = useState<Difficulty>("normal");
  const [deck, setDeck] = useState<CardId[]>(() => {
    const d = loadState<CardId[]>(DECK_KEY);
    return d && d.length === DECK_SIZE && d.every((c) => CARD_IDS.includes(c)) ? d : DEFAULT_DECK;
  });
  const [trophies, setTrophies] = useState(() => loadState<number>(TROPHY_KEY) ?? 0);
  const [result, setResult] = useState({ winner: -1 as Side | -1, stars: [0, 0] as [number, number], delta: 0 });

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const start = () => {
    if (deck.length !== DECK_SIZE) return sfx("error");
    game.current = newMatch(randomSeed(), deck, diff);
    const f = fx.current;
    f.particles.clear();
    f.shots = [];
    f.rings = [];
    f.boosted = false;
    f.banner = "Fight!";
    f.bannerT = 1.5;
    Object.assign(ui.current, { sel: null, ghost: null, drag: false, acc: 0 });
    sfx("select");
    go("playing");
  };

  const toggleCard = (c: CardId) => {
    setDeck((d) => {
      const next = d.includes(c) ? d.filter((x) => x !== c) : d.length < DECK_SIZE ? [...d, c] : d;
      if (next.length === DECK_SIZE) saveState(DECK_KEY, next);
      return next;
    });
  };

  const deployAt = (x: number, y: number) => {
    const s = game.current;
    const u = ui.current;
    if (u.sel === null) return false;
    const ev: ClashEvent[] = [];
    if (!play(s, 0, u.sel, x / T, y / T, ev)) {
      sfx("error");
      return false;
    }
    handle(ev);
    u.sel = null;
    u.ghost = null;
    return true;
  };

  const select = (i: number) => {
    const s = game.current;
    const u = ui.current;
    if (u.sel === i) {
      u.sel = null;
      return;
    }
    u.sel = i;
    sfx(s.mana[0] >= CARDS[s.hands[0][i]].cost ? "click" : "tick");
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if (code === "KeyP" && (p === "playing" || p === "paused")) return go(p === "playing" ? "paused" : "playing");
    if (code === "Escape") {
      if (p === "playing" && ui.current.sel !== null) ui.current.sel = null;
      else if (p === "playing" || p === "paused") go(p === "playing" ? "paused" : "playing");
      return;
    }
    if (p === "playing" && /^Digit[1-4]$/.test(code)) select(Number(code.slice(5)) - 1);
  });

  const onPointer = (p: { type: string; x: number; y: number }) => {
    if (phaseRef.current !== "playing") return;
    const u = ui.current;
    const inArena = p.y < AH;
    if (p.type === "move") {
      u.ghost = inArena ? { x: p.x, y: p.y } : null;
      return;
    }
    if (p.type === "up") {
      if (u.drag && inArena && u.sel !== null) deployAt(p.x, p.y);
      u.drag = false;
      return;
    }
    if (p.type !== "down") return;
    if (inArena) {
      u.ghost = { x: p.x, y: p.y };
      if (u.sel !== null) deployAt(p.x, p.y);
      return;
    }
    for (let i = 0; i < 4; i++) {
      if (p.x >= CARD.x(i) && p.x <= CARD.x(i) + CARD.w && p.y >= CARD.y && p.y <= CARD.y + CARD.h) {
        const was = u.sel;
        select(i);
        u.drag = was !== i;
      }
    }
  };

  const finish = () => {
    const s = game.current;
    const delta = trophyChange(s.winner, s.stars);
    const next = Math.max(0, trophies + delta);
    setTrophies(next);
    saveState(TROPHY_KEY, next);
    submitScore(next);
    setResult({ winner: s.winner, stars: [s.stars[0], s.stars[1]], delta: next - trophies });
    sfx(s.winner === 0 ? "win" : s.winner === 1 ? "lose" : "select");
    window.setTimeout(() => go("over"), 1400);
  };

  const handle = (events: ClashEvent[]) => {
    const f = fx.current;
    const s = game.current;
    for (const e of events) {
      if (e.type === "deploy") {
        const def = CARDS[e.card];
        if (def.kind !== "spell") {
          f.rings.push({ x: px(e.x), y: px(e.y), r: 22, t: 0.5, color: e.side ? "239,68,68" : "59,130,246" });
          sfx("place", e.side ? 0.8 : 1);
        } else if (e.side === 1) f.floaters.add(px(e.x), px(e.y) - 20, def.icon, "#fff", 22);
      } else if (e.type === "hit") {
        if (e.ranged) f.shots.push({ x1: px(e.x1), y1: px(e.y1), x2: px(e.x2), y2: px(e.y2), t: 0.18, side: e.side });
        else f.particles.burst(px(e.x2), px(e.y2), 3, { color: ["#fff", "#e5e7eb"], speed: 60, size: 2, life: 0.18, gravity: 0 });
        if (s.time - f.hitT > 0.06) {
          f.hitT = s.time;
          tone(e.ranged ? 900 : 220, 0.035, e.ranged ? "triangle" : "square", 0.02);
        }
      } else if (e.type === "splash") {
        f.rings.push({ x: px(e.x), y: px(e.y), r: px(e.r), t: 0.3, color: "251,146,60" });
      } else if (e.type === "spell") {
        if (e.card === "firebolt") {
          f.particles.burst(px(e.x), px(e.y), 40, { color: ["#f97316", "#fde047", "#dc2626"], speed: 160, size: 3.5, life: 0.5, gravity: 0 });
          f.rings.push({ x: px(e.x), y: px(e.y), r: px(e.r), t: 0.4, color: "249,115,22" });
          f.shake.add(0.4);
          sfx("explode");
        } else {
          for (let i = 0; i < 14; i++) {
            const a = Math.random() * Math.PI * 2;
            const d = Math.random() * px(e.r);
            f.shots.push({ x1: px(e.x) + Math.cos(a) * d - 8, y1: px(e.y) + Math.sin(a) * d - 30, x2: px(e.x) + Math.cos(a) * d, y2: px(e.y) + Math.sin(a) * d, t: 0.18, side: 0 });
          }
          noise(0.15, 0.05, { type: "highpass", freq: 3000 });
        }
      } else if (e.type === "death") {
        f.particles.burst(px(e.x), px(e.y), e.building ? 26 : 8, { color: e.side ? ["#fca5a5", "#7f1d1d"] : ["#93c5fd", "#1e3a8a"], speed: 90, size: 3, life: 0.4, gravity: 0 });
      } else if (e.type === "tower") {
        f.shake.add(0.8);
        sfx("explode");
        f.banner = e.side === 1 ? (e.keep ? "Keep destroyed!" : "Tower down! ⭐") : e.keep ? "Your keep fell!" : "You lost a tower";
        f.bannerT = 2;
      } else if (e.type === "overtime") {
        f.banner = "Overtime! Next tower wins";
        f.bannerT = 2.5;
        sfx("levelup");
      } else if (e.type === "end") finish();
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, _view: View, dt: number, time: number) => {
    const s = game.current;
    const f = fx.current;
    const u = ui.current;
    if (phaseRef.current === "playing") {
      u.acc = Math.min(u.acc + dt, 0.2);
      while (u.acc >= 1 / 60) {
        u.acc -= 1 / 60;
        handle(step(s, 1 / 60));
      }
      if (!f.boosted && manaBoost(s) === 2) {
        f.boosted = true;
        if (!s.overtime) {
          f.banner = "Double mana!";
          f.bannerT = 2;
          sfx("powerup");
        }
      }
    }
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);
    f.bannerT = Math.max(0, f.bannerT - dt);
    for (const r of f.rings) r.t -= dt;
    f.rings = f.rings.filter((r) => r.t > 0);
    for (const sh of f.shots) sh.t -= dt;
    f.shots = f.shots.filter((sh) => sh.t > 0);

    const [sx, sy] = f.shake.offset(5);
    ctx.save();
    ctx.translate(sx, sy);
    // Arena: checkered grass, the river and two bridges.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = (r + c) % 2 ? (r >= RIVER_BOT ? "#4d9a3f" : "#4a933c") : r >= RIVER_BOT ? "#55a646" : "#519f43";
        ctx.fillRect(c * T, r * T, T, T);
      }
    }
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(0, px(RIVER_TOP), W, px(RIVER_BOT - RIVER_TOP));
    ctx.strokeStyle = "rgba(191,219,254,0.5)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const x = ((time * 18 + i * 64) % (W + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(x, px(RIVER_TOP) + 12 + (i % 2) * 14);
      ctx.quadraticCurveTo(x + 8, px(RIVER_TOP) + 8 + (i % 2) * 14, x + 16, px(RIVER_TOP) + 12 + (i % 2) * 14);
      ctx.stroke();
    }
    for (const b of BRIDGES) {
      fillRoundRect(ctx, px(b - 1.1), px(RIVER_TOP) - 4, px(2.2), px(RIVER_BOT - RIVER_TOP) + 8, 4, "#92400e");
      ctx.fillStyle = "#b45309";
      for (let i = 0; i < 5; i++) ctx.fillRect(px(b - 1), px(RIVER_TOP) - 2 + i * 9, px(2), 6);
    }
    // Placement zones while a card is picked.
    const selCard = u.sel !== null ? s.hands[0][u.sel] : null;
    if (selCard && CARDS[selCard].kind !== "spell") {
      ctx.fillStyle = "rgba(220,38,38,0.22)";
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!canDeploy(s, 0, selCard, c + 0.5, r + 0.5)) ctx.fillRect(c * T, r * T, T, T);
    }
    // Pending spells.
    for (const sp of s.spells) {
      const def = CARDS[sp.card];
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = sp.side ? "rgba(248,113,113,0.9)" : "rgba(147,197,253,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px(sp.x), px(sp.y), px(def.radius!), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Ground first, then flyers on top; towers are drawn with the ground layer.
    const units = s.units.slice().sort((a, b) => Number(a.flying) - Number(b.flying) || a.y - b.y);
    for (const un of units) {
      const x = px(un.x);
      const y = px(un.y);
      const col = un.side ? RED : BLUE;
      if (un.card === "turret" || un.card === "keep") {
        const keep = un.card === "keep";
        const r = px(un.r);
        fillRoundRect(ctx, x - r, y - r, r * 2, r * 2, 6, "#57534e");
        fillRoundRect(ctx, x - r + 3, y - r + 3, r * 2 - 6, r * 2 - 6, 5, "#a8a29e");
        fillRoundRect(ctx, x - r * 0.65, y - r * 0.65, r * 1.3, r * 1.3, 5, col);
        text(ctx, keep ? "👑" : "🏹", x, y, { size: keep ? 20 : 15, color: un.active ? "#fff" : "rgba(255,255,255,0.5)" });
        if (keep && !un.active) text(ctx, "z", x + r - 4, y - r + 4, { size: 11, weight: 900, color: "#e5e7eb" });
        const k = Math.max(0, un.hp) / un.maxHp;
        fillRoundRect(ctx, x - r, y + (un.side ? r + 3 : -r - 10), r * 2, 7, 3, "rgba(0,0,0,0.55)");
        fillRoundRect(ctx, x - r, y + (un.side ? r + 3 : -r - 10), r * 2 * k, 7, 3, col);
        text(ctx, `${Math.ceil(un.hp)}`, x, y + (un.side ? r + 17 : -r - 18), { size: 9, weight: 800, color: "#fff", stroke: "rgba(0,0,0,0.6)", strokeWidth: 3 });
        continue;
      }
      const def = CARDS[un.card];
      const r = Math.max(7, px(un.r));
      const lift = un.flying ? 10 : 0;
      ctx.globalAlpha = un.deploy > 0 ? 0.55 : 1;
      if (un.flying) circle(ctx, x, y + 4, r * 0.8, "rgba(0,0,0,0.25)");
      if (un.building) fillRoundRect(ctx, x - r, y - r - lift, r * 2, r * 2, 5, col);
      else circle(ctx, x, y - lift, r, col);
      circle(ctx, x, y - lift, r - 2, un.side ? "#7f1d1d" : "#1e3a8a");
      ctx.save();
      ctx.translate(x, y - lift);
      if (un.face > 0 && !un.building) ctx.scale(-1, 1);
      text(ctx, def.icon, 0, 1, { size: r * 1.45 });
      ctx.restore();
      ctx.globalAlpha = 1;
      if (un.deploy > 0) {
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y - lift, r + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - un.deploy));
        ctx.stroke();
      }
      if (un.hp < un.maxHp) {
        const k = Math.max(0, un.hp) / un.maxHp;
        fillRoundRect(ctx, x - r, y - lift - r - 6, r * 2, 3.5, 1.5, "rgba(0,0,0,0.6)");
        fillRoundRect(ctx, x - r, y - lift - r - 6, r * 2 * k, 3.5, 1.5, un.side ? "#fca5a5" : "#93c5fd");
      }
    }
    for (const sh of f.shots) {
      const k = 1 - sh.t / 0.18;
      const x = sh.x1 + (sh.x2 - sh.x1) * k;
      const y = sh.y1 + (sh.y2 - sh.y1) * k;
      circle(ctx, x, y, 2.5, sh.side ? "#fecaca" : "#dbeafe");
    }
    for (const r of f.rings) {
      const k = r.t / 0.5;
      ctx.strokeStyle = `rgba(${r.color},${Math.min(1, k * 1.6)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * (1.15 - k * 0.3), 0, Math.PI * 2);
      ctx.stroke();
    }
    f.particles.draw(ctx);
    f.floaters.draw(ctx);
    // Ghost of the picked card.
    if (selCard && u.ghost) {
      const def = CARDS[selCard];
      const ok = canDeploy(s, 0, selCard, u.ghost.x / T, u.ghost.y / T);
      if (def.kind === "spell") {
        circle(ctx, u.ghost.x, u.ghost.y, px(def.radius!), "rgba(255,255,255,0.18)");
      } else if (def.range && def.range > 2) {
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.arc(u.ghost.x, u.ghost.y, px(def.range), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.75;
      circle(ctx, u.ghost.x, u.ghost.y, 13, ok ? "rgba(59,130,246,0.8)" : "rgba(239,68,68,0.8)");
      text(ctx, def.icon, u.ghost.x, u.ghost.y + 1, { size: 17 });
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // Top HUD: enemy stars, timer.
    const tl = Math.max(0, timeLeft(s));
    fillRoundRect(ctx, W - 74, 4, 70, 34, 8, "rgba(0,0,0,0.5)");
    text(ctx, s.overtime ? "Overtime" : "Time left", W - 39, 13, { size: 8, weight: 800, color: s.overtime ? "#fca5a5" : "#cbd5e1" });
    text(ctx, formatTime(tl), W - 39, 28, { size: 15, weight: 900, color: tl < 30 || s.overtime ? "#fca5a5" : "#fff" });
    if (manaBoost(s) === 2) text(ctx, "×2 💧", W - 39, 48, { size: 10, weight: 900, color: "#e9d5ff", stroke: "rgba(0,0,0,0.6)", strokeWidth: 3 });
    fillRoundRect(ctx, 4, 4, 64, 22, 8, "rgba(127,29,29,0.75)");
    text(ctx, `${AI[s.diff].name} ⭐${s.stars[1]}`, 36, 15, { size: 11, weight: 900 });
    if (f.bannerT > 0) {
      const a = Math.min(1, f.bannerT * 2);
      text(ctx, f.banner, W / 2, AH * 0.42, { size: 24, weight: 900, color: `rgba(255,255,255,${a})`, stroke: `rgba(0,0,0,${a * 0.7})`, strokeWidth: 6 });
    }

    // Card bar.
    ctx.fillStyle = "#1e1b4b";
    ctx.fillRect(0, AH, W, H - AH);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, AH, W, 1);
    text(ctx, "Next", NEXT.x + NEXT.w / 2, AH + 12, { size: 9, weight: 800, color: "#a5b4fc" });
    const nextCard = CARDS[s.queues[0][0]];
    fillRoundRect(ctx, NEXT.x, NEXT.y, NEXT.w, NEXT.h, 8, "rgba(255,255,255,0.08)");
    text(ctx, nextCard.icon, NEXT.x + NEXT.w / 2, NEXT.y + 28, { size: 22 });
    text(ctx, `${nextCard.cost}`, NEXT.x + NEXT.w / 2, NEXT.y + 54, { size: 11, weight: 900, color: "#e9d5ff" });
    for (let i = 0; i < 4; i++) {
      const c = CARDS[s.hands[0][i]];
      const x = CARD.x(i);
      const y = CARD.y - (u.sel === i ? 6 : 0);
      const can = s.mana[0] >= c.cost;
      fillRoundRect(ctx, x, y, CARD.w, CARD.h, 10, u.sel === i ? "#4338ca" : "#312e81");
      if (u.sel === i) {
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, CARD.w - 2, CARD.h - 2, 10);
        ctx.stroke();
      }
      ctx.globalAlpha = can ? 1 : 0.45;
      text(ctx, c.icon, x + CARD.w / 2, y + 32, { size: 30 });
      text(ctx, c.name, x + CARD.w / 2, y + 62, { size: 10, weight: 800 });
      ctx.globalAlpha = 1;
      circle(ctx, x + 12, y + 12, 10, "#a855f7");
      text(ctx, `${c.cost}`, x + 12, y + 12.5, { size: 12, weight: 900 });
      if (!can) {
        // Fill shows how close you are to affording it.
        const k = s.mana[0] / c.cost;
        fillRoundRect(ctx, x + 6, y + CARD.h - 10, (CARD.w - 12) * k, 4, 2, "rgba(216,180,254,0.7)");
      }
      if (!touch) text(ctx, `${i + 1}`, x + CARD.w - 10, y + 11, { size: 9, weight: 800, color: "#a5b4fc" });
    }
    // Mana bar.
    const my = H - 22;
    fillRoundRect(ctx, 8, my, W - 16, 16, 8, "rgba(0,0,0,0.45)");
    fillRoundRect(ctx, 8, my, (W - 16) * (s.mana[0] / MANA_MAX), 16, 8, "#a855f7");
    for (let i = 1; i < MANA_MAX; i++) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(8 + ((W - 16) * i) / MANA_MAX, my, 1, 16);
    }
    text(ctx, `💧 ${Math.floor(s.mana[0])}`, 30, my + 8.5, { size: 11, weight: 900 });
    text(ctx, `⭐${s.stars[0]}`, W - 26, my + 8.5, { size: 11, weight: 900, color: "#bfdbfe" });
  };

  const arena = arenaFor(trophies);
  const s = game.current;

  return (
    <div className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas width={W} height={H} draw={draw} background="#1e1b4b" onPointer={onPointer} />
      {touch && phase === "playing" && (
        <button type="button" aria-label="Pause" className="absolute left-2 top-10 z-10 h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white" onClick={() => go("paused")}>
          ⏸
        </button>
      )}
      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={`🏆 ${trophies}`}
          bestLabel={arena.name}
          extra={
            <div className="mt-3 text-left">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">Opponent</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
                  <button key={d} type="button" onClick={() => setDiff(d)}
                    className={`rounded-md border py-1.5 text-sm font-bold ${diff === d ? "border-blue-400 bg-blue-400/25" : "border-white/15 bg-white/5"}`}>
                    {AI[d].name}
                  </button>
                ))}
              </div>
              <div className="mb-1.5 mt-3 flex justify-between text-[11px] font-semibold uppercase tracking-wider text-white/50">
                <span>Your deck</span>
                <span className={deck.length === DECK_SIZE ? "text-emerald-300" : "text-amber-300"}>{deck.length} / {DECK_SIZE}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {CARD_IDS.map((c) => {
                  const on = deck.includes(c);
                  return (
                    <button key={c} type="button" onClick={() => toggleCard(c)} title={CARDS[c].blurb}
                      className={`relative rounded-lg border px-0.5 pb-1 pt-1.5 text-center ${on ? "border-blue-400 bg-blue-500/25" : "border-white/10 bg-white/5 opacity-60"}`}>
                      <span className="absolute left-1 top-0.5 text-[10px] font-black text-purple-300">{CARDS[c].cost}</span>
                      <span className="block text-xl leading-6">{CARDS[c].icon}</span>
                      <span className="block truncate text-[9px] font-semibold">{CARDS[c].name}</span>
                    </button>
                  );
                })}
              </div>
              {deck.length !== DECK_SIZE && <p className="mt-1 text-xs text-amber-200">Pick exactly {DECK_SIZE} cards to battle.</p>}
            </div>
          }
        />
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={start} />}
      {phase === "over" && (
        <Overlay>
          <div className="text-5xl">{result.winner === 0 ? "🏆" : result.winner === 1 ? "💥" : "🤝"}</div>
          <h2 className="mt-1 text-2xl font-black" style={{ color: result.winner === 0 ? "#fde047" : result.winner === 1 ? "#fca5a5" : "#e5e7eb" }}>
            {result.winner === 0 ? "Victory!" : result.winner === 1 ? "Defeat" : "Draw"}
          </h2>
          <p className="mt-1 text-lg font-black">
            <span className="text-blue-300">{"⭐".repeat(result.stars[0]) || "–"}</span>
            <span className="mx-3 text-white/40">vs</span>
            <span className="text-red-300">{"⭐".repeat(result.stars[1]) || "–"}</span>
          </p>
          <p className="mt-1 text-sm text-white/70">
            🏆 {trophies} <span className={result.delta >= 0 ? "text-emerald-300" : "text-red-300"}>({result.delta >= 0 ? "+" : ""}{result.delta})</span> · {arenaFor(trophies).name}
          </p>
          <p className="mt-1 text-xs text-white/50">{AI[s.diff].name} opponent</p>
          <div className="mt-4 space-y-2">
            <PrimaryButton accent={meta.accent} autoFocus onClick={start}>Battle again</PrimaryButton>
            <SecondaryButton onClick={() => go("ready")}>Change deck</SecondaryButton>
          </div>
        </Overlay>
      )}
    </div>
  );
}
