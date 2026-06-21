import { Brain, Plus, Sparkles, Target } from 'lucide-react';

export default function BotTrainingInsightsPanel({ insights, loading, onGenerate, onImport }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">AI training copilot</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Generate diverse tests, smarter thresholds, and deeper training analysis.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onGenerate} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40">
            <Sparkles className="w-3.5 h-3.5" /> {loading ? 'Analyzing...' : 'Generate insights'}
          </button>
          {insights?.generated_test_cases?.length > 0 && (
            <button onClick={onImport} className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground">
              <Plus className="w-3.5 h-3.5" /> Import tests
            </button>
          )}
        </div>
      </div>

      {!insights ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">Run AI insights after selecting a bot and training candidate instructions.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[11px] text-muted-foreground">Target tests</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{insights.recommended_parameters?.target_test_count}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[11px] text-muted-foreground">Suggested threshold</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{Math.round((insights.recommended_parameters?.recommended_similarity_threshold || 0) * 100)}%</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[11px] text-muted-foreground">Rollout risk</p>
              <p className="mt-1 text-lg font-semibold text-foreground capitalize">{insights.recommended_parameters?.rollout_risk}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">Generated test cases</p>
            </div>
            <div className="space-y-2">
              {(insights.generated_test_cases || []).map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">{item.title}</p>
                    <span className="text-[10px] text-primary">{item.focus_area}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{item.input}</p>
                  <p className="mt-2 text-[10px] text-muted-foreground">Expected: {item.expected_output}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Performance analysis</p>
              <p className="text-[11px] text-muted-foreground">{insights.performance_analysis?.summary}</p>
              <div>
                <p className="text-[11px] font-medium text-foreground">Strengths</p>
                <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
                  {(insights.performance_analysis?.strengths || []).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-medium text-foreground">Weaknesses</p>
                <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
                  {(insights.performance_analysis?.weaknesses || []).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Training actions</p>
              <div>
                <p className="text-[11px] font-medium text-foreground">Failure patterns</p>
                <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
                  {(insights.performance_analysis?.failure_patterns || []).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-medium text-foreground">Priority fixes</p>
                <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
                  {(insights.performance_analysis?.priority_fixes || []).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-[11px] font-medium text-primary">Publish recommendation</p>
                <p className="mt-1 text-[11px] text-foreground capitalize">{insights.publish_recommendation?.decision}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{insights.publish_recommendation?.reason}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">Iteration strategy: {insights.recommended_parameters?.iteration_strategy}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Prompt adjustment: {insights.recommended_parameters?.prompt_style_adjustment}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}