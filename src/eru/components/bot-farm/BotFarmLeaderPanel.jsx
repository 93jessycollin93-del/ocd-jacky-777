export default function BotFarmLeaderPanel({ metrics }) {
  const rows = [
    ['Farm efficiency', `${metrics.system_efficiency}%`],
    ['Bottleneck score', `${metrics.bottleneck_score}%`],
    ['Average output quality', `${metrics.avg_output_quality}%`],
    ['Scaling complexity', metrics.scaling_complexity],
    ['Task capacity', metrics.task_capacity],
    ['Active tasks', metrics.active_tasks],
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Leader Oversight</p>
        <p className="text-[11px] text-muted-foreground">The leader tracks total efficiency, bottlenecks, quality, and mission success.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-background px-3 py-3">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}