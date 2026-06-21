import { useEffect, useMemo, useState } from 'react';
import { LayoutTemplate, Save } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import WebsiteGeneratorLivePreview from './WebsiteGeneratorLivePreview';
import WebsiteGeneratorSectionActions from './WebsiteGeneratorSectionActions';
import WebsiteGeneratorThemeControls from './WebsiteGeneratorThemeControls';
import WebsiteGeneratorExportPanel from './WebsiteGeneratorExportPanel';
import WebsiteGeneratorCodeInjectionPanel from './WebsiteGeneratorCodeInjectionPanel';
import { DEFAULT_THEME_SETTINGS, getSafeThemeSettings } from './websiteThemeUtils';

function updatePage(pages, pageIndex, updater) {
  return pages.map((page, index) => index === pageIndex ? updater(page) : page);
}

function updateSection(sections, sectionIndex, updater) {
  return sections.map((section, index) => index === sectionIndex ? updater(section) : section);
}

export default function WebsiteGeneratorEditor({ project, onSaved }) {
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activePageType, setActivePageType] = useState('home');
  const [previewMode, setPreviewMode] = useState('desktop');
  const [selectedSectionType, setSelectedSectionType] = useState(null);
  const [editorTab, setEditorTab] = useState('content');

  useEffect(() => {
    if (!project?.site_blueprint) {
      setDraft(null);
      return;
    }
    setDraft({
      site_blueprint: project.site_blueprint,
      generated_copy: project.generated_copy || {},
      theme_settings: getSafeThemeSettings(project.theme_settings || DEFAULT_THEME_SETTINGS),
      code_injection: project.code_injection || {},
    });
    setActivePageType(project.site_blueprint.pages?.[0]?.page_type || 'home');
    setSelectedSectionType(project.site_blueprint.pages?.[0]?.sections?.[0] || null);
  }, [project]);

  const hasData = useMemo(() => Boolean(draft?.site_blueprint), [draft]);

  const handlePageGoalChange = (pageIndex, value) => {
    setDraft((prev) => ({
      ...prev,
      site_blueprint: {
        ...prev.site_blueprint,
        pages: updatePage(prev.site_blueprint.pages || [], pageIndex, (page) => ({ ...page, page_goal: value })),
      },
    }));
  };

  const handlePageSectionsChange = (pageIndex, value) => {
    const sections = value.split(',').map((item) => item.trim()).filter(Boolean);
    setDraft((prev) => ({
      ...prev,
      site_blueprint: {
        ...prev.site_blueprint,
        pages: updatePage(prev.site_blueprint.pages || [], pageIndex, (page) => ({ ...page, sections })),
      },
    }));
  };

  const handleSectionFieldChange = (sectionIndex, field, value) => {
    setDraft((prev) => ({
      ...prev,
      site_blueprint: {
        ...prev.site_blueprint,
        reusable_sections: updateSection(prev.site_blueprint.reusable_sections || [], sectionIndex, (section) => ({ ...section, [field]: value })),
      },
    }));
  };

  const handleSectionItemsChange = (sectionIndex, value) => {
    const items = value.split('\n').map((item) => item.trim()).filter(Boolean);
    setDraft((prev) => ({
      ...prev,
      site_blueprint: {
        ...prev.site_blueprint,
        reusable_sections: updateSection(prev.site_blueprint.reusable_sections || [], sectionIndex, (section) => ({ ...section, items })),
      },
    }));
  };

  const handleCopyFieldChange = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      generated_copy: {
        ...prev.generated_copy,
        [field]: value,
      },
    }));
  };

  const setNestedValue = (obj, path, value) => {
    const keys = path.split('.');
    const next = { ...obj };
    let current = next;
    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        current[key] = value;
        return;
      }
      current[key] = { ...(current[key] || {}) };
      current = current[key];
    });
    return next;
  };

  const handleThemeChange = (scope, key, value) => {
    setDraft((prev) => {
      const safe = getSafeThemeSettings(prev.theme_settings || DEFAULT_THEME_SETTINGS);
      const nextTheme = { ...safe };
      if (scope === 'global') {
        nextTheme.global = setNestedValue(nextTheme.global, key, value);
      }
      if (scope === 'page' && activePage?.page_type) {
        nextTheme.page_overrides = {
          ...nextTheme.page_overrides,
          [activePage.page_type]: setNestedValue(nextTheme.page_overrides?.[activePage.page_type] || {}, key, value),
        };
      }
      if (scope === 'section' && activePage?.page_type && selectedSectionType) {
        const sectionKey = `${activePage.page_type}:${selectedSectionType}`;
        nextTheme.section_overrides = {
          ...nextTheme.section_overrides,
          [sectionKey]: setNestedValue(nextTheme.section_overrides?.[sectionKey] || {}, key, value),
        };
      }
      return {
        ...prev,
        theme_settings: nextTheme,
      };
    });
  };

  const handleCodeInjectionChange = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      code_injection: {
        ...(prev.code_injection || {}),
        [field]: value,
      },
    }));
  };

  const activePage = draft?.site_blueprint?.pages?.find((page) => page.page_type === activePageType) || draft?.site_blueprint?.pages?.[0];
  const pageIndex = (draft?.site_blueprint?.pages || []).findIndex((page) => page.page_type === activePage?.page_type);
  const activeSectionIndex = (draft?.site_blueprint?.reusable_sections || []).findIndex((section) => section.section_type === selectedSectionType);
  const activeSection = activeSectionIndex >= 0 ? draft?.site_blueprint?.reusable_sections?.[activeSectionIndex] : null;

  const moveSection = (direction) => {
    if (!activePage || !selectedSectionType) return;
    const currentIndex = (activePage.sections || []).findIndex((section) => section === selectedSectionType);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= activePage.sections.length) return;

    const nextSections = [...activePage.sections];
    [nextSections[currentIndex], nextSections[targetIndex]] = [nextSections[targetIndex], nextSections[currentIndex]];

    setDraft((prev) => ({
      ...prev,
      site_blueprint: {
        ...prev.site_blueprint,
        pages: prev.site_blueprint.pages.map((page) => page.page_type === activePage.page_type ? { ...page, sections: nextSections } : page),
      },
    }));
  };

  const handlePreviewTextChange = (field, value) => {
    if (!activeSection) return;
    handleSectionFieldChange(activeSectionIndex, field, value);
  };

  const duplicateSection = () => {
    if (!activePage || !activeSection) return;
    const duplicatedType = `${activeSection.section_type}_${Date.now()}`;
    const duplicatedSection = { ...activeSection, section_type: duplicatedType };
    const insertIndex = (activePage.sections || []).findIndex((section) => section === selectedSectionType) + 1;
    const nextPageSections = [...(activePage.sections || [])];
    nextPageSections.splice(insertIndex, 0, duplicatedType);

    setDraft((prev) => ({
      ...prev,
      site_blueprint: {
        ...prev.site_blueprint,
        pages: prev.site_blueprint.pages.map((page) => page.page_type === activePage.page_type ? { ...page, sections: nextPageSections } : page),
        reusable_sections: [...(prev.site_blueprint.reusable_sections || []), duplicatedSection],
      },
    }));
    setSelectedSectionType(duplicatedType);
  };

  const deleteSection = () => {
    if (!activePage || !activeSection) return;
    const nextPageSections = (activePage.sections || []).filter((section) => section !== selectedSectionType);

    setDraft((prev) => ({
      ...prev,
      site_blueprint: {
        ...prev.site_blueprint,
        pages: prev.site_blueprint.pages.map((page) => page.page_type === activePage.page_type ? { ...page, sections: nextPageSections } : page),
        reusable_sections: (prev.site_blueprint.reusable_sections || []).filter((section) => section.section_type !== selectedSectionType),
      },
    }));
    setSelectedSectionType(nextPageSections[0] || null);
  };

  const regenerateSection = async () => {
    if (!project?.id || !activeSection || !activePage) return;
    setRegenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Regenerate one reusable website section for an ERU website generator project.
Project name: ${project.name}
Project description: ${project.description}
Site type: ${draft.site_blueprint.site_type}
Tone: ${draft.site_blueprint.tone}
CTA direction: ${draft.site_blueprint.cta_direction}
Page: ${activePage.page_name}
Section type: ${activeSection.section_type}
Current title: ${activeSection.title}
Current subtitle: ${activeSection.subtitle}
Current items: ${(activeSection.items || []).join(', ')}`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          subtitle: { type: 'string' },
          cta_label: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    setDraft((prev) => ({
      ...prev,
      site_blueprint: {
        ...prev.site_blueprint,
        reusable_sections: updateSection(prev.site_blueprint.reusable_sections || [], activeSectionIndex, (section) => ({ ...section, ...result })),
      },
    }));
    setRegenerating(false);
  };

  const handleSave = async () => {
    if (!project?.id || !draft) return;
    setSaving(true);
    await base44.entities.WebsiteGeneratorProject.update(project.id, {
      site_blueprint: draft.site_blueprint,
      generated_copy: draft.generated_copy,
      theme_settings: draft.theme_settings,
      code_injection: draft.code_injection,
    });
    setSaving(false);
    onSaved?.();
  };

  if (!hasData) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold">Website Generator Engine</p>
          <p className="text-[11px] text-muted-foreground">Edit pages, reusable sections, and theme layers directly from the generated blueprint.</p>
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-full bg-secondary px-2.5 py-1">{draft.site_blueprint.pages?.length || 0} pages</span>
            <span className="rounded-full bg-secondary px-2.5 py-1">{draft.site_blueprint.reusable_sections?.length || 0} sections</span>
            <span className="rounded-full bg-secondary px-2.5 py-1">{previewMode} preview</span>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">
          <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Structure'}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_360px]">
        <aside className="rounded-2xl border border-border bg-card p-3 space-y-3 h-fit xl:sticky xl:top-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Pages</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Switch between generated website pages.</p>
          </div>
          <div className="space-y-2">
            {(draft.site_blueprint.pages || []).map((page, index) => (
              <button
                key={`${page.page_type}-${index}`}
                onClick={() => {
                  setActivePageType(page.page_type);
                  setSelectedSectionType(page.sections?.[0] || null);
                }}
                className={`w-full rounded-xl p-3 text-left transition-colors ${activePageType === page.page_type ? 'border border-primary bg-primary/10' : 'border border-border bg-secondary'}`}
              >
                <p className="text-sm font-semibold text-foreground">{page.page_name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">/{page.slug}</p>
              </button>
            ))}
          </div>
          {activePage && (
            <div className="rounded-xl bg-secondary p-3 space-y-2">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
                <label className="text-[11px] text-muted-foreground">Page goal</label>
              </div>
              <textarea value={activePage.page_goal || ''} onChange={(e) => handlePageGoalChange(pageIndex, e.target.value)} className="min-h-[88px] w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none resize-none" />
            </div>
          )}
        </aside>

        <div className="min-w-0">
          <WebsiteGeneratorLivePreview
            pages={draft.site_blueprint.pages || []}
            sections={draft.site_blueprint.reusable_sections || []}
            themeSettings={draft.theme_settings}
            activePageType={activePageType}
            previewMode={previewMode}
            selectedSectionType={selectedSectionType}
            onPageChange={(pageType) => {
              setActivePageType(pageType);
              const page = (draft.site_blueprint.pages || []).find((item) => item.page_type === pageType);
              setSelectedSectionType(page?.sections?.[0] || null);
            }}
            onModeChange={setPreviewMode}
            onSelectSection={setSelectedSectionType}
          />
        </div>

        <aside className="rounded-2xl border border-border bg-card p-3 space-y-4 h-fit xl:sticky xl:top-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Section Editor</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Edit the selected section without leaving the preview.</p>
          </div>

          {activeSection ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground capitalize break-all">{activeSection.section_type}</p>
              </div>

              <WebsiteGeneratorSectionActions
                onMoveUp={() => moveSection('up')}
                onMoveDown={() => moveSection('down')}
                onDuplicate={duplicateSection}
                onDelete={deleteSection}
                onRegenerate={regenerateSection}
                disableUp={(activePage?.sections || []).findIndex((section) => section === selectedSectionType) <= 0}
                disableDown={(activePage?.sections || []).findIndex((section) => section === selectedSectionType) >= (activePage?.sections || []).length - 1}
              />

              <div className="flex gap-1 rounded-xl bg-secondary p-1">
                <button onClick={() => setEditorTab('content')} className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-semibold ${editorTab === 'content' ? 'bg-card text-foreground' : 'text-muted-foreground'}`}>Content</button>
                <button onClick={() => setEditorTab('theme')} className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-semibold ${editorTab === 'theme' ? 'bg-card text-foreground' : 'text-muted-foreground'}`}>Theme</button>
                <button onClick={() => setEditorTab('settings')} className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-semibold ${editorTab === 'settings' ? 'bg-card text-foreground' : 'text-muted-foreground'}`}>Settings</button>
              </div>

              {editorTab === 'content' ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Headline / Title</label>
                    <input value={activeSection.title || ''} onChange={(e) => handlePreviewTextChange('title', e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Body text / Subtitle</label>
                    <textarea value={activeSection.subtitle || ''} onChange={(e) => handlePreviewTextChange('subtitle', e.target.value)} className="min-h-[96px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs outline-none resize-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">CTA text</label>
                    <input value={activeSection.cta_label || ''} onChange={(e) => handlePreviewTextChange('cta_label', e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">List items</label>
                    <textarea value={(activeSection.items || []).join('\n')} onChange={(e) => handleSectionItemsChange(activeSectionIndex, e.target.value)} className="min-h-[120px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs outline-none resize-none" />
                  </div>
                </div>
              ) : editorTab === 'theme' ? (
                <div className="space-y-4">
                  <WebsiteGeneratorThemeControls
                    scopeLabel="Global Theme"
                    values={draft.theme_settings?.global}
                    onChange={(key, value) => handleThemeChange('global', key, value)}
                  />

                  <WebsiteGeneratorThemeControls
                    scopeLabel={`Page Theme${activePage ? ` · ${activePage.page_name}` : ''}`}
                    values={draft.theme_settings?.page_overrides?.[activePage?.page_type] || {}}
                    onChange={(key, value) => handleThemeChange('page', key, value)}
                  />

                  <WebsiteGeneratorThemeControls
                    scopeLabel={`Section Theme${activeSection ? ` · ${activeSection.section_type}` : ''}`}
                    values={draft.theme_settings?.section_overrides?.[`${activePage?.page_type}:${selectedSectionType}`] || {}}
                    onChange={(key, value) => handleThemeChange('section', key, value)}
                  />
                </div>
              ) : (
                <WebsiteGeneratorCodeInjectionPanel
                  value={draft.code_injection}
                  onChange={handleCodeInjectionChange}
                />
              )}

              {regenerating && <p className="text-[11px] text-primary">Regenerating section...</p>}
            </>
          ) : (
            <div className="rounded-xl bg-secondary p-4 text-xs text-muted-foreground">Select a section in the preview to edit it.</div>
          )}
        </aside>
      </div>

      <WebsiteGeneratorExportPanel
        draft={draft}
        activePageType={activePage?.page_type}
        activePageName={activePage?.page_name}
      />

      <div className="rounded-xl bg-secondary p-3 space-y-3">
        <p className="text-xs font-semibold text-foreground">Core Copy</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[11px] text-muted-foreground">Headline</label>
            <input value={draft.generated_copy.headline || ''} onChange={(e) => handleCopyFieldChange('headline', e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[11px] text-muted-foreground">Subheadline</label>
            <textarea value={draft.generated_copy.subheadline || ''} onChange={(e) => handleCopyFieldChange('subheadline', e.target.value)} className="min-h-[72px] w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none resize-none" />
          </div>
        </div>
      </div>
    </div>
  );
}