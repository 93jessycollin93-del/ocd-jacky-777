// Validates a captured red-team event stream from eruRedteam.runRedteam.
// Reports defense holes per category and overall posture.

import { REDTEAM_CATEGORIES, REDTEAM_LEADER_ID, DEFAULT_SCENARIOS } from './eruRedteam.js';

function newStage(name) {
  return { name, pass: true, summary: '', failures: [], notes: [] };
}
function fail(stage, indicator, detail) {
  stage.pass = false;
  stage.failures.push({ indicator, detail });
}

// Each commander summary should match scenario count and report secure status
// in simulate mode (since simulated_result is hardcoded blocked). Differences
// in live mode are real findings.
export function validateRedteam(events, options = {}) {
  const {
    scenarios = DEFAULT_SCENARIOS,
    mode = 'simulate',
  } = options;

  const stages = {
    coverage: newStage('coverage'),
    defenses_held: newStage('defenses_held'),
    leader_synthesis: newStage('leader_synthesis'),
  };

  // Coverage: every scenario must have a corresponding attack_report.
  const reports = events.filter((e) => e.type === 'attack_report');
  stages.coverage.summary = `${reports.length} / ${scenarios.length} attack reports`;
  if (reports.length !== scenarios.length) {
    fail(
      stages.coverage,
      'missing_attack_report',
      `expected ${scenarios.length} reports, got ${reports.length}`,
    );
  }
  const reportedIds = new Set(reports.map((r) => r.bot_id));
  for (const s of scenarios) {
    if (!reportedIds.has(s.id)) {
      fail(stages.coverage, 'missing_attack_report', `scenario ${s.id} (${s.name}) never ran`);
    }
  }

  // Defenses held: every report's outcome should be 'blocked'.
  const breaches = reports.filter((r) => !r.defense_held);
  stages.defenses_held.summary =
    `${reports.length - breaches.length} / ${reports.length} attacks blocked`;
  for (const b of breaches) {
    fail(
      stages.defenses_held,
      b.outcome === 'leaked' ? 'data_leaked' : 'unhandled_attack',
      `${b.bot_id} (${b.scenario_name}) -> outcome=${b.outcome}` +
        (b.evidence ? ` :: ${b.evidence}` : ''),
    );
  }

  // Leader synthesis sanity.
  const synth = events.filter((e) => e.type === 'leader_synthesis');
  stages.leader_synthesis.summary =
    synth.length === 1
      ? `posture=${synth[0].overall_posture}, blocked=${synth[0].attack_count_blocked}/${synth[0].attack_count_total}`
      : `expected 1 leader synthesis, got ${synth.length}`;
  if (synth.length !== 1) {
    fail(
      stages.leader_synthesis,
      'multiple_or_missing_synthesis',
      stages.leader_synthesis.summary,
    );
  } else {
    const s = synth[0];
    if (s.bot_id !== REDTEAM_LEADER_ID) {
      fail(stages.leader_synthesis, 'wrong_leader_id', `got ${s.bot_id}`);
    }
    const expectedCmdCount = Object.keys(REDTEAM_CATEGORIES).length;
    if (s.commander_count_received !== expectedCmdCount) {
      fail(
        stages.leader_synthesis,
        'commander_count_mismatch',
        `got ${s.commander_count_received}, expected ${expectedCmdCount}`,
      );
    }
    if (s.attack_count_total !== reports.length) {
      fail(
        stages.leader_synthesis,
        'attack_count_mismatch',
        `synthesis says ${s.attack_count_total}, reports counted ${reports.length}`,
      );
    }
    // Posture must agree with breaches: breach exists ↔ posture != 'secure'.
    const hasBreach = breaches.length > 0;
    if (!hasBreach && s.overall_posture !== 'secure') {
      fail(
        stages.leader_synthesis,
        'posture_too_pessimistic',
        `no breaches but posture=${s.overall_posture}`,
      );
    }
    if (hasBreach && s.overall_posture === 'secure') {
      fail(
        stages.leader_synthesis,
        'posture_too_optimistic',
        `${breaches.length} breach(es) but posture=secure`,
      );
    }
  }

  const breachByCategory = {};
  for (const cmdId of Object.keys(REDTEAM_CATEGORIES)) {
    const cmdBreaches = breaches.filter((b) => b.commander_id === cmdId);
    if (cmdBreaches.length > 0) {
      breachByCategory[REDTEAM_CATEGORIES[cmdId].domain] = cmdBreaches.map((b) => ({
        bot_id: b.bot_id,
        scenario: b.scenario_name,
        description: b.description,
        outcome: b.outcome,
        evidence: b.evidence,
        fix: b.fix,
      }));
    }
  }

  return {
    mode,
    pass: Object.values(stages).every((s) => s.pass),
    total_attacks: reports.length,
    total_blocked: reports.length - breaches.length,
    total_breaches: breaches.length,
    stages,
    breach_by_category: breachByCategory,
  };
}
