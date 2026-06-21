const SECTION_LABELS = {
  hero: 'Hero',
  features: 'Features',
  about: 'About',
  testimonials: 'Testimonials',
  pricing: 'Pricing',
  faq: 'FAQ',
  cta: 'CTA',
  contact: 'Contact',
  footer: 'Footer',
};

export default function WebsiteGeneratorSectionLibrary({ sections = [] }) {
  if (!sections.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold">Reusable Sections</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section, index) => (
          <div key={`${section.section_type}-${index}`} className="rounded-xl bg-secondary p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground">{SECTION_LABELS[section.section_type] || section.section_type}</p>
              <span className="rounded-full bg-card px-2 py-1 text-[10px] uppercase text-muted-foreground">{section.section_type}</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {section.title && <p><span className="text-foreground">Title:</span> {section.title}</p>}
              {section.subtitle && <p><span className="text-foreground">Subtitle:</span> {section.subtitle}</p>}
              {section.cta_label && <p><span className="text-foreground">CTA:</span> {section.cta_label}</p>}
              {Array.isArray(section.items) && section.items.length > 0 && (
                <div>
                  <p className="text-foreground">Items</p>
                  <ul className="mt-1 space-y-1">
                    {section.items.slice(0, 4).map((item, itemIndex) => <li key={itemIndex}>• {item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}