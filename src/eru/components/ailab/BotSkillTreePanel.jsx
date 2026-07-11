import { useMemo, useState } from 'react';
import { Award, Bot, CheckCircle2, Lock, Sparkles, Star, Zap } from 'lucide-react';

const CAPABILITY_LABELS = {
  memory_boost: 'Memory Boost',
  web_search: 'Web Search',
  code_execution: 'Code Execution',
  auto_schedule: 'Auto Schedule',
};

const CAPABILITY_REQUIREMENTS = {
  memory_boost: 'Level 3 or 5 uses',
  web_search: 'Level 5 or 10 uses',
  code_execution: 'Level 7 or 20 uses',
  auto_schedule: 'Level 10 or 30 uses',
};

const CERTIFICATION_DEFS = [
  {
    id: 'squad_rookie',
    label: 'Squad Rookie',
    description: 'Completed first successful squad run',
    test: ({ contributionCount }) => contributionCount >= 1,
  },
  {
    id: 'specialist_operator',
    label: 'Specialist Operator',
    description: 'Contributed to 3 successful squad runs',
    test: ({ contributionCount }) => contributionCount >= 3,
  },
  {
    id: 'roi_strategist',
    label: 'ROI Strategist',
    description: 'Average squad ROI reached 100+',
    test: ({ avgRoi }) => avgRoi >= 100,
  },
  {
    id: 'precision_agent',
    label: 'Precision Agent',
    description: 'Average success rate reached 85%',
    test: ({ avgSuccess }) => avgSuccess >= 85,
  },
  {
    id: 'squad_veteran',
    label: 'Squad Veteran',
    description: 'Contributed to 8 successful squad runs',
    test: ({ contributionCount }) => contributionCount >= 8,
  },
];

function CapabilityNode({ unlocked, label, requirement }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${unlocked ? 'border-primary/30 bg-primary/10' : 'border-border bg-secondary/30'}`}>
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 rounded-full p-1.5 ${unlocked ? 'bg-primary/15 text-primary' : 'bg-background text-muted-foreground'}`}>
          {unlocked ? <Zap className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground">{requirement}</p>
        </div>
      </div>
    </div>
  );
}

function CertificationBadge({ active, label, description }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${active ? 'border-yellow-400/30 bg-yellow-400/10' : 'border-border bg-secondary/20'}`}>
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 rounded-full p-1.5 ${active ? 'bg-yellow-400/15 text-yellow-300' : 'bg-background text-muted-foreground'}`}>
          {active ? <Award className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function BotSkillTreePanel({ bots = [], squads = [] }) {
  const [selectedBotId, setSelectedBotId] = useState(bots[0]?.id || '');

  const analytics = useMemo(() => {
    const runs = squads.flatMap((squad) => (squad.execution_history || []).map((entry) => ({
      successRate: entry.success_rate || 0,
      estimatedRoi: entry.estimated_roi || 0,
      botIds: entry.successful_bot_ids || [],
    })));

    const byBot = Object.fromEntries(bots.map((bot) => {
      const contributions = runs.filter((run) => run.botIds.includes(bot.id));
      const contributionCount = contributions.length;
      const avgSuccess = contributionCount ? Math.round(contributions.reduce((sum, run) => sum + run.successRate, 0) / contributionCount) : 0;
      const avgRoi = contributionCount ? Math.round(contributions.reduce((sum, run) => sum + run.estimatedRoi, 0) / contributionCount) : 0;
      const certifications = CERTIFICATION_DEFS.filter((item) => item.test({ contributionCount, avgSuccess, avgRoi }));

      return [bot.id, { contributionCount, avgSuccess, avgRoi, certifications }];
    }));

    return byBot;
  }, [bots, squads]);

  const selectedBot = bots.find((bot) => bot.id === selectedBotId) || bots[0];
  const selectedMetrics = selectedBot ? analytics[selectedBot.id] || { contributionCount: 0, avgSuccess: 0, avgRoi: 0, certifications: [] } : null;
  const progressToNextLevel = selectedBot ? ((selectedBot.xp || 0) % 100) : 0;

  if (!selectedBot || !selectedMetrics) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No bots available for skill tree tracking yet.
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Bot Skill Tree</p>
        </div>
        <p className="text-xs text-muted-foreground">Track unlocked capabilities, XP growth, and specialist certifications earned through squad success.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {bots.map((bot) => (
          <button
            key={bot.id}
            onClick={() => setSelectedBotId(bot.id)}
            className={`flex-shrink-0 rounded-xl border px-3 py-2 text-left ${selectedBot.id === bot.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`}
          >
            <p className="text-xs font-semibold">{bot.name}</p>
            <p className="text-[10px] capitalize">{bot.role} · Lv.{bot.level || 1}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px,1fr]">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{selectedBot.name}</p>
              <p className="text-[11px] capitalize text-muted-foreground">{selectedBot.role} specialist</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary/20 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-foreground">XP Progress</p>
              <span className="text-[10px] text-primary">Lv.{selectedBot.level || 1}</span>
            </div>
            <div className="h-2 rounded-full bg-background overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progressToNextLevel}%` }} />
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">{selectedBot.xp || 0} XP total · {100 - progressToNextLevel} XP to next level</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Uses', value: selectedBot.usage_count || 0 },
              { label: 'Squad wins', value: selectedMetrics.contributionCount },
              { label: 'Certs', value: selectedMetrics.certifications.length },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-secondary/20 p-3 text-center">
                <p className="text-base font-bold text-foreground">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">Squad performance</p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Avg success</span>
              <span className="text-foreground">{selectedMetrics.avgSuccess}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Avg ROI</span>
              <span className="text-foreground">{selectedMetrics.avgRoi}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Capability path</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.keys(CAPABILITY_LABELS).map((key) => (
                <CapabilityNode
                  key={key}
                  unlocked={(selectedBot.unlocked_capabilities || []).includes(key)}
                  label={CAPABILITY_LABELS[key]}
                  requirement={CAPABILITY_REQUIREMENTS[key]}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-yellow-300" />
              <p className="text-sm font-semibold text-foreground">Specialized certifications</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {CERTIFICATION_DEFS.map((item) => (
                <CertificationBadge
                  key={item.id}
                  active={selectedMetrics.certifications.some((cert) => cert.id === item.id)}
                  label={item.label}
                  description={item.description}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}