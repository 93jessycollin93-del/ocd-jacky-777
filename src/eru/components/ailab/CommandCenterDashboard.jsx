import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Shield, Target, Users, MessageSquareText, Link2 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import CommandCenterMissionBuilder from './CommandCenterMissionBuilder.jsx';
import CommandCenterHierarchy from './CommandCenterHierarchy.jsx';
import { COMMAND_BOT_SEEDS, DEMO_KNOWLEDGE, DEMO_MISSION } from './commandCenterData';

const EMPTY_MISSION = { title: '', description: '', objective: '', priority: 'medium', success_criteria: '', deadline: '', mission_mode: 'semi_auto', knowledge_summary: '', assigned_commanders: [], assigned_squads: [] };

function tone(risk) {
  if (risk === 'critical' || risk === 'high') return 'border-red-500/20 bg-red-500/10 text-red-300';
  if (risk === 'medium') return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300';
  return 'border-green-500/20 bg-green-500/10 text-green-300';
}

function alertTone(severity) {
  if (severity === 'critical' || severity === 'warning') return 'border-red-500/20 bg-red-500/5';
  if (severity === 'caution') return 'border-yellow-500/20 bg-yellow-500/5';
  return 'border-border bg-background';
}

export default function CommandCenterDashboard() {
  const [bots, setBots] = useState([]);
  const [missions, setMissions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [riskReports, setRiskReports] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [form, setForm] = useState(EMPTY_MISSION);
  const [creating, setCreating] = useState(false);

  const loadAll = async () => {
    const [botRows, missionRows, taskRows, alertRows, communicationRows, riskRows] = await Promise.all([
      base44.entities.CommandBot.list('-updated_date', 50),
      base44.entities.CommandMission.list('-updated_date', 20),
      base44.entities.CommandTask.list('-updated_date', 100),
      base44.entities.CommandAlert.list('-updated_date', 30),
      base44.entities.CommandCommunication.list('-updated_date', 60),
      base44.entities.RiskReport.list('-updated_date', 20)
    ]);
    setBots(botRows || []);
    setMissions(missionRows || []);
    setTasks(taskRows || []);
    setAlerts(alertRows || []);
    setCommunications(communicationRows || []);
    setRiskReports(riskRows || []);
    setSelectedBot((current) => current ? (botRows || []).find((bot) => bot.bot_code === current.bot_code) || (botRows || [])[0] || null : (botRows || [])[0] || null);
  };

  const seedIfNeeded = async () => {
    const existingBots = await base44.entities.CommandBot.list('-created_date', 1);
    if ((existingBots || []).length > 0) return;

    const mission = await base44.entities.CommandMission.create(DEMO_MISSION);
    await Promise.all([
      base44.entities.MissionKnowledge.create({ mission_id: mission.id, ...DEMO_KNOWLEDGE }),
      ...COMMAND_BOT_SEEDS.map((bot) => base44.entities.CommandBot.create({ ...bot, active_mission_id: mission.id })),
      base44.entities.CommandTask.bulkCreate([
        { mission_id: mission.id, title: 'Alpha threat scan', description: 'Assess launch weaknesses and blockers.', assigned_squad: 'alpha', assigned_commander: 'AC01', assigned_bot_code: 'AS001', status: 'in_progress', confidence_level: 84, output_summary: 'Threat scan underway.' },
        { mission_id: mission.id, title: 'Beta forecast model', description: 'Model launch success under current constraints.', assigned_squad: 'beta', assigned_commander: 'AC02', assigned_bot_code: 'BS002', status: 'assigned', confidence_level: 81 },
        { mission_id: mission.id, title: 'Charlie consistency review', description: 'Resolve contradictory content outputs.', assigned_squad: 'charlie', assigned_commander: 'AC01', assigned_bot_code: 'CS003', status: 'blocked', confidence_level: 63, blockers: 'Inconsistent outputs detected.' },
        { mission_id: mission.id, title: 'Delta final readiness brief', description: 'Prepare final mission completion packet.', assigned_squad: 'delta', assigned_commander: 'AC02', assigned_bot_code: 'DS001', status: 'pending', confidence_level: 78 }
      ]),
      base44.entities.CommandCommunication.bulkCreate([
        { mission_id: mission.id, from_bot_code: 'L420', to_bot_code: 'AC01', squad_name: 'alpha', severity: 'info', message_type: 'directive', message: 'Prioritize Alpha scan and Charlie stabilization.' },
        { mission_id: mission.id, from_bot_code: 'L420', to_bot_code: 'AC02', squad_name: 'beta', severity: 'info', message_type: 'directive', message: 'Advance Beta forecasting and Delta completion support.' },
        { mission_id: mission.id, from_bot_code: 'SS002', to_bot_code: 'SS001', squad_name: 'charlie', severity: 'warning', message_type: 'risk', message: 'Charlie outputs show contradiction drift.' },
        { mission_id: mission.id, from_bot_code: 'SS001', to_bot_code: 'L420', squad_name: 'charlie', severity: 'warning', message_type: 'recommendation', message: 'Recommend review of CS003 and temporary workload rebalance.' }
      ]),
      base44.entities.RiskReport.bulkCreate([
        { mission_id: mission.id, reported_by: 'SS001', target_squad: 'charlie', risk_level: 'high', summary: 'Charlie Squad integrity is slipping due to contradictory outputs.', recommended_action: 'Reduce load on CS003 and route validation through Delta.', recommendation_priority: 'high' }
      ]),
      base44.entities.IntegrityReport.bulkCreate([
        { mission_id: mission.id, bot_code: 'CS003', squad_name: 'charlie', anomaly_type: 'contradictory_outputs', integrity_score: 68, stability_score: 71, details: 'Multiple outputs conflict with mission rules and commander directives.' }
      ]),
      base44.entities.CommandAlert.bulkCreate([
        { mission_id: mission.id, alert_type: 'contradictory_outputs', severity: 'warning', title: 'Charlie contradiction warning', details: 'CS003 generated conflicting outputs; commander review needed.', target_bot_code: 'CS003', target_squad: 'charlie', escalated_to: 'SS001', status: 'open' },
        { mission_id: mission.id, alert_type: 'overloaded_squad', severity: 'caution', title: 'Beta nearing load threshold', details: 'Beta Squad load is climbing and should be monitored.', target_squad: 'beta', escalated_to: 'AC02', status: 'open' }
      ]),
      base44.entities.CommandRecommendation.bulkCreate([
        { mission_id: mission.id, source_bot_code: 'SS001', target_bot_code: 'L420', priority: 'high', recommendation: 'Reassign part of Charlie validation to Delta and continue mission with caution.', action_type: 'reassign' }
      ]),
      base44.entities.CommandMissionHistory.bulkCreate([
        { mission_id: mission.id, event_type: 'mission_created', summary: 'Mission initialized and routed to command hierarchy.', actor_bot_code: 'L420' },
        { mission_id: mission.id, event_type: 'risk_escalation', summary: 'SS002 escalated anomaly findings to SS001 and L420.', actor_bot_code: 'SS002' }
      ])
    ]);
  };

  useEffect(() => {
    loadAll().catch(() => {});
    seedIfNeeded().then(loadAll);
  }, []);

  const createMission = async () => {
    if (!form.title.trim() || !form.objective.trim()) return;
    setCreating(true);
    const assignedCommanders = form.assigned_commanders?.length ? form.assigned_commanders : form.priority === 'critical' ? ['AC01', 'AC02'] : ['AC01'];
    const assignedSquads = form.assigned_squads?.length ? form.assigned_squads : form.priority === 'critical' ? ['alpha', 'beta', 'charlie', 'delta'] : ['alpha', 'charlie'];

    const mission = await base44.entities.CommandMission.create({
      ...form,
      status: 'planned',
      leader_decision: 'reviewing',
      overall_risk: form.priority === 'critical' ? 'high' : form.priority === 'high' ? 'medium' : 'low',
      assigned_commanders: assignedCommanders,
      assigned_squads: assignedSquads,
      completion_progress: 5,
      simulation_mode: false
    });

    const linkedBots = bots.filter((bot) => assignedSquads.includes(bot.squad_name) || assignedCommanders.includes(bot.bot_code) || bot.role_type === 'security');
    const starterTasks = linkedBots.filter((bot) => bot.role_type === 'squad').slice(0, 6).map((bot) => ({
      mission_id: mission.id,
      title: `${bot.squad_name} assignment · ${bot.bot_code}`,
      description: `Mission-linked assignment for ${bot.display_name}.`,
      assigned_bot_code: bot.bot_code,
      assigned_squad: bot.squad_name,
      assigned_commander: bot.commander_code,
      status: 'assigned',
      confidence_level: bot.confidence_score || 80,
      output_summary: 'Awaiting execution.'
    }));

    await Promise.all([
      base44.entities.MissionKnowledge.create({ mission_id: mission.id, objectives: form.objective, instructions: form.description, facts: form.knowledge_summary, rules: 'Chain of command required.', priorities: form.priority, constraints: 'Do not bypass command hierarchy.' }),
      base44.entities.CommandCommunication.bulkCreate([
        { mission_id: mission.id, from_bot_code: 'L420', to_bot_code: assignedCommanders[0] || 'AC01', squad_name: assignedSquads[0] || 'alpha', severity: 'info', message_type: 'directive', message: `Mission queued for review: ${form.title}` },
        ...assignedCommanders.slice(1).map((code) => ({ mission_id: mission.id, from_bot_code: 'L420', to_bot_code: code, squad_name: assignedSquads[0] || 'alpha', severity: 'info', message_type: 'directive', message: `Secondary command assignment accepted for ${form.title}` })),
        { mission_id: mission.id, from_bot_code: 'SS001', to_bot_code: 'L420', squad_name: 'security', severity: 'info', message_type: 'recommendation', message: `Security oversight attached to ${form.title}` }
      ]),
      starterTasks.length ? base44.entities.CommandTask.bulkCreate(starterTasks) : Promise.resolve(),
      base44.entities.CommandMissionHistory.create({ mission_id: mission.id, event_type: 'mission_created', summary: `Mission ${form.title} created and linked to ${assignedCommanders.join(', ')}.`, actor_bot_code: 'L420' })
    ]);

    setForm(EMPTY_MISSION);
    setCreating(false);
    loadAll();
  };

  const commanders = useMemo(() => bots.filter((bot) => bot.role_type === 'commander'), [bots]);
  const squadNames = useMemo(() => Array.from(new Set(bots.filter((bot) => bot.role_type === 'squad').map((bot) => bot.squad_name))), [bots]);
  const securityBots = useMemo(() => bots.filter((bot) => bot.role_type === 'security'), [bots]);
  const selectedBotTasks = useMemo(() => tasks.filter((task) => task.assigned_bot_code === selectedBot?.bot_code || task.assigned_squad === selectedBot?.squad_name || task.assigned_commander === selectedBot?.bot_code), [tasks, selectedBot]);
  const selectedBotCommunications = useMemo(() => communications.filter((item) => item.from_bot_code === selectedBot?.bot_code || item.to_bot_code === selectedBot?.bot_code || item.squad_name === selectedBot?.squad_name).slice(0, 8), [communications, selectedBot]);
  const selectedBotMissions = useMemo(() => missions.filter((mission) => mission.assigned_commanders?.includes(selectedBot?.bot_code) || mission.assigned_squads?.includes(selectedBot?.squad_name) || selectedBot?.role_type === 'leader' || selectedBot?.role_type === 'security').slice(0, 6), [missions, selectedBot]);

  return (
    <section className="px-4 py-4 space-y-4" aria-labelledby="command-center-heading">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <h2 id="command-center-heading" className="text-sm font-semibold text-foreground">Squad Command System</h2>
        <p className="mt-1 text-xs text-muted-foreground">Cleaner mission control with stronger hierarchy mapping, clearer risk routing, and mobile-ready command visibility.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-primary"><Target className="w-4 h-4" aria-hidden="true" /><p className="text-xs font-semibold">Active missions</p></div><p className="mt-3 text-2xl font-bold text-foreground">{missions.length}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-primary"><Users className="w-4 h-4" aria-hidden="true" /><p className="text-xs font-semibold">Connected bots</p></div><p className="mt-3 text-2xl font-bold text-foreground">{bots.length}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-primary"><AlertTriangle className="w-4 h-4" aria-hidden="true" /><p className="text-xs font-semibold">Open alerts</p></div><p className="mt-3 text-2xl font-bold text-foreground">{alerts.filter((a) => a.status !== 'resolved').length}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-primary"><Shield className="w-4 h-4" aria-hidden="true" /><p className="text-xs font-semibold">Risk reports</p></div><p className="mt-3 text-2xl font-bold text-foreground">{riskReports.length}</p></div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[1.05fr,0.95fr]">
        <CommandCenterMissionBuilder form={form} setForm={setForm} commanders={commanders} squads={squadNames} securityBots={securityBots} onCreate={createMission} creating={creating} />
        <CommandCenterHierarchy bots={bots} selectedBot={selectedBot} onSelectBot={setSelectedBot} />
      </div>

      <div className="grid gap-4 2xl:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3" aria-labelledby="mission-control-heading">
          <h3 id="mission-control-heading" className="text-sm font-semibold text-foreground">Mission Control Dashboard</h3>
          <div className="space-y-3">
            {missions.map((mission) => (
              <div key={mission.id} className="rounded-xl border border-border bg-background p-3 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{mission.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{mission.objective}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${tone(mission.overall_risk)}`}>{mission.overall_risk} risk</span>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary">{mission.leader_decision}</span>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 text-[10px] text-muted-foreground">
                  <div>Priority: <span className="text-foreground">{mission.priority}</span></div>
                  <div>Commanders: <span className="text-foreground">{(mission.assigned_commanders || []).join(', ')}</span></div>
                  <div>Progress: <span className="text-foreground">{mission.completion_progress || 0}%</span></div>
                </div>
                <div className="text-[10px] text-muted-foreground">Squads linked: <span className="text-foreground capitalize">{(mission.assigned_squads || []).join(', ')}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${mission.completion_progress || 0}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 space-y-3" aria-labelledby="risk-security-heading">
          <h3 id="risk-security-heading" className="text-sm font-semibold text-foreground">Risk & Security Center</h3>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className={`rounded-xl border p-3 ${alertTone(alert.severity)}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold text-foreground">{alert.title}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] uppercase text-muted-foreground">
                    <span>{alert.severity}</span>
                    {alert.target_squad && <span className="capitalize">{alert.target_squad}</span>}
                    {alert.target_bot_code && <span>{alert.target_bot_code}</span>}
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{alert.details}</p>
                {alert.escalated_to && <p className="mt-2 text-[10px] text-primary">Escalated to {alert.escalated_to}</p>}
              </div>
            ))}
            {riskReports.map((risk) => (
              <div key={risk.id} className="rounded-xl border border-border bg-background p-3">
                <p className="text-xs font-semibold text-foreground">{risk.summary}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Recommended action: {risk.recommended_action}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[0.9fr,1.1fr]">
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3" aria-labelledby="bot-profile-heading">
          <h3 id="bot-profile-heading" className="text-sm font-semibold text-foreground">Bot Profile</h3>
          {selectedBot ? (
            <>
              <div className="rounded-xl border border-border bg-background p-3 space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{selectedBot.display_name}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{selectedBot.specialty}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${tone(selectedBot.risk_level)}`}>{selectedBot.risk_level} risk</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-[10px] text-muted-foreground">
                  <div>Bot ID: <span className="text-foreground">{selectedBot.bot_code}</span></div>
                  <div>Role: <span className="text-foreground">{selectedBot.role_type}</span></div>
                  <div>Squad: <span className="text-foreground">{selectedBot.squad_name}</span></div>
                  <div>Status: <span className="text-foreground">{selectedBot.status}</span></div>
                  <div>Commander: <span className="text-foreground">{selectedBot.commander_code || '—'}</span></div>
                  <div>Task count: <span className="text-foreground">{selectedBot.task_count}</span></div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 text-[10px] text-muted-foreground">
                  <div>Confidence: <span className="text-foreground">{selectedBot.confidence_score}</span></div>
                  <div>Integrity: <span className="text-foreground">{selectedBot.integrity_score}</span></div>
                  <div>Readiness: <span className="text-foreground">{selectedBot.readiness_score}</span></div>
                </div>
                {selectedBot.risk_flags?.length > 0 && <div className="flex flex-wrap gap-1">{selectedBot.risk_flags.map((flag) => <span key={flag} className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">{flag}</span>)}</div>}
              </div>
              <div className="rounded-xl border border-border bg-background p-3 space-y-2">
                <div className="flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" aria-hidden="true" /><p className="text-[11px] font-semibold text-foreground">Mission links</p></div>
                {selectedBotMissions.map((mission) => <div key={mission.id} className="rounded-lg border border-border bg-card p-2"><p className="text-[11px] text-foreground">{mission.title}</p><p className="text-[10px] text-muted-foreground capitalize">{(mission.assigned_squads || []).join(', ')}</p></div>)}
              </div>
              <div className="rounded-xl border border-border bg-background p-3 space-y-2">
                <p className="text-[11px] font-semibold text-foreground">Assigned mission / tasks</p>
                {selectedBotTasks.map((task) => <div key={task.id} className="rounded-lg border border-border bg-card p-2"><p className="text-[11px] text-foreground">{task.title}</p><p className="text-[10px] text-muted-foreground">{task.status}</p></div>)}
              </div>
            </>
          ) : <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Select a bot node to inspect its live command profile.</div>}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 space-y-3" aria-labelledby="communications-heading">
          <div className="flex items-center gap-2"><MessageSquareText className="w-4 h-4 text-primary" aria-hidden="true" /><h3 id="communications-heading" className="text-sm font-semibold text-foreground">Communications Layer</h3></div>
          <div className="space-y-2">
            {selectedBotCommunications.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-semibold text-foreground">{item.from_bot_code} → {item.to_bot_code}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] uppercase text-muted-foreground">
                    <span>{item.message_type}</span>
                    <span>{item.severity}</span>
                    {item.squad_name && <span className="capitalize">{item.squad_name}</span>}
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{item.message}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}