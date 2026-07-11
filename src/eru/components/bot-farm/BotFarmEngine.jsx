export const FARM_STRUCTURE = {
  leaderCount: 1,
  commanderCount: 2,
  taskBotCount: 20,
  securityBotCount: 2,
};

export function getBotRoleGroup(bot) {
  if (bot.role_type === 'leader') return 'leader';
  if (bot.role_type === 'commander') return 'commander';
  if (bot.role_type === 'security') return 'security';
  return 'task';
}

export function computeSpecializationFit(bot, task) {
  let fit = bot.specialty === task.work_type ? 38 : 12;
  fit += Math.round((bot.efficiency || 0) * 0.16);
  fit += Math.round((bot.confidence || 0) * 0.08);
  fit += Math.round((bot.integrity || 0) * 0.1);
  fit -= Math.round((bot.fatigue || 0) * 0.18);
  fit -= Math.round((bot.load || 0) * 0.16);
  if ((bot.status || 'idle') === 'idle') fit += 8;
  if (['overloaded', 'blocked', 'maintenance', 'quarantined', 'offline'].includes(bot.status)) fit -= 30;
  return Math.max(0, Math.min(100, fit));
}

export function computeCoordinationPenalty({ bot, squad, mission, commander, leader, upgrades }) {
  const squadPenalty = Math.max(0, ((squad?.member_bot_ids?.length || 0) - 5) * 1.8);
  const missionPenalty = Math.max(0, ((mission?.coordination_complexity || 0) - 45) * 0.35);
  const botLoadPenalty = Math.max(0, ((bot?.load || 0) - 60) * 0.4);
  const commanderPenalty = Math.max(0, 75 - (commander?.coordination_efficiency || 75)) * 0.22;
  const leaderPenalty = Math.max(0, 78 - (leader?.coordination_efficiency || 78)) * 0.18;
  const squadSecurityPenalty = (squad?.security_overhead || 0) * 0.45;
  const upgradeRelief = (upgrades || []).reduce((sum, upgrade) => {
    if (upgrade.upgrade_type === 'coordination') return sum + (upgrade.effect_value || 0) * 0.6;
    if (upgrade.upgrade_type === 'communication_speed') return sum + (upgrade.effect_value || 0) * 0.4;
    return sum;
  }, 0);
  return Math.max(0, Math.round(squadPenalty + missionPenalty + botLoadPenalty + commanderPenalty + leaderPenalty + squadSecurityPenalty - upgradeRelief));
}

export function computeManagementBoost({ leader, commander, upgrades }) {
  const leaderBoost = Math.max(0, ((leader?.coordination_efficiency || 70) - 70) * 0.35);
  const commanderBoost = Math.max(0, ((commander?.coordination_efficiency || 70) - 70) * 0.4);
  const upgradeBoost = (upgrades || []).reduce((sum, upgrade) => {
    if (['processing_quality', 'squad_efficiency', 'verification_quality'].includes(upgrade.upgrade_type)) {
      return sum + (upgrade.effect_value || 0) * 0.45;
    }
    return sum;
  }, 0);
  return Math.round(leaderBoost + commanderBoost + upgradeBoost);
}

export function computeOutputScores({ bot, task, squad, mission, commander, leader, upgrades }) {
  const fit = computeSpecializationFit(bot, task);
  const coordinationPenalty = computeCoordinationPenalty({ bot, squad, mission, commander, leader, upgrades });
  const managementBoost = computeManagementBoost({ leader, commander, upgrades });
  const overloadPenalty = Math.max(0, ((bot.load || 0) - 72) * 0.55);
  const fatiguePenalty = Math.max(0, ((bot.fatigue || 0) - 48) * 0.45);
  const integrityPenalty = Math.max(0, (76 - (bot.integrity || 76)) * 0.55);
  const quality = Math.max(18, Math.min(99, Math.round(fit + managementBoost - coordinationPenalty - overloadPenalty - fatiguePenalty - integrityPenalty)));
  const value = Math.max(10, Math.min(100, Math.round(((task.expected_output_value || 50) * 0.55) + (quality * 0.45) - (task.risk || 0) * 0.18)));
  const contradictionRisk = Math.max(0, Math.min(100, Math.round(((100 - quality) * 0.55) + Math.max(0, ((task.risk || 0) - 35) * 0.6) + Math.max(0, ((bot.load || 0) - 70) * 0.4))));
  return { fit, quality, value, coordinationPenalty, managementBoost, contradictionRisk };
}

export function summarizeOperationalMetrics({ bots, squads, tasks, missions, risks, outputs, upgrades }) {
  const leader = bots.find((bot) => bot.role_type === 'leader');
  const commanders = bots.filter((bot) => bot.role_type === 'commander');
  const securityBots = bots.filter((bot) => bot.role_type === 'security');
  const taskBots = bots.filter((bot) => getBotRoleGroup(bot) === 'task');
  const queueDepth = tasks.filter((task) => !['complete', 'failed'].includes(task.status)).length;
  const activeTasks = tasks.filter((task) => ['assigned', 'active', 'review'].includes(task.status)).length;
  const idleBots = bots.filter((bot) => bot.status === 'idle').length;
  const overloadedBots = bots.filter((bot) => bot.status === 'overloaded').length;
  const maintenanceBots = bots.filter((bot) => ['maintenance', 'recovering'].includes(bot.status)).length;
  const avgLoad = bots.length ? Math.round(bots.reduce((sum, bot) => sum + (bot.load || 0), 0) / bots.length) : 0;
  const avgFatigue = bots.length ? Math.round(bots.reduce((sum, bot) => sum + (bot.fatigue || 0), 0) / bots.length) : 0;
  const avgIntegrity = bots.length ? Math.round(bots.reduce((sum, bot) => sum + (bot.integrity || 0), 0) / bots.length) : 0;
  const totalOutputValue = outputs.reduce((sum, item) => sum + (item.value_score || 0), 0);
  const avgOutputQuality = outputs.length ? Math.round(outputs.reduce((sum, item) => sum + (item.quality_score || 0), 0) / outputs.length) : 0;
  const missionSuccess = missions.length ? Math.round(missions.reduce((sum, mission) => sum + (mission.progress || 0), 0) / missions.length) : 0;
  const squadCoordination = squads.length ? Math.round(squads.reduce((sum, squad) => sum + (squad.coordination_quality || 0), 0) / squads.length) : 0;
  const systemComplexity = Math.round((bots.length * 0.8) + (squads.length * 5) + (queueDepth * 0.9) + (upgrades.length * 1.4));
  const leaderEfficiency = leader?.coordination_efficiency || 0;
  const commanderCoverage = commanders.length;
  const securityCoverage = securityBots.length;
  const taskCapacity = taskBots.reduce((sum, bot) => sum + (bot.max_concurrent_tasks || 1), 0);
  const bottleneckScore = Math.max(0, Math.min(100, Math.round((avgLoad * 0.4) + (avgFatigue * 0.25) + (queueDepth * 1.8) - (squadCoordination * 0.2))));
  const farmEfficiency = Math.max(15, Math.min(100, Math.round((leaderEfficiency * 0.18) + (squadCoordination * 0.24) + (avgOutputQuality * 0.28) + (avgIntegrity * 0.18) - (avgLoad * 0.14) - (avgFatigue * 0.16))));

  return {
    total_bots: bots.length,
    leader_count: leader ? 1 : 0,
    commander_count: commanderCoverage,
    security_count: securityCoverage,
    task_bot_count: taskBots.length,
    active_bots: bots.filter((bot) => ['assigned', 'active', 'review'].includes(bot.status)).length,
    idle_bots: idleBots,
    overloaded_bots: overloadedBots,
    maintenance_bots: maintenanceBots,
    output_rate: totalOutputValue,
    mission_progress: missionSuccess,
    system_efficiency: farmEfficiency,
    integrity_warning_count: bots.filter((bot) => (bot.integrity || 0) < 72).length,
    security_alert_count: risks.filter((risk) => risk.status !== 'resolved').length,
    task_queue_depth: queueDepth,
    active_tasks: activeTasks,
    task_capacity: taskCapacity,
    avg_load: avgLoad,
    avg_fatigue: avgFatigue,
    avg_integrity: avgIntegrity,
    avg_output_quality: avgOutputQuality,
    squad_coordination: squadCoordination,
    bottleneck_score: bottleneckScore,
    scaling_complexity: systemComplexity,
  };
}

export function evaluateSquadReliability(squadBots, squad, risks) {
  const avgIntegrity = squadBots.length ? squadBots.reduce((sum, bot) => sum + (bot.integrity || 0), 0) / squadBots.length : 0;
  const avgFatigue = squadBots.length ? squadBots.reduce((sum, bot) => sum + (bot.fatigue || 0), 0) / squadBots.length : 0;
  const openRiskCount = risks.length;
  return Math.max(10, Math.min(100, Math.round((avgIntegrity * 0.55) + ((squad?.coordination_quality || 0) * 0.35) - (avgFatigue * 0.22) - (openRiskCount * 6))));
}

export function deriveTaskStatus(progress) {
  if (progress >= 100) return 'complete';
  if (progress >= 75) return 'review';
  if (progress > 0) return 'active';
  return 'assigned';
}