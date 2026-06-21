export function buildWebsiteExportJson(draft) {
  return JSON.stringify({
    site_blueprint: draft?.site_blueprint || {},
    generated_copy: draft?.generated_copy || {},
    theme_settings: draft?.theme_settings || {},
    code_injection: draft?.code_injection || {},
  }, null, 2);
}

export function buildWebsiteExportMarkdown(draft) {
  const blueprint = draft?.site_blueprint || {};
  const pages = blueprint.pages || [];
  const sections = blueprint.reusable_sections || [];
  const copy = draft?.generated_copy || {};

  const lines = [
    `# ${blueprint.site_name || 'Website Project'}`,
    '',
    `- Site type: ${blueprint.site_type || ''}`,
    `- Tone: ${blueprint.tone || ''}`,
    `- CTA direction: ${blueprint.cta_direction || ''}`,
    '',
    '## Site Summary',
    '',
    blueprint.site_summary || 'No summary provided.',
    '',
    '## Core Copy',
    '',
    `### Headline`,
    copy.headline || '',
    '',
    `### Subheadline`,
    copy.subheadline || '',
    '',
    '## Pages',
    '',
  ];

  pages.forEach((page) => {
    lines.push(`### ${page.page_name || page.page_type}`);
    lines.push(`- Slug: /${page.slug || ''}`);
    lines.push(`- Goal: ${page.page_goal || ''}`);
    lines.push(`- Sections: ${(page.sections || []).join(', ')}`);
    lines.push('');
  });

  lines.push('## Reusable Sections', '');

  const injections = draft?.code_injection || {};

  sections.forEach((section) => {
    lines.push(`### ${section.section_type}`);
    if (section.title) lines.push(`- Title: ${section.title}`);
    if (section.subtitle) lines.push(`- Subtitle: ${section.subtitle}`);
    if (section.cta_label) lines.push(`- CTA: ${section.cta_label}`);
    if (section.items?.length) {
      lines.push('- Items:');
      section.items.forEach((item) => lines.push(`  - ${item}`));
    }
    lines.push('');
  });

  lines.push('## Code Injection', '');
  lines.push(`### Head HTML\n${injections.head_html || ''}`, '');
  lines.push(`### Body Start HTML\n${injections.body_start_html || ''}`, '');
  lines.push(`### Body End HTML / Scripts\n${injections.body_end_html || ''}`, '');
  lines.push(`### Custom CSS\n${injections.custom_css || ''}`, '');
  lines.push(`### Custom JavaScript\n${injections.custom_js || ''}`, '');

  return lines.join('\n');
}

export function buildCmsPageContent(draft, pageType) {
  const blueprint = draft?.site_blueprint || {};
  const pages = blueprint.pages || [];
  const sections = blueprint.reusable_sections || [];
  const page = pages.find((item) => item.page_type === pageType) || pages[0];

  if (!page) return '';

  const lines = [
    `${page.page_name || page.page_type}`,
    '',
    `Goal: ${page.page_goal || ''}`,
    '',
  ];

  (page.sections || []).forEach((sectionType) => {
    const section = sections.find((item) => item.section_type === sectionType);
    if (!section) return;

    lines.push(`${section.title || section.section_type}`);
    if (section.subtitle) {
      lines.push(section.subtitle);
    }
    if (section.items?.length) {
      lines.push('');
      section.items.forEach((item) => lines.push(`• ${item}`));
    }
    if (section.cta_label) {
      lines.push('', `CTA: ${section.cta_label}`);
    }
    lines.push('', '---', '');
  });

  return lines.join('\n').trim();
}