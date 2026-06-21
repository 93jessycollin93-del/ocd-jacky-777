import { Copy, RefreshCcw, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export default function WebsiteGeneratorSectionActions({ onMoveUp, onMoveDown, onDuplicate, onDelete, onRegenerate, disableUp, disableDown }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={onMoveUp} disabled={disableUp} className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-40">
        <ArrowUp className="w-3.5 h-3.5" /> Up
      </button>
      <button onClick={onMoveDown} disabled={disableDown} className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-40">
        <ArrowDown className="w-3.5 h-3.5" /> Down
      </button>
      <button onClick={onDuplicate} className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground">
        <Copy className="w-3.5 h-3.5" /> Duplicate
      </button>
      <button onClick={onDelete} className="inline-flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
      <button onClick={onRegenerate} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
        <RefreshCcw className="w-3.5 h-3.5" /> Regenerate
      </button>
    </div>
  );
}