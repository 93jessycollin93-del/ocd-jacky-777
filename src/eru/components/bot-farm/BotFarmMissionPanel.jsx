export default function BotFarmMissionPanel({ missions, squads, bots }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">Mission Oversight</p>
      <div className="space-y-2">
        {missions.map((mission) => {
          const linkedSquads = squads.filter((squad) => (mission.assigned_squad_ids || []).includes(squad.id));
          const leader = bots.find((bot) => bot.id === mission.leader_bot_id);
          return (
            <div key={mission.id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">{mission.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{mission.objective}</p>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary">{mission.status}</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-6 text-[10px] text-muted-foreground">
                <div>Priority <span className="text-foreground">{mission.priority}</span></div>
                <div>Expected <span className="text-foreground">{mission.expected_output_quality}%</span></div>
                <div>Actual <span className="text-foreground">{mission.actual_output_quality}%</span></div>
                <div>Success <span className="text-foreground">{mission.success_probability}%</span></div>
                <div>Complexity <span className="text-foreground">{mission.coordination_complexity}</span></div>
                <div>Security <span className="text-foreground">{mission.security_pressure}</span></div>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">Leader <span className="text-foreground">{leader?.name || 'Unassigned'}</span> · Squads <span className="text-foreground">{linkedSquads.map((item) => item.name).join(', ') || 'None'}</span></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}