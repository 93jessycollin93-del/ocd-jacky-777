// The "level cleared" panel: stars pop in one by one, then the score breakdown and what to do next.
import { Overlay, PrimaryButton, SecondaryButton } from "../../kit/ui";
import { formatNumber } from "../../kit/format";

export interface WinInfo {
  levelName: string;
  levelNumber: number;
  stars: number;
  score: number;
  destruction: number;
  bonus: number;
  left: number;
  prevBest: number;
  total: number;
  isTotalBest: boolean;
  hasNext: boolean;
  nextStarScore: number;
}

export function WinPanel({
  info, accent, onNext, onReplay, onLevels,
}: {
  info: WinInfo;
  accent: string;
  onNext: () => void;
  onReplay: () => void;
  onLevels: () => void;
}) {
  const newBest = info.score > info.prevBest;
  return (
    <Overlay>
      <style>{`@keyframes ss-pop{0%{transform:scale(0) rotate(-40deg);opacity:0}60%{transform:scale(1.35) rotate(8deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}`}</style>
      <div className="text-xs font-semibold uppercase tracking-widest text-white/50">Level {info.levelNumber} · {info.levelName}</div>
      <h2 className="mt-1 text-3xl font-black" style={{ color: accent }}>Cleared!</h2>
      <div className="mt-2 flex justify-center gap-2" aria-label={`${info.stars} stars`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="text-5xl leading-none"
            style={{
              color: i < info.stars ? "#fbbf24" : "rgba(255,255,255,0.15)",
              textShadow: i < info.stars ? "0 0 14px rgba(251,191,36,0.55)" : undefined,
              animation: i < info.stars ? `ss-pop 0.55s ${0.25 + i * 0.35}s both cubic-bezier(.2,.9,.3,1.2)` : undefined,
            }}
          >
            ★
          </span>
        ))}
      </div>
      <div className="mt-3 text-sm text-white/60">Level score</div>
      <div className="text-4xl font-black tabular-nums">{formatNumber(info.score)}</div>
      {newBest ? <div className="text-sm font-bold text-amber-300">{info.prevBest ? "New level best!" : "First clear!"}</div> : <div className="text-sm text-white/55">Level best: {formatNumber(info.prevBest)}</div>}
      <div className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70">
        Smashing: <b className="text-white">{formatNumber(info.destruction)}</b>
        {info.left > 0 ? (
          <> · {info.left} spare {info.left === 1 ? "critter" : "critters"}: <b className="text-white">+{formatNumber(info.bonus)}</b></>
        ) : null}
      </div>
      {info.stars < 3 && <div className="mt-1 text-[11px] text-white/45">{info.stars < 2 ? "Two stars" : "Three stars"} needs {formatNumber(info.nextStarScore)}</div>}
      <div className="mt-1 text-xs text-white/55">
        Total across all levels: <b className="text-white">{formatNumber(info.total)}</b>
        {info.isTotalBest ? <span className="ml-1 font-bold text-amber-300">New best!</span> : null}
      </div>
      <div className="mt-4 space-y-2">
        {info.hasNext ? <PrimaryButton onClick={onNext} accent={accent} autoFocus>Next level ▶</PrimaryButton> : <PrimaryButton onClick={onLevels} accent={accent} autoFocus>All levels cleared! Level select</PrimaryButton>}
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton onClick={onReplay}>Play again</SecondaryButton>
          <SecondaryButton onClick={onLevels}>Levels</SecondaryButton>
        </div>
      </div>
    </Overlay>
  );
}
