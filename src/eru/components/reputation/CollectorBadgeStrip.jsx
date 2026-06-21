import { COLLECTOR_REWARD_BADGES } from '../../lib/collectorRewards';

export default function CollectorBadgeStrip({ badgeIds = [], limit = 3 }) {
  const visibleBadges = badgeIds.slice(0, limit);

  if (visibleBadges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {visibleBadges.map((badgeId) => {
        const badge = COLLECTOR_REWARD_BADGES[badgeId];
        if (!badge) return null;
        return (
          <span key={badgeId} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
            <span>{badge.emoji}</span>
            <span>{badge.label}</span>
          </span>
        );
      })}
    </div>
  );
}