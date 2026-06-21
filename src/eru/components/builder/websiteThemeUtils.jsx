export const DEFAULT_THEME_SETTINGS = {
  global: {
    typography: {
      heading_size: 'text-3xl',
      body_size: 'text-sm',
      font_family: 'font-sans',
      heading_weight: 'font-bold',
      tracking: 'tracking-normal',
    },
    colors: {
      background: 'bg-background',
      text: 'text-foreground',
      accent: 'bg-primary',
      accent_text: 'text-primary-foreground',
      muted: 'bg-secondary',
      muted_text: 'text-muted-foreground',
    },
    buttons: {
      style: 'rounded-xl',
      fill: 'solid',
      padding: 'px-4 py-2.5',
      shadow: 'shadow-sm',
    },
    surfaces: {
      page_background: 'bg-background',
      panel_background: 'bg-card',
      panel_border: 'border-border',
      shadow: 'shadow-sm',
      radius: 'rounded-2xl',
    },
    spacing: {
      section_gap: 'space-y-4',
      section_padding: 'p-4',
      container_padding: 'p-4',
    },
    background: {
      type: 'solid',
      value: 'bg-background',
      overlay: '',
    }
  },
  page_overrides: {},
  section_overrides: {}
};

export function getSafeThemeSettings(settings) {
  return {
    global: {
      ...DEFAULT_THEME_SETTINGS.global,
      ...(settings?.global || {}),
      typography: {
        ...DEFAULT_THEME_SETTINGS.global.typography,
        ...(settings?.global?.typography || {}),
      },
      colors: {
        ...DEFAULT_THEME_SETTINGS.global.colors,
        ...(settings?.global?.colors || {}),
      },
      buttons: {
        ...DEFAULT_THEME_SETTINGS.global.buttons,
        ...(settings?.global?.buttons || {}),
      },
      surfaces: {
        ...DEFAULT_THEME_SETTINGS.global.surfaces,
        ...(settings?.global?.surfaces || {}),
      },
      spacing: {
        ...DEFAULT_THEME_SETTINGS.global.spacing,
        ...(settings?.global?.spacing || {}),
      },
      background: {
        ...DEFAULT_THEME_SETTINGS.global.background,
        ...(settings?.global?.background || {}),
      },
    },
    page_overrides: settings?.page_overrides || {},
    section_overrides: settings?.section_overrides || {},
  };
}

export function resolveThemeLayer(themeSettings, pageType, sectionType) {
  const safe = getSafeThemeSettings(themeSettings);
  const pageOverride = safe.page_overrides?.[pageType] || {};
  const sectionOverride = safe.section_overrides?.[`${pageType}:${sectionType}`] || safe.section_overrides?.[sectionType] || {};

  return {
    typography: {
      ...safe.global.typography,
      ...(pageOverride.typography || {}),
      ...(sectionOverride.typography || {}),
    },
    colors: {
      ...safe.global.colors,
      ...(pageOverride.colors || {}),
      ...(sectionOverride.colors || {}),
    },
    buttons: {
      ...safe.global.buttons,
      ...(pageOverride.buttons || {}),
      ...(sectionOverride.buttons || {}),
    },
    surfaces: {
      ...safe.global.surfaces,
      ...(pageOverride.surfaces || {}),
      ...(sectionOverride.surfaces || {}),
    },
    spacing: {
      ...safe.global.spacing,
      ...(pageOverride.spacing || {}),
      ...(sectionOverride.spacing || {}),
    },
    background: {
      ...safe.global.background,
      ...(pageOverride.background || {}),
      ...(sectionOverride.background || {}),
    },
  };
}