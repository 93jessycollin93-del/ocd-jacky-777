import { Suspense } from 'react';
import { X, Check, Plus, Trash2, Sparkles } from 'lucide-react';

// Modal preview that actually renders the live widget inside a Suspense
// boundary so the user sees the real thing before installing. Mobile-first
// layout with a sticky action bar at the bottom.
export default function ModulePreviewDialog({ module, installed, onInstall, onUninstall, onClose }) {
  if (!module) return null;
  const Component = module.component;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-border p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-secondary text-2xl">
            {module.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold">{module.name}</h3>
              {installed && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                  <Check className="h-2.5 w-2.5" /> Installed
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{module.tagline}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm leading-relaxed text-foreground">{module.description}</p>

          {module.preview?.length > 0 && (
            <ul className="mt-4 space-y-2">
              {module.preview.map((line) => (
                <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0 text-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Live preview</p>
            <div className="rounded-2xl border border-border bg-background/40 p-2">
              <Suspense
                fallback={
                  <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                    Loading preview…
                  </div>
                }
              >
                <Component />
              </Suspense>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border bg-card/95 p-3">
          <button
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm font-medium text-foreground"
          >
            Close
          </button>
          {installed ? (
            <button
              onClick={() => { onUninstall(module.id); onClose(); }}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm font-semibold text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          ) : (
            <button
              onClick={() => { onInstall(module.id); onClose(); }}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}