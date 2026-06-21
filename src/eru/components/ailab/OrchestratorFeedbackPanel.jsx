import { CheckCircle2, RefreshCcw, ShieldAlert } from 'lucide-react';

export default function OrchestratorFeedbackPanel({ result, bots }) {
  const getBotName = (id) => bots.find((bot) => bot.id === id)?.name || 'Bot';

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <RefreshCcw className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Feedback & recovery loops</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <p className="text-xs font-semibold text-foreground">Peer feedback</p>
          </div>
          {result?.feedback?.length ? result.feedback.map((item, index) => (
            <div key={index} className="rounded-lg border border-border bg-card p-2">
              <p className="text-[11px] font-medium text-foreground">{getBotName(item.from_bot_id)} → {getBotName(item.to_bot_id)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.feedback}</p>
            </div>
          )) : <p className="text-[11px] text-muted-foreground">No feedback loops yet.</p>}
        </div>

        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-yellow-400" />
            <p className="text-xs font-semibold text-foreground">Recovery events</p>
          </div>
          {result?.healing_events?.length ? result.healing_events.map((item, index) => (
            <div key={index} className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-2">
              <p className="text-[11px] font-medium text-foreground">{item.bot_name} · {item.recovered ? 'Recovered' : 'Retry failed'}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.notes}</p>
            </div>
          )) : <p className="text-[11px] text-muted-foreground">No recovery loop triggered.</p>}
        </div>
      </div>
    </div>
  );
}