// Four in a Row: a canvas board with falling, bouncing discs, a glowing winning line, a ghost preview of
// where a disc will land, and an AI that runs in a module Web Worker. Rules are in logic.ts, the engine in ai.ts.
import { useCallback, useEffect, useRef, useState } from "react";
import { GameCanvas, type CanvasPointer, type View } from "../../kit/GameCanvas";
import { Floaters, Particles, Shake, text } from "../../kit/draw";
import { useKeyPress } from "../../kit/input";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import { chooseColumn, LEVELS } from "./ai";
import type { AiReply, AiRequest } from "./ai.worker";
import { COLS, ROWS, canPlay, isFull, landingRow, newBoard, play, undo, winLine, type Board, type Player } from "./logic";
import { dropSound, drawSound, landSound, loseSound, poofSound, tickSound, winSound } from "./sounds";

const CELL = 80;
const W = COLS * CELL + 80;
const BOARD_X = 40;
const BOARD_Y = 104;
const H = BOARD_Y + ROWS * CELL + 56;
const DISC_R = CELL * 0.44;
const HOLE_R = CELL * 0.4;
const GRAVITY = 3000;
const SPAWN_Y = BOARD_Y - CELL * 0.55;
const STREAK_KEY = "four-in-a-row:streak";
const SETUP_KEY = "four-in-a-row:setup";

const RED = { hi: "#ff9b8f", mid: "#ef4444", lo: "#a11d1d", name: "Red", glow: "#fecaca" };
const YELLOW = { hi: "#fff2a8", mid: "#facc15", lo: "#b7860b", name: "Yellow", glow: "#fef08a" };
const colorOf = (p: Player) => (p === 1 ? RED : YELLOW);

type Phase = "ready" | "playing" | "over";
type Mode = "ai" | "two";
interface Setup {
  mode: Mode;
  level: number;
  youFirst: boolean;
}
interface Disc {
  col: number;
  row: number;
  p: Player;
  y: number;
  vy: number;
  settled: boolean;
  bounces: number;
}
interface Ui {
  turn: Player;
  thinking: boolean;
  moves: number;
  over: boolean;
}
interface Outcome {
  title: string;
  detail: string;
  streak: number;
  mode: Mode;
  winner: Player | 0;
}

const targetY = (row: number) => BOARD_Y + (ROWS - 1 - row) * CELL + CELL / 2;
const cx = (col: number) => BOARD_X + col * CELL + CELL / 2;

// The plate with a hole for every cell, as one even-odd path.
const PLATE = (() => {
  if (typeof Path2D === "undefined") return null;
  const p = new Path2D();
  const x = BOARD_X - 12;
  const y = BOARD_Y - 12;
  const w = COLS * CELL + 24;
  const h = ROWS * CELL + 24;
  const r = 26;
  p.moveTo(x + r, y);
  p.arcTo(x + w, y, x + w, y + h, r);
  p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r);
  p.arcTo(x, y, x + w, y, r);
  p.closePath();
  for (let c = 0; c < COLS; c++) {
    for (let r2 = 0; r2 < ROWS; r2++) {
      p.moveTo(cx(c) + HOLE_R, BOARD_Y + r2 * CELL + CELL / 2);
      p.arc(cx(c), BOARD_Y + r2 * CELL + CELL / 2, HOLE_R, 0, Math.PI * 2);
    }
  }
  return p;
})();

function drawDisc(ctx: CanvasRenderingContext2D, x: number, y: number, p: Player, alpha = 1, scale = 1) {
  const c = colorOf(p);
  const r = DISC_R * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, c.hi);
  g.addColorStop(0.45, c.mid);
  g.addColorStop(1, c.lo);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.66 - 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export default function FourInARow({ touch, best, submitScore }: GameProps) {
  const board = useRef<Board>(newBoard());
  const discs = useRef<Disc[]>([]);
  const fx = useRef({ particles: new Particles(), shake: new Shake(), floaters: new Floaters() });
  const hover = useRef(-1);
  const pressed = useRef(false);
  const kbCol = useRef(3);
  const phaseRef = useRef<Phase>("ready");
  const setupRef = useRef<Setup>({ mode: "ai", level: 1, youFirst: true });
  const aiPlayer = useRef<Player | 0>(2);
  const reqState = useRef<"idle" | "waiting" | "ready">("idle");
  const aiCol = useRef(-1);
  const reqId = useRef(0);
  const reqStart = useRef(0);
  const pending = useRef<AiRequest | null>(null);
  const worker = useRef<Worker | null>(null);
  const endHandled = useRef(false);
  const winCells = useRef<number[] | null>(null);
  const winClock = useRef(0);
  const confettiClock = useRef(0);
  const clock = useRef(0);
  const timers = useRef<number[]>([]);
  const streakRef = useRef(0);

  const [setup, setSetup] = useState<Setup>(() => {
    const s = loadState<Partial<Setup>>(SETUP_KEY);
    return { mode: s?.mode === "two" ? "two" : "ai", level: typeof s?.level === "number" && s.level >= 0 && s.level < LEVELS.length ? s.level : 1, youFirst: s?.youFirst !== false };
  });
  const [phase, setPhase] = useState<Phase>("ready");
  const [ui, setUi] = useState<Ui>({ turn: 1, thinking: false, moves: 0, over: false });
  const [streak, setStreak] = useState<number>(() => loadState<number>(STREAK_KEY) ?? 0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [showOver, setShowOver] = useState(false);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(
    () => () => {
      worker.current?.terminate();
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const syncUi = useCallback((thinking = false) => {
    const b = board.current;
    setUi({ turn: b.turn, thinking, moves: b.moves.length, over: !!b.winner || isFull(b) });
  }, []);

  const settled = () => discs.current.every((d) => d.settled);
  const humanTurn = () => setupRef.current.mode === "two" || board.current.turn !== aiPlayer.current;
  const canInput = () => phaseRef.current === "playing" && !endHandled.current && !board.current.winner && !isFull(board.current) && humanTurn() && reqState.current === "idle";

  // ------------------------------------------------------------ AI plumbing
  const handleReply = (r: AiReply) => {
    if (r.id !== reqId.current || r.col === null) return;
    aiCol.current = r.col;
    reqState.current = "ready";
  };
  const runLocally = (req: AiRequest) => {
    later(() => {
      if (req.id !== reqId.current) return;
      const b = newBoard();
      for (const c of req.moves) play(b, c);
      const r = chooseColumn(b, req.level);
      handleReply({ id: req.id, col: r ? r.col : null });
    }, 30);
  };
  const getWorker = (): Worker | null => {
    if (worker.current) return worker.current;
    try {
      const wk = new Worker(new URL("./ai.worker.ts", import.meta.url), { type: "module" });
      wk.onmessage = (e: MessageEvent<AiReply>) => handleReply(e.data);
      wk.onerror = () => {
        wk.terminate();
        worker.current = null;
        if (pending.current) runLocally(pending.current);
      };
      worker.current = wk;
      return wk;
    } catch {
      return null;
    }
  };
  const requestAi = () => {
    const id = ++reqId.current;
    const req: AiRequest = { id, moves: board.current.moves.slice(), level: setupRef.current.level };
    pending.current = req;
    reqState.current = "waiting";
    reqStart.current = clock.current;
    syncUi(true);
    const wk = getWorker();
    if (wk) wk.postMessage(req);
    else runLocally(req);
  };

  // ------------------------------------------------------------ moves
  const drop = (col: number) => {
    const b = board.current;
    const p = b.turn;
    const row = play(b, col);
    if (row < 0) return false;
    discs.current.push({ col, row, p, y: SPAWN_Y, vy: 150, settled: false, bounces: 0 });
    dropSound();
    syncUi(false);
    return true;
  };

  const humanDrop = (col: number) => {
    if (col < 0 || !canInput() || !canPlay(board.current, col)) return;
    hover.current = -1;
    drop(col);
  };

  const finishGame = () => {
    endHandled.current = true;
    const b = board.current;
    const line = winLine(b);
    winCells.current = line;
    winClock.current = 0;
    const mode = setupRef.current.mode;
    const winner = b.winner;
    let title: string;
    let detail = "";
    let st = streakRef.current;
    if (winner === 0) {
      title = "It's a draw";
      detail = "The board is full: nobody lined up four.";
      drawSound();
    } else if (mode === "two") {
      title = `${colorOf(winner).name} wins!`;
      detail = `Four in a row after ${b.moves.length} discs.`;
      winSound();
    } else if (winner !== aiPlayer.current) {
      st += 1;
      streakRef.current = st;
      setStreak(st);
      saveState(STREAK_KEY, st);
      submitScore(st);
      title = "You win!";
      detail = `Four in a row after ${b.moves.length} discs.`;
      winSound();
    } else {
      st = 0;
      streakRef.current = 0;
      setStreak(0);
      saveState(STREAK_KEY, 0);
      title = "You lose";
      detail = "The computer lined up four.";
      loseSound();
    }
    if (line) {
      for (const cell of line) {
        const col = cell % COLS;
        const row = Math.floor(cell / COLS);
        fx.current.particles.burst(cx(col), targetY(row), 14, { color: [colorOf(b.cells[cell] as Player).hi, "#ffffff"], speed: 220, size: 5, gravity: 260, life: 0.9 });
      }
      fx.current.shake.add(0.35);
    }
    setOutcome({ title, detail, streak: st, mode, winner });
    syncUi(false);
    setShowOver(false);
    later(() => {
      if (phaseRef.current === "playing") setPhaseBoth("over");
      setShowOver(true);
    }, 1700);
  };

  const startGame = () => {
    saveState(SETUP_KEY, setup);
    setupRef.current = setup;
    aiPlayer.current = setup.mode === "ai" ? (setup.youFirst ? 2 : 1) : 0;
    reqId.current++;
    reqState.current = "idle";
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    board.current = newBoard();
    discs.current = [];
    winCells.current = null;
    endHandled.current = false;
    hover.current = -1;
    kbCol.current = 3;
    fx.current.particles.clear();
    streakRef.current = loadState<number>(STREAK_KEY) ?? 0;
    setOutcome(null);
    setShowOver(false);
    setPhaseBoth("playing");
    syncUi(false);
  };

  const undoMove = () => {
    if (phaseRef.current !== "playing" || endHandled.current) return;
    const b = board.current;
    if (b.moves.length === 0 || !settled()) return;
    const ai = setupRef.current.mode === "ai";
    // Take back the computer's reply as well, so it is your turn again.
    const n = ai && b.turn !== aiPlayer.current ? 2 : 1;
    reqId.current++;
    reqState.current = "idle";
    for (let i = 0; i < n && b.moves.length > 0; i++) {
      const col = undo(b);
      const idx = discs.current.findIndex((d) => d.col === col && d.row === b.heights[col]);
      if (idx >= 0) {
        const d = discs.current[idx];
        fx.current.particles.burst(cx(d.col), d.y, 10, { color: [colorOf(d.p).mid, colorOf(d.p).hi], speed: 120, size: 4, gravity: 120, life: 0.5 });
        discs.current.splice(idx, 1);
      }
    }
    poofSound();
    syncUi(false);
  };

  const dropAtCursor = () => humanDrop(kbCol.current);

  useKeyPress((code) => {
    const p = phaseRef.current;
    if (p === "ready") {
      if (code === "Enter" || code === "Space") startGame();
      return;
    }
    if (p !== "playing") return;
    if (code === "KeyZ") undoMove();
    else if (code === "ArrowLeft" || code === "KeyA") {
      kbCol.current = Math.max(0, kbCol.current - 1);
      hover.current = kbCol.current;
      tickSound();
    } else if (code === "ArrowRight" || code === "KeyD") {
      kbCol.current = Math.min(COLS - 1, kbCol.current + 1);
      hover.current = kbCol.current;
      tickSound();
    } else if (code === "Space" || code === "Enter" || code === "ArrowDown" || code === "KeyS") dropAtCursor();
    else if (/^(Digit|Numpad)[1-7]$/.test(code)) humanDrop(Number(code.slice(-1)) - 1);
  });

  // ------------------------------------------------------------ pointer
  const colAt = (x: number) => Math.max(0, Math.min(COLS - 1, Math.floor((x - BOARD_X) / CELL)));
  const onPointer = (p: CanvasPointer) => {
    if (phaseRef.current !== "playing") return;
    const isMouse = p.pointerType === "mouse";
    const col = colAt(p.x);
    if (p.type === "move") {
      if (isMouse || pressed.current) {
        if (hover.current !== col && pressed.current) tickSound();
        hover.current = col;
        kbCol.current = col;
      }
    } else if (p.type === "down") {
      hover.current = col;
      kbCol.current = col;
      if (isMouse) humanDrop(col);
      else pressed.current = true;
    } else if (p.type === "up") {
      if (!isMouse && pressed.current) {
        pressed.current = false;
        const c = hover.current;
        hover.current = -1;
        if (p.y > BOARD_Y - CELL * 1.6) humanDrop(c);
      }
    } else if (p.type === "cancel") {
      pressed.current = false;
      hover.current = -1;
    }
  };

  // ------------------------------------------------------------ frame
  const draw = (ctx: CanvasRenderingContext2D, _view: View, dt: number, time: number) => {
    clock.current = time;
    const f = fx.current;
    const b = board.current;
    const playing = phaseRef.current !== "ready";

    // Physics: discs fall, hit their cell and bounce a couple of times.
    for (const d of discs.current) {
      if (d.settled) continue;
      d.vy += GRAVITY * dt;
      d.y += d.vy * dt;
      const ty = targetY(d.row);
      if (d.y >= ty) {
        const impact = d.vy;
        d.y = ty;
        if (impact > 220) {
          landSound(impact / 1800, d.col);
          f.particles.burst(cx(d.col), ty + DISC_R * 0.7, d.bounces === 0 ? 8 : 3, { color: ["#bfdbfe", "#ffffff"], speed: 90, size: 3, gravity: 220, life: 0.35, spread: Math.PI, angle: -Math.PI / 2 });
          if (d.bounces === 0) f.shake.add(0.12);
        }
        d.vy = -impact * 0.36;
        d.bounces++;
        if (Math.abs(d.vy) < 110 || d.bounces > 4) {
          d.vy = 0;
          d.y = ty;
          d.settled = true;
        }
      }
    }

    // Game flow once everything has settled: end of game, or the computer's turn.
    if (phaseRef.current === "playing" && settled()) {
      if (!endHandled.current && (b.winner || isFull(b))) finishGame();
      else if (!endHandled.current && setupRef.current.mode === "ai" && b.turn === aiPlayer.current) {
        if (reqState.current === "idle") requestAi();
        else if (reqState.current === "ready" && time - reqStart.current > 0.55) {
          reqState.current = "idle";
          drop(aiCol.current);
        }
      }
    }

    f.particles.update(dt);
    f.floaters.update(dt);
    f.shake.update(dt);
    if (winCells.current) {
      winClock.current += dt;
      confettiClock.current -= dt;
      if (confettiClock.current <= 0 && winClock.current < 2.4 && b.winner) {
        confettiClock.current = 0.14;
        const c = colorOf(b.winner);
        f.particles.burst(BOARD_X + Math.random() * COLS * CELL, BOARD_Y - 30, 6, { color: [c.mid, c.hi, "#ffffff", "#60a5fa"], speed: 90, size: 5, gravity: 420, life: 1.6, shape: "square", spread: Math.PI, angle: Math.PI / 2 });
      }
    }

    const [sx, sy] = f.shake.offset(8);
    ctx.save();
    ctx.translate(sx, sy);

    // Backdrop: a soft glow that fades out before the canvas edges, so the letterbox blends in.
    ctx.fillStyle = "#070b1a";
    ctx.fillRect(-20, -20, W + 40, H + 40);
    const glow = ctx.createRadialGradient(W / 2, H * 0.5, 40, W / 2, H * 0.5, 320);
    glow.addColorStop(0, "rgba(70,110,220,0.22)");
    glow.addColorStop(1, "rgba(70,110,220,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Dark recess behind the plate, so empty holes look deep.
    ctx.fillStyle = "#050814";
    ctx.fillRect(BOARD_X - 4, BOARD_Y - 4, COLS * CELL + 8, ROWS * CELL + 8);

    // Hover column + landing preview (seen through the holes).
    const interactive = phaseRef.current === "playing" && canInput() && settled();
    const hc = interactive ? hover.current : -1;
    if (hc >= 0 && canPlay(b, hc)) {
      ctx.fillStyle = "rgba(255,255,255,0.09)";
      ctx.fillRect(BOARD_X + hc * CELL, BOARD_Y, CELL, ROWS * CELL);
      const lr = landingRow(b, hc);
      if (lr >= 0) drawDisc(ctx, cx(hc), targetY(lr), b.turn, 0.38 + Math.sin(time * 6) * 0.08);
    }

    // Discs (behind the plate)
    const line = winCells.current;
    const lineSet = line ? new Set(line) : null;
    const wonNow = !!line && winClock.current > 0.2;
    for (const d of discs.current) {
      const inLine = lineSet ? lineSet.has(d.row * COLS + d.col) : false;
      const dim = wonNow && !inLine ? 0.45 : 1;
      drawDisc(ctx, cx(d.col), d.y, d.p, dim);
    }

    // The plate
    if (PLATE) {
      const g = ctx.createLinearGradient(0, BOARD_Y, 0, BOARD_Y + ROWS * CELL);
      g.addColorStop(0, "#3d7bf0");
      g.addColorStop(1, "#1f4fc4");
      ctx.fillStyle = g;
      ctx.fill(PLATE, "evenodd");
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 2;
      ctx.stroke(PLATE);
    } else {
      ctx.fillStyle = "#2f66d8";
      ctx.fillRect(BOARD_X - 12, BOARD_Y - 12, COLS * CELL + 24, ROWS * CELL + 24);
    }
    // Hole rims
    ctx.lineWidth = 3;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const x = cx(c);
        const y = BOARD_Y + r * CELL + CELL / 2;
        ctx.strokeStyle = "rgba(10,30,100,0.7)";
        ctx.beginPath();
        ctx.arc(x, y, HOLE_R + 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.arc(x, y, HOLE_R + 3, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
      }
    }
    // Stand
    ctx.fillStyle = "#14307a";
    ctx.fillRect(BOARD_X - 4, BOARD_Y + ROWS * CELL + 10, 30, 26);
    ctx.fillRect(BOARD_X + COLS * CELL - 26, BOARD_Y + ROWS * CELL + 10, 30, 26);

    // Winning line glow
    if (line && wonNow) {
      const pulse = 0.6 + Math.sin(winClock.current * 7) * 0.4;
      const wc = colorOf(b.winner as Player);
      const pts = line.map((cell) => [cx(cell % COLS), targetY(Math.floor(cell / COLS))]);
      const sorted = pts.slice().sort((a, z) => a[0] - z[0] || a[1] - z[1]);
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + pulse * 0.3})`;
      ctx.lineWidth = 9;
      ctx.shadowColor = wc.glow;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.moveTo(sorted[0][0], sorted[0][1]);
      ctx.lineTo(sorted[sorted.length - 1][0], sorted[sorted.length - 1][1]);
      ctx.stroke();
      ctx.lineWidth = 5;
      for (const [x, y] of pts) {
        ctx.strokeStyle = `rgba(255,255,255,${0.7 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, DISC_R + 3 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Ghost disc hovering over the column
    if (hc >= 0 && canPlay(b, hc)) {
      const bob = Math.sin(time * 5) * 3;
      drawDisc(ctx, cx(hc), SPAWN_Y + bob, b.turn, 0.95);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.moveTo(cx(hc) - 9, BOARD_Y - 22);
      ctx.lineTo(cx(hc) + 9, BOARD_Y - 22);
      ctx.lineTo(cx(hc), BOARD_Y - 10);
      ctx.closePath();
      ctx.fill();
    } else if (!playing) {
      text(ctx, "Pick a mode to start", W / 2, SPAWN_Y, { size: 20, color: "rgba(255,255,255,0.4)" });
    }

    f.particles.draw(ctx);
    f.floaters.draw(ctx);
    ctx.restore();
  };

  // ------------------------------------------------------------ DOM around the canvas
  const youAre: Player | 0 = phase === "ready" ? 0 : aiPlayer.current === 0 ? 0 : aiPlayer.current === 1 ? 2 : 1;
  const turnName = ui.over
    ? "Game over"
    : ui.thinking
      ? "Computer is thinking"
      : setupRef.current.mode === "two"
        ? `${colorOf(ui.turn).name}'s turn`
        : ui.turn === youAre
          ? "Your turn"
          : "Computer's turn";
  const canUndoNow = phase === "playing" && ui.moves > (setupRef.current.mode === "ai" && aiPlayer.current === 1 ? 1 : 0) && !ui.over && !ui.thinking;

  return (
    <div className="absolute inset-0 flex flex-col text-white" style={{ background: "#070b1a" }}>
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ minHeight: 48 }}>
        <span
          aria-hidden="true"
          className="inline-block h-6 w-6 rounded-full"
          style={{ background: `radial-gradient(circle at 35% 30%, ${colorOf(ui.turn).hi}, ${colorOf(ui.turn).mid} 55%, ${colorOf(ui.turn).lo})`, boxShadow: "0 2px 0 rgba(0,0,0,0.4)", opacity: phase === "ready" ? 0.4 : 1 }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-extrabold">{phase === "ready" ? "Four in a Row" : turnName}</div>
          <div className="truncate text-[11px] text-white/55">
            {phase === "ready" ? "7 x 6 board, connect four" : setupRef.current.mode === "ai" ? `vs Computer, ${LEVELS[setupRef.current.level].name}` : "Two players, one device"}
          </div>
        </div>
        {phase !== "ready" && setupRef.current.mode === "ai" && (
          <div className="rounded-lg bg-white/10 px-2.5 py-1 text-right">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-white/55">Win streak</div>
            <div className="text-lg font-black leading-tight tabular-nums">{streak}</div>
          </div>
        )}
      </div>
      <div className="relative min-h-0 flex-1" onPointerLeave={() => { if (!pressed.current) hover.current = -1; }}>
        <GameCanvas width={W} height={H} draw={draw} onPointer={onPointer} background="#070b1a" cursor={ui.over ? "default" : "pointer"} />
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2 px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={undoMove}
          disabled={!canUndoNow}
          className="rounded-xl bg-white/10 py-2.5 text-sm font-bold transition hover:bg-white/20 active:scale-95 disabled:opacity-35 disabled:hover:bg-white/10"
        >
          ↶ Undo
        </button>
        <button type="button" onClick={() => setPhaseBoth("ready")} className="rounded-xl bg-white/10 py-2.5 text-sm font-bold transition hover:bg-white/20 active:scale-95">
          ✦ New game
        </button>
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
          bestLabel="Best win streak"
          extra={<SetupPicker setup={setup} onChange={setSetup} />}
        />
      )}
      {phase === "over" && showOver && outcome && (
        <GameOverPanel
          title={outcome.title}
          score={outcome.mode === "ai" ? outcome.streak : ui.moves}
          scoreLabel={outcome.mode === "ai" ? "Win streak" : "Discs played"}
          isBest={outcome.mode === "ai" && outcome.winner !== 0 && outcome.winner !== aiPlayer.current && outcome.streak >= best && outcome.streak > 0}
          accent={meta.accent}
          onRestart={startGame}
        >
          <p className="mt-2 text-sm text-white/70">{outcome.detail}</p>
          <div className="mt-3 space-y-2">
            <SecondaryButton onClick={() => setShowOver(false)}>View board</SecondaryButton>
            <SecondaryButton onClick={() => setPhaseBoth("ready")}>Change mode</SecondaryButton>
          </div>
        </GameOverPanel>
      )}
      {phase === "over" && !showOver && (
        <button type="button" onClick={() => setShowOver(true)} className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold backdrop-blur">
          Show result
        </button>
      )}
    </div>
  );
}

function SetupPicker({ setup, onChange }: { setup: Setup; onChange: (s: Setup) => void }) {
  const seg = (active: boolean) => ({
    flex: 1, padding: "7px 4px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "1px solid rgba(255,255,255,0.18)",
    background: active ? meta.accent : "rgba(255,255,255,0.06)", color: active ? "#06142e" : "#fff",
  });
  const label = "mb-1 text-[11px] font-semibold uppercase tracking-widest text-white/50";
  return (
    <div className="mt-3 space-y-3 text-left">
      <div>
        <div className={label}>Mode</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" style={seg(setup.mode === "ai")} onClick={() => onChange({ ...setup, mode: "ai" })}>vs Computer</button>
          <button type="button" style={seg(setup.mode === "two")} onClick={() => onChange({ ...setup, mode: "two" })}>2 Players</button>
        </div>
      </div>
      {setup.mode === "ai" && (
        <>
          <div>
            <div className={label}>Difficulty</div>
            <div style={{ display: "flex", gap: 6 }}>
              {LEVELS.map((l, i) => (
                <button key={l.name} type="button" style={seg(setup.level === i)} onClick={() => onChange({ ...setup, level: i })}>{l.name}</button>
              ))}
            </div>
          </div>
          <div>
            <div className={label}>Who drops first</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" style={seg(setup.youFirst)} onClick={() => onChange({ ...setup, youFirst: true })}>You</button>
              <button type="button" style={seg(!setup.youFirst)} onClick={() => onChange({ ...setup, youFirst: false })}>Computer</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
