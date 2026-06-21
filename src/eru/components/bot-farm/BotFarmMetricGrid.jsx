export default function BotFarmMetricGrid({ metrics }) {
  const cards = [
    { label: 'Total Bots', value: metrics.total_bots },
    { label: 'Active', value: metrics.active_bots },
    { label: 'Idle', value: metrics.idle_bots },
    { label: 'Overloaded', value: metrics.overloaded_bots },
    { label: 'Maintenance', value: metrics.maintenance_bots },
    { label: 'Integrity Warnings', value: metrics.integrity_warning_count },
    { label: 'Avg Quality', value: `${metrics.average_output_quality}%` },
    { label: 'Capacity Use', value: `${metrics.capacity_usage}%` },
    { label: 'Reliability', value: `${metrics.squad_reliability}%` },
    { label: 'Complexity', value: metrics.management_tradeoff },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{card.label}</p>
          <p className="mt-2 text-xl font-bold text-foreground">{card.value}</p>
        </div>
      ))}
    </div>
  );
}