import { Bot, GitBranch, MessageSquareShare, Star } from 'lucide-react';

function SectionCard({ icon: SectionIcon, title, children }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <SectionIcon className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      {children}
    </div>
  );
}

export default function CollaborationWorkspace({ result, bots }) {
  if (!result) return null;

  const botName = (id) => bots.find((bot) => bot.id === id)?.name || 'Unknown bot';

  return (
    <div className="space-y-4">
      <SectionCard icon={GitBranch} title="Delegation plan">
        <div className="space-y-2">
          {(result.delegations || []).map((item, index) => (
            <div key={`${item.bot_id}-${index}`} className="rounded-xl border border-border bg-background px-3 py-2.5">
              <p className="text-xs font-semibold text-foreground">{botName(item.bot_id)}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{item.assignment}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={Bot} title="Shared findings">
        <div className="space-y-2">
          {(result.findings || []).map((item, index) => (
            <div key={`${item.bot_id}-${index}`} className="rounded-xl border border-border bg-background px-3 py-2.5">
              <p className="text-xs font-semibold text-foreground">{botName(item.bot_id)}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">{item.finding}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={MessageSquareShare} title="Peer feedback">
        <div className="space-y-2">
          {(result.feedback || []).map((item, index) => (
            <div key={`${item.from_bot_id}-${item.to_bot_id}-${index}`} className="rounded-xl border border-border bg-background px-3 py-2.5">
              <p className="text-xs font-semibold text-foreground">{botName(item.from_bot_id)} → {botName(item.to_bot_id)}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{item.feedback}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={Star} title="Final synthesis">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{result.final}</p>
          <p className="mt-2 text-[10px] text-muted-foreground">Accuracy score: {result.score}/10</p>
        </div>
      </SectionCard>
    </div>
  );
}