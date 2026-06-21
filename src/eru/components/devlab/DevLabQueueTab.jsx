import { useState } from 'react';
import { Play, Pause, CheckCircle2, AlertTriangle, Trash2, ArrowRight, Clipboard, Loader2 } from 'lucide-react';
import ConfirmDialog from '@/eru/components/ConfirmDialog';

const STATUS_STYLES = {
  queued:           { tone: 'bg-secondary text-muted-foreground border-border' },
  planning:         { tone: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  ready:            { tone: 'bg-primary/10 text-primary border-primary/30' },
  blocked:          { tone: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  needs_setup:      { tone: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  running:          { tone: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  completed:        { tone: 'bg-green-500/10 text-green-400 border-green-500/30' },
  failed:           { tone: 'bg-destructive/10 text-destructive border-destructive/30' },
  manually_exported:{ tone: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
};

/**
 * DevLabQueueTab — sequential task list. No fake "running" animation; tasks
 * advance only when the user marks them done or generates a manual patch.
 */
export default function DevLabQueueTab({
  tasks,
  onAdvance,
  onDelete,
  onExportPatch,
  onClearQueue,
  isOwner,
  patchBusyId,
}) {
  const [confirmClear, setConfirmClear] = useState(false);

  if (!tasks?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
        <Play className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm font-medium text-foreground">No tasks queued</p>
        <p className="mt-1 text-xs text-muted-foreground">Approve a plan and convert it to tasks to populate the queue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{tasks.length} task{tasks.length === 1 ? '' : 's'}</p>
        {isOwner && (
          <button
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" /> Clear queue
          </button>
        )}
      </div>

      <ol className="space-y-2">
        {tasks.map((task, i) => {
          const style = STATUS_STYLES[task.status] || STATUS_STYLES.queued;
          const isDone = task.status === 'completed' || task.status === 'manually_exported';
          return (
            <li key={task.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-mono text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wide ${style.tone}`}>
                      {task.status?.replace('_', ' ')}
                    </span>
                    <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                      {task.task_type}
                    </span>
                  </div>
                  {task.description && (
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{task.description}</p>
                  )}
                  {task.output_summary && (
                    <p className="mt-1 text-[11px] text-foreground/80 font-mono whitespace-pre-wrap">{task.output_summary}</p>
                  )}
                  {task.error_message && (
                    <p className="mt-1 flex items-start gap-1 text-[11px] text-destructive">
                      <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                      {task.error_message}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    {!isDone && (
                      <>
                        <button
                          onClick={() => onAdvance(task, 'completed')}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/30 px-2.5 py-1.5 text-[11px] font-semibold text-primary"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Mark done
                        </button>
                        <button
                          onClick={() => onAdvance(task, 'blocked')}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300"
                        >
                          <Pause className="h-3 w-3" /> Block
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onExportPatch(task)}
                      disabled={patchBusyId === task.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-[11px] text-foreground disabled:opacity-50"
                    >
                      {patchBusyId === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clipboard className="h-3 w-3" />}
                      Export patch
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => onDelete(task)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-destructive"
                        aria-label="Delete task"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <ArrowRight className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
              </div>
            </li>
          );
        })}
      </ol>

      <ConfirmDialog
        open={confirmClear}
        title="Clear the entire task queue?"
        description="This deletes every task for this plan. Plan and patches stay intact."
        confirmLabel="Clear queue"
        tone="danger"
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          await onClearQueue();
          setConfirmClear(false);
        }}
      />
    </div>
  );
}