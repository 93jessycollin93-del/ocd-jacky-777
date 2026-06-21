import { CheckCircle2, Clock3, ListTodo, Plus } from 'lucide-react';

const STATUS_STYLES = {
  todo: 'bg-secondary text-foreground',
  in_progress: 'bg-primary/10 text-primary',
  done: 'bg-green-500/10 text-green-400'
};

export default function MiniAppTaskQueue({ tasks, draftTitle, onDraftTitleChange, onCreateTask, onToggleTask }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ListTodo className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Bot task queue</p>
      </div>

      <div className="flex gap-2">
        <input
          value={draftTitle}
          onChange={(e) => onDraftTitleChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onCreateTask()}
          placeholder="Add a quick task"
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none text-foreground"
        />
        <button onClick={onCreateTask} className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-primary-foreground">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onToggleTask(task)}
              className="w-full rounded-xl border border-border bg-background p-3 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className={`rounded-full px-2 py-0.5 ${STATUS_STYLES[task.status] || STATUS_STYLES.todo}`}>{task.status?.replace('_', ' ')}</span>
                    <span>{task.priority || 'medium'} priority</span>
                  </div>
                </div>
                {task.status === 'done' ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <Clock3 className="w-4 h-4 text-primary flex-shrink-0" />}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No queued bot tasks yet.</p>
      )}
    </div>
  );
}