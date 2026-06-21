export const THEME_TARGETS = {
  global: 'global',
  page: 'page',
  component: 'component',
};

export const DEFAULT_THEME_VARIABLES = {
  '--app-bg': 'hsl(var(--background))',
  '--page-bg': 'transparent',
  '--section-bg': 'transparent',
  '--panel-bg': 'hsl(var(--card))',
  '--card-bg': 'hsl(var(--card))',
  '--modal-bg': 'hsl(var(--card))',
  '--sidebar-bg': 'hsl(var(--sidebar-background))',
  '--topbar-bg': 'hsl(var(--card))',
  '--footer-bg': 'hsl(var(--card))',
  '--widget-bg': 'hsl(var(--card))',
  '--surface-bg': 'hsl(var(--card))',
  '--surface-foreground': 'hsl(var(--card-foreground))',
  '--button-bg': 'hsl(var(--primary))',
  '--button-foreground': 'hsl(var(--primary-foreground))',
  '--button-border': 'transparent',
  '--button-hover-bg': 'hsl(var(--primary))',
  '--button-active-bg': 'hsl(var(--primary))',
  '--button-disabled-bg': 'hsl(var(--muted))',
  '--button-glow': 'none',
  '--input-bg': 'hsl(var(--secondary))',
  '--input-border': 'hsl(var(--border))',
  '--page-border': 'hsl(var(--border))',
  '--layer-radius': '1rem',
  '--layer-shadow': '0 0 0 rgba(0,0,0,0)',
};

export function buildBackgroundStyles(setting) {
  if (!setting || !setting.is_active) return {};

  const backgroundType = setting.background_type;
  const backgroundValue = setting.background_value;
  const styles = {};

  if (backgroundType === 'solid' && backgroundValue) {
    styles.background = backgroundValue;
  }
  if ((backgroundType === 'gradient' || backgroundType === 'animated_gradient') && backgroundValue) {
    styles.backgroundImage = backgroundValue;
    styles.backgroundSize = 'cover';
    styles.backgroundRepeat = 'no-repeat';
  }
  if ((backgroundType === 'image' || backgroundType === 'texture' || backgroundType === 'pattern') && backgroundValue) {
    styles.backgroundImage = `url(${backgroundValue})`;
    styles.backgroundSize = setting.image_fit || 'cover';
    styles.backgroundPosition = 'center';
    styles.backgroundRepeat = backgroundType === 'pattern' ? 'repeat' : 'no-repeat';
  }
  if ((backgroundType === 'mesh' || backgroundType === 'glass') && backgroundValue) {
    styles.backgroundImage = backgroundValue === 'neural_mesh'
      ? 'radial-gradient(circle at 20% 20%, rgba(41,227,161,0.16), transparent 28%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.18), transparent 32%), linear-gradient(135deg, rgba(3,7,18,0.96), rgba(10,18,28,0.88))'
      : backgroundValue;
    styles.backgroundSize = 'cover';
    styles.backdropFilter = `blur(${setting.blur || 18}px)`;
    styles.WebkitBackdropFilter = `blur(${setting.blur || 18}px)`;
  }
  if (backgroundType === 'overlay') {
    styles.background = setting.overlay_color || 'rgba(0,0,0,0.35)';
  }

  const filterParts = [
    `brightness(${setting.brightness ?? 1})`,
    `contrast(${setting.contrast ?? 1})`,
    `saturate(${setting.saturation ?? 1})`,
    setting.blur ? `blur(${Math.max(0, (setting.background_type === 'glass' ? 0 : setting.blur / 12))}px)` : null,
  ].filter(Boolean);

  if (filterParts.length) styles.filter = filterParts.join(' ');
  if (setting.opacity !== undefined) styles.opacity = setting.opacity;
  if (setting.border_color) styles.borderColor = setting.border_color;
  if (setting.border_width !== undefined) styles.borderWidth = `${setting.border_width}px`;
  if (setting.radius !== undefined) styles.borderRadius = `${setting.radius}px`;
  if (setting.shadow) styles.boxShadow = setting.shadow;

  return styles;
}

export function normalizeVariables(variables = {}) {
  return Object.entries(variables || {}).reduce((acc, [key, value]) => {
    if (!key || value === undefined || value === null || value === '') return acc;
    acc[key] = value;
    return acc;
  }, {});
}

export function mergeThemeSettings(globalSetting, pageSetting, componentSettings = []) {
  const componentVariables = (componentSettings || []).reduce((acc, item) => ({ ...acc, ...normalizeVariables(item?.variables) }), {});
  return {
    variables: {
      ...DEFAULT_THEME_VARIABLES,
      ...normalizeVariables(globalSetting?.variables),
      ...normalizeVariables(pageSetting?.variables),
      ...componentVariables,
    },
    globalBackground: buildBackgroundStyles(globalSetting),
    pageBackground: buildBackgroundStyles(pageSetting),
    componentBackgrounds: (componentSettings || []).reduce((acc, item) => {
      if (item?.scope_key) acc[item.scope_key] = buildBackgroundStyles(item);
      return acc;
    }, {}),
    globalMode: globalSetting?.theme_mode || 'inherit',
    pageMode: pageSetting?.theme_mode || 'inherit',
  };
}

export function applyRootVariables(variables = {}) {
  const root = document.documentElement;
  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}