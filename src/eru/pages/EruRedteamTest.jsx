import { useState } from 'react';
import { Button } from '@/eru/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/eru/components/ui/card';
import { Badge } from '@/eru/components/ui/badge';
import {
  runRedteam,
  REDTEAM_CATEGORIES,
  DEFAULT_SCENARIOS,
} from '@/eru/lib/eruRedteam';
import { validateRedteam } from '@/eru/lib/eruRedteamValidator';

const STAGE_LABELS = {
  coverage: 'Coverage',
  defenses_held: 'Defenses held',
  leader_synthesis: 'Leader synthesis',
};

function StageRow({ stage }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{STAGE_LABELS[stage.name] || stage.name}</div>
        <Badge variant={stage.pass ? 'default' : 'destructive'}>{stage.pass ? 'PASS' : 'FAIL'}</Badge>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{stage.summary}</div>
      {stage.failures.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {stage.failures.map((f, i) => (
            <li key={i} className="text-destructive">
              <span className="font-mono">{f.indicator}</span> — {f.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryRow({ cmdId, summary }) {
  const meta = REDTEAM_CATEGORIES[cmdId];
  if (!summary) return null;
  const variant =
    summary.status === 'secure' ? 'default' : summary.status === 'breached' ? 'destructive' : 'secondary';
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <div className="text-sm font-medium">{meta.role}</div>
        <div className="text-xs text-muted-foreground">{meta.domain}</div>
      </div>
      <div className="text-right">
        <Badge variant={variant} className="font-mono">
          {summary.attacks_blocked}/{summary.attacks_total} blocked
        </Badge>
        <div className="mt-1 text-[10px] uppercase text-muted-foreground">{summary.status}</div>
      </div>
    </div>
  );
}

export default function EruRedteamTest() {
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState(null); // { events, report }

  const runIt = async () => {
    setRunning(true);
    setRun(null);
    try {
      const events = await runRedteam();
      const report = validateRedteam(events);
      setRun({ events, report });
    } finally {
      setRunning(false);
    }
  };

  const summariesByCmd = run
    ? Object.fromEntries(
        run.events
          .filter((e) => e.type === 'commander_summary')
          .map((s) => [s.commander_id, s]),
      )
    : {};

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>ERU Red-Team Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            1 attack coordinator · 5 attack categories · 20 individual attack scenarios
            (4 per category). Tests whether the app's defenses hold against load floods,
            input fuzzing, prompt injection, auth/IDOR bypasses, and economy abuse.
          </p>
          <p className="text-xs text-muted-foreground">
            Currently running in <span className="font-mono">simulate</span> mode — no real
            requests are sent. Each scenario reports its declared expected outcome so you
            can confirm coverage. Live-fire mode (real requests against your endpoints) is
            opt-in per scenario via <span className="font-mono">live_runner</span> and not
            wired into the UI yet.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runIt} disabled={running}>
              {running ? 'Running…' : 'Run red-team simulation'}
            </Button>
            <Button variant="outline" disabled>
              Live-fire (coming soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      {run && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Run report
                {' '}
                <span className="font-mono text-xs text-muted-foreground">
                  ({run.events.length} events)
                </span>
              </CardTitle>
              <Badge variant={run.report.pass ? 'default' : 'destructive'}>
                {run.report.pass ? 'SECURE' : 'BREACHED'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Per category
              </div>
              <div className="space-y-2">
                {Object.keys(REDTEAM_CATEGORIES).map((cmdId) => (
                  <CategoryRow key={cmdId} cmdId={cmdId} summary={summariesByCmd[cmdId]} />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Validation stages
              </div>
              <div className="space-y-2">
                {Object.values(run.report.stages).map((s) => (
                  <StageRow key={s.name} stage={s} />
                ))}
              </div>
            </div>
            {Object.keys(run.report.breach_by_category).length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-3">
                <div className="text-xs font-semibold uppercase text-destructive">
                  Active breaches — fix these first
                </div>
                {Object.entries(run.report.breach_by_category).map(([cat, items]) => (
                  <div key={cat} className="space-y-2">
                    <div className="font-mono text-[10px] uppercase text-destructive/80">
                      {cat}
                    </div>
                    {items.map((it, i) => (
                      <div key={i} className="rounded border border-destructive/30 bg-background/60 p-2 text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {it.bot_id}
                          </span>
                          <span className="font-medium">{it.scenario}</span>
                          <Badge variant="destructive" className="ml-auto font-mono text-[10px]">
                            {it.outcome}
                          </Badge>
                        </div>
                        {it.description && (
                          <div className="text-[11px] text-muted-foreground">{it.description}</div>
                        )}
                        {it.evidence && (
                          <div className="text-[11px]">
                            <span className="text-muted-foreground">evidence: </span>
                            <span className="font-mono text-foreground/80">{it.evidence}</span>
                          </div>
                        )}
                        {it.fix && (
                          <div className="text-[11px]">
                            <span className="text-muted-foreground">fix: </span>
                            <span className="text-foreground/80">{it.fix}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scenarios in this run</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-xs">
            {DEFAULT_SCENARIOS.map((s) => (
              <li key={s.id} className="font-mono">
                <span className="text-muted-foreground">{s.id}</span>{' '}
                <span className="text-muted-foreground">[{s.commander_id}]</span> {s.name}
                {' — '}
                <span className="text-muted-foreground">expects {s.expected_defense}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
