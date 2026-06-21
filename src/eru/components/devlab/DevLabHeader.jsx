import { Code2, ChevronDown, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import BottomSheet from '../mobile/BottomSheet';

/**
 * DevLabHeader — top strip with project picker, mode toggle, and a "new
 * session" action. Mobile-first: project picker opens a BottomSheet on small
 * screens; mode toggle is a 2-segment control.
 */
export default function DevLabHeader({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  mode,
  onChangeMode,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary">
          <Code2 className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Jackie Dev Lab</p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1 text-sm font-semibold text-foreground truncate"
          >
            <span className="truncate">{activeProject?.title || 'Select project'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          </button>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary p-1">
          {['plan', 'agent'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChangeMode(m)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                mode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={mode === m}
            >
              {m === 'plan' ? 'Plan' : 'Agent'}
            </button>
          ))}
        </div>
      </div>

      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Switch project">
        <div className="space-y-2">
          {(projects || []).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onSelectProject(p); setPickerOpen(false); }}
              className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
                activeProject?.id === p.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-secondary/40 hover:border-primary/30'
              }`}
            >
              <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
              <p className="text-xs text-muted-foreground truncate">{p.primary_stack || 'No stack set'} · {p.status}</p>
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setPickerOpen(false); onCreateProject(); }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/20 px-3 py-3 text-sm font-medium text-primary hover:border-primary/40"
          >
            <Plus className="h-4 w-4" />
            New project
          </button>
          <p className="flex items-center gap-2 px-1 pt-1 text-[10px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Templates run locally until an AI provider is connected.
          </p>
        </div>
      </BottomSheet>
    </header>
  );
}