import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Globe, Plus } from 'lucide-react';
import WebsiteGeneratorProjectList from './WebsiteGeneratorProjectList';
import WebsiteGeneratorForm from './WebsiteGeneratorForm';
import WebsiteGeneratorEditor from './WebsiteGeneratorEditor';

const EMPTY_FORM = {
  name: '',
  description: '',
  project_type: 'landing_page',
  prompt: '',
  target_audience: '',
  style_direction: '',
  notes: '',
};

export default function WebsiteGeneratorPanel() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [lastSavedProjectId, setLastSavedProjectId] = useState(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({
      name: selectedProject.name || '',
      description: selectedProject.description || '',
      project_type: selectedProject.project_type || 'landing_page',
      prompt: selectedProject.prompt || '',
      target_audience: selectedProject.target_audience || '',
      style_direction: selectedProject.style_direction || '',
      notes: selectedProject.notes || '',
    });
  }, [selectedProject]);

  const loadProjects = async () => {
    setLoading(true);
    const rows = await base44.entities.WebsiteGeneratorProject.list('-updated_date', 100).catch(() => []);
    setProjects(rows);
    if (selectedProjectId && !rows.some((row) => row.id === selectedProjectId)) {
      setSelectedProjectId(rows[0]?.id || null);
    } else if (!selectedProjectId && rows[0]) {
      setSelectedProjectId(rows[0].id);
    }
    setLoading(false);
  };

  const handleNew = () => {
    setSelectedProjectId(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    let savedProjectId = selectedProjectId;
    if (selectedProjectId) {
      await base44.entities.WebsiteGeneratorProject.update(selectedProjectId, {
        ...form,
        status: selectedProject?.status || 'draft',
        site_blueprint: selectedProject?.site_blueprint || undefined,
        generated_copy: selectedProject?.generated_copy || undefined,
      });
    } else {
      const created = await base44.entities.WebsiteGeneratorProject.create({
        ...form,
        status: 'draft',
      });
      savedProjectId = created.id;
      setSelectedProjectId(created.id);
    }
    setLastSavedProjectId(savedProjectId || null);
    await loadProjects();
    setSaving(false);
  };

  const handleGenerate = async () => {
    if (!form.name.trim()) return;
    setGenerating(true);
    let savedProjectId = selectedProjectId;
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are generating a structured website system for an integrated website generator inside ERU.
Return a clean website blueprint with reusable sections and page structure.
Support these site types: landing_page, business_site, portfolio.
Support these pages when relevant: Home, About, Services, Contact.
Support these reusable sections when relevant: Hero, Features, About, Testimonials, Pricing, FAQ, CTA, Contact, Footer.
Every page must be section-based and editable.
Do not output random HTML.
Project name: ${form.name}
Project type: ${form.project_type}
Description: ${form.description}
Target audience: ${form.target_audience}
Style direction: ${form.style_direction}
Prompt: ${form.prompt}
Notes: ${form.notes}`,
      response_json_schema: {
        type: 'object',
        properties: {
          site_blueprint: {
            type: 'object',
            properties: {
              site_name: { type: 'string' },
              site_type: { type: 'string' },
              tone: { type: 'string' },
              cta_direction: { type: 'string' },
              site_summary: { type: 'string' },
              navigation: { type: 'array', items: { type: 'string' } },
              pages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    page_name: { type: 'string' },
                    page_type: { type: 'string' },
                    slug: { type: 'string' },
                    page_goal: { type: 'string' },
                    sections: { type: 'array', items: { type: 'string' } }
                  }
                }
              },
              reusable_sections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    section_type: { type: 'string' },
                    title: { type: 'string' },
                    subtitle: { type: 'string' },
                    cta_label: { type: 'string' },
                    items: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          },
          generated_copy: {
            type: 'object',
            properties: {
              headline: { type: 'string' },
              subheadline: { type: 'string' },
              value_points: { type: 'array', items: { type: 'string' } },
              about_intro: { type: 'string' },
              services_intro: { type: 'string' },
              contact_intro: { type: 'string' }
            }
          }
        }
      }
    });

    if (selectedProjectId) {
      await base44.entities.WebsiteGeneratorProject.update(selectedProjectId, {
        ...form,
        status: 'generated',
        site_blueprint: result.site_blueprint,
        generated_copy: result.generated_copy,
      });
    } else {
      const created = await base44.entities.WebsiteGeneratorProject.create({
        ...form,
        status: 'generated',
        site_blueprint: result.site_blueprint,
        generated_copy: result.generated_copy,
      });
      savedProjectId = created.id;
      setSelectedProjectId(created.id);
    }

    setLastSavedProjectId(savedProjectId || null);
    await loadProjects();
    setGenerating(false);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Website Generator</h3>
            <p className="text-xs text-muted-foreground">Create, save, reopen, and refine website systems directly inside ERU with structured editing and persistent themes.</p>
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full bg-secondary px-2.5 py-1">Saved projects</span>
              <span className="rounded-full bg-secondary px-2.5 py-1">Live preview</span>
              <span className="rounded-full bg-secondary px-2.5 py-1">Theme inheritance</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedProject && (
              <span className="rounded-full bg-secondary px-3 py-1.5 text-[11px] text-muted-foreground">
                Editing: {selectedProject.name}
              </span>
            )}
            {lastSavedProjectId && lastSavedProjectId === selectedProjectId && (
              <span className="rounded-full bg-primary/10 px-3 py-1.5 text-[11px] text-primary">
                Saved
              </span>
            )}
            <button onClick={handleNew} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <WebsiteGeneratorProjectList
          projects={projects}
          loading={loading}
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
          onCreateNew={handleNew}
        />

        <div className="space-y-4">
          <WebsiteGeneratorForm
            form={form}
            modeLabel={selectedProjectId ? 'Edit Website Project' : 'Create New Website'}
            saving={saving}
            generating={generating}
            onChange={handleFieldChange}
            onSaveDraft={handleSaveDraft}
            onGenerate={handleGenerate}
          />
          <WebsiteGeneratorEditor project={selectedProject} onSaved={loadProjects} />
        </div>
      </div>
    </div>
  );
}