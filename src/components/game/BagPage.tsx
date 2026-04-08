import { useState } from 'react';
import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BagCategory, GearRarity } from '@/game/types';
import { toast } from 'sonner';

const RARITY_COLORS: Record<GearRarity, string> = {
  common: 'text-muted-foreground', uncommon: 'text-green-400', rare: 'text-blue-400',
  ultra_rare: 'text-purple-400', legendary: 'text-yellow-400', mythic: 'text-pink-400',
};

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'speedups', label: '⏩' },
  { key: 'resources', label: '📦' },
  { key: 'boosts', label: '⚡' },
  { key: 'shields', label: '🛡️' },
  { key: 'equipment', label: '⚔️' },
];

export default function BagPage() {
  const { state, setState, saveState, useGachaItem } = useGame();
  const [tab, setTab] = useState('all');

  const bag = state.bag || [];
  const gachaItems = (state.gachaInventory || []).filter(i => i.category === 'consumable');

  // Merge bag + gacha consumables for unified view
  const allItems = [
    ...bag.map(b => ({ ...b, source: 'bag' as const })),
    ...gachaItems.map(g => ({ id: g.id, name: g.name, icon: g.icon, category: 'boosts' as BagCategory, rarity: g.rarity, quantity: g.quantity, description: g.description, source: 'gacha' as const })),
  ];

  const filtered = tab === 'all' ? allItems : allItems.filter(i => i.category === tab);

  const useBagItem = (item: typeof allItems[0]) => {
    if (item.source === 'gacha') {
      const ok = useGachaItem(item.id);
      if (ok) toast.success(`Used ${item.icon} ${item.name}`);
      else toast.error('Cannot use this item');
      return;
    }

    // Use bag item (resource packs apply instantly)
    setState(prev => {
      const bag = [...(prev.bag || [])];
      const idx = bag.findIndex(b => b.id === item.id);
      if (idx < 0) return prev;

      const resources = { ...prev.resources };
      const bagItem = bag[idx];

      // Apply resource packs
      if (bagItem.resourceType && bagItem.value) {
        const key = bagItem.resourceType as keyof typeof resources;
        resources[key] = (resources[key] || 0) + bagItem.value;
      }

      // Decrement
      if (bagItem.quantity > 1) {
        bag[idx] = { ...bagItem, quantity: bagItem.quantity - 1 };
      } else {
        bag.splice(idx, 1);
      }

      const ns = { ...prev, resources, bag };
      saveState(ns);
      return ns;
    });
    toast.success(`Used ${item.icon} ${item.name}`);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">🎒 Bag</h2>
      <p className="text-xs text-muted-foreground">{allItems.length} items · Tap Use to consume</p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {TABS.map(t => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs px-2 py-1">{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No items in this category</div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {filtered.map(item => (
            <Card key={item.id} className="bg-card/80 border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${RARITY_COLORS[item.rarity]}`}>
                    {item.name} <span className="text-muted-foreground">×{item.quantity}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                {(item.category === 'resources' || item.source === 'gacha') && (
                  <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => useBagItem(item)}>Use</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Battle Plans */}
      {(state.battlePlans || []).length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-lg text-foreground mb-2">📝 Battle Plans</h3>
          <div className="grid grid-cols-1 gap-2">
            {(state.battlePlans || []).map(note => (
              <Card key={note.id} className="bg-card/80 border-border/50">
                <CardContent className="p-3">
                  <div className="text-sm font-semibold text-foreground">{note.title}</div>
                  <p className="text-xs text-muted-foreground mt-1">{note.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
