export default function CodePreviewPanel({ code }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <p className="text-[11px] font-semibold text-foreground">Preview pane</p>
      <div className="rounded-lg border border-border bg-background p-3 min-h-[160px]">
        <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground overflow-x-auto">{code}</pre>
      </div>
    </div>
  );
}