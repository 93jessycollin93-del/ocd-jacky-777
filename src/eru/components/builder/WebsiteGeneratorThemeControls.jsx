import { Palette } from 'lucide-react';

const COLOR_OPTIONS = ['bg-background', 'bg-card', 'bg-secondary', 'bg-primary', 'bg-primary/10', 'bg-gradient-to-r from-primary/20 to-secondary', 'bg-gradient-to-br from-background to-secondary', 'bg-gradient-to-r from-primary to-chart-2'];
const TEXT_OPTIONS = ['text-foreground', 'text-muted-foreground', 'text-primary', 'text-primary-foreground'];
const ROUNDING_OPTIONS = ['rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl'];
const FONT_OPTIONS = ['font-sans', 'font-serif', 'font-mono'];
const HEADING_OPTIONS = ['text-2xl', 'text-3xl', 'text-4xl', 'text-5xl'];
const BODY_OPTIONS = ['text-xs', 'text-sm', 'text-base'];
const PADDING_OPTIONS = ['p-3', 'p-4', 'p-6', 'p-8'];
const GAP_OPTIONS = ['space-y-3', 'space-y-4', 'space-y-6', 'space-y-8'];
const SHADOW_OPTIONS = ['shadow-none', 'shadow-sm', 'shadow-md', 'shadow-lg'];
const TRACKING_OPTIONS = ['tracking-tight', 'tracking-normal', 'tracking-wide'];
const WEIGHT_OPTIONS = ['font-semibold', 'font-bold', 'font-extrabold'];

function SelectField({ label, value, options, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-muted-foreground">{label}</label>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs outline-none">
        <option value="">Inherit</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

export default function WebsiteGeneratorThemeControls({ scopeLabel, values, onChange }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">{scopeLabel}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Background" value={values?.background?.value} options={COLOR_OPTIONS} onChange={(value) => onChange('background.value', value)} />
        <SelectField label="Panel Background" value={values?.surfaces?.panel_background} options={COLOR_OPTIONS} onChange={(value) => onChange('surfaces.panel_background', value)} />
        <SelectField label="Text Color" value={values?.colors?.text} options={TEXT_OPTIONS} onChange={(value) => onChange('colors.text', value)} />
        <SelectField label="Muted Text" value={values?.colors?.muted_text} options={TEXT_OPTIONS} onChange={(value) => onChange('colors.muted_text', value)} />
        <SelectField label="Accent / Button BG" value={values?.colors?.accent} options={COLOR_OPTIONS} onChange={(value) => onChange('colors.accent', value)} />
        <SelectField label="Button Text" value={values?.colors?.accent_text} options={TEXT_OPTIONS} onChange={(value) => onChange('colors.accent_text', value)} />
        <SelectField label="Button Radius" value={values?.buttons?.style} options={ROUNDING_OPTIONS} onChange={(value) => onChange('buttons.style', value)} />
        <SelectField label="Button Shadow" value={values?.buttons?.shadow} options={SHADOW_OPTIONS} onChange={(value) => onChange('buttons.shadow', value)} />
        <SelectField label="Font Family" value={values?.typography?.font_family} options={FONT_OPTIONS} onChange={(value) => onChange('typography.font_family', value)} />
        <SelectField label="Heading Size" value={values?.typography?.heading_size} options={HEADING_OPTIONS} onChange={(value) => onChange('typography.heading_size', value)} />
        <SelectField label="Heading Weight" value={values?.typography?.heading_weight} options={WEIGHT_OPTIONS} onChange={(value) => onChange('typography.heading_weight', value)} />
        <SelectField label="Letter Spacing" value={values?.typography?.tracking} options={TRACKING_OPTIONS} onChange={(value) => onChange('typography.tracking', value)} />
        <SelectField label="Body Size" value={values?.typography?.body_size} options={BODY_OPTIONS} onChange={(value) => onChange('typography.body_size', value)} />
        <SelectField label="Surface Radius" value={values?.surfaces?.radius} options={ROUNDING_OPTIONS} onChange={(value) => onChange('surfaces.radius', value)} />
        <SelectField label="Surface Shadow" value={values?.surfaces?.shadow} options={SHADOW_OPTIONS} onChange={(value) => onChange('surfaces.shadow', value)} />
        <SelectField label="Section Padding" value={values?.spacing?.section_padding} options={PADDING_OPTIONS} onChange={(value) => onChange('spacing.section_padding', value)} />
        <SelectField label="Section Spacing" value={values?.spacing?.section_gap} options={GAP_OPTIONS} onChange={(value) => onChange('spacing.section_gap', value)} />
        <SelectField label="Container Padding" value={values?.spacing?.container_padding} options={PADDING_OPTIONS} onChange={(value) => onChange('spacing.container_padding', value)} />
      </div>
    </div>
  );
}