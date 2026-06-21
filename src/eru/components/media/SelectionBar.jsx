import { X, CheckCheck } from 'lucide-react';

/**
 * SelectionBar — fixed bottom bar shown during multi-select mode. Displays the
 * selected count and select-all/clear controls; page-specific bulk actions are
 * passed as children. Sits above the persistent player / mobile tab bar.
 */
export default function SelectionBar({ count, total, onSelectAll, onClear, onExit, children }) {
  const allSelected = total > 0 && count === total;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[55] border-t border-border bg-card/95 backdrop-blur-md"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 60px)' }}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-3 py-2">
        <button
          onClick={onExit}
          aria-label="Exit selection"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="flex-shrink-0 text-sm font-medium text-foreground">
          {count} selected
        </span>
        <button
          onClick={() => (allSelected ? onClear() : onSelectAll())}
          className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
        >
          <CheckCheck className="h-3 w-3" />
          {allSelected ? 'Clear' : 'All'}
        </button>
        <div className="ml-auto flex items-center gap-1">{children}</div>
      </div>
    </div>
  );
}
