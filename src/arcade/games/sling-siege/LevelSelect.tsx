// The level select screen: three worlds of six levels, stars earned, and locked levels greyed out.
import { formatNumber } from "../../kit/format";
import { LEVELS } from "./levels";
import { isUnlocked, totalScore, totalStars, type Progress } from "./logic";
import { WORLDS } from "./materials";

function Stars({ n, size = 13 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex gap-px" aria-label={`${n} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ fontSize: size, color: i < n ? "#fbbf24" : "rgba(255,255,255,0.18)", lineHeight: 1 }}>
          ★
        </span>
      ))}
    </span>
  );
}

export function LevelSelect({
  progress, onPick, onBack, accent,
}: {
  progress: Progress;
  onPick: (index: number) => void;
  onBack: () => void;
  accent: string;
}) {
  return (
    <div className="absolute inset-0 z-20 overflow-y-auto bg-zinc-950/95 px-3 py-3 text-white backdrop-blur-[2px]" data-testid="level-select">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onBack} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold hover:bg-white/10">
            ← Back
          </button>
          <h2 className="flex-1 text-center text-xl font-black tracking-tight" style={{ color: accent }}>Choose a level</h2>
          <div className="w-[68px]" />
        </div>
        <div className="mt-1 flex justify-center gap-4 text-xs text-white/65">
          <span>★ <b className="text-amber-300">{totalStars(progress)}</b> / {LEVELS.length * 3}</span>
          <span>Total score <b className="text-white">{formatNumber(totalScore(progress))}</b></span>
        </div>
        {WORLDS.map((w, wi) => {
          const idx = LEVELS.map((l, i) => ({ l, i })).filter((x) => x.l.world === wi);
          const stars = idx.reduce((a, x) => a + progress.stars[x.i], 0);
          return (
            <section key={w.name} className="mt-4">
              <div
                className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm font-black"
                style={{ background: `linear-gradient(90deg, ${w.accent}55, transparent)`, color: "#fff" }}
              >
                <span>World {wi + 1} · {w.name}</span>
                <span className="text-xs font-semibold text-amber-300">★ {stars} / {idx.length * 3}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {idx.map(({ l, i }) => {
                  const open = isUnlocked(progress, i);
                  const st = progress.stars[i];
                  return (
                    <button
                      key={l.id}
                      type="button"
                      disabled={!open}
                      aria-label={open ? `Level ${i + 1}, ${l.name}, ${st} stars` : `Level ${i + 1} locked`}
                      onClick={() => onPick(i)}
                      className="relative flex h-[84px] flex-col items-center justify-center rounded-xl border text-center transition enabled:hover:brightness-125 enabled:active:scale-95 disabled:cursor-not-allowed"
                      style={{
                        borderColor: open ? `${w.accent}aa` : "rgba(255,255,255,0.08)",
                        background: open ? `linear-gradient(160deg, ${w.accent}38, rgba(255,255,255,0.04))` : "rgba(255,255,255,0.03)",
                      }}
                    >
                      {open ? (
                        <>
                          <span className="text-2xl font-black leading-none tabular-nums">{i + 1}</span>
                          <span className="mt-0.5 max-w-full truncate px-1 text-[10px] font-semibold text-white/70">{l.name}</span>
                          <span className="mt-1"><Stars n={st} /></span>
                        </>
                      ) : (
                        <>
                          <span className="text-xl opacity-60">🔒</span>
                          <span className="mt-0.5 text-[10px] font-semibold text-white/35">Level {i + 1}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        <p className="mt-4 pb-2 text-center text-[11px] text-white/45">Clear a level to unlock the next. Leftover critters are worth bonus points.</p>
      </div>
    </div>
  );
}

export { Stars };
