export default function WebsiteGeneratorPageMap({ pages = [] }) {
  if (!pages.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold">Site Pages</p>
      <div className="grid gap-3 md:grid-cols-2">
        {pages.map((page, index) => (
          <div key={`${page.page_type}-${index}`} className="rounded-xl bg-secondary p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{page.page_name}</p>
                <p className="text-[11px] text-muted-foreground">/{page.slug}</p>
              </div>
              <span className="rounded-full bg-card px-2 py-1 text-[10px] uppercase text-muted-foreground">{page.page_type}</span>
            </div>
            <p className="text-xs text-muted-foreground">{page.page_goal}</p>
            <div>
              <p className="text-[11px] font-semibold text-foreground">Sections</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(page.sections || []).map((section, sectionIndex) => (
                  <span key={`${section}-${sectionIndex}`} className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] text-muted-foreground">
                    {section}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}