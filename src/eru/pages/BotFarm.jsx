import { useEffect, useMemo, useState, useCallback } from 'react';
import { base44 } from '@/eru/api/base44Client';
import BotFarmHeader from '../components/bot-farm/BotFarmHeader';
import BotFarmMetricGrid from '../components/bot-farm/BotFarmMetricGrid';
import BotFarmBotCard from '../components/bot-farm/BotFarmBotCard';
import BotFarmQueuePanel from '../components/bot-farm/BotFarmQueuePanel';
import BotFarmSquadPanel from '../components/bot-farm/BotFarmSquadPanel';
import BotFarmOutputPanel from '../components/bot-farm/BotFarmOutputPanel';
import BotFarmUpgradePanel from '../components/bot-farm/BotFarmUpgradePanel';
import BotFarmRetrievalPanel from '../components/bot-farm/BotFarmRetrievalPanel';
import BotFarmControlPanel from '../components/bot-farm/BotFarmControlPanel';
import BotFarmMaintenancePanel from '../components/bot-farm/BotFarmMaintenancePanel';
import BotFarmMissionPanel from '../components/bot-farm/BotFarmMissionPanel';
import BotFarmMissionSimulatorPanel from '../components/bot-farm/BotFarmMissionSimulatorPanel';
import BotFarmPredictiveAnalyticsPanel from '../components/bot-farm/BotFarmPredictiveAnalyticsPanel';
import BotFarmScalingControllerPanel from '../components/bot-farm/BotFarmScalingControllerPanel';
import BotFarmOptimizationPanel from '../components/bot-farm/BotFarmOptimizationPanel';
import { buildRoleSummary, computeAssignmentQuality, computeBotFit, computeMissionSuccessProbability, computeOutputQuality, getBotFarmScalingSnapshot, summarizeFarmMetrics } from '../components/bot-farm/BotFarmUtils';
import { getPredictiveBotInsight } from '../components/bot-farm/BotFarmPredictiveUtils';
import { DEMO_ACTIVITY, DEMO_BOTS, DEMO_MAINTENANCE, DEMO_MISSIONS, DEMO_OUTPUTS, DEMO_RISKS, DEMO_SQUADS, DEMO_TASKS, DEMO_UPGRADES } from '../components/bot-farm/BotFarmDemoData';

export default function BotFarm() {
  const [bots, setBots] = useState([]);
  const [squads, setSquads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [missions, setMissions] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [risks, setRisks] = useState([]);
  const [upgrades, setUpgrades] = useState([]);
  const [history, setHistory] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);
  const [sortMode, setSortMode] = useState('priority');
  const [upgradingId, setUpgradingId] = useState(null);
  const [scalingBusy, setScalingBusy] = useState(false);
  const [optimizationBusy, setOptimizationBusy] = useState(false);

  const applyLoadedData = useCallback((data) => {
    if (data.bots) setBots(data.bots);
    if (data.squads) setSquads(data.squads);
    if (data.tasks) setTasks(data.tasks);
    if (data.missions) setMissions(data.missions);
    if (data.outputs) setOutputs(data.outputs);
    if (data.risks) setRisks(data.risks);
    if (data.upgrades) setUpgrades(data.upgrades);
    if (data.history) setHistory(data.history);
    if (data.maintenanceLogs) setMaintenanceLogs(data.maintenanceLogs);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [botRows, squadRows, taskRows, missionRows, outputRows, riskRows, upgradeRows, historyRows, maintenanceRows] = await Promise.all([
        base44.entities.BotFarmBot.list('-updated_date', 100),
        base44.entities.BotFarmSquad.list('-updated_date', 50),
        base44.entities.BotFarmTask.list('-updated_date', 100),
        base44.entities.BotFarmMission.list('-updated_date', 50),
        base44.entities.BotFarmOutputLog.list('-updated_date', 100),
        base44.entities.BotFarmRiskFlag.list('-updated_date', 100),
        base44.entities.BotFarmUpgrade.list('-updated_date', 30),
        base44.entities.BotFarmActivityHistory.list('-updated_date', 80),
        base44.entities.BotFarmMaintenanceLog.list('-updated_date', 80),
      ]);
      applyLoadedData({
        bots: botRows || [],
        squads: squadRows || [],
        tasks: taskRows || [],
        missions: missionRows || [],
        outputs: outputRows || [],
        risks: riskRows || [],
        upgrades: upgradeRows || [],
        history: historyRows || [],
        maintenanceLogs: maintenanceRows || [],
      });
      setSchemaReady(true);
    } catch (error) {
      if (error?.message?.includes('Entity schema BotFarm')) {
        setSchemaReady(false);
      } else {
        throw error;
      }
    }
    setLoading(false);
  }, [applyLoadedData]);

  const seedIfNeeded = async () => {
    let existing;
    try {
      existing = await base44.entities.BotFarmBot.list('-created_date', 1);
      setSchemaReady(true);
    } catch (error) {
      if (error?.message?.includes('Entity schema BotFarm')) {
        setSchemaReady(false);
        return;
      }
      throw error;
    }
    if ((existing || []).length > 0) return;

    const createdSquads = await base44.entities.BotFarmSquad.bulkCreate(DEMO_SQUADS);
    const leaderSquad = createdSquads.find((item) => item.role_type === 'leader');
    const commanderSquads = createdSquads.filter((item) => item.role_type === 'commander');
    const securitySquad = createdSquads.find((item) => item.role_type === 'security');
    const taskSquads = createdSquads.filter((item) => item.role_type === 'task');

    const createdBots = await base44.entities.BotFarmBot.bulkCreate(
      DEMO_BOTS.map((bot, index) => {
        const roleType = bot.role.includes('leader')
          ? 'leader'
          : bot.role.includes('commander')
            ? 'commander'
            : bot.role.includes('security')
              ? 'security'
              : 'task';

        if (roleType === 'leader') return { ...bot, role_type: roleType, squad_id: leaderSquad?.id };
        if (roleType === 'commander') return { ...bot, role_type: roleType, squad_id: commanderSquads[index % Math.max(1, commanderSquads.length)]?.id };
        if (roleType === 'security') return { ...bot, role_type: roleType, squad_id: securitySquad?.id };
        return { ...bot, role_type: roleType, squad_id: taskSquads[index % Math.max(1, taskSquads.length)]?.id };
      })
    );

    const leaderBot = createdBots.find((bot) => bot.role.includes('leader'));
    const commanderBots = createdBots.filter((bot) => bot.role.includes('commander'));
    const securityBots = createdBots.filter((bot) => bot.role.includes('security'));

    const createdMissions = await base44.entities.BotFarmMission.bulkCreate(
      DEMO_MISSIONS.map((mission, index) => ({
        ...mission,
        leader_bot_id: leaderBot?.id,
        commander_bot_ids: commanderBots.map((bot) => bot.id),
        security_bot_ids: securityBots.map((bot) => bot.id),
        assigned_squad_ids: createdSquads.filter((squad) => squad.role_type !== 'leader').slice(0, index === 0 ? 4 : 3).map((squad) => squad.id),
      }))
    );

    const createdTasks = await base44.entities.BotFarmTask.bulkCreate(
      DEMO_TASKS.map((task, index) => ({
        ...task,
        mission_id: createdMissions[index % createdMissions.length]?.id,
        assigned_squad_id: taskSquads[index % Math.max(1, taskSquads.length)]?.id,
        assigned_commander_bot_id: commanderBots[index % Math.max(1, commanderBots.length)]?.id,
      }))
    );

    await Promise.all([
      base44.entities.BotFarmOutputLog.bulkCreate(DEMO_OUTPUTS.map((item, index) => ({
        ...item,
        bot_id: createdBots[(index + 5) % createdBots.length]?.id,
        task_id: createdTasks[index % createdTasks.length]?.id,
        mission_id: createdMissions[index % createdMissions.length]?.id,
        squad_id: taskSquads[index % Math.max(1, taskSquads.length)]?.id,
      }))),
      base44.entities.BotFarmRiskFlag.bulkCreate(DEMO_RISKS.map((item, index) => ({
        ...item,
        bot_id: createdBots[(index + 2) % createdBots.length]?.id,
        task_id: createdTasks[index % createdTasks.length]?.id,
        mission_id: createdMissions[index % createdMissions.length]?.id,
        squad_id: taskSquads[index % Math.max(1, taskSquads.length)]?.id,
      }))),
      base44.entities.BotFarmUpgrade.bulkCreate(DEMO_UPGRADES),
      base44.entities.BotFarmActivityHistory.bulkCreate(DEMO_ACTIVITY),
      base44.entities.BotFarmMaintenanceLog.bulkCreate(DEMO_MAINTENANCE.map((item, index) => ({
        ...item,
        bot_id: createdBots.filter((bot) => ['maintenance', 'overloaded'].includes(bot.status))[index % 2]?.id || createdBots[0]?.id,
      }))),
    ]);
  };

  useEffect(() => {
    seedIfNeeded().then(loadAll);
  }, [loadAll]);

  const roleSummary = useMemo(() => buildRoleSummary(bots), [bots]);
  const metrics = useMemo(() => summarizeFarmMetrics(bots, tasks, missions, risks, outputs, squads, upgrades), [bots, tasks, missions, risks, outputs, squads, upgrades]);
  const scalingSnapshot = useMemo(() => getBotFarmScalingSnapshot({ bots, squads, tasks }), [bots, squads, tasks]);

  const findSquadForBot = (bot) => squads.find((squad) => squad.id === bot.squad_id);
  const getUpgradeEffect = () => upgrades.reduce((sum, item) => sum + (item.effect_value || 0) * (item.level || 1), 0) / Math.max(1, upgrades.length || 1);
  const getScalePressure = () => Math.round((bots.length * 0.9) + (squads.length * 2.4) + (tasks.filter((task) => ['assigned', 'active', 'review'].includes(task.status)).length * 1.1) + (upgrades.length * 1.8));
  const getCommanderBoost = (task) => {
    const commander = bots.find((bot) => bot.id === task.assigned_commander_bot_id);
    return commander ? Math.round(((commander.coordination_efficiency || 0) + (commander.confidence || 0)) / 20) : 0;
  };

  const refreshAfterMutation = async ({
    bots: shouldLoadBots,
    squads: shouldLoadSquads,
    tasks: shouldLoadTasks,
    missions: shouldLoadMissions,
    outputs: shouldLoadOutputs,
    risks: shouldLoadRisks,
    upgrades: shouldLoadUpgrades,
    history: shouldLoadHistory,
    maintenanceLogs: shouldLoadMaintenanceLogs,
  }) => {
    const requests = [
      shouldLoadBots ? base44.entities.BotFarmBot.list('-updated_date', 100).then((rows) => ['bots', rows || []]) : null,
      shouldLoadSquads ? base44.entities.BotFarmSquad.list('-updated_date', 50).then((rows) => ['squads', rows || []]) : null,
      shouldLoadTasks ? base44.entities.BotFarmTask.list('-updated_date', 100).then((rows) => ['tasks', rows || []]) : null,
      shouldLoadMissions ? base44.entities.BotFarmMission.list('-updated_date', 50).then((rows) => ['missions', rows || []]) : null,
      shouldLoadOutputs ? base44.entities.BotFarmOutputLog.list('-updated_date', 100).then((rows) => ['outputs', rows || []]) : null,
      shouldLoadRisks ? base44.entities.BotFarmRiskFlag.list('-updated_date', 100).then((rows) => ['risks', rows || []]) : null,
      shouldLoadUpgrades ? base44.entities.BotFarmUpgrade.list('-updated_date', 30).then((rows) => ['upgrades', rows || []]) : null,
      shouldLoadHistory ? base44.entities.BotFarmActivityHistory.list('-updated_date', 80).then((rows) => ['history', rows || []]) : null,
      shouldLoadMaintenanceLogs ? base44.entities.BotFarmMaintenanceLog.list('-updated_date', 80).then((rows) => ['maintenanceLogs', rows || []]) : null,
    ].filter(Boolean);

    if (!requests.length) return;

    const results = await Promise.all(requests);
    applyLoadedData(Object.fromEntries(results));
  };

  const prependHistoryEntry = (entry) => {
    setHistory((current) => [entry, ...current].slice(0, 80));
  };

  const assignTaskToBot = async (task, botOverride) => {
    const candidateBots = (botOverride ? [botOverride] : roleSummary.taskBots)
      .filter((bot) => !['maintenance', 'quarantined', 'offline'].includes(bot.status));

    const ranked = candidateBots
      .map((bot) => {
        const squad = findSquadForBot(bot);
        return {
          bot,
          squad,
          fit: computeBotFit(bot, task, squad),
          assignmentQuality: computeAssignmentQuality(bot, task, squad, getCommanderBoost(task)),
        };
      })
      .sort((a, b) => b.fit - a.fit);

    const chosen = ranked[0];
    if (!chosen) return;

    const scalePressure = getScalePressure();
    const nextLoad = Math.min(100, (chosen.bot.load || 0) + (task.estimated_load || 15) + Math.round(scalePressure * 0.08));
    const nextFatigue = Math.min(100, (chosen.bot.fatigue || 0) + Math.max(10, Math.round((task.estimated_load || 15) * 0.55) + Math.round(scalePressure * 0.05)));
    const nextStatus = nextLoad > 82 || nextFatigue > 76 ? 'overloaded' : 'active';
    const nextRisk = chosen.bot.integrity < 72 || chosen.assignmentQuality < 62 || nextStatus === 'overloaded' ? 'medium' : chosen.bot.risk_level;

    await Promise.all([
      base44.entities.BotFarmTask.update(task.id, {
        assigned_bot_id: chosen.bot.id,
        assigned_squad_id: chosen.squad?.id,
        status: 'assigned',
        bot_fit_score: chosen.fit,
        progress: task.status === 'pending' ? 10 : task.progress,
      }),
      base44.entities.BotFarmBot.update(chosen.bot.id, {
        assigned_task_id: task.id,
        assigned_task_name: task.title,
        load: nextLoad,
        fatigue: nextFatigue,
        status: nextStatus,
        risk_level: nextRisk,
      }),
      chosen.squad ? base44.entities.BotFarmSquad.update(chosen.squad.id, {
        current_load: Math.min(100, (chosen.squad.current_load || 0) + Math.round((task.estimated_load || 15) * 0.7)),
        status: (chosen.squad.current_load || 0) > ((chosen.squad.capacity_limit || 100) * 0.78) ? 'strained' : 'active',
      }) : Promise.resolve(),
      base44.entities.BotFarmActivityHistory.create({
        actor_type: 'bot',
        actor_id: chosen.bot.id,
        event_type: 'task_assigned',
        summary: `${chosen.bot.name} assigned to ${task.title} with fit ${chosen.fit}.`,
        impact_score: chosen.fit,
      }),
    ]);

    if (chosen.assignmentQuality < 60) {
      await base44.entities.BotFarmRiskFlag.create({
        bot_id: chosen.bot.id,
        task_id: task.id,
        mission_id: task.mission_id,
        squad_id: chosen.squad?.id,
        flag_type: 'poor_assignment',
        severity: 'warning',
        status: 'open',
        details: `${chosen.bot.name} was assigned below ideal specialty/coordination fit.`
      });
    }

    await refreshAfterMutation({ tasks: true, bots: true, squads: true, risks: true, history: true });
  };

  const handleRest = async (bot) => {
    const [updatedBot, createdLog] = await Promise.all([
      base44.entities.BotFarmBot.update(bot.id, {
        fatigue: Math.max(0, (bot.fatigue || 0) - 28),
        load: Math.max(0, (bot.load || 0) - 18),
        status: 'recovering',
        maintenance_status: 'healthy',
      }),
      base44.entities.BotFarmMaintenanceLog.create({
        bot_id: bot.id,
        maintenance_type: 'rest',
        status: 'complete',
        impact: 'Fatigue reduced and operating headroom restored.',
        recovery_gain: 28,
      })
    ]);
    setBots((current) => current.map((item) => item.id === bot.id ? updatedBot : item));
    setMaintenanceLogs((current) => [createdLog, ...current].slice(0, 80));
  };

  const handleRepair = async (bot) => {
    const [updatedBot, createdLog] = await Promise.all([
      base44.entities.BotFarmBot.update(bot.id, {
        integrity: Math.min(100, (bot.integrity || 0) + 18),
        system_health: Math.min(100, (bot.system_health || 0) + 16),
        maintenance_status: 'recalibrating',
        status: 'maintenance',
      }),
      base44.entities.BotFarmMaintenanceLog.create({
        bot_id: bot.id,
        maintenance_type: 'repair',
        status: 'in_progress',
        impact: 'Repair cycle started to restore integrity and system health.',
        recovery_gain: 18,
      })
    ]);
    setBots((current) => current.map((item) => item.id === bot.id ? updatedBot : item));
    setMaintenanceLogs((current) => [createdLog, ...current].slice(0, 80));
  };

  const handleRecover = async (bot) => {
    const [updatedBot, createdLog] = await Promise.all([
      base44.entities.BotFarmBot.update(bot.id, {
        fatigue: Math.max(0, (bot.fatigue || 0) - 12),
        load: Math.max(0, (bot.load || 0) - 10),
        integrity: Math.min(100, (bot.integrity || 0) + 8),
        status: 'idle',
        maintenance_status: 'healthy',
        communication_status: 'clear',
      }),
      base44.entities.BotFarmMaintenanceLog.create({
        bot_id: bot.id,
        maintenance_type: 'recalibration',
        status: 'complete',
        impact: 'Bot recovered to idle-ready state.',
        recovery_gain: 12,
      })
    ]);
    setBots((current) => current.map((item) => item.id === bot.id ? updatedBot : item));
    setMaintenanceLogs((current) => [createdLog, ...current].slice(0, 80));
  };

  const handleQuarantine = async (bot) => {
    const [updatedBot, createdRisk] = await Promise.all([
      base44.entities.BotFarmBot.update(bot.id, {
        status: 'quarantined',
        communication_status: 'offline',
        risk_level: 'critical',
      }),
      base44.entities.BotFarmRiskFlag.create({
        bot_id: bot.id,
        flag_type: 'security_issue',
        severity: 'critical',
        status: 'open',
        details: `${bot.name} was quarantined due to operational risk.`
      })
    ]);
    setBots((current) => current.map((item) => item.id === bot.id ? updatedBot : item));
    setRisks((current) => [createdRisk, ...current].slice(0, 100));
  };

  const handleUpgrade = async (upgrade) => {
    if (upgradingId) return;

    setUpgradingId(upgrade.id);

    const nextLevel = (upgrade.level || 1) + 1;
    const nextEffectValue = (upgrade.effect_value || 0) + 4;
    const nextComplexityCost = (upgrade.complexity_cost || 0) + 1;

    try {
      const updatedUpgrade = await base44.entities.BotFarmUpgrade.update(upgrade.id, {
        level: nextLevel,
        effect_value: nextEffectValue,
        complexity_cost: nextComplexityCost,
      });

      setUpgrades((current) => current.map((item) => item.id === upgrade.id ? updatedUpgrade : item));

      const createdHistoryEntry = await base44.entities.BotFarmActivityHistory.create({
        actor_type: 'system',
        event_type: 'upgrade_expanded',
        summary: `${upgrade.name} advanced to level ${nextLevel}, increasing both capacity and management complexity.`,
        impact_score: nextEffectValue,
      });

      prependHistoryEntry(createdHistoryEntry);
    } finally {
      setUpgradingId(null);
    }
  };

  const runPredictiveOptimization = async () => {
    if (optimizationBusy) return;
    setOptimizationBusy(true);

    const ranked = bots
      .map((bot) => ({ bot, insight: getPredictiveBotInsight(bot, maintenanceLogs, tasks, squads) }))
      .sort((a, b) => (b.insight.failureRisk + b.insight.inefficiencyRisk) - (a.insight.failureRisk + a.insight.inefficiencyRisk));

    const actions = [];

    for (const item of ranked.slice(0, 6)) {
      if (item.insight.recommendedAction === 'quarantine') {
        await handleQuarantine(item.bot);
        actions.push(`${item.bot.name} quarantined`);
      } else if (item.insight.recommendedAction === 'repair') {
        await handleRepair(item.bot);
        actions.push(`${item.bot.name} sent to repair`);
      } else if (item.insight.recommendedAction === 'rest') {
        await handleRest(item.bot);
        actions.push(`${item.bot.name} sent to rest`);
      }
    }

    const reallocationCandidates = ranked.filter((item) => item.insight.recommendedAction === 'reallocate').slice(0, 3);
    for (const item of reallocationCandidates) {
      const assignedTask = tasks.find((task) => task.assigned_bot_id === item.bot.id && ['assigned', 'active', 'review'].includes(task.status));
      if (!assignedTask) continue;
      await assignTaskToBot(assignedTask);
      actions.push(`${assignedTask.title} reallocated away from ${item.bot.name}`);
    }

    if (actions.length > 0) {
      await base44.entities.BotFarmActivityHistory.create({
        actor_type: 'system',
        event_type: 'predictive_optimization',
        summary: `Predictive optimization executed: ${actions.join(', ')}.`,
        impact_score: 12 + actions.length * 2,
      });
    }

    await refreshAfterMutation({ bots: true, squads: true, tasks: true, risks: true, history: true, maintenanceLogs: true });
    setOptimizationBusy(false);
  };

  const runOperationalCycle = async () => {
    const upgradeEffect = getUpgradeEffect();
    const actionableTasks = tasks.filter((task) => ['assigned', 'active', 'review'].includes(task.status) && task.assigned_bot_id);

    await Promise.all(actionableTasks.map(async (task) => {
      const bot = bots.find((item) => item.id === task.assigned_bot_id);
      const squad = squads.find((item) => item.id === task.assigned_squad_id || item.id === bot?.squad_id);
      if (!bot) return;

      const commanderBoost = getCommanderBoost(task);
      const scalePressure = getScalePressure();
      const leadershipLift = Math.round(Math.max(0, (metrics.leadership_buffer || 0) - (metrics.coordination_overhead || 0) * 0.2));
      const quality = computeOutputQuality(bot, task, squad, upgradeEffect, commanderBoost) - Math.round(scalePressure * 0.06) + Math.round(leadershipLift * 0.08);
      const assignmentQuality = computeAssignmentQuality(bot, task, squad, commanderBoost);
      const loadPenalty = Math.max(0, (bot.load || 0) - 65) + Math.round(scalePressure * 0.05);
      const coordinationPenalty = Math.max(0, (task.coordination_cost || 0) + (squad?.coordination_overhead || 0) - 12) + Math.round(scalePressure * 0.04);
      const nextProgress = Math.min(100, (task.progress || 0) + Math.max(6, Math.round((quality - coordinationPenalty) * 0.1)));
      const nextStatus = nextProgress >= 100 ? 'complete' : quality < 50 || scalePressure > 55 && assignmentQuality < 64 ? 'blocked' : 'active';

      await Promise.all([
        base44.entities.BotFarmTask.update(task.id, {
          actual_quality: quality,
          progress: nextProgress,
          status: nextStatus,
          blocked_reason: nextStatus === 'blocked' ? 'Low effective output quality under current load/coordination state.' : undefined,
        }),
        base44.entities.BotFarmBot.update(bot.id, {
          fatigue: Math.min(100, (bot.fatigue || 0) + 6 + Math.round(scalePressure * 0.03)),
          load: Math.min(100, (bot.load || 0) + 4 + Math.round(scalePressure * 0.04)),
          output_quality: quality,
          status: quality < 45 ? 'overloaded' : bot.status === 'recovering' ? 'idle' : bot.status,
        }),
        base44.entities.BotFarmOutputLog.create({
          bot_id: bot.id,
          task_id: task.id,
          mission_id: task.mission_id,
          squad_id: squad?.id,
          output_type: nextStatus === 'complete' ? 'report' : 'mission_progress',
          assignment_quality: assignmentQuality,
          specialization_fit: computeBotFit(bot, task, squad),
          load_penalty: loadPenalty,
          coordination_penalty: coordinationPenalty,
          quality_score: quality,
          value_score: Math.max(20, Math.round((task.expected_output_value || 50) * (quality / 100))),
          summary: `${bot.name} advanced ${task.title} to ${nextProgress}% with output quality ${quality}.`,
        }),
      ]);

      if (quality < 52 || bot.integrity < 70 || bot.status === 'quarantined') {
        await base44.entities.BotFarmRiskFlag.create({
          bot_id: bot.id,
          task_id: task.id,
          mission_id: task.mission_id,
          squad_id: squad?.id,
          flag_type: quality < 52 ? 'overload' : 'integrity_drop',
          severity: quality < 45 ? 'critical' : 'warning',
          status: 'open',
          details: `${bot.name} is degrading output quality under current operational conditions.`,
        });
      }
    }));

    const refreshedOutputs = await base44.entities.BotFarmOutputLog.list('-created_date', 100);
    const refreshedRisks = await base44.entities.BotFarmRiskFlag.list('-created_date', 100);
    const refreshedTasks = await base44.entities.BotFarmTask.list('-updated_date', 100);

    await Promise.all(missions.map(async (mission) => {
      const missionOutputs = refreshedOutputs.filter((item) => item.mission_id === mission.id);
      const missionRisks = refreshedRisks.filter((item) => item.mission_id === mission.id && item.status !== 'resolved');
      const missionSquads = squads.filter((squad) => (mission.assigned_squad_ids || []).includes(squad.id));
      const missionTasks = refreshedTasks.filter((task) => task.mission_id === mission.id);
      const actualOutputQuality = missionOutputs.length ? Math.round(missionOutputs.reduce((sum, item) => sum + (item.quality_score || 0), 0) / missionOutputs.length) : mission.actual_output_quality;
      const progress = missionTasks.length ? Math.round(missionTasks.reduce((sum, item) => sum + (item.progress || 0), 0) / missionTasks.length) : mission.progress;
      const successProbability = computeMissionSuccessProbability(mission, missionSquads, missionOutputs, missionRisks);

      await base44.entities.BotFarmMission.update(mission.id, {
        actual_output_quality: actualOutputQuality,
        progress,
        success_probability: successProbability,
        status: progress >= 100 ? 'complete' : successProbability < 45 ? 'blocked' : 'active',
        coordination_complexity: Math.min(100, (mission.coordination_complexity || 0) + Math.round(getScalePressure() * 0.04)),
      });
    }));

    await base44.entities.BotFarmActivityHistory.create({
      actor_type: 'farm',
      event_type: 'operational_cycle',
      summary: 'A full operational cycle recalculated assignment quality, output quality, and mission health.',
      impact_score: metrics.average_output_quality || 0,
    });

    await refreshAfterMutation({ tasks: true, bots: true, missions: true, outputs: true, risks: true, history: true });
  };

  const handleScaleUp = async () => {
    if (scalingBusy || !scalingSnapshot.canScaleUp) return;
    setScalingBusy(true);

    const taskSquads = squads.filter((squad) => squad.role_type === 'task');
    const candidateSquad = [...taskSquads].sort((a, b) => ((b.current_load || 0) / Math.max(1, b.capacity_limit || 100)) - ((a.current_load || 0) / Math.max(1, a.capacity_limit || 100)))[0];
    const specialtyPool = new Set(candidateSquad?.specialization_focus || []);
    const reserveBots = bots
      .filter((bot) => bot.role_type === 'task' && bot.status === 'idle' && !bot.squad_id)
      .filter((bot) => specialtyPool.size === 0 || specialtyPool.has(bot.specialty))
      .slice(0, 3);

    if (!candidateSquad || reserveBots.length === 0) {
      setScalingBusy(false);
      return;
    }

    await Promise.all([
      ...reserveBots.map((bot) => base44.entities.BotFarmBot.update(bot.id, {
        squad_id: candidateSquad.id,
        farm_group: candidateSquad.farm_group,
        status: 'assigned'
      })),
      base44.entities.BotFarmSquad.update(candidateSquad.id, {
        member_bot_ids: [...new Set([...(candidateSquad.member_bot_ids || []), ...reserveBots.map((bot) => bot.id)])],
        current_load: Math.max(0, (candidateSquad.current_load || 0) - reserveBots.length * 6),
        capacity_limit: (candidateSquad.capacity_limit || 100) + reserveBots.length * 12,
        coordination_quality: Math.max(68, Math.min(100, (candidateSquad.coordination_quality || 0) - 1 + reserveBots.length)),
        status: 'active'
      }),
      base44.entities.BotFarmActivityHistory.create({
        actor_type: 'farm',
        actor_id: candidateSquad.id,
        event_type: 'dynamic_scale_up',
        summary: `${candidateSquad.name} absorbed ${reserveBots.length} reserve task bots to relieve queue pressure while keeping specialty cohesion intact.`,
        impact_score: 10 + reserveBots.length * 2
      })
    ]);

    await refreshAfterMutation({ bots: true, squads: true, history: true });
    setScalingBusy(false);
  };

  const handleScaleDown = async () => {
    if (scalingBusy || !scalingSnapshot.canScaleDown) return;
    setScalingBusy(true);

    const candidateSquad = squads
      .filter((squad) => squad.role_type === 'task')
      .filter((squad) => (squad.current_load || 0) <= ((squad.capacity_limit || 100) * 0.38))
      .sort((a, b) => (a.current_load || 0) - (b.current_load || 0))[0];

    if (!candidateSquad) {
      setScalingBusy(false);
      return;
    }

    const releasableBots = bots
      .filter((bot) => bot.squad_id === candidateSquad.id && bot.role_type === 'task' && bot.status === 'idle')
      .slice(0, 2);

    if (releasableBots.length === 0) {
      setScalingBusy(false);
      return;
    }

    await Promise.all([
      ...releasableBots.map((bot) => base44.entities.BotFarmBot.update(bot.id, {
        squad_id: null,
        assigned_task_id: null,
        assigned_task_name: null,
        status: 'idle'
      })),
      base44.entities.BotFarmSquad.update(candidateSquad.id, {
        member_bot_ids: (candidateSquad.member_bot_ids || []).filter((id) => !releasableBots.some((bot) => bot.id === id)),
        capacity_limit: Math.max(60, (candidateSquad.capacity_limit || 100) - releasableBots.length * 12),
        coordination_quality: Math.min(100, (candidateSquad.coordination_quality || 0) + 2),
        current_load: Math.max(0, (candidateSquad.current_load || 0) - releasableBots.length * 4),
        status: 'idle'
      }),
      base44.entities.BotFarmActivityHistory.create({
        actor_type: 'farm',
        actor_id: candidateSquad.id,
        event_type: 'dynamic_scale_down',
        summary: `${candidateSquad.name} released ${releasableBots.length} idle task bots back to reserve as queue pressure normalized.`,
        impact_score: 6
      })
    ]);

    await refreshAfterMutation({ bots: true, squads: true, history: true });
    setScalingBusy(false);
  };

  return (
    <div
      className="min-h-screen bg-background px-4 py-4 md:px-6 md:py-6 pb-24"
      style={{
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 1rem)',
      }}
    >
      <div className="mx-auto max-w-7xl space-y-4">
        <BotFarmHeader metrics={metrics} />
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : !schemaReady ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Bot Farm is waiting for its data models to finish registering. Refresh in a moment and it should load normally.
          </div>
        ) : (
          <>
            <BotFarmMetricGrid metrics={metrics} />

            <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
              <BotFarmControlPanel roleSummary={roleSummary} metrics={metrics} onRunCycle={runOperationalCycle} />
              <BotFarmUpgradePanel upgrades={upgrades} onUpgrade={handleUpgrade} upgradingId={upgradingId} />
            </div>

            <BotFarmScalingControllerPanel
              scaling={scalingSnapshot}
              onScaleUp={handleScaleUp}
              onScaleDown={handleScaleDown}
              busy={scalingBusy}
            />

            <BotFarmOptimizationPanel
              bots={bots}
              squads={squads}
              tasks={tasks}
              maintenanceLogs={maintenanceLogs}
              onAutoOptimize={runPredictiveOptimization}
              optimizing={optimizationBusy}
            />

            <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
              <BotFarmQueuePanel tasks={tasks} sortMode={sortMode} setSortMode={setSortMode} onAssignTask={assignTaskToBot} />
              <BotFarmMaintenancePanel bots={bots} maintenanceLogs={maintenanceLogs} onRest={handleRest} onRepair={handleRepair} onRecover={handleRecover} onQuarantine={handleQuarantine} />
            </div>

            <BotFarmMissionPanel missions={missions} squads={squads} bots={bots} />
            <BotFarmMissionSimulatorPanel bots={bots} missions={missions} squads={squads} upgrades={upgrades} />
            <BotFarmPredictiveAnalyticsPanel bots={bots} maintenanceLogs={maintenanceLogs} tasks={tasks} squads={squads} />
            <BotFarmSquadPanel squads={squads} bots={bots} missions={missions} />
            <BotFarmRetrievalPanel bots={bots} />

            <section className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Operational Workforce</p>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {bots.map((bot) => (
                  <BotFarmBotCard
                    key={bot.id}
                    bot={bot}
                    onAssign={(selectedBot) => {
                      const pendingTask = tasks.find((task) => task.status === 'pending');
                      if (pendingTask) assignTaskToBot(pendingTask, selectedBot);
                    }}
                    onRest={handleRest}
                    onRepair={handleRepair}
                    onQuarantine={handleQuarantine}
                  />
                ))}
              </div>
            </section>

            <BotFarmOutputPanel outputs={outputs.slice(0, 8)} risks={risks.slice(0, 6)} history={history.slice(0, 6)} />
          </>
        )}
      </div>
    </div>
  );
}