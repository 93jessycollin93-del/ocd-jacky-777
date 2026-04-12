import { useSphere } from '../SphereContext';
import { BUILDING_INFO } from '../types';
import type { BuildingType } from '../types';

export default function PlanetPanel() {
  const { state, dispatch, setView } = useSphere();
  const planet = state.planets.find(p => p.id === state.selectedPlanet);

  if (!planet) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-lg">Select a planet from the galaxy map</p>
      </div>
    );
  }

  const ownerBadge = planet.owner === 'player'
    ? 'bg-green-500/20 text-green-400 border-green-500/30'
    : planet.owner === 'enemy'
    ? 'bg-red-500/20 text-red-400 border-red-500/30'
    : 'bg-muted text-muted-foreground border-border';

  const canBuild = planet.owner === 'player' && state.globalResources.credits >= 100;

  const buildableTypes = Object.keys(BUILDING_INFO).filter(
    bt => !planet.buildings.some(b => b.type === bt)
  ) as BuildingType[];

  return (
    <div className="space-y-4 p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{planet.name}</h2>
        <span className={`text-xs px-2 py-0.5 rounded border ${ownerBadge}`}>
          {planet.owner.toUpperCase()}
        </span>
      </div>

      <div className="text-sm text-muted-foreground capitalize">{planet.type} world</div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-muted/50 rounded p-2">👥 Pop: {planet.population.toLocaleString()}/{planet.maxPopulation.toLocaleString()}</div>
        <div className="bg-muted/50 rounded p-2">🛡️ Def: {planet.defense}</div>
        <div className="bg-muted/50 rounded p-2">⛏️ {planet.resources.minerals}</div>
        <div className="bg-muted/50 rounded p-2">⚡ {planet.resources.energy}</div>
        <div className="bg-muted/50 rounded p-2">🌾 {planet.resources.food}</div>
        <div className="bg-muted/50 rounded p-2">💰 {planet.resources.credits}</div>
      </div>

      {planet.owner === 'neutral' && state.globalResources.credits >= 500 && (
        <button
          onClick={() => dispatch({ type: 'COLONIZE', planetId: planet.id })}
          className="w-full py-2 rounded bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
        >
          🏗️ Colonize (500 credits)
        </button>
      )}

      {planet.owner === 'player' && (
        <>
          <div>
            <h3 className="font-semibold text-foreground mb-2">Buildings</h3>
            <div className="space-y-1">
              {planet.buildings.map(b => {
                const info = BUILDING_INFO[b.type];
                return (
                  <div key={b.id} className="flex items-center justify-between bg-muted/50 rounded p-2 text-sm">
                    <span>{info.icon} {info.name} Lv{b.level}</span>
                    <button
                      onClick={() => dispatch({ type: 'UPGRADE_BUILDING', planetId: planet.id, buildingId: b.id })}
                      className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded hover:bg-primary/30"
                      disabled={state.globalResources.credits < 150}
                    >
                      ⬆️ 150cr
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {buildableTypes.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">Build New</h3>
              <div className="grid grid-cols-2 gap-1">
                {buildableTypes.slice(0, 6).map(bt => {
                  const info = BUILDING_INFO[bt];
                  return (
                    <button
                      key={bt}
                      onClick={() => dispatch({ type: 'BUILD', planetId: planet.id, buildingType: bt })}
                      disabled={!canBuild}
                      className="text-xs p-2 bg-card border border-border rounded hover:bg-muted/80 disabled:opacity-40 text-left"
                    >
                      {info.icon} {info.name}
                      <div className="text-muted-foreground">{info.baseCost}cr</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
