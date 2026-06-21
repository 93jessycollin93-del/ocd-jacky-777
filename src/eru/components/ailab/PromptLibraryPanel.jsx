import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { BookCopy, RotateCcw, Save, Sparkles, Trash2, Wand2, Loader2 } from 'lucide-react';
import { invokeSelectedModel } from './modelRouting';

const EMPTY_VARIABLE = { key: '', label: '', default_value: '', required: false };
const EMPTY_FORM = { name: '', description: '', content: '', variables: [], linked_bot_ids: [] };

function applyVariables(content, variables, runtimeValues = {}) {
  return (content || '').replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => runtimeValues[key] ?? variables.find((item) => item.key === key)?.default_value ?? `{{${key}}}`);
}

export default function PromptLibraryPanel({ bots, onBotsUpdated }) {
  const [templates, setTemplates] = useState([]);
  const [versions, setVersions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [draftVariable, setDraftVariable] = useState(EMPTY_VARIABLE);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [architectLoading, setArchitectLoading] = useState(false);
  const [architectError, setArchitectError] = useState('');

  const load = async () => {
    const [templateRows, versionRows] = await Promise.all([
      base44.entities.PromptTemplate.list('-updated_date', 100),
      base44.entities.PromptTemplateVersion.list('-created_date', 200),
    ]);
    setTemplates(templateRows);
    setVersions(versionRows);
  };

  useEffect(() => { load(); }, []);

  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId);
  const templateVersions = versions.filter((item) => item.template_id === selectedTemplateId);
  const preview = useMemo(() => applyVariables(form.content, form.variables), [form]);

  const addVariable = () => {
    if (!draftVariable.key.trim()) return;
    setForm((prev) => ({ ...prev, variables: [...prev.variables, draftVariable] }));
    setDraftVariable(EMPTY_VARIABLE);
  };

  const saveTemplate = async () => {
    if (!form.name.trim() || !form.content.trim()) return;
    const created = await base44.entities.PromptTemplate.create({
      ...form,
      current_version: 1,
      is_active: true,
    });
    await base44.entities.PromptTemplateVersion.create({
      template_id: created.id,
      template_name: form.name,
      version_number: 1,
      content: form.content,
      variables: form.variables,
      notes: 'Initial version',
    });
    setForm(EMPTY_FORM);
    load();
  };

  const saveNewVersion = async (template) => {
    const nextVersion = (template.current_version || 1) + 1;
    await base44.entities.PromptTemplateVersion.create({
      template_id: template.id,
      template_name: template.name,
      version_number: nextVersion,
      content: template.content,
      variables: template.variables || [],
      notes: `Saved from library on version ${nextVersion}`,
    });
    await base44.entities.PromptTemplate.update(template.id, { current_version: nextVersion });
    load();
  };

  const rollbackVersion = async (version) => {
    await base44.entities.PromptTemplate.update(version.template_id, {
      content: version.content,
      variables: version.variables,
      current_version: version.version_number,
    });
    load();
  };

  const removeTemplate = async (id) => {
    await base44.entities.PromptTemplate.delete(id);
    setSelectedTemplateId('');
    load();
  };

  const improveSelectedTemplate = async () => {
    if (!selectedTemplate) return;
    setArchitectLoading(true);
    setArchitectError('');

    const linkedBots = (bots || []).filter((bot) => (selectedTemplate.linked_bot_ids || []).includes(bot.id));
    const primaryBot = linkedBots[0];

    const prompt = `You are an AI prompt architect refining a reusable bot prompt template.
Return ONLY JSON with keys: content, description, notes.

Template name: ${selectedTemplate.name}
Template description: ${selectedTemplate.description || 'None'}
Current content: ${selectedTemplate.content || ''}
Current variables: ${JSON.stringify(selectedTemplate.variables || [])}
Linked bot role: ${primaryBot?.role || 'assistant'}
Linked bot personality: ${primaryBot?.personality || 'None'}
Linked bot instructions: ${primaryBot?.instructions || 'None'}
Linked bot model provider: ${primaryBot?.model_provider || 'base44'}
Linked bot model: ${primaryBot?.model_name || 'automatic'}

Improve the template for clarity, stronger behavioral alignment, and better prompt effectiveness while preserving the original intent.`;

    try {
      const response = await invokeSelectedModel({
        provider: primaryBot?.model_provider || 'base44',
        model: primaryBot?.model_name || 'automatic',
        prompt,
      });
      const parsed = JSON.parse(response.trim().slice(response.indexOf('{'), response.lastIndexOf('}') + 1));
      await base44.entities.PromptTemplate.update(selectedTemplate.id, {
        content: parsed.content || selectedTemplate.content,
        description: parsed.description || selectedTemplate.description,
      });
      await saveNewVersion({
        ...selectedTemplate,
        content: parsed.content || selectedTemplate.content,
        variables: selectedTemplate.variables || [],
        current_version: selectedTemplate.current_version,
      });
      onBotsUpdated?.();
    } catch (error) {
      setArchitectError(error.message || 'Unable to improve this template right now.');
    }

    setArchitectLoading(false);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <BookCopy className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Prompt Library</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Save reusable prompts, version them, and define template variables like {'{{user_name}}'} and {'{{context}}'} for multiple bots.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground">New template</p>
        <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Template name" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
        <input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Short description" className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
        <textarea value={form.content} onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))} placeholder="Write your prompt template here..." className="min-h-[140px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />

        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <p className="text-[11px] font-semibold text-foreground">Template variables</p>
          <div className="grid gap-2 md:grid-cols-4">
            <input value={draftVariable.key} onChange={(e) => setDraftVariable((prev) => ({ ...prev, key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))} placeholder="key" className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
            <input value={draftVariable.label} onChange={(e) => setDraftVariable((prev) => ({ ...prev, label: e.target.value }))} placeholder="label" className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
            <input value={draftVariable.default_value} onChange={(e) => setDraftVariable((prev) => ({ ...prev, default_value: e.target.value }))} placeholder="default value" className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground outline-none" />
            <button onClick={addVariable} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Add variable</button>
          </div>
          <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={draftVariable.required} onChange={(e) => setDraftVariable((prev) => ({ ...prev, required: e.target.checked }))} className="accent-primary" /> Required variable
          </label>
          <div className="flex flex-wrap gap-2">
            {form.variables.map((item) => (
              <span key={item.key} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary">{`{{${item.key}}}`} {item.default_value ? `· ${item.default_value}` : ''}</span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <p className="text-[11px] font-semibold text-foreground">Link to bots</p>
          <div className="flex flex-wrap gap-2">
            {(bots || []).map((bot) => {
              const selected = form.linked_bot_ids.includes(bot.id);
              return (
                <button key={bot.id} onClick={() => setForm((prev) => ({ ...prev, linked_bot_ids: selected ? prev.linked_bot_ids.filter((id) => id !== bot.id) : [...prev.linked_bot_ids, bot.id] }))} className={`rounded-full border px-2 py-1 text-[10px] ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}>
                  {bot.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[11px] font-semibold text-foreground mb-2">Preview</p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{preview || 'Preview will appear here.'}</p>
        </div>

        <button onClick={saveTemplate} disabled={!form.name || !form.content} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">
          <Save className="w-3.5 h-3.5" /> Save template
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">Saved templates</p>
          {templates.map((template) => (
            <button key={template.id} onClick={() => setSelectedTemplateId(template.id)} className={`w-full rounded-xl border px-3 py-3 text-left ${selectedTemplateId === template.id ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">{template.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">v{template.current_version || 1} · {(template.variables || []).length} variables · {(template.linked_bot_ids || []).length} bots</p>
                </div>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            </button>
          ))}
          {templates.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No prompt templates yet.</div>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">Version history</p>
          {selectedTemplate ? (
            <>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => saveNewVersion(selectedTemplate)} className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                  <Save className="w-3.5 h-3.5" /> New version
                </button>
                <button onClick={improveSelectedTemplate} disabled={architectLoading} className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40">
                  {architectLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Improving</> : <><Wand2 className="w-3.5 h-3.5" /> AI improve</>}
                </button>
                <button onClick={() => removeTemplate(selectedTemplate.id)} className="inline-flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
              {architectError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {architectError}
                </div>
              )}
              {templateVersions.map((version) => (
                <div key={version.id} className="rounded-xl border border-border bg-background p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">Version {version.version_number}</p>
                    <button onClick={() => rollbackVersion(version)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                      <RotateCcw className="w-3 h-3" /> Roll back
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground whitespace-pre-wrap line-clamp-4">{version.content}</p>
                </div>
              ))}
              {templateVersions.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No versions yet.</div>}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Select a template to view versions.</div>
          )}
        </div>
      </div>
    </div>
  );
}