import { useState } from 'react';
import { useSphere } from '../SphereContext';
import { SHIP_STATS } from '../types';
import type { ShipType } from '../types';

export default function FleetPanel() {
  const { state, dispatch } = useSphere();
  const [buildShipType, setBuildShipType] = useState<ShipType>('fighter');
  const [buildCount, setBuildCount] = useState(1);
  const [sendTarget, setSendTarget] = useState('');

  const playerFleets = state.fleets.filter(f => f.owner === 'player');
  const selectedFleet = state.fleets.find(f => f.id === state.selectedFleet);

  return (
    <div className="p-4 overflow-y-auto max-h-[calc(100vh-200px)] space-y-4">
      <h2 className="text-xl font-bold text-foreground">Fleet Command</h2>

      {playerFleets.map(fleet => (
        <div
          key={fleet.id}
          className={`p-3 rounded border cursor-pointer transition-colors ${
            state.selectedFleet === fleet.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted/50'
          }`}
          onClick={() => dispatch({ type: 'SELECT_FLEET', id: fleet.id })}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-foreground">{fleet.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              fleet.status === 'moving' ? 'bg-blue-500/20 text-blue-400' :
              fleet.status === 'combat' ? 'bg-red-500/20 text-red-400' :
              'bg-muted text-muted-foreground'
            }`}>{fleet.status}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {fleet.ships.map(ship => (
              <span key={ship.type} className="bg-muted rounded px-2 py-1">
                {SHIP_STATS[ship.type].icon} {ship.type} ×{ship.count}
              </span>
            ))}
          </div>
          {fleet.status === 'moving' && fleet.arrivalTime && (
            <div className="text-xs text-blue-400 mt-1 animate-pulse">
              ETA: {Math.max(0, Math.ceil((fleet.arrivalTime - Date.now()) / 1000))}s
            </div>
          )}
        </div>
      ))}

      {selectedFleet && selectedFleet.status === 'orbiting' && (
        <>
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-foreground mb-2">Build Ships</h3>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <select
                  value={buildShipType}
                  onChange={e => setBuildShipType(e.target.value as ShipType)}
                  className="w-full bg-muted text-foreground rounded p-2 text-sm border border-border"
                >
                  {(Object.keys(SHIP_STATS) as ShipType[]).map(st => (
                    <option key={st} value={st}>
                      {SHIP_STATS[st].icon} {st} ({SHIP_STATS[st].cost}cr)
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="number"
                min={1}
                max={50}
                value={buildCount}
                onChange={e => setBuildCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-muted text-foreground rounded p-2 text-sm border border-border"
              />
              <button
                onClick={() => dispatch({ type: 'BUILD_SHIP', planetId: selectedFleet.originPlanet, shipType: buildShipType, count: buildCount })}
                disabled={state.globalResources.credits < SHIP_STATS[buildShipType].cost * buildCount}
                className="px-3 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-40 hover:opacity-90"
              >
                Build
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-foreground mb-2">Deploy Fleet</h3>
            <div className="flex gap-2">
              <select
                value={sendTarget}
                onChange={e => setSendTarget(e.target.value)}
                className="flex-1 bg-muted text-foreground rounded p-2 text-sm border border-border"
              >
                <option value="">Select target...</option>
                {state.planets.filter(p => p.id !== selectedFleet.originPlanet).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.owner === 'enemy' ? '⚔️' : p.owner === 'player' ? '🟢' : '⚪'} {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => { if (sendTarget) dispatch({ type: 'SEND_FLEET', fleetId: selectedFleet.id, targetPlanetId: sendTarget }); }}
                disabled={!sendTarget}
                className="px-3 py-2 bg-destructive text-destructive-foreground rounded text-sm disabled:opacity-40 hover:opacity-90"
              >
                Launch
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
