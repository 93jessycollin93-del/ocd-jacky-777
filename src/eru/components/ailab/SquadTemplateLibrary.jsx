import { CopyPlus, Library, Network, Sparkles, Trash2, Users } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

export default function SquadTemplateLibrary({ templates, starterTemplates = [], onClone, onApplyStarter, onRefresh }) {
  const removeTemplate = async (templateId) => {
    await base44.entities.SquadTemplate.delete(templateId);
    onRefresh?.();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Library className="w-4 h-4 text-primary" />
        <div>
          <p className="text-xs font-semibold text-foreground">Squad template library</p>
          <p className="text-[10px] text-muted-foreground">Reuse successful squad setups in new projects.</p>
        </div>
      </div>

      {starterTemplates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Starter templates</p>
          </div>
          {starterTemplates.map((template) => (
            <div key={template.id} className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{template.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{template.description}</p>
              </div>
              <button onClick={() => onApplyStarter?.(template)} className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-background px-2.5 py-1.5 text-[10px] font-medium text-primary">
                <CopyPlus className="w-3 h-3" /> Apply
              </button>
            </div>
          ))}
        </div>
      )}

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No templates saved yet.</div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div key={template.id} className="rounded-xl border border-border bg-background p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{template.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{template.description || 'No description'}</p>
                  <p className="mt-1 text-[10px] text-primary">From: {template.source_squad_name || 'Custom template'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onClone(template)} className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-[10px] font-medium text-primary">
                    <CopyPlus className="w-3 h-3" /> Use
                  </button>
                  <button onClick={() => removeTemplate(template.id)} className="text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-1 text-muted-foreground">
                  <Users className="w-3 h-3" /> {(template.member_bot_ids || []).length + (template.master_bot_id ? 1 : 0)} bots
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-1 text-muted-foreground">
                  <Network className="w-3 h-3" /> {(template.pipeline_steps || []).length} pipeline steps
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-1 text-muted-foreground">
                  {(template.task_groups || []).length} task groups
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}