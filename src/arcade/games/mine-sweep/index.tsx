// Mine Sweep: rules live in logic.ts (pure, seeded). This file draws the field on a canvas inside a
// scrollable box (so Expert is playable on a phone), handles mouse, touch and keys, and runs the
// start / pause / win / lose flow with best times per difficulty.
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Particles, Shake, easeOutBack, easeOutCubic } from "../../kit/draw";
import { useFrameLoop } from "../../kit/loop";
import { randomSeed } from "../../kit/rng";
import { play, tone } from "../../kit/sfx";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, PausePanel, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import {
  FLAG, HIDDEN, LEVELS, OPEN, chord, chordTargets, cleanTimes, cleared, levelById, mineReveals, minesLeft, newBoard, recordTime,
  reveal, toggleFlag, type Board, type LevelId, type Reveal, type Times,
} from "./logic";

type Ui = "ready" | "play" | "paused" | "over";
type Face = "smile" | "press" | "dead" | "cool";

const TIMES_KEY = "mine-sweep:times";
const LEVEL_KEY = "mine-sweep:level";

const NUM_COLORS = ["", "#1d4ed8", "#15803d", "#dc2626", "#1e1b8b", "#7f1d1d", "#0f766e", "#111827", "#6b7280"];
const FACE: Record<Face, string> = { smile: "🙂", press: "😮", dead: "😵", cool: "😎" };

/** Seconds as 12.3s under a minute, then m:ss. */
function fmt(t: number): string {
  if (t < 60) return `${t.toFixed(1)}s`;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const lcd = (n: number) => (n < 0 ? "-" : "") + String(Math.min(999, Math.abs(n))).padStart(n < 0 ? 2 : 3, "0");

interface Anim {
  revealAt: Float64Array;
  flagAt: Float64Array;
  boomAt: Float64Array;
  wrongAt: Float64Array;
  /** Draw until this time (seconds) even if nothing else asks for a frame. */
  until: number;
  winAt: number;
  loseAt: number;
}
const makeAnim = (n: number): Anim => ({
  revealAt: new Float64Array(n), flagAt: new Float64Array(n), boomAt: new Float64Array(n), wrongAt: new Float64Array(n), until: 0, winAt: 0, loseAt: 0,
});

export default function MineSweepGame({ touch, best, submitScore }: GameProps) {
  const [levelId, setLevelId] = useState<LevelId>(() => {
    const saved = loadState<string>(LEVEL_KEY);
    return LEVELS.some((l) => l.id === saved) ? (saved as LevelId) : "beginner";
  });
  const level = levelById(levelId);
  const [times, setTimes] = useState<Times>(() => cleanTimes(loadState(TIMES_KEY)));
  const [ui, setUi] = useState<Ui>("ready");
  const uiRef = useRef<Ui>("ready");
  const board = useRef<Board>(newBoard(level, randomSeed()));
  const anim = useRef<Anim>(makeAnim(level.cols * level.rows));
  const fx = useRef({ particles: new Particles(700), shake: new Shake(), lastConfetti: 0 });
  const [hud, setHud] = useState({ left: level.mines, secs: 0, face: "smile" as Face });
  const [flagMode, setFlagMode] = useState(false);
  const flagModeRef = useRef(false);
  const [result, setResult] = useState({ won: false, time: 0, isBest: false, pct: 0, minesLeft: 0 });
  const [banner, setBanner] = useState(false);
  const [zoomFit, setZoomFit] = useState(false);
  const [view, setView] = useState({ w: 0, h: 0 });
  const scroller = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(() => typeof window !== "undefined" && window.innerWidth > window.innerHeight * 1.3);
  const canvas = useRef<HTMLCanvasElement>(null);

  // ---- clock
  const clock = useRef({ t0: 0, pausedAt: 0, running: false, final: 0 });
  const elapsed = () => {
    const c = clock.current;
    if (!c.running) return c.final;
    return ((c.pausedAt || performance.now()) - c.t0) / 1000;
  };

  const overTimer = useRef(0);
  const dirty = useRef(true);
  const mark = () => {
    dirty.current = true;
  };
  const hover = useRef(-1);
  const press = useRef<{ i: number; id: number; x: number; y: number; long: boolean; timer: number } | null>(null);
  const pressed = useRef(-1);

  const go = useCallback((u: Ui) => {
    uiRef.current = u;
    setUi(u);
  }, []);

  const syncHud = useCallback((face?: Face) => {
    const b = board.current;
    setHud((h) => ({ left: minesLeft(b), secs: Math.floor(elapsed()), face: face ?? h.face }));
  }, []);

  /** Fresh board for a difficulty. */
  const reset = useCallback(
    (id: LevelId, toUi: Ui = "play") => {
      const lv = levelById(id);
      window.clearTimeout(overTimer.current);
      board.current = newBoard(lv, randomSeed());
      anim.current = makeAnim(lv.cols * lv.rows);
      fx.current.particles.clear();
      clock.current = { t0: 0, pausedAt: 0, running: false, final: 0 };
      hover.current = -1;
      pressed.current = -1;
      setBanner(false);
      setHud({ left: lv.mines, secs: 0, face: "smile" });
      mark();
      go(toUi);
    },
    [go],
  );
  const chooseLevel = (id: LevelId) => {
    saveState(LEVEL_KEY, id);
    setLevelId(id);
    reset(id, uiRef.current === "ready" ? "ready" : "play");
  };

  const start = useCallback(() => {
    play("select");
    reset(levelId, "play");
  }, [levelId, reset]);

  // ---- layout: pick a cell size that fits, or a comfortable one that scrolls
  useEffect(() => {
    const el = scroller.current;
    const rootEl = root.current;
    if (!el || !rootEl) return;
    const measure = () => {
      setView({ w: el.clientWidth, h: el.clientHeight });
      if (rootEl.clientWidth && rootEl.clientHeight) setSide(rootEl.clientWidth > rootEl.clientHeight * 1.3);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(rootEl);
    return () => ro.disconnect();
  }, []);
  const pad = 12;
  const minCell = touch ? 28 : 22;
  const fitCell = Math.floor(Math.min((view.w - pad * 2) / level.cols, (view.h - pad * 2) / level.rows));
  const cs = Math.max(12, Math.min(54, zoomFit ? fitCell : Math.max(fitCell, minCell)));
  const needsZoom = view.w > 0 && fitCell < minCell;
  const cw = cs * level.cols;
  const ch = cs * level.rows;
  const dpr = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const geom = useRef({ cs, cols: level.cols, rows: level.rows, dpr });
  geom.current = { cs, cols: level.cols, rows: level.rows, dpr };
  useEffect(() => {
    mark();
  }, [cs, dpr, levelId]);

  // ---- actions
  const afterReveal = (res: Reveal) => {
    const b = board.current;
    const f = fx.current;
    const a = anim.current;
    const now = performance.now() / 1000;
    const { cs: size, cols } = geom.current;
    if (!clock.current.running && b.phase !== "idle") clock.current = { t0: performance.now(), pausedAt: 0, running: true, final: 0 };
    if (res.opened.length) {
      let maxD = 0;
      res.opened.forEach((i, k) => {
        a.revealAt[i] = now + res.depth[k] * 0.02;
        maxD = Math.max(maxD, res.depth[k]);
      });
      a.until = Math.max(a.until, now + maxD * 0.02 + 0.4);
      if (res.opened.length > 1) {
        play("slide");
        tone(420 + Math.min(500, res.opened.length * 8), 0.08, "sine", 0.07, { delay: 0.02 });
      } else tone(560 + (b.adj[res.opened[0]] ?? 0) * 70, 0.05, "triangle", 0.12);
    }
    if (res.hitMine) {
      const bx = (b.exploded % cols) * size + size / 2;
      const by = Math.floor(b.exploded / cols) * size + size / 2;
      a.loseAt = now;
      a.boomAt[b.exploded] = now;
      mineReveals(b).forEach((i, k) => {
        a.boomAt[i] = now + 0.3 + Math.min(1.1, k * 0.04);
      });
      for (const i of b.wrongFlags) a.wrongAt[i] = now + 0.35;
      a.until = now + 2.2;
      f.particles.burst(bx, by, 46, { color: ["#ef4444", "#f97316", "#fde047", "#1f2937"], speed: 260, size: size * 0.16, life: 0.9, gravity: 320 });
      f.shake.add(0.9);
      play("explode");
      finish(false);
    } else if (res.won) {
      a.winAt = now;
      a.until = now + 3.5;
      f.lastConfetti = 0;
      play("win");
      finish(true);
    }
    mark();
    syncHud(b.phase === "playing" ? "smile" : undefined);
  };

  const finish = (won: boolean) => {
    const b = board.current;
    const t = Math.max(0.1, Math.round(elapsed() * 10) / 10);
    clock.current.running = false;
    clock.current.pausedAt = 0;
    clock.current.final = t;
    let isBest = false;
    if (won) {
      const rec = recordTime(times, b.level.id, t);
      isBest = rec.isBest;
      if (rec.isBest) {
        setTimes(rec.times);
        saveState(TIMES_KEY, rec.times);
      }
      if (b.level.id === "intermediate") submitScore(t);
    }
    setResult({ won, time: t, isBest, pct: Math.round(cleared(b) * 100), minesLeft: Math.max(0, minesLeft(b)) });
    setHud((h) => ({ ...h, face: won ? "cool" : "dead", secs: Math.floor(t) }));
    uiRef.current = "over";
    overTimer.current = window.setTimeout(() => setUi("over"), won ? 1500 : 1700);
  };

  const dig = (i: number) => {
    const b = board.current;
    if (b.state[i] === OPEN) return chordAt(i);
    if (b.state[i] === FLAG) return;
    afterReveal(reveal(b, i));
  };
  const chordAt = (i: number) => {
    const b = board.current;
    const res = chord(b, i);
    if (res.opened.length || res.hitMine) afterReveal(res);
    else tone(160, 0.05, "square", 0.05);
  };
  const flag = (i: number) => {
    const b = board.current;
    if (b.state[i] === OPEN) return chordAt(i);
    if (toggleFlag(b, i)) {
      const now = performance.now() / 1000;
      anim.current.flagAt[i] = now;
      anim.current.until = Math.max(anim.current.until, now + 0.4);
      if (b.state[i] === FLAG) play("place");
      else play("tick");
      if ("vibrate" in navigator) navigator.vibrate?.(8);
      mark();
      syncHud();
    }
  };

  /** What a tap does, and what a long-press / right-click does, depending on the mode. */
  const primary = (i: number) => (flagModeRef.current ? flag(i) : dig(i));
  const secondary = (i: number) => (flagModeRef.current ? dig(i) : flag(i));

  const playable = () => uiRef.current === "play" && board.current.phase !== "won" && board.current.phase !== "lost";

  const cellAt = (e: { clientX: number; clientY: number }): number => {
    const cv = canvas.current;
    if (!cv) return -1;
    const r = cv.getBoundingClientRect();
    const { cs: size, cols, rows } = geom.current;
    const x = Math.floor((e.clientX - r.left) / size);
    const y = Math.floor((e.clientY - r.top) / size);
    return x < 0 || y < 0 || x >= cols || y >= rows ? -1 : y * cols + x;
  };

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!playable()) return;
    const i = cellAt(e);
    if (i < 0) return;
    if (e.pointerType === "mouse") {
      if (e.button === 2) return secondary(i);
      if (e.button === 1 || e.buttons === 3) {
        e.preventDefault();
        return chordAt(i);
      }
      if (e.button !== 0) return;
    }
    const p = { i, id: e.pointerId, x: e.clientX, y: e.clientY, long: false, timer: 0 };
    if (e.pointerType !== "mouse") {
      p.timer = window.setTimeout(() => {
        const cur = press.current;
        if (!cur || cur.id !== p.id) return;
        cur.long = true;
        if ("vibrate" in navigator) navigator.vibrate?.(14);
        pressed.current = -1;
        secondary(cur.i);
        mark();
      }, 420);
    }
    press.current = p;
    pressed.current = i;
    setHud((h) => (h.face === "smile" ? { ...h, face: "press" } : h));
    mark();
  };
  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const i = cellAt(e);
    if (e.pointerType === "mouse") {
      if (hover.current !== i) {
        hover.current = i;
        if (press.current) pressed.current = i;
        mark();
      }
    }
    const p = press.current;
    if (p && e.pointerType !== "mouse" && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) endPress(false);
  };
  const endPress = (act: boolean, e?: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = press.current;
    if (!p) return;
    window.clearTimeout(p.timer);
    press.current = null;
    pressed.current = -1;
    setHud((h) => (h.face === "press" ? { ...h, face: "smile" } : h));
    mark();
    if (act && !p.long && playable()) {
      const i = e && e.pointerType === "mouse" ? cellAt(e) : p.i;
      if (i >= 0) primary(i);
    }
  };
  const onUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (press.current && press.current.id === e.pointerId) endPress(true, e);
  };
  const onLeave = () => {
    hover.current = -1;
    if (press.current && press.current.timer === 0) endPress(false);
    mark();
  };

  // ---- pause, timer and keys
  const pause = useCallback(() => {
    if (uiRef.current !== "play" || !clock.current.running) return;
    clock.current.pausedAt = performance.now();
    go("paused");
  }, [go]);
  const resume = useCallback(() => {
    const c = clock.current;
    if (c.pausedAt) {
      c.t0 += performance.now() - c.pausedAt;
      c.pausedAt = 0;
    }
    go("play");
    mark();
  }, [go]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!clock.current.running || clock.current.pausedAt) return;
      const s = Math.floor(elapsed());
      setHud((h) => (h.secs === s ? h : { ...h, secs: s }));
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  const onKey = useRef<(e: KeyboardEvent) => void>(() => {});
  onKey.current = (e) => {
    if (e.repeat) return;
    const u = uiRef.current;
    if (e.code === "KeyP" || e.code === "Escape") {
      if (u === "play") pause();
      else if (u === "paused") resume();
    } else if (e.code === "KeyF" && (u === "play" || u === "paused")) {
      flagModeRef.current = !flagModeRef.current;
      setFlagMode(flagModeRef.current);
    } else if (e.code === "KeyR" || e.code === "KeyN") {
      if (u === "play" || u === "over") reset(levelId, "play");
    } else if ((e.code === "Space" || e.code === "Enter") && u === "ready") start();
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => onKey.current(e);
    const away = () => {
      if (document.visibilityState === "hidden") pause();
    };
    window.addEventListener("keydown", down);
    document.addEventListener("visibilitychange", away);
    window.addEventListener("blur", pause);
    return () => {
      window.removeEventListener("keydown", down);
      document.removeEventListener("visibilitychange", away);
      window.removeEventListener("blur", pause);
    };
  }, [pause]);
  useEffect(() => () => window.clearTimeout(overTimer.current), []);

  const toggleMode = (m: boolean) => {
    flagModeRef.current = m;
    setFlagMode(m);
  };

  // ---- drawing
  useFrameLoop((dt) => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const f = fx.current;
    const a = anim.current;
    const b = board.current;
    const now = performance.now() / 1000;
    const busy = now < a.until || f.particles.items.length > 0 || f.shake.trauma > 0;
    if (!dirty.current && !busy) return;
    dirty.current = false;
    const { cs: size, cols, rows, dpr: ratio } = geom.current;
    const W = cols * size;
    const H = rows * size;
    if (cv.width !== Math.round(W * ratio) || cv.height !== Math.round(H * ratio)) {
      cv.width = Math.round(W * ratio);
      cv.height = Math.round(H * ratio);
    }

    // celebration: a steady shower of confetti after a win
    if (a.winAt && now - a.winAt < 2.6 && now - f.lastConfetti > 0.12) {
      f.lastConfetti = now;
      f.particles.burst(Math.random() * W, Math.random() * H * 0.5, 14, {
        color: ["#38bdf8", "#fde047", "#f472b6", "#4ade80", "#ffffff"], speed: 220, size: size * 0.2, life: 1.3, gravity: 380, shape: "square", angle: Math.PI / 2, spread: Math.PI * 1.2,
      });
    }
    f.particles.update(dt);
    f.shake.update(dt);

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const [sx, sy] = f.shake.offset(size * 0.35);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = "#171b2e";
    ctx.fillRect(-size, -size, W + size * 2, H + size * 2);

    const gap = Math.max(1, size * 0.06);
    const rad = size * 0.2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 ${Math.round(size * 0.62)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    const chordSet = pressed.current >= 0 && b.state[pressed.current] === OPEN ? chordTargets(b, pressed.current) : [];
    const lost = b.phase === "lost";
    const won = b.phase === "won";

    for (let i = 0; i < b.state.length; i++) {
      const cx = (i % cols) * size;
      const cy = Math.floor(i / cols) * size;
      const x = cx + gap;
      const y = cy + gap;
      const s = size - gap * 2;
      let st = b.state[i];
      const isMine = b.mine[i] === 1;
      // On a loss, mines uncover in a ripple from the blast; until their turn they look unrevealed.
      let showMine = false;
      if (lost && isMine && st !== FLAG) {
        const t = a.boomAt[i];
        showMine = i === b.exploded || (t > 0 && now >= t);
        if (!showMine) st = HIDDEN;
      }

      if (st === OPEN) {
        const t = a.revealAt[i] > 0 ? Math.min(1, Math.max(0, (now - a.revealAt[i]) / 0.22)) : 1;
        ctx.fillStyle = (i % cols + Math.floor(i / cols)) % 2 ? "#dfe4f3" : "#e7ebf7";
        roundRectPath(ctx, x, y, s, s, rad);
        ctx.fill();
        const n = b.adj[i];
        if (n > 0 && t > 0) {
          ctx.fillStyle = NUM_COLORS[n];
          const k = t < 1 ? 0.5 + 0.5 * easeOutBack(t) : 1;
          if (k !== 1) {
            ctx.save();
            ctx.translate(cx + size / 2, cy + size / 2 + size * 0.03);
            ctx.scale(k, k);
            ctx.fillText(String(n), 0, 0);
            ctx.restore();
          } else ctx.fillText(String(n), cx + size / 2, cy + size / 2 + size * 0.03);
        }
        if (t < 1) {
          // the unrevealed tile shrinks away over the top
          const inset = (s / 2) * easeOutCubic(t);
          ctx.globalAlpha = 1 - t;
          drawHidden(ctx, x + inset, y + inset, s - inset * 2, rad, false, false);
          ctx.globalAlpha = 1;
        }
      } else if (showMine) {
        const t = i === b.exploded ? 1 : Math.min(1, (now - a.boomAt[i]) / 0.25);
        ctx.fillStyle = i === b.exploded ? "#ef4444" : "#e7ebf7";
        roundRectPath(ctx, x, y, s, s, rad);
        ctx.fill();
        drawMine(ctx, cx + size / 2, cy + size / 2, size * 0.3 * (0.4 + 0.6 * easeOutBack(t)));
        if (i === b.exploded) {
          const bt = Math.min(1, (now - a.loseAt) / 0.5);
          ctx.strokeStyle = `rgba(254,240,138,${1 - bt})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx + size / 2, cy + size / 2, size * (0.4 + bt * 1.6), 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        const hot = (hover.current === i && playable() && st === HIDDEN) || chordSet.includes(i);
        const down = pressed.current === i && st === HIDDEN;
        drawHidden(ctx, x, y, s, rad, hot, down);
        if (st === FLAG) {
          const wrong = lost && a.wrongAt[i] > 0 && now >= a.wrongAt[i];
          let k = 1;
          if (a.flagAt[i] > 0) {
            const t = Math.min(1, (now - a.flagAt[i]) / 0.3);
            k = 0.3 + 0.7 * easeOutBack(t);
          }
          let lift = 0;
          if (won && a.winAt) {
            const t = now - a.winAt - (i % cols) * 0.02 - Math.floor(i / cols) * 0.02;
            if (t > 0 && t < 0.5) lift = Math.sin((t / 0.5) * Math.PI) * size * 0.25;
          }
          drawFlag(ctx, cx + size / 2, cy + size / 2 - lift, size * 0.34 * k);
          if (wrong) {
            ctx.strokeStyle = "#fef08a";
            ctx.lineWidth = Math.max(2, size * 0.1);
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(cx + size * 0.2, cy + size * 0.2);
            ctx.lineTo(cx + size * 0.8, cy + size * 0.8);
            ctx.moveTo(cx + size * 0.8, cy + size * 0.2);
            ctx.lineTo(cx + size * 0.2, cy + size * 0.8);
            ctx.stroke();
          }
        }
      }
    }
    f.particles.draw(ctx);
    ctx.restore();
  });

  const bestTimes = useMemo(
    () =>
      LEVELS.map((l) => ({ id: l.id, label: l.label, t: times[l.id] })),
    [times],
  );
  const mineLabel = `${level.cols}×${level.rows} · ${level.mines} mines`;

  const btn = "rounded-lg px-3 py-1.5 text-sm font-bold transition";
  const renderTabs = (vertical: boolean) => (
    <div className={`gap-1 rounded-xl bg-white/5 p-1 ${vertical ? "grid grid-cols-1" : "flex"}`} role="tablist" aria-label="Difficulty">
      {LEVELS.map((l) => (
        <button
          key={l.id}
          type="button"
          role="tab"
          aria-selected={l.id === levelId}
          onClick={() => chooseLevel(l.id)}
          className={`${btn} flex-1 whitespace-nowrap ${vertical ? "text-left" : ""} ${l.id === levelId ? "text-black" : "text-white/70 hover:bg-white/10"}`}
          style={l.id === levelId ? { background: meta.accent } : undefined}
        >
          {l.label}
          {vertical && <span className="ml-1 text-[10px] font-semibold opacity-60">{l.cols}×{l.rows}</span>}
        </button>
      ))}
    </div>
  );
  const tabs = renderTabs(side);
  const status = (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <div className="min-w-[4.4rem] rounded-lg bg-black/50 px-2 py-1.5 text-center font-mono text-xl font-bold tabular-nums text-red-400" title="Mines left" aria-label="Mines left">
        <span className="mr-1 text-sm">💣</span>
        {lcd(hud.left)}
      </div>
      <button
        type="button"
        onClick={() => reset(levelId, "play")}
        aria-label="New game"
        title="New game"
        className="h-11 w-11 shrink-0 rounded-xl bg-white/10 text-2xl transition hover:bg-white/20 active:scale-95"
      >
        {FACE[hud.face]}
      </button>
      <div className="min-w-[4.4rem] rounded-lg bg-black/50 px-2 py-1.5 text-center font-mono text-xl font-bold tabular-nums text-sky-300" title="Time" aria-label="Time">
        <span className="mr-1 text-sm">⏱</span>
        {lcd(hud.secs)}
      </div>
    </div>
  );
  const pauseBtn = (
    <button
      type="button"
      onClick={pause}
      disabled={ui !== "play" || !clock.current.running}
      aria-label="Pause"
      title="Pause (P)"
      className="h-11 w-11 shrink-0 rounded-lg bg-white/10 text-sm hover:bg-white/20 disabled:opacity-35"
    >
      ⏸
    </button>
  );
  const mode = (
    <div className="flex flex-1 gap-1 rounded-xl bg-white/5 p-1" role="group" aria-label="Tap action">
      <button
        type="button"
        onClick={() => toggleMode(false)}
        aria-pressed={!flagMode}
        className={`${btn} flex-1 ${!flagMode ? "bg-white text-black" : "text-white/70 hover:bg-white/10"}`}
      >
        ⛏ Dig
      </button>
      <button
        type="button"
        onClick={() => toggleMode(true)}
        aria-pressed={flagMode}
        className={`${btn} flex-1 ${flagMode ? "bg-white text-black" : "text-white/70 hover:bg-white/10"}`}
      >
        🚩 Flag
      </button>
    </div>
  );
  const zoom = needsZoom ? (
    <button
      type="button"
      onClick={() => setZoomFit((z) => !z)}
      className="h-10 shrink-0 rounded-lg bg-white/10 px-3 text-xs font-bold hover:bg-white/20"
      title={zoomFit ? "Zoom in for easier tapping" : "Fit the whole board on screen"}
    >
      {zoomFit ? "Zoom in" : "Fit board"}
    </button>
  ) : null;

  return (
    <div ref={root} className={`absolute inset-0 flex bg-[#0d1020] text-white ${side ? "flex-row" : "flex-col"}`}>
      {side ? (
        <div className="flex w-60 shrink-0 flex-col justify-center gap-3 overflow-y-auto border-r border-white/10 px-3 py-2">
          {tabs}
          {status}
          <div className="flex gap-2">
            {mode}
            {pauseBtn}
          </div>
          {zoom}
          <div className="text-center text-[11px] text-white/45">{mineLabel}</div>
        </div>
      ) : (
        <div className="shrink-0 space-y-2 border-b border-white/10 px-3 py-2">
          {tabs}
          <div className="flex items-center gap-2">
            {status}
            <div className="ml-auto">{pauseBtn}</div>
          </div>
        </div>
      )}

      <div className="relative min-h-0 min-w-0 flex-1">
        <div ref={scroller} className="absolute inset-0 flex overflow-auto" style={{ overscrollBehavior: "contain" }}>
          <div className="m-auto p-3">
            <canvas
              ref={canvas}
              style={{
                width: cw, height: ch, touchAction: "pan-x pan-y", display: "block", opacity: ui === "paused" ? 0 : 1, WebkitTouchCallout: "none", userSelect: "none",
                borderRadius: 10, boxShadow: "0 0 0 2px rgba(56,189,248,0.25)",
              }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={() => endPress(false)}
              onPointerLeave={onLeave}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={`Mine field, ${mineLabel}`}
            />
          </div>
        </div>
        {banner && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
            <div className="rounded-full bg-black/75 px-4 py-1.5 text-xs font-semibold text-white/85">
              {result.won ? "Cleared!" : "Boom!"} Tap {FACE[hud.face]} for a new game
            </div>
          </div>
        )}
      </div>

      {!side && (
        <div className="flex shrink-0 items-center gap-2 border-t border-white/10 px-3 py-2">
          {mode}
          {zoom}
        </div>
      )}

      {ui === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          extra={
            <div className="mt-3 space-y-2 text-left">
              {renderTabs(false)}
              <div className="text-center text-xs text-white/50">{mineLabel}</div>
              <div className="grid grid-cols-3 gap-1 text-center text-[11px] text-white/55">
                {bestTimes.map((b) => (
                  <div key={b.id} className="rounded-lg bg-white/5 px-1 py-1.5">
                    <div className="text-white/40">{b.label}</div>
                    <div className="text-sm font-bold text-white">{b.t ? fmt(b.t) : "-"}</div>
                  </div>
                ))}
              </div>
            </div>
          }
        />
      )}
      {ui === "paused" && <PausePanel accent={meta.accent} onResume={resume} onRestart={() => reset(levelId, "play")} />}
      {ui === "over" && !banner && (
        <GameOverPanel
          accent={result.won ? "#4ade80" : "#ef4444"}
          title={result.won ? "Field cleared!" : "Boom!"}
          scoreLabel={result.won ? "Time" : "Cleared"}
          score={result.won ? fmt(result.time) : `${result.pct}%`}
          best={times[levelId] ? fmt(times[levelId] as number) : undefined}
          isBest={result.won && result.isBest}
          onRestart={() => reset(levelId, "play")}
        >
          <p className="mt-2 text-xs text-white/55">
            {level.label} · {mineLabel}
            {!result.won && result.minesLeft > 0 ? ` · ${result.minesLeft} still hiding` : ""}
          </p>
          {levelId === "intermediate" && best > 0 && <p className="mt-1 text-[11px] text-white/45">Arcade best (Intermediate): {fmt(best)}</p>}
          <div className="mt-3">
            <SecondaryButton onClick={() => setBanner(true)}>View the board</SecondaryButton>
          </div>
        </GameOverPanel>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- canvas pieces

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawHidden(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, r: number, hot: boolean, down: boolean) {
  ctx.fillStyle = down ? "#3b4ba8" : hot ? "#6f86f7" : "#5870e6";
  roundRectPath(ctx, x, y, s, s, r);
  ctx.fill();
  if (!down) {
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    roundRectPath(ctx, x + s * 0.08, y + s * 0.07, s * 0.84, s * 0.34, r * 0.8);
    ctx.fill();
    ctx.fillStyle = "rgba(10,14,50,0.28)";
    roundRectPath(ctx, x + s * 0.06, y + s * 0.84, s * 0.88, s * 0.12, r * 0.5);
    ctx.fill();
  }
}

function drawFlag(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.fillStyle = "#111827";
  ctx.fillRect(cx - r * 0.08, cy - r * 1.05, r * 0.16, r * 2.1);
  ctx.fillRect(cx - r * 0.7, cy + r * 0.85, r * 1.4, r * 0.24);
  ctx.fillStyle = "#ff4d5e";
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.08, cy - r * 1.05);
  ctx.lineTo(cx + r * 0.95, cy - r * 0.55);
  ctx.lineTo(cx + r * 0.08, cy - r * 0.0);
  ctx.closePath();
  ctx.fill();
}

function drawMine(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = Math.max(1.5, r * 0.28);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 4;
    ctx.moveTo(cx - Math.cos(a) * r * 1.45, cy - Math.sin(a) * r * 1.45);
    ctx.lineTo(cx + Math.cos(a) * r * 1.45, cy + Math.sin(a) * r * 1.45);
  }
  ctx.stroke();
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
}
