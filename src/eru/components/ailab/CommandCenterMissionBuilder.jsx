import { Link2, Sparkles, ShieldAlert } from 'lucide-react';

export default function CommandCenterMissionBuilder({ form, setForm, commanders = [], squads = [], securityBots = [], onCreate, creating }) {
  const toggleSelection = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field]?.includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...(prev[field] || []), value],
    }));
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3" aria-labelledby="mission-builder-heading">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
        <div>
          <h3 id="mission-builder-heading" className="text-sm font-semibold text-foreground">Mission Builder</h3>
          <p className="text-[11px] text-muted-foreground">Create a mission, link command ownership, and assign squads up front.</p>
        </div>
      </div>
      <input aria-label="Mission title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Mission title" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none" />
      <textarea aria-label="Mission objective" value={form.objective} onChange={(e) => setForm((p) => ({ ...p, objective: e.target.value }))} placeholder="Mission objective" className="min-h-[80px] w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none resize-none" />
      <textarea aria-label="Mission description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Mission description and desired outcome" className="min-h-[72px] w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none resize-none" />
      <div className="grid gap-2 sm:grid-cols-2">
        <select aria-label="Mission priority" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none">
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
          <option value="critical">Critical priority</option>
        </select>
        <select aria-label="Mission mode" value={form.mission_mode} onChange={(e) => setForm((p) => ({ ...p, mission_mode: e.target.value }))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none">
          <option value="manual">Manual</option>
          <option value="semi_auto">Semi-auto</option>
          <option value="auto">Auto</option>
        </select>
      </div>
      <input aria-label="Mission deadline" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} placeholder="Deadline (ISO or note)" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none" />
      <textarea aria-label="Success criteria" value={form.success_criteria} onChange={(e) => setForm((p) => ({ ...p, success_criteria: e.target.value }))} placeholder="Success criteria" className="min-h-[72px] w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none resize-none" />
      <textarea aria-label="Mission knowledge" value={form.knowledge_summary} onChange={(e) => setForm((p) => ({ ...p, knowledge_summary: e.target.value }))} placeholder="Mission knowledge, facts, rules, priorities, constraints" className="min-h-[88px] w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none resize-none" />

      <div className="rounded-xl border border-border bg-background p-3 space-y-3">
        <div className="flex items-center gap-2 text-primary"><Link2 className="w-4 h-4" aria-hidden="true" /><p className="text-[11px] font-semibold">Command linkage</p></div>
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Commanders</p>
          <div className="flex flex-wrap gap-2">{commanders.map((bot) => <button type="button" aria-pressed={form.assigned_commanders?.includes(bot.bot_code)} key={bot.bot_code} onClick={() => toggleSelection('assigned_commanders', bot.bot_code)} className={`rounded-full border px-3 py-1 text-[10px] ${form.assigned_commanders?.includes(bot.bot_code) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`}>{bot.bot_code}</button>)}</div>
        </div>
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Squads</p>
          <div className="flex flex-wrap gap-2">{squads.map((name) => <button type="button" aria-pressed={form.assigned_squads?.includes(name)} key={name} onClick={() => toggleSelection('assigned_squads', name)} className={`rounded-full border px-3 py-1 text-[10px] capitalize ${form.assigned_squads?.includes(name) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`}>{name}</button>)}</div>
        </div>
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Security oversight</p>
          <div className="flex flex-wrap gap-2">{securityBots.map((bot) => <span key={bot.bot_code} className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[10px] text-red-300">{bot.bot_code}</span>)}</div>
        </div>
      </div>

      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3">
        <div className="flex items-center gap-2 text-yellow-300"><ShieldAlert className="w-4 h-4" aria-hidden="true" /><p className="text-[11px] font-semibold">Risk routing</p></div>
        <p className="mt-1 text-[10px] text-muted-foreground">All critical anomalies route to SS001 and SS002 automatically through the mission communication layer.</p>
      </div>

      <button onClick={onCreate} disabled={!form.title.trim() || !form.objective.trim() || creating} className="w-full rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">{creating ? 'Creating mission…' : 'Create mission'}</button>
    </section>
  );
}