import { useState } from 'react';
import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FactionId, AllianceLevel } from '@/game/types';
import { toast } from 'sonner';

const FACTIONS: { id: FactionId; name: string; icon: string; desc: string }[] = [
  { id: 'edain', name: 'Edain', icon: '⚔️', desc: 'Fierce warriors of the plains. Bonus: +10% troop attack when Allied.' },
  { id: 'eldari', name: 'Eldari', icon: '🌿', desc: 'Ancient forest dwellers. Bonus: +15% gathering when Allied.' },
  { id: 'khazari', name: 'Khazari', icon: '⛏️', desc: 'Mountain forge-masters. Bonus: +10% iron production when Allied.' },
];

const ALLIANCE_COLORS: Record<AllianceLevel, string> = {
  neutral: 'text-muted-foreground', friendly: 'text-green-400', allied: 'text-blue-400', bonded: 'text-yellow-400',
};

const GIFT_OPTIONS = [
  { resource: 'food', amount: 500, standing: 5, label: '🌾 500 Food (+5)' },
  { resource: 'gold', amount: 200, standing: 10, label: '💰 200 Gold (+10)' },
  { resource: 'iron', amount: 300, standing: 8, label: '⚙️ 300 Iron (+8)' },
];

export default function DiplomacyPage() {
  const { state, giftFaction, activateTradeRoute, canAfford } = useGame();
  const factions = state.factions || [
    { id: 'edain' as FactionId, standing: 0, allianceLevel: 'neutral' as AllianceLevel, tradeRouteActive: false },
    { id: 'eldari' as FactionId, standing: 0, allianceLevel: 'neutral' as AllianceLevel, tradeRouteActive: false },
    { id: 'khazari' as FactionId, standing: 0, allianceLevel: 'neutral' as AllianceLevel, tradeRouteActive: false },
  ];

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">🤝 Diplomacy</h2>
      <p className="text-xs text-muted-foreground">Build faction relations. Allied factions grant bonuses.</p>

      <div className="grid grid-cols-1 gap-3">
        {FACTIONS.map(f => {
          const fState = factions.find(fs => fs.id === f.id);
          const standing = fState?.standing || 0;
          const level = fState?.allianceLevel || 'neutral';
          const tradeActive = fState?.tradeRouteActive || false;

          return (
            <Card key={f.id} className="bg-card/80 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{f.name}</div>
                    <div className={`text-xs ${ALLIANCE_COLORS[level]}`}>{level.toUpperCase()}</div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-2">{f.desc}</p>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Standing:</span>
                  <Progress value={standing} className="flex-1 h-2" />
                  <span className="text-xs text-foreground">{standing}/100</span>
                </div>

                {/* Gift options */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {GIFT_OPTIONS.map(gift => (
                    <Button key={gift.resource} variant="outline" size="sm" className="h-7 text-xs"
                      disabled={!canAfford({ [gift.resource]: gift.amount })}
                      onClick={() => {
                        if (giftFaction(f.id, gift.resource, gift.amount, gift.standing)) {
                          toast.success(`Gifted to ${f.name}! +${gift.standing} standing`);
                        }
                      }}>
                      {gift.label}
                    </Button>
                  ))}
                </div>

                {/* Trade route */}
                {standing >= 50 && !tradeActive && (
                  <Button size="sm" className="h-7 text-xs w-full" variant="secondary"
                    onClick={() => { activateTradeRoute(f.id); toast.success(`Trade route with ${f.name} activated!`); }}>
                    🛤️ Activate Trade Route
                  </Button>
                )}
                {tradeActive && (
                  <div className="text-xs text-green-400 text-center">✅ Trade Route Active</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
