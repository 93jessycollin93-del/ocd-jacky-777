// Checkers: the board, animated jumps and input. Rules are in logic.ts and the engine in ai.ts (run in a
// module Web Worker so the page never freezes). You play red and move first.
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { useKeyPress } from "../../kit/input";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import { chooseMove, LEVELS } from "./ai";
import type { AiReply, AiRequest } from "./ai.worker";
import { Disc } from "./Disc";
import {
  CREAM, DRAW_PLIES, RED, applyMove, colOf, countPieces, crowns, getResult, isDark, legalMoves, movablePieces, newGame, rowOf,
  type Move, type Player, type State,
} from "./logic";
import { blockedSound, captureSound, crownSound, drawSound, hopSound, loseSound, selectSound, stepSound, winSound } from "./sounds";
import { useSize } from "./useSize";

type Phase = "ready" | "playing" | "over";

interface Piece {
  id: number;
  color: Player;
  king: boolean;
  sq: number;
  gone: { dx: number; dy: number; rot: number } | null;
  hop: number;
}
interface Spark {
  key: number;
  sq: number;
}
interface Outcome {
  title: string;
  detail: string;
  won: boolean;
}

const LIGHT_SQ = "#d9e1ee";
const DARK_SQ = "#3b4a66";
const FRAME = "#1f2a3d";
const WINS_KEY = "checkers:wins";
const SETTINGS_KEY = "checkers:level";
const HOP_MS = 300;

const piecesFromState = (s: State): Piece[] => {
  const out: Piece[] = [];
  s.board.forEach((p, sq) => {
    if (p) out.push({ id: out.length, color: p > 0 ? RED : CREAM, king: Math.abs(p) === 2, sq, gone: null, hop: 0 });
  });
  return out;
};

const startsWith = (path: number[], prefix: number[]) => prefix.every((v, i) => path[i] === v);

export default function CheckersGame({ touch, best, submitScore }: GameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(rootRef);

  const [level, setLevel] = useState<number>(() => {
    const saved = loadState<number>(SETTINGS_KEY);
    return typeof saved === "number" && saved >= 0 && saved < LEVELS.length ? saved : 1;
  });
  const [wins, setWins] = useState<number>(() => loadState<number>(WINS_KEY) ?? 0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [state, setState] = useState<State>(() => newGame());
  const [pieces, setPieces] = useState<Piece[]>(() => piecesFromState(newGame()));
  const [sel, setSel] = useState<number | null>(null);
  const [partial, setPartial] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [last, setLast] = useState<number[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [nudge, setNudge] = useState<{ sq: number; n: number } | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [showOver, setShowOver] = useState(false);

  const stateRef = useRef(state);
  const piecesRef = useRef(pieces);
  const phaseRef = useRef<Phase>("ready");
  const busyRef = useRef(false);
  const levelRef = useRef(level);
  const winsRef = useRef(wins);
  const reqId = useRef(0);
  const worker = useRef<Worker | null>(null);
  const pending = useRef<AiRequest | null>(null);
  const startedAt = useRef(0);
  const timers = useRef<number[]>([]);
  const snaps = useRef<{ state: State; pieces: Piece[]; last: number[] }[]>([]);
  const dragInfo = useRef<{ from: number; moved: boolean; pid: number } | null>(null);
  const sparkKey = useRef(0);

  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
  };
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(
    () => () => {
      worker.current?.terminate();
      clearTimers();
    },
    [],
  );

  const setPiecesBoth = (fn: (prev: Piece[]) => Piece[]) => {
    const next = fn(piecesRef.current);
    piecesRef.current = next;
    setPieces(next);
  };
  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const setBusyBoth = (b: boolean) => {
    busyRef.current = b;
    setBusy(b);
  };
  const setStateBoth = (s: State) => {
    stateRef.current = s;
    setState(s);
  };

  // ------------------------------------------------------------ derived
  const moves = useMemo(() => legalMoves(state), [state]);
  const result = useMemo(() => getResult(state, moves), [state, moves]);
  const forced = moves.length > 0 && moves[0].captures.length > 0;
  const movable = useMemo(() => movablePieces(moves), [moves]);
  const myTurn = phase === "playing" && state.turn === RED && !busy && !thinking && !result.over;
  const candidates = useMemo(
    () => (sel === null ? [] : moves.filter((m) => m.path[0] === sel && startsWith(m.path, partial))),
    [moves, sel, partial],
  );
  const dests = useMemo(() => [...new Set(candidates.map((m) => m.path[partial.length]))], [candidates, partial]);
  const counts = useMemo(() => countPieces(state.board), [state]);

  // ------------------------------------------------------------ AI
  const handleReply = (r: AiReply) => {
    if (r.id !== reqId.current || phaseRef.current !== "playing") return;
    const wait = Math.max(0, 550 - (performance.now() - startedAt.current));
    later(() => {
      if (r.id !== reqId.current || phaseRef.current !== "playing") return;
      setThinking(false);
      pending.current = null;
      if (r.move) play(r.move);
    }, wait);
  };

  const runLocally = (req: AiRequest) => {
    later(() => {
      if (req.id !== reqId.current) return;
      const r = chooseMove(req.state, req.level);
      handleReply({ id: req.id, move: r ? r.move : null });
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
    if (phaseRef.current !== "playing") return;
    const id = ++reqId.current;
    const req: AiRequest = { id, state: stateRef.current, level: levelRef.current };
    pending.current = req;
    startedAt.current = performance.now();
    setThinking(true);
    const wk = getWorker();
    if (wk) wk.postMessage(req);
    else runLocally(req);
  };

  // ------------------------------------------------------------ playing a move (animated)
  const finish = (winner: Player | 0, reason: "no-moves" | "draw-rule") => {
    const won = winner === RED;
    if (won) {
      const total = winsRef.current + 1;
      winsRef.current = total;
      setWins(total);
      saveState(WINS_KEY, total);
      submitScore(total);
      winSound();
    } else if (winner === 0) drawSound();
    else loseSound();
    setOutcome({
      title: winner === 0 ? "Draw" : won ? "You win!" : "You lose",
      detail:
        winner === 0
          ? `Drawn: ${DRAW_PLIES / 2} moves each without a capture`
          : reason === "no-moves"
            ? won ? "The computer has no legal move left." : "You have no legal move left."
            : "",
      won,
    });
    setPhaseBoth("over");
    setShowOver(false);
    later(() => setShowOver(true), 900);
  };

  const play = (m: Move) => {
    const before = stateRef.current;
    const moverId = piecesRef.current.find((p) => !p.gone && p.sq === m.path[0])?.id;
    if (moverId === undefined) return;
    setBusyBoth(true);
    setSel(null);
    setPartial([]);
    const jumped = m.captures.length > 0;
    let i = 0;
    const step = () => {
      i++;
      const idx = i;
      const to = m.path[idx];
      if (jumped) hopSound(idx - 1);
      else stepSound();
      setPiecesBoth((prev) => prev.map((p) => (p.id === moverId ? { ...p, sq: to, hop: p.hop + 1 } : p)));
      const cap = m.captures[idx - 1];
      if (cap !== undefined) {
        const from = m.path[idx - 1];
        later(() => {
          const dr = rowOf(cap) - rowOf(from);
          const dc = colOf(cap) - colOf(from);
          const side = Math.random() < 0.5 ? -1 : 1;
          const cell = boardRef.current ? boardRef.current.clientWidth / 8 : 60;
          const dist = cell * (4.5 + Math.random() * 2);
          const fly = { dx: dc * dist * 0.8 + side * cell * 1.2, dy: dr * dist * 0.8 - cell * 0.4, rot: side * (260 + Math.random() * 420) };
          setPiecesBoth((prev) => prev.map((p) => (!p.gone && p.sq === cap && p.id !== moverId ? { ...p, gone: fly } : p)));
          captureSound();
          const key = ++sparkKey.current;
          setSparks((s) => [...s, { key, sq: cap }]);
          later(() => setSparks((s) => s.filter((x) => x.key !== key)), 700);
        }, HOP_MS * 0.5);
      }
      if (idx < m.path.length - 1) later(step, HOP_MS);
      else later(done, HOP_MS + 80);
    };
    const done = () => {
      const king = crowns(before, m);
      if (king) {
        setPiecesBoth((prev) => prev.map((p) => (p.id === moverId ? { ...p, king: true } : p)));
        crownSound();
      }
      const next = applyMove(before, m);
      setStateBoth(next);
      setLast([m.path[0], m.path[m.path.length - 1]]);
      later(() => {
        setPiecesBoth((prev) => prev.filter((p) => !p.gone));
        setBusyBoth(false);
        const res = getResult(next);
        if (res.over) finish(res.winner as Player | 0, res.reason as "no-moves" | "draw-rule");
        else if (next.turn === CREAM) requestAi();
      }, king ? 380 : 220);
    };
    step();
  };

  // ------------------------------------------------------------ game flow
  const startGame = () => {
    saveState(SETTINGS_KEY, level);
    levelRef.current = level;
    reqId.current++;
    clearTimers();
    const s = newGame();
    snaps.current = [];
    setStateBoth(s);
    setPiecesBoth(() => piecesFromState(s));
    setSel(null);
    setPartial([]);
    setLast([]);
    setSparks([]);
    setThinking(false);
    setBusyBoth(false);
    setOutcome(null);
    setShowOver(false);
    setPhaseBoth("playing");
    selectSound();
  };

  const humanMove = (m: Move) => {
    snaps.current.push({ state: stateRef.current, pieces: piecesRef.current.filter((p) => !p.gone).map((p) => ({ ...p })), last });
    play(m);
  };

  const undo = () => {
    if (phaseRef.current !== "playing" || busyRef.current || snaps.current.length === 0) return;
    reqId.current++;
    pending.current = null;
    setThinking(false);
    const snap = snaps.current.pop()!;
    setStateBoth(snap.state);
    setPiecesBoth(() => snap.pieces.map((p) => ({ ...p, hop: p.hop + 1 })));
    setLast(snap.last);
    setSel(null);
    setPartial([]);
    selectSound();
  };

  useKeyPress((code) => {
    if (code === "KeyZ") undo();
    else if (code === "Escape") {
      setSel(null);
      setPartial([]);
    } else if ((code === "Enter" || code === "Space") && phaseRef.current === "ready") startGame();
  });

  // ------------------------------------------------------------ input
  const squareAt = (clientX: number, clientY: number): number => {
    const el = boardRef.current;
    if (!el) return -1;
    const r = el.getBoundingClientRect();
    const col = Math.floor(((clientX - r.left) / r.width) * 8);
    const row = Math.floor(((clientY - r.top) / r.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return -1;
    return row * 8 + col;
  };

  const flash = (sq: number) => setNudge((n) => ({ sq, n: (n?.n ?? 0) + 1 }));

  const clickSquare = (sq: number) => {
    if (!myTurn) return;
    if (sel !== null && dests.includes(sq)) {
      const next = [...partial, sq];
      const rest = candidates.filter((m) => m.path[partial.length] === sq);
      if (rest.length === 1) {
        humanMove(rest[0]);
        setPartial(next);
      } else {
        setPartial(next);
        selectSound();
      }
      return;
    }
    const p = stateRef.current.board[sq];
    if (p > 0) {
      if (movable.includes(sq)) {
        setSel(sq);
        setPartial([sq]);
        selectSound();
      } else {
        // Own piece with no legal move: say why.
        setSel(null);
        setPartial([]);
        flash(sq);
        blockedSound();
      }
      return;
    }
    if (sel !== null) {
      setSel(null);
      setPartial([]);
    }
  };

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!myTurn) return;
    const sq = squareAt(e.clientX, e.clientY);
    if (sq < 0) return;
    clickSquare(sq);
    if (stateRef.current.board[sq] > 0 && movable.includes(sq)) {
      dragInfo.current = { from: sq, moved: false, pid: e.pointerId };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Capture is only a nicety.
      }
    }
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = dragInfo.current;
    if (!d || d.pid !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const cell = r.width / 8;
    if (!d.moved) {
      const cx = (colOf(d.from) + 0.5) * cell;
      const cy = (rowOf(d.from) + 0.5) * cell;
      if (Math.hypot(x - cx, y - cy) < cell * 0.22) return;
      d.moved = true;
    }
    setDrag({ x, y });
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = dragInfo.current;
    if (!d || d.pid !== e.pointerId) return;
    dragInfo.current = null;
    setDrag(null);
    if (d.moved) {
      const to = squareAt(e.clientX, e.clientY);
      if (to >= 0 && to !== d.from) clickSquare(to);
    }
  };
  const onCancel = () => {
    dragInfo.current = null;
    setDrag(null);
  };

  // ------------------------------------------------------------ layout
  const pad = 10;
  const landscape = w >= h * 1.12;
  const stripH = 40;
  const ctrlH = 42;
  const infoH = 62;
  let S = 0;
  let panelW = 0;
  if (w && h) {
    if (landscape) {
      S = Math.max(160, Math.min(h - pad * 2, w - pad * 3 - 240));
      panelW = Math.min(400, w - S - pad * 3);
    } else {
      S = Math.max(160, Math.min(w - pad * 2, h - pad * 2 - stripH * 2 - ctrlH - infoH - 24));
    }
  }
  const cell = S / 8;
  const discSize = cell * 0.8;
  const dragging = drag !== null && dragInfo.current?.moved ? dragInfo.current.from : -1;

  const squares = [];
  for (let sq = 0; sq < 64; sq++) {
    const dark = isDark(sq);
    const isDest = dests.includes(sq);
    const isLast = last.includes(sq);
    const onPath = partial.length > 1 && partial.slice(1).includes(sq);
    squares.push(
      <div key={sq} style={{ position: "relative", background: dark ? DARK_SQ : LIGHT_SQ }}>
        {dark && isLast && <div style={{ position: "absolute", inset: 0, background: "rgba(250, 204, 21, 0.28)" }} />}
        {onPath && <div style={{ position: "absolute", inset: 0, background: "rgba(250, 204, 21, 0.4)" }} />}
        {isDest && (
          <div
            style={{
              position: "absolute", left: "50%", top: "50%", width: "34%", height: "34%", borderRadius: "50%", transform: "translate(-50%,-50%)",
              background: forced ? "rgba(248, 113, 113, 0.9)" : "rgba(134, 239, 172, 0.9)",
              boxShadow: `0 0 0 ${Math.max(3, cell * 0.07)}px ${forced ? "rgba(248,113,113,0.35)" : "rgba(134,239,172,0.35)"}`,
              animation: "ckr-pulse 1.1s infinite ease-in-out",
            }}
          />
        )}
        {sq % 8 === 0 && dark && <span style={{ position: "absolute", left: "5%", top: "3%", fontSize: Math.max(8, cell * 0.16), fontWeight: 700, color: "rgba(255,255,255,0.35)", lineHeight: 1 }}>{8 - (sq >> 3)}</span>}
        {sq >> 3 === 7 && dark && <span style={{ position: "absolute", right: "6%", bottom: "3%", fontSize: Math.max(8, cell * 0.16), fontWeight: 700, color: "rgba(255,255,255,0.35)", lineHeight: 1 }}>{"abcdefgh"[sq & 7]}</span>}
      </div>,
    );
  }

  const pieceEls = [...pieces]
    .sort((a, b) => Number(!!b.gone) - Number(!!a.gone) || a.id - b.id)
    .map((p) => {
      const isDragged = !p.gone && p.sq === dragging;
      const x = isDragged ? drag!.x - cell / 2 : colOf(p.sq) * cell;
      const y = isDragged ? drag!.y - cell / 2 - (touch ? cell * 0.4 : 0) : rowOf(p.sq) * cell;
      const canMove = myTurn && movable.includes(p.sq) && p.color === RED;
      const selected = sel === p.sq && p.color === RED;
      const shake = nudge && nudge.sq === p.sq && !p.gone;
      return (
        <div
          key={p.id}
          style={{
            position: "absolute", left: 0, top: 0, width: cell, height: cell, pointerEvents: "none",
            transform: `translate(${x}px, ${y}px)`,
            transition: isDragged ? "none" : `transform ${HOP_MS - 30}ms cubic-bezier(.3,.7,.3,1)`,
            zIndex: isDragged ? 30 : p.gone ? 25 : selected ? 10 : 5,
          }}
        >
          <div
            key={`${p.hop}-${shake ? nudge!.n : 0}`}
            style={{
              position: "absolute", left: (cell - discSize) / 2, top: (cell - discSize) / 2,
              animation: p.gone
                ? "ckr-fly 0.85s cubic-bezier(.25,.6,.4,1) forwards"
                : shake ? "ckr-shake 0.35s" : p.hop > 0 && !isDragged ? `ckr-hop ${HOP_MS}ms ease-out` : undefined,
              ["--dx" as string]: p.gone ? `${p.gone.dx}px` : undefined,
              ["--dy" as string]: p.gone ? `${p.gone.dy}px` : undefined,
              ["--rot" as string]: p.gone ? `${p.gone.rot}deg` : undefined,
              transform: selected || isDragged ? "scale(1.1) translateY(-3%)" : undefined,
              transition: "transform 120ms",
              filter: canMove && forced && !selected ? "drop-shadow(0 0 6px rgba(250,204,21,0.95))" : undefined,
            }}
          >
            <Disc red={p.color === RED} king={p.king} size={discSize} />
            {canMove && forced && !selected && (
              <div style={{ position: "absolute", inset: -cell * 0.05, borderRadius: "50%", border: `${Math.max(2, cell * 0.05)}px solid rgba(250,204,21,0.9)`, animation: "ckr-ring 1.1s infinite ease-in-out" }} />
            )}
            {selected && <div style={{ position: "absolute", inset: -cell * 0.06, borderRadius: "50%", border: `${Math.max(2, cell * 0.05)}px solid #fff`, boxShadow: "0 0 10px rgba(255,255,255,0.8)" }} />}
          </div>
        </div>
      );
    });

  const sparkEls = sparks.map((s) => (
    <div key={s.key} style={{ position: "absolute", left: colOf(s.sq) * cell + cell / 2, top: rowOf(s.sq) * cell + cell / 2, width: 0, height: 0, zIndex: 28, pointerEvents: "none" }}>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          style={{
            position: "absolute", left: -3, top: -3, width: 6, height: 6, borderRadius: 3, background: i % 2 ? "#fde047" : "#fff",
            ["--a" as string]: `${i * 36}deg`, ["--d" as string]: `${cell * (0.55 + (i % 3) * 0.18)}px`,
            animation: "ckr-spark 0.6s ease-out forwards",
          }}
        />
      ))}
    </div>
  ));

  const board = (
    <div
      ref={boardRef}
      role="application"
      aria-label="Checkers board"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
      style={{
        position: "relative", width: S, height: S, flex: "none", touchAction: "none", userSelect: "none", borderRadius: 8,
        boxShadow: `0 10px 30px rgba(0,0,0,0.55), 0 0 0 4px ${FRAME}, 0 0 0 5px rgba(255,255,255,0.12)`, cursor: myTurn ? "pointer" : "default",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(8, 1fr)", width: "100%", height: "100%", borderRadius: 8, overflow: "hidden" }}>{squares}</div>
      {pieceEls}
      {sparkEls}
    </div>
  );

  const nCream = counts.cream;
  const nRed = counts.red;
  const status = !(phase === "playing") ? "" : result.over ? "" : thinking ? "Computer is thinking" : busy ? "" : state.turn === RED ? (forced ? "Capture required: jump!" : "Your move") : "";
  const oppStrip = <Strip name="Computer" sub={LEVELS[levelRef.current].name} count={nCream} kings={counts.creamKings} red={false} active={phase === "playing" && state.turn === CREAM} h={stripH} />;
  const myStrip = <Strip name="You" sub={`Total wins ${wins}`} count={nRed} kings={counts.redKings} red active={phase === "playing" && state.turn === RED} h={stripH} />;
  const drawLeft = Math.min(DRAW_PLIES, state.sinceCapture);
  const info = (
    <div style={{ height: infoH, flex: "none", borderRadius: 10, background: "rgba(255,255,255,0.06)", padding: "6px 10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
      <div style={{ fontSize: 15, fontWeight: 800, minHeight: 20, color: forced && state.turn === RED && !thinking ? "#fca5a5" : "#fff" }}>
        {status || (phase === "ready" ? "Ready" : result.over ? "Game over" : " ")}
        {thinking && <Dots />}
      </div>
      <div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", display: "flex", justifyContent: "space-between" }}>
          <span>Draw rule</span>
          <span>{Math.floor(drawLeft / 2)} / {DRAW_PLIES / 2} moves without a capture</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)", marginTop: 3 }}>
          <div style={{ height: 4, borderRadius: 2, width: `${(drawLeft / DRAW_PLIES) * 100}%`, background: drawLeft > DRAW_PLIES * 0.75 ? "#f59e0b" : "#94a3b8", transition: "width 300ms" }} />
        </div>
      </div>
    </div>
  );
  const controls = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, height: ctrlH, flex: "none" }}>
      <Btn label="Undo" icon="↶" onClick={undo} disabled={phase !== "playing" || busy || snaps.current.length === 0} />
      <Btn label="New game" icon="✦" onClick={() => setPhaseBoth("ready")} />
    </div>
  );

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden text-white" style={{ background: "radial-gradient(ellipse at 50% 30%, #1d2740 0%, #0d1320 72%)" }}>
      <style>{`
        @keyframes ckr-hop { 0% { transform: scale(1) translateY(0); } 45% { transform: scale(1.28) translateY(-14%); } 100% { transform: scale(1) translateY(0); } }
        @keyframes ckr-fly { 0% { transform: translate(0,0) rotate(0) scale(1); opacity: 1; } 30% { transform: translate(calc(var(--dx) * .3), calc(var(--dy) * .3 - 36px)) rotate(calc(var(--rot) * .3)) scale(1.3); opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(.35); opacity: 0; } }
        @keyframes ckr-pulse { 0%,100% { opacity: .55; transform: translate(-50%,-50%) scale(.9); } 50% { opacity: 1; transform: translate(-50%,-50%) scale(1.1); } }
        @keyframes ckr-ring { 0%,100% { opacity: .55; transform: scale(.95); } 50% { opacity: 1; transform: scale(1.07); } }
        @keyframes ckr-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
        @keyframes ckr-spark { 0% { transform: rotate(var(--a)) translateX(0) scale(1); opacity: 1; } 100% { transform: rotate(var(--a)) translateX(var(--d)) scale(.3); opacity: 0; } }
        @keyframes ckr-dot { 0%,80%,100% { opacity: .25; transform: scale(.7); } 40% { opacity: 1; transform: scale(1.1); } }
      `}</style>
      {S > 0 && landscape && (
        <div style={{ position: "absolute", left: Math.max(pad, (w - (S + pad + panelW)) / 2), top: (h - S) / 2, display: "flex", gap: pad, height: S }}>
          {board}
          <div style={{ width: panelW, height: S, display: "flex", flexDirection: "column", gap: 8 }}>
            {oppStrip}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
              {info}
              <Legend />
            </div>
            {myStrip}
            {controls}
          </div>
        </div>
      )}
      {S > 0 && !landscape && (
        <div style={{ position: "absolute", left: (w - S) / 2, top: pad, width: S, height: h - pad * 2, display: "flex", flexDirection: "column", gap: 6 }}>
          {oppStrip}
          {board}
          {myStrip}
          {info}
          {controls}
        </div>
      )}

      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={startGame}
          accent={meta.accent}
          best={best || undefined}
          bestLabel="Total wins"
          extra={
            <div className="mt-3 text-left">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-white/50">Difficulty</div>
              <div style={{ display: "flex", gap: 6 }}>
                {LEVELS.map((l, i) => (
                  <button
                    key={l.name}
                    type="button"
                    onClick={() => setLevel(i)}
                    style={{
                      flex: 1, padding: "7px 4px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "1px solid rgba(255,255,255,0.18)",
                      background: level === i ? meta.accent : "rgba(255,255,255,0.06)", color: level === i ? "#1a0808" : "#fff",
                    }}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          }
        />
      )}
      {phase === "over" && showOver && outcome && (
        <GameOverPanel title={outcome.title} score={wins} scoreLabel="Total wins" isBest={outcome.won && wins >= best} accent={meta.accent} onRestart={startGame}>
          {outcome.detail && <p className="mt-2 text-sm text-white/70">{outcome.detail}</p>}
          <div className="mt-3 space-y-2">
            <SecondaryButton onClick={() => setShowOver(false)}>View board</SecondaryButton>
            <SecondaryButton onClick={() => setPhaseBoth("ready")}>Change difficulty</SecondaryButton>
          </div>
        </GameOverPanel>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, padding: "0 4px" }}>
      <div><span style={{ color: "#86efac" }}>●</span> where the selected piece can go · <span style={{ color: "#fca5a5" }}>●</span> a jump</div>
      <div>Jumps are compulsory and chain. Reach the far row to crown a king.</div>
    </div>
  );
}

function Btn({ label, icon, onClick, disabled }: { label: string; icon: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-1 rounded-lg bg-white/10 text-sm font-semibold transition hover:bg-white/20 active:scale-95 disabled:opacity-35 disabled:hover:bg-white/10"
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}

function Strip({ name, sub, count, kings, red, active, h }: { name: string; sub: string; count: number; kings: number; red: boolean; active: boolean; h: number }) {
  return (
    <div
      style={{
        height: h, flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "0 10px", borderRadius: 10,
        background: active ? "rgba(239,68,68,0.16)" : "rgba(255,255,255,0.06)", boxShadow: active ? "inset 3px 0 0 #ef4444" : "none",
      }}
    >
      <Disc red={red} king={false} size={22} />
      <div style={{ minWidth: 0, lineHeight: 1.15 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{name}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
      </div>
      <div style={{ marginLeft: "auto", textAlign: "right", lineHeight: 1.1 }}>
        <div style={{ fontSize: 18, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{count}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{kings > 0 ? `${kings} king${kings > 1 ? "s" : ""}` : "pieces"}</div>
      </div>
    </div>
  );
}

function Dots() {
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", gap: 2, marginLeft: 5, verticalAlign: "middle" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: 3, background: "#ef4444", animation: `ckr-dot 1s ${i * 0.15}s infinite ease-in-out` }} />
      ))}
    </span>
  );
}
