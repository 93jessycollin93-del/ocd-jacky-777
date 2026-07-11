import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { resolveThemeLayer } from './websiteThemeUtils';

const SECTION_STYLE = {
  hero: 'bg-gradient-to-br from-primary/10 to-secondary border-primary/20',
  features: 'bg-secondary/70 border-border',
  about: 'bg-secondary/70 border-border',
  testimonials: 'bg-secondary/70 border-border',
  pricing: 'bg-secondary/70 border-border',
  faq: 'bg-secondary/70 border-border',
  cta: 'bg-primary/10 border-primary/20',
  contact: 'bg-secondary/70 border-border',
  footer: 'bg-card border-border',
};

const PREVIEW_DEVICES = {
  desktop: { label: 'Desktop', width: '1440px', minHeight: '900px', icon: Monitor },
  tablet: { label: 'Tablet', width: '768px', minHeight: '1024px', icon: Tablet },
  mobile: { label: 'Mobile', width: '390px', minHeight: '844px', icon: Smartphone },
};

function SectionBlock({ section, onSelect, selected, previewMode, theme }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full border text-left transition-colors ${theme?.surfaces?.radius || theme?.buttons?.style || 'rounded-2xl'} ${theme?.spacing?.section_padding || (previewMode === 'mobile' ? 'p-3' : 'p-4')} ${theme?.background?.value || (selected ? 'bg-primary/5' : SECTION_STYLE[section.section_type] || 'bg-secondary/70')} ${theme?.surfaces?.panel_border || 'border-border'} ${theme?.surfaces?.shadow || ''} ${selected ? 'ring-1 ring-primary/40 border-primary' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm font-semibold capitalize ${theme?.colors?.text || 'text-foreground'}`}>{section.section_type}</p>
        <span className="rounded-full bg-card px-2 py-1 text-[10px] uppercase text-muted-foreground">section</span>
      </div>
      {section.title && <p className={`mt-3 ${theme?.typography?.heading_weight || 'font-bold'} ${theme?.typography?.tracking || 'tracking-normal'} ${theme?.typography?.heading_size || 'text-lg'} ${theme?.typography?.font_family || 'font-sans'} ${theme?.colors?.text || 'text-foreground'}`}>{section.title}</p>}
      {section.subtitle && <p className={`mt-2 ${theme?.typography?.tracking || 'tracking-normal'} ${theme?.typography?.body_size || 'text-sm'} ${theme?.typography?.font_family || 'font-sans'} ${theme?.colors?.muted_text || 'text-muted-foreground'}`}>{section.subtitle}</p>}
      {Array.isArray(section.items) && section.items.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {section.items.slice(0, 4).map((item, index) => (
            <div key={`${item}-${index}`} className={`rounded-xl ${theme?.surfaces?.panel_background || 'bg-card'} px-3 py-2 text-xs ${theme?.colors?.muted_text || 'text-muted-foreground'}`}>{item}</div>
          ))}
        </div>
      )}
      {section.cta_label && (
        <div className="mt-4">
          <span className={`inline-flex ${theme?.buttons?.style || 'rounded-xl'} ${theme?.buttons?.shadow || ''} ${theme?.colors?.accent || 'bg-primary'} ${theme?.colors?.accent_text || 'text-primary-foreground'} ${theme?.buttons?.padding || 'px-3 py-2'} text-xs font-semibold`}>{section.cta_label}</span>
        </div>
      )}
    </button>
  );
}

export default function WebsiteGeneratorLivePreview({ pages, sections, themeSettings, activePageType, previewMode, selectedSectionType, onPageChange, onModeChange, onSelectSection }) {
  const activePage = pages.find((page) => page.page_type === activePageType) || pages[0];
  const pageTheme = resolveThemeLayer(themeSettings, activePage?.page_type, null);
  const visibleSections = (activePage?.sections || []).map((sectionType) => sections.find((section) => section.section_type === sectionType)).filter(Boolean);
  const activeDevice = PREVIEW_DEVICES[previewMode] || PREVIEW_DEVICES.desktop;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {pages.map((page) => (
            <button
              key={page.page_type}
              onClick={() => onPageChange(page.page_type)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${activePage?.page_type === page.page_type ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
            >
              {page.page_name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 self-start lg:self-auto">
          {Object.entries(PREVIEW_DEVICES).map(([key, device]) => {
            const Icon = device.icon;
            const isActive = previewMode === key;

            return (
              <button
                key={key}
                onClick={() => onModeChange(key)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{device.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${isActive ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-card text-muted-foreground'}`}>
                  {device.width.replace('px', '')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[28px] border border-border bg-background p-3 overflow-x-auto overflow-y-hidden">
        <div
          className={`mx-auto border transition-all overflow-hidden ${pageTheme?.spacing?.container_padding || 'p-4'} ${pageTheme?.background?.value || 'bg-card'} ${pageTheme?.surfaces?.panel_border || 'border-border'} ${pageTheme?.surfaces?.radius || 'rounded-[24px]'} ${pageTheme?.surfaces?.shadow || 'shadow-sm'}`}
          style={{ width: activeDevice.width, minHeight: activeDevice.minHeight }}
        >
          <div className={pageTheme?.spacing?.section_gap || 'space-y-4'}>
            {visibleSections.map((section, index) => {
              const theme = resolveThemeLayer(themeSettings, activePage?.page_type, section.section_type);
              return (
                <SectionBlock
                  key={`${section.section_type}-${index}`}
                  section={section}
                  theme={theme}
                  previewMode={previewMode}
                  selected={selectedSectionType === section.section_type}
                  onSelect={() => onSelectSection(section.section_type)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}