import { Sparkles, Lock } from 'lucide-react';
import { COSMETIC_CATALOG, GUILD_RANKS } from '@/eru/lib/guildSystem';

/**
 * Visual catalog of cosmetic rewards — banners and card backings — with
 * locked items shown faintly so members can see what's still ahead.
 */
export default function GuildCosmeticsPanel({ unlocked = [] }) {
  const owned = new Set(unlocked);
  // Build full catalog with rank attribution so locked items show their tier.
  const catalog = Object.values(COSMETIC_CATALOG).map((c) => {
    const tier = GUILD_RANKS.find((r) => r.cosmetics.includes(c.id));
    return { ...c, tierLabel: tier?.label || 'Bronze' };
  });

  const banners = catalog.filter((c) => c.kind === 'banner');
  const backings = catalog.filter((c) => c.kind === 'card_back');

  return (
    <div className="space-y-4">
      <Section title="Banners" items={banners} owned={owned} render={renderBanner} />
      <Section title="Card Backings" items={backings} owned={owned} render={renderCardBack} />
    </div>
  );
}

function Section({ title, items, owned, render }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((c) => {
          const isOwned = owned.has(c.id);
          return (
            <div
              key={c.id}
              className={`relative overflow-hidden rounded-xl border p-2 ${isOwned ? 'border-fuchsia-400/30 bg-card' : 'border-border bg-secondary/40 opacity-70'}`}
            >
              {render(c)}
              <p className="mt-1.5 text-[11px] font-semibold truncate">{c.label}</p>
              <div className="flex items-center justify-between gap-1 mt-0.5">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{c.tierLabel}</span>
                {!isOwned && <Lock className="w-3 h-3 text-muted-foreground" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderBanner(c) {
  return <div className={`h-12 rounded-lg bg-gradient-to-r ${c.gradient}`} />;
}
function renderCardBack(c) {
  return (
    <div className={`h-16 rounded-lg bg-gradient-to-br ${c.gradient} flex items-center justify-center`}>
      <div className="w-6 h-6 rounded-md border border-white/30" />
    </div>
  );
}