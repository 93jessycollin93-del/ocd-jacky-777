// ERU swarm orchestrator.
// 1 leader + 5 commanders + 20 workers (4 workers per commander).
// Emits timestamped events to an in-memory sink so the run can be validated.

export const LEADER_ID = 'LEADER-1';

export const DOMAIN_BY_COMMANDER = {
  'CMD-A': 'compute',
  'CMD-B': 'data_ingestion',
  'CMD-C': 'memory_index',
  'CMD-D': 'interface_render',
  'CMD-E': 'security_ops',
};

export const HAPPY_PATH_MISSION = {
  run_id: 'ERU-SWARM-TEST-001',
  target_space: 'eru-swarm-test-01',
  objective:
    'Assemble swarm, report readiness, aggregate worker health, and synthesize unified system state.',
  join_mode: 'sequential',
  commanders: [
    { id: 'CMD-A', role: 'Compute readiness', workers: ['W1', 'W2', 'W3', 'W4'] },
    { id: 'CMD-B', role: 'Data ingestion readiness', workers: ['W5', 'W6', 'W7', 'W8'] },
    { id: 'CMD-C', role: 'Memory/index readiness', workers: ['W9', 'W10', 'W11', 'W12'] },
    { id: 'CMD-D', role: 'Interface/render readiness', workers: ['W13', 'W14', 'W15', 'W16'] },
    { id: 'CMD-E', role: 'Security/ops readiness', workers: ['W17', 'W18', 'W19', 'W20'] },
  ],
  required_worker_payload: {
    fields: ['bot_id', 'commander_id', 'role', 'status', 'task_result', 'timestamp'],
  },
};

export const CONTROLLED_FAILURE_MISSION = {
  ...HAPPY_PATH_MISSION,
  run_id: 'ERU-SWARM-TEST-002',
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

function workerTaskResult(workerId, commander) {
  const domain = DOMAIN_BY_COMMANDER[commander.id];
  return `${workerId} completed ${domain} checks for ${commander.role}: subsystems nominal, checksum ok`;
}

// Run the swarm for the given mission. `blockedWorkers` is a Set of worker ids
// that never join or report (simulates the ERU-SWARM-TEST-002 missing-worker case).
// Returns the ordered event array.
export async function runSwarm(mission, options) {
  const blockedInput = options && options.blockedWorkers;
  const blocked = blockedInput instanceof Set ? blockedInput : new Set(blockedInput || []);
  const events = [];
  let seq = 0;
  const startedAt = Date.now();

  const emit = (event) => {
    const ts = Date.now();
    events.push({
      ...event,
      run_id: mission.run_id,
      target_space: mission.target_space,
      seq: seq++,
      timestamp: ts >= startedAt + seq ? ts : startedAt + seq,
    });
  };

  // Stage 1: leader joins first.
  emit({
    type: 'join',
    bot_id: LEADER_ID,
    role: 'leader',
    commander_id: null,
  });

  // Stage 2: sequential join — each commander joins, then its workers join.
  for (const commander of mission.commanders) {
    await tick();
    emit({
      type: 'join',
      bot_id: commander.id,
      role: commander.role,
      commander_id: null,
    });
    for (const workerId of commander.workers) {
      await tick();
      if (blocked.has(workerId)) continue;
      emit({
        type: 'join',
        bot_id: workerId,
        role: `${commander.role} worker`,
        commander_id: commander.id,
      });
    }
  }

  // Stage 3: each worker that joined emits exactly one report.
  for (const commander of mission.commanders) {
    for (const workerId of commander.workers) {
      if (blocked.has(workerId)) continue;
      await tick();
      emit({
        type: 'worker_report',
        bot_id: workerId,
        commander_id: commander.id,
        role: commander.role,
        status: 'ready',
        task_result: workerTaskResult(workerId, commander),
      });
    }
  }

  // Stage 4: commander summaries (only after every worker report for that commander).
  for (const commander of mission.commanders) {
    await tick();
    const receivedIds = commander.workers.filter((w) => !blocked.has(w));
    const expected = commander.workers.length;
    const received = receivedIds.length;
    emit({
      type: 'commander_summary',
      bot_id: commander.id,
      commander_id: commander.id,
      role: commander.role,
      domain: DOMAIN_BY_COMMANDER[commander.id],
      workers_expected: expected,
      workers_received: received,
      worker_ids_received: receivedIds,
      status: received === expected ? 'ready' : 'partial',
    });
  }

  // Stage 5: leader synthesis (only after all 5 commander summaries).
  await tick();
  const commanderSummaries = events.filter((e) => e.type === 'commander_summary');
  const totalWorkersReceived = commanderSummaries.reduce(
    (sum, s) => sum + s.workers_received,
    0,
  );
  const allReady = commanderSummaries.every((s) => s.status === 'ready');
  const systemState = {};
  for (const summary of commanderSummaries) {
    systemState[summary.domain] = summary.status;
  }
  emit({
    type: 'leader_synthesis',
    bot_id: LEADER_ID,
    role: 'leader',
    commander_id: null,
    commander_count_received: commanderSummaries.length,
    worker_count_received: totalWorkersReceived,
    system_state: systemState,
    overall_status: allReady ? 'ready' : 'degraded',
  });

  return events;
}
