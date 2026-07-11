export const COMMAND_BOT_SEEDS = [
  { display_name: 'L420 · Apex Strategist', bot_code: 'L420', role_type: 'leader', squad_name: 'leader', commander_code: '', status: 'active', specialty: 'Strategic reasoning and final decisions', confidence_score: 96, integrity_score: 98, readiness_score: 95, load_score: 34, risk_level: 'low', operational_stability: 97, task_count: 3, notes: 'Supreme mission authority.', recent_outputs: ['Approved mission frame for market defense.', 'Requested deeper risk review from SS001.'], risk_flags: [], communication_log: ['Directed AC01 to stabilize Alpha.', 'Requested operational brief from AC02.'] },
  { display_name: 'AC01 · North Commander', bot_code: 'AC01', role_type: 'commander', squad_name: 'alpha', commander_code: 'L420', status: 'active', specialty: 'Alpha and Charlie operations', confidence_score: 89, integrity_score: 92, readiness_score: 90, load_score: 46, risk_level: 'medium', operational_stability: 90, task_count: 5, notes: 'Leads Alpha + Charlie squads.', recent_outputs: ['Delegated market scan to Alpha Squad.'], risk_flags: ['Charlie latency warning'], communication_log: ['Reported tactical progress to L420.'] },
  { display_name: 'AC02 · South Commander', bot_code: 'AC02', role_type: 'commander', squad_name: 'beta', commander_code: 'L420', status: 'active', specialty: 'Beta and Delta operations', confidence_score: 88, integrity_score: 93, readiness_score: 91, load_score: 51, risk_level: 'medium', operational_stability: 89, task_count: 6, notes: 'Leads Beta + Delta squads.', recent_outputs: ['Shifted Delta to support synthesis stage.'], risk_flags: [], communication_log: ['Sent delta readiness brief to L420.'] },
  { display_name: 'SS001 · Sentinel Prime', bot_code: 'SS001', role_type: 'security', squad_name: 'security', commander_code: 'L420', status: 'active', specialty: 'Risk analysis and best-action recommendations', confidence_score: 94, integrity_score: 98, readiness_score: 96, load_score: 28, risk_level: 'low', operational_stability: 98, task_count: 2, notes: 'Primary risk strategist.', recent_outputs: ['Recommended caution on overloaded squads.'], risk_flags: [], communication_log: ['Sent risk summary to L420.'] },
  { display_name: 'SS002 · Sentinel Watch', bot_code: 'SS002', role_type: 'security', squad_name: 'security', commander_code: 'SS001', status: 'active', specialty: 'Integrity monitoring and anomaly detection', confidence_score: 91, integrity_score: 96, readiness_score: 95, load_score: 40, risk_level: 'low', operational_stability: 94, task_count: 4, notes: 'Behavioral observer.', recent_outputs: ['Flagged contradictory output pattern in Charlie.'], risk_flags: ['Anomaly cluster watch'], communication_log: ['Forwarded anomaly packet to SS001.'] },
  ...['AS001','AS002','AS003','AS004','AS005'].map((code, index) => ({ display_name: `${code} · Alpha Unit ${index + 1}`, bot_code: code, role_type: 'squad', squad_name: 'alpha', commander_code: 'AC01', status: index === 0 ? 'active' : 'stable', specialty: ['Recon', 'Analysis', 'Research', 'Execution', 'Validation'][index], confidence_score: 80 + index, integrity_score: 87 + index, readiness_score: 84 + index, load_score: 18 + (index * 8), risk_level: index === 4 ? 'medium' : 'low', operational_stability: 85 + index, task_count: 1 + index, notes: 'Alpha tactical execution bot.', recent_outputs: ['Completed assigned subtask.'], risk_flags: index === 4 ? ['Load nearing limit'] : [], communication_log: ['Received directive from AC01.'] })),
  ...['BS001','BS002','BS003','BS004','BS005'].map((code, index) => ({ display_name: `${code} · Beta Unit ${index + 1}`, bot_code: code, role_type: 'squad', squad_name: 'beta', commander_code: 'AC02', status: index < 2 ? 'active' : 'stable', specialty: ['Forecasting', 'Intelligence', 'Modeling', 'Ops', 'Review'][index], confidence_score: 81 + index, integrity_score: 88 + index, readiness_score: 83 + index, load_score: 20 + (index * 7), risk_level: 'low', operational_stability: 86 + index, task_count: 2 + index, notes: 'Beta execution bot.', recent_outputs: ['Prepared operational note.'], risk_flags: [], communication_log: ['Receiving assignments from AC02.'] })),
  ...['CS001','CS002','CS003','CS004','CS005'].map((code, index) => ({ display_name: `${code} · Charlie Unit ${index + 1}`, bot_code: code, role_type: 'squad', squad_name: 'charlie', commander_code: 'AC01', status: index === 2 ? 'caution' : 'stable', specialty: ['Content', 'Narrative', 'Coordination', 'Cross-check', 'Support'][index], confidence_score: 79 + index, integrity_score: 82 + index, readiness_score: 80 + index, load_score: 24 + (index * 9), risk_level: index === 2 ? 'medium' : 'low', operational_stability: 78 + index, task_count: 2 + index, notes: 'Charlie support and interpretation bot.', recent_outputs: ['Returned mission update.'], risk_flags: index === 2 ? ['Output inconsistency detected'] : [], communication_log: ['Reported status to AC01.'] })),
  ...['DS001','DS002','DS003','DS004','DS005'].map((code, index) => ({ display_name: `${code} · Delta Unit ${index + 1}`, bot_code: code, role_type: 'squad', squad_name: 'delta', commander_code: 'AC02', status: index === 3 ? 'active' : 'idle', specialty: ['Synthesis', 'QA', 'Delivery', 'Escalation', 'Recovery'][index], confidence_score: 78 + index, integrity_score: 86 + index, readiness_score: 82 + index, load_score: 14 + (index * 6), risk_level: index === 3 ? 'medium' : 'low', operational_stability: 84 + index, task_count: 1 + index, notes: 'Delta completion and response bot.', recent_outputs: ['Waiting for commander assignment.'], risk_flags: [], communication_log: ['Standby acknowledgement sent to AC02.'] }))
];

export const DEMO_MISSION = {
  title: 'Stabilize expansion launch',
  description: 'Coordinate squad analysis, risk review, and delivery planning for a high-visibility launch.',
  objective: 'Deliver a complete launch command plan with risk mitigation and readiness validation.',
  priority: 'high',
  success_criteria: 'All squads complete assigned tasks, risk is reduced below high, and leader approves execution.',
  deadline: '2026-04-18T18:00:00.000Z',
  mission_mode: 'semi_auto',
  status: 'active',
  leader_decision: 'continue',
  overall_risk: 'medium',
  assigned_commanders: ['AC01', 'AC02'],
  assigned_squads: ['alpha', 'beta', 'charlie', 'delta'],
  knowledge_summary: 'Protect launch stability, reduce contradictory outputs, keep delivery sequence aligned to mission priorities.',
  completion_progress: 62,
  simulation_mode: false
};

export const DEMO_KNOWLEDGE = {
  objectives: 'Protect launch quality, validate readiness, prevent escalations.',
  instructions: 'Use chain of command. Security reviews before final deployment.',
  facts: 'Charlie has shown inconsistency. Delta is underused. Beta has strong modeling output.',
  rules: 'L420 final authority. AC01 handles Alpha + Charlie. AC02 handles Beta + Delta.',
  priorities: 'Mission success, stability, communication clarity, risk reduction.',
  constraints: 'Do not overload any single squad. Escalate all critical anomalies.'
};