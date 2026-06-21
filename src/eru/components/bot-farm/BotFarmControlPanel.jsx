export default function BotFarmControlPanel({ roleSummary, metrics, onRunCycle }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Operational Control</p>
        <p className="text-[11px] text-muted-foreground">Leader oversight, commander capacity, and security supervision in one layer.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-background p-3"><p className="text-[10px] text-muted-foreground">Leader</p><p className="mt-1 text-lg font-semibold text-foreground">{roleSummary.leader.length}</p></div>
        <div className="rounded-xl border border-border bg-background p-3"><p className="text-[10px] text-muted-foreground">Commanders</p><p className="mt-1 text-lg font-semibold text-foreground">{roleSummary.commanders.length}</p></div>
        <div className="rounded-xl border border-border bg-background p-3"><p className="text-[10px] text-muted-foreground">Task Bots</p><p className="mt-1 text-lg font-semibold text-foreground">{roleSummary.taskBots.length}</p></div>
        <div className="rounded-xl border border-border bg-background p-3"><p className="text-[10px] text-muted-foreground">Security</p><p className="mt-1 text-lg font-semibold text-foreground">{roleSummary.security.length}</p></div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 text-[11px] text-muted-foreground">
        <div className="rounded-xl border border-border bg-background p-3">Scale power <span className="text-foreground">{metrics.scale_power}</span></div>
        <div className="rounded-xl border border-border bg-background p-3">Coord overhead <span className="text-foreground">{metrics.coordination_overhead}</span></div>
        <div className="rounded-xl border border-border bg-background p-3">Failure pressure <span className="text-foreground">{metrics.failure_pressure}</span></div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 text-[11px] text-muted-foreground">
        <div className="rounded-xl border border-border bg-background p-3">Leadership buffer <span className="text-foreground">{metrics.leadership_buffer}</span></div>
        <div className="rounded-xl border border-border bg-background p-3">Net strain <span className="text-foreground">{metrics.net_strain}</span></div>
        <div className="rounded-xl border border-border bg-background p-3">Capacity usage <span className="text-foreground">{metrics.capacity_usage}%</span></div>
      </div>

      <button onClick={onRunCycle} className="w-full rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground">
        Run Operational Cycle
      </button>
    </section>
  );
}