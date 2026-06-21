import { useMemo } from 'react';
import { Crown, Gem, Activity, Sparkles, Trophy } from 'lucide-react';
import { useRealtimeEntityList } from '@/eru/hooks/useLiveSync';
import { maskEmail } from '@/eru/lib/privacy';

function getOwnerEmail(record, fallbackField) {
  return record?.[fallbackField] || record?.created_by || 'unknown';
}

function buildCollectorMap({ jadeAssets, cards, transactions, listings }) {
  const collectorMap = new Map();

  const ensureCollector = (email) => {
    if (!collectorMap.has(email)) {
      collectorMap.set(email, {
        email,
        portfolioValue: 0,
        rareCards: 0,
        marketActivity: 0,
        activeListings: 0,
        totalScore: 0,
      });
    }
    return collectorMap.get(email);
  };

  jadeAssets.forEach((asset) => {
    const owner = ensureCollector(getOwnerEmail(asset, 'created_by'));
    owner.portfolioValue += Number(asset.valuation || 0);
  });

  cards.forEach((card) => {
    const owner = ensureCollector(getOwnerEmail(card, 'created_by'));
    const quantity = Number(card.quantity || 1);
    if (['rare', 'epic', 'legendary', 'mythic'].includes(card.rarity)) {
      owner.rareCards += quantity;
    }
    const rarityWeight = {
      common: 20,
      rare: 60,
      epic: 120,
      legendary: 220,
      mythic: 400,
    };
    owner.portfolioValue += (rarityWeight[card.rarity] || 20) * quantity;
  });

  transactions.forEach((transaction) => {
    const owner = ensureCollector(getOwnerEmail(transaction, 'buyer_email'));
    owner.marketActivity += 1;
    owner.portfolioValue += transaction.status === 'verified' ? Number(transaction.amount || 0) * 0.2 : 0;
  });

  listings.forEach((listing) => {
    const owner = ensureCollector(getOwnerEmail(listing, 'seller_email'));
    owner.activeListings += listing.status === 'active' ? 1 : 0;
    owner.marketActivity += listing.status === 'active' ? 2 : 1;
  });

  return Array.from(collectorMap.values()).map((collector) => ({
    ...collector,
    totalScore: Number((collector.portfolioValue + collector.rareCards * 180 + collector.marketActivity * 90 + collector.activeListings * 75).toFixed(2)),
  })).sort((a, b) => b.totalScore - a.totalScore);
}

export default function CollectorLeaderboard() {
  const { data: jadeAssets, loading: jadeLoading } = useRealtimeEntityList('JadeAsset', { sort: '-updated_date', limit: 200 });
  const { data: cards, loading: cardsLoading } = useRealtimeEntityList('Card', { sort: '-updated_date', limit: 200 });
  const { data: transactions, loading: txLoading } = useRealtimeEntityList('Transaction', { sort: '-updated_date', limit: 200 });
  const { data: listings, loading: listingsLoading } = useRealtimeEntityList('CardListing', { sort: '-updated_date', limit: 200 });

  const leaderboard = useMemo(() => buildCollectorMap({ jadeAssets, cards, transactions, listings }), [jadeAssets, cards, transactions, listings]);
  const topCollectors = leaderboard.slice(0, 5);
  const recentAchievers = [...leaderboard].sort((a, b) => b.marketActivity - a.marketActivity).slice(0, 3);
  const featuredCollectors = [...leaderboard].sort((a, b) => b.rareCards - a.rareCards).slice(0, 2);

  if (jadeLoading || cardsLoading || txLoading || listingsLoading) {
    return <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground">Loading collector leaderboard…</div>;
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Collector Leaderboard</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">Rankings combine portfolio value, rare card depth, and market activity.</p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary">Competitive</div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-[11px] text-muted-foreground">Top portfolio</p>
          <p className="text-lg font-semibold text-foreground">${Math.round(topCollectors[0]?.portfolioValue || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-[11px] text-muted-foreground">Most rare cards</p>
          <p className="text-lg font-semibold text-foreground">{topCollectors.reduce((max, item) => Math.max(max, item.rareCards), 0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-[11px] text-muted-foreground">Live collectors ranked</p>
          <p className="text-lg font-semibold text-foreground">{leaderboard.length}</p>
        </div>
      </div>

      <div className="space-y-2">
        {topCollectors.map((collector, index) => (
          <div key={collector.email} className="rounded-xl border border-border bg-secondary/30 p-3 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground border border-border'}`}>
              {index === 0 ? <Crown className="w-4 h-4" /> : `#${index + 1}`}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold truncate">{maskEmail(collector.email)}</p>
                {index === 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Top Collector</span>}
              </div>
              <div className="flex gap-3 flex-wrap mt-1 text-[11px] text-muted-foreground">
                <span>Portfolio ${Math.round(collector.portfolioValue).toLocaleString()}</span>
                <span>Rare cards {collector.rareCards}</span>
                <span>Activity {collector.marketActivity}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-primary">{Math.round(collector.totalScore).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">score</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-secondary/30 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold">Recent achievers</p>
          </div>
          <div className="space-y-2">
            {recentAchievers.map((collector) => (
              <div key={collector.email} className="rounded-lg bg-background px-3 py-2">
                <p className="text-xs font-semibold">{maskEmail(collector.email)}</p>
                <p className="text-[11px] text-muted-foreground">{collector.marketActivity} market actions and {collector.activeListings} active listings</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/30 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Gem className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold">Top collector profiles</p>
          </div>
          <div className="space-y-2">
            {featuredCollectors.map((collector) => (
              <div key={collector.email} className="rounded-lg bg-background px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{maskEmail(collector.email)}</p>
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Rare cards: {collector.rareCards} · Portfolio: ${Math.round(collector.portfolioValue).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}