import { useEffect, useState } from 'react';
import { CheckSquare, Square, RotateCcw } from 'lucide-react';

const CHECKLISTS = [
  {
    key: 'manual',
    label: 'Manual checklist',
    items: [
      'Walk the new flow on a phone-sized viewport',
      'Walk the same flow on a desktop viewport',
      'Confirm primary buttons are reachable with one thumb',
      'Confirm error states render without breaking layout',
    ],
  },
  {
    key: 'security',
    label: 'Security checklist',
    items: [
      'No new secrets exposed in client code',
      'New entity reads/writes have correct RLS',
      'Destructive actions go through ConfirmDialog',
      'No unvalidated user input passed to backend functions',
    ],
  },
  {
    key: 'mobile',
    label: 'Mobile responsiveness',
    items: [
      'Safe-area insets respected (top + bottom)',
      'No horizontal overflow on 360px-wide screens',
      'Tap targets at least 44x44',
      'Bottom-sheet modals scroll instead of clipping',
    ],
  },
  {
    key: 'data',
    label: 'Data integrity',
    items: [
      'No fabricated prices, balances, or live values',
      'Empty states show when sources are not connected',
      'List queries use correct sort and limit',
      'Audit logs created for sensitive actions',
    ],
  },
  {
    key: 'rollback',
    label: 'Rollback plan',
    items: [
      'List of files to revert is documented',
      'Entity changes can be rolled back without data loss',
      'Plan/Patch records are archivable if abandoned',
    ],
  },
];

const STORAGE_KEY = 'devlab_test_plan_state';

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

/**
 * DevLabTestPlanTab — manual checklist matrix. Persists locally; never claims
 * automated test results unless a real test runner is wired in later.
 */
export default function DevLabTestPlanTab({ projectId }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* quota */ }
  }, [state]);

  const keyFor = (groupKey, idx) => `${projectId || 'default'}:${groupKey}:${idx}`;
  const toggle = (groupKey, idx) => {
    setState((prev) => ({ ...prev, [keyFor(groupKey, idx)]: !prev[keyFor(groupKey, idx)] }));
  };
  const reset = () => {
    setState((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (k.startsWith(`${projectId || 'default'}:`)) delete next[k]; });
      return next;
    });
  };

  const totalDone = CHECKLISTS.reduce((sum, group) => {
    return sum + group.items.filter((_, i) => state[keyFor(group.key, i)]).length;
  }, 0);
  const totalCount = CHECKLISTS.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
        <div>
          <p className="text-xs font-semibold text-foreground">Test plan progress</p>
          <p className="text-[11px] text-muted-foreground">
            {totalDone}/{totalCount} items checked · saved on this device
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-[11px] text-muted-foreground"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      {CHECKLISTS.map((group) => (
        <section key={group.key} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-foreground">{group.label}</p>
          <ul className="mt-2 space-y-1.5">
            {group.items.map((item, i) => {
              const checked = !!state[keyFor(group.key, i)];
              return (
                <li key={i}>
                  <button
                    onClick={() => toggle(group.key, i)}
                    className="flex w-full items-start gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-left hover:border-primary/30"
                  >
                    {checked ? (
                      <CheckSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    ) : (
                      <Square className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    )}
                    <span className={`text-xs ${checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {item}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}