import { Check, Plus, Trash2, Eye } from 'lucide-react';

// Compact, mobile-first module card used in the App Store grid. Shows icon,
// metadata, and an install/uninstall toggle. Tap "Preview" to expand details
// inline (handled by parent via onPreview).
export default function ModuleCard({ module, installed, onInstall, onUninstall, onPreview }) {
  return (
    <div className="eru-theme-card relative flex h-full flex-col overflow-hidden rounded-2xl border border-border p-4">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${module.accent} blur-2xl`}
      />
      <div className="relative flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-2xl">
          {module.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{module.name}</h3>
            {installed && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                <Check className="h-2.5 w-2.5" /> Installed
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{module.tagline}</p>
          <span className="mt-1 inline-block rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            {module.category}
          </span>
        </div>
      </div>

      <p className="relative mt-3 flex-1 text-[12px] leading-relaxed text-muted-foreground line-clamp-3">
        {module.description}
      </p>

      <div className="relative mt-3 flex items-center gap-2">
        <button
          onClick={() => onPreview(module)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs font-medium text-foreground hover:border-primary/30"
        >
          <Eye className="h-3.5 w-3.5" /> Preview
        </button>
        {installed ? (
          <button
            onClick={() => onUninstall(module.id)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/15"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        ) : (
          <button
            onClick={() => onInstall(module.id)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Install
          </button>
        )}
      </div>
    </div>
  );
}