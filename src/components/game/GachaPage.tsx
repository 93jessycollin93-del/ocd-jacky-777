import { useState } from 'react';
import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateActiveBanners } from '@/game/gachaData';
import { GachaItem, GearRarity } from '@/game/types';
import { checkRateLimit } from '@/game/transactionGuard';
import { toast } from 'sonner';

const RARITY_COLORS: Record<GearRarity, string> = {
  common: 'text-muted-foreground', uncommon: 'text-green-400', rare: 'text-blue-400',
  ultra_rare: 'text-purple-400', legendary: 'text-yellow-400', mythic: 'text-pink-400',
};

const RARITY_BG: Record<GearRarity, string> = {
  common: 'bg-muted/30', uncommon: 'bg-green-900/20', rare: 'bg-blue-900/20',
  ultra_rare: 'bg-purple-900/20', legendary: 'bg-yellow-900/20', mythic: 'bg-pink-900/20',
};

export default function GachaPage() {
  const { state, pullGacha, freeGachaPull, forgeFragments } = useGame();
  const [results, setResults] = useState<GachaItem[]>([]);
  const [selectedBanner, setSelectedBanner] = useState(0);

  const banners = generateActiveBanners();
  const banner = banners[selectedBanner];
  if (!banner) return <div className="p-4 text-muted-foreground">No banners available</div>;

  const pity = state.gachaPity?.[banner.id] || 0;

  const doPull = (count: number) => {
    const rateCheck = checkRateLimit('gacha_pull');
    if (!rateCheck.allowed) {
      toast.error(`Cooldown: ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`);
      return;
    }
    const items = pullGacha(banner.id, count);
    if (items.length === 0) {
      toast.error('Not enough currency');
      return;
    }
    setResults(items);
    toast.success(`Pulled ${items.length} item(s)!`);
  };

  const doFree = () => {
    const last = state.lastFreePull || 0;
    if (Date.now() - last < 86400000) {
      toast.error('Free pull resets daily');
      return;
    }
    const items = freeGachaPull();
    if (items.length > 0) setResults(items);
  };

  const canFree = !state.lastFreePull || Date.now() - state.lastFreePull >= 86400000;
  const costType = banner.costType === 'gold' ? '💰' : banner.costType === 'stars' ? '⭐' : banner.costType === 'diamonds' ? '💎' : '💎';

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">🎰 Lootcrates</h2>

      {/* Banner selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {banners.map((b, i) => (
          <button key={b.id} onClick={() => { setSelectedBanner(i); setResults([]); }}
            className={`shrink-0 px-3 py-2 rounded-lg text-xs transition-all ${i === selectedBanner ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {b.icon} {b.name}
          </button>
        ))}
      </div>

      {/* Banner info */}
      <Card className="bg-card/80 border-border/50">
        <CardContent className="p-4 text-center">
          <div className="text-3xl mb-2">{banner.icon}</div>
          <div className="text-lg font-bold text-foreground">{banner.name}</div>
          <p className="text-xs text-muted-foreground mt-1">{banner.description}</p>
          <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>Pity: {pity}/{banner.pityThreshold}</span>
            <span>Single: {banner.costSingle} {costType}</span>
            <span>10x: {banner.costMulti} {costType}</span>
          </div>
        </CardContent>
      </Card>

      {/* Pull buttons */}
      <div className="flex gap-2">
        {canFree && (
          <Button variant="secondary" className="flex-1 h-11" onClick={doFree}>🎁 Free Pull</Button>
        )}
        <Button className="flex-1 h-11" onClick={() => doPull(1)}>
          Pull 1 · {banner.costSingle} {costType}
        </Button>
        <Button className="flex-1 h-11" onClick={() => doPull(10)}>
          Pull 10 · {banner.costMulti} {costType}
        </Button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">✨ Results</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {results.map((item, i) => (
              <div key={i} className={`rounded-lg p-2 text-center ${RARITY_BG[item.rarity]}`}>
                <div className="text-2xl">{item.icon}</div>
                <div className={`text-xs font-semibold mt-1 ${RARITY_COLORS[item.rarity]}`}>{item.name}</div>
                <div className="text-[10px] text-muted-foreground">{item.rarity}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory preview */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">📦 Gacha Inventory ({(state.gachaInventory || []).length})</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
          {(state.gachaInventory || []).slice(0, 20).map(item => (
            <div key={item.id} className={`rounded p-1.5 text-center ${RARITY_BG[item.rarity]}`}>
              <div className="text-lg">{item.icon}</div>
              <div className={`text-[10px] truncate ${RARITY_COLORS[item.rarity]}`}>{item.name}</div>
              <div className="text-[10px] text-muted-foreground">×{item.quantity}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
