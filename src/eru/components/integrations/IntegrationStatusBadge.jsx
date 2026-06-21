import { STATUS_LABELS, STATUS_TONES } from '@/eru/lib/integrationRegistry';

const TONE_CLASSES = {
  ok:     'border-primary/30 bg-primary/10 text-primary',
  warn:   'border-yellow-400/30 bg-yellow-400/10 text-yellow-300',
  danger: 'border-destructive/40 bg-destructive/10 text-destructive',
  muted:  'border-border bg-secondary text-muted-foreground',
};

/**
 * IntegrationStatusBadge — single source of truth for honest status pills.
 * Refuses to render a Connected pill unless explicitly told so by registry.
 */
export default function IntegrationStatusBadge({ status, className = '' }) {
  const tone = STATUS_TONES[status] || 'muted';
  const label = STATUS_LABELS[status] || 'Unknown';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASSES[tone]} ${className}`}
    >
      {label}
    </span>
  );
}