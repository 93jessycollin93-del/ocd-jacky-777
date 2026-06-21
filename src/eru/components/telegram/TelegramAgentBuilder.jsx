import { Brain, Link2, Settings2, Upload, Wrench } from 'lucide-react';

const MEMORY_PRESETS = [
  { id: 'short', label: 'Short', hint: 'Recent context only' },
  { id: 'medium', label: 'Medium', hint: 'Balanced memory' },
  { id: 'long', label: 'Long', hint: 'Extended context' },
];

const TOOL_MODULES = [
  { id: 'faq', label: 'FAQ replies' },
  { id: 'lead_capture', label: 'Lead capture' },
  { id: 'product_guidance', label: 'Product guidance' },
  { id: 'support_triage', label: 'Support triage' },
  { id: 'scheduling', label: 'Scheduling' },
  { id: 'upsell', label: 'Upsell prompts' },
];

export default function TelegramAgentBuilder({ form, setForm, knowledgeState, onUploadKnowledgeFile, onAddKnowledgeUrl }) {
  const toggleModule = (moduleId) => {
    const active = (form.tool_modules || []).includes(moduleId);
    setForm((prev) => ({
      ...prev,
      tool_modules: active
        ? (prev.tool_modules || []).filter((id) => id !== moduleId)
        : [...(prev.tool_modules || []), moduleId]
    }));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold">AI Agent Builder</p>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">System prompt</label>
        <textarea
          value={form.system_prompt}
          onChange={(e) => setForm((prev) => ({ ...prev, system_prompt: e.target.value }))}
          placeholder="Define the bot's role, tone, rules, and goals"
          className="w-full min-h-[120px] bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">Memory settings</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MEMORY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setForm((prev) => ({ ...prev, memory_retention: preset.id }))}
              className={`rounded-xl border p-3 text-left ${form.memory_retention === preset.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary'}`}
            >
              <p className="text-xs font-medium">{preset.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{preset.hint}</p>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 px-3 py-2.5 bg-secondary border border-border rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.memory_enabled}
              onChange={(e) => setForm((prev) => ({ ...prev, memory_enabled: e.target.checked }))}
              className="accent-primary"
            />
            <span className="text-xs">Enable memory</span>
          </label>
          <input
            type="number"
            min="5"
            max="100"
            value={form.memory_message_limit}
            onChange={(e) => setForm((prev) => ({ ...prev, memory_message_limit: Number(e.target.value || 20) }))}
            placeholder="Message limit"
            className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">Tool modules</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TOOL_MODULES.map((module) => {
            const active = (form.tool_modules || []).includes(module.id);
            return (
              <button
                key={module.id}
                onClick={() => toggleModule(module.id)}
                className={`rounded-xl border px-3 py-2 text-xs text-left ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
              >
                {module.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-background p-3">
        <div className="space-y-3 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">Groups and channels</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={!!form.group_responses_enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, group_responses_enabled: e.target.checked }))}
                className="accent-primary"
              />
              <span>Enable group replies</span>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={!!form.channel_post_responses_enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, channel_post_responses_enabled: e.target.checked }))}
                className="accent-primary"
              />
              <span>Enable channel post replies</span>
            </label>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Reply mode in groups/channels</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'commands_only', label: 'Commands only', hint: 'Respond to slash commands' },
                { id: 'mention_only', label: 'Mention only', hint: 'Respond when tagged' },
                { id: 'always_reply', label: 'Always reply', hint: 'Respond to all visible posts' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, group_response_mode: mode.id }))}
                  className={`rounded-xl border p-3 text-left ${form.group_response_mode === mode.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary'}`}
                >
                  <p className="text-xs font-medium">{mode.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{mode.hint}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">Knowledge training</p>
        </div>
        <p className="text-[11px] text-muted-foreground">Upload PDFs or TXTs, or add a URL. The app will summarize the content, extract key knowledge, and use it to improve bot responses.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-3 text-xs font-medium text-primary">
            <Upload className="w-3.5 h-3.5" />
            {knowledgeState?.uploading ? 'Processing...' : 'Upload PDF or TXT'}
            <input type="file" accept=".pdf,.txt" className="hidden" onChange={onUploadKnowledgeFile} />
          </label>
          <button
            type="button"
            onClick={onAddKnowledgeUrl}
            disabled={knowledgeState?.uploading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3 py-3 text-xs font-medium text-foreground disabled:opacity-50"
          >
            <Link2 className="w-3.5 h-3.5 text-primary" /> Add URL context
          </button>
        </div>
        {knowledgeState?.items?.length > 0 && (
          <div className="space-y-2">
            {knowledgeState.items.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-3">{item.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Agent notes</label>
        <textarea
          value={form.agent_notes || ''}
          onChange={(e) => setForm((prev) => ({ ...prev, agent_notes: e.target.value }))}
          placeholder="Optional notes about brand voice, escalation rules, or constraints"
          className="w-full min-h-[80px] bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none"
        />
      </div>
    </div>
  );
}