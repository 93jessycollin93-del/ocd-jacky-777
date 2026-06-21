export default function BotFarmIntegrityPanel({ squads, squadReliability, risks }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Integrity & Risk Monitoring</p>
        <p className="text-[11px] text-muted-foreground">Security bots track contradiction risk, integrity drift, and squad reliability.</p>
      </div>
      <div className="space-y-2">
        {squads.map((squad) => (
          <div key={squad.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground">{squad.name}</p>
              <span className="text-[10px] text-primary">Reliability {squadReliability[squad.id] || 0}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, squadReliability[squad.id] || 0))}%` }} />
            </div>
          </div>
        ))}
        {risks.slice(0, 6).map((risk) => (
          <div key={risk.id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-xs font-semibold text-foreground">{risk.flag_type.replaceAll('_', ' ')}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{risk.details}</p>
          </div>
        ))}
      </div>
    </section>
  );
}