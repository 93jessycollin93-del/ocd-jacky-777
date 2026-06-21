import { Flame, TrendingUp, Handshake, Sparkles } from 'lucide-react';
import { COLLECTOR_STATUS_ICONS, COLLECTOR_STATUS_LABELS } from '@/eru/lib/collectorRewards';

/**
 * ReputationSnapshot
 * ----------------------------------------------------------------------------
 * Compact stats card that shows the user's current collector status icon plus
 * three core engagement metrics: login streak, successful trades, and
 * portfolio growth. Read-only summary — no business logic.
 *
 * Props:
 *  - profile  CollectorRewardProfile-like object (status_icon, login_streak,
 *             successful_trades, portfolio_growth_pct).
 *  - loading  boolean
 */
export default function ReputationSnapshot({ profile, loading = false }) {
  const statusKey = profile?.status_icon || 'seed';
  const emoji = COLLECTOR_STATUS_ICONS[statusKey] || '🌱';
  const label = COLLECTOR_STATUS_LABELS[statusKey] || 'Rising Collector';

  const streak = Number(profile?.login_streak || 0);
  const trades = Number(profile?.successful_trades || 0);
  const growth = Number(profile?.portfolio_growth_pct || 0);

  return (
    <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl shrink-0">
          {emoji}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
          </div>
          <p className="text-sm font-semibold text-foreground truncate">{label}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat
          icon={Flame}
          label="Streak"
          value={loading ? '—' : `${streak}d`}
          accent={streak >= 7 ? 'text-primary' : 'text-foreground'}
        />
        <Stat
          icon={Handshake}
          label="Trades"
          value={loading ? '—' : trades.toLocaleString()}
          accent={trades >= 5 ? 'text-primary' : 'text-foreground'}
        />
        <Stat
          icon={TrendingUp}
          label="Growth"
          value={loading ? '—' : `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`}
          accent={growth >= 10 ? 'text-primary' : growth < 0 ? 'text-red-400' : 'text-foreground'}
        />
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="w-3 h-3" />
        <span className="text-[10px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className={`mt-0.5 text-base font-semibold ${accent}`}>{value}</p>
    </div>
  );
}