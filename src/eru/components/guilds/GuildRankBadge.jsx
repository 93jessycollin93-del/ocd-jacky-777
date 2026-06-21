import { Shield } from 'lucide-react';
import { GUILD_RANKS, nextRank } from '@/eru/lib/guildSystem';

const RANK_STYLES = {
  bronze:   { ring: 'border-amber-700/50',   text: 'text-amber-300',   bar: 'from-amber-700 to-orange-600' },
  silver:   { ring: 'border-slate-400/50',   text: 'text-slate-200',   bar: 'from-slate-400 to-slate-600' },
  gold:     { ring: 'border-yellow-400/60',  text: 'text-yellow-300',  bar: 'from-yellow-400 to-amber-600' },
  platinum: { ring: 'border-cyan-400/60',    text: 'text-cyan-300',    bar: 'from-cyan-300 to-sky-600' },
  diamond:  { ring: 'border-indigo-400/60',  text: 'text-indigo-300',  bar: 'from-indigo-400 to-violet-600' },
  mythic:   { ring: 'border-fuchsia-400/70', text: 'text-fuchsia-300', bar: 'from-pink-400 via-fuchsia-500 to-purple-700' },
};

/**
 * Compact rank badge with progress to next tier. Pure presentational.
 */
export default function GuildRankBadge({ rank, rankPoints = 0, compact = false }) {
  if (!rank) return null;
  const style = RANK_STYLES[rank.id] || RANK_STYLES.bronze;
  const next = nextRank(rank.id);
  const span = next ? Math.max(1, next.minPoints - rank.minPoints) : 1;
  const progress = next ? Math.min(100, Math.max(0, ((rankPoints - rank.minPoints) / span) * 100)) : 100;

  return (
    <div className={`rounded-2xl border ${style.ring} bg-card/80 ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className="flex items-center gap-2">
        <Shield className={`w-4 h-4 ${style.text}`} />
        <p className={`text-xs font-bold uppercase tracking-widest ${style.text}`}>{rank.label}</p>
        <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{rankPoints} pts</span>
      </div>
      {next ? (
        <>
          <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${style.bar}`} style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {Math.max(0, next.minPoints - rankPoints)} pts to {next.label}
          </p>
        </>
      ) : (
        <p className="mt-2 text-[10px] text-muted-foreground">Top rank reached.</p>
      )}
    </div>
  );
}

export { RANK_STYLES, GUILD_RANKS };