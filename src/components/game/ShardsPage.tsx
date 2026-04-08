import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const SHARD_DEFS = [
  { key: 'light', name: 'Light Shards', icon: '☀️', color: 'text-yellow-400', bg: 'bg-yellow-900/20', thresholds: [10, 25, 50, 100], bonuses: ['ATK +5%', 'ATK +10%', 'ATK +20%', 'ATK +35%'] },
  { key: 'dark', name: 'Dark Shards', icon: '🌑', color: 'text-purple-400', bg: 'bg-purple-900/20', thresholds: [10, 25, 50, 100], bonuses: ['DEF +5%', 'DEF +10%', 'DEF +20%', 'DEF +35%'] },
  { key: 'balance', name: 'Balance Shards', icon: '⚖️', color: 'text-blue-400', bg: 'bg-blue-900/20', thresholds: [10, 25, 50, 100], bonuses: ['HP +5%', 'HP +10%', 'HP +20%', 'HP +35%'] },
];

export default function ShardsPage() {
  const { state } = useGame();
  const shards = state.shards || { light: 0, dark: 0, balance: 0 };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">🔮 Shards</h2>
      <p className="text-xs text-muted-foreground">Collect shards from events and battles. Unlock bonuses at thresholds.</p>

      <div className="grid grid-cols-1 gap-3">
        {SHARD_DEFS.map(s => {
          const count = shards[s.key as keyof typeof shards] || 0;
          const maxThreshold = s.thresholds[s.thresholds.length - 1];

          return (
            <Card key={s.key} className={`${s.bg} border-border/50`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{s.icon}</span>
                  <div>
                    <div className={`text-lg font-bold ${s.color}`}>{count}</div>
                    <div className="text-sm text-foreground">{s.name}</div>
                  </div>
                </div>

                <Progress value={Math.min(100, (count / maxThreshold) * 100)} className="h-2 mb-3" />

                <div className="space-y-1">
                  {s.thresholds.map((t, i) => {
                    const unlocked = count >= t;
                    return (
                      <div key={t} className={`flex items-center gap-2 text-xs ${unlocked ? s.color : 'text-muted-foreground'}`}>
                        <span>{unlocked ? '✅' : '🔒'}</span>
                        <span>{t} shards — {s.bonuses[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Fusion hint */}
      <Card className="bg-card/80 border-border/50">
        <CardContent className="p-3">
          <div className="text-sm font-semibold text-foreground mb-1">⚗️ Shard Fusion</div>
          <p className="text-xs text-muted-foreground">
            When you collect 50+ of each type, a special fusion event unlocks granting a permanent realm-wide bonus.
            Current: {Math.min(shards.light, shards.dark, shards.balance)}/50 minimum across all types.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
