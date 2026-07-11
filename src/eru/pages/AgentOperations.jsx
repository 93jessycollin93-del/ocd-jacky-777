import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cpu, AlertTriangle } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import AgentTaskBuilder from '@/eru/components/ailab/AgentTaskBuilder';
import AgentTaskList from '@/eru/components/ailab/AgentTaskList';
import AgentActivityDashboard from '@/eru/components/ailab/AgentActivityDashboard';

export default function AgentOperations() {
  const [bots, setBots] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [runs, setRuns] = useState([]);
  const [entitiesAvailable, setEntitiesAvailable] = useState(true);

  const loadData = async () => {
    const botRows = await base44.entities.UserBot.list('-updated_date', 100).catch(() => []);
    const taskRows = await base44.entities.AgentTask.list('-updated_date', 100).catch(() => null);
    const runRows = await base44.entities.AgentTaskRun.list('-created_date', 100).catch(() => null);

    setBots(botRows || []);

    if (taskRows === null || runRows === null) {
      setEntitiesAvailable(false);
      setTasks([]);
      setRuns([]);
      return;
    }

    setEntitiesAvailable(true);
    setTasks(taskRows || []);
    setRuns(runRows || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 py-4 pb-24">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Agent Operations</p>
              <p className="text-xs text-muted-foreground">Custom tasks, triggers, workflows, and activity monitoring.</p>
            </div>
          </div>
          <Link to="/ailab" className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to AI Lab
          </Link>
        </div>

        {entitiesAvailable ? (
          <>
            <AgentActivityDashboard tasks={tasks} runs={runs} />

            <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
              <AgentTaskBuilder bots={bots} onCreated={loadData} />
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Saved custom tasks</p>
                  <p className="text-[11px] text-muted-foreground">Manage event-driven and time-based agent workflows.</p>
                </div>
                <AgentTaskList tasks={tasks} onChanged={loadData} />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
              <div>
                <p className="text-sm font-semibold text-foreground">Agent task storage is not available</p>
                <p className="mt-1 text-xs text-muted-foreground">This page is trying to use AgentTask and AgentTaskRun, but those entities are not available in the live app yet. The page has been safely disabled so it won’t crash.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}