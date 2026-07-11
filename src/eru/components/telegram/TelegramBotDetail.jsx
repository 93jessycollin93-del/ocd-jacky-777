import { useEffect, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Loader2, Save, Trash2 } from 'lucide-react';
import TelegramKnowledgeLinkPanel from './TelegramKnowledgeLinkPanel';
import TelegramSwarmConfigPanel from './TelegramSwarmConfigPanel';

export default function TelegramBotDetail({ bot, onSaved, onDeleted, bots = [] }) {
  const [form, setForm] = useState(bot);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setForm(bot);
  }, [bot]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    await base44.functions.invoke('updateTelegramBot', {
      botId: bot.id,
      system_prompt: form.system_prompt,
      greeting_message: form.greeting_message,
      memory_enabled: form.memory_enabled,
      memory_message_limit: Number(form.memory_message_limit || 20),
      status: form.status,
      swarm_enabled: !!form.swarm_enabled,
      router_bot_id: form.router_bot_id || '',
      specialist_bot_ids: form.specialist_bot_ids || [],
      swarm_goal_template: form.swarm_goal_template || '',
      front_door_role: form.front_door_role || 'general',
      backend_swarm_size: Number(form.backend_swarm_size || 25),
      swarm_execution_mode: form.swarm_execution_mode || 'targeted',
      max_specialists_per_request: Number(form.max_specialists_per_request || 6),
    });
    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.TelegramBot.delete(bot.id);
    setDeleting(false);
    onDeleted();
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold">{bot.name}</p>
        <p className="text-xs text-muted-foreground">Webhook: {bot.webhook_enabled ? 'connected' : 'not connected'}</p>
      </div>
      <textarea value={form.system_prompt || ''} onChange={(e) => setField('system_prompt', e.target.value)} className="w-full min-h-[120px] bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none" />
      <textarea value={form.greeting_message || ''} onChange={(e) => setField('greeting_message', e.target.value)} className="w-full min-h-[90px] bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none" />
      <div className="grid grid-cols-2 gap-2">
        <select value={form.front_door_role || 'general'} onChange={(e) => setField('front_door_role', e.target.value)} className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none">
          {['general', 'sales', 'support', 'ops', 'custom'].map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <select value={form.status || 'active'} onChange={(e) => setField('status', e.target.value)} className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none">
          {['active', 'offline', 'error', 'draft'].map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>
      <input type="number" min="1" max="40" value={form.memory_message_limit || 20} onChange={(e) => setField('memory_message_limit', e.target.value)} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
      <textarea value={form.swarm_goal_template || ''} onChange={(e) => setField('swarm_goal_template', e.target.value)} placeholder="Routing instructions for the front-door bot" className="w-full min-h-[90px] bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none" />

      <TelegramSwarmConfigPanel bots={bots} form={form} setForm={setForm} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!form.memory_enabled} onChange={(e) => setField('memory_enabled', e.target.checked)} className="w-4 h-4 accent-primary" />
        Memory enabled
      </label>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
        </button>
        <button onClick={handleDelete} disabled={deleting} className="px-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl disabled:opacity-50">
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      <TelegramKnowledgeLinkPanel bot={bot} />
    </div>
  );
}