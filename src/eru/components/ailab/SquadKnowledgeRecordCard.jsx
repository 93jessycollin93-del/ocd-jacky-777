import { Edit3, Pin, Trash2 } from 'lucide-react';

export default function SquadKnowledgeRecordCard({ entry, editingId, draft, onEdit, onChange, onSave, onCancel, onDelete, onTogglePin, isPinned }) {
  const isEditing = editingId === entry.id;

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-foreground">{isEditing ? 'Editing knowledge entry' : entry.goal}</p>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button onClick={onSave} className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary">Save</button>
              <button onClick={onCancel} className="rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={onTogglePin} className={isPinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}><Pin className="w-3.5 h-3.5" /></button>
              <button onClick={onEdit} className="text-muted-foreground hover:text-foreground"><Edit3 className="w-3.5 h-3.5" /></button>
              <button onClick={onDelete} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="mt-3 space-y-2">
          <input value={draft.goal} onChange={(e) => onChange('goal', e.target.value)} placeholder="Goal" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none" />
          <input value={draft.source_squad_name} onChange={(e) => onChange('source_squad_name', e.target.value)} placeholder="Squad name" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none" />
          <textarea value={draft.result_summary} onChange={(e) => onChange('result_summary', e.target.value)} placeholder="Result summary" className="min-h-[80px] w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none resize-none" />
          <input value={draft.keywords} onChange={(e) => onChange('keywords', e.target.value)} placeholder="Keywords separated by commas" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none" />
        </div>
      ) : (
        <>
          <p className="mt-1 text-[11px] text-muted-foreground">{entry.source_squad_name}</p>
          <p className="mt-2 text-[11px] text-muted-foreground line-clamp-4">{entry.result_summary}</p>
          {(entry.keywords || []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {entry.keywords.slice(0, 8).map((keyword) => (
                <span key={keyword} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] text-primary">
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}