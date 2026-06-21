export default function WebsiteGeneratorPreview({ project }) {
  if (!project?.site_blueprint) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
        <p className="text-sm font-semibold text-foreground">Preview area</p>
        <p className="mt-1 text-xs text-muted-foreground">Generated drafts will appear here after the first draft is created.</p>
      </div>
    );
  }

  const homePage = project.site_blueprint.pages?.find((page) => page.page_type?.toLowerCase() === 'home') || project.site_blueprint.pages?.[0];
  const heroSection = project.site_blueprint.reusable_sections?.find((section) => section.section_type === 'hero');
  const ctaSection = project.site_blueprint.reusable_sections?.find((section) => section.section_type === 'cta');

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">First Draft Preview</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{project.site_blueprint.site_summary}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">{project.site_blueprint.site_type} · {project.site_blueprint.tone} · {project.site_blueprint.cta_direction}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {(project.site_blueprint.navigation || []).map((item) => (
            <span key={item} className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] text-muted-foreground">{item}</span>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-secondary p-4">
        <p className="text-lg font-bold text-foreground">{project.generated_copy?.headline || heroSection?.title || project.site_blueprint.site_name}</p>
        <p className="mt-2 text-sm text-muted-foreground">{project.generated_copy?.subheadline || heroSection?.subtitle}</p>
        <button className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          {ctaSection?.cta_label || heroSection?.cta_label || 'Get Started'}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-secondary p-3">
          <p className="text-[11px] font-semibold text-foreground">Home Page Flow</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {(homePage?.sections || []).map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
        <div className="rounded-xl bg-secondary p-3">
          <p className="text-[11px] font-semibold text-foreground">Value Points</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {(project.generated_copy?.value_points || []).map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}