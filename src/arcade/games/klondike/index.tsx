// Klondike solitaire on a canvas: cards ease to wherever the rules put them, so every move, deal and undo
// is animated. Drag cards or whole stacks, tap to auto-move, double-click for the foundation. Rules are in
// logic.ts, positions in layout.ts and the card art in cards.ts.
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type CanvasPointer, type View } from "../../kit/GameCanvas";
import { Floaters, Particles, damp, roundRect, text } from "../../kit/draw";
import { formatTime } from "../../kit/format";
import { useKeyPress } from "../../kit/input";
import { randomSeed } from "../../kit/rng";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { SpriteCache, suitPath } from "./cards";
import { columnSlot, computeLayout, foundationSlot, layoutCards, stockSlot, wasteSlot, type Layout, type Rect, type Spot } from "./layout";
import { Klondike, isUp, timeBonus, type Dest, type Source } from "./logic";
import { meta } from "./meta";
import { bounceSound, dealSound, errorSound, flipSound, foundationSound, placeSound, recycleSound, undoSound, winSound } from "./sounds";
import { useSize } from "./useSize";

type Phase = "ready" | "playing" | "won";

interface CardAnim {
  x: number;
  y: number;
  /** Seconds to wait before moving (staggers the deal). */
  wait: number;
  shownUp: boolean;
  /** Flip progress 0..1, or -1 when not flipping. */
  flip: number;
  wobble: number;
  released: boolean;
}

interface Bouncer {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Drag {
  src: Source;
  ids: number[];
  offX: number[];
  offY: number[];
  startX: number;
  startY: number;
  px: number;
  py: number;
  moved: boolean;
  pointerId: number;
}

interface Hit {
  kind: "stock" | "waste" | "foundation" | "tableau";
  src: Source | null;
  id: number;
}

interface Stats {
  score: number;
  moves: number;
  time: number;
  canUndo: boolean;
  canAuto: boolean;
  stuck: boolean;
}

interface WinInfo {
  score: number;
  bonus: number;
  time: number;
  moves: number;
  isBest: boolean;
}

const DRAW_KEY = "klondike:draw";
const FELT_LIGHT = "#1c7a4d";
const FELT_DARK = "#0b3f29";

export default function KlondikeGame({ touch, best, submitScore }: GameProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const { w: areaW } = useSize(areaRef);

  const game = useRef<Klondike>(Klondike.deal(1, 1));
  const anims = useRef<CardAnim[]>(Array.from({ length: 52 }, () => ({ x: 0, y: 0, wait: 0, shownUp: false, flip: -1, wobble: 0, released: false })));
  const sprites = useRef(new SpriteCache());
  const fx = useRef({ particles: new Particles(), floaters: new Floaters() });
  const phaseRef = useRef<Phase>("ready");
  const drag = useRef<Drag | null>(null);
  const order = useRef<number[]>(Array.from({ length: 52 }, (_, i) => i));
  const zKey = useRef<number[]>(new Array(52).fill(0));
  const spotsRef = useRef<Map<number, Spot>>(new Map());
  const spotsKey = useRef("");
  const layoutRef = useRef<Layout | null>(null);
  const rev = useRef(0);
  const started = useRef(false);
  const elapsed = useRef(0);
  const lastTap = useRef({ time: 0, x: 0, y: 0, id: -1 });
  const autoRun = useRef(false);
  const autoTimer = useRef(0);
  const bouncers = useRef<Bouncer[]>([]);
  const winQueue = useRef<number[]>([]);
  const winClock = useRef(0);
  const trail = useRef<{ cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D; w: number; h: number } | null>(null);
  const timers = useRef<number[]>([]);
  const shown = useRef({ score: -1, moves: -1, time: -1, canUndo: false, canAuto: false, stuck: false });

  const [drawMode, setDrawMode] = useState<1 | 3>(() => (loadState<number>(DRAW_KEY) === 3 ? 3 : 1));
  const [phase, setPhase] = useState<Phase>("ready");
  const [stats, setStats] = useState<Stats>({ score: 0, moves: 0, time: 0, canUndo: false, canAuto: false, stuck: false });
  const [win, setWin] = useState<WinInfo | null>(null);
  const [showWin, setShowWin] = useState(false);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // ------------------------------------------------------------ starting a game
  const startGame = () => {
    saveState(DRAW_KEY, drawMode);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const g = Klondike.deal(randomSeed(), drawMode);
    game.current = g;
    rev.current++;
    spotsKey.current = "";
    started.current = false;
    elapsed.current = 0;
    autoRun.current = false;
    bouncers.current = [];
    winQueue.current = [];
    trail.current = null;
    drag.current = null;
    fx.current.particles.clear();
    // Everything starts on the stock and is dealt out one card at a time.
    const l = layoutRef.current;
    let k = 0;
    const dealOrder = new Map<number, number>();
    for (let row = 0; row < 7; row++) for (let col = row; col < 7; col++) dealOrder.set(g.tableau[col][row] & 63, k++);
    anims.current.forEach((a, id) => {
      a.x = l ? l.colX[0] : 0;
      a.y = l ? l.top : 0;
      a.shownUp = false;
      a.flip = -1;
      a.wobble = 0;
      a.released = false;
      a.wait = dealOrder.has(id) ? 0.15 + dealOrder.get(id)! * 0.045 : 0;
    });
    for (let i = 0; i < 28; i++) later(dealSound, 150 + i * 45);
    setWin(null);
    setShowWin(false);
    shown.current = { score: -1, moves: -1, time: -1, canUndo: false, canAuto: false, stuck: false };
    setPhaseBoth("playing");
  };

  const beginWin = () => {
    const g = game.current;
    setPhaseBoth("won");
    autoRun.current = false;
    started.current = false;
    const t = Math.max(1, Math.round(elapsed.current));
    const bonus = timeBonus(t);
    const total = g.score + bonus;
    const isBest = submitScore(total);
    setWin({ score: g.score, bonus, time: t, moves: g.moves, isBest });
    winSound();
    // Release the foundation cards King first, one at a time, to bounce across the table.
    const q: number[] = [];
    for (let r = 12; r >= 0; r--) for (let p = 0; p < 4; p++) q.push(g.foundations[p][r] & 63);
    winQueue.current = q;
    winClock.current = 0;
    later(() => setShowWin(true), 3600);
  };

  // ------------------------------------------------------------ doing moves
  const centreOf = (id: number) => {
    const l = layoutRef.current;
    const a = anims.current[id];
    return l ? { x: a.x + l.cw / 2, y: a.y + l.ch / 2 } : { x: 0, y: 0 };
  };

  const perform = (src: Source, dst: Dest): boolean => {
    const g = game.current;
    const cards = g.cardsAt(src);
    const res = g.move(src, dst);
    if (!res) return false;
    rev.current++;
    started.current = true;
    const id = cards[0] & 63;
    const f = fx.current;
    const l = layoutRef.current;
    if (dst.type === "foundation") {
      foundationSound(g.foundations[dst.pile].length);
      if (l) {
        const slot = foundationSlot(l, dst.pile);
        f.particles.burst(slot.x + l.cw / 2, slot.y + l.ch / 2, 14, { color: ["#fde047", "#ffffff", "#86efac"], speed: 170, size: 4, gravity: 120, life: 0.7 });
      }
    } else placeSound();
    if (res.flipped) later(flipSound, 120);
    if (res.delta !== 0 && l) {
      const c = centreOf(id);
      f.floaters.add(c.x, c.y - l.ch * 0.4, `${res.delta > 0 ? "+" : ""}${res.delta}`, res.delta > 0 ? "#fde68a" : "#fca5a5", 16);
    }
    if (g.won) beginWin();
    return true;
  };

  const doDraw = () => {
    const g = game.current;
    const r = g.draw();
    if (r.drew === 0 && !r.recycled) {
      errorSound();
      return;
    }
    rev.current++;
    started.current = true;
    if (r.recycled) {
      recycleSound();
      const l = layoutRef.current;
      if (r.delta !== 0 && l) fx.current.floaters.add(l.colX[0] + l.cw / 2, l.top + l.ch * 0.5, `${r.delta}`, "#fca5a5", 18);
    } else flipSound();
  };

  const doUndo = () => {
    if (phaseRef.current !== "playing" || autoRun.current) return;
    if (game.current.undo()) {
      rev.current++;
      undoSound();
    }
  };

  const wobble = (id: number) => {
    anims.current[id].wobble = 0.35;
    errorSound();
  };

  const tapMove = (src: Source, id: number) => {
    const g = game.current;
    const dst = g.bestMove(src);
    if (!dst || !perform(src, dst)) wobble(id);
  };

  useKeyPress((code) => {
    const p = phaseRef.current;
    if (p === "ready") {
      if (code === "Enter" || code === "Space") startGame();
      return;
    }
    if (p !== "playing" || autoRun.current) return;
    if (code === "KeyZ") doUndo();
    else if (code === "Space" || code === "KeyD") doDraw();
  });

  // ------------------------------------------------------------ pointer input
  const cardRect = (id: number, l: Layout): Rect => {
    const a = anims.current[id];
    return { x: a.x, y: a.y, w: l.cw, h: l.ch };
  };
  const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  const hitTest = (x: number, y: number): Hit | null => {
    const l = layoutRef.current;
    if (!l) return null;
    const g = game.current;
    const ord = order.current;
    for (let i = ord.length - 1; i >= 0; i--) {
      const id = ord[i];
      const sp = spotsRef.current.get(id);
      if (!sp || anims.current[id].released) continue;
      if (!inside(cardRect(id, l), x, y)) continue;
      if (sp.zone === "stock") return { kind: "stock", src: null, id };
      if (sp.zone === "waste") return sp.index === g.waste.length - 1 ? { kind: "waste", src: { type: "waste" }, id } : null;
      if (sp.zone === "foundation") return sp.index === g.foundations[sp.pile].length - 1 ? { kind: "foundation", src: { type: "foundation", pile: sp.pile }, id } : null;
      const col = g.tableau[sp.pile];
      if (!isUp(col[sp.index])) return null;
      return { kind: "tableau", src: { type: "tableau", col: sp.pile, index: sp.index }, id };
    }
    if (inside(stockSlot(l), x, y)) return { kind: "stock", src: null, id: -1 };
    return null;
  };

  const dropTarget = (d: Drag): Dest | null => {
    const l = layoutRef.current;
    if (!l) return null;
    const g = game.current;
    const head = anims.current[d.ids[0]];
    const hr: Rect = { x: head.x, y: head.y, w: l.cw, h: l.ch };
    const overlap = (r: Rect) => Math.max(0, Math.min(hr.x + hr.w, r.x + r.w) - Math.max(hr.x, r.x)) * Math.max(0, Math.min(hr.y + hr.h, r.y + r.h) - Math.max(hr.y, r.y));
    let best: Dest | null = null;
    let bestArea = l.cw * l.ch * 0.16;
    if (d.ids.length === 1) {
      for (let p = 0; p < 4; p++) {
        const a = overlap(foundationSlot(l, p));
        if (a > bestArea && g.canMove(d.src, { type: "foundation", pile: p })) {
          bestArea = a;
          best = { type: "foundation", pile: p };
        }
      }
    }
    for (let c = 0; c < 7; c++) {
      const col = g.tableau[c];
      const base = columnSlot(l, c);
      const last = col.length ? spotsRef.current.get(col[col.length - 1] & 63) : undefined;
      const r: Rect = { x: base.x, y: base.y, w: l.cw, h: last ? last.y - base.y + l.ch : l.ch };
      const a = overlap(r);
      if (a > bestArea && g.canMove(d.src, { type: "tableau", col: c })) {
        bestArea = a;
        best = { type: "tableau", col: c };
      }
    }
    return best;
  };

  const onPointer = (p: CanvasPointer) => {
    if (phaseRef.current !== "playing" || autoRun.current) return;
    if (p.pointerType === "mouse" && p.type === "down" && p.button !== 0) return;
    const g = game.current;
    const l = layoutRef.current;
    if (!l) return;

    if (p.type === "down") {
      const hit = hitTest(p.x, p.y);
      if (!hit) {
        drag.current = null;
        return;
      }
      if (hit.kind === "stock" || !hit.src) {
        drag.current = { src: { type: "waste" }, ids: [], offX: [], offY: [], startX: p.x, startY: p.y, px: p.x, py: p.y, moved: false, pointerId: -2 };
        return;
      }
      const cards = g.cardsAt(hit.src);
      const ids = cards.map((c) => c & 63);
      drag.current = {
        src: hit.src, ids, offX: ids.map((id) => anims.current[id].x - p.x), offY: ids.map((id) => anims.current[id].y - p.y),
        startX: p.x, startY: p.y, px: p.x, py: p.y, moved: false, pointerId: p.id,
      };
    } else if (p.type === "move") {
      const d = drag.current;
      if (!d || d.pointerId === -2) return;
      d.px = p.x;
      d.py = p.y;
      if (!d.moved && Math.hypot(p.x - d.startX, p.y - d.startY) > 6) d.moved = true;
    } else if (p.type === "up" || p.type === "cancel") {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      if (d.pointerId === -2) {
        if (p.type === "up" && Math.hypot(p.x - d.startX, p.y - d.startY) < 12) doDraw();
        return;
      }
      if (d.moved) {
        if (p.type === "cancel") return;
        const dst = dropTarget(d);
        if (dst) {
          if (!perform(d.src, dst)) errorSound();
        } else if (Math.hypot(p.x - d.startX, p.y - d.startY) > l.cw * 0.4) {
          // Dropped somewhere it can't go: the cards slide home.
          placeSound();
        }
        return;
      }
      if (p.type !== "up") return;
      // A tap. Two quick taps in the same spot send the card to a foundation.
      const now = performance.now();
      const prev = lastTap.current;
      const isDouble = now - prev.time < 380 && Math.hypot(p.x - prev.x, p.y - prev.y) < 24 && prev.id >= 0;
      lastTap.current = { time: now, x: p.x, y: p.y, id: d.ids[0] ?? -1 };
      if (isDouble) {
        lastTap.current.id = -1;
        const sp = spotsRef.current.get(prev.id);
        if (sp) {
          let src: Source | null = null;
          if (sp.zone === "waste" && sp.index === g.waste.length - 1) src = { type: "waste" };
          else if (sp.zone === "tableau" && sp.index === g.tableau[sp.pile].length - 1) src = { type: "tableau", col: sp.pile, index: sp.index };
          const dst = src ? g.toFoundation(src) : null;
          if (src && dst) perform(src, dst);
        }
        return;
      }
      tapMove(d.src, d.ids[0]);
    }
  };

  // ------------------------------------------------------------ the frame
  const draw = (ctx: CanvasRenderingContext2D, view: View, dt: number, time: number) => {
    const g = game.current;
    const l = computeLayout(g, view.w, view.h);
    layoutRef.current = l;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const key = `${view.w}|${view.h}|${rev.current}`;
    if (key !== spotsKey.current) {
      spotsKey.current = key;
      spotsRef.current = layoutCards(g, l);
    }
    const spots = spotsRef.current;
    const playing = phaseRef.current === "playing";
    const f = fx.current;

    // Felt
    const felt = ctx.createRadialGradient(view.w / 2, view.h * 0.35, 40, view.w / 2, view.h * 0.5, Math.max(view.w, view.h) * 0.8);
    felt.addColorStop(0, FELT_LIGHT);
    felt.addColorStop(1, FELT_DARK);
    ctx.fillStyle = felt;
    ctx.fillRect(0, 0, view.w, view.h);

    // Timer
    if (playing && started.current && !autoRun.current) elapsed.current += dt;

    // Slots
    const slot = (r: Rect, label: string | null, suit = -1) => {
      ctx.save();
      roundRect(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, l.cw * 0.085);
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fill();
      ctx.setLineDash([l.cw * 0.12, l.cw * 0.09]);
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      if (suit >= 0) {
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        suitPath(ctx, suit, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.38);
        ctx.fill();
      }
      if (label) text(ctx, label, r.x + r.w / 2, r.y + r.h / 2, { size: r.w * 0.38, color: "rgba(255,255,255,0.22)", weight: 800 });
      ctx.restore();
    };
    const sr = stockSlot(l);
    slot(sr, null);
    if (g.stock.length === 0 && g.waste.length > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = Math.max(2, l.cw * 0.05);
      ctx.lineCap = "round";
      const cx = sr.x + sr.w / 2;
      const cy = sr.y + sr.h / 2;
      const rr = l.cw * 0.2;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, Math.PI * 0.2, Math.PI * 1.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + rr * 0.55, cy - rr * 1.25);
      ctx.lineTo(cx + rr * 0.95, cy - rr * 0.55);
      ctx.lineTo(cx + rr * 0.05, cy - rr * 0.45);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
      ctx.restore();
    }
    slot(wasteSlot(l), null);
    for (let p = 0; p < 4; p++) slot(foundationSlot(l, p), p === 0 ? "A" : null);
    for (let c = 0; c < 7; c++) if (g.tableau[c].length === 0) slot(columnSlot(l, c), "K");

    // Card positions
    const d = drag.current && drag.current.moved ? drag.current : null;
    const draggedIds = d ? d.ids : null;
    const z = zKey.current;
    let movingCount = 0;
    for (let id = 0; id < 52; id++) {
      const sp = spots.get(id);
      const a = anims.current[id];
      if (!sp) continue;
      const wantUp = sp.zone === "stock" ? false : sp.zone === "waste" || sp.zone === "foundation" ? true : isUp(g.tableau[sp.pile][sp.index]);
      let tx = sp.x;
      let ty = sp.y;
      let dragged = false;
      if (d && draggedIds!.includes(id)) {
        const k = draggedIds!.indexOf(id);
        tx = d.px + d.offX[k];
        ty = d.py + d.offY[k];
        dragged = true;
      }
      if (a.wait > 0) a.wait -= dt;
      else if (dragged) {
        a.x = tx;
        a.y = ty;
      } else {
        a.x = damp(a.x, tx, 22, dt);
        a.y = damp(a.y, ty, 22, dt);
        if (Math.abs(a.x - tx) < 0.4) a.x = tx;
        if (Math.abs(a.y - ty) < 0.4) a.y = ty;
      }
      const dist = Math.abs(a.x - tx) + Math.abs(a.y - ty);
      // Flip when the card is close to where it is going.
      if (a.shownUp !== wantUp && a.flip < 0 && a.wait <= 0 && (dist < l.cw * 0.6 || sp.zone === "tableau")) a.flip = 0;
      if (a.flip >= 0) {
        a.flip += dt / 0.2;
        if (a.flip >= 0.5 && a.shownUp !== wantUp) a.shownUp = wantUp;
        if (a.flip >= 1) a.flip = -1;
      }
      if (a.wobble > 0) a.wobble = Math.max(0, a.wobble - dt);
      const zone = sp.zone === "stock" ? 0 : sp.zone === "foundation" ? 1 : sp.zone === "waste" ? 2 : 3;
      z[id] = zone * 100 + sp.index + (dragged ? 30000 : dist > 3 ? 10000 : 0);
      if (dist > 3) movingCount++;
    }
    order.current.sort((p, q) => z[p] - z[q]);

    // Win: cards bounce off the table, leaving trails.
    if (phaseRef.current === "won") {
      winClock.current += dt;
      while (winQueue.current.length && winClock.current >= (52 - winQueue.current.length) * 0.2) {
        const id = winQueue.current.shift()!;
        const a = anims.current[id];
        a.released = true;
        const dir = Math.random() < 0.5 ? -1 : 1;
        bouncers.current.push({ id, x: a.x, y: a.y, vx: dir * (110 + Math.random() * 280), vy: -(120 + Math.random() * 380) });
      }
      if (!trail.current || trail.current.w !== view.w || trail.current.h !== view.h) {
        const cv = document.createElement("canvas");
        cv.width = Math.ceil(view.w * dpr);
        cv.height = Math.ceil(view.h * dpr);
        const tctx = cv.getContext("2d")!;
        tctx.scale(dpr, dpr);
        trail.current = { cv, ctx: tctx, w: view.w, h: view.h };
      }
      for (const b of bouncers.current) {
        b.vy += 1500 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y + l.ch > view.h) {
          b.y = view.h - l.ch;
          if (Math.abs(b.vy) > 160) bounceSound(Math.random());
          b.vy = -b.vy * 0.82;
        }
        const sp = sprites.current.face(b.id, l.cw, l.ch, dpr);
        trail.current.ctx.drawImage(sp, b.x, b.y, l.cw, l.ch);
      }
      bouncers.current = bouncers.current.filter((b) => b.x > -l.cw - 4 && b.x < view.w + 4);
    }

    // Draw the cards
    const ord = order.current;
    for (let i = 0; i < 52; i++) {
      const id = ord[i];
      const a = anims.current[id];
      if (a.released || !spots.get(id)) continue;
      const lifted = z[id] >= 10000;
      let x = a.x;
      if (a.wobble > 0) x += Math.sin(a.wobble * 60) * l.cw * 0.06 * (a.wobble / 0.35);
      // Card shadow
      ctx.save();
      roundRect(ctx, x + (lifted ? 3 : 1), a.y + (lifted ? 5 : 2), l.cw, l.ch, l.cw * 0.085);
      ctx.fillStyle = lifted ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.2)";
      ctx.fill();
      ctx.restore();
      const showFace = a.shownUp;
      const sprite = showFace ? sprites.current.face(id, l.cw, l.ch, dpr) : sprites.current.back(l.cw, l.ch, dpr);
      if (a.flip >= 0) {
        const sx = Math.max(0.02, Math.abs(1 - 2 * a.flip));
        ctx.save();
        ctx.translate(x + l.cw / 2, a.y);
        ctx.scale(sx, 1);
        ctx.drawImage(sprite, -l.cw / 2, 0, l.cw, l.ch);
        ctx.restore();
      } else ctx.drawImage(sprite, x, a.y, l.cw, l.ch);
    }
    if (phaseRef.current === "won" && trail.current) {
      ctx.drawImage(trail.current.cv, 0, 0, view.w, view.h);
      for (const b of bouncers.current) ctx.drawImage(sprites.current.face(b.id, l.cw, l.ch, dpr), b.x, b.y, l.cw, l.ch);
    }

    // Auto-complete: one card to a foundation every beat.
    if (autoRun.current && playing && movingCount < 3) {
      autoTimer.current -= dt;
      if (autoTimer.current <= 0) {
        const next = g.nextFoundationMove();
        if (next) {
          perform(next.src, next.dst);
          autoTimer.current = 0.12;
        } else autoRun.current = false;
      }
    }

    f.particles.update(dt);
    f.floaters.update(dt);
    f.particles.draw(ctx);
    f.floaters.draw(ctx);

    // HUD numbers, only when they change
    const sec = Math.floor(elapsed.current);
    const sh = shown.current;
    const canAuto = playing && g.canAutoComplete && !autoRun.current;
    const stuck = playing && !g.hasMoves && movingCount === 0;
    if (sh.score !== g.score || sh.moves !== g.moves || sh.time !== sec || sh.canUndo !== g.canUndo || sh.canAuto !== canAuto || sh.stuck !== stuck) {
      shown.current = { score: g.score, moves: g.moves, time: sec, canUndo: g.canUndo, canAuto, stuck };
      setStats({ score: g.score, moves: g.moves, time: sec, canUndo: g.canUndo, canAuto, stuck });
    }
    void time;
  };

  const startAuto = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    autoRun.current = true;
    autoTimer.current = 0;
  }, []);

  const playing = phase === "playing";
  const w = Math.max(280, areaW || 360);

  return (
    <div className="absolute inset-0 flex flex-col text-white" style={{ background: FELT_DARK }}>
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1.5" style={{ background: "rgba(0,0,0,0.28)" }}>
        <Stat label="Score" value={String(stats.score)} />
        <Stat label="Time" value={formatTime(stats.time)} />
        <Stat label="Moves" value={String(stats.moves)} />
        <span className="hidden rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-bold sm:inline">Draw {game.current.drawCount}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {stats.canAuto && (
            <button type="button" onClick={startAuto} className="animate-pulse rounded-lg px-3 py-2 text-sm font-black text-black" style={{ background: meta.accent }}>
              Auto-complete
            </button>
          )}
          <button
            type="button"
            onClick={doUndo}
            disabled={!playing || !stats.canUndo}
            aria-label="Undo"
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold transition hover:bg-white/20 active:scale-95 disabled:opacity-35 disabled:hover:bg-white/10"
          >
            ↶<span className="hidden sm:inline"> Undo</span>
          </button>
          <button
            type="button"
            onClick={() => setPhaseBoth("ready")}
            aria-label="New game"
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold transition hover:bg-white/20 active:scale-95"
          >
            ✦<span className="hidden sm:inline"> New game</span>
          </button>
        </div>
      </div>
      <div ref={areaRef} className="relative min-h-0 flex-1">
        <GameCanvas width={w} fit="fill" draw={draw} onPointer={onPointer} background={FELT_DARK} />
        {playing && stats.stuck && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-xs font-semibold text-amber-200 backdrop-blur">
            No moves left: undo, or start a new game
          </div>
        )}
      </div>

      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={startGame}
          accent={meta.accent}
          best={best || undefined}
          bestLabel="Best score"
          extra={
            <div className="mt-3 text-left">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-white/50">Draw</div>
              <div style={{ display: "flex", gap: 6 }}>
                {([1, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDrawMode(n)}
                    style={{
                      flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "1px solid rgba(255,255,255,0.18)",
                      background: drawMode === n ? meta.accent : "rgba(255,255,255,0.06)", color: drawMode === n ? "#04201a" : "#fff",
                    }}
                  >
                    {n === 1 ? "Draw 1 (easier)" : "Draw 3 (classic)"}
                  </button>
                ))}
              </div>
            </div>
          }
        />
      )}
      {phase === "won" && showWin && win && (
        <GameOverPanel title="You won!" score={win.score + win.bonus} scoreLabel="Final score" isBest={win.isBest} best={best || undefined} accent={meta.accent} onRestart={startGame}>
          <p className="mt-2 text-sm text-white/70">
            {win.score} points + {win.bonus} time bonus
          </p>
          <p className="text-xs text-white/50">
            {formatTime(win.time)} · {win.moves} moves · draw {game.current.drawCount}
          </p>
          <div className="mt-3">
            <SecondaryButton onClick={() => setPhaseBoth("ready")}>Change draw mode</SecondaryButton>
          </div>
        </GameOverPanel>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[52px] rounded-lg bg-white/10 px-2.5 py-0.5">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-white/55">{label}</div>
      <div className="text-base font-black leading-tight tabular-nums">{value}</div>
    </div>
  );
}
