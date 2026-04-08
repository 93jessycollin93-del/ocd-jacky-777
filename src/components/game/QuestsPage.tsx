import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface QuestDef {
  id: string; name: string; icon: string; description: string;
  type: 'daily' | 'weekly';
  target: number; // actions needed
  rewardGold: number; rewardXP: number;
  checkProgress: (state: any) => number;
}

const QUESTS: QuestDef[] = [
  // Daily
  { id: 'daily_build', name: 'Builder', icon: '🏗️', description: 'Upgrade 1 building', type: 'daily', target: 1, rewardGold: 100, rewardXP: 50,
    checkProgress: (s) => s.buildings.filter((b: any) => b.upgrading).length > 0 ? 1 : Math.min(1, s.buildings.reduce((sum: number, b: any) => sum + (b.level > 1 ? 1 : 0), 0) > 0 ? 1 : 0) },
  { id: 'daily_train', name: 'Recruiter', icon: '⚔️', description: 'Train troops', type: 'daily', target: 1, rewardGold: 80, rewardXP: 40,
    checkProgress: (s) => s.troops.some((t: any) => t.training > 0 || t.count > 0) ? 1 : 0 },
  { id: 'daily_march', name: 'Explorer', icon: '🗺️', description: 'Send 1 march', type: 'daily', target: 1, rewardGold: 120, rewardXP: 60,
    checkProgress: (s) => Math.min(1, s.marches.length) },
  { id: 'daily_craft', name: 'Artisan', icon: '⚗️', description: 'Craft any item', type: 'daily', target: 1, rewardGold: 80, rewardXP: 40,
    checkProgress: (s) => (s.gearInventory || []).length > 0 ? 1 : 0 },
  { id: 'daily_collect', name: 'Collector', icon: '📦', description: 'Collect resources', type: 'daily', target: 1, rewardGold: 60, rewardXP: 30,
    checkProgress: () => 1 },
  // Weekly
  { id: 'weekly_power', name: 'Power Up', icon: '💪', description: 'Reach 5 building upgrades', type: 'weekly', target: 5, rewardGold: 500, rewardXP: 200,
    checkProgress: (s) => s.buildings.filter((b: any) => b.level >= 2).length },
  { id: 'weekly_battle', name: 'Warmonger', icon: '⚔️', description: 'Win 3 battles', type: 'weekly', target: 3, rewardGold: 600, rewardXP: 250,
    checkProgress: (s) => s.marches.filter((m: any) => m.result?.victory).length },
  { id: 'weekly_research', name: 'Scholar', icon: '📜', description: 'Complete 3 research', type: 'weekly', target: 3, rewardGold: 500, rewardXP: 200,
    checkProgress: (s) => s.research.filter((r: any) => r.level > 0).length },
];

export default function QuestsPage() {
  const { state, setState, saveState, addBattlePassXP } = useGame();

  const claimedQuests = new Set<string>((state as any).claimedQuests || []);

  const claimReward = (quest: QuestDef) => {
    if (claimedQuests.has(quest.id)) { toast.error('Already claimed'); return; }
    const progress = quest.checkProgress(state);
    if (progress < quest.target) { toast.error('Quest not complete'); return; }

    setState(prev => {
      const resources = { ...prev.resources, gold: prev.resources.gold + quest.rewardGold };
      const claimed = [...((prev as any).claimedQuests || []), quest.id];
      const ns = { ...prev, resources, claimedQuests: claimed } as any;
      saveState(ns);
      return ns;
    });
    addBattlePassXP(quest.rewardXP, `Quest: ${quest.name}`);
    toast.success(`Claimed ${quest.rewardGold} 💰 + ${quest.rewardXP} XP!`);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">📋 Quests</h2>
      <p className="text-xs text-muted-foreground">Complete tasks for gold and Battle Pass XP.</p>

      {/* Daily */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">📅 Daily Quests</h3>
        <div className="space-y-2">
          {QUESTS.filter(q => q.type === 'daily').map(quest => {
            const progress = Math.min(quest.target, quest.checkProgress(state));
            const complete = progress >= quest.target;
            const claimed = claimedQuests.has(quest.id);
            return (
              <Card key={quest.id} className={`bg-card/80 ${claimed ? 'opacity-50 border-green-500/30' : 'border-border/50'}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="text-xl">{quest.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{quest.name}</div>
                    <div className="text-xs text-muted-foreground">{quest.description}</div>
                    <Progress value={(progress / quest.target) * 100} className="h-1.5 mt-1" />
                    <div className="text-[10px] text-muted-foreground mt-0.5">{progress}/{quest.target} · Reward: {quest.rewardGold}💰 {quest.rewardXP}XP</div>
                  </div>
                  {claimed ? (
                    <span className="text-xs text-green-400">✅</span>
                  ) : (
                    <Button size="sm" className="h-7 text-xs" disabled={!complete} onClick={() => claimReward(quest)}>Claim</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Weekly */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">📆 Weekly Quests</h3>
        <div className="space-y-2">
          {QUESTS.filter(q => q.type === 'weekly').map(quest => {
            const progress = Math.min(quest.target, quest.checkProgress(state));
            const complete = progress >= quest.target;
            const claimed = claimedQuests.has(quest.id);
            return (
              <Card key={quest.id} className={`bg-card/80 ${claimed ? 'opacity-50 border-green-500/30' : 'border-border/50'}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="text-xl">{quest.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{quest.name}</div>
                    <div className="text-xs text-muted-foreground">{quest.description}</div>
                    <Progress value={(progress / quest.target) * 100} className="h-1.5 mt-1" />
                    <div className="text-[10px] text-muted-foreground mt-0.5">{progress}/{quest.target} · Reward: {quest.rewardGold}💰 {quest.rewardXP}XP</div>
                  </div>
                  {claimed ? (
                    <span className="text-xs text-green-400">✅</span>
                  ) : (
                    <Button size="sm" className="h-7 text-xs" disabled={!complete} onClick={() => claimReward(quest)}>Claim</Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
