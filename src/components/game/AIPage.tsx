import { useGame } from '@/game/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { BUILDINGS, RESEARCH, TROOPS } from '@/game/data';

function analyzeGameState(state: ReturnType<typeof useGame>['state']) {
  const tips: { icon: string; title: string; desc: string; priority: 'high' | 'medium' | 'low' }[] = [];

  // Check keep level
  const keepLvl = state.buildings.find(b => b.id === 'keep')?.level || 0;
  if (keepLvl < 5) tips.push({ icon: '🏰', title: 'Upgrade Keep', desc: `Keep is Lv${keepLvl}. Upgrade to unlock new buildings and increase march capacity.`, priority: 'high' });

  // Check barracks
  const barracksLvl = state.buildings.find(b => b.id === 'barracks')?.level || 0;
  if (barracksLvl === 0) tips.push({ icon: '⚔️', title: 'Build Barracks', desc: 'You need barracks to train troops for expeditions.', priority: 'high' });

  // Check academy
  const academyLvl = state.buildings.find(b => b.id === 'academy')?.level || 0;
  if (academyLvl === 0 && keepLvl >= 3) tips.push({ icon: '📜', title: 'Build Academy', desc: 'Academy unlocks research, giving permanent bonuses.', priority: 'high' });

  // Low resources
  if (state.resources.food < 200) tips.push({ icon: '🌾', title: 'Food Shortage', desc: 'Upgrade farms or send gathering expeditions.', priority: 'high' });
  if (state.resources.gold < 100) tips.push({ icon: '💰', title: 'Low Gold', desc: 'Gold funds everything. Upgrade gold mine or complete expeditions.', priority: 'medium' });

  // No troops
  const totalTroops = state.troops.reduce((s, t) => s + t.count, 0);
  if (totalTroops === 0 && barracksLvl > 0) tips.push({ icon: '🗡️', title: 'Train Troops', desc: 'You have no troops. Train some to go on expeditions.', priority: 'high' });

  // No research
  const totalResearch = state.research.reduce((s, r) => s + r.level, 0);
  if (totalResearch === 0 && academyLvl > 0) tips.push({ icon: '🔬', title: 'Start Research', desc: 'Research provides permanent stat boosts. Start with economy.', priority: 'medium' });

  // Idle marches
  const completedMarches = state.marches.filter(m => m.completed && !m.result);
  if (completedMarches.length > 0) tips.push({ icon: '📬', title: 'Collect March Results', desc: `${completedMarches.length} march(es) completed. Collect rewards!`, priority: 'high' });

  // Rare materials
  const mats = state.rareMaterials || { essence: 0, arcane_dust: 0, mithril: 0, dragon_scale: 0 };
  if (mats.essence >= 2) tips.push({ icon: '✨', title: 'Use Essence', desc: 'You have enough essence for a research boost. Check Crafting.', priority: 'low' });

  // General advice
  if (tips.length === 0) tips.push({ icon: '👑', title: 'Well Balanced', desc: 'Your realm is in good shape. Focus on expansion and diplomacy.', priority: 'low' });

  // Power estimate
  let power = 0;
  for (const t of state.troops) {
    const def = TROOPS.find(d => d.id === t.id);
    if (def) power += (def.attack + def.defense + def.health) * t.count;
  }
  for (const b of state.buildings) power += b.level * 50;
  for (const r of state.research) power += r.level * 80;

  return { tips: tips.sort((a, b) => (a.priority === 'high' ? 0 : a.priority === 'medium' ? 1 : 2) - (b.priority === 'high' ? 0 : b.priority === 'medium' ? 1 : 2)), power };
}

const PRIORITY_COLORS = { high: 'border-red-500/40', medium: 'border-yellow-500/40', low: 'border-border/50' };
const PRIORITY_LABELS = { high: '🔴', medium: '🟡', low: '🟢' };

export default function AIPage() {
  const { state } = useGame();
  const { tips, power } = analyzeGameState(state);

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display text-xl text-foreground">🔮 Oracle</h2>
      <p className="text-xs text-muted-foreground">Strategic insights based on your current realm state.</p>

      <Card className="bg-card/80 border-primary/30">
        <CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{power.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Estimated Realm Power</div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {tips.map((tip, i) => (
          <Card key={i} className={`bg-card/80 ${PRIORITY_COLORS[tip.priority]}`}>
            <CardContent className="p-3 flex items-start gap-3">
              <span className="text-xl shrink-0">{tip.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground flex items-center gap-1">
                  {PRIORITY_LABELS[tip.priority]} {tip.title}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{tip.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
