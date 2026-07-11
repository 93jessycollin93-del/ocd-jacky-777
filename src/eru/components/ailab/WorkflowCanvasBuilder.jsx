import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Bot, Database, Mail, MessageCircle, Play, Save, Trash2, Workflow } from 'lucide-react';

const NODE_LIBRARY = [
  { type: 'bot', label: 'Bot step', icon: Bot, color: 'text-primary bg-primary/10 border-primary/20' },
  { type: 'data_source', label: 'Data source', icon: Database, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  { type: 'email_alert', label: 'Email alert', icon: Mail, color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  { type: 'telegram_alert', label: 'Telegram alert', icon: MessageCircle, color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
];

const ACTION_TYPE_MAP = {
  bot: 'internal_data',
  data_source: 'external_data',
  email_alert: 'internal_data',
  telegram_alert: 'internal_data',
};

function createNode(type, bots = []) {
  const fallbackBot = bots[0];
  return {
    id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    title: type === 'bot' ? fallbackBot?.name || 'Bot step' : NODE_LIBRARY.find((item) => item.type === type)?.label || 'Step',
    bot_id: type === 'bot' ? fallbackBot?.id || '' : '',
    bot_name: type === 'bot' ? fallbackBot?.name || '' : '',
    connector_name: type === 'data_source' ? 'sheets' : '',
    service: type === 'data_source' ? 'googlesheets' : '',
    access_level: type === 'data_source' ? 'read' : '',
    recipient: '',
    prompt: '',
  };
}

function WorkflowNodeCard({ node, index, total, bots, onChange, onDragStart, onDragOver, onDrop, onRemove }) {
  const meta = NODE_LIBRARY.find((item) => item.type === node.type);
  const Icon = meta?.icon || Workflow;

  return (
    <div draggable onDragStart={() => onDragStart(index)} onDragOver={(e) => onDragOver(e)} onDrop={() => onDrop(index)} className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${meta?.color || 'text-foreground bg-secondary border-border'}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">Step {index + 1}: {meta?.label}</p>
            <p className="text-[11px] text-muted-foreground">Drag to reorder this workflow chain.</p>
          </div>
        </div>
        <button onClick={onRemove} className="rounded-xl border border-destructive/20 bg-destructive/10 p-2 text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {node.type === 'bot' && (
        <select value={node.bot_id} onChange={(e) => {
          const nextBot = bots.find((bot) => bot.id === e.target.value);
          onChange({ bot_id: e.target.value, bot_name: nextBot?.name || '', title: nextBot?.name || node.title });
        }} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
          <option value="">Choose bot</option>
          {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
        </select>
      )}

      {node.type === 'data_source' && (
        <div className="grid gap-2 sm:grid-cols-2">
          <select value={node.service} onChange={(e) => onChange({ service: e.target.value })} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
            <option value="googlesheets">Google Sheets</option>
            <option value="airtable">Airtable</option>
            <option value="salesforce">Salesforce</option>
          </select>
          <select value={node.access_level} onChange={(e) => onChange({ access_level: e.target.value })} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
            <option value="read">Read only</option>
            <option value="write">Write only</option>
            <option value="read_write">Read & write</option>
          </select>
        </div>
      )}

      {(node.type === 'email_alert' || node.type === 'telegram_alert') && (
        <input value={node.recipient} onChange={(e) => onChange({ recipient: e.target.value })} placeholder={node.type === 'email_alert' ? 'Recipient email' : 'Telegram chat ID or label'} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
      )}

      <input value={node.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Step title" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
      <textarea value={node.prompt} onChange={(e) => onChange({ prompt: e.target.value })} placeholder="Describe what this step should do before handing off to the next step" className="min-h-[84px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />

      {index < total - 1 && (
        <div className="flex items-center justify-center py-1 text-[10px] font-medium text-muted-foreground">
          ↓ hands off to next step
        </div>
      )}
    </div>
  );
}

export default function WorkflowCanvasBuilder({ bots = [] }) {
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [nodes, setNodes] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) || null, [tasks, selectedTaskId]);

  const loadTasks = async () => {
    const rows = await base44.entities.AgentTask.list('-updated_date', 100).catch(() => []);
    setTasks(rows || []);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (!selectedTask) {
      setWorkflowName('');
      setWorkflowDescription('');
      setNodes([]);
      return;
    }
    setWorkflowName(selectedTask.name || '');
    setWorkflowDescription(selectedTask.description || '');
    setNodes(selectedTask.workflow_nodes || []);
  }, [selectedTaskId, selectedTask]);

  const addNode = (type) => setNodes((prev) => [...prev, createNode(type, bots)]);

  const updateNode = (id, patch) => setNodes((prev) => prev.map((node) => node.id === id ? { ...node, ...patch } : node));

  const removeNode = (id) => setNodes((prev) => prev.filter((node) => node.id !== id));

  const handleDrop = (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    setNodes((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  const saveWorkflow = async () => {
    if (!workflowName || nodes.length === 0) return;
    setSaving(true);
    const botSteps = nodes.filter((node) => node.type === 'bot' && node.bot_id);
    const primaryBot = botSteps[0];
    const payload = {
      name: workflowName,
      description: workflowDescription,
      bot_id: primaryBot?.bot_id || '',
      bot_name: primaryBot?.bot_name || '',
      trigger_type: 'event',
      event_name: 'workflow_canvas',
      event_condition: `${nodes.length} chained steps`,
      action_type: 'workflow_chain',
      workflow_prompt: nodes.map((node, index) => `${index + 1}. ${node.title}: ${node.prompt}`).join('\n'),
      data_sources: nodes.filter((node) => node.type === 'data_source').map((node) => node.title || node.service),
      workflow_nodes: nodes,
      status: 'draft',
      run_count: selectedTask?.run_count || 0,
      success_count: selectedTask?.success_count || 0,
    };

    if (selectedTaskId) {
      await base44.entities.AgentTask.update(selectedTaskId, payload);
    } else {
      const created = await base44.entities.AgentTask.create(payload);
      setSelectedTaskId(created.id);
    }
    setSaving(false);
    loadTasks();
  };

  const runWorkflowPreview = async () => {
    if (nodes.length === 0) return;
    setRunning(true);
    const summary = nodes.map((node, index) => `${index + 1}. ${node.type} · ${node.title}`).join(' → ');
    await base44.entities.AgentTaskRun.create({
      task_id: selectedTaskId || `draft_${Date.now()}`,
      task_name: workflowName || 'Workflow canvas draft',
      bot_id: nodes.find((node) => node.type === 'bot')?.bot_id || '',
      bot_name: nodes.find((node) => node.type === 'bot')?.bot_name || '',
      trigger_type: 'event',
      action_type: 'workflow_chain',
      status: 'success',
      duration_ms: 0,
      result_summary: `Workflow preview executed for ${nodes.length} steps.`,
      details: summary,
    });
    setRunning(false);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Workflow Canvas</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Build sequential multi-step chains with bots, data sources, email alerts, and Telegram alerts.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
          <option value="">New workflow canvas</option>
          {tasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
        </select>
        <input value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} placeholder="Workflow name" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
        <input value={workflowDescription} onChange={(e) => setWorkflowDescription(e.target.value)} placeholder="What this chain accomplishes" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {NODE_LIBRARY.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.type} onClick={() => addNode(item.type)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-3 text-xs font-semibold text-foreground">
                <Icon className="h-3.5 w-3.5" /> {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {nodes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Add steps above to start your workflow chain.</div>
        ) : nodes.map((node, index) => (
          <WorkflowNodeCard
            key={node.id}
            node={node}
            index={index}
            total={nodes.length}
            bots={bots}
            onChange={(patch) => updateNode(node.id, patch)}
            onDragStart={setDragIndex}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onRemove={() => removeNode(node.id)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={saveWorkflow} disabled={!workflowName || nodes.length === 0 || saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save workflow'}
        </button>
        <button onClick={runWorkflowPreview} disabled={nodes.length === 0 || running} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary disabled:opacity-40">
          <Play className="h-4 w-4" /> {running ? 'Running...' : 'Run preview'}
        </button>
      </div>
    </div>
  );
}