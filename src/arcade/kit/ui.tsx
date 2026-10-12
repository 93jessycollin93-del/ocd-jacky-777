// Shared screens for Arcade games: start, pause and game-over panels, HUD pills and buttons.
import type { ReactNode } from "react";

export function Overlay({ children, dim = true }: { children: ReactNode; dim?: boolean }) {
  return (
    <div className={`absolute inset-0 z-20 flex items-center justify-center overflow-y-auto p-4 ${dim ? "bg-black/60 backdrop-blur-[2px]" : ""}`}>
      <div className="my-auto w-full max-w-sm rounded-2xl border border-white/15 bg-zinc-950/90 p-5 text-center text-white shadow-2xl">
        {children}
      </div>
    </div>
  );
}

export function PrimaryButton({ children, onClick, accent = "#f59e0b", autoFocus }: { children: ReactNode; onClick: () => void; accent?: string; autoFocus?: boolean }) {
  return (
    <button
      type="button"
      autoFocus={autoFocus}
      onClick={onClick}
      className="w-full rounded-xl py-3 text-base font-black tracking-wide text-black shadow-lg transition hover:brightness-110 active:scale-[0.98]"
      style={{ background: accent }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-xl border border-white/20 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
      {children}
    </button>
  );
}

/** Title screen: what the game is, how to play, and a big Play button. */
export function StartPanel({
  title, emoji, blurb, controls, onStart, accent, best, bestLabel = "Best", extra,
}: {
  title: string;
  emoji: string;
  blurb: string;
  controls: string;
  onStart: () => void;
  accent: string;
  best?: string | number;
  bestLabel?: string;
  extra?: ReactNode;
}) {
  return (
    <Overlay>
      <div className="text-5xl">{emoji}</div>
      <h2 className="mt-1 text-3xl font-black tracking-tight" style={{ color: accent }}>{title}</h2>
      <p className="mt-2 text-sm text-white/75">{blurb}</p>
      <p className="mt-2 text-xs text-white/50">{controls}</p>
      {best ? <p className="mt-2 text-sm text-white/70">{bestLabel}: <b className="text-white">{best}</b></p> : null}
      {extra}
      <div className="mt-4">
        <PrimaryButton onClick={onStart} accent={accent} autoFocus>Play</PrimaryButton>
      </div>
    </Overlay>
  );
}

export function GameOverPanel({
  title = "Game over", score, best, isBest, onRestart, accent, children, scoreLabel = "Score",
}: {
  title?: string;
  score: string | number;
  best?: string | number;
  isBest?: boolean;
  onRestart: () => void;
  accent: string;
  children?: ReactNode;
  scoreLabel?: string;
}) {
  return (
    <Overlay>
      <h2 className="text-3xl font-black" style={{ color: accent }}>{title}</h2>
      <div className="mt-3 text-sm text-white/60">{scoreLabel}</div>
      <div className="text-5xl font-black tabular-nums">{score}</div>
      {isBest ? (
        <div className="mt-1 text-sm font-bold text-amber-300">New best!</div>
      ) : best ? (
        <div className="mt-1 text-sm text-white/60">Best: {best}</div>
      ) : null}
      {children}
      <div className="mt-4">
        <PrimaryButton onClick={onRestart} accent={accent} autoFocus>Play again</PrimaryButton>
      </div>
    </Overlay>
  );
}

export function PausePanel({ onResume, onRestart, accent, children }: { onResume: () => void; onRestart: () => void; accent: string; children?: ReactNode }) {
  return (
    <Overlay>
      <h2 className="text-2xl font-black">Paused</h2>
      {children}
      <div className="mt-4 space-y-2">
        <PrimaryButton onClick={onResume} accent={accent} autoFocus>Resume</PrimaryButton>
        <SecondaryButton onClick={onRestart}>Restart</SecondaryButton>
      </div>
    </Overlay>
  );
}

/** A small label/value chip for in-game HUDs. */
export function HudPill({ label, value, color }: { label: string; value: ReactNode; color?: string }) {
  return (
    <div className="pointer-events-none rounded-lg bg-black/45 px-2.5 py-1 text-white shadow backdrop-blur-sm">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-white/55">{label}</div>
      <div className="text-lg font-black leading-tight tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}
