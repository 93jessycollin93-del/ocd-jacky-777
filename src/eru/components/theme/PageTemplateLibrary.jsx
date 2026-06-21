import { useMemo, useState } from 'react';
import { BookmarkPlus, LayoutTemplate, Monitor, Save } from 'lucide-react';
import { useTheme, BG_ENVS } from '@/eru/context/ThemeContext';

const STORAGE_KEY = 'visual_page_templates_v1';

const PRESET_TEMPLATES = [
  {
    id: 'dashboard-ops',
    name: 'Dashboard',
    description: 'Dense overview with strong contrast and operational focus.',
    preview: ['Top metrics', 'Activity feed', 'Cards grid'],
    config: { uiScale: 0.95, bg: 'neural_mesh', bgOpacity: 0.35, motionIntensity: 1, animSpeed: 1, typography: 'modern', primaryHue: 160, bgHue: 230, cardHue: 230, borderHue: 230, primarySat: 100, primaryLight: 45 }
  },
  {
    id: 'settings-calm',
    name: 'Settings',
    description: 'Clean and calm layout for control panels and configuration screens.',
    preview: ['Form stacks', 'Wide sections', 'Low motion'],
    config: { uiScale: 1, bg: 'none', bgOpacity: 0.2, motionIntensity: 0.6, animSpeed: 0.8, typography: 'minimal', primaryHue: 195, bgHue: 215, cardHue: 215, borderHue: 215, primarySat: 80, primaryLight: 62 }
  },
  {
    id: 'profile-elegant',
    name: 'Profile',
    description: 'Readable personal layout with softer cards and identity focus.',
    preview: ['Hero card', 'Profile blocks', 'Readable spacing'],
    config: { uiScale: 1, bg: 'still_aurora', bgOpacity: 0.28, motionIntensity: 0.7, animSpeed: 0.85, typography: 'elegant', primaryHue: 280, bgHue: 250, cardHue: 248, borderHue: 248, primarySat: 72, primaryLight: 68 }
  },
  {
    id: 'product-detail-commerce',
    name: 'Product Detail',
    description: 'Showcase layout for commerce pages with bold accents and clear CTAs.',
    preview: ['Media hero', 'Specs card', 'Strong CTA'],
    config: { uiScale: 1, bg: 'still_cosmos', bgOpacity: 0.22, motionIntensity: 0.9, animSpeed: 1, typography: 'modern', primaryHue: 35, bgHue: 225, cardHue: 225, borderHue: 225, primarySat: 95, primaryLight: 58 }
  }
];

function loadCustomTemplates() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function TemplateCard({ template, onApply, isCustom = false }) {
  const bgLabel = BG_ENVS[template.config.bg]?.label || 'None';

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{template.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${isCustom ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary text-muted-foreground border border-border'}`}>
          {isCustom ? 'Saved' : 'Preset'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
        {template.preview.map((item) => (
          <div key={item} className="rounded-xl border border-border bg-secondary/40 px-2 py-2 text-muted-foreground">
            {item}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
        <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2">Background: {bgLabel}</div>
        <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2">Typography: {template.config.typography}</div>
      </div>

      <button onClick={() => onApply(template)} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
        Apply Template
      </button>
    </div>
  );
}

export default function PageTemplateLibrary() {
  const theme = useTheme() || {};
  const [customTemplates, setCustomTemplates] = useState(loadCustomTemplates);
  const [templateName, setTemplateName] = useState('');

  const applyTemplate = (template) => {
    template.config.uiScale !== undefined && theme.setUiScale?.(template.config.uiScale);
    template.config.bg !== undefined && theme.setBg?.(template.config.bg);
    template.config.bgOpacity !== undefined && theme.setBgOpacity?.(template.config.bgOpacity);
    template.config.motionIntensity !== undefined && theme.setMotionIntensity?.(template.config.motionIntensity);
    template.config.animSpeed !== undefined && theme.setAnimSpeed?.(template.config.animSpeed);
    template.config.typography !== undefined && theme.setTypography?.(template.config.typography);
    template.config.primaryHue !== undefined && theme.updatePrimaryHue?.(template.config.primaryHue);
    template.config.bgHue !== undefined && theme.updateBgHue?.(template.config.bgHue);
    template.config.cardHue !== undefined && theme.updateCardHue?.(template.config.cardHue);
    template.config.borderHue !== undefined && theme.updateBorderHue?.(template.config.borderHue);
    template.config.primarySat !== undefined && theme.updatePrimarySat?.(template.config.primarySat);
    template.config.primaryLight !== undefined && theme.updatePrimaryLight?.(template.config.primaryLight);
  };

  const currentTemplateSnapshot = useMemo(() => ({
    uiScale: theme.uiScale,
    bg: theme.bg,
    bgOpacity: theme.bgOpacity,
    motionIntensity: theme.motionIntensity,
    animSpeed: theme.animSpeed,
    typography: theme.typography,
    primaryHue: theme.primaryHue,
    bgHue: theme.bgHue,
    cardHue: theme.cardHue,
    borderHue: theme.borderHue,
    primarySat: theme.primarySat,
    primaryLight: theme.primaryLight,
  }), [theme]);

  const saveCurrentAsTemplate = () => {
    const name = templateName.trim();
    if (!name) return;

    const next = [
      {
        id: `custom-${Date.now()}`,
        name,
        description: 'Saved from your current Visual Engine settings.',
        preview: ['Current scale', 'Current theme', 'Current motion'],
        config: currentTemplateSnapshot,
      },
      ...customTemplates,
    ].slice(0, 12);

    setCustomTemplates(next);
    saveCustomTemplates(next);
    setTemplateName('');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2">
            <LayoutTemplate className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Page Template Library</p>
            <p className="mt-1 text-xs text-muted-foreground">Choose a starter layout style for common pages, then fine-tune it using the existing theme controls.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preset templates</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {PRESET_TEMPLATES.map((template) => (
            <TemplateCard key={template.id} template={template} onApply={applyTemplate} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <BookmarkPlus className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Save current layout as template</p>
        </div>
        <p className="text-xs text-muted-foreground">Capture your current page style setup so you can reuse it later.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name"
            className="min-h-11 flex-1 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button onClick={saveCurrentAsTemplate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
            <Save className="h-4 w-4" /> Save Template
          </button>
        </div>
      </div>

      {customTemplates.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved templates</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {customTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} onApply={applyTemplate} isCustom />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}