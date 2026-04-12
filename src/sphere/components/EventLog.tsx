import { useSphere } from '../SphereContext';

export default function EventLog() {
  const { state } = useSphere();
  const typeIcons = { combat: '⚔️', diplomacy: '🤝', economy: '💰', discovery: '🔭', research: '🔬', alert: '🚨' };

  return (
    <div className="p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
      <h2 className="text-xl font-bold text-foreground mb-4">Event Log</h2>
      <div className="space-y-2">
        {[...state.log].reverse().map(entry => (
          <div key={entry.id} className="flex gap-2 text-sm bg-card border border-border rounded p-2">
            <span>{typeIcons[entry.type]}</span>
            <div className="flex-1">
              <p className="text-foreground">{entry.message}</p>
              <p className="text-xs text-muted-foreground">{new Date(entry.time).toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
