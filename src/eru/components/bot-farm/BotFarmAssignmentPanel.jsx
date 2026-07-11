export default function BotFarmAssignmentPanel({ missions, squads, commanders, selectedMissionId, setSelectedMissionId, onAssignSquad }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Squad Assignment</p>
        <p className="text-[11px] text-muted-foreground">Commanders route squads to missions; poor structure increases coordination cost.</p>
      </div>

      <select value={selectedMissionId} onChange={(e) => setSelectedMissionId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none">
        {missions.map((mission) => (
          <option key={mission.id} value={mission.id}>{mission.title}</option>
        ))}
      </select>

      <div className="space-y-2">
        {squads.map((squad, index) => {
          const commander = commanders[index % Math.max(1, commanders.length)];
          return (
            <div key={squad.id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">{squad.name}</p>
                  <p className="text-[11px] text-muted-foreground">Commander: {commander?.name || 'Unassigned'}</p>
                </div>
                <button onClick={() => onAssignSquad(squad, commander)} className="rounded-xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground">Assign to Mission</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}