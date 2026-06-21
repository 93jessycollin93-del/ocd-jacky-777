import { useState, useEffect } from 'react';
import { Clock, Plus, Play, Pause, Trash2, Zap, Bot, Edit3, Link as LinkIcon, MessageCircle, BellRing } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';

const INTERVALS = [
  { label: 'Every hour', hours: 1 },
  { label: 'Every 6 hours', hours: 6 },
  { label: 'Every 12 hours', hours: 12 },
  { label: 'Every 24 hours', hours: 24 },
  { label: 'Every 3 days', hours: 72 },
  { label: 'Every week', hours: 168 },
];

const BLANK = { name: '', bot_id: '', bot_name: '', task_prompt: '', interval_hours: 24, slack_webhook_url: '', webhook_urls_text: '', telegram_chat_ids_text: '', alert_condition: '', alert_events: ['trade_execution', 'performance_threshold'], threshold_rules_text: '', inbound_webhook_key: '', inbound_webhook_label: '' };

function timeAgo(iso) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function BotAutomations() {
  const { currentUser } = useAuth();
  const [automations, setAutomations] = useState([]);
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [running, setRunning] = useState({});

  const load = async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      base44.entities.BotAutomation.list('-created_date', 50),
      base44.entities.UserBot.filter({ status: 'active' }, '-created_date', 50),
    ]);
    setAutomations(a);
    setBots(b);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.bot_id || !form.task_prompt) return;
    const selectedBot = bots.find(b => b.id === form.bot_id);
    const data = {
      ...form,
      bot_name: selectedBot?.name || '',
      user_email: currentUser?.email,
      webhook_urls: form.webhook_urls_text.split('\n').map(item => item.trim()).filter(Boolean),
      telegram_chat_ids: form.telegram_chat_ids_text.split(',').map(item => item.trim()).filter(Boolean),
      threshold_rules: form.threshold_rules_text.split('\n').map(item => item.trim()).filter(Boolean).map((item) => ({ metric: item, operator: 'above', value: 0, label: item })),
    };
    delete data.webhook_urls_text;
    delete data.telegram_chat_ids_text;
    delete data.threshold_rules_text;
    if (!data.inbound_webhook_key) {
      data.inbound_webhook_key = crypto.randomUUID();
    }
    if (editId) await base44.entities.BotAutomation.update(editId, data);
    else await base44.entities.BotAutomation.create(data);
    setShowForm(false); setForm(BLANK); setEditId(null); load();
  };

  const del = async (id) => { await base44.entities.BotAutomation.delete(id); load(); };

  const toggle = async (auto) => {
    await base44.entities.BotAutomation.update(auto.id, { status: auto.status === 'active' ? 'paused' : 'active' });
    load();
  };

  const startEdit = (auto) => {
    setForm({
      name: auto.name,
      bot_id: auto.bot_id,
      bot_name: auto.bot_name,
      task_prompt: auto.task_prompt,
      interval_hours: auto.interval_hours,
      slack_webhook_url: auto.slack_webhook_url || '',
      webhook_urls_text: (auto.webhook_urls || []).join('\n'),
      telegram_chat_ids_text: (auto.telegram_chat_ids || []).join(', '),
      alert_condition: auto.alert_condition || '',
      alert_events: auto.alert_events || ['trade_execution', 'performance_threshold'],
      threshold_rules_text: (auto.threshold_rules || []).map(rule => rule.label || rule.metric || '').join('\n'),
      inbound_webhook_key: auto.inbound_webhook_key || '',
      inbound_webhook_label: auto.inbound_webhook_label || ''
    });
    setEditId(auto.id);
    setShowForm(true);
  };

  const runNow = async (auto) => {
    setRunning(prev => ({ ...prev, [auto.id]: true }));
    const bot = bots.find(b => b.id === auto.bot_id);
    const prompt = `You are ${bot?.name || 'an AI assistant'}. ${bot?.instructions || ''}\n\nAutomation task: ${auto.task_prompt}\n\nProvide a clear, concise report of your findings.`;
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
    });

    const shouldAlert = !auto.alert_condition || result.toLowerCase().includes(auto.alert_condition.toLowerCase());
    if (shouldAlert) {
      await base44.functions.invoke('dispatchBotAutomationAlert', {
        automationId: auto.id,
        eventType: 'automation_run',
        title: `${auto.name} alert`,
        message: result,
        data: {
          bot_id: auto.bot_id,
          bot_name: bot?.name || auto.bot_name,
          source: 'run_now'
        }
      }).catch(() => null);
    }

    await base44.entities.BotAutomation.update(auto.id, {
      last_run_at: new Date().toISOString(),
      last_run_result: result.slice(0, 500),
      run_count: (auto.run_count || 0) + 1,
    });

    setRunning(prev => { const n = { ...prev }; delete n[auto.id]; return n; });
    load();
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Bot Automations</h2>
          <p className="text-[10px] text-muted-foreground">Scheduled bot tasks with Telegram + multi-webhook alerts and inbound webhook triggering</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm(BLANK); setEditId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="px-4 py-4 border-b border-border bg-card space-y-3">
          <p className="text-xs font-semibold">{editId ? 'Edit Automation' : 'New Automation'}</p>

          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Automation name (e.g. Daily BTC Report)"
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground" />

          <select value={form.bot_id} onChange={e => setForm(p => ({ ...p, bot_id: e.target.value }))}
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground">
            <option value="">Select a bot…</option>
            {bots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <textarea value={form.task_prompt} onChange={e => setForm(p => ({ ...p, task_prompt: e.target.value }))}
            placeholder="Task: e.g. Scan BTC price and news. Summarize any drops >5% or major events in the last 24h."
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none resize-none min-h-[80px] text-foreground" />

          <div className="grid grid-cols-2 gap-2">
            <select value={form.interval_hours} onChange={e => setForm(p => ({ ...p, interval_hours: Number(e.target.value) }))}
              className="bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground">
              {INTERVALS.map(i => <option key={i.hours} value={i.hours}>{i.label}</option>)}
            </select>
            <input value={form.alert_condition} onChange={e => setForm(p => ({ ...p, alert_condition: e.target.value }))}
              placeholder="Alert if result contains…"
              className="bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground" />
          </div>

          <input value={form.slack_webhook_url} onChange={e => setForm(p => ({ ...p, slack_webhook_url: e.target.value }))}
            placeholder="Legacy Slack Webhook URL (optional)"
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground" />

          <textarea value={form.webhook_urls_text} onChange={e => setForm(p => ({ ...p, webhook_urls_text: e.target.value }))}
            placeholder="Outbound webhook URLs, one per line"
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none resize-none min-h-[70px] text-foreground" />

          <input value={form.telegram_chat_ids_text} onChange={e => setForm(p => ({ ...p, telegram_chat_ids_text: e.target.value }))}
            placeholder="Telegram chat IDs, comma separated"
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground" />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground">
              <input type="checkbox" checked={form.alert_events.includes('trade_execution')} onChange={e => setForm(p => ({ ...p, alert_events: e.target.checked ? [...new Set([...p.alert_events, 'trade_execution'])] : p.alert_events.filter(item => item !== 'trade_execution') }))} />
              Trade execution alerts
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground">
              <input type="checkbox" checked={form.alert_events.includes('performance_threshold')} onChange={e => setForm(p => ({ ...p, alert_events: e.target.checked ? [...new Set([...p.alert_events, 'performance_threshold'])] : p.alert_events.filter(item => item !== 'performance_threshold') }))} />
              Performance threshold alerts
            </label>
          </div>

          <textarea value={form.threshold_rules_text} onChange={e => setForm(p => ({ ...p, threshold_rules_text: e.target.value }))}
            placeholder="Threshold labels, one per line (you can expand these later)"
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none resize-none min-h-[70px] text-foreground" />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={form.inbound_webhook_label} onChange={e => setForm(p => ({ ...p, inbound_webhook_label: e.target.value }))}
              placeholder="Inbound webhook label"
              className="bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground" />
            <input value={form.inbound_webhook_key} onChange={e => setForm(p => ({ ...p, inbound_webhook_key: e.target.value }))}
              placeholder="Inbound webhook secret key"
              className="bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none text-foreground" />
          </div>

          <div className="flex gap-2">
            <button onClick={save} disabled={!form.name || !form.bot_id || !form.task_prompt}
              className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-xs font-semibold disabled:opacity-40">
              {editId ? 'Save Changes' : 'Create Automation'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }}
              className="px-4 py-2 border border-border rounded-xl text-xs text-muted-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-border">
        {[
          { label: 'Total', val: automations.length, color: 'text-foreground' },
          { label: 'Active', val: automations.filter(a => a.status === 'active').length, color: 'text-green-400' },
          { label: 'Total Runs', val: automations.reduce((s, a) => s + (a.run_count || 0), 0), color: 'text-primary' },
        ].map(({ label, val, color }) => (
          <div key={label} className="text-center">
            <p className={`text-lg font-bold ${color}`}>{val}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : automations.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No automations yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Create recurring bot tasks with live web data</p>
          </div>
        ) : automations.map(auto => (
          <div key={auto.id} className={`bg-card border rounded-xl p-4 space-y-3 ${auto.status === 'active' ? 'border-border' : 'border-border/40 opacity-60'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${auto.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-secondary'}`} />
                  <p className="text-sm font-semibold truncate">{auto.name}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Bot className="w-3 h-3" /> {auto.bot_name} · {INTERVALS.find(i => i.hours === auto.interval_hours)?.label || `${auto.interval_hours}h`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {auto.slack_webhook_url && <Zap className="w-3 h-3 text-yellow-400" title="Slack alerts enabled" />}
                {(auto.webhook_urls || []).length > 0 && <LinkIcon className="w-3 h-3 text-blue-400" title="Webhook alerts enabled" />}
                {(auto.telegram_chat_ids || []).length > 0 && <MessageCircle className="w-3 h-3 text-primary" title="Telegram alerts enabled" />}
                {(auto.alert_events || []).length > 0 && <BellRing className="w-3 h-3 text-green-400" title="Alert events configured" />}
                <button onClick={() => startEdit(auto)} className="p-1 text-muted-foreground hover:text-foreground"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => del(auto.id)} className="p-1 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground line-clamp-2">{auto.task_prompt}</p>
            {auto.inbound_webhook_key && (
              <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                <p className="text-[9px] text-muted-foreground">Inbound webhook</p>
                <p className="mt-1 break-all text-[10px] text-foreground/80">botAutomationWebhook → automationId: {auto.id} · webhookKey: {auto.inbound_webhook_key}</p>
              </div>
            )}

            {auto.last_run_result && (
              <div className="bg-secondary rounded-lg px-3 py-2">
                <p className="text-[9px] text-muted-foreground mb-1">Last result · {timeAgo(auto.last_run_at)}</p>
                <p className="text-[10px] text-foreground/80 leading-relaxed line-clamp-3">{auto.last_run_result}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => runNow(auto)} disabled={!!running[auto.id]}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-medium disabled:opacity-40">
                {running[auto.id] ? <><div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" /> Running…</> : <><Play className="w-3 h-3" /> Run Now</>}
              </button>
              <button onClick={() => toggle(auto)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${auto.status === 'active' ? 'border-orange-400/30 text-orange-400 bg-orange-400/5' : 'border-green-400/30 text-green-400 bg-green-400/5'}`}>
                {auto.status === 'active' ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Resume</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}