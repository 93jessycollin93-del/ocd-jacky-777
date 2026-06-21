import { CheckCircle2, AlertTriangle, XOctagon, PauseCircle } from 'lucide-react';
import { STATUS } from '@/eru/lib/integrationRegistry';

const NEEDS_SETUP = new Set([
  STATUS.NOT_CONNECTED,
  STATUS.SETUP_REQUIRED,
  STATUS.NEEDS_CREDENTIALS,
  STATUS.NEEDS_WEBHOOK,
  STATUS.NEEDS_VERIFICATION,
  STATUS.PERMISSION_MISSING,
]);
const BROKEN = new Set([STATUS.SOURCE_OFFLINE]);
const DISABLED = new Set([STATUS.DISABLED, STATUS.UNSUPPORTED]);

/**
 * IntegrationSummary — top-of-hub honest counters. Counts are computed from
 * the live registry — never hardcoded.
 */
export default function IntegrationSummary({ items = [] }) {
  const counts = items.reduce((acc, it) => {
    if (it.status === STATUS.CONNECTED) acc.connected += 1;
    else if (BROKEN.has(it.status)) acc.broken += 1;
    else if (DISABLED.has(it.status)) acc.disabled += 1;
    else if (NEEDS_SETUP.has(it.status)) acc.needs += 1;
    return acc;
  }, { connected: 0, needs: 0, broken: 0, disabled: 0 });

  const tiles = [
    { key: 'connected', label: 'Connected',    value: counts.connected, icon: CheckCircle2,   tone: 'text-primary border-primary/30 bg-primary/10' },
    { key: 'needs',     label: 'Needs Setup',  value: counts.needs,     icon: AlertTriangle,  tone: 'text-yellow-300 border-yellow-400/30 bg-yellow-400/10' },
    { key: 'broken',    label: 'Broken',       value: counts.broken,    icon: XOctagon,       tone: 'text-destructive border-destructive/40 bg-destructive/10' },
    { key: 'disabled',  label: 'Disabled',     value: counts.disabled,  icon: PauseCircle,    tone: 'text-muted-foreground border-border bg-secondary' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles.map(({ key, label, value, icon: Icon, tone }) => (
        <div key={key} className={`rounded-2xl border p-3 ${tone}`}>
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5" />
            <p className="text-[10px] font-semibold uppercase tracking-wide">{label}</p>
          </div>
          <p className="mt-1 font-mono text-xl font-bold">{value}</p>
        </div>
      ))}
    </div>
  );
}