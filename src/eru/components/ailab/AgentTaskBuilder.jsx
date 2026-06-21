import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

const EMPTY_TASK = {
  name: '',
  description: '',
  bot_id: '',
  trigger_type: 'time',
  interval_seconds: 300,
  event_name: '',
  event_condition: '',
  action_type: 'internal_data',
  workflow_prompt: '',
  data_sources: '',
  status: 'draft',
};

export default function AgentTaskBuilder({ bots = [], onCreated }) {
  const [form, setForm] = useState(EMPTY_TASK);
  const [saving, setSaving] = useState(false);

  const selectedBot = useMemo(() => bots.find((bot) => bot.id === form.bot_id), [bots, form.bot_id]);

  const saveTask = async () => {
    if (!form.name || !form.bot_id) return;
    setSaving(true);
    await base44.entities.AgentTask.create({
      name: form.name,
      description: form.description,
      bot_id: form.bot_id,
      bot_name: selectedBot?.name || '',
      trigger_type: form.trigger_type,
      interval_seconds: form.trigger_type === 'time' ? Number(form.interval_seconds || 300) : 0,
      event_name: form.trigger_type === 'event' ? form.event_name : '',
      event_condition: form.trigger_type === 'event' ? form.event_condition : '',
      action_type: form.action_type,
      workflow_prompt: form.workflow_prompt,
      data_sources: form.data_sources.split(',').map((item) => item.trim()).filter(Boolean),
      status: form.status,
      run_count: 0,
      success_count: 0,
    });
    setForm(EMPTY_TASK);
    setSaving(false);
    onCreated?.();
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Create custom agent task</p>
        <p className="text-[11px] text-muted-foreground">Build time-based or event-based tasks with internal data, external data, or bot creation workflows.</p>
      </div>

      <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Task name" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
      <input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Short description" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />

      <select value={form.bot_id} onChange={(e) => setForm((prev) => ({ ...prev, bot_id: e.target.value }))} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
        <option value="">Select bot</option>
        {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
      </select>

      <div className="grid gap-2 sm:grid-cols-2">
        <select value={form.trigger_type} onChange={(e) => setForm((prev) => ({ ...prev, trigger_type: e.target.value }))} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
          <option value="time">Time trigger</option>
          <option value="event">Event trigger</option>
        </select>
        <select value={form.action_type} onChange={(e) => setForm((prev) => ({ ...prev, action_type: e.target.value }))} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
          <option value="internal_data">Internal data action</option>
          <option value="external_data">External data action</option>
          <option value="bot_creation">Automated bot creation</option>
        </select>
      </div>

      {form.trigger_type === 'time' ? (
        <input type="number" min="30" value={form.interval_seconds} onChange={(e) => setForm((prev) => ({ ...prev, interval_seconds: e.target.value }))} placeholder="Run every N seconds" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={form.event_name} onChange={(e) => setForm((prev) => ({ ...prev, event_name: e.target.value }))} placeholder="Event name" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
          <input value={form.event_condition} onChange={(e) => setForm((prev) => ({ ...prev, event_condition: e.target.value }))} placeholder="Condition or filter" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
        </div>
      )}

      <textarea value={form.workflow_prompt} onChange={(e) => setForm((prev) => ({ ...prev, workflow_prompt: e.target.value }))} placeholder="Describe the workflow, action sequence, or creation logic" className="min-h-[96px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
      <input value={form.data_sources} onChange={(e) => setForm((prev) => ({ ...prev, data_sources: e.target.value }))} placeholder="Data sources, comma separated" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />

      <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
      </select>

      <button onClick={saveTask} disabled={saving || !form.name || !form.bot_id} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
        <Plus className="h-4 w-4" /> {saving ? 'Saving...' : 'Create task'}
      </button>
    </div>
  );
}