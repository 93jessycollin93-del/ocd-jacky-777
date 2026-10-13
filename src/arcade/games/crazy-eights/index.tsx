// Crazy Eights: rules in logic.ts; this file lays out the table in the DOM (opponents on top, the deck and pile
// in the middle, your hand fanned along the bottom), paces the computer players and runs the match flow.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { play } from "../../kit/sfx";
import { randomSeed } from "../../kit/rng";
import { Overlay, PrimaryButton, SecondaryButton, StartPanel } from "../../kit/ui";
import type { GameProps } from "../../types";
import { meta } from "./meta";
import { CARD_RATIO, cardUrl } from "./cardArt";
import {
  EIGHT, MATCH_TARGET, SUIT_NAMES, SUIT_SYMBOLS, botMove, cardLabel, drawCard, deal, handPoints, matchWinner, newMatch, pass, playCard,
  playable, rankOf, suitOf, top, type C8State,
} from "./logic";

type Phase = "ready" | "playing" | "round" | "match";

const BOTS = [
  { name: "Rex", emoji: "🦊" },
  { name: "Maple", emoji: "🐻" },
  { name: "Juniper", emoji: "🦉" },
];
const SUIT_COLORS = ["#e2e8f0", "#f87171", "#f87171", "#e2e8f0"];

function useBox(ref: React.RefObject<HTMLElement>) {
  const [box, setBox] = useState({ w: 800, h: 600 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [ref]);
  return box;
}

function Card({ card, w, className = "", style }: { card: number | "back"; w: number; className?: string; style?: React.CSSProperties }) {
  return (
    <img
      src={cardUrl(card)}
      alt={card === "back" ? "Card back" : cardLabel(card)}
      draggable={false}
      className={`select-none rounded-[7%] shadow-[0_4px_10px_rgba(0,0,0,0.45)] ${className}`}
      style={{ width: w, height: w * CARD_RATIO, ...style }}
    />
  );
}

export default function CrazyEights({ touch, best, submitScore }: GameProps) {
  const game = useRef<C8State | null>(null);
  const [, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const [phase, setPhase] = useState<Phase>("ready");
  const [opponents, setOpponents] = useState(1);
  const [picking, setPicking] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [isBest, setIsBest] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const box = useBox(root);

  const start = useCallback(() => {
    game.current = newMatch(randomSeed(), opponents + 1);
    setStatus("Your turn: match the suit or the rank");
    setPicking(null);
    play("select");
    setPhase("playing");
    refresh();
  }, [opponents, refresh]);

  const nameOf = (p: number) => (p === 0 ? "You" : BOTS[p - 1].name);

  const afterMove = useCallback(() => {
    const g = game.current!;
    if (g.roundOver) {
      const won = g.roundWinner === 0;
      play(won ? "win" : "lose");
      const mw = matchWinner(g);
      if (mw >= 0) {
        if (mw === 0) setIsBest(submitScore(g.scores[0]));
        setPhase("match");
      } else setPhase("round");
    } else if (g.turn === 0) {
      setStatus(playable(g).length ? "Your turn" : "No match in your hand: draw from the deck");
    }
    refresh();
  }, [refresh, submitScore]);

  // The computer players move one at a time, with a short pause so you can follow along.
  const g = game.current;
  const botTurn = phase === "playing" && g !== null && !g.roundOver && g.turn !== 0;
  useEffect(() => {
    if (!botTurn || !game.current) return;
    const s = game.current;
    const who = s.turn;
    setStatus(`${nameOf(who)} is thinking…`);
    const id = window.setTimeout(() => {
      const move = botMove(s);
      if (move.type === "play") {
        playCard(s, move.card, move.suit);
        play("flip");
        setStatus(rankOf(move.card) === EIGHT
          ? `${nameOf(who)} played an eight: the suit is now ${SUIT_NAMES[s.suit]}`
          : `${nameOf(who)} played ${cardLabel(move.card)}`);
      } else if (move.type === "draw") {
        const c = drawCard(s);
        play("slide");
        setStatus(c === null ? `${nameOf(who)} couldn't draw and passes` : `${nameOf(who)} draws a card`);
      } else {
        pass(s);
        setStatus(`${nameOf(who)} passes`);
      }
      afterMove();
    }, 650);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botTurn, g?.turn, g?.drawn, g?.hands[g?.turn ?? 0]?.length]);

  const humanPlay = (card: number) => {
    const s = game.current;
    if (!s || phase !== "playing" || s.turn !== 0 || !playable(s).includes(card)) {
      play("error");
      return;
    }
    if (rankOf(card) === EIGHT && s.hands[0].length > 1) {
      setPicking(card);
      return;
    }
    playCard(s, card);
    play("flip");
    afterMove();
  };

  const chooseSuit = (suit: number) => {
    const s = game.current!;
    if (picking === null) return;
    playCard(s, picking, suit);
    setPicking(null);
    play("flip");
    setStatus(`You named ${SUIT_NAMES[suit]}`);
    afterMove();
  };

  const humanDraw = () => {
    const s = game.current;
    if (!s || phase !== "playing" || s.turn !== 0 || s.drawn !== null) return;
    const c = drawCard(s);
    play("slide");
    if (c === null) setStatus("The deck is empty: you pass");
    else if (playable(s).includes(c)) setStatus(`You drew ${cardLabel(c)}: play it or keep it`);
    else {
      setStatus(`You drew ${cardLabel(c)}: no match, so you pass`);
      window.setTimeout(() => {
        if (game.current === s && s.turn === 0 && s.drawn === c) {
          pass(s);
          afterMove();
        }
      }, 700);
    }
    // Keep the "You drew…" message unless the draw ended the turn or the round.
    if (s.roundOver || s.turn !== 0) afterMove();
    else refresh();
  };

  const nextRound = () => {
    const s = game.current!;
    deal(s);
    setStatus(s.turn === 0 ? "Your turn" : "");
    setPhase("playing");
    play("select");
    refresh();
  };

  // ---- layout: card size follows the screen
  const cw = Math.max(46, Math.min(96, box.w / 5.2, (box.h - 120) / 4.4));
  const handW = Math.min(box.w - 24, 820);
  const hand = g?.hands[0] ?? [];
  const sorted = hand.slice().sort((a, b) => suitOf(a) - suitOf(b) || rankOf(a) - rankOf(b));
  const step = sorted.length > 1 ? Math.min(cw * 0.78, (handW - cw) / (sorted.length - 1)) : 0;
  const fanW = cw + step * Math.max(0, sorted.length - 1);
  const legal = g ? playable(g, 0) : [];
  const myTurn = phase === "playing" && g?.turn === 0 && !g.roundOver;
  const topCard = g ? top(g) : null;
  const suitChanged = g && topCard !== null && g.suit !== suitOf(topCard);

  return (
    <div ref={root} className="absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_center,#14532d_0%,#0a2e1c_60%,#04140c_100%)] text-white" style={{ touchAction: "manipulation" }}>
      {g && (
        <div className="flex h-full flex-col">
          {/* Opponents and scores */}
          <div className="flex flex-wrap items-start justify-center gap-2 px-2 pt-2">
            {g.hands.slice(1).map((h, i) => {
              const p = i + 1;
              const active = phase === "playing" && g.turn === p;
              return (
                <div key={p} className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition ${active ? "border-amber-300 bg-amber-300/15" : "border-white/15 bg-black/25"}`}>
                  <span className="text-2xl">{BOTS[i].emoji}</span>
                  <div className="leading-tight">
                    <div className="text-sm font-bold">{BOTS[i].name}</div>
                    <div className="text-[11px] text-white/60">{h.length} card{h.length === 1 ? "" : "s"} · {g.scores[p]} pts</div>
                  </div>
                  <div className="relative ml-1 h-9" style={{ width: 20 + Math.min(h.length, 8) * 5 }}>
                    {h.slice(0, 8).map((_, k) => (
                      <Card key={k} card="back" w={24} className="absolute top-0" style={{ left: k * 5 }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Deck, pile and status */}
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={humanDraw}
                disabled={!myTurn || g.drawn !== null}
                className={`relative rounded-[7%] transition ${myTurn && g.drawn === null ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-transparent hover:-translate-y-1" : "opacity-90"}`}
                aria-label="Draw a card"
              >
                <Card card="back" w={cw} />
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-white/60">Deck · {g.stock.length}</span>
              </button>
              <div className="relative">
                {topCard !== null && <Card key={topCard + "-" + g.discard.length} card={topCard} w={cw} className="duration-300 animate-in fade-in zoom-in-75" />}
                {suitChanged && (
                  <span
                    className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/80 bg-black/80 text-xl font-black"
                    style={{ color: SUIT_COLORS[g.suit] }}
                    title={`Suit: ${SUIT_NAMES[g.suit]}`}
                  >
                    {SUIT_SYMBOLS[g.suit]}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 min-h-[1.5rem] px-3 text-center text-sm font-semibold text-white/85">{status}</div>
            {myTurn && g.drawn !== null && legal.includes(g.drawn) && (
              <div className="flex gap-2">
                <button type="button" onClick={() => humanPlay(g.drawn!)} className="rounded-lg bg-emerald-400 px-3 py-1.5 text-sm font-bold text-black">Play {cardLabel(g.drawn)}</button>
                <button type="button" onClick={() => { pass(g); afterMove(); }} className="rounded-lg border border-white/25 px-3 py-1.5 text-sm">Keep it</button>
              </div>
            )}
          </div>

          {/* Your hand */}
          <div className="pb-3">
            <div className="mb-1 flex items-center justify-center gap-3 text-xs text-white/65">
              <span className={myTurn ? "font-bold text-amber-200" : ""}>You · {g.scores[0]} pts</span>
              <span>First to {MATCH_TARGET} wins</span>
            </div>
            <div className="relative mx-auto" style={{ width: fanW, height: cw * CARD_RATIO + 18 }}>
              {sorted.map((c, i) => {
                const ok = myTurn && legal.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => humanPlay(c)}
                    className="absolute bottom-0 transition-transform duration-200"
                    style={{
                      left: i * step,
                      transform: ok ? "translateY(-14px)" : "translateY(0)",
                      zIndex: i,
                    }}
                    aria-label={`Play ${cardLabel(c)}`}
                  >
                    <Card card={c} w={cw} className={myTurn && !ok ? "brightness-[0.55]" : ""} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {picking !== null && (
        <Overlay>
          <h2 className="text-xl font-black">Name the next suit</h2>
          <p className="mt-1 text-xs text-white/60">You hold the most {SUIT_NAMES[[0, 1, 2, 3].sort((a, b) => hand.filter((c) => suitOf(c) === b && c !== picking).length - hand.filter((c) => suitOf(c) === a && c !== picking).length)[0]]}.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((s) => (
              <button key={s} type="button" onClick={() => chooseSuit(s)} className="rounded-xl border border-white/20 bg-white/5 py-3 text-lg font-bold hover:bg-white/15">
                <span style={{ color: SUIT_COLORS[s] }}>{SUIT_SYMBOLS[s]}</span> {SUIT_NAMES[s]}
              </button>
            ))}
          </div>
          <div className="mt-3"><SecondaryButton onClick={() => setPicking(null)}>Cancel</SecondaryButton></div>
        </Overlay>
      )}

      {phase === "ready" && (
        <StartPanel
          title={meta.title}
          emoji={meta.emoji}
          blurb={meta.blurb}
          controls={touch ? meta.controls.touch : meta.controls.desktop}
          onStart={start}
          accent={meta.accent}
          best={best || undefined}
          bestLabel="Best match"
          extra={
            <div className="mt-3">
              <div className="mb-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">Opponents</div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((n) => (
                  <button key={n} type="button" onClick={() => setOpponents(n)} className={`rounded-lg border py-2 text-sm font-bold ${opponents === n ? "border-emerald-400 bg-emerald-400/20" : "border-white/15 bg-white/5"}`}>
                    {BOTS.slice(0, n).map((b) => b.emoji).join("")} {n}
                  </button>
                ))}
              </div>
            </div>
          }
        />
      )}

      {(phase === "round" || phase === "match") && g && (
        <Overlay>
          <h2 className="text-2xl font-black" style={{ color: meta.accent }}>
            {phase === "match"
              ? matchWinner(g) === 0 ? "You win the match!" : `${nameOf(matchWinner(g))} wins the match`
              : g.roundWinner === 0 ? "You went out!" : `${nameOf(g.roundWinner)} went out`}
          </h2>
          <p className="mt-1 text-sm text-white/65">
            {g.roundWinner === 0 ? "You" : nameOf(g.roundWinner)} scored {g.roundPoints} from the cards left in hand.
          </p>
          <table className="mx-auto mt-3 text-sm">
            <tbody>
              {g.scores.map((sc, p) => (
                <tr key={p} className={p === g.roundWinner ? "font-bold text-amber-200" : ""}>
                  <td className="pr-4 text-left">{p === 0 ? "🙂 You" : `${BOTS[p - 1].emoji} ${BOTS[p - 1].name}`}</td>
                  <td className="pr-4 text-right text-white/60">{handPoints(g.hands[p])} left</td>
                  <td className="text-right">{sc} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
          {phase === "match" && matchWinner(g) === 0 && isBest && <p className="mt-2 text-sm font-bold text-amber-300">New best match!</p>}
          <div className="mt-4 space-y-2">
            {phase === "round"
              ? <PrimaryButton onClick={nextRound} accent={meta.accent} autoFocus>Next round</PrimaryButton>
              : <PrimaryButton onClick={start} accent={meta.accent} autoFocus>New match</PrimaryButton>}
            <SecondaryButton onClick={() => setPhase("ready")}>Menu</SecondaryButton>
          </div>
        </Overlay>
      )}
    </div>
  );
}
