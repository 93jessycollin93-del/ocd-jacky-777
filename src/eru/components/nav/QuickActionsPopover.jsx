import { useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Plus, CheckSquare, FolderOpen, NotebookPen, X } from 'lucide-react';

/**
 * QuickActionsPopover
 * ----------------------------------------------------------------------------
 * Same business logic as the legacy FloatingQuickActions (create Task /
 * Project / Note via base44 entities), but presented as a nav-anchored
 * popover instead of a free-floating bubble. Triggered by a nav button
 * exposing the Plus icon.
 * --------------------------------------------------------------------------*/

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

export default function QuickActionsPopover({ trigger }) {
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  const handleCreate = async (action) => {
    setLoadingId(action.id);
    try { await action.create(); } catch {}
    setLoadingId(null);
    setOpen(false);
  };

  return (
    <>
      {/* Trigger render-prop pattern keeps button styling consistent with the nav */}
      {trigger ? trigger({ onClick: () => setOpen((p) => !p), open }) : (
        <button
          onClick={() => setOpen((p) => !p)}
          title="Quick Actions"
          className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus style={{ width: 18, height: 18 }} className={`transition-transform ${open ? 'rotate-45' : ''}`} />
          <span className="text-[8px] font-medium leading-none">Create</span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute inset-x-4 bottom-24 mx-auto max-w-sm max-h-[70dvh] overflow-y-auto rounded-3xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
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
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleCreate(action)}
                    disabled={loadingId === action.id}
                    className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-lg transition-all hover:bg-secondary disabled:opacity-60"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{loadingId === action.id ? 'Creating…' : action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}