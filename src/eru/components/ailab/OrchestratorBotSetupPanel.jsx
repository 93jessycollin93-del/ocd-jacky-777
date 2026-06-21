import { Crown, Plus, Trash2 } from 'lucide-react';

const SPECIALIST_PRESETS = [
  { role: 'researcher', label: 'Researcher', desc: 'Find facts, sources, and structured inputs' },
  { role: 'writer', label: 'Writer', desc: 'Draft polished responses and narratives' },
  { role: 'coder', label: 'Coder', desc: 'Handle technical implementation and debugging' },
  { role: 'reviewer', label: 'Reviewer', desc: 'Check quality, gaps, and consistency' },
];

export default function OrchestratorBotSetupPanel({ bots, routerBotId, specialistBotIds, onRouterChange, onToggleSpecialist }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Centralized Agent Orchestrator</p>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] text-muted-foreground">Master router bot</label>
        <select value={routerBotId} onChange={(e) => onRouterChange(e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
          <option value="">Choose router bot</option>
          {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] text-muted-foreground">Specialist bots</label>
          <span className="text-[10px] text-muted-foreground">{specialistBotIds.length} selected</span>
        </div>
        <div className="space-y-2">
          {bots.map((bot) => {
            const active = specialistBotIds.includes(bot.id);
            return (
              <button key={bot.id} onClick={() => onToggleSpecialist(bot.id)} className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${active ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{bot.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{bot.role} · {bot.response_style || 'detailed'}</p>
                  </div>
                  {active ? <Trash2 className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
        <p className="text-[11px] font-semibold text-primary">Suggested specialist mix</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SPECIALIST_PRESETS.map((item) => (
            <div key={item.role} className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-semibold text-foreground">{item.label}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}