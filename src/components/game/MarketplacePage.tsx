import { useState } from 'react';
import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Resources } from '@/game/types';
import { toast } from 'sonner';

const RESOURCE_ICONS: Record<string, string> = { food: '🌾', wood: '🪵', stone: '⛏️', iron: '⚙️', gold: '💰' };
const EXCHANGE_PAIRS: { from: keyof Resources; to: keyof Resources; rate: number }[] = [
  { from: 'food', to: 'wood', rate: 1.2 },
  { from: 'food', to: 'stone', rate: 1.5 },
  { from: 'wood', to: 'stone', rate: 1.3 },
  { from: 'wood', to: 'iron', rate: 2.0 },
  { from: 'stone', to: 'iron', rate: 1.5 },
  { from: 'iron', to: 'gold', rate: 3.0 },
  { from: 'food', to: 'gold', rate: 5.0 },
];

// Simulated NPC deals that rotate
function getNPCDeals() {
  const hour = Math.floor(Date.now() / 3600000);
  const deals = [
    { name: 'Merchant Caravan', icon: '🐪', from: 'food' as keyof Resources, to: 'iron' as keyof Resources, rate: 1.5, amount: 500, discount: '25% off' },
    { name: 'Dwarven Trader', icon: '⛏️', from: 'stone' as keyof Resources, to: 'gold' as keyof Resources, rate: 2.0, amount: 200, discount: '33% off' },
    { name: 'Elven Exchange', icon: '🌿', from: 'wood' as keyof Resources, to: 'food' as keyof Resources, rate: 0.8, amount: 1000, discount: '20% bonus' },
  ];
  return deals.slice(hour % 3, (hour % 3) + 2);
}

export default function MarketplacePage() {
  const { state, exchangeResources } = useGame();
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const npcDeals = getNPCDeals();

  const doExchange = (from: keyof Resources, to: keyof Resources, rate: number, amount: number) => {
    if (exchangeResources(from, to, rate, amount)) {
      toast.success(`Exchanged ${Math.floor(rate * amount)} ${RESOURCE_ICONS[from]} → ${amount} ${RESOURCE_ICONS[to]}`);
    } else {
      toast.error('Not enough resources');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">🏬 Marketplace</h2>
      <p className="text-xs text-muted-foreground">Exchange resources. Rates fluctuate.</p>

      {/* Resource overview */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(['food', 'wood', 'stone', 'iron', 'gold'] as (keyof Resources)[]).map(r => (
          <span key={r} className="bg-muted px-2 py-1 rounded text-foreground">
            {RESOURCE_ICONS[r]} {Math.floor(state.resources[r]).toLocaleString()}
          </span>
        ))}
      </div>

      {/* NPC Deals */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">🏷️ Limited Deals</h3>
        <div className="grid grid-cols-1 gap-2">
          {npcDeals.map((deal, i) => (
            <Card key={i} className="bg-card/80 border-yellow-500/30">
              <CardContent className="p-3 flex items-center gap-3">
                <span className="text-2xl">{deal.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">{deal.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {Math.floor(deal.rate * deal.amount)} {RESOURCE_ICONS[deal.from]} → {deal.amount} {RESOURCE_ICONS[deal.to]}
                    <span className="text-yellow-400 ml-1">({deal.discount})</span>
                  </div>
                </div>
                <Button size="sm" className="h-7 text-xs" onClick={() => doExchange(deal.from, deal.to, deal.rate, deal.amount)}>Trade</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Exchange Table */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">💱 Exchange</h3>
        <div className="grid grid-cols-1 gap-2">
          {EXCHANGE_PAIRS.map((pair, i) => {
            const key = `${pair.from}_${pair.to}`;
            const amount = amounts[key] || 100;
            const cost = Math.floor(pair.rate * amount);
            const canDo = (state.resources[pair.from] || 0) >= cost;
            return (
              <Card key={i} className="bg-card/80 border-border/50">
                <CardContent className="p-3 flex items-center gap-2">
                  <span className="text-xs text-foreground whitespace-nowrap">
                    {RESOURCE_ICONS[pair.from]} → {RESOURCE_ICONS[pair.to]}
                  </span>
                  <span className="text-xs text-muted-foreground">Rate: {pair.rate}:1</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <input type="range" min={100} max={5000} step={100} value={amount}
                      onChange={e => setAmounts(p => ({ ...p, [key]: +e.target.value }))}
                      className="w-20 h-1 accent-primary" />
                    <span className="text-xs text-foreground w-12 text-right">{amount}</span>
                  </div>
                  <Button size="sm" className="h-7 text-xs ml-1" disabled={!canDo}
                    onClick={() => doExchange(pair.from, pair.to, pair.rate, amount)}>
                    Trade
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
