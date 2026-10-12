// Chess: the board, pieces, input (drag, click, tap) and game flow. Rules live in logic.ts, the engine in
// ai.ts, which runs inside a module Web Worker (ai.worker.ts) so the page never freezes while it thinks.
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { useKeyPress } from "../../kit/input";
import { loadState, saveState } from "../../kit/storage";
import { GameOverPanel, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import { chooseMove, LEVELS } from "./ai";
import type { AiReply, AiRequest } from "./ai.worker";
import {
  BLACK, KING, QUEEN, ROOK, BISHOP, KNIGHT, WHITE, colorOfPiece, getStatus, isCapture, moveFrom, movePromo, moveTo, newGame, playMove,
  replay, undoMove, F_CASTLE, moveFlags, type ChessGame, type Color, type Reason,
} from "./logic";
import { Piece, PieceDefs } from "./Piece";
import { captureSound, castleSound, checkSound, drawSound, illegalSound, loseSound, moveSound, promoteSound, winSound } from "./sounds";
import { trackedFromPosition, trackMove, type Tracked } from "./tracking";
import { useSize } from "./useSize";

type Phase = "ready" | "playing" | "over";
type Side = "white" | "black" | "random";
interface Settings {
  side: Side;
  level: number;
}
interface Outcome {
  title: string;
  detail: string;
  won: boolean;
  isBest: boolean;
  level: number;
}

const LIGHT = "#ead9b8";
const DARK = "#a9794f";
const REASON_TEXT: Record<Reason | "resign", string> = {
  checkmate: "by checkmate",
  stalemate: "stalemate: no legal move and not in check",
  "fifty-move": "fifty moves without a capture or pawn move",
  repetition: "the same position three times",
  insufficient: "neither side has enough material to mate",
  resign: "by resignation",
};
const PROMO_ORDER = [QUEEN, ROOK, BISHOP, KNIGHT];

const sideColor = (side: Side): Color => (side === "white" ? WHITE : side === "black" ? BLACK : Math.random() < 0.5 ? WHITE : BLACK);

export default function ChessGame({ touch, best, submitScore }: GameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(rootRef);

  const [settings, setSettings] = useState<Settings>(() => {
    const saved = loadState<Partial<Settings>>("chess:settings");
    return { side: saved?.side ?? "white", level: Math.min(5, Math.max(1, saved?.level ?? 2)) };
  });
  const [phase, setPhase] = useState<Phase>("ready");
  const [rev, setRev] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ id: number; x: number; y: number } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [promo, setPromo] = useState<{ from: number; to: number } | null>(null);
  const [flip, setFlip] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [showOver, setShowOver] = useState(false);
  const [resignArmed, setResignArmed] = useState(false);

  const game = useRef<ChessGame>(newGame());
  const tracks = useRef<Tracked[][]>([trackedFromPosition(game.current.pos)]);
  const human = useRef<Color>(WHITE);
  const level = useRef(settings.level);
  const phaseRef = useRef<Phase>("ready");
  const reqId = useRef(0);
  const worker = useRef<Worker | null>(null);
  const pending = useRef<AiRequest | null>(null);
  const timers = useRef<number[]>([]);
  const dragInfo = useRef<{ id: number; from: number; moved: boolean; wasSel: boolean; pid: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const commitRef = useRef<(m: number) => void>(() => {});

  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
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

  // ------------------------------------------------------------ derived state
  const g = game.current;
  const humanColor = human.current;
  const status = useMemo(() => getStatus(g.pos), [g, rev]); // eslint-disable-line react-hooks/exhaustive-deps
  const legal = useMemo(() => g.pos.legalMoves(), [g, rev]); // eslint-disable-line react-hooks/exhaustive-deps
  const pieces = tracks.current[tracks.current.length - 1];
  const lastMove = g.moves.length ? g.moves[g.moves.length - 1] : null;
  const myTurn = phase === "playing" && g.pos.turn === humanColor && !thinking && !status.over;
  const flipped = (humanColor === BLACK) !== flip;
  const targets = useMemo(() => {
    const map = new Map<number, number[]>();
    if (sel === null) return map;
    for (const m of legal) if (moveFrom(m) === sel) map.set(moveTo(m), [...(map.get(moveTo(m)) ?? []), m]);
    return map;
  }, [legal, sel]);
  const captured = useMemo(() => {
    const byWhite: number[] = [];
    const byBlack: number[] = [];
    for (const c of g.pos.capturedPieces()) (c < 0 ? byWhite : byBlack).push(c);
    const order = (a: number, b: number) => Math.abs(b) - Math.abs(a);
    return { byWhite: byWhite.sort(order), byBlack: byBlack.sort(order) };
  }, [g, rev]); // eslint-disable-line react-hooks/exhaustive-deps
  const [matW, matB] = useMemo(() => g.pos.material(), [g, rev]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the move list scrolled to the latest move.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rev]);

  // ------------------------------------------------------------ game flow
  const finish = (result: Color | "draw", reason: Reason | "resign") => {
    const won = result === human.current;
    const drew = result === "draw";
    const lv = level.current;
    const isBest = won ? submitScore(lv) : false;
    if (won) winSound();
    else if (drew) drawSound();
    else loseSound();
    const who = drew ? "Draw" : won ? "You win!" : reason === "resign" ? "You resigned" : "You lose";
    setOutcome({ title: who, detail: drew ? `Drawn: ${REASON_TEXT[reason]}` : `${result === WHITE ? "White" : "Black"} wins ${REASON_TEXT[reason]}`, won, isBest, level: lv });
    setPhaseBoth("over");
    setThinking(false);
    reqId.current++;
    setShowOver(false);
    later(() => setShowOver(true), 1100);
  };

  const commit = (m: number) => {
    const gm = game.current;
    const mover = gm.pos.turn;
    const capture = isCapture(m);
    const castle = (moveFlags(m) & F_CASTLE) !== 0;
    const promoting = movePromo(m) !== 0;
    const nextTrack = trackMove(tracks.current[tracks.current.length - 1], gm.pos, m);
    if (!playMove(gm, m)) return;
    tracks.current.push(nextTrack);
    setSel(null);
    setPromo(null);
    setRev((r) => r + 1);
    const st = getStatus(gm.pos);
    if (st.over) {
      if (capture) captureSound();
      else moveSound();
      if (st.reason === "checkmate") later(() => finish(st.result as Color, "checkmate"), 250);
      else later(() => finish("draw", st.reason as Reason), 250);
      return;
    }
    if (st.check) checkSound();
    else if (promoting) promoteSound();
    else if (castle) castleSound();
    else if (capture) captureSound();
    else moveSound();
    if (gm.pos.turn !== human.current) later(() => requestAi(), 120);
    void mover;
  };
  commitRef.current = commit;

  const getWorker = (): Worker | null => {
    if (worker.current) return worker.current;
    try {
      const wk = new Worker(new URL("./ai.worker.ts", import.meta.url), { type: "module" });
      wk.onmessage = (e: MessageEvent<AiReply>) => handleReply(e.data);
      wk.onerror = () => {
        wk.terminate();
        worker.current = null;
        const req = pending.current;
        if (req) runLocally(req);
      };
      worker.current = wk;
      return wk;
    } catch {
      return null;
    }
  };

  const handleReply = (r: AiReply) => {
    if (r.id !== reqId.current || phaseRef.current !== "playing") return;
    const started = pending.current ? startedAt.current : performance.now();
    const wait = Math.max(0, 500 - (performance.now() - started));
    later(() => {
      if (r.id !== reqId.current || phaseRef.current !== "playing") return;
      setThinking(false);
      pending.current = null;
      if (r.move !== null) commitRef.current(r.move);
    }, wait);
  };
  const startedAt = useRef(0);

  const runLocally = (req: AiRequest) => {
    later(() => {
      if (req.id !== reqId.current) return;
      const pos = replay(req.startFen, req.moves);
      const r = chooseMove(pos, req.level, req.moves);
      handleReply({ id: req.id, move: r ? r.move : null, score: r?.score ?? 0, depth: r?.depth ?? 0 });
    }, 30);
  };

  const requestAi = () => {
    const gm = game.current;
    if (phaseRef.current !== "playing") return;
    const id = ++reqId.current;
    const req: AiRequest = { id, startFen: gm.startFen, moves: gm.moves.slice(), level: level.current };
    pending.current = req;
    startedAt.current = performance.now();
    setThinking(true);
    const wk = getWorker();
    if (wk) wk.postMessage(req);
    else runLocally(req);
  };

  const startGame = () => {
    saveState("chess:settings", settings);
    reqId.current++;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    game.current = newGame();
    tracks.current = [trackedFromPosition(game.current.pos)];
    human.current = sideColor(settings.side);
    level.current = settings.level;
    setSel(null);
    setDrag(null);
    setPromo(null);
    setFlip(false);
    setOutcome(null);
    setShowOver(false);
    setThinking(false);
    setResignArmed(false);
    setRev((r) => r + 1);
    setPhaseBoth("playing");
    moveSound();
    if (human.current === BLACK) later(() => requestAi(), 350);
  };

  const undo = () => {
    if (phaseRef.current !== "playing") return;
    const gm = game.current;
    const floor = human.current === BLACK ? 1 : 0;
    if (gm.moves.length <= floor) return;
    const aiToMove = gm.pos.turn !== human.current;
    reqId.current++;
    setThinking(false);
    const plies = aiToMove ? 1 : Math.min(2, gm.moves.length - floor);
    for (let i = 0; i < plies; i++) {
      undoMove(gm);
      tracks.current.pop();
    }
    setSel(null);
    setPromo(null);
    setRev((r) => r + 1);
    moveSound();
    // Undoing back to a position where the AI is on move (human is Black at the start) re-asks it.
    if (gm.pos.turn !== human.current) later(() => requestAi(), 200);
  };

  const resign = () => {
    if (phaseRef.current !== "playing") return;
    if (!resignArmed) {
      setResignArmed(true);
      later(() => setResignArmed(false), 3000);
      return;
    }
    setResignArmed(false);
    finish(human.current === WHITE ? BLACK : WHITE, "resign");
  };

  useKeyPress((code) => {
    if (code === "KeyZ") undo();
    else if (code === "KeyF") setFlip((f) => !f);
    else if (code === "Escape") {
      setSel(null);
      setPromo(null);
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
    return flipped ? row * 8 + (7 - col) : (7 - row) * 8 + col;
  };

  const tryMove = (from: number, to: number): boolean => {
    const ms = legal.filter((m) => moveFrom(m) === from && moveTo(m) === to);
    if (!ms.length) return false;
    if (ms.length > 1 && movePromo(ms[0])) {
      setPromo({ from, to });
      setSel(null);
      return true;
    }
    commit(ms[0]);
    return true;
  };

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!myTurn || promo) return;
    const sq = squareAt(e.clientX, e.clientY);
    if (sq < 0) return;
    if (sel !== null && targets.has(sq)) {
      tryMove(sel, sq);
      return;
    }
    const p = g.pos.board[sq];
    if (p && colorOfPiece(p) === humanColor) {
      const tr = pieces.find((t) => !t.captured && t.sq === sq);
      dragInfo.current = { id: tr ? tr.id : -1, from: sq, moved: false, wasSel: sel === sq, pid: e.pointerId };
      setSel(sq);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Capture is only a nicety.
      }
    } else {
      if (sel !== null) illegalSound();
      setSel(null);
    }
  };

  const localPoint = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, cell: r.width / 8 };
  };

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = dragInfo.current;
    if (!d || d.pid !== e.pointerId) return;
    const pt = localPoint(e);
    if (!d.moved) {
      const from = pieces.find((t) => t.id === d.id);
      if (!from) return;
      const cx = (flipped ? 7 - (from.sq & 7) : from.sq & 7) * pt.cell + pt.cell / 2;
      const cy = (flipped ? from.sq >> 3 : 7 - (from.sq >> 3)) * pt.cell + pt.cell / 2;
      if (Math.hypot(pt.x - cx, pt.y - cy) < pt.cell * 0.18) return;
      d.moved = true;
    }
    setDrag({ id: d.id, x: pt.x, y: pt.y });
  };

  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = dragInfo.current;
    if (!d || d.pid !== e.pointerId) return;
    dragInfo.current = null;
    setDrag(null);
    if (d.moved) {
      const to = squareAt(e.clientX, e.clientY);
      if (to >= 0 && to !== d.from) {
        if (!tryMove(d.from, to)) illegalSound();
      }
    } else if (d.wasSel) setSel(null);
  };

  const onCancel = () => {
    dragInfo.current = null;
    setDrag(null);
  };

  // ------------------------------------------------------------ layout
  const pad = 10;
  const landscape = w >= h * 1.12;
  const stripH = 38;
  const ctrlH = 42;
  let S = 0;
  let panelW = 0;
  if (w && h) {
    if (landscape) {
      S = Math.max(160, Math.min(h - pad * 2, w - pad * 3 - 250));
      panelW = Math.min(420, w - S - pad * 3);
    } else {
      S = Math.max(160, Math.min(w - pad * 2, h - pad * 2 - stripH * 2 - ctrlH - 18 - 70));
    }
  }
  const cell = S / 8;
  const oppColor: Color = humanColor === WHITE ? BLACK : WHITE;

  const squares = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const file = flipped ? 7 - col : col;
      const rank = flipped ? row : 7 - row;
      const sq = rank * 8 + file;
      const lightSq = (file + rank) % 2 === 1;
      const isLast = lastMove !== null && (moveFrom(lastMove) === sq || moveTo(lastMove) === sq);
      const isSel = sel === sq;
      const isCheck = status.check && g.pos.kingSq[g.pos.turn] === sq;
      const isTarget = targets.has(sq);
      const hasPiece = g.pos.board[sq] !== 0 || (isTarget && targets.get(sq)!.some((m) => isCapture(m)));
      const labelColor = lightSq ? DARK : LIGHT;
      squares.push(
        <div key={sq} style={{ position: "relative", background: lightSq ? LIGHT : DARK }}>
          {isLast && <div style={{ position: "absolute", inset: 0, background: "rgba(250, 204, 21, 0.42)" }} />}
          {isSel && <div style={{ position: "absolute", inset: 0, background: "rgba(80, 200, 120, 0.5)" }} />}
          {isCheck && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle, rgba(239,68,68,0.95) 0%, rgba(239,68,68,0.55) 45%, rgba(239,68,68,0) 75%)" }} />}
          {col === 0 && <span style={{ position: "absolute", left: "5%", top: "3%", fontSize: Math.max(8, cell * 0.17), fontWeight: 700, color: labelColor, lineHeight: 1 }}>{rank + 1}</span>}
          {row === 7 && <span style={{ position: "absolute", right: "6%", bottom: "3%", fontSize: Math.max(8, cell * 0.17), fontWeight: 700, color: labelColor, lineHeight: 1 }}>{"abcdefgh"[file]}</span>}
          {isTarget && (
            <div
              style={{
                position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
                width: hasPiece ? "88%" : "30%", height: hasPiece ? "88%" : "30%", borderRadius: "50%",
                background: hasPiece ? "transparent" : "rgba(30, 30, 30, 0.3)",
                border: hasPiece ? `${Math.max(3, cell * 0.08)}px solid rgba(30,30,30,0.3)` : "none",
                boxSizing: "border-box",
              }}
            />
          )}
        </div>,
      );
    }
  }

  const pieceEls = [...pieces]
    .sort((a, b) => Number(b.captured) - Number(a.captured) || a.id - b.id)
    .map((t) => {
      const col = flipped ? 7 - (t.sq & 7) : t.sq & 7;
      const row = flipped ? t.sq >> 3 : 7 - (t.sq >> 3);
      const dragging = drag !== null && drag.id === t.id && !t.captured;
      const lift = touch ? cell * 0.45 : 0;
      const x = dragging ? drag!.x - cell / 2 : col * cell;
      const y = dragging ? drag!.y - cell / 2 - lift : row * cell;
      return (
        <div
          key={t.id}
          style={{
            position: "absolute", left: 0, top: 0, width: cell, height: cell, padding: cell * 0.03,
            boxSizing: "border-box", pointerEvents: "none",
            transform: `translate(${x}px, ${y}px) scale(${dragging ? 1.12 : t.captured ? 0.6 : 1})`,
            opacity: t.captured ? 0 : 1,
            transition: dragging ? "none" : "transform 190ms cubic-bezier(.25,.8,.25,1), opacity 220ms ease-out",
            zIndex: dragging ? 30 : t.captured ? 1 : 5,
          }}
        >
          <Piece piece={t.piece} />
        </div>
      );
    });

  const board = (
    <div
      ref={boardRef}
      role="application"
      aria-label="Chess board"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
      style={{
        position: "relative", width: S, height: S, flex: "none", touchAction: "none", userSelect: "none",
        borderRadius: 6, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.55), 0 0 0 3px #3b2a1c",
        cursor: myTurn ? "pointer" : "default",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(8, 1fr)", width: "100%", height: "100%" }}>{squares}</div>
      {pieceEls}
      {promo && (
        <div style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }} onPointerDown={(e) => { e.stopPropagation(); setPromo(null); }}>
          <div style={{ background: "#241b13", border: "2px solid #e0a84a", borderRadius: 14, padding: cell * 0.2, display: "flex", gap: cell * 0.12 }} onPointerDown={(e) => e.stopPropagation()}>
            {PROMO_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                aria-label={`Promote to ${["", "", "knight", "bishop", "rook", "queen"][t]}`}
                onClick={() => {
                  const m = legal.find((x) => moveFrom(x) === promo.from && moveTo(x) === promo.to && movePromo(x) === t);
                  if (m !== undefined) commit(m);
                }}
                style={{ width: cell * 1.05, height: cell * 1.05, borderRadius: 10, background: "#ead9b8", border: "none", cursor: "pointer", padding: cell * 0.05 }}
              >
                <Piece piece={humanColor === WHITE ? t : -t} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const oppName = `Computer · ${LEVELS[level.current - 1].name} (${level.current})`;
  const turnColor = g.pos.turn;
  const oppStrip = (
    <Strip
      color={oppColor}
      name={phase === "ready" ? "Computer" : oppName}
      sub={phase === "playing" && turnColor === oppColor ? (thinking ? "Thinking" : "") : status.check && turnColor === oppColor && phase !== "ready" ? "In check" : ""}
      thinking={phase === "playing" && thinking}
      active={phase === "playing" && turnColor === oppColor}
      captured={oppColor === WHITE ? captured.byWhite : captured.byBlack}
      diff={oppColor === WHITE ? matW - matB : matB - matW}
      h={stripH}
    />
  );
  const myStrip = (
    <Strip
      color={humanColor}
      name="You"
      sub={phase === "playing" && turnColor === humanColor ? (status.check ? "Your move, you are in check" : "Your move") : ""}
      active={phase === "playing" && turnColor === humanColor}
      captured={humanColor === WHITE ? captured.byWhite : captured.byBlack}
      diff={humanColor === WHITE ? matW - matB : matB - matW}
      h={stripH}
    />
  );

  const canUndo = phase === "playing" && g.moves.length > (humanColor === BLACK ? 1 : 0);
  const controls = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, height: ctrlH, flex: "none" }}>
      <Btn label="Undo" icon="↶" onClick={undo} disabled={!canUndo} />
      <Btn label="Flip" icon="⇅" onClick={() => setFlip((f) => !f)} />
      <Btn label={resignArmed ? "Sure?" : "Resign"} icon="⚑" onClick={resign} disabled={phase !== "playing" || g.moves.length < 1} danger={resignArmed} />
      <Btn label="New" icon="✦" onClick={() => setPhaseBoth("ready")} />
    </div>
  );

  const rows: { n: number; w: string; b?: string; wi: number }[] = [];
  g.sans.forEach((s, i) => {
    if (i % 2 === 0) rows.push({ n: i / 2 + 1, w: s, wi: i });
    else rows[rows.length - 1].b = s;
  });
  const lastIdx = g.sans.length - 1;
  const moveList = (
    <div ref={listRef} style={{ flex: "1 1 0", minHeight: 0, overflowY: "auto", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "6px 8px", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
      {rows.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, padding: 4 }}>Moves appear here.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 1fr", rowGap: 1 }}>
          {rows.map((r) => (
            <MoveRow key={r.n} r={r} lastIdx={lastIdx} />
          ))}
        </div>
      )}
      {outcome && phase === "over" && !showOver && <div style={{ marginTop: 8, fontWeight: 800, color: meta.accent }}>{outcome.title}: {outcome.detail}</div>}
    </div>
  );

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden text-white" style={{ background: "radial-gradient(ellipse at 50% 30%, #2a2018 0%, #14100c 70%)" }}>
      <PieceDefs />
      {S > 0 && landscape && (
        <div style={{ position: "absolute", left: Math.max(pad, (w - (S + pad + panelW)) / 2), top: (h - S) / 2, display: "flex", gap: pad, height: S }}>
          {board}
          <div style={{ width: panelW, height: S, display: "flex", flexDirection: "column", gap: 6 }}>
            {oppStrip}
            {moveList}
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
          {controls}
          {moveList}
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
          best={best ? `Level ${best}` : undefined}
          bestLabel="Best win"
          extra={<Setup settings={settings} onChange={setSettings} />}
        />
      )}
      {phase === "over" && showOver && outcome && (
        <GameOverPanel
          title={outcome.title}
          score={`Level ${outcome.level}`}
          scoreLabel={outcome.won ? "Difficulty beaten" : "Opponent"}
          isBest={outcome.isBest}
          accent={meta.accent}
          onRestart={startGame}
        >
          <p className="mt-2 text-sm text-white/70">{outcome.detail}</p>
          {best > 0 && !outcome.isBest && <p className="mt-1 text-xs text-white/50">Best win: level {best}</p>}
          <div className="mt-3 space-y-2">
            <SecondaryButton onClick={() => setShowOver(false)}>View board</SecondaryButton>
            <SecondaryButton onClick={() => setPhaseBoth("ready")}>Change side or level</SecondaryButton>
          </div>
        </GameOverPanel>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- small pieces of UI
function MoveRow({ r, lastIdx }: { r: { n: number; w: string; b?: string; wi: number }; lastIdx: number }) {
  const hi = { background: "rgba(224,168,74,0.35)", borderRadius: 4 };
  return (
    <>
      <span style={{ color: "rgba(255,255,255,0.4)" }}>{r.n}.</span>
      <span style={{ padding: "0 4px", fontWeight: 600, ...(r.wi === lastIdx ? hi : {}) }}>{r.w}</span>
      <span style={{ padding: "0 4px", fontWeight: 600, ...(r.b && r.wi + 1 === lastIdx ? hi : {}) }}>{r.b ?? ""}</span>
    </>
  );
}

function Btn({ label, icon, onClick, disabled, danger }: { label: string; icon: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-1 rounded-lg text-sm font-semibold transition hover:bg-white/20 active:scale-95 disabled:opacity-35 disabled:hover:bg-white/10"
      style={{ background: danger ? "rgba(239,68,68,0.55)" : "rgba(255,255,255,0.1)" }}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}

function Strip({ color, name, sub, active, captured, diff, thinking, h }: { color: Color; name: string; sub: string; active: boolean; captured: number[]; diff: number; thinking?: boolean; h: number }) {
  return (
    <div
      style={{
        height: h, flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "0 10px", borderRadius: 10, overflow: "hidden",
        background: active ? "rgba(224,168,74,0.16)" : "rgba(255,255,255,0.06)", boxShadow: active ? "inset 3px 0 0 #e0a84a" : "none",
      }}
    >
      <span style={{ width: 12, height: 12, borderRadius: 6, flex: "none", background: color === WHITE ? "#f5eedc" : "#2b2b36", border: "1.5px solid rgba(255,255,255,0.55)" }} />
      <div style={{ minWidth: 0, lineHeight: 1.15 }}>
        <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", minHeight: 13 }}>
          {sub}
          {thinking && <Dots />}
        </div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", paddingLeft: 6 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {captured.map((c, i) => (
            <span key={i} style={{ width: 17, height: 17, marginLeft: i && Math.abs(c) === Math.abs(captured[i - 1]) ? -9 : 1, flex: "none" }}>
              <Piece piece={c} />
            </span>
          ))}
        </div>
        {diff > 0 && <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.75)" }}>+{diff}</span>}
      </div>
    </div>
  );
}

function Dots() {
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", gap: 2, marginLeft: 3, verticalAlign: "middle" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 4, height: 4, borderRadius: 2, background: "#e0a84a", animation: `chess-dot 1s ${i * 0.15}s infinite ease-in-out` }} />
      ))}
      <style>{"@keyframes chess-dot{0%,80%,100%{opacity:.25;transform:scale(.7)}40%{opacity:1;transform:scale(1.1)}}"}</style>
    </span>
  );
}

function Setup({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const seg = (active: boolean) => ({
    flex: 1, padding: "7px 4px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "1px solid rgba(255,255,255,0.18)",
    background: active ? meta.accent : "rgba(255,255,255,0.06)", color: active ? "#1a1208" : "#fff",
  });
  return (
    <div className="mt-3 space-y-3 text-left">
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-white/50">Play as</div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["white", "black", "random"] as Side[]).map((s) => (
            <button key={s} type="button" style={seg(settings.side === s)} onClick={() => onChange({ ...settings, side: s })}>
              {s === "white" ? "White" : s === "black" ? "Black" : "Random"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[11px] font-semibold uppercase tracking-widest text-white/50">
          <span>Level</span>
          <span className="normal-case tracking-normal text-white/80">{LEVELS[settings.level - 1].name}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {LEVELS.map((_, i) => (
            <button key={i} type="button" style={seg(settings.level === i + 1)} onClick={() => onChange({ ...settings, level: i + 1 })}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
