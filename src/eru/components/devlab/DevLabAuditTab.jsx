import { History, ShieldAlert, Info, AlertTriangle } from 'lucide-react';

const SEVERITY = {
  info:     { Icon: Info,          tone: 'text-muted-foreground' },
  warning:  { Icon: AlertTriangle, tone: 'text-amber-300' },
  critical: { Icon: ShieldAlert,   tone: 'text-destructive' },
};

/**
 * DevLabAuditTab — chronological log of plan approvals, task/patch state
 * changes, and settings updates. Read-only.
 */
export default function DevLabAuditTab({ entries = [] }) {
  if (!entries.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
        <History className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm font-medium text-foreground">No audit entries yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Approvals, task completions, and settings changes will appear here.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => {
        const { Icon, tone } = SEVERITY[e.severity] || SEVERITY.info;
        return (
          <li key={e.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${tone}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">
                  <span className="font-mono">{e.action}</span>
                  <span className="ml-2 text-muted-foreground">· {e.target_type}</span>
                </p>
                {e.details && <p className="mt-0.5 text-[11px] text-muted-foreground">{e.details}</p>}
                <p className="mt-1 text-[10px] text-muted-foreground/70">
                  {e.actor} · {e.created_date ? new Date(e.created_date).toLocaleString() : ''}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}