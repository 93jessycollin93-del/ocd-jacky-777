import { useState } from 'react';
import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TROOPS } from '@/game/data';

const CATEGORIES = [
  { key: 'power', label: '⚔️ Power' },
  { key: 'resources', label: '💰 Wealth' },
  { key: 'kills', label: '🗡️ Kills' },
  { key: 'arena', label: '🏆 Arena' },
];

// Mock leaderboard data + player's real stats
function generateLeaderboard(category: string, playerPower: number, playerName: string) {
  const names = ['Sauron_Reborn', 'LordAragorn', 'WitchKing', 'GandalfOP', 'DarkMaster99', 'ShieldBreaker', 'RuneForger', 'StarCommander', 'VoidWalker', 'IronFist', 'DragonSlayer', 'MithrilKing', 'ShadowLord', 'LightBringer', 'WarHammer'];
  const entries = names.map((name, i) => ({
    rank: i + 1,
    name,
    value: Math.floor(Math.max(1000, playerPower * (2 - i * 0.12) + Math.random() * 500)),
    isPlayer: false,
  }));
  
  // Insert player at appropriate rank
  const playerValue = category === 'power' ? playerPower : Math.floor(playerPower * 0.7 + Math.random() * 200);
  entries.push({ rank: 0, name: playerName, value: playerValue, isPlayer: true });
  entries.sort((a, b) => b.value - a.value);
  entries.forEach((e, i) => e.rank = i + 1);
  
  return entries.slice(0, 15);
}

const RANK_ICONS = ['', '🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { state } = useGame();
  const [tab, setTab] = useState('power');

  // Calculate player power
  let playerPower = 0;
  for (const t of state.troops) {
    const def = TROOPS.find(d => d.id === t.id);
    if (def) playerPower += (def.attack + def.defense + def.health) * t.count;
  }
  for (const b of state.buildings) playerPower += b.level * 50;
  for (const r of state.research) playerPower += r.level * 80;

  const entries = generateLeaderboard(tab, playerPower, state.realmName);

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">🏅 Leaderboard</h2>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {CATEGORIES.map(c => (
            <TabsTrigger key={c.key} value={c.key} className="text-xs px-2 py-1">{c.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-1">
        {entries.map(e => (
          <Card key={e.rank} className={`bg-card/80 ${e.isPlayer ? 'border-primary/50 ring-1 ring-primary/30' : 'border-border/50'}`}>
            <CardContent className="p-2.5 flex items-center gap-3">
              <div className="w-8 text-center">
                {e.rank <= 3 ? (
                  <span className="text-lg">{RANK_ICONS[e.rank]}</span>
                ) : (
                  <span className="text-xs text-muted-foreground font-mono">#{e.rank}</span>
                )}
              </div>
              <div className="flex-1">
                <span className={`text-sm ${e.isPlayer ? 'text-primary font-bold' : 'text-foreground'}`}>
                  {e.name} {e.isPlayer && '(You)'}
                </span>
              </div>
              <span className="text-sm font-mono text-foreground">{e.value.toLocaleString()}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
