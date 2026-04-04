import { useGame } from '@/game/GameContext';
import { useI18n } from '@/game/i18n';
import { EXPEDITIONS } from '@/game/data';
import { useEffect, useRef, useState } from 'react';

export default function Minimap() {
  const { state } = useGame();
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const completedExpeditions = state.marches
    .filter(m => m.result?.victory)
    .map(m => m.expeditionId);
  const uniqueConquered = [...new Set(completedExpeditions)];
  const activeMarches = state.marches.filter(m => !m.result);

  const citadel = { x: 140, y: 90 };
  const expNodes = EXPEDITIONS.map((exp, i) => ({
    id: exp.id,
    icon: exp.icon,
    x: 30 + (i % 4) * 65 + (i % 2) * 10,
    y: 25 + Math.floor(i / 4) * 70 + (i % 3) * 15,
    conquered: uniqueConquered.includes(exp.id),
    active: activeMarches.some(m => m.expeditionId === exp.id),
  }));

  // Animated canvas background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 560;
    canvas.height = 360;
    ctx.scale(2, 2);

    let time = 0;
    const draw = () => {
      time += 0.016;
      ctx.clearRect(0, 0, 280, 180);

      // Terrain texture
      for (let gx = 0; gx < 280; gx += 10) {
        for (let gy = 0; gy < 180; gy += 10) {
          const n = Math.sin(gx * 0.03 + gy * 0.05) * 0.5 + Math.cos(gx * 0.02 - gy * 0.03) * 0.3;
          if (n < -0.2) {
            ctx.fillStyle = `hsla(210, 40%, 20%, 0.15)`;
          } else if (n > 0.3) {
            ctx.fillStyle = `hsla(120, 25%, 18%, 0.1)`;
          } else {
            ctx.fillStyle = `hsla(42, 20%, 15%, 0.05)`;
          }
          ctx.fillRect(gx, gy, 10, 10);
        }
      }

      // Subtle animated grid
      ctx.fillStyle = 'hsla(42, 30%, 50%, 0.06)';
      for (let gx = 0; gx < 280; gx += 20) {
        for (let gy = 0; gy < 180; gy += 20) {
          const pulse = 0.8 + Math.sin(time + gx * 0.02 + gy * 0.02) * 0.3;
          ctx.beginPath();
          ctx.arc(gx, gy, pulse, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Ambient dust particles
      ctx.fillStyle = 'hsla(45, 60%, 60%, 0.25)';
      for (let i = 0; i < 8; i++) {
        const px = ((Math.sin(time * 0.25 + i * 5) + 1) / 2) * 280;
        const py = ((Math.cos(time * 0.18 + i * 3.7) + 1) / 2) * 180;
        ctx.beginPath();
        ctx.arc(px, py, 0.6 + Math.sin(time * 2 + i) * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fog of war vignette
      const vig = ctx.createRadialGradient(140, 90, 20, 140, 90, 150);
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(0.8, 'hsla(30, 20%, 8%, 0.2)');
      vig.addColorStop(1, 'hsla(30, 20%, 5%, 0.5)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, 280, 180);

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="bg-card medieval-border rounded-lg p-3">
      <h3 className="font-display text-sm text-foreground mb-2">{t('dashboard.minimap')}</h3>
      <div className="relative w-full" style={{ height: '180px' }}>
        {/* Animated canvas background */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded"
          style={{ imageRendering: 'auto' }}
        />

        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <filter id="miniGlow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Territory glow for conquered areas */}
          {expNodes.filter(n => n.conquered).map(node => (
            <circle
              key={`ter-${node.id}`}
              cx={node.x} cy={node.y} r={16}
              fill="hsl(var(--secondary))"
              opacity={0.08}
              filter="url(#miniGlow)"
            />
          ))}

          {/* Curved lines from citadel to nodes */}
          {expNodes.map(node => {
            const mx = (citadel.x + node.x) / 2 + (node.y - citadel.y) * 0.1;
            const my = (citadel.y + node.y) / 2 - (node.x - citadel.x) * 0.1;
            return (
              <path
                key={node.id}
                d={`M ${citadel.x} ${citadel.y} Q ${mx} ${my} ${node.x} ${node.y}`}
                fill="none"
                stroke={node.active ? 'url(#activeGrad)' : node.conquered ? 'hsl(var(--secondary))' : 'hsl(var(--border))'}
                strokeWidth={node.active ? 1.8 : node.conquered ? 1 : 0.6}
                strokeDasharray={node.active ? '4 2' : node.conquered ? 'none' : '2 3'}
                opacity={node.active ? 1 : node.conquered ? 0.5 : 0.2}
                filter={node.active ? 'url(#miniGlow)' : 'none'}
              >
                {node.active && (
                  <animate attributeName="stroke-dashoffset" from="12" to="0" dur="0.8s" repeatCount="indefinite" />
                )}
              </path>
            );
          })}
        </svg>

        {/* Citadel node */}
        <div
          className="absolute flex flex-col items-center"
          style={{ left: citadel.x - 14, top: citadel.y - 14 }}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-xs shadow-lg border border-primary/50"
            style={{ boxShadow: '0 0 10px hsla(var(--primary), 0.4)' }}
          >
            🏯
          </div>
          <span className="text-[8px] font-display text-primary mt-0.5 whitespace-nowrap font-bold drop-shadow-sm">
            {state.realmName.slice(0, 8)}
          </span>
        </div>

        {/* Expedition nodes */}
        {expNodes.map(node => (
          <div
            key={node.id}
            className="absolute flex items-center justify-center"
            style={{ left: node.x - 9, top: node.y - 9 }}
            title={t(`expedition.${node.id}.name`)}
          >
            <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] border ${
              node.active ? 'bg-primary/80 border-primary/60 animate-pulse shadow-md' :
              node.conquered ? 'bg-secondary/50 border-secondary/40 shadow-sm' :
              'bg-muted/50 border-border/30'
            }`}
              style={node.active ? { boxShadow: '0 0 6px hsla(var(--primary), 0.5)' } : {}}
            >
              {node.icon}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="absolute bottom-1 right-1 text-[8px] text-muted-foreground space-y-0.5 bg-card/60 backdrop-blur-sm rounded px-1.5 py-1">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gradient-to-br from-secondary to-secondary/60 inline-block" />
            {t('dashboard.conquered')}
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted/50 border border-border/30 inline-block" />
            {t('dashboard.unexplored')}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        {t('dashboard.territoriesControlled', uniqueConquered.length, EXPEDITIONS.length)}
      </p>
    </div>
  );
}
