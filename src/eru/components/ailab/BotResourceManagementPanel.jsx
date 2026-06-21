import { useEffect, useMemo, useState } from 'react';
import { Brain, Cpu, Gauge, Zap } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

function estimateResource(bot) {
  return Math.min(100, 20 + ((bot.usage_count || 0) * 2) + ((bot.connected_bot_ids || []).length * 8));
}

function getUpgradeRecommendation(avgUsage) {
  if (avgUsage <= 80) return { action: 'none', label: 'Healthy', description: 'No upgrade needed.' };
  if (avgUsage <= 90) return { action: 'memory_boost', label: 'Memory Boost', description: 'Sustained load suggests extra memory capacity.' };
  return { action: 'processing_power', label: 'Processing Power', description: 'Heavy sustained load suggests more compute power.' };
}

export default function BotResourceManagementPanel({ bots, onBotsUpdated }) {
  const [snapshots, setSnapshots] = useState([]);
  const [autoTrigger, setAutoTrigger] = useState(true);

  const load = async () => {
    const rows = await base44.entities.BotResourceSnapshot.list('-created_date', 500);
    setSnapshots(rows);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const syncSnapshots = async () => {
      const now = new Date().toISOString();
      await Promise.all(bots.map(async (bot) => {
        const resourceUtilization = estimateResource(bot);
        const botSnapshots = snapshots.filter((item) => item.bot_id === bot.id);
        const recent = botSnapshots.filter((item) => new Date(item.snapshot_time).getTime() >= Date.now() - (60 * 60 * 1000));
        const avgUsage = recent.length ? Math.round((recent.reduce((sum, item) => sum + (item.resource_utilization || 0), 0) + resourceUtilization) / (recent.length + 1)) : resourceUtilization;
        const recommendation = getUpgradeRecommendation(avgUsage);
        const alreadyTriggered = (bot.unlocked_capabilities || []).includes('memory_boost') || (bot.unlocked_capabilities || []).includes('processing_power');

        let upgradeAction = 'none';
        if (recommendation.action === 'memory_boost') upgradeAction = autoTrigger ? 'trigger_memory_boost' : 'suggest_memory_boost';
        if (recommendation.action === 'processing_power') upgradeAction = autoTrigger ? 'trigger_processing_power' : 'suggest_processing_power';

        await base44.entities.BotResourceSnapshot.create({
          bot_id: bot.id,
          bot_name: bot.name,
          resource_utilization: resourceUtilization,
          upgrade_action: recommendation.action === 'none' ? 'none' : (alreadyTriggered ? 'none' : upgradeAction),
          window_label: '1h',
          snapshot_time: now,
        });

        if (autoTrigger && !alreadyTriggered && recommendation.action !== 'none') {
          const currentCaps = bot.unlocked_capabilities || [];
          const upgradeCapability = recommendation.action === 'memory_boost' ? 'memory_boost' : 'processing_power';
          if (!currentCaps.includes(upgradeCapability)) {
            await base44.entities.UserBot.update(bot.id, {
              unlocked_capabilities: [...currentCaps, upgradeCapability],
            });
          }
        }
      }));
      load();
      onBotsUpdated?.();
    };

    if (bots.length > 0) {
      syncSnapshots();
    }
  }, [bots.length, autoTrigger]);

  const botResources = useMemo(() => bots.map((bot) => {
    const resourceSnapshots = snapshots.filter((item) => item.bot_id === bot.id && new Date(item.snapshot_time).getTime() >= Date.now() - (60 * 60 * 1000));
    const avgUsage = resourceSnapshots.length ? Math.round(resourceSnapshots.reduce((sum, item) => sum + (item.resource_utilization || 0), 0) / resourceSnapshots.length) : estimateResource(bot);
    const recommendation = getUpgradeRecommendation(avgUsage);
    return {
      bot,
      avgUsage,
      recommendation,
      snapshots: resourceSnapshots,
    };
  }), [bots, snapshots]);

  const applyUpgrade = async (bot, action) => {
    const currentCaps = bot.unlocked_capabilities || [];
    const capability = action === 'memory_boost' ? 'memory_boost' : 'processing_power';
    if (currentCaps.includes(capability)) return;
    await base44.entities.UserBot.update(bot.id, {
      unlocked_capabilities: [...currentCaps, capability],
    });
    onBotsUpdated?.();
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Resource Management</p>
          <p className="text-xs text-muted-foreground mt-1">Monitor 1-hour resource utilization and suggest or trigger upgrades above 80%.</p>
        </div>
        <button onClick={() => setAutoTrigger((prev) => !prev)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${autoTrigger ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary text-muted-foreground border border-border'}`}>
          {autoTrigger ? 'Auto-trigger on' : 'Auto-trigger off'}
        </button>
      </div>

      <div className="space-y-3">
        {botResources.map(({ bot, avgUsage, recommendation }) => {
          const isHot = avgUsage > 80;
          const hasMemory = (bot.unlocked_capabilities || []).includes('memory_boost');
          const hasProcessing = (bot.unlocked_capabilities || []).includes('processing_power');
          return (
            <div key={bot.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{bot.name}</p>
                  <p className="text-[11px] text-muted-foreground">1-hour average resource usage</p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isHot ? 'bg-red-400/10 text-red-300' : 'bg-green-400/10 text-green-400'}`}>
                  {avgUsage}%
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Gauge className="w-3 h-3" /> Utilization</span>
                  <span>{avgUsage}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div className={`h-2 rounded-full ${avgUsage > 80 ? 'bg-red-400' : 'bg-primary'}`} style={{ width: `${avgUsage}%` }} />
                </div>
              </div>

              <div className="rounded-xl bg-secondary p-3 text-[11px] text-muted-foreground">
                Recommended: <span className="font-semibold text-foreground">{recommendation.label}</span> — {recommendation.description}
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => applyUpgrade(bot, 'memory_boost')} disabled={hasMemory} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-40">
                  <Brain className="w-3.5 h-3.5 text-primary" /> {hasMemory ? 'Memory Boost active' : 'Apply Memory Boost'}
                </button>
                <button onClick={() => applyUpgrade(bot, 'processing_power')} disabled={hasProcessing} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-40">
                  <Cpu className="w-3.5 h-3.5 text-orange-400" /> {hasProcessing ? 'Processing Power active' : 'Apply Processing Power'}
                </button>
                {isHot && <span className="inline-flex items-center gap-1 rounded-xl bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300"><Zap className="w-3.5 h-3.5" /> Sustained high usage</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}