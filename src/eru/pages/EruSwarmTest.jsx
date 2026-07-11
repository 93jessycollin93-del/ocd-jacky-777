import { useState } from 'react';
import { Button } from '@/eru/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/eru/components/ui/card';
import { Badge } from '@/eru/components/ui/badge';
import { runSwarm, HAPPY_PATH_MISSION, CONTROLLED_FAILURE_MISSION } from '@/eru/lib/eruSwarm';
import {
  validateEvents,
  HAPPY_PATH_SPEC,
  CONTROLLED_FAILURE_SPEC,
} from '@/eru/lib/eruSwarmValidator';

const STAGE_ORDER = ['join_sequence', 'worker_execution', 'commander_aggregation', 'leader_synthesis'];
const STAGE_LABELS = {
  join_sequence: 'Join sequence',
  worker_execution: 'Worker execution',
  commander_aggregation: 'Commander aggregation',
  leader_synthesis: 'Leader synthesis',
};

function StageRow({ stage }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{STAGE_LABELS[stage.name] || stage.name}</div>
        <Badge variant={stage.pass ? 'default' : 'destructive'}>{stage.pass ? 'PASS' : 'FAIL'}</Badge>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        actual={String(stage.actual)} · expected={String(stage.expected)}
      </div>
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

function ReportCard({ report, events }) {
  const [showEvents, setShowEvents] = useState(false);
  if (!report) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {report.run_id}{' '}
            <span className="font-normal text-muted-foreground">({report.target_space})</span>
          </CardTitle>
          <Badge variant={report.pass ? 'default' : 'destructive'}>
            {report.pass ? 'PASS' : 'FAIL'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          events: <span className="font-mono">{report.total_events}</span> /{' '}
          <span className="font-mono">{report.expected_total_events}</span> · elapsed{' '}
          <span className="font-mono">{report.elapsed_ms}ms</span>
          {report.suspicious_timing && (
            <span className="ml-2 text-xs text-muted-foreground">· {report.suspicious_timing}</span>
          )}
        </div>
        <div className="space-y-2">
          {STAGE_ORDER.map((name) => (
            <StageRow key={name} stage={report.stages[name]} />
          ))}
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={() => setShowEvents((v) => !v)}>
            {showEvents ? 'Hide' : 'Show'} raw event stream ({events.length})
          </Button>
          {showEvents && (
            <pre className="mt-2 max-h-96 overflow-auto rounded-md border bg-muted p-3 text-[10px] leading-tight">
              {events.map((e) => JSON.stringify(e)).join('\n')}
            </pre>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EruSwarmTest() {
  const [running, setRunning] = useState(false);
  const [t1, setT1] = useState(null); // { report, events }
  const [t2, setT2] = useState(null);

  const runBoth = async () => {
    setRunning(true);
    setT1(null);
    setT2(null);
    try {
      const e1 = await runSwarm(HAPPY_PATH_MISSION);
      setT1({ report: validateEvents(e1, HAPPY_PATH_SPEC), events: e1 });

      const e2 = await runSwarm(CONTROLLED_FAILURE_MISSION, { blockedWorkers: ['W7'] });
      setT2({ report: validateEvents(e2, CONTROLLED_FAILURE_SPEC), events: e2 });
    } finally {
      setRunning(false);
    }
  };

  const runHappy = async () => {
    setRunning(true);
    setT1(null);
    try {
      const e1 = await runSwarm(HAPPY_PATH_MISSION);
      setT1({ report: validateEvents(e1, HAPPY_PATH_SPEC), events: e1 });
    } finally {
      setRunning(false);
    }
  };

  const runFailure = async () => {
    setRunning(true);
    setT2(null);
    try {
      const e2 = await runSwarm(CONTROLLED_FAILURE_MISSION, { blockedWorkers: ['W7'] });
      setT2({ report: validateEvents(e2, CONTROLLED_FAILURE_SPEC), events: e2 });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>ERU Swarm Assembly Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            1 leader (LEADER-1) · 5 commanders (CMD-A..E) · 20 workers (W1..W20, 4 per commander).
            Test 001 runs the happy path. Test 002 blocks worker W7 to verify the system honestly
            detects the missing worker (commander CMD-B must report 3/4 and leader must report
            degraded).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runBoth} disabled={running}>
              {running ? 'Running…' : 'Run both tests'}
            </Button>
            <Button variant="outline" onClick={runHappy} disabled={running}>
              Run 001 only
            </Button>
            <Button variant="outline" onClick={runFailure} disabled={running}>
              Run 002 only (block W7)
            </Button>
          </div>
        </CardContent>
      </Card>

      {t1 && <ReportCard report={t1.report} events={t1.events} />}
      {t2 && <ReportCard report={t2.report} events={t2.events} />}
    </div>
  );
}
