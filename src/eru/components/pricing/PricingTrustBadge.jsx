import { CheckCircle2, ShieldCheck, AlertTriangle, Pencil, HelpCircle, MinusCircle, WifiOff, FlaskConical } from 'lucide-react';
import { TRUST_BADGES } from '@/eru/lib/zeroFakeData';

const ICON = {
  verified_source:   CheckCircle2,
  multiple_sources:  ShieldCheck,
  stale:             AlertTriangle,
  manual_entry:      Pencil,
  needs_review:      HelpCircle,
  no_data:           MinusCircle,
  not_connected:     WifiOff,
  demo:              FlaskConical,
};

const TONE = {
  ok:    'border-primary/30 bg-primary/10 text-primary',
  info:  'border-blue-400/30 bg-blue-400/10 text-blue-300',
  warn:  'border-yellow-400/30 bg-yellow-400/10 text-yellow-300',
  danger:'border-destructive/40 bg-destructive/10 text-destructive',
  muted: 'border-border bg-secondary text-muted-foreground',
};

/**
 * PricingTrustBadge — visible trust indicator for any price-shaped value.
 * Use this near every price the user sees. Refuses to be silent: defaults to
 * `no_data` so missing data never looks like a real value.
 */
export default function PricingTrustBadge({ kind = 'no_data', label, className = '' }) {
  const cfg = TRUST_BADGES[kind] || TRUST_BADGES.no_data;
  const Icon = ICON[kind] || MinusCircle;
  const tone = TONE[cfg.tone] || TONE.muted;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone} ${className}`}
      title={label || cfg.label}
    >
      <Icon className="h-3 w-3" />
      <span>{label || cfg.label}</span>
    </span>
  );
}