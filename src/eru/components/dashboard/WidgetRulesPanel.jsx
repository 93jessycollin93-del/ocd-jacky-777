import { useMemo, useState } from 'react';
import { Plus, Zap, Trash2 } from 'lucide-react';
import { useDashboardEvents } from '@/eru/context/DashboardEventsContext';

const SOURCE_OPTIONS = [
  { value: 'market', label: 'Market Data' },
  { value: 'portfolio', label: 'Portfolio Summary' },
  { value: 'alerts', label: 'Alert Manager' },
  { value: 'analytics', label: 'Analytics' },
];

const EVENT_OPTIONS = [
  { value: 'priceChange', label: 'Price Change' },
  { value: 'refresh', label: 'Refresh' },
  { value: 'thresholdTriggered', label: 'Threshold Triggered' },
];

const TARGET_OPTIONS = [
  { value: 'portfolio', label: 'Portfolio Summary' },
  { value: 'alerts', label: 'Alert Manager' },
  { value: 'analytics', label: 'Analytics' },
];

const ACTION_OPTIONS = [
  { value: 'refresh', label: 'Refresh widget' },
  { value: 'checkThresholds', label: 'Check thresholds' },
  { value: 'highlight', label: 'Highlight update' },
];

export default function WidgetRulesPanel() {
  const { rules, addRule, toggleRule, deleteRule, lastEvent } = useDashboardEvents();
  const [form, setForm] = useState({ source: 'market', event: 'priceChange', target: 'portfolio', action: 'refresh' });

  const manualRules = useMemo(() => rules.filter((rule) => !rule.auto), [rules]);
  const autoRules = useMemo(() => rules.filter((rule) => rule.auto), [rules]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Widget Rules</h3>
        </div>
        {lastEvent && <span className="text-[10px] text-muted-foreground">Last: {lastEvent.source} → {lastEvent.event}</span>}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Auto Sync</p>
        {autoRules.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2">
            <p className="text-xs text-foreground">{rule.source} → {rule.target} · {rule.action}</p>
            <button onClick={() => toggleRule(rule.id)} className={`text-[10px] px-2 py-1 rounded ${rule.enabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {rule.enabled ? 'On' : 'Off'}
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Add Rule</p>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="px-3 py-2 bg-secondary border border-border rounded text-xs text-foreground">
            {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} className="px-3 py-2 bg-secondary border border-border rounded text-xs text-foreground">
            {EVENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="px-3 py-2 bg-secondary border border-border rounded text-xs text-foreground">
            {TARGET_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} className="px-3 py-2 bg-secondary border border-border rounded text-xs text-foreground">
            {ACTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <button onClick={() => addRule(form)} className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded text-xs font-medium">
          <Plus className="w-3 h-3" /> Add Rule
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Custom Rules</p>
        {manualRules.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No custom rules yet.</p>
        ) : manualRules.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2 gap-2">
            <div className="min-w-0">
              <p className="text-xs text-foreground truncate">{rule.source} · {rule.event} → {rule.target}</p>
              <p className="text-[10px] text-muted-foreground">Action: {rule.action}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => toggleRule(rule.id)} className={`text-[10px] px-2 py-1 rounded ${rule.enabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {rule.enabled ? 'On' : 'Off'}
              </button>
              <button onClick={() => deleteRule(rule.id)} className="p-1.5 rounded hover:bg-red-500/10">
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}