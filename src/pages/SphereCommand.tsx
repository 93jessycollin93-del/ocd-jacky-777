import React from 'react';
import { SphereProvider, useSphere } from '../sphere/SphereContext';
import GalaxyView from '../sphere/components/GalaxyView';
import PlanetPanel from '../sphere/components/PlanetPanel';
import TechTreePanel from '../sphere/components/TechTreePanel';
import FleetPanel from '../sphere/components/FleetPanel';
import EventLog from '../sphere/components/EventLog';
import ResourceHUD from '../sphere/components/ResourceHUD';
import { useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { id: 'galaxy', label: '🌌 Galaxy', view: 'galaxy' as const },
  { id: 'planet', label: '🌍 Planet', view: 'planet' as const },
  { id: 'tech', label: '🔬 Research', view: 'tech' as const },
  { id: 'fleets', label: '🚀 Fleets', view: 'fleets' as const },
  { id: 'log', label: '📜 Log', view: 'log' as const },
];

function SphereContent() {
  const { state, setView } = useSphere();
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <ResourceHUD />

      <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 border-b border-border overflow-x-auto">
        <button onClick={() => navigate('/play')} className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground">
          ← Back
        </button>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.view)}
            className={`text-xs px-3 py-1.5 rounded whitespace-nowrap transition-colors ${
              state.view === item.view
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {item.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          {state.paused && <span className="text-xs text-yellow-400 animate-pulse">⏸ PAUSED</span>}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {state.view === 'galaxy' && (
          <>
            <div className="flex-1 relative">
              <GalaxyView />
              <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 rounded p-2 border border-border">
                Click planet to select • Scroll to zoom • Drag to orbit
              </div>
            </div>
            <div className="w-80 border-l border-border overflow-y-auto bg-card/50">
              <PlanetPanel />
            </div>
          </>
        )}
        {state.view === 'planet' && (
          <div className="flex-1 overflow-y-auto">
            <PlanetPanel />
          </div>
        )}
        {state.view === 'tech' && (
          <div className="flex-1 overflow-y-auto">
            <TechTreePanel />
          </div>
        )}
        {state.view === 'fleets' && (
          <div className="flex-1 overflow-y-auto">
            <FleetPanel />
          </div>
        )}
        {state.view === 'log' && (
          <div className="flex-1 overflow-y-auto">
            <EventLog />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SphereCommand() {
  return (
    <SphereProvider>
      <SphereContent />
    </SphereProvider>
  );
}
