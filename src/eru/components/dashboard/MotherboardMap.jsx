import { base44 } from '@/eru/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const NODES = [
  { id: 1, x: 50, y: 30, label: 'TON Basics', ch: 1 },
  { id: 2, x: 180, y: 30, label: 'Wallet Setup', ch: 2 },
  { id: 3, x: 310, y: 30, label: 'Spot Trading', ch: 3 },
  { id: 4, x: 50, y: 120, label: 'NFT Intro', ch: 4 },
  { id: 5, x: 180, y: 120, label: 'DeFi Basics', ch: 5 },
  { id: 6, x: 310, y: 120, label: 'Security', ch: 6 },
  { id: 7, x: 115, y: 210, label: 'Advanced Trade', ch: 7 },
  { id: 8, x: 245, y: 210, label: 'Portfolio Mgmt', ch: 8 },
  { id: 9, x: 180, y: 290, label: 'Master', ch: 9 },
];

const EDGES = [
  [1,2],[2,3],[1,4],[2,5],[3,6],[4,5],[5,6],[4,7],[5,7],[5,8],[6,8],[7,9],[8,9],
];

export default function MotherboardMap() {
  const { data: progress = [] } = useQuery({
    queryKey: ['userProgress'],
    queryFn: () => base44.entities.UserProgress.list(),
  });

  const completedChapters = new Set(
    progress.filter(p => p.status === 'completed').map(p => parseInt(p.module_id))
  );

  return (
    <div className="bg-card border border-border rounded-xl p-3 w-full overflow-x-auto">
      <svg viewBox="0 0 360 340" width="100%" style={{minWidth: 300}}>
        {/* Grid lines */}
        {[0,60,120,180,240,300].map(y => (
          <line key={`h${y}`} x1="0" y1={y} x2="360" y2={y} stroke="hsl(230 18% 16%)" strokeWidth="0.5"/>
        ))}
        {[0,60,120,180,240,300,360].map(x => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="340" stroke="hsl(230 18% 16%)" strokeWidth="0.5"/>
        ))}

        {/* Edges */}
        {EDGES.map(([a, b], i) => {
          const na = NODES[a-1], nb = NODES[b-1];
          const active = completedChapters.has(na.ch) && completedChapters.has(nb.ch);
          return (
            <line key={i}
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke={active ? 'hsl(160 100% 45%)' : 'hsl(230 18% 20%)'}
              strokeWidth={active ? 1.5 : 1}
              strokeDasharray={active ? 'none' : '4 3'}
              opacity={active ? 0.8 : 0.4}
            />
          );
        })}

        {/* Nodes */}
        {NODES.map(node => {
          const done = completedChapters.has(node.ch);
          return (
            <g key={node.id}>
              {done && (
                <circle cx={node.x} cy={node.y} r="18" fill="none"
                  stroke="hsl(160 100% 45%)" strokeWidth="1" opacity="0.3">
                  <animate attributeName="r" values="18;22;18" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite"/>
                </circle>
              )}
              <circle cx={node.x} cy={node.y} r="12"
                fill={done ? 'hsl(160 100% 45% / 0.15)' : 'hsl(230 22% 9%)'}
                stroke={done ? 'hsl(160 100% 45%)' : 'hsl(230 18% 25%)'}
                strokeWidth={done ? 2 : 1}
              />
              <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize="8" fill={done ? 'hsl(160 100% 45%)' : 'hsl(220 12% 50%)'} fontWeight={done ? 600 : 400}>
                {node.ch}
              </text>
              <text x={node.x} y={node.y + 22} textAnchor="middle"
                fontSize="7" fill={done ? 'hsl(220 20% 80%)' : 'hsl(220 12% 45%)'}>
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 px-1">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-3 rounded-full border-2 border-green-400 bg-green-400/20 inline-block"/>Completed
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-3 rounded-full border border-muted-foreground/30 inline-block"/>Locked
        </span>
      </div>
    </div>
  );
}