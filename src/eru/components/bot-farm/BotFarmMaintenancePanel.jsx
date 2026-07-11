export default function BotFarmMaintenancePanel({ bots, maintenanceLogs, onRest, onRepair, onRecover, onQuarantine }) {
  const maintenanceBots = bots.filter((bot) => ['maintenance', 'recovering', 'overloaded', 'quarantined'].includes(bot.status) || (bot.maintenance_status && bot.maintenance_status !== 'healthy'));

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Maintenance & Recovery</p>
        <p className="text-[11px] text-muted-foreground">Operational upkeep directly affects fatigue, integrity, and usable capacity.</p>
      </div>

      <div className="space-y-2">
        {maintenanceBots.map((bot) => (
          <div key={bot.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">{bot.name}</p>
                <p className="text-[11px] text-muted-foreground">{bot.status} · fatigue {bot.fatigue}% · integrity {bot.integrity}%</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onRest(bot)} className="rounded-xl border border-border px-3 py-2 text-[11px] text-muted-foreground">Rest</button>
                <button onClick={() => onRepair(bot)} className="rounded-xl border border-border px-3 py-2 text-[11px] text-muted-foreground">Repair</button>
                <button onClick={() => onRecover(bot)} className="rounded-xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground">Recover</button>
                <button onClick={() => onQuarantine(bot)} className="rounded-xl border border-red-500/20 px-3 py-2 text-[11px] text-red-300">Quarantine</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {maintenanceLogs.slice(0, 4).map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs font-semibold text-foreground">{item.maintenance_type}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{item.impact}</p>
          </div>
        ))}
      </div>
    </section>
  );
}