import { useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Plus, CheckSquare, FolderOpen, NotebookPen, X } from 'lucide-react';

const ACTIONS = [
  {
    id: 'task',
    label: 'New Task',
    icon: CheckSquare,
    create: () => base44.entities.Task.create({ title: 'New Task', status: 'todo', priority: 'medium' }),
  },
  {
    id: 'project',
    label: 'New Project',
    icon: FolderOpen,
    create: () => base44.entities.Project.create({ name: 'New Project', status: 'planned' }),
  },
  {
    id: 'note',
    label: 'New Note',
    icon: NotebookPen,
    create: () => base44.entities.JackieSaved.create({ title: 'Quick Note', content: 'New note', tag: 'general', asset_type: 'text' }),
  },
];

function ActionButton({ action, onCreate, loadingId }) {
  const Icon = action.icon;

  return (
    <button
      onClick={() => onCreate(action)}
      disabled={loadingId === action.id}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-lg transition-all hover:bg-secondary disabled:opacity-60"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="w-4 h-4" />
      </div>
      <span className="font-medium">{loadingId === action.id ? 'Creating…' : action.label}</span>
    </button>
  );
}

export default function FloatingQuickActions() {
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  const handleCreate = async (action) => {
    setLoadingId(action.id);
    await action.create();
    setLoadingId(null);
    setOpen(false);
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-4 bottom-24 mx-auto max-w-sm max-h-[70dvh] overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] rounded-3xl border border-border bg-card/95 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Quick Actions</p>
                <p className="text-xs text-muted-foreground">Create items instantly</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {ACTIONS.map((action) => (
                <ActionButton key={action.id} action={action} onCreate={handleCreate} loadingId={loadingId} />
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-36 right-4 z-[66] flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-2xl transition-transform hover:scale-105 active:scale-95"
        title="Quick Actions"
      >
        <Plus className={`w-6 h-6 transition-transform ${open ? 'rotate-45' : 'rotate-0'}`} />
      </button>
    </>
  );
}