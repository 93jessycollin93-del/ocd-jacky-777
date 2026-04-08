import { useState } from 'react';
import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GearRarity } from '@/game/types';
import { atomicDiamondSpend, logTransaction, checkRateLimit } from '@/game/transactionGuard';
import { toast } from 'sonner';

interface PremiumItem {
  id: string; name: string; icon: string; rarity: GearRarity;
  description: string; diamondCost: number; category: string;
}

const PREMIUM_ITEMS: PremiumItem[] = [
  { id: 'badge_conqueror', name: 'Conqueror Badge', icon: '🏆', rarity: 'legendary', description: 'Show your dominance. Displayed on profile.', diamondCost: 500, category: 'badges' },
  { id: 'badge_architect', name: 'Architect Badge', icon: '🏛️', rarity: 'legendary', description: 'Master builder title.', diamondCost: 500, category: 'badges' },
  { id: 'badge_void', name: 'Void Walker Badge', icon: '🌌', rarity: 'mythic', description: 'Rare prestige title.', diamondCost: 2000, category: 'badges' },
  { id: 'skin_golden_keep', name: 'Golden Keep Skin', icon: '🏰✨', rarity: 'legendary', description: 'Your keep shines with golden light.', diamondCost: 1000, category: 'skins' },
  { id: 'skin_dark_fortress', name: 'Dark Fortress Skin', icon: '🏴', rarity: 'legendary', description: 'Menacing obsidian city skin.', diamondCost: 1000, category: 'skins' },
  { id: 'skin_crystal_realm', name: 'Crystal Realm Skin', icon: '💎🏰', rarity: 'mythic', description: 'Ethereal crystal city skin.', diamondCost: 3000, category: 'skins' },
  { id: 'frame_dragon', name: 'Dragon Frame', icon: '🐉', rarity: 'ultra_rare', description: 'Fiery profile frame.', diamondCost: 300, category: 'frames' },
  { id: 'frame_celestial', name: 'Celestial Frame', icon: '⭐', rarity: 'legendary', description: 'Starlit profile frame.', diamondCost: 800, category: 'frames' },
  { id: 'emote_victory', name: 'Victory Emote', icon: '🎉', rarity: 'rare', description: 'Celebration emote for chat.', diamondCost: 150, category: 'emotes' },
  { id: 'emote_taunt', name: 'Taunt Emote', icon: '😈', rarity: 'rare', description: 'Mock your enemies stylishly.', diamondCost: 150, category: 'emotes' },
  { id: 'namecolor_gold', name: 'Golden Name', icon: '✨', rarity: 'legendary', description: 'Your name appears in gold.', diamondCost: 600, category: 'cosmetics' },
  { id: 'namecolor_rainbow', name: 'Rainbow Name', icon: '🌈', rarity: 'mythic', description: 'Animated rainbow name effect.', diamondCost: 2500, category: 'cosmetics' },
];

const RARITY_COLORS: Record<GearRarity, string> = {
  common: 'text-muted-foreground', uncommon: 'text-green-400', rare: 'text-blue-400',
  ultra_rare: 'text-purple-400', legendary: 'text-yellow-400', mythic: 'text-pink-400',
};

export default function PremiumStorePage() {
  const { state, setState, saveState } = useGame();

  const purchase = (item: PremiumItem) => {
    const rateCheck = checkRateLimit('jade_store');
    if (!rateCheck.allowed) { toast.error(`Cooldown: ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`); return; }

    setState(prev => {
      const result = atomicDiamondSpend(prev, item.diamondCost, 'premium_store', item.id);
      if (!result.success) { toast.error('Not enough 💎'); return prev; }
      if (result.txRecord) logTransaction(result.txRecord);
      
      // Add to bag as cosmetic
      const bag = [...(prev.bag || [])];
      bag.push({
        id: `prem_${Date.now()}`, name: item.name, icon: item.icon,
        category: 'nfts', rarity: item.rarity, quantity: 1,
        description: item.description, obtainedAt: Date.now(),
      });
      const ns = { ...result.newState, bag };
      saveState(ns);
      toast.success(`Purchased ${item.icon} ${item.name}!`);
      return ns;
    });
  };

  const owned = new Set((state.bag || []).filter(b => b.category === 'nfts').map(b => b.name));

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">💎 Premium Store</h2>
      <p className="text-xs text-muted-foreground">Exclusive diamond-only cosmetics. Balance: {state.resources.diamonds.toLocaleString()} 💎</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PREMIUM_ITEMS.map(item => {
          const isOwned = owned.has(item.name);
          return (
            <Card key={item.id} className={`bg-card/80 ${isOwned ? 'border-green-500/40 opacity-70' : 'border-border/50'}`}>
              <CardContent className="p-3 flex items-start gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${RARITY_COLORS[item.rarity]}`}>{item.name}</div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                {isOwned ? (
                  <span className="text-xs text-green-400 shrink-0">Owned ✓</span>
                ) : (
                  <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => purchase(item)}>
                    {item.diamondCost} 💎
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
