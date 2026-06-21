export default function CodeDiffPanel({ originalCode, updatedCode }) {
  if (!updatedCode || updatedCode === originalCode) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <p className="text-[11px] font-semibold text-foreground">Changes</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="mb-2 text-[10px] uppercase text-muted-foreground">Before</p>
          <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground overflow-x-auto">{originalCode}</pre>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="mb-2 text-[10px] uppercase text-primary">After</p>
          <pre className="whitespace-pre-wrap text-[11px] text-foreground overflow-x-auto">{updatedCode}</pre>
        </div>
      </div>
    </div>
  );
}