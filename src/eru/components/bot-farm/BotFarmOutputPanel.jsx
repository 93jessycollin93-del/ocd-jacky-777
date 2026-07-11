export default function BotFarmOutputPanel({ outputs, risks, history }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Operational Outputs</p>
        <div className="space-y-2">
          {outputs.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-foreground">{item.output_type.replaceAll('_', ' ')}</p>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span>quality {item.quality_score}</span>
                  <span>value {item.value_score}</span>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.summary}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground sm:grid-cols-4">
                <div>Assign <span className="text-foreground">{item.assignment_quality || 0}</span></div>
                <div>Fit <span className="text-foreground">{item.specialization_fit || 0}</span></div>
                <div>Load -<span className="text-foreground">{item.load_penalty || 0}</span></div>
                <div>Coord -<span className="text-foreground">{item.coordination_penalty || 0}</span></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Risks & Activity</p>
        <div className="space-y-2">
          {risks.slice(0, 5).map((risk) => (
            <div key={risk.id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-xs font-semibold text-foreground">{risk.flag_type.replaceAll('_', ' ')}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{risk.details}</p>
            </div>
          ))}
          {history.slice(0, 5).map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-semibold text-foreground">{item.event_type.replaceAll('_', ' ')}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.summary}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}