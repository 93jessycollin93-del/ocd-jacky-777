import { FileText, Loader2, Palette, Save, Sparkles, Users } from 'lucide-react';

const PROJECT_TYPES = [
  { id: 'landing_page', label: 'Landing Page' },
  { id: 'business_site', label: 'Business Site' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'storefront', label: 'Storefront' },
  { id: 'custom', label: 'Custom' },
];

export default function WebsiteGeneratorForm({ form, modeLabel, saving, generating, onChange, onSaveDraft, onGenerate }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{modeLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">Start from a prompt or guided fields, then save the project inside ERU.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Project Name</label>
          <input value={form.name} onChange={(e) => onChange('name', e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none" placeholder="Website project name" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Project Type</label>
          <select value={form.project_type} onChange={(e) => onChange('project_type', e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none">
            {PROJECT_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/40 p-3">
        <p className="text-[11px] font-semibold text-foreground">Structured output</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Generation includes Home, About, Services, Contact plus reusable Hero, Features, CTA, FAQ, and Footer sections when they fit the brief.</p>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Description</label>
        <textarea value={form.description} onChange={(e) => onChange('description', e.target.value)} className="min-h-[80px] w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none resize-none" placeholder="What is this website for?" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Target Audience</label>
          <input value={form.target_audience} onChange={(e) => onChange('target_audience', e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none" placeholder="Who is this for?" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1"><Palette className="w-3 h-3" /> Style Direction</label>
          <input value={form.style_direction} onChange={(e) => onChange('style_direction', e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none" placeholder="Modern, minimal, bold..." />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Create New Website Prompt</label>
        <textarea value={form.prompt} onChange={(e) => onChange('prompt', e.target.value)} className="min-h-[110px] w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none resize-none" placeholder="Describe the website you want to generate..." />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Notes</label>
        <textarea value={form.notes} onChange={(e) => onChange('notes', e.target.value)} className="min-h-[80px] w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none resize-none" placeholder="Optional internal notes" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={onSaveDraft} disabled={!form.name.trim() || saving} className="flex-1 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-foreground disabled:opacity-40 inline-flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
        </button>
        <button onClick={onGenerate} disabled={!form.name.trim() || generating} className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40 inline-flex items-center justify-center gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate First Draft
        </button>
      </div>
    </div>
  );
}