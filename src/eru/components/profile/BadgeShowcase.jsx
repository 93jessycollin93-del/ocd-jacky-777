import { Award, Lock } from 'lucide-react';
import { COLLECTOR_REWARD_BADGES } from '@/eru/lib/collectorRewards';

/**
 * BadgeShowcase
 * ----------------------------------------------------------------------------
 * Mobile-first grid that shows all available collector badges with an "earned"
 * vs "locked" state. Reuses the central COLLECTOR_REWARD_BADGES registry so
 * adding a badge anywhere in the app surfaces here automatically.
 *
 * Props:
 *  - earnedIds   string[]   IDs the user has already earned.
 *  - title       string     Section title (default: "Your badges").
 *  - subtitle    string     Helper text under title.
 */
export default function BadgeShowcase({
  earnedIds = [],
  title = 'Your badges',
  subtitle,
}) {
  const earnedSet = new Set(earnedIds);
  const allBadges = Object.values(COLLECTOR_REWARD_BADGES);
  const earnedCount = allBadges.filter((b) => earnedSet.has(b.id)).length;
  const totalCount = allBadges.length;

  return (
    <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary whitespace-nowrap">
          {earnedCount}/{totalCount}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {allBadges.map((badge) => {
          const earned = earnedSet.has(badge.id);
          return (
            <div
              key={badge.id}
              className={`relative rounded-xl border p-3 transition-colors ${
                earned
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border bg-secondary/20 opacity-70'
              }`}
              title={badge.description}
            >
              <div className="flex items-start gap-2">
                <span className={`text-xl leading-none ${earned ? '' : 'grayscale'}`} aria-hidden="true">
                  {badge.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold truncate ${earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {badge.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                    {badge.description}
                  </p>
                </div>
                {!earned && (
                  <Lock className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" aria-label="Locked" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {earnedCount === 0 && (
        <p className="text-[11px] text-muted-foreground">
          No badges yet — trade, log in daily, and grow your portfolio to start earning them.
        </p>
      )}
    </section>
  );
}