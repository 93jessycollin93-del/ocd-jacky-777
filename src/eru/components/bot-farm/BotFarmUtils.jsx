export function getStatusTone(status) {
  const map = {
    idle: 'border-slate-500/20 bg-slate-500/10 text-slate-200',
    assigned: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
    active: 'border-green-500/20 bg-green-500/10 text-green-300',
    overloaded: 'border-orange-500/20 bg-orange-500/10 text-orange-300',
    blocked: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300',
    recovering: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
    maintenance: 'border-purple-500/20 bg-purple-500/10 text-purple-300',
    quarantined: 'border-red-500/20 bg-red-500/10 text-red-300',
    offline: 'border-slate-600/20 bg-slate-600/10 text-slate-400',
    strained: 'border-orange-500/20 bg-orange-500/10 text-orange-300',
  };
  return map[status] || map.idle;
}

export function getRiskTone(risk) {
  const map = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
  };
  return map[risk] || map.low;
}

export function getTaskPriorityWeight(priority) {
  return { low: 1, medium: 2, high: 3, critical: 4 }[priority] || 1;
}

export function getRoleBand(bot) {
  if (bot.role?.includes('leader')) return 'leader';
  if (bot.role?.includes('commander')) return 'commander';
  if (bot.role?.includes('security')) return 'security';
  return 'task';
}

export function computeBotFit(bot, task, squad) {
  let score = 45;
  const specialtyMatch = bot.specialty === (task.required_specialization || task.work_type);
  if (specialtyMatch) score += 28;
  score += Math.round((bot.efficiency || 0) * 0.12);
  score += Math.round((bot.integrity || 0) * 0.08);
  score += Math.round((bot.coordination_efficiency || 0) * 0.06);
  score -= Math.round((bot.fatigue || 0) * 0.16);
  score -= Math.round((bot.load || 0) * 0.14);
  score -= Math.round((task.coordination_cost || 0) * 0.8);
  if (squad) score -= Math.round((squad.coordination_overhead || 0) * 0.6);
  if (bot.status === 'maintenance' || bot.status === 'quarantined' || bot.status === 'offline') score -= 55;
  if (bot.status === 'overloaded') score -= 18;
  return Math.max(0, Math.min(100, score));
}

export function computeAssignmentQuality(bot, task, squad, commanderBoost = 0) {
  const fit = computeBotFit(bot, task, squad);
  const squadBonus = squad ? Math.round((squad.coordination_quality || 0) * 0.1) : 0;
  const commanderEffect = Math.round(commanderBoost * 0.8);
  return Math.max(10, Math.min(100, fit + squadBonus + commanderEffect));
}

export function computeOutputQuality(bot, task, squad, upgradeEffect = 0, commanderBoost = 0) {
  const assignmentQuality = computeAssignmentQuality(bot, task, squad, commanderBoost);
  const overloadPenalty = Math.max(0, (bot.load || 0) - 70) * 0.55;
  const fatiguePenalty = Math.max(0, (bot.fatigue || 0) - 45) * 0.45;
  const integrityPenalty = Math.max(0, 78 - (bot.integrity || 0)) * 0.45;
  const coordinationPenalty = Math.max(0, (task.coordination_cost || 0) + (squad?.coordination_overhead || 0) - ((bot.coordination_efficiency || 0) * 0.18));
  const upgradeBoost = Math.round(upgradeEffect * 0.9);
  return Math.max(12, Math.min(99, Math.round(assignmentQuality + upgradeBoost - overloadPenalty - fatiguePenalty - integrityPenalty - coordinationPenalty)));
}

export function computeMissionSuccessProbability(mission, squads, outputs, risks) {
  const squadStrength = squads.length ? squads.reduce((sum, squad) => sum + (squad.throughput_score || 0) + (squad.reliability_score || 0), 0) / (squads.length * 2) : 60;
  const outputStrength = outputs.length ? outputs.reduce((sum, item) => sum + (item.quality_score || 0), 0) / outputs.length : 65;
  const riskPenalty = risks.length ? risks.reduce((sum, risk) => sum + (risk.severity === 'critical' ? 14 : risk.severity === 'warning' ? 7 : 3), 0) / Math.max(1, risks.length) : 0;
  const complexityPenalty = (mission?.coordination_complexity || 0) * 0.28;
  const securityPenalty = (mission?.security_pressure || 0) * 0.18;
  return Math.max(10, Math.min(98, Math.round(squadStrength * 0.45 + outputStrength * 0.4 + 22 - riskPenalty - complexityPenalty - securityPenalty)));
}

export function summarizeFarmMetrics(bots, tasks, missions, risks, outputs, squads, upgrades) {
  const activeBots = bots.filter((bot) => bot.status === 'active').length;
  const idleBots = bots.filter((bot) => bot.status === 'idle').length;
  const overloadedBots = bots.filter((bot) => bot.status === 'overloaded').length;
  const maintenanceBots = bots.filter((bot) => bot.status === 'maintenance').length;
  const averageQuality = outputs.length ? Math.round(outputs.reduce((sum, item) => sum + (item.quality_score || 0), 0) / outputs.length) : 0;
  const missionProgress = missions.length ? Math.round(missions.reduce((sum, mission) => sum + (mission.progress || 0), 0) / missions.length) : 0;
  const queueDepth = tasks.filter((task) => ['pending', 'assigned', 'active', 'blocked', 'review'].includes(task.status)).length;
  const usedCapacity = bots.reduce((sum, bot) => sum + (bot.load || 0), 0);
  const totalCapacity = bots.reduce((sum, bot) => sum + ((bot.max_concurrent_tasks || 1) * 50), 0);
  const farmCapacity = totalCapacity ? Math.round((usedCapacity / totalCapacity) * 100) : 0;
  const rawScalePower = bots.length * 1.6 + squads.length * 4.5 + upgrades.reduce((sum, item) => sum + ((item.effect_value || 0) * (item.level || 1)), 0);
  const coordinationOverhead = squads.reduce((sum, squad) => sum + (squad.coordination_overhead || 0), 0) + Math.round(bots.length * 0.9) + Math.round(queueDepth * 1.4);
  const failurePressure = overloadedBots * 8 + maintenanceBots * 6 + risks.length * 5 + Math.max(0, farmCapacity - 72);
  const leadershipCoverage = bots.filter((bot) => getRoleBand(bot) === 'leader').reduce((sum, bot) => sum + (bot.coordination_efficiency || 0), 0);
  const commanderCoverage = bots.filter((bot) => getRoleBand(bot) === 'commander').reduce((sum, bot) => sum + (bot.coordination_efficiency || 0), 0);
  const securityCoverage = bots.filter((bot) => getRoleBand(bot) === 'security').reduce((sum, bot) => sum + ((bot.integrity || 0) + (bot.confidence || 0)) * 0.5, 0);
  const leadershipBuffer = Math.round((leadershipCoverage * 0.12) + (commanderCoverage * 0.08) + (securityCoverage * 0.05));
  const complexityLoad = upgrades.reduce((sum, item) => sum + (item.complexity_cost || 0) * (item.level || 1), 0) + Math.round(rawScalePower * 0.22);
  const squadReliability = squads.length ? Math.round(squads.reduce((sum, squad) => sum + (squad.reliability_score || 0), 0) / squads.length) : 0;
  const systemEfficiencyBase = bots.length ? Math.round(bots.reduce((sum, bot) => sum + (bot.efficiency || 0) + (bot.coordination_efficiency || 0) - ((bot.fatigue || 0) * 0.2), 0) / (bots.length * 2)) : 0;
  const netStrain = Math.max(0, coordinationOverhead + failurePressure + complexityLoad - leadershipBuffer);
  const systemEfficiency = Math.max(0, Math.min(100, systemEfficiencyBase + Math.round(rawScalePower * 0.08) - Math.round(netStrain * 0.22)));

  return {
    total_bots: bots.length,
    active_bots: activeBots,
    idle_bots: idleBots,
    overloaded_bots: overloadedBots,
    maintenance_bots: maintenanceBots,
    output_rate: outputs.reduce((sum, item) => sum + (item.value_score || 0), 0),
    mission_progress: missionProgress,
    system_efficiency: systemEfficiency,
    integrity_warning_count: bots.filter((bot) => (bot.integrity || 0) < 70).length,
    security_alert_count: risks.filter((risk) => risk.severity === 'critical').length,
    task_queue_depth: queueDepth,
    average_output_quality: averageQuality,
    capacity_usage: farmCapacity,
    squad_reliability: squadReliability,
    management_tradeoff: complexityLoad,
    scale_power: Math.round(rawScalePower),
    coordination_overhead: coordinationOverhead,
    failure_pressure: failurePressure,
    leadership_buffer: leadershipBuffer,
    net_strain: Math.round(netStrain),
  };
}

export function sortTasks(tasks, mode) {
  const sorted = [...tasks];
  sorted.sort((a, b) => {
    if (mode === 'priority') return getTaskPriorityWeight(b.priority) - getTaskPriorityWeight(a.priority);
    if (mode === 'urgency') return (b.urgency || 0) - (a.urgency || 0);
    if (mode === 'risk') return (b.risk || 0) - (a.risk || 0);
    if (mode === 'value') return (b.expected_output_value || 0) - (a.expected_output_value || 0);
    return (b.bot_fit_score || 0) - (a.bot_fit_score || 0);
  });
  return sorted;
}

export function buildRoleSummary(bots) {
  return {
    leader: bots.filter((bot) => getRoleBand(bot) === 'leader'),
    commanders: bots.filter((bot) => getRoleBand(bot) === 'commander'),
    taskBots: bots.filter((bot) => getRoleBand(bot) === 'task'),
    security: bots.filter((bot) => getRoleBand(bot) === 'security'),
  };
}

export function computeMissionSimulation({ mission, selectedBots, squads, upgrades }) {
  const assignedSquads = squads.filter((squad) => (mission?.assigned_squad_ids || []).includes(squad.id));
  const upgradeEffect = upgrades.reduce((sum, item) => sum + (item.effect_value || 0) * (item.level || 1), 0) / Math.max(1, upgrades.length || 1);
  const availableBots = selectedBots.filter((bot) => !['maintenance', 'quarantined', 'offline'].includes(bot.status));
  const securityBots = availableBots.filter((bot) => getRoleBand(bot) === 'security');
  const matchingBots = availableBots.filter((bot) => bot.specialty === ((mission?.objective && mission.objective.includes('security')) ? 'security' : bot.specialty));
  const averageEfficiency = availableBots.length ? availableBots.reduce((sum, bot) => sum + (bot.efficiency || 0), 0) / availableBots.length : 0;
  const averageIntegrity = availableBots.length ? availableBots.reduce((sum, bot) => sum + (bot.integrity || 0), 0) / availableBots.length : 0;
  const averageFatigue = availableBots.length ? availableBots.reduce((sum, bot) => sum + (bot.fatigue || 0), 0) / availableBots.length : 0;
  const averageLoad = availableBots.length ? availableBots.reduce((sum, bot) => sum + (bot.load || 0), 0) / availableBots.length : 0;
  const coordinationSupport = availableBots.length ? availableBots.reduce((sum, bot) => sum + (bot.coordination_efficiency || 0), 0) / availableBots.length : 0;
  const squadReliability = assignedSquads.length ? assignedSquads.reduce((sum, squad) => sum + (squad.reliability_score || 0), 0) / assignedSquads.length : 70;
  const squadOverhead = assignedSquads.length ? assignedSquads.reduce((sum, squad) => sum + (squad.coordination_overhead || 0), 0) / assignedSquads.length : 10;
  const specialtyCoverage = availableBots.length ? Math.min(100, Math.round((matchingBots.length / availableBots.length) * 100) + 35) : 0;
  const securityResilience = Math.max(0, Math.min(100, Math.round((securityBots.length ? securityBots.reduce((sum, bot) => sum + ((bot.integrity || 0) + (bot.confidence || 0)) / 2, 0) / securityBots.length : averageIntegrity * 0.78) - (mission?.security_pressure || 0) * 0.35)));
  const coordinationLoad = Math.max(0, Math.round((mission?.coordination_complexity || 0) + squadOverhead - coordinationSupport * 0.22 + Math.max(0, availableBots.length - 4) * 4));
  const fatiguePressure = Math.max(0, Math.round(averageFatigue + averageLoad * 0.45 + Math.max(0, (mission?.coordination_complexity || 0) - coordinationSupport) * 0.18));
  const projectedOutcome = Math.max(8, Math.min(99, Math.round(
    specialtyCoverage * 0.26 +
    averageEfficiency * 0.24 +
    averageIntegrity * 0.18 +
    squadReliability * 0.12 +
    coordinationSupport * 0.12 +
    securityResilience * 0.08 +
    upgradeEffect * 0.4 -
    coordinationLoad * 0.24 -
    fatiguePressure * 0.18
  )));

  const coverageFit = Math.max(0, Math.min(100, Math.round((specialtyCoverage * 0.6) + (coordinationSupport * 0.4) - Math.max(0, availableBots.length - 5) * 4)));
  const riskScore = Math.round(
    (mission?.security_pressure || 0) * 0.32 +
    (mission?.coordination_complexity || 0) * 0.24 +
    fatiguePressure * 0.28 +
    Math.max(0, 70 - securityResilience) * 0.22 +
    Math.max(0, 68 - projectedOutcome) * 0.18
  );

  const riskLevel = riskScore >= 78 ? 'critical' : riskScore >= 58 ? 'high' : riskScore >= 36 ? 'medium' : 'low';
  const riskSummary =
    availableBots.length === 0 ? 'No viable bots are in the simulation yet.' :
    riskLevel === 'critical' ? 'This lineup is likely to stall under strain or trigger serious mission risk.' :
    riskLevel === 'high' ? 'This team can run the mission, but coordination or security pressure is elevated.' :
    riskLevel === 'medium' ? 'This setup looks workable, though a stronger specialty or security mix would help.' :
    'This combination looks stable for a pre-mission commit check.';

  const highlights = [
    availableBots.length === 0 ? 'Add bots to generate a projection.' : `${availableBots.length} active-ready bots included in the simulation.`,
    `Specialty coverage is ${specialtyCoverage}% against mission demands.`,
    `Estimated coordination load sits at ${coordinationLoad}, with fatigue pressure at ${fatiguePressure}.`,
    `Security resilience projects at ${securityResilience}% for this mission profile.`,
  ];

  return {
    projectedOutcome,
    riskLevel,
    riskSummary,
    coverageFit,
    coordinationLoad,
    fatiguePressure,
    securityResilience,
    highlights,
  };
}

export function getBotFarmScalingSnapshot({ bots, squads, tasks }) {
  const queueDepth = tasks.filter((task) => ['pending', 'assigned', 'active', 'blocked', 'review'].includes(task.status)).length;
  const taskSquads = squads.filter((squad) => squad.role_type === 'task');
  const idleTaskBots = bots.filter((bot) => getRoleBand(bot) === 'task' && bot.status === 'idle').length;
  const strainedTaskSquads = taskSquads.filter((squad) => ['strained', 'active'].includes(squad.status) && (squad.current_load || 0) >= ((squad.capacity_limit || 100) * 0.7));
  const lowPressureTaskSquads = taskSquads.filter((squad) => (squad.current_load || 0) <= ((squad.capacity_limit || 100) * 0.38));
  const cohesionScore = taskSquads.length
    ? Math.max(0, Math.min(100, Math.round(taskSquads.reduce((sum, squad) => sum + ((squad.coordination_quality || 0) - (squad.coordination_overhead || 0) * 0.45), 0) / taskSquads.length)))
    : 0;
  const scaleUpThreshold = 8;
  const scaleDownThreshold = 3;
  const canScaleUp = queueDepth >= scaleUpThreshold && idleTaskBots >= 2;
  const canScaleDown = queueDepth <= scaleDownThreshold && lowPressureTaskSquads.length > 0;
  const recommendation = canScaleUp ? 'Scale up' : canScaleDown ? 'Scale down' : 'Hold';
  const scaleState = canScaleUp ? 'expand' : canScaleDown ? 'compress' : 'steady';

  return {
    queueDepth,
    scaleState,
    scaleUpThreshold,
    scaleDownThreshold,
    cohesionScore,
    recommendation,
    expandableSquads: strainedTaskSquads.length || taskSquads.length,
    idleTaskBots,
    canScaleUp,
    canScaleDown,
    notes: [
      `Task-bot idle reserve is ${idleTaskBots}, which ${idleTaskBots >= 2 ? 'supports' : 'limits'} fast expansion.`,
      `${strainedTaskSquads.length} task squads are under sustained queue pressure.`,
      `${lowPressureTaskSquads.length} task squads are currently light enough to compress safely.`,
    ]
  };
}