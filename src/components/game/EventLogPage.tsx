import { useState } from 'react';
import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EVENT_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'battle', label: '⚔️ Battle' },
  { key: 'upgrade', label: '🏗️ Build' },
  { key: 'resource', label: '📦 Loot' },
  { key: 'ai', label: '🔮 AI' },
];

export default function EventLogPage() {
  const { state } = useGame();
  const [filter, setFilter] = useState('all');

  // Combine multiple event sources into unified timeline
  const events: { id: string; icon: string; title: string; desc: string; time: number; type: string; color: string }[] = [];

  // AI events
  for (const e of (state.aiEventLog || [])) {
    events.push({ id: e.id, icon: '🔮', title: e.title, desc: e.description, time: e.timestamp, type: 'ai', color: 'text-purple-400' });
  }

  // Completed marches
  for (const m of state.marches.filter(m => m.result)) {
    events.push({
      id: m.id, icon: m.result!.victory ? '⚔️' : '💀',
      title: `${m.result!.victory ? 'Victory' : 'Defeat'}: ${m.expeditionId}`,
      desc: `Power: ${m.result!.playerPower.toLocaleString()} vs ${m.result!.enemyPower.toLocaleString()}`,
      time: m.endTime, type: 'battle',
      color: m.result!.victory ? 'text-green-400' : 'text-red-400',
    });
  }

  // Completed building upgrades
  for (const b of state.buildings.filter(b => b.level > 1 && !b.upgrading)) {
    events.push({
      id: `bld_${b.id}`, icon: '🏗️', title: `${b.id} upgraded to Lv${b.level}`,
      desc: 'Building upgrade completed', time: Date.now() - (50 - b.level) * 60000,
      type: 'upgrade', color: 'text-blue-400',
    });
  }

  // Gacha history
  for (const p of (state.gachaHistory || []).slice(-10)) {
    events.push({
      id: p.id, icon: '🎰', title: `Pulled: ${p.item.icon} ${p.item.name}`,
      desc: `${p.item.rarity} from ${p.bannerId}`, time: p.timestamp,
      type: 'resource', color: 'text-yellow-400',
    });
  }

  // Sort newest first
  events.sort((a, b) => b.time - a.time);

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">📜 Event Log</h2>
      <p className="text-xs text-muted-foreground">{events.length} events recorded</p>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {EVENT_TYPES.map(t => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs px-2 py-1">{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No events yet</div>
      ) : (
        <div className="space-y-1">
          {filtered.slice(0, 30).map(e => (
            <Card key={e.id} className="bg-card/80 border-border/50">
              <CardContent className="p-2.5 flex items-start gap-2">
                <span className="text-lg shrink-0">{e.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${e.color}`}>{e.title}</div>
                  <div className="text-xs text-muted-foreground">{e.desc}</div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
