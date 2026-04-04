import { useState, useMemo, useCallback, useRef } from 'react';
import { useGame } from '@/game/GameContext';
import { useI18n } from '@/game/i18n';

interface Territory {
  id: string;
  name: string;
  icon: string;
  row: number;
  col: number;
  owner: 'player' | 'ally' | 'enemy' | 'neutral';
  power: number;
  terrain: 'mountain' | 'forest' | 'plains' | 'water' | 'fortress';
}

const TERRAIN_COLORS: Record<string, { bg: string; border: string }> = {
  mountain: { bg: 'bg-muted/40', border: 'border-muted-foreground/30' },
  forest: { bg: 'bg-green-900/30', border: 'border-green-700/30' },
  plains: { bg: 'bg-yellow-900/20', border: 'border-yellow-700/20' },
  water: { bg: 'bg-blue-900/30', border: 'border-blue-700/30' },
  fortress: { bg: 'bg-primary/20', border: 'border-primary/30' },
};

const OWNER_RINGS: Record<string, string> = {
  player: 'ring-2 ring-primary/60',
  ally: 'ring-2 ring-green-400/50',
  enemy: 'ring-2 ring-destructive/50',
  neutral: '',
};

const ALLIANCE_BORDERS: Record<string, string> = {
  player: 'shadow-[0_0_8px_hsl(var(--primary)/0.3)]',
  ally: 'shadow-[0_0_8px_rgba(74,222,128,0.2)]',
  enemy: 'shadow-[0_0_8px_rgba(239,68,68,0.2)]',
  neutral: '',
};

function generateTerritories(): Territory[] {
  const terrains: Territory['terrain'][] = ['mountain', 'forest', 'plains', 'water', 'fortress'];
  const owners: Territory['owner'][] = ['player', 'ally', 'enemy', 'neutral'];
  const icons = ['⛰️', '🌲', '🌾', '🌊', '🏯', '🏔️', '🌳', '🏰', '⛩️', '🗻', '🌿', '🏞️'];
  const names = [
    'Huangshan Peak', 'Jade Forest', 'Golden Plains', 'Mirror Lake',
    'Dragon Gate', 'Cloud Valley', 'Iron Ridge', 'Bamboo Grove',
    'Phoenix Nest', 'Lotus Pond', 'Tiger Pass', 'Silk Road',
    'Crane Summit', 'Moon Bridge', 'Shadow Gorge', 'Imperial Road',
    'Thunder Peak', 'Orchid Terrace', 'Emerald Falls', 'Sun Temple',
  ];

  const territories: Territory[] = [];
  let idx = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      const i = idx++;
      territories.push({
        id: `t_${row}_${col}`,
        name: names[i % names.length],
        icon: icons[i % icons.length],
        row,
        col,
        owner: i < 3 ? 'player' : i < 5 ? 'ally' : i < 8 ? 'enemy' : 'neutral',
        power: Math.floor(Math.random() * 5000) + 500,
        terrain: terrains[i % terrains.length],
      });
    }
  }
  return territories;
}

export default function DashboardWorldMap() {
  const { state } = useGame();
  const { t } = useI18n();
  const [selectedTile, setSelectedTile] = useState<Territory | null>(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const territories = useMemo(() => generateTerritories(), []);

  const activeMarches = state.marches.filter(m => !m.result);

  const playerCount = territories.filter(t => t.owner === 'player').length;
  const allyCount = territories.filter(t => t.owner === 'ally').length;

  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => Math.min(1.5, Math.max(0.8, prev + delta)));
  }, []);

  return (
    <div className="bg-card/60 backdrop-blur rounded-xl border border-border/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">🗺️ World Map</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-primary">🏴 {playerCount}</span>
          <span className="text-[10px] text-green-400">🤝 {allyCount}</span>
          <span className="text-[10px] text-muted-foreground">🚩 {activeMarches.length}</span>
          <button onClick={() => handleZoom(0.1)} className="text-xs px-1.5 py-0.5 rounded bg-background/30 border border-border/20 text-foreground">+</button>
          <button onClick={() => handleZoom(-0.1)} className="text-xs px-1.5 py-0.5 rounded bg-background/30 border border-border/20 text-foreground">−</button>
        </div>
      </div>

      {/* Map Grid */}
      <div
        ref={containerRef}
        className="overflow-auto rounded-lg border border-border/20 bg-background/20 p-2"
        style={{ maxHeight: '260px' }}
      >
        <div
          className="grid grid-cols-4 gap-1.5 transition-transform"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%` }}
        >
          {territories.map(tile => (
            <button
              key={tile.id}
              onClick={() => setSelectedTile(tile.id === selectedTile?.id ? null : tile)}
              className={`
                relative p-2 rounded-lg border text-center transition-all
                ${TERRAIN_COLORS[tile.terrain].bg} ${TERRAIN_COLORS[tile.terrain].border}
                ${OWNER_RINGS[tile.owner]} ${ALLIANCE_BORDERS[tile.owner]}
                ${selectedTile?.id === tile.id ? 'ring-2 ring-primary scale-105' : 'hover:scale-102'}
              `}
            >
              <span className="text-lg block">{tile.icon}</span>
              <span className="text-[9px] text-foreground/80 block truncate">{tile.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected tile info */}
      {selectedTile && (
        <div className="mt-3 p-3 rounded-lg bg-background/30 border border-border/20">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-foreground">{selectedTile.icon} {selectedTile.name}</h4>
              <p className="text-[10px] text-muted-foreground capitalize">{selectedTile.terrain} • {selectedTile.owner}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-primary">{selectedTile.power.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground block">power</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex gap-3 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/60" /> Your Territory</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400/60" /> Alliance</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive/60" /> Enemy</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Neutral</span>
      </div>
    </div>
  );
}
