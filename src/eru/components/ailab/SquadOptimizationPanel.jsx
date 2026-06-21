import { Brain, Sparkles } from 'lucide-react';

export default function SquadOptimizationPanel({ analysis, recommendation, knowledgeMatches, onApplyRecommendation }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold text-foreground">Wizard optimization</p>
      </div>

      {analysis && (
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Goal analysis</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{analysis.summary}</p>
          {analysis.keywords?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {analysis.keywords.map((keyword) => (
                <span key={keyword} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] text-primary">{keyword}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {recommendation && (
        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Best squad recommendation</p>
          </div>
          <p className="text-[11px] text-muted-foreground">Master bot: <span className="text-foreground font-semibold">{recommendation.masterBotName || 'None'}</span></p>
          <p className="text-[11px] text-muted-foreground">Recommended members: <span className="text-foreground font-semibold">{recommendation.memberBotNames?.join(', ') || 'None'}</span></p>
          <p className="text-[11px] text-muted-foreground">Why: {recommendation.reason}</p>
          <button onClick={onApplyRecommendation} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Apply recommendation</button>
        </div>
      )}

      {knowledgeMatches?.length > 0 && (
        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Knowledge base matches</p>
          {knowledgeMatches.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-secondary/20 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-foreground">{item.goal}</p>
                <span className="text-[9px] text-primary">{item.score} pts</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{item.source_squad_name}</p>
              <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">{item.result_summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}