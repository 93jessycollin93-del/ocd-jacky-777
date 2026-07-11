import { Activity, ArrowDown, ArrowUp, Users } from 'lucide-react';

export default function BotFarmScalingControllerPanel({ scaling, onScaleUp, onScaleDown, busy }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Dynamic Scaling Controller</p>
        <p className="text-[11px] text-muted-foreground">Automatically reacts to queue pressure by expanding or compressing specialized task-bot squads while preserving cohesion.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] text-muted-foreground">Queue depth</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{scaling.queueDepth}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] text-muted-foreground">Scale state</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{scaling.scaleState}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] text-muted-foreground">Cohesion</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{scaling.cohesionScore}%</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] text-muted-foreground">Thresholds</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{scaling.scaleDownThreshold} / {scaling.scaleUpThreshold}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 text-[11px] text-muted-foreground">
        <div className="rounded-xl border border-border bg-background p-3 inline-flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-primary" /> Recommendation <span className="text-foreground">{scaling.recommendation}</span></div>
        <div className="rounded-xl border border-border bg-background p-3 inline-flex items-center gap-2"><Users className="h-3.5 w-3.5 text-primary" /> Expandable squads <span className="text-foreground">{scaling.expandableSquads}</span></div>
        <div className="rounded-xl border border-border bg-background p-3">Idle task bots <span className="text-foreground">{scaling.idleTaskBots}</span></div>
      </div>

      <div className="rounded-xl border border-border bg-background p-3">
        <p className="text-xs font-semibold text-foreground">Controller notes</p>
        <div className="mt-2 space-y-1">
          {scaling.notes.map((note) => (
            <p key={note} className="text-[11px] text-muted-foreground">• {note}</p>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          onClick={onScaleUp}
          disabled={busy || !scaling.canScaleUp}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          <ArrowUp className="h-3.5 w-3.5" /> Scale Up Specialized Squad
        </button>
        <button
          onClick={onScaleDown}
          disabled={busy || !scaling.canScaleDown}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold text-muted-foreground disabled:opacity-40"
        >
          <ArrowDown className="h-3.5 w-3.5" /> Scale Down Low-Pressure Squad
        </button>
      </div>
    </section>
  );
}