export function clampBotMetric(value) {
  return Math.max(0, Math.min(100, Math.round(value || 0)));
}

export function buildPredictiveTrend(bot, maintenanceLogs = []) {
  const relevantLogs = maintenanceLogs.filter((item) => item.bot_id === bot.id).slice(0, 6);
  const outputBaseline = clampBotMetric((bot.output_quality || 0) - 10);
  const base = [
    clampBotMetric((bot.integrity || 0) - 16),
    clampBotMetric((bot.integrity || 0) - 10),
    clampBotMetric((bot.integrity || 0) - 6),
    clampBotMetric((bot.integrity || 0) - 2),
    clampBotMetric(bot.integrity || 0),
  ];

  if (!relevantLogs.length) {
    return base.map((point, index) => clampBotMetric(point - Math.max(0, (bot.fatigue || 0) - 45) * 0.08 * index + Math.max(0, 72 - outputBaseline) * 0.04 * index));
  }

  const recoveryOffset = relevantLogs.reduce((sum, item) => sum + (item.recovery_gain || 0), 0) / Math.max(1, relevantLogs.length);
  return base.map((value, index) => clampBotMetric(value - (relevantLogs.length - index - 1) * 2 + recoveryOffset * 0.12));
}

export function getPredictiveBotInsight(bot, maintenanceLogs = [], tasks = [], squads = []) {
  const trend = buildPredictiveTrend(bot, maintenanceLogs);
  const slope = trend.length > 1 ? (trend[trend.length - 1] - trend[0]) / (trend.length - 1) : 0;
  const assignedTasks = tasks.filter((task) => task.assigned_bot_id === bot.id && ['assigned', 'active', 'review', 'blocked'].includes(task.status));
  const squad = squads.find((item) => item.id === bot.squad_id);
  const errorRate = clampBotMetric(
    Math.max(0, 100 - (bot.output_quality || 0)) * 0.45 +
    Math.max(0, 100 - (bot.confidence || 0)) * 0.25 +
    Math.max(0, 78 - (bot.integrity || 0)) * 0.3
  );
  const loadPressure = (bot.load || 0) * 0.22;
  const fatiguePressure = (bot.fatigue || 0) * 0.25;
  const outputPressure = Math.max(0, 84 - (bot.output_quality || 0)) * 0.45;
  const healthDrag = Math.max(0, 88 - (bot.system_health || 0)) * 0.28;
  const queuePressure = assignedTasks.reduce((sum, task) => sum + (task.estimated_load || 0), 0) * 0.18;
  const squadStrain = Math.max(0, (squad?.current_load || 0) - ((squad?.capacity_limit || 100) * 0.7)) * 0.18;

  const projectedIntegrity = clampBotMetric((bot.integrity || 0) + slope * 2 - loadPressure - fatiguePressure - healthDrag - outputPressure * 0.12);
  const projectedCapacity = clampBotMetric((bot.max_concurrent_tasks || 1) * 28 + (100 - (bot.load || 0)) * 0.52 + (100 - (bot.fatigue || 0)) * 0.18 - queuePressure - squadStrain);
  const failureRisk = clampBotMetric((100 - projectedIntegrity) * 0.52 + errorRate * 0.22 + (bot.fatigue || 0) * 0.16 + (bot.load || 0) * 0.1 + squadStrain);
  const inefficiencyRisk = clampBotMetric(errorRate * 0.38 + Math.max(0, 72 - projectedCapacity) * 0.34 + outputPressure * 0.2 + queuePressure * 0.12);

  const recommendedAction = failureRisk >= 82
    ? 'quarantine'
    : projectedIntegrity <= 48 || (bot.system_health || 0) <= 60
      ? 'repair'
      : (bot.fatigue || 0) >= 70 || (bot.load || 0) >= 76 || inefficiencyRisk >= 68
        ? 'rest'
        : projectedCapacity <= 38 || inefficiencyRisk >= 72
          ? 'reallocate'
          : 'monitor';

  const maintenanceWindow = failureRisk >= 82
    ? 'Immediate'
    : failureRisk >= 66 || inefficiencyRisk >= 72
      ? 'Next cycle'
      : failureRisk >= 52
        ? 'Within 2 cycles'
        : 'Monitor';

  const summary = recommendedAction === 'quarantine'
    ? 'Projected failure pressure is severe; isolate this bot before the next mission spike.'
    : recommendedAction === 'repair'
      ? 'Projected integrity and health point to repair before sustained work resumes.'
      : recommendedAction === 'rest'
        ? 'Fatigue-load pressure is likely to reduce output quality unless this bot rests.'
        : recommendedAction === 'reallocate'
          ? 'Capacity is tightening; shift work away from this bot to avoid efficiency loss.'
          : 'No urgent intervention detected, but keep this bot under observation.';

  return {
    trend,
    errorRate,
    projectedIntegrity,
    projectedCapacity,
    failureRisk,
    inefficiencyRisk,
    recommendedAction,
    maintenanceWindow,
    summary,
    assignedTaskCount: assignedTasks.length,
    squadName: squad?.name || 'Unassigned squad',
  };
}

export function getPredictiveSquadInsight(squad, bots = [], tasks = [], maintenanceLogs = []) {
  const squadBots = bots.filter((bot) => bot.squad_id === squad.id);
  const squadTasks = tasks.filter((task) => task.assigned_squad_id === squad.id && ['assigned', 'active', 'review', 'blocked', 'pending'].includes(task.status));
  const botInsights = squadBots.map((bot) => getPredictiveBotInsight(bot, maintenanceLogs, tasks, [squad]));
  const avgFailureRisk = botInsights.length ? Math.round(botInsights.reduce((sum, item) => sum + item.failureRisk, 0) / botInsights.length) : 0;
  const avgCapacity = botInsights.length ? Math.round(botInsights.reduce((sum, item) => sum + item.projectedCapacity, 0) / botInsights.length) : 0;
  const avgInefficiency = botInsights.length ? Math.round(botInsights.reduce((sum, item) => sum + item.inefficiencyRisk, 0) / botInsights.length) : 0;
  const projectedOverload = clampBotMetric((squad.current_load || 0) * 0.7 + squadTasks.reduce((sum, task) => sum + (task.estimated_load || 0), 0) * 0.22 - (avgCapacity * 0.35));
  const recommendation = projectedOverload >= 78
    ? 'Scale up or reassign immediately'
    : avgFailureRisk >= 65
      ? 'Run preventive maintenance on vulnerable bots'
      : avgInefficiency >= 60
        ? 'Rebalance workload across squads'
        : 'Current squad balance is healthy';

  return {
    avgFailureRisk,
    avgCapacity,
    avgInefficiency,
    projectedOverload,
    recommendation,
    atRiskBots: botInsights.filter((item) => item.failureRisk >= 66 || item.inefficiencyRisk >= 68).length,
  };
}