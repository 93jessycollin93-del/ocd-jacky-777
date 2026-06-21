import { Sparkles, Wand2 } from 'lucide-react';

export default function StarterTemplateBrowser({ templates, onApply }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <div>
          <p className="text-xs font-semibold text-foreground">Starter pipeline templates</p>
          <p className="text-[10px] text-muted-foreground">Reusable squad patterns for common work like market analysis, content strategy, and security review.</p>
        </div>
      </div>

      <div className="space-y-2">
        {templates.map((template) => (
          <div key={template.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{template.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{template.description}</p>
              </div>
              <button onClick={() => onApply(template)} className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-[10px] font-medium text-primary">
                <Wand2 className="w-3 h-3" /> Use
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(template.pipeline_steps || []).map((step) => (
                <span key={step.id} className="rounded-full border border-border bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{step.title}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}