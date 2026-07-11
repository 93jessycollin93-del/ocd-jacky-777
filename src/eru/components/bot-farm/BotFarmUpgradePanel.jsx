export default function BotFarmUpgradePanel({ upgrades, onUpgrade, upgradingId }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Upgrade Layer</p>
        <p className="text-[11px] text-muted-foreground">Grow capacity carefully: every improvement helps throughput, quality, or stability.</p>
      </div>
      <div className="space-y-2">
        {upgrades.map((upgrade) => (
          <div key={upgrade.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">{upgrade.name}</p>
                <p className="text-[11px] text-muted-foreground">{upgrade.upgrade_type.replaceAll('_', ' ')} · level {upgrade.level} · complexity {upgrade.complexity_cost}</p>
              </div>
              <button
                onClick={() => onUpgrade(upgrade)}
                disabled={Boolean(upgradingId)}
                className="rounded-xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {upgradingId === upgrade.id ? 'Upgrading...' : 'Upgrade'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}