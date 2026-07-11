import { Pause, Play, Trash2 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

export default function AgentTaskList({ tasks = [], onChanged }) {
  const toggleStatus = async (task) => {
    const nextStatus = task.status === 'active' ? 'paused' : 'active';
    await base44.entities.AgentTask.update(task.id, { status: nextStatus });
    onChanged?.();
  };

  const removeTask = async (taskId) => {
    await base44.entities.AgentTask.delete(taskId);
    onChanged?.();
  };

  if (!tasks.length) {
    return <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">No custom tasks yet.</div>;
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div key={task.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{task.name}</p>
                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{task.trigger_type}</span>
                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{task.action_type}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${task.status === 'active' ? 'bg-green-400/10 text-green-400' : 'bg-secondary text-muted-foreground'}`}>{task.status}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{task.description || 'No description provided.'}</p>
              <div className="mt-2 grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-4">
                <span>Bot: {task.bot_name || 'Unknown'}</span>
                <span>{task.trigger_type === 'time' ? `Every ${task.interval_seconds || 0}s` : `Event: ${task.event_name || 'custom'}`}</span>
                <span>Runs: {task.run_count || 0}</span>
                <span>Success: {task.success_count || 0}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleStatus(task)} className="rounded-lg border border-border bg-secondary p-2 text-muted-foreground">
                {task.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button onClick={() => removeTask(task.id)} className="rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}