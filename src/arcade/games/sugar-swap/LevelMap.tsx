// Sugar Swap's level-select map: a winding candy trail with level 1 at the bottom. Locked levels are
// greyed out; finished levels show their stars.
import { useEffect, useRef } from "react";
import { LEVELS } from "./levels";

const SPACING = 96;
const WIDTH = 340;
const GOAL_ICON = { score: "🎯", frosting: "🍰", ingredients: "🌰" } as const;

const nodeX = (i: number) => WIDTH / 2 + Math.sin(i * 0.95 + 0.4) * WIDTH * 0.3;
const nodeY = (i: number) => (LEVELS.length - 1 - i) * SPACING + 76;

export function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <svg key={i} width={size} height={size} viewBox="-12 -12 24 24" aria-hidden>
          <path
            d="M0 -10 L2.9 -3.4 L10 -3 L4.6 1.6 L6.2 8.6 L0 4.9 L-6.2 8.6 L-4.6 1.6 L-10 -3 L-2.9 -3.4Z"
            fill={i < n ? "#fde047" : "#4c2a7a"}
            stroke={i < n ? "#b45309" : "rgba(255,255,255,0.4)"}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

/** The three big stars on the level-complete card; earned ones pop in one after another. */
export function BigStars({ n }: { n: number }) {
  return (
    <div className="flex justify-center gap-2">
      <style>{`@keyframes ss-star{0%{transform:scale(0) rotate(-40deg);opacity:0}60%{transform:scale(1.35) rotate(8deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}`}</style>
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          width="64"
          height="64"
          viewBox="-12 -12 24 24"
          aria-hidden
          style={i < n ? { animation: `ss-star 0.55s ${0.25 + i * 0.3}s both cubic-bezier(.2,.9,.3,1.2)` } : { opacity: 0.9 }}
        >
          <path
            d="M0 -10 L2.9 -3.4 L10 -3 L4.6 1.6 L6.2 8.6 L0 4.9 L-6.2 8.6 L-4.6 1.6 L-10 -3 L-2.9 -3.4Z"
            fill={i < n ? "#fde047" : "#3b1f63"}
            stroke={i < n ? "#b45309" : "rgba(255,255,255,0.35)"}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}

export function LevelMap({
  stars, totalStars, onPick, onBack, accent,
}: {
  stars: number[];
  totalStars: number;
  onPick: (level: number) => void;
  onBack: () => void;
  accent: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const unlocked = (i: number) => i === 0 || (stars[i - 1] ?? 0) > 0;
  let current = 0;
  while (current < LEVELS.length - 1 && (stars[current] ?? 0) > 0) current++;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = Math.max(0, nodeY(current) - el.clientHeight / 2 + 20);
    // Only on first show.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let path = `M ${nodeX(0)} ${nodeY(0)}`;
  for (let i = 0; i < LEVELS.length - 1; i++) {
    const mid = (nodeY(i) + nodeY(i + 1)) / 2;
    path += ` C ${nodeX(i)} ${mid}, ${nodeX(i + 1)} ${mid}, ${nodeX(i + 1)} ${nodeY(i + 1)}`;
  }
  const height = LEVELS.length * SPACING + 60;

  return (
    <div className="absolute inset-0 z-10 flex flex-col text-white" style={{ background: "linear-gradient(180deg,#2a1055 0%,#5b21b6 45%,#be185d 100%)" }}>
      <div className="flex shrink-0 items-center gap-3 border-b border-white/15 bg-black/25 px-3 py-2 backdrop-blur">
        <button type="button" onClick={onBack} className="rounded-lg border border-white/25 px-3 py-1.5 text-sm font-semibold hover:bg-white/10">
          ← Title
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="text-lg font-black leading-tight" style={{ color: accent }}>Sugar Swap</div>
          <div className="text-[11px] text-white/60">Pick a level</div>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-black/30 px-3 py-1.5 text-sm font-black">
          <svg width="16" height="16" viewBox="-12 -12 24 24" aria-hidden><path d="M0 -10 L2.9 -3.4 L10 -3 L4.6 1.6 L6.2 8.6 L0 4.9 L-6.2 8.6 L-4.6 1.6 L-10 -3 L-2.9 -3.4Z" fill="#fde047" stroke="#b45309" strokeWidth="1.6" strokeLinejoin="round" /></svg>
          <span className="tabular-nums">{totalStars}</span>
          <span className="text-white/50">/ {LEVELS.length * 3}</span>
        </div>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="relative mx-auto" style={{ width: WIDTH, height }}>
          <svg className="absolute inset-0" width={WIDTH} height={height} aria-hidden>
            <path d={path} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="22" strokeLinecap="round" transform="translate(0 4)" />
            <path d={path} fill="none" stroke="#fbcfe8" strokeWidth="16" strokeLinecap="round" />
            <path d={path} fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 12" />
          </svg>
          {LEVELS.map((lv, i) => {
            const open = unlocked(i);
            const done = (stars[i] ?? 0) > 0;
            const isCurrent = i === current && open;
            return (
              <div key={lv.name} className="absolute" style={{ left: nodeX(i) - 30, top: nodeY(i) - 30, width: 60 }}>
                <button
                  type="button"
                  disabled={!open}
                  onClick={() => onPick(i)}
                  aria-label={`Level ${i + 1}: ${lv.name}${open ? "" : " (locked)"}`}
                  className={`relative flex h-[60px] w-[60px] items-center justify-center rounded-full border-4 text-xl font-black shadow-lg transition ${
                    open ? "border-white hover:scale-110 active:scale-95" : "cursor-not-allowed border-white/30"
                  } ${isCurrent ? "animate-pulse" : ""}`}
                  style={{
                    background: !open
                      ? "#52456e"
                      : done
                        ? "radial-gradient(circle at 35% 30%, #fde68a, #f59e0b)"
                        : "radial-gradient(circle at 35% 30%, #f9a8d4, #ec4899)",
                    color: !open ? "rgba(255,255,255,0.45)" : done ? "#78350f" : "#fff",
                    boxShadow: isCurrent ? "0 0 0 6px rgba(253,224,71,0.5), 0 6px 14px rgba(0,0,0,0.4)" : undefined,
                  }}
                >
                  {open ? i + 1 : "🔒"}
                  {open && (
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-xs shadow">
                      {GOAL_ICON[lv.goal.type]}
                    </span>
                  )}
                </button>
                <div className="mt-1 flex justify-center">{done ? <Stars n={stars[i]} size={15} /> : null}</div>
                {open && (
                  <div className="pointer-events-none absolute left-1/2 top-[66px] w-28 -translate-x-1/2 text-center text-[10px] font-bold text-white/70" style={{ marginTop: done ? 14 : 0 }}>
                    {lv.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
