import { useSphere } from '../SphereContext';

export default function TechTreePanel() {
  const { state, dispatch } = useSphere();
  const categories = ['economy', 'military', 'defense', 'exploration'] as const;
  const catIcons = { economy: '💰', military: '⚔️', defense: '🛡️', exploration: '🔭' };

  return (
    <div className="p-4 overflow-y-auto max-h-[calc(100vh-200px)] space-y-6">
      <h2 className="text-xl font-bold text-foreground">Research Tree</h2>
      <div className="text-sm text-muted-foreground">Research Points: 🔬 {state.globalResources.research}</div>

      {categories.map(cat => (
        <div key={cat}>
          <h3 className="font-semibold text-foreground mb-2 capitalize">{catIcons[cat]} {cat}</h3>
          <div className="space-y-2">
            {state.tech.filter(t => t.category === cat).map(tech => {
              const prereqsMet = tech.prerequisites.every(p => state.tech.find(t => t.id === p)?.unlocked);
              const canResearch = !tech.unlocked && !tech.researching && prereqsMet && state.globalResources.research >= tech.cost;
              const remaining = tech.researchEnd ? Math.max(0, Math.ceil((tech.researchEnd - Date.now()) / 1000)) : 0;

              return (
                <div key={tech.id} className={`p-3 rounded border text-sm ${
                  tech.unlocked ? 'bg-green-500/10 border-green-500/30' :
                  tech.researching ? 'bg-blue-500/10 border-blue-500/30' :
                  'bg-card border-border'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{tech.icon} {tech.name}</span>
                    {tech.unlocked && <span className="text-green-400 text-xs">✅ DONE</span>}
                    {tech.researching && <span className="text-blue-400 text-xs animate-pulse">{remaining}s</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{tech.description}</p>
                  <p className="text-xs text-primary mt-0.5">{tech.effects}</p>
                  {!tech.unlocked && !tech.researching && (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">Cost: {tech.cost} RP</span>
                      <button
                        onClick={() => dispatch({ type: 'START_RESEARCH', techId: tech.id })}
                        disabled={!canResearch}
                        className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded disabled:opacity-40 hover:opacity-90"
                      >
                        {!prereqsMet ? '🔒 Locked' : 'Research'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
