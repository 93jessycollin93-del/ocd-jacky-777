// Night Survivors: rules in logic.ts. This file draws the night (cached sprites, camera on the player), reads
// keys or the touch joystick, shows the level-up cards, the shop of permanent upgrades, pause and the end screen.
import { useCallback, useRef, useState } from "react";
import { GameCanvas, type View } from "../../kit/GameCanvas";
import { Floaters, Particles, Shake, circle, fillRoundRect, text } from "../../kit/draw";
import { useHeldKeys, useKeyPress } from "../../kit/input";
import { Joystick } from "../../kit/TouchPad";
import { play, tone } from "../../kit/sfx";
import { randomSeed } from "../../kit/rng";
import { loadState, saveState } from "../../kit/storage";
import { formatTime } from "../../kit/format";
import { GameOverPanel, Overlay, PausePanel, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { useViewWidth } from "../slither-arena/useViewWidth";
import { meta } from "./meta";
import {
  MAX_LEVEL, PASSIVES, RUN_LENGTH, SHOP, WEAPONS, chooseOffer, magnetRange, maxHp, newRun, offers, shopCost, step, weaponStats, xpForLevel,
  type EnemyKind, type Offer, type SurvEvent, type SurvState, type Upgrades,
} from "./logic";

type Phase = "ready" | "playing" | "paused" | "levelup" | "over";
const GOLD_KEY = "night-survivors:gold";
const UPG_KEY = "night-survivors:upgrades";

const SPRITE: Record<EnemyKind, { r: number; draw: (g: CanvasRenderingContext2D, r: number) => void }> = {
  bat: { r: 9, draw: (g, r) => {
    g.fillStyle = "#6b21a8";
    g.beginPath();
    g.moveTo(-r * 1.8, -r * 0.2);
    g.quadraticCurveTo(-r, -r, 0, 0);
    g.quadraticCurveTo(r, -r, r * 1.8, -r * 0.2);
    g.quadraticCurveTo(r, r * 0.4, 0, r * 0.3);
    g.quadraticCurveTo(-r, r * 0.4, -r * 1.8, -r * 0.2);
    g.fill();
    circle(g, 0, 0, r * 0.5, "#a855f7");
    circle(g, -2, -1, 1.4, "#fde047");
    circle(g, 2, -1, 1.4, "#fde047");
  } },
  zombie: { r: 12, draw: (g, r) => {
    circle(g, 0, 4, r * 0.85, "#3f6212");
    circle(g, 0, -4, r * 0.65, "#84cc16");
    circle(g, -3, -5, 1.8, "#7f1d1d");
    circle(g, 3, -5, 1.8, "#7f1d1d");
  } },
  skeleton: { r: 12, draw: (g, r) => {
    circle(g, 0, 4, r * 0.7, "#d6d3d1");
    circle(g, 0, -5, r * 0.6, "#f5f5f4");
    circle(g, -2.5, -6, 2, "#1c1917");
    circle(g, 2.5, -6, 2, "#1c1917");
    g.fillStyle = "#1c1917";
    g.fillRect(-3, -1, 6, 1.5);
  } },
  ghost: { r: 11, draw: (g, r) => {
    g.fillStyle = "rgba(224,231,255,0.8)";
    g.beginPath();
    g.arc(0, -2, r, Math.PI, 0);
    g.lineTo(r, r);
    for (let i = 0; i < 4; i++) g.lineTo(r - ((i + 0.5) * r * 2) / 4, r - (i % 2 ? 0 : 5));
    g.lineTo(-r, r);
    g.fill();
    circle(g, -3, -3, 2, "#312e81");
    circle(g, 3, -3, 2, "#312e81");
  } },
  brute: { r: 20, draw: (g, r) => {
    circle(g, 0, 3, r, "#7c2d12");
    circle(g, 0, -2, r * 0.8, "#c2410c");
    circle(g, -6, -6, 3, "#fde047");
    circle(g, 6, -6, 3, "#fde047");
    g.fillStyle = "#fef3c7";
    g.fillRect(-7, 4, 4, 5);
    g.fillRect(3, 4, 4, 5);
  } },
  boss: { r: 36, draw: (g, r) => {
    circle(g, 0, 4, r, "#450a0a");
    circle(g, 0, 0, r * 0.88, "#991b1b");
    g.fillStyle = "#fde047";
    g.beginPath();
    g.moveTo(-r * 0.6, -r * 0.7);
    g.lineTo(-r * 0.3, -r * 1.25);
    g.lineTo(0, -r * 0.8);
    g.lineTo(r * 0.3, -r * 1.25);
    g.lineTo(r * 0.6, -r * 0.7);
    g.fill();
    circle(g, -10, -6, 5, "#fef08a");
    circle(g, 10, -6, 5, "#fef08a");
  } },
};

/** Sprites are painted once per kind (and a white "hit" copy) into small canvases. */
const cache = new Map<string, HTMLCanvasElement>();
function sprite(kind: EnemyKind, flash: boolean): HTMLCanvasElement {
  const k = `${kind}${flash ? "!" : ""}`;
  let c = cache.get(k);
  if (c) return c;
  const def = SPRITE[kind];
  const size = Math.ceil(def.r * 4.4);
  c = document.createElement("canvas");
  c.width = size * 2;
  c.height = size * 2;
  const g = c.getContext("2d")!;
  g.scale(2, 2);
  g.translate(size / 2, size / 2);
  def.draw(g, def.r);
  if (flash) {
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.fillRect(-size, -size, size * 2, size * 2);
  }
  cache.set(k, c);
  return c;
}

const offerTitle = (o: Offer) =>
  o.kind === "weapon" ? WEAPONS[o.id as keyof typeof WEAPONS].name : o.kind === "passive" ? PASSIVES[o.id as keyof typeof PASSIVES].name : o.kind === "heal" ? "Roast Chicken" : "Gold";
const offerIcon = (o: Offer) =>
  o.kind === "weapon" ? WEAPONS[o.id as keyof typeof WEAPONS].icon : o.kind === "passive" ? PASSIVES[o.id as keyof typeof PASSIVES].icon : o.kind === "heal" ? "🍗" : "🪙";
const offerBlurb = (o: Offer) =>
  o.kind === "weapon" ? WEAPONS[o.id as keyof typeof WEAPONS].blurb : o.kind === "passive" ? PASSIVES[o.id as keyof typeof PASSIVES].blurb : o.kind === "heal" ? "Heal 50" : "+10 gold";

export default function NightSurvivors({ touch, best, submitScore }: GameProps) {
  const game = useRef<SurvState>(newRun(1));
  const fx = useRef({ particles: new Particles(500), shake: new Shake(), floaters: new Floaters(), hurt: 0, banner: "", bannerT: 0, sfxT: 0 });
  const keys = useHeldKeys();
  const stick = useRef({ x: 0, y: 0 });
  const wrap = useRef<HTMLDivElement>(null);
  const viewW = useViewWidth(wrap, 360, 1000);
  const [phase, setPhase] = useState<Phase>("ready");
  const phaseRef = useRef<Phase>("ready");
  const [cards, setCards] = useState<Offer[]>([]);
  const [gold, setGold] = useState(() => loadState<number>(GOLD_KEY) ?? 0);
  const [upg, setUpg] = useState<Upgrades>(() => ({ might: 0, health: 0, speed: 0, ...(loadState<Upgrades>(UPG_KEY) ?? {}) }));
  const [result, setResult] = useState({ time: 0, won: false, kills: 0, level: 1, gold: 0, isBest: false });
  const [, setTick] = useState(0);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const start = useCallback(() => {
    game.current = newRun(randomSeed(), upg);
    const f = fx.current;
    f.particles.clear();
    f.banner = "Survive until dawn";
    f.bannerT = 2.5;
    play("select");
    go("playing");
  }, [go, upg]);

  const buy = (id: keyof Upgrades) => {
    const rank = upg[id];
    const cost = shopCost(rank);
    const def = SHOP.find((x) => x.id === id)!;
    if (rank >= def.max || gold < cost) return play("error");
    const next = { ...upg, [id]: rank + 1 };
    setUpg(next);
    setGold(gold - cost);
    saveState(UPG_KEY, next);
    saveState(GOLD_KEY, gold - cost);
    play("coin");
  };

  const finish = (won: boolean) => {
    const g = game.current;
    const total = gold + g.gold;
    setGold(total);
    saveState(GOLD_KEY, total);
    const isBest = submitScore(Math.floor(g.time));
    setResult({ time: g.time, won, kills: g.kills, level: g.level, gold: g.gold, isBest });
    play(won ? "win" : "lose");
    window.setTimeout(() => go("over"), won ? 600 : 1200);
  };

  const pick = (o: Offer) => {
    const g = game.current;
    chooseOffer(g, o);
    play("powerup");
    if (g.pendingLevels > 0) setCards(offers(g));
    else go("playing");
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if ((code === "KeyP" || code === "Escape") && (p === "playing" || p === "paused")) go(p === "playing" ? "paused" : "playing");
    else if (p === "levelup" && /^Digit[1-3]$/.test(code)) {
      const o = cards[Number(code.slice(5)) - 1];
      if (o) pick(o);
    }
  });

  const handle = (events: SurvEvent[]) => {
    const f = fx.current;
    const g = game.current;
    let hits = 0;
    for (const e of events) {
      if (e.type === "hit") hits++;
      else if (e.type === "kill") {
        f.particles.burst(e.x, e.y, e.kind === "boss" ? 60 : 5, { color: e.kind === "boss" ? ["#fde047", "#dc2626"] : ["#a855f7", "#e9d5ff"], speed: 90, size: 3, gravity: 0, life: 0.4 });
        if (e.kind === "boss") {
          play("explode");
          f.shake.add(0.8);
        }
      } else if (e.type === "hurt") {
        f.hurt = 0.35;
        tone(110, 0.08, "square", 0.05);
      } else if (e.type === "levelup") play("levelup");
      else if (e.type === "pickup") {
        if (e.kind === "gold") tone(1500, 0.05, "sine", 0.03);
        else play(e.kind === "chest" ? "powerup" : "coin");
        if (e.kind === "chicken") f.floaters.add(g.px, g.py - 30, "+30 HP", "#86efac", 14);
      } else if (e.type === "boss") {
        f.banner = "A boss approaches!";
        f.bannerT = 2.5;
        play("lose", 0.6);
      } else if (e.type === "evolve") {
        f.banner = `Evolved: ${WEAPONS[e.id].evolvedName}!`;
        f.bannerT = 3;
        play("levelup");
      }
    }
    // Hit sounds are frequent: one soft tick at most every 70 ms.
    if (hits && g.time - f.sfxT > 0.07) {
      f.sfxT = g.time;
      tone(600 + Math.random() * 200, 0.03, "square", 0.015);
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number, time: number) => {
    const g = game.current;
    const f = fx.current;
    if (phaseRef.current === "playing") {
      const k = keys.current;
      let mx = stick.current.x;
      let my = stick.current.y;
      if (k.has("KeyA") || k.has("ArrowLeft")) mx -= 1;
      if (k.has("KeyD") || k.has("ArrowRight")) mx += 1;
      if (k.has("KeyW") || k.has("ArrowUp")) my -= 1;
      if (k.has("KeyS") || k.has("ArrowDown")) my += 1;
      const was = g.over;
      handle(step(g, Math.min(dt, 1 / 20), mx, my));
      if (g.pendingLevels > 0) {
        setCards(offers(g));
        go("levelup");
      }
      if (g.over && !was) finish(g.won);
    }
    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);
    f.hurt = Math.max(0, f.hurt - dt);
    f.bannerT = Math.max(0, f.bannerT - dt);

    const W = view.w;
    const H = view.h;
    const [sx, sy] = f.shake.offset(8);
    const camX = g.px - W / 2 + sx;
    const camY = g.py - H / 2 + sy;
    // Ground: a dark field with a tiling pattern that scrolls with the camera.
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#111a33";
    const T = 64;
    for (let y = -((camY % T) + T) % T; y < H; y += T) for (let x = -((camX % T) + T) % T; x < W; x += T) {
      if ((Math.floor((x + camX) / T) + Math.floor((y + camY) / T)) % 2 === 0) ctx.fillRect(x, y, T, T);
    }
    ctx.save();
    ctx.translate(-camX, -camY);
    // Area effects under everything.
    for (const e of g.effects) {
      if (e.kind === "water") {
        circle(ctx, e.x, e.y, e.r, `rgba(56,189,248,${0.25 + Math.min(0.25, e.t * 0.1)})`);
        circle(ctx, e.x, e.y, e.r * 0.6, "rgba(186,230,253,0.25)");
      }
    }
    const garlic = g.weapons.find((w) => w.id === "garlic");
    if (garlic) {
      const st = weaponStats("garlic", garlic.level, garlic.evolved);
      circle(ctx, g.px, g.py, 55 * st.area * (garlic.evolved ? 1.4 : 1), "rgba(250,204,21,0.08)");
    }
    // Gems and pickups.
    for (const gem of g.gems) {
      const col = gem.v >= 5 ? "#f43f5e" : gem.v >= 2 ? "#22c55e" : "#38bdf8";
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(gem.x, gem.y - 6);
      ctx.lineTo(gem.x + 4, gem.y);
      ctx.lineTo(gem.x, gem.y + 6);
      ctx.lineTo(gem.x - 4, gem.y);
      ctx.fill();
    }
    for (const p of g.pickups) {
      text(ctx, p.kind === "chicken" ? "🍗" : p.kind === "magnet" ? "🧲" : p.kind === "chest" ? "🎁" : "🪙", p.x, p.y, { size: p.kind === "chest" ? 30 : 18 });
    }
    // Enemies (only those near the screen).
    for (const e of g.enemies) {
      if (e.x < camX - 60 || e.x > camX + W + 60 || e.y < camY - 60 || e.y > camY + H + 60) continue;
      const img = sprite(e.kind, e.flash > 0);
      const s = img.width / 2;
      ctx.drawImage(img, e.x - s / 2, e.y - s / 2 + (e.kind === "bat" ? Math.sin(time * 12 + e.id) * 3 : 0), s, s);
      if (e.kind === "boss") {
        fillRoundRect(ctx, e.x - 40, e.y - 56, 80, 6, 3, "rgba(0,0,0,0.6)");
        fillRoundRect(ctx, e.x - 40, e.y - 56, 80 * (e.hp / e.maxHp), 6, 3, "#ef4444");
      }
    }
    // Projectiles.
    for (const p of g.projs) {
      if (p.kind === "bolt") {
        circle(ctx, p.x, p.y, 7, "rgba(147,197,253,0.4)");
        circle(ctx, p.x, p.y, 4, "#e0f2fe");
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(time * 12);
        text(ctx, p.kind === "axe" ? "🪓" : "✝️", 0, 0, { size: 22 });
        ctx.restore();
      }
    }
    // Player.
    const pr = 14;
    circle(ctx, g.px, g.py + 12, 10, "rgba(0,0,0,0.35)");
    const blink = g.invuln > 0 && Math.floor(time * 20) % 2 === 0;
    if (!blink) {
      circle(ctx, g.px, g.py, pr, "#1e1b4b");
      circle(ctx, g.px, g.py - 2, pr - 2, "#c4b5fd");
      fillRoundRect(ctx, g.px - 10, g.py - 18, 20, 7, 3, "#7c3aed");
      circle(ctx, g.px + (g.face === 0 ? 4 : -4), g.py - 3, 2, "#1e1b4b");
    }
    // Orbiting books.
    const books = g.weapons.find((w) => w.id === "books");
    if (books) {
      const st = weaponStats("books", books.level, books.evolved);
      const r = 80 * st.area;
      for (let i = 0; i < st.count; i++) {
        const a = g.time * 3 + (i / st.count) * Math.PI * 2;
        text(ctx, "📘", g.px + Math.cos(a) * r, g.py + Math.sin(a) * r, { size: 20 });
      }
    }
    // Whip slashes and lightning.
    for (const e of g.effects) {
      if (e.kind === "whip") {
        const k = e.t / 0.25;
        ctx.strokeStyle = `rgba(254,226,226,${k})`;
        ctx.lineWidth = 10 * k;
        ctx.beginPath();
        const side = Math.cos(e.dir) >= 0 ? 1 : -1;
        ctx.ellipse(e.x + side * e.r * 0.55, e.y, e.r * 0.55, 14, 0, side > 0 ? Math.PI * 1.1 : -Math.PI * 0.1, side > 0 ? Math.PI * 1.9 : Math.PI * 0.9);
        ctx.stroke();
      } else if (e.kind === "lightning") {
        ctx.strokeStyle = `rgba(253,224,71,${e.t / 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        let y = e.y - 300;
        ctx.moveTo(e.x, y);
        while (y < e.y) {
          y += 30;
          ctx.lineTo(e.x + (Math.random() - 0.5) * 24, y);
        }
        ctx.stroke();
        circle(ctx, e.x, e.y, e.r * (e.t / 0.3), "rgba(253,224,71,0.3)");
      }
    }
    // Magnet range (faint).
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.arc(g.px, g.py, magnetRange(g), 0, Math.PI * 2);
    ctx.stroke();
    f.particles.draw(ctx);
    f.floaters.draw(ctx);
    ctx.restore();

    if (f.hurt > 0) {
      ctx.fillStyle = `rgba(220,38,38,${f.hurt * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
    // HUD: XP bar, time, level, kills, health, gold, weapon icons.
    const need = xpForLevel(g.level);
    fillRoundRect(ctx, 0, 0, W, 10, 0, "#1e1b4b");
    fillRoundRect(ctx, 0, 0, W * Math.min(1, g.xp / need), 10, 0, "#38bdf8");
    text(ctx, `LV ${g.level}`, W - 8, 22, { align: "right", size: 13, weight: 900, color: "#e0f2fe" });
    text(ctx, formatTime(g.time), W / 2, 30, { size: 22, weight: 900, color: g.time > RUN_LENGTH - 60 ? "#fde047" : "#fff" });
    text(ctx, `☠ ${g.kills}  ·  🪙 ${g.gold}`, 10, 22, { align: "left", size: 13, weight: 800, color: "#e9d5ff" });
    const hp = Math.max(0, g.hp) / maxHp(g);
    fillRoundRect(ctx, W / 2 - 60, 44, 120, 8, 4, "rgba(0,0,0,0.6)");
    fillRoundRect(ctx, W / 2 - 60, 44, 120 * hp, 8, 4, hp > 0.5 ? "#22c55e" : hp > 0.25 ? "#facc15" : "#ef4444");
    g.weapons.forEach((w, i) => {
      fillRoundRect(ctx, 8 + i * 30, 32, 26, 26, 6, w.evolved ? "rgba(250,204,21,0.35)" : "rgba(255,255,255,0.1)");
      text(ctx, WEAPONS[w.id].icon, 21 + i * 30, 44, { size: 15 });
      text(ctx, w.evolved ? "★" : `${w.level}`, 30 + i * 30, 54, { size: 9, weight: 900, color: "#fde68a" });
    });
    g.passives.forEach((p, i) => {
      fillRoundRect(ctx, 8 + i * 30, 62, 26, 26, 6, "rgba(255,255,255,0.06)");
      text(ctx, PASSIVES[p.id].icon, 21 + i * 30, 74, { size: 14 });
      text(ctx, `${p.level}`, 30 + i * 30, 84, { size: 9, weight: 900, color: "#c4b5fd" });
    });
    if (f.bannerT > 0) {
      const a = Math.min(1, f.bannerT * 2);
      text(ctx, f.banner, W / 2, H * 0.3, { size: 24, weight: 900, color: `rgba(253,224,71,${a})`, stroke: `rgba(0,0,0,${a * 0.7})`, strokeWidth: 5 });
    }
  };

  const g = game.current;

  return (
    <div ref={wrap} className="absolute inset-0" style={{ touchAction: "none" }}>
      <GameCanvas width={viewW} fit="fill" draw={draw} background="#0b1020" />
      {touch && phase === "playing" && (
        <Joystick className="absolute bottom-0 left-0 h-full w-1/2" onChange={(x, y) => (stick.current = { x, y })} hint="drag to move" />
      )}
      {touch && phase === "playing" && (
        <button type="button" aria-label="Pause" className="absolute right-2 top-12 z-10 h-9 w-9 rounded-full border border-white/25 bg-black/40 text-sm text-white" onClick={() => go("paused")}>
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
          best={best ? formatTime(best) : undefined}
          bestLabel="Longest night"
          extra={
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-2 text-left">
              <div className="mb-1 flex justify-between text-[11px] font-semibold uppercase tracking-wider text-white/50"><span>Shop</span><span className="text-amber-300">🪙 {gold}</span></div>
              {SHOP.map((s) => {
                const rank = upg[s.id];
                const maxed = rank >= s.max;
                return (
                  <button key={s.id} type="button" onClick={() => buy(s.id)} disabled={maxed}
                    className="mt-1 flex w-full items-center justify-between rounded-lg border border-white/10 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-50">
                    <span><b>{s.name}</b> <span className="text-white/50">{s.blurb}</span></span>
                    <span className="text-amber-300">{maxed ? "MAX" : `${rank}/${s.max} · ${shopCost(rank)}`}</span>
                  </button>
                );
              })}
            </div>
          }
        />
      )}
      {phase === "levelup" && (
        <Overlay>
          <h2 className="text-2xl font-black" style={{ color: meta.accent }}>Level {g.level - g.pendingLevels + 1}!</h2>
          <p className="text-xs text-white/55">Choose an upgrade</p>
          <div className="mt-3 space-y-2">
            {cards.map((o, i) => (
              <button key={`${o.kind}-${o.id}-${i}`} type="button" onClick={() => pick(o)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-2.5 text-left hover:border-violet-300 hover:bg-violet-400/10">
                <span className="text-3xl">{offerIcon(o)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">
                    {offerTitle(o)}
                    {o.kind === "weapon" || o.kind === "passive" ? (
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${o.owned ? "bg-white/10" : "bg-emerald-400/20 text-emerald-200"}`}>
                        {o.owned ? `Lv ${o.nextLevel}${o.nextLevel === MAX_LEVEL ? " (max)" : ""}` : "NEW"}
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-xs text-white/60">{offerBlurb(o)}</span>
                </span>
                {!touch && <span className="text-xs text-white/40">{i + 1}</span>}
              </button>
            ))}
          </div>
        </Overlay>
      )}
      {phase === "paused" && <PausePanel accent={meta.accent} onResume={() => go("playing")} onRestart={start} />}
      {phase === "over" && (
        <GameOverPanel title={result.won ? "You saw the dawn!" : "The night took you"} accent={meta.accent} score={formatTime(result.time)} scoreLabel="Survived"
          best={best ? formatTime(best) : undefined} isBest={result.isBest} onRestart={() => { setTick((t) => t + 1); go("ready"); }}>
          <p className="mt-2 text-xs text-white/55">Level {result.level} · {result.kills} enemies · 🪙 {result.gold} gold earned</p>
        </GameOverPanel>
      )}
    </div>
  );
}
