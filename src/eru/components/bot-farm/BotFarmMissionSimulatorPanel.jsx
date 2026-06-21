import { useMemo, useState } from 'react';
import { GripVertical, ShieldAlert, Sparkles, Target } from 'lucide-react';
import { computeMissionSimulation } from './BotFarmUtils';

function toneClass(level) {
  return {
    low: 'text-green-400 border-green-500/20 bg-green-500/10',
    medium: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10',
    high: 'text-orange-400 border-orange-500/20 bg-orange-500/10',
    critical: 'text-red-400 border-red-500/20 bg-red-500/10',
  }[level] || 'text-slate-300 border-border bg-background';
}

function DraggableBot({ bot }) {
  const handleDragStart = (event) => {
    event.dataTransfer.setData('text/plain', bot.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-left"
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-foreground">{bot.name}</p>
        <p className="text-[10px] text-muted-foreground">{bot.specialty.replaceAll('_', ' ')} · {bot.status}</p>
      </div>
      <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </div>
  );
}

function DropZone({ title, items, onDropBot, onRemoveBot, emptyText }) {
  const handleDrop = (event) => {
    event.preventDefault();
    const botId = event.dataTransfer.getData('text/plain');
    if (botId) onDropBot(botId);
  };

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className="rounded-xl border border-dashed border-border bg-background/70 p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <span className="text-[10px] text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((bot) => (
            <button
              key={bot.id}
              onClick={() => onRemoveBot(bot.id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">{bot.name}</p>
                <p className="text-[10px] text-muted-foreground">{bot.specialty.replaceAll('_', ' ')} · {bot.status}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">Remove</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BotFarmMissionSimulatorPanel({ bots, missions, squads, upgrades }) {
  const [selectedMissionId, setSelectedMissionId] = useState(missions[0]?.id || '');
  const [selectedBotIds, setSelectedBotIds] = useState([]);

  const selectedMission = missions.find((mission) => mission.id === selectedMissionId) || null;
  const selectedBots = bots.filter((bot) => selectedBotIds.includes(bot.id));
  const availableBots = bots.filter((bot) => !selectedBotIds.includes(bot.id));

  const simulation = useMemo(() => {
    if (!selectedMission) return null;
    return computeMissionSimulation({ mission: selectedMission, selectedBots, squads, upgrades });
  }, [selectedMission, selectedBots, squads, upgrades]);

  const addBot = (botId) => {
    setSelectedBotIds((current) => current.includes(botId) ? current : [...current, botId]);
  };

  const removeBot = (botId) => {
    setSelectedBotIds((current) => current.filter((id) => id !== botId));
  };

  const clearTeam = () => setSelectedBotIds([]);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">What-If Mission Simulator</p>
          <p className="text-[11px] text-muted-foreground">Drag bots into a simulated mission team to preview outcome score and risk before any live assignment.</p>
        </div>
        <button onClick={clearTeam} className="rounded-xl border border-border px-3 py-2 text-[11px] text-muted-foreground">Clear simulation</button>
      </div>

      <select
        value={selectedMissionId}
        onChange={(event) => {
          setSelectedMissionId(event.target.value);
          setSelectedBotIds([]);
        }}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
      >
        {missions.map((mission) => (
          <option key={mission.id} value={mission.id}>{mission.title}</option>
        ))}
      </select>

      {selectedMission && simulation && (
        <div className="grid gap-3 md:grid-cols-[1fr,1fr,0.95fr]">
          <div className="space-y-2">
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-semibold text-foreground">Mission profile</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{selectedMission.objective}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                <div>Priority <span className="text-foreground">{selectedMission.priority}</span></div>
                <div>Expected <span className="text-foreground">{selectedMission.expected_output_quality}%</span></div>
                <div>Complexity <span className="text-foreground">{selectedMission.coordination_complexity}</span></div>
                <div>Security <span className="text-foreground">{selectedMission.security_pressure}</span></div>
              </div>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {availableBots.map((bot) => <DraggableBot key={bot.id} bot={bot} />)}
            </div>
          </div>

          <DropZone
            title="Simulated mission team"
            items={selectedBots}
            onDropBot={addBot}
            onRemoveBot={removeBot}
            emptyText="Drop bots here to build a mission team."
          />

          <div className="space-y-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-foreground">Projected outcome</p>
              </div>
              <p className="mt-3 text-3xl font-bold text-foreground">{simulation.projectedOutcome}%</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Estimated mission result quality for this bot combination.</p>
            </div>

            <div className={`rounded-xl border p-3 ${toneClass(simulation.riskLevel)}`}>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                <p className="text-xs font-semibold">Risk assessment: {simulation.riskLevel}</p>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{simulation.riskSummary}</p>
            </div>

            <div className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-foreground">Simulator signals</p>
              </div>
              <div className="mt-3 space-y-2 text-[11px] text-muted-foreground">
                <div className="flex items-center justify-between gap-3"><span>Coverage fit</span><span className="text-foreground">{simulation.coverageFit}%</span></div>
                <div className="flex items-center justify-between gap-3"><span>Coordination load</span><span className="text-foreground">{simulation.coordinationLoad}</span></div>
                <div className="flex items-center justify-between gap-3"><span>Fatigue pressure</span><span className="text-foreground">{simulation.fatiguePressure}</span></div>
                <div className="flex items-center justify-between gap-3"><span>Security resilience</span><span className="text-foreground">{simulation.securityResilience}%</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-semibold text-foreground">Why this score</p>
              <div className="mt-2 space-y-1">
                {simulation.highlights.map((item) => (
                  <p key={item} className="text-[11px] text-muted-foreground">• {item}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}