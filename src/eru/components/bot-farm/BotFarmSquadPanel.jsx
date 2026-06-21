export default function BotFarmSquadPanel({ squads, bots, missions }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">Squad Command Layer</p>
      <div className="space-y-3">
        {squads.map((squad) => {
          const memberCount = bots.filter((bot) => (squad.member_bot_ids || []).includes(bot.id)).length;
          const mission = missions.find((item) => item.id === squad.current_mission_id);
          return (
            <div key={squad.id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">{squad.name}</p>
                  <p className="text-[11px] text-muted-foreground">{(squad.specialization_focus || []).join(', ') || 'general ops'}</p>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary">{squad.status}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6 text-[10px] text-muted-foreground">
                <div>Members <span className="text-foreground">{memberCount}</span></div>
                <div>Coordination <span className="text-foreground">{squad.coordination_quality}</span></div>
                <div>Overhead <span className="text-foreground">{squad.coordination_overhead}</span></div>
                <div>Reliability <span className="text-foreground">{squad.reliability_score}</span></div>
                <div>Throughput <span className="text-foreground">{squad.throughput_score}</span></div>
                <div>Mission <span className="text-foreground">{mission?.title || 'None'}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}