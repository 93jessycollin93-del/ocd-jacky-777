import { Sparkles, FileCode, BookOpen, Plug } from 'lucide-react';

/**
 * DevLabInspector — secondary panel that surfaces context relevant to the
 * current prompt: ranked Knowledge, file references, provider status. Pure
 * presentation; data is computed by the parent.
 */
export default function DevLabInspector({ rankedKnowledge = [], files = [], providerStatus = {}, currentPrompt }) {
  const connectedCount = Object.values(providerStatus).filter((s) => s === 'connected').length;

  return (
    <aside className="space-y-3">
      <section className="rounded-2xl border border-border bg-card p-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
          <Plug className="h-3 w-3 text-primary" /> Provider status
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {connectedCount === 0
            ? 'No providers connected — output runs as Template.'
            : `${connectedCount} provider${connectedCount === 1 ? '' : 's'} marked connected.`}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
          <BookOpen className="h-3 w-3 text-primary" /> Relevant knowledge
        </p>
        {rankedKnowledge.length === 0 ? (
          <p className="mt-1 text-[10px] text-muted-foreground">
            {currentPrompt ? 'No matching knowledge for that prompt yet.' : 'Add knowledge to surface here.'}
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {rankedKnowledge.map((d) => (
              <li key={d.id} className="rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5">
                <p className="text-[11px] font-medium text-foreground truncate">{d.title}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{d.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
          <FileCode className="h-3 w-3 text-primary" /> File references
        </p>
        {files.length === 0 ? (
          <p className="mt-1 text-[10px] text-muted-foreground">No files added yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {files.slice(0, 6).map((f) => (
              <li key={f.id} className="font-mono text-[10px] text-foreground/80 truncate">@{f.path}</li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-2.5 py-2 text-[10px] text-primary/90">
        <Sparkles className="h-3 w-3 flex-shrink-0 mt-0.5" />
        Honest mode: nothing here fabricates data. Templates run locally; AI output appears only when a provider is wired.
      </p>
    </aside>
  );
}