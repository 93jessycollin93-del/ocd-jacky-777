import { useMemo } from 'react';
import { Database, Link2, Plus, Trash2 } from 'lucide-react';

const SERVICE_OPTIONS = [
  { value: 'googlesheets', label: 'Google Sheets' },
  { value: 'airtable', label: 'Airtable' },
  { value: 'salesforce', label: 'Salesforce' },
];

const MODE_OPTIONS = [
  { value: 'app_user', label: 'Each user connects' },
  { value: 'shared', label: 'Shared account' },
];

const ACCESS_OPTIONS = [
  { value: 'read', label: 'Read only' },
  { value: 'write', label: 'Write only' },
  { value: 'read_write', label: 'Read & write' },
];

const CONNECTOR_OPTIONS = {
  googlesheets: ['sheets'],
  airtable: ['airtable'],
  salesforce: ['sales force'],
};

const EMPTY_SOURCE = {
  service: 'googlesheets',
  mode: 'app_user',
  connector_name: 'sheets',
  resource_label: '',
  resource_id: '',
  sheet_name: '',
  access_level: 'read',
  notes: '',
};

export default function BotDataSourcesPanel({ value = [], onChange }) {
  const sources = Array.isArray(value) ? value : [];

  const addSource = () => {
    onChange([
      ...sources,
      EMPTY_SOURCE,
    ]);
  };

  const updateSource = (index, patch) => {
    onChange(sources.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const removeSource = (index) => {
    onChange(sources.filter((_, itemIndex) => itemIndex !== index));
  };

  const summary = useMemo(() => {
    if (!sources.length) return 'No external data sources connected yet.';
    return `${sources.length} source${sources.length === 1 ? '' : 's'} configured for this bot.`;
  }, [sources]);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-primary" />
        <div>
          <p className="text-xs font-semibold text-foreground">External data sources</p>
          <p className="text-[10px] text-muted-foreground">Let bots use Google Sheets, Airtable, and Salesforce through shared or per-user connections.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background px-3 py-2 text-[11px] text-muted-foreground">
        {summary}
      </div>

      <div className="space-y-3">
        {sources.map((source, index) => {
          const connectorChoices = CONNECTOR_OPTIONS[source.service] || [];
          return (
            <div key={`${source.service}-${index}`} className="rounded-xl border border-border bg-background p-3 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <select value={source.service} onChange={(e) => updateSource(index, { service: e.target.value, connector_name: (CONNECTOR_OPTIONS[e.target.value] || [''])[0] || '', resource_id: '', resource_label: '', sheet_name: '' })} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
                  {SERVICE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select value={source.mode} onChange={(e) => updateSource(index, { mode: e.target.value })} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
                  {MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <select value={source.connector_name} onChange={(e) => updateSource(index, { connector_name: e.target.value })} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
                  {connectorChoices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
                </select>
                <select value={source.access_level} onChange={(e) => updateSource(index, { access_level: e.target.value })} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none">
                  {ACCESS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>

              <input value={source.resource_label || ''} onChange={(e) => updateSource(index, { resource_label: e.target.value })} placeholder={source.service === 'googlesheets' ? 'Spreadsheet label' : source.service === 'airtable' ? 'Base label' : 'Object label'} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
              <input value={source.resource_id || ''} onChange={(e) => updateSource(index, { resource_id: e.target.value })} placeholder={source.service === 'googlesheets' ? 'Spreadsheet ID' : source.service === 'airtable' ? 'Base or table ID' : 'Object API name'} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
              {source.service === 'googlesheets' && (
                <input value={source.sheet_name || ''} onChange={(e) => updateSource(index, { sheet_name: e.target.value })} placeholder="Sheet tab name" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
              )}
              <textarea value={source.notes || ''} onChange={(e) => updateSource(index, { notes: e.target.value })} placeholder="Optional notes for how the bot should use this source" className="min-h-[72px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />

              <div className="flex justify-end">
                <button onClick={() => removeSource(index)} className="inline-flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                  <Trash2 className="w-3.5 h-3.5" /> Remove source
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={addSource} className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
        <Plus className="w-3.5 h-3.5" /> Add data source
      </button>

      <div className="rounded-xl border border-border bg-background p-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <Link2 className="w-3.5 h-3.5 text-primary" /> Connection modes
        </div>
        <p className="mt-1">Use “Each user connects” when bots should work with each user’s own accounts, or “Shared account” when all users should use one shared integration.</p>
      </div>
    </div>
  );
}