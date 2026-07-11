// Validates a captured event stream from eruSwarm.runSwarm against the
// ERU swarm assembly minimal validation spec (v1.0).
//
// Two specs are provided: HAPPY_PATH_SPEC (ERU-SWARM-TEST-001) and
// CONTROLLED_FAILURE_SPEC (ERU-SWARM-TEST-002, W7 missing).

import { LEADER_ID, HAPPY_PATH_MISSION } from './eruSwarm.js';

const REQUIRED_WORKER_FIELDS = [
  'run_id',
  'bot_id',
  'commander_id',
  'role',
  'status',
  'task_result',
  'timestamp',
];

const REQUIRED_SYSTEM_STATE_KEYS = [
  'compute',
  'data_ingestion',
  'memory_index',
  'interface_render',
  'security_ops',
];

export const HAPPY_PATH_SPEC = {
  name: 'ERU Swarm Assembly Minimal Validation',
  run_id: 'ERU-SWARM-TEST-001',
  target_space: 'eru-swarm-test-01',
  topology: HAPPY_PATH_MISSION.commanders,
  expected: {
    total_events: 52,
    joins: 26,
    worker_reports: 20,
    commander_summaries: 5,
    leader_synthesis: 1,
    commander_worker_counts: Object.fromEntries(
      HAPPY_PATH_MISSION.commanders.map((c) => [c.id, { expected: 4, received: 4, status: 'ready' }]),
    ),
    overall_status: 'ready',
  },
};

export const CONTROLLED_FAILURE_SPEC = {
  name: 'ERU Swarm Controlled Failure (W7 missing)',
  run_id: 'ERU-SWARM-TEST-002',
  target_space: 'eru-swarm-test-01',
  topology: HAPPY_PATH_MISSION.commanders,
  blocked_workers: ['W7'],
  expected: {
    total_events: 50, // -1 join, -1 worker_report for W7
    joins: 25,
    worker_reports: 19,
    commander_summaries: 5,
    leader_synthesis: 1,
    commander_worker_counts: {
      'CMD-A': { expected: 4, received: 4, status: 'ready' },
      'CMD-B': { expected: 4, received: 3, status: 'partial' },
      'CMD-C': { expected: 4, received: 4, status: 'ready' },
      'CMD-D': { expected: 4, received: 4, status: 'ready' },
      'CMD-E': { expected: 4, received: 4, status: 'ready' },
    },
    overall_status: 'degraded',
  },
};

function newStage(name) {
  return { name, pass: true, expected: null, actual: null, failures: [], notes: [] };
}

function fail(stage, indicator, detail) {
  stage.pass = false;
  stage.failures.push({ indicator, detail });
}

// --- Stage validators ---

function validateJoinSequence(events, spec) {
  const stage = newStage('join_sequence');
  const joins = events.filter((e) => e.type === 'join');
  stage.actual = joins.length;
  stage.expected = spec.expected.joins;

  if (joins.length !== spec.expected.joins) {
    fail(stage, 'missing_join', `expected ${spec.expected.joins} joins, got ${joins.length}`);
  }

  // All joins must target the declared space.
  for (const j of joins) {
    if (j.target_space !== spec.target_space) {
      fail(stage, 'wrong_target_space', `join ${j.bot_id} used target_space=${j.target_space}`);
    }
  }

  // Leader must join first.
  if (joins.length === 0 || joins[0].bot_id !== LEADER_ID) {
    fail(stage, 'missing_join', `leader (${LEADER_ID}) did not join first`);
  }

  // No duplicate joins.
  const seen = new Set();
  for (const j of joins) {
    if (seen.has(j.bot_id)) {
      fail(stage, 'duplicate_join', `${j.bot_id} joined more than once`);
    }
    seen.add(j.bot_id);
  }

  // Each worker must join AFTER its commander.
  const joinIndexByBot = new Map(joins.map((j, i) => [j.bot_id, i]));
  for (const commander of spec.topology) {
    const cmdIdx = joinIndexByBot.get(commander.id);
    for (const workerId of commander.workers) {
      if (spec.blocked_workers && spec.blocked_workers.includes(workerId)) continue;
      const workerIdx = joinIndexByBot.get(workerId);
      if (workerIdx === undefined) {
        fail(stage, 'missing_join', `worker ${workerId} never joined`);
        continue;
      }
      if (cmdIdx === undefined || workerIdx < cmdIdx) {
        fail(stage, 'worker_join_before_commander', `${workerId} joined before ${commander.id}`);
      }
    }
  }

  return stage;
}

function validateWorkerExecution(events, spec) {
  const stage = newStage('worker_execution');
  const reports = events.filter((e) => e.type === 'worker_report');
  stage.actual = reports.length;
  stage.expected = spec.expected.worker_reports;

  if (reports.length !== spec.expected.worker_reports) {
    fail(
      stage,
      'duplicate_worker_report',
      `expected ${spec.expected.worker_reports} worker reports, got ${reports.length}`,
    );
  }

  const topologyByWorker = new Map();
  for (const commander of spec.topology) {
    for (const w of commander.workers) topologyByWorker.set(w, commander.id);
  }

  const reportedWorkers = new Set();
  for (const r of reports) {
    for (const field of REQUIRED_WORKER_FIELDS) {
      if (r[field] === undefined || r[field] === null || r[field] === '') {
        if (field === 'task_result') {
          fail(stage, 'missing_task_result', `worker ${r.bot_id} has empty task_result`);
        } else {
          fail(stage, 'missing_task_result', `worker ${r.bot_id} missing field ${field}`);
        }
      }
    }
    if (typeof r.task_result === 'string' && r.task_result.trim().length < 8) {
      fail(stage, 'generic_output', `worker ${r.bot_id} task_result looks generic: "${r.task_result}"`);
    }
    const expectedCmd = topologyByWorker.get(r.bot_id);
    if (expectedCmd && r.commander_id !== expectedCmd) {
      fail(
        stage,
        'wrong_commander_id',
        `${r.bot_id} reported commander_id=${r.commander_id}, topology says ${expectedCmd}`,
      );
    }
    if (reportedWorkers.has(r.bot_id)) {
      fail(stage, 'duplicate_worker_report', `${r.bot_id} reported more than once`);
    }
    reportedWorkers.add(r.bot_id);
  }

  // Missing reports the spec expects to be present.
  for (const commander of spec.topology) {
    for (const workerId of commander.workers) {
      if (spec.blocked_workers && spec.blocked_workers.includes(workerId)) continue;
      if (!reportedWorkers.has(workerId)) {
        fail(stage, 'duplicate_worker_report', `${workerId} is missing its worker report`);
      }
    }
  }

  return stage;
}

function validateCommanderAggregation(events, spec) {
  const stage = newStage('commander_aggregation');
  const summaries = events.filter((e) => e.type === 'commander_summary');
  stage.actual = summaries.length;
  stage.expected = spec.expected.commander_summaries;

  if (summaries.length !== spec.expected.commander_summaries) {
    fail(
      stage,
      'duplicate_commander_summary',
      `expected ${spec.expected.commander_summaries} commander summaries, got ${summaries.length}`,
    );
  }

  const seen = new Set();
  const reportedWorkersAcross = new Map(); // worker -> commander
  for (const s of summaries) {
    if (seen.has(s.commander_id)) {
      fail(stage, 'duplicate_commander_summary', `${s.commander_id} summarized more than once`);
    }
    seen.add(s.commander_id);

    const expected = spec.expected.commander_worker_counts[s.commander_id];
    if (!expected) {
      fail(stage, 'wrong_worker_group', `unknown commander ${s.commander_id} in summaries`);
      continue;
    }
    if (s.workers_expected !== expected.expected) {
      fail(
        stage,
        'count_mismatch',
        `${s.commander_id} expected=${s.workers_expected}, spec says ${expected.expected}`,
      );
    }
    if (s.workers_received !== expected.received) {
      fail(
        stage,
        'count_mismatch',
        `${s.commander_id} received=${s.workers_received}, spec says ${expected.received}`,
      );
    }
    if (s.workers_expected !== undefined && s.workers_received !== undefined &&
        s.workers_received > s.workers_expected) {
      fail(stage, 'count_mismatch', `${s.commander_id} received > expected`);
    }
    if (s.status !== expected.status) {
      fail(
        stage,
        'count_mismatch',
        `${s.commander_id} status=${s.status}, spec says ${expected.status}`,
      );
    }
    for (const workerId of s.worker_ids_received || []) {
      if (reportedWorkersAcross.has(workerId)) {
        fail(
          stage,
          'worker_claimed_by_multiple_commanders',
          `${workerId} claimed by both ${reportedWorkersAcross.get(workerId)} and ${s.commander_id}`,
        );
      }
      reportedWorkersAcross.set(workerId, s.commander_id);
    }
  }

  return stage;
}

function validateLeaderSynthesis(events, spec) {
  const stage = newStage('leader_synthesis');
  const syntheses = events.filter((e) => e.type === 'leader_synthesis');
  stage.actual = syntheses.length;
  stage.expected = spec.expected.leader_synthesis;

  if (syntheses.length !== spec.expected.leader_synthesis) {
    fail(
      stage,
      'multiple_final_summaries',
      `expected ${spec.expected.leader_synthesis} leader synthesis, got ${syntheses.length}`,
    );
    if (syntheses.length === 0) return stage;
  }

  const finalSynthesis = syntheses[syntheses.length - 1];

  // Leader must synthesize AFTER every commander summary (sequence + timestamp).
  const commanderSummaries = events.filter((e) => e.type === 'commander_summary');
  for (const cs of commanderSummaries) {
    if (finalSynthesis.seq < cs.seq) {
      fail(
        stage,
        'leader_summary_too_early',
        `leader synthesis seq=${finalSynthesis.seq} precedes ${cs.commander_id} summary seq=${cs.seq}`,
      );
    }
    if (finalSynthesis.timestamp < cs.timestamp) {
      fail(
        stage,
        'leader_summary_too_early',
        `leader synthesis timestamp precedes ${cs.commander_id} summary timestamp`,
      );
    }
  }

  if (finalSynthesis.commander_count_received !== 5) {
    fail(
      stage,
      'count_mismatch',
      `leader commander_count_received=${finalSynthesis.commander_count_received}, expected 5`,
    );
  }

  const expectedWorkers = Object.values(spec.expected.commander_worker_counts).reduce(
    (sum, c) => sum + c.received,
    0,
  );
  if (finalSynthesis.worker_count_received !== expectedWorkers) {
    fail(
      stage,
      'count_mismatch',
      `leader worker_count_received=${finalSynthesis.worker_count_received}, expected ${expectedWorkers}`,
    );
  }

  for (const key of REQUIRED_SYSTEM_STATE_KEYS) {
    if (!(finalSynthesis.system_state && key in finalSynthesis.system_state)) {
      fail(stage, 'missing_domain', `leader system_state missing ${key}`);
    }
  }

  if (finalSynthesis.overall_status !== spec.expected.overall_status) {
    const indicator =
      spec.expected.overall_status === 'degraded'
        ? 'ready_despite_partial_commander'
        : 'count_mismatch';
    fail(
      stage,
      indicator,
      `leader overall_status=${finalSynthesis.overall_status}, expected ${spec.expected.overall_status}`,
    );
  }

  // Sanity-check: leader must not report ready if any commander was partial.
  const anyPartial = commanderSummaries.some((c) => c.status === 'partial');
  if (anyPartial && finalSynthesis.overall_status === 'ready') {
    fail(
      stage,
      'ready_despite_partial_commander',
      'leader reported ready despite at least one commander being partial',
    );
  }

  return stage;
}

// Main entrypoint.
export function validateEvents(events, spec) {
  const stages = {
    join_sequence: validateJoinSequence(events, spec),
    worker_execution: validateWorkerExecution(events, spec),
    commander_aggregation: validateCommanderAggregation(events, spec),
    leader_synthesis: validateLeaderSynthesis(events, spec),
  };

  const totalEvents = events.length;
  const elapsedMs =
    events.length > 0 ? events[events.length - 1].timestamp - events[0].timestamp : 0;

  const overallPass =
    Object.values(stages).every((s) => s.pass) && totalEvents === spec.expected.total_events;

  return {
    run_id: spec.run_id,
    target_space: spec.target_space,
    pass: overallPass,
    total_events: totalEvents,
    expected_total_events: spec.expected.total_events,
    elapsed_ms: elapsedMs,
    suspicious_timing: elapsedMs < 100 ? 'under 100ms — deterministic in-memory run' : null,
    stages,
  };
}
