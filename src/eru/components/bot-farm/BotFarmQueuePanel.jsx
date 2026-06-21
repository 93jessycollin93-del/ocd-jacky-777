import { sortTasks } from './BotFarmUtils';

export default function BotFarmQueuePanel({ tasks, sortMode, setSortMode, onAssignTask }) {
  const sorted = sortTasks(tasks, sortMode);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Task Queue Manager</p>
          <p className="text-[11px] text-muted-foreground">Assignments are operational: fit, load, coordination, and risk directly affect outputs.</p>
        </div>
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none">
          <option value="priority">Priority</option>
          <option value="fit">Fit</option>
          <option value="urgency">Urgency</option>
          <option value="risk">Risk</option>
          <option value="value">Value</option>
        </select>
      </div>

      <div className="space-y-2">
        {sorted.map((task) => (
          <div key={task.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">{task.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{task.description}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="rounded-full border border-border px-2 py-1 text-muted-foreground">{task.status}</span>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-primary">{task.priority}</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6 text-[10px] text-muted-foreground">
              <div>Fit <span className="text-foreground">{task.bot_fit_score}</span></div>
              <div>Urgency <span className="text-foreground">{task.urgency}</span></div>
              <div>Risk <span className="text-foreground">{task.risk}</span></div>
              <div>Value <span className="text-foreground">{task.expected_output_value}</span></div>
              <div>Load <span className="text-foreground">{task.estimated_load}</span></div>
              <div>Coord <span className="text-foreground">{task.coordination_cost}</span></div>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={() => onAssignTask(task)} className="rounded-xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground">Auto Assign</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}