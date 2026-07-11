import { ArrowRightLeft, BrainCircuit, MessageSquareShare, Route } from 'lucide-react';

export default function OrchestratorStateBoard({ routerBot, specialists, result }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Route className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Delegation state</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-foreground">Router</p>
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">{routerBot?.name || 'Not selected'}</p>
          <p className="text-[11px] text-muted-foreground">{routerBot?.role || 'Master coordinator'}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-foreground">Delegations</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{result?.delegations?.length || 0}</p>
          <p className="text-[11px] text-muted-foreground">active assignment routes</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <MessageSquareShare className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-foreground">Feedback loops</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{result?.feedback?.length || 0}</p>
          <p className="text-[11px] text-muted-foreground">peer review exchanges</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-3">
        <p className="text-[11px] font-semibold text-foreground">Specialist pool</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {specialists.length > 0 ? specialists.map((bot) => (
            <span key={bot.id} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] text-primary">
              {bot.name} · {bot.role}
            </span>
          )) : <span className="text-[11px] text-muted-foreground">No specialist bots selected.</span>}
        </div>
      </div>
    </div>
  );
}