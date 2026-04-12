import { useState } from 'react';
import { useGame } from '@/game/GameContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BagItem, BagCategory, GearRarity } from '@/game/types';
import { toast } from 'sonner';

interface ShopItem {
  id: string;
  name: string;
  icon: string;
  category: BagCategory;
  rarity: GearRarity;
  description: string;
  cost: { resource: string; amount: number };
  value?: number;
  resourceType?: string;
  duration?: number;
}

const SHOP_ITEMS: ShopItem[] = [
  // Speedups
  { id: 'speed_5m', name: '5-Min Speed Up', icon: '⏩', category: 'speedups', rarity: 'common', description: 'Reduce timer by 5 min', cost: { resource: 'diamonds', amount: 5 }, duration: 300 },
  { id: 'speed_15m', name: '15-Min Speed Up', icon: '⏩', category: 'speedups', rarity: 'uncommon', description: 'Reduce timer by 15 min', cost: { resource: 'diamonds', amount: 12 }, duration: 900 },
  { id: 'speed_1h', name: '1-Hour Speed Up', icon: '⏩', category: 'speedups', rarity: 'rare', description: 'Reduce timer by 1 hour', cost: { resource: 'diamonds', amount: 40 }, duration: 3600 },
  { id: 'speed_8h', name: '8-Hour Speed Up', icon: '⏩', category: 'speedups', rarity: 'ultra_rare', description: 'Reduce timer by 8 hours', cost: { resource: 'diamonds', amount: 250 }, duration: 28800 },
  // Resource packs
  { id: 'food_1k', name: 'Food Pack (1K)', icon: '🌾', category: 'resources', rarity: 'common', description: '+1,000 food', cost: { resource: 'diamonds', amount: 3 }, value: 1000, resourceType: 'food' },
  { id: 'wood_1k', name: 'Wood Pack (1K)', icon: '🪵', category: 'resources', rarity: 'common', description: '+1,000 wood', cost: { resource: 'diamonds', amount: 3 }, value: 1000, resourceType: 'wood' },
  { id: 'stone_1k', name: 'Stone Pack (1K)', icon: '⛏️', category: 'resources', rarity: 'common', description: '+1,000 stone', cost: { resource: 'diamonds', amount: 4 }, value: 1000, resourceType: 'stone' },
  { id: 'iron_500', name: 'Iron Pack (500)', icon: '⚙️', category: 'resources', rarity: 'uncommon', description: '+500 iron', cost: { resource: 'diamonds', amount: 5 }, value: 500, resourceType: 'iron' },
  { id: 'food_10k', name: 'Food Crate (10K)', icon: '🌾', category: 'resources', rarity: 'rare', description: '+10,000 food', cost: { resource: 'diamonds', amount: 25 }, value: 10000, resourceType: 'food' },
  { id: 'iron_5k', name: 'Iron Crate (5K)', icon: '⚙️', category: 'resources', rarity: 'rare', description: '+5,000 iron', cost: { resource: 'diamonds', amount: 40 }, value: 5000, resourceType: 'iron' },
  // Shields
  { id: 'shield_4h', name: 'Peace Shield (4hr)', icon: '🛡️', category: 'shields', rarity: 'uncommon', description: '4-hour shield', cost: { resource: 'diamonds', amount: 20 }, duration: 14400 },
  { id: 'shield_8h', name: 'Peace Shield (8hr)', icon: '🛡️', category: 'shields', rarity: 'rare', description: '8-hour shield', cost: { resource: 'diamonds', amount: 35 }, duration: 28800 },
  { id: 'shield_24h', name: 'Peace Shield (24hr)', icon: '🛡️✨', category: 'shields', rarity: 'ultra_rare', description: '24-hour shield', cost: { resource: 'diamonds', amount: 80 }, duration: 86400 },
  // Boosts
  { id: 'atk_boost', name: 'ATK Boost (30min)', icon: '⚔️', category: 'boosts', rarity: 'uncommon', description: '+20% attack for 30 min', cost: { resource: 'diamonds', amount: 15 }, duration: 1800 },
  { id: 'def_boost', name: 'DEF Boost (30min)', icon: '🛡️', category: 'boosts', rarity: 'uncommon', description: '+20% defense for 30 min', cost: { resource: 'diamonds', amount: 15 }, duration: 1800 },
  { id: 'gather_boost', name: 'Gather Boost (1hr)', icon: '🍀', category: 'boosts', rarity: 'rare', description: '+30% gathering for 1 hour', cost: { resource: 'diamonds', amount: 30 }, duration: 3600 },
  { id: 'train_boost', name: 'Training Boost (1hr)', icon: '🏋️', category: 'boosts', rarity: 'rare', description: '+50% training speed for 1 hr', cost: { resource: 'diamonds', amount: 35 }, duration: 3600 },
];

const RARITY_COLORS: Record<GearRarity, string> = {
  common: 'text-muted-foreground', uncommon: 'text-green-400', rare: 'text-blue-400',
  ultra_rare: 'text-purple-400', legendary: 'text-yellow-400', mythic: 'text-pink-400',
};

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'speedups', label: '⏩ Speed' },
  { key: 'resources', label: '📦 Packs' },
  { key: 'shields', label: '🛡️ Shields' },
  { key: 'boosts', label: '⚡ Boosts' },
];

export default function ShopPage() {
  const { state, canAfford, setState, saveState } = useGame();
  const [category, setCategory] = useState('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const filtered = category === 'all' ? SHOP_ITEMS : SHOP_ITEMS.filter(i => i.category === category);

  const buyItem = (item: ShopItem) => {
    const qty = quantities[item.id] || 1;
    const totalCost = item.cost.amount * qty;
    if (!canAfford({ [item.cost.resource]: totalCost })) {
      toast.error('Not enough ' + item.cost.resource);
      return;
    }

    setState(prev => {
      const resources = { ...prev.resources };
      resources[item.cost.resource as keyof typeof resources] -= totalCost;

      const bag = [...(prev.bag || [])];
      const existing = bag.find(b => b.name === item.name);
      if (existing) {
        existing.quantity = Math.min(100_000, existing.quantity + qty);
      } else {
        bag.push({
          id: `bag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: item.name, icon: item.icon, category: item.category,
          rarity: item.rarity, quantity: qty, description: item.description,
          value: item.value, resourceType: item.resourceType, duration: item.duration,
          obtainedAt: Date.now(),
        });
      }
      const ns = { ...prev, resources, bag };
      saveState(ns);
      return ns;
    });
    toast.success(`Bought ${qty}x ${item.icon} ${item.name}`);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">🏪 Shop</h2>
      <p className="text-xs text-muted-foreground">Purchase items with diamonds. Items go to your Bag.</p>

      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {CATEGORIES.map(c => (
            <TabsTrigger key={c.key} value={c.key} className="text-xs px-2 py-1">{c.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(item => {
          const qty = quantities[item.id] || 1;
          const totalCost = item.cost.amount * qty;
          const affordable = canAfford({ [item.cost.resource]: totalCost });

          return (
            <Card key={item.id} className="bg-card/80 border-border/50">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${RARITY_COLORS[item.rarity]}`}>{item.name}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <button className="w-6 h-6 rounded bg-muted text-foreground text-xs" onClick={() => setQuantities(p => ({ ...p, [item.id]: Math.max(1, (p[item.id] || 1) - 1) }))}>-</button>
                        <span className="text-xs w-6 text-center text-foreground">{qty}</span>
                        <button className="w-6 h-6 rounded bg-muted text-foreground text-xs" onClick={() => setQuantities(p => ({ ...p, [item.id]: Math.min(99, (p[item.id] || 1) + 1) }))}>+</button>
                      </div>
                      <Button size="sm" className="h-7 text-xs" disabled={!affordable} onClick={() => buyItem(item)}>
                        Buy · {totalCost.toLocaleString()} 💎
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
