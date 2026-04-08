import { useState } from 'react';
import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GuildBankState, GuildBoost, Resources } from '@/game/types';
import { toast } from 'sonner';

const RESOURCE_ICONS: Record<string, string> = { food: '🌾', wood: '🪵', stone: '⛏️', iron: '⚙️', gold: '💰' };

const DEFAULT_GUILD: GuildBankState = {
  funds: { food: 5000, wood: 3000, stone: 2000, iron: 1000, gold: 500 },
  taxRate: 10,
  boosts: [
    { id: 'research_speed', name: 'Research Rush', description: '+20% research speed for guild', cost: { gold: 1000 }, effect: 'Research speed +20%', duration: 3600 },
    { id: 'gather_speed', name: 'Gather Frenzy', description: '+25% gathering speed for guild', cost: { gold: 800, food: 2000 }, effect: 'Gathering +25%', duration: 3600 },
    { id: 'train_speed', name: 'War Drums', description: '+15% training speed for guild', cost: { gold: 1200 }, effect: 'Training speed +15%', duration: 3600 },
  ],
  isLeader: true,
  playerRole: 'leader',
  members: [
    { id: '1', name: 'You (Leader)', role: 'leader', joinedAt: Date.now() - 86400000 * 30, lastActive: Date.now(), stabilityContribution: 500 },
    { id: '2', name: 'Thorin', role: 'strategist', joinedAt: Date.now() - 86400000 * 25, lastActive: Date.now() - 3600000, stabilityContribution: 320 },
    { id: '3', name: 'Arwen', role: 'steward', joinedAt: Date.now() - 86400000 * 20, lastActive: Date.now() - 7200000, stabilityContribution: 280 },
    { id: '4', name: 'Gimli', role: 'builder', joinedAt: Date.now() - 86400000 * 15, lastActive: Date.now() - 1800000, stabilityContribution: 410 },
    { id: '5', name: 'Eowyn', role: 'quartermaster', joinedAt: Date.now() - 86400000 * 10, lastActive: Date.now() - 600000, stabilityContribution: 350 },
  ],
  stabilityBeacon: { level: 3, progress: 65, contributors: [], collectiveBonus: 15 },
  log: [
    { id: 'l1', type: 'deposit', amount: { gold: 200 }, description: 'Thorin deposited gold', timestamp: Date.now() - 3600000 },
    { id: 'l2', type: 'boost', amount: { gold: 800 }, description: 'Gather Frenzy activated', timestamp: Date.now() - 7200000 },
    { id: 'l3', type: 'tax', amount: { gold: 50 }, description: 'Daily tax collection', timestamp: Date.now() - 86400000 },
  ],
};

const ROLE_ICONS: Record<string, string> = { leader: '👑', steward: '📊', strategist: '🗺️', builder: '🏗️', quartermaster: '📦', member: '⚔️' };

export default function GuildBankPage() {
  const { state, canAfford, setState, saveState } = useGame();
  const guild = state.guildBank || DEFAULT_GUILD;

  const deposit = (resource: keyof Resources, amount: number) => {
    if (!canAfford({ [resource]: amount })) { toast.error('Not enough ' + resource); return; }
    setState(prev => {
      const resources = { ...prev.resources };
      resources[resource] -= amount;
      const gb = { ...(prev.guildBank || DEFAULT_GUILD) };
      gb.funds = { ...gb.funds, [resource]: (gb.funds[resource] || 0) + amount };
      const ns = { ...prev, resources, guildBank: gb };
      saveState(ns);
      return ns;
    });
    toast.success(`Deposited ${amount} ${RESOURCE_ICONS[resource]}`);
  };

  const activateBoost = (boost: GuildBoost) => {
    const funds = guild.funds;
    for (const [r, amt] of Object.entries(boost.cost)) {
      if ((funds[r as keyof Resources] || 0) < (amt || 0)) { toast.error('Guild lacks ' + r); return; }
    }
    setState(prev => {
      const gb = { ...(prev.guildBank || DEFAULT_GUILD) };
      gb.funds = { ...gb.funds };
      for (const [r, amt] of Object.entries(boost.cost)) {
        gb.funds[r as keyof Resources] = (gb.funds[r as keyof Resources] || 0) - (amt || 0);
      }
      gb.boosts = gb.boosts.map(b => b.id === boost.id ? { ...b, activeUntil: Date.now() + b.duration * 1000 } : b);
      const ns = { ...prev, guildBank: gb };
      saveState(ns);
      return ns;
    });
    toast.success(`${boost.name} activated!`);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">🏦 Guild Bank</h2>

      {/* Treasury */}
      <Card className="bg-card/80 border-border/50">
        <CardContent className="p-3">
          <div className="text-sm font-semibold text-foreground mb-2">Treasury</div>
          <div className="flex flex-wrap gap-2">
            {(['food', 'wood', 'stone', 'iron', 'gold'] as (keyof Resources)[]).map(r => (
              <div key={r} className="text-center">
                <div className="text-lg">{RESOURCE_ICONS[r]}</div>
                <div className="text-xs text-foreground">{Math.floor(guild.funds[r] || 0).toLocaleString()}</div>
                <Button variant="ghost" size="sm" className="h-5 text-[10px] mt-0.5" onClick={() => deposit(r, 100)}>+100</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stability Beacon */}
      <Card className="bg-card/80 border-yellow-500/20">
        <CardContent className="p-3">
          <div className="text-sm font-semibold text-foreground mb-1">🔥 Stability Beacon Lv{guild.stabilityBeacon.level}</div>
          <Progress value={guild.stabilityBeacon.progress} className="h-2 mb-1" />
          <div className="text-xs text-muted-foreground">Collective bonus: +{guild.stabilityBeacon.collectiveBonus}% all stats</div>
        </CardContent>
      </Card>

      {/* Boosts */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">⚡ Guild Boosts</h3>
        <div className="grid grid-cols-1 gap-2">
          {guild.boosts.map(boost => {
            const active = boost.activeUntil && boost.activeUntil > Date.now();
            return (
              <Card key={boost.id} className={`bg-card/80 ${active ? 'border-green-500/40' : 'border-border/50'}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{boost.name}</div>
                    <div className="text-xs text-muted-foreground">{boost.effect}</div>
                    <div className="text-xs text-muted-foreground">Cost: {Object.entries(boost.cost).map(([r, a]) => `${a} ${r}`).join(', ')}</div>
                  </div>
                  {active ? (
                    <span className="text-xs text-green-400">Active ✓</span>
                  ) : (
                    <Button size="sm" className="h-7 text-xs" onClick={() => activateBoost(boost)}>Activate</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Members */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">👥 Members ({guild.members.length})</h3>
        <div className="space-y-1">
          {guild.members.map(m => (
            <div key={m.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
              <span>{ROLE_ICONS[m.role]}</span>
              <span className="text-foreground flex-1">{m.name}</span>
              <span className="text-muted-foreground">{m.role}</span>
              <span className="text-yellow-400">{m.stabilityContribution} 🔥</span>
            </div>
          ))}
        </div>
      </div>

      {/* Log */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">📋 Activity Log</h3>
        <div className="space-y-1">
          {guild.log.slice(-5).reverse().map(l => (
            <div key={l.id} className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
              {l.description} — {new Date(l.timestamp).toLocaleTimeString()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
