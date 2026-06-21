import { Sparkles, RefreshCw, Braces, Eye, Bot, PlusSquare } from 'lucide-react';

const ACTIONS = [
  { key: 'edit', label: 'Edit with AI', icon: Sparkles },
  { key: 'explain', label: 'Explain', icon: Bot },
  { key: 'refactor', label: 'Refactor', icon: Braces },
  { key: 'regenerate', label: 'Regenerate', icon: RefreshCw },
  { key: 'insert', label: 'Insert', icon: PlusSquare },
  { key: 'preview', label: 'Preview', icon: Eye },
];

export default function AIEditBar({ instruction, onInstructionChange, onAction, busy = false, compact = false }) {
  return (
    <div className={`rounded-xl border border-primary/20 bg-primary/5 ${compact ? 'p-2 space-y-2' : 'p-3 space-y-3'}`}>
      <div className="flex flex-wrap gap-1.5">
        {ACTIONS.map((action) => {
          const ActionIcon = action.icon;
          return (
            <button
              key={action.key}
              onClick={() => onAction(action.key)}
              disabled={busy}
              className={`inline-flex items-center gap-1 rounded-lg border border-border bg-background font-medium text-foreground disabled:opacity-50 ${compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-[11px]'}`}
            >
              <ActionIcon className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-primary`} /> {action.label}
            </button>
          );
        })}
      </div>
      <input
        value={instruction}
        onChange={(e) => onInstructionChange(e.target.value)}
        placeholder="Type an edit instruction..."
        className={`w-full rounded-xl border border-border bg-background text-foreground outline-none ${compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'}`}
      />
    </div>
  );
}