import { CheckCircle2, AlertTriangle, WifiOff, Loader2, Wrench, Lock, Database, FlaskConical } from 'lucide-react';

/**
 * TruthState
 * ----------------------------------------------------------------------------
 * Small badge to honestly label data sources. Use this anywhere the app would
 * otherwise risk showing fake/demo data as real.
 *
 *   <TruthState kind="not-connected" />
 *   <TruthState kind="setup-required" />
 *   <TruthState kind="live" lastUpdated={Date.now()} />
 *   <TruthState kind="cached" />
 *   <TruthState kind="demo" />          // admin/owner test data
 *   <TruthState kind="failed" />
 *   <TruthState kind="loading" />
 *   <TruthState kind="backend-rule-required" />  // owner-only callout
 * --------------------------------------------------------------------------*/

const KINDS = {
  live:                    { label: 'Live',                   icon: CheckCircle2, tone: 'ok' },
  cached:                  { label: 'Cached',                 icon: Database,     tone: 'info' },
  loading:                 { label: 'Loading…',               icon: Loader2,      tone: 'info', spin: true },
  failed:                  { label: 'Failed to refresh',      icon: AlertTriangle,tone: 'warn' },
  'not-connected':         { label: 'Not connected',          icon: WifiOff,      tone: 'muted' },
  'setup-required':        { label: 'Setup required',         icon: Wrench,       tone: 'warn' },
  'admin-only':            { label: 'Admin only',             icon: Lock,         tone: 'muted' },
  demo:                    { label: 'Demo · admin only',      icon: FlaskConical, tone: 'warn' },
  'backend-rule-required': { label: 'Backend rule required',  icon: AlertTriangle,tone: 'warn' },
};

const TONE = {
  ok:    'border-primary/30 bg-primary/10 text-primary',
  info:  'border-blue-400/30 bg-blue-400/10 text-blue-300',
  warn:  'border-yellow-400/30 bg-yellow-400/10 text-yellow-300',
  muted: 'border-border bg-secondary text-muted-foreground',
};

export default function TruthState({ kind = 'not-connected', label, lastUpdated, className = '' }) {
  const cfg = KINDS[kind] || KINDS['not-connected'];
  const Icon = cfg.icon;
  const text = label || cfg.label;
  const tone = TONE[cfg.tone] || TONE.muted;
  const ts = lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : null;

  return (
    <span
      title={ts ? `Last updated ${ts}` : text}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone} ${className}`}
    >
      <Icon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''}`} />
      <span>{text}</span>
      {ts && <span className="opacity-70 hidden sm:inline">· {ts}</span>}
    </span>
  );
}