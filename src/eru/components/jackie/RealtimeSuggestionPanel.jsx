import { Lightbulb, Loader2 } from 'lucide-react';

export default function RealtimeSuggestionPanel({ suggestions, loading, selectedMemoryName }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">Real-time AI suggestions</p>
          <p className="text-[10px] text-muted-foreground">{selectedMemoryName ? `Using ${selectedMemoryName} as reference` : 'Select a programming memory reference to guide suggestions'}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      </div>
      {suggestions.length > 0 ? (
        <div className="space-y-2">
          {suggestions.map((item, index) => (
            <div key={`${item.title}-${index}`} className="rounded-lg border border-border bg-background p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] font-semibold text-foreground">{item.title}</p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{item.description}</p>
              {item.example && (
                <pre className="overflow-x-auto rounded-lg border border-border bg-card p-2 text-[10px] text-muted-foreground whitespace-pre-wrap">{item.example}</pre>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-4 text-[11px] text-muted-foreground">
          Suggestions will appear here as you edit.
        </div>
      )}
    </div>
  );
}