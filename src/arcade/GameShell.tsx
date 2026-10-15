// The frame around every Arcade game: a slim top bar (back, title, best score, sound, fullscreen,
// how to play) and the play area. Catches crashes so one broken game never blanks the page.
import { Component, useCallback, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { isTouchDevice } from "./kit/device";
import { formatTime } from "./kit/format";
import { isMuted, setMuted, unlockAudio } from "./kit/sfx";
import { loadBest, saveBest } from "./kit/storage";
import type { GameMeta, GameProps } from "./types";

class Boundary extends Component<{ children: ReactNode; title: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Arcade game crashed: ${this.props.title}`, error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
        <div className="text-4xl">💥</div>
        <div className="text-lg font-bold">{this.props.title} hit a problem</div>
        <div className="max-w-md text-xs text-white/60">{this.state.error.message}</div>
        <button type="button" className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    );
  }
}

export function GameShell({ meta, render }: { meta: GameMeta; render: (props: GameProps) => ReactNode }) {
  const [touch] = useState(isTouchDevice);
  const [best, setBest] = useState(() => loadBest(meta.id));
  const [muted, setMutedState] = useState(isMuted);
  const [help, setHelp] = useState(false);
  const [full, setFull] = useState(false);

  // Audio can only start after the player does something.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const submitScore = useCallback(
    (score: number) => {
      const isBest = saveBest(meta.id, score, meta.scoreOrder ?? "high");
      if (isBest) setBest(score);
      return isBest;
    },
    [meta.id, meta.scoreOrder],
  );

  const fmt = (n: number) => (meta.scoreFormat === "time" ? formatTime(n) : Math.floor(n).toLocaleString("en-US"));

  const toggleFull = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen?.();
    } catch {
      // Not supported here.
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white">
      <header
        className="flex h-11 shrink-0 items-center gap-2 border-b border-white/10 px-2 text-sm"
        style={{ background: `linear-gradient(90deg, ${meta.accent}40, #09090b 60%)` }}
      >
        <Link to="/arcade" className="rounded-md px-2 py-1 text-white/75 hover:bg-white/10 hover:text-white">← Arcade</Link>
        <div className="min-w-0 flex-1 truncate font-bold">
          <span className="mr-1">{meta.emoji}</span>
          {meta.title}
        </div>
        {best > 0 && (
          <div className="hidden text-xs text-white/70 sm:block">
            {meta.scoreLabel ?? "Best"}: <b className="text-white">{fmt(best)}</b>
          </div>
        )}
        <button
          type="button"
          aria-label={muted ? "Sound off" : "Sound on"}
          title={muted ? "Sound off" : "Sound on"}
          className="rounded-md px-2 py-1 hover:bg-white/10"
          onClick={() => {
            setMuted(!isMuted());
            setMutedState(isMuted());
          }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <button type="button" aria-label="Fullscreen" title="Fullscreen" className="rounded-md px-2 py-1 hover:bg-white/10" onClick={toggleFull}>
          {full ? "🗗" : "⛶"}
        </button>
        <button type="button" aria-label="How to play" title="How to play" className="rounded-md px-2 py-1 hover:bg-white/10" onClick={() => setHelp(true)}>
          ?
        </button>
      </header>
      <main className="relative min-h-0 flex-1 overflow-hidden">
        <Boundary title={meta.title}>{render({ touch, best, submitScore })}</Boundary>
      </main>
      {help && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setHelp(false)}>
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-white/15 bg-zinc-950 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-2xl font-black" style={{ color: meta.accent }}>{meta.emoji} {meta.title}</div>
            <p className="text-sm text-white/75">{meta.blurb}</p>
            <div className="text-sm">
              <div className="font-semibold">{touch ? "Touch" : "Keyboard & mouse"}</div>
              <div className="text-white/70">{touch ? meta.controls.touch : meta.controls.desktop}</div>
            </div>
            <button type="button" className="w-full rounded-lg bg-white/10 py-2 text-sm hover:bg-white/20" onClick={() => setHelp(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
