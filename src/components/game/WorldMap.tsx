import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { useGame } from '@/game/GameContext';
import { useI18n } from '@/game/i18n';
import { EXPEDITIONS, LEGENDARY_CREATURES } from '@/game/data';
import { useAudio } from '@/game/AudioSystem';

const WorldMap3D = lazy(() => import('./WorldMap3D'));

interface MapNode {
  id: string;
  x: number;
  y: number;
  icon: string;
  label: string;
  type: 'city' | 'expedition' | 'gathering' | 'defense' | 'creature';
  difficulty?: number;
}

// ── Optimized multi-layer canvas background ──
function AnimatedMapCanvas({ width, height, scale, offset }: { width: number; height: number; scale: number; offset: { x: number; y: number } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  // Offscreen buffer for terrain (only redraws when pan/zoom changes)
  const terrainBufferRef = useRef<HTMLCanvasElement | null>(null);
  const lastTransformRef = useRef({ scale: 0, ox: 0, oy: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Create offscreen terrain buffer
    if (!terrainBufferRef.current) {
      terrainBufferRef.current = document.createElement('canvas');
    }
    const tBuf = terrainBufferRef.current;
    tBuf.width = width;
    tBuf.height = height;

      const pseudoNoise = (x: number, y: number) => {
        const a = Math.sin(x * 0.018 + y * 0.025) * 0.35;
        const b = Math.cos(x * 0.012 - y * 0.018) * 0.25;
        const c = Math.sin((x + y) * 0.008) * 0.4;
        const d = Math.sin(x * 0.045 + y * 0.035) * 0.12;
        const e = Math.cos(x * 0.06 - y * 0.05) * 0.08;
        // Central mountain peak (Huangshan)
        const cx = width / 2, cy = height / 2;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const peak = Math.max(0, 1 - dist / (width * 0.18)) * 0.8;
        return a + b + c + d + e + peak;
      };

    let time = 0;
    let terrainDirty = true;

    const renderTerrain = () => {
      const tCtx = tBuf.getContext('2d');
      if (!tCtx) return;

      // Ink wash base — warm parchment tones
      const grad = tCtx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.75);
      grad.addColorStop(0, 'hsl(38, 25%, 22%)');
      grad.addColorStop(0.3, 'hsl(35, 20%, 18%)');
      grad.addColorStop(0.6, 'hsl(30, 18%, 14%)');
      grad.addColorStop(1, 'hsl(25, 15%, 8%)');
      tCtx.fillStyle = grad;
      tCtx.fillRect(0, 0, width, height);

      // Multi-biome terrain
      const cellSize = 6;
      for (let gx = 0; gx < width; gx += cellSize) {
        for (let gy = 0; gy < height; gy += cellSize) {
          const worldX = (gx - offset.x) / scale;
          const worldY = (gy - offset.y) / scale;
          const n = pseudoNoise(worldX, worldY);
          const moisture = Math.sin(worldX * 0.01 + worldY * 0.007) * 0.5 + 0.5;

          if (n < -0.3) {
            // Deep ink water
            tCtx.fillStyle = `hsla(210, 30%, 12%, 0.45)`;
          } else if (n < -0.15) {
            // Shallow water — ink wash blue-grey
            const caustic = Math.sin(worldX * 0.08 + worldY * 0.06) * 0.5 + 0.5;
            tCtx.fillStyle = `hsla(200, 25%, ${16 + caustic * 6}%, 0.35)`;
          } else if (n < -0.05) {
            // Valley floor — warm earth
            tCtx.fillStyle = `hsla(35, 30%, 28%, 0.2)`;
          } else if (n < 0.15) {
            // Pine forest — dark ink green
            tCtx.fillStyle = `hsla(150, 25%, ${14 + n * 8}%, 0.28)`;
          } else if (n < 0.35) {
            // Dense mountain forest
            tCtx.fillStyle = `hsla(145, 20%, ${12 + n * 6}%, 0.3)`;
          } else if (n < 0.6) {
            // Granite rock — Huangshan grey
            tCtx.fillStyle = `hsla(220, 8%, ${28 + n * 10}%, 0.25)`;
          } else {
            // Mountain summit — light granite/snow
            const snow = Math.min(1, (n - 0.6) * 3);
            tCtx.fillStyle = `hsla(210, ${6 + snow * 4}%, ${35 + snow * 25}%, 0.3)`;
          }
          tCtx.fillRect(gx, gy, cellSize, cellSize);
        }
      }

      // Contour lines for elevation feel
      tCtx.strokeStyle = 'hsla(42, 20%, 40%, 0.04)';
      tCtx.lineWidth = 0.5;
      for (let level = -0.3; level < 0.6; level += 0.15) {
        tCtx.beginPath();
        for (let gx = 0; gx < width; gx += 4) {
          for (let gy = 0; gy < height; gy += 4) {
            const worldX = (gx - offset.x) / scale;
            const worldY = (gy - offset.y) / scale;
            const n = pseudoNoise(worldX, worldY);
            if (Math.abs(n - level) < 0.02) {
              tCtx.rect(gx, gy, 1, 1);
            }
          }
        }
        tCtx.stroke();
      }
    };

    const draw = () => {
      time += 0.016;

      // Only re-render terrain when transform changes
      const tr = lastTransformRef.current;
      if (terrainDirty || tr.scale !== scale || tr.ox !== offset.x || tr.oy !== offset.y) {
        renderTerrain();
        tr.scale = scale;
        tr.ox = offset.x;
        tr.oy = offset.y;
        terrainDirty = false;
      }

      // Composite terrain buffer
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(tBuf, 0, 0);

      // Animated grid dots (parallax layer)
      ctx.fillStyle = 'hsla(42, 30%, 55%, 0.07)';
      const gridStep = 25 * scale;
      const gridOffX = offset.x % gridStep;
      const gridOffY = offset.y % gridStep;
      for (let gx = gridOffX; gx < width; gx += gridStep) {
        for (let gy = gridOffY; gy < height; gy += gridStep) {
          const pulse = 0.8 + Math.sin(time * 1.5 + gx * 0.015 + gy * 0.015) * 0.4;
          ctx.beginPath();
          ctx.arc(gx, gy, pulse, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Firefly particles (warm, slow drifting)
      for (let i = 0; i < 15; i++) {
        const px = ((Math.sin(time * 0.18 + i * 7.3) + 1) / 2) * width;
        const py = ((Math.cos(time * 0.14 + i * 5.1) + 1) / 2) * height;
        const brightness = 0.3 + Math.sin(time * 3 + i * 2.3) * 0.25;
        const size = 1.2 + Math.sin(time * 2.5 + i) * 0.6;
        // Glow halo
        const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, size * 4);
        glowGrad.addColorStop(0, `hsla(50, 90%, 70%, ${brightness * 0.3})`);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(px - size * 4, py - size * 4, size * 8, size * 8);
        // Core
        ctx.fillStyle = `hsla(45, 85%, 65%, ${brightness + 0.15})`;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Slow dust motes (cooler, larger, slower)
      ctx.fillStyle = 'hsla(30, 30%, 60%, 0.12)';
      for (let i = 0; i < 10; i++) {
        const px = ((Math.sin(time * 0.07 + i * 11.1) + 1) / 2) * width;
        const py = ((Math.cos(time * 0.05 + i * 8.7) + 1) / 2) * height;
        ctx.beginPath();
        ctx.arc(px, py, 2 + Math.sin(time * 0.8 + i * 3) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Multi-layer vignette
      const vig1 = ctx.createRadialGradient(width / 2, height / 2, width * 0.1, width / 2, height / 2, width * 0.52);
      vig1.addColorStop(0, 'transparent');
      vig1.addColorStop(0.6, 'hsla(30, 25%, 8%, 0.15)');
      vig1.addColorStop(0.85, 'hsla(25, 20%, 5%, 0.45)');
      vig1.addColorStop(1, 'hsla(20, 18%, 3%, 0.75)');
      ctx.fillStyle = vig1;
      ctx.fillRect(0, 0, width, height);

      // Subtle scanline overlay for retro-map texture
      ctx.fillStyle = 'hsla(0, 0%, 0%, 0.015)';
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [width, height, scale, offset]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ imageRendering: 'auto' }}
    />
  );
}

// ── Animated march with trail & glow ──
function MarchAnimation({ fromX, fromY, toX, toY, scale, offset }: {
  fromX: number; fromY: number; toX: number; toY: number; scale: number; offset: { x: number; y: number };
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf: number;
    const animate = () => {
      setProgress(p => {
        const next = p + 0.002;
        return next > 1 ? 0 : next;
      });
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  const midX = (fromX + toX) / 2 + (toY - fromY) * 0.18;
  const midY = (fromY + toY) / 2 - (toX - fromX) * 0.18;
  const t = progress;
  const cx = (1 - t) * (1 - t) * fromX + 2 * (1 - t) * t * midX + t * t * toX;
  const cy = (1 - t) * (1 - t) * fromY + 2 * (1 - t) * t * midY + t * t * toY;

  const screenX = cx * scale + offset.x;
  const screenY = cy * scale + offset.y;

  // Trail positions
  const trails = useMemo(() => [0.03, 0.06, 0.1, 0.15, 0.21].map(dt => {
    const tt = Math.max(0, t - dt);
    return {
      x: ((1 - tt) * (1 - tt) * fromX + 2 * (1 - tt) * tt * midX + tt * tt * toX) * scale + offset.x,
      y: ((1 - tt) * (1 - tt) * fromY + 2 * (1 - tt) * tt * midY + tt * tt * toY) * scale + offset.y,
      opacity: 1 - dt * 4,
      size: 5 - dt * 15,
    };
  }), [t, fromX, fromY, toX, toY, midX, midY, scale, offset]);

  return (
    <>
      {trails.map((trail, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: trail.x - trail.size / 2,
            top: trail.y - trail.size / 2,
            width: Math.max(1, trail.size),
            height: Math.max(1, trail.size),
            background: `hsla(var(--primary), ${trail.opacity * 0.4})`,
            boxShadow: `0 0 ${trail.size}px hsla(var(--primary), ${trail.opacity * 0.2})`,
            transition: 'none',
          }}
        />
      ))}
      {/* Main icon with glow */}
      <div
        className="absolute text-sm"
        style={{
          left: screenX - 10,
          top: screenY - 10,
          filter: 'drop-shadow(0 0 8px hsl(var(--primary))) drop-shadow(0 0 3px hsl(var(--primary)))',
          transition: 'none',
        }}
      >
        ⚔️
      </div>
    </>
  );
}

// ── Territory control glow with animated pulse ──
function TerritoryGlow({ x, y, conquered }: {
  x: number; y: number; conquered: boolean;
}) {
  if (!conquered) return null;
  return (
    <div
      className="absolute rounded-full pointer-events-none animate-pulse"
      style={{
        left: x - 45,
        top: y - 45,
        width: 90,
        height: 90,
        background: `radial-gradient(circle, hsla(var(--secondary), 0.18) 0%, hsla(var(--secondary), 0.06) 40%, transparent 70%)`,
      }}
    />
  );
}

// ── Fog of War overlay (reveals territory around conquered nodes) ──
function FogOfWar({ nodes, conqueredIds, scale, offset, width, height }: {
  nodes: MapNode[];
  conqueredIds: string[];
  scale: number;
  offset: { x: number; y: number };
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Fill with opaque fog
    ctx.fillStyle = 'rgba(8, 6, 12, 0.72)';
    ctx.fillRect(0, 0, width, height);

    // Always reveal citadel area
    const citadel = nodes.find(n => n.id === 'citadel');
    const revealPoints: { x: number; y: number; r: number }[] = [];

    if (citadel) {
      revealPoints.push({
        x: citadel.x * scale + offset.x,
        y: citadel.y * scale + offset.y,
        r: 100 * scale,
      });
    }

    // Reveal around conquered nodes
    for (const node of nodes) {
      if (conqueredIds.includes(node.id)) {
        revealPoints.push({
          x: node.x * scale + offset.x,
          y: node.y * scale + offset.y,
          r: 80 * scale,
        });
      }
    }

    // Cut fog with composite
    ctx.globalCompositeOperation = 'destination-out';
    for (const pt of revealPoints) {
      const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.r);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.6, 'rgba(0,0,0,0.8)');
      grad.addColorStop(0.85, 'rgba(0,0,0,0.3)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Also partially reveal paths between citadel and conquered
    if (citadel) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 30 * scale;
      ctx.lineCap = 'round';
      for (const node of nodes) {
        if (conqueredIds.includes(node.id)) {
          const sx = citadel.x * scale + offset.x;
          const sy = citadel.y * scale + offset.y;
          const ex = node.x * scale + offset.x;
          const ey = node.y * scale + offset.y;
          const pathGrad = ctx.createLinearGradient(sx, sy, ex, ey);
          pathGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
          pathGrad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
          pathGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
          ctx.strokeStyle = pathGrad;
          ctx.beginPath();
          const mx = (sx + ex) / 2 + (ey - sy) * 0.14;
          const my = (sy + ey) / 2 - (ex - sx) * 0.14;
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(mx, my, ex, ey);
          ctx.stroke();
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }, [nodes, conqueredIds, scale, offset, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 5 }}
    />
  );
}

// ── 2D Environment System (matches 3D map) ──
type WeatherType2D = 'clear' | 'rain' | 'snow' | 'fog';
type TimeOfDay2D = 'dawn' | 'day' | 'dusk' | 'night';

function getTimeColor(time: TimeOfDay2D) {
  switch (time) {
    case 'dawn': return { overlay: 'hsla(30, 60%, 50%, 0.08)', sky: 'hsla(25, 40%, 15%, 0.9)' };
    case 'day': return { overlay: 'hsla(45, 30%, 60%, 0.03)', sky: 'hsla(42, 32%, 18%, 0.85)' };
    case 'dusk': return { overlay: 'hsla(15, 50%, 35%, 0.12)', sky: 'hsla(20, 35%, 12%, 0.92)' };
    case 'night': return { overlay: 'hsla(220, 50%, 15%, 0.25)', sky: 'hsla(230, 30%, 8%, 0.95)' };
  }
}

const TIME_ICONS: Record<TimeOfDay2D, string> = { dawn: '🌅', day: '☀️', dusk: '🌇', night: '🌙' };
const WEATHER_ICONS: Record<WeatherType2D, string> = { clear: '☀️', rain: '🌧️', snow: '❄️', fog: '🌫️' };

export default function WorldMap() {
  const { state, getBuildingLevel } = useGame();
  const { t } = useI18n();
  const { sfxEnabled } = useAudio();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [is3D, setIs3D] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 460 });
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay2D>('day');
  const [weather, setWeather] = useState<WeatherType2D>('clear');

  // Ambient SFX placeholder (ambient system not yet implemented)
  useEffect(() => {
    // Future: add ambient sounds for weather/time of day
  }, [weather, timeOfDay, sfxEnabled]);

  // Day/night cycle timer
  useEffect(() => {
    const cycle: TimeOfDay2D[] = ['dawn', 'day', 'day', 'dusk', 'night', 'night'];
    let idx = 1;
    const interval = setInterval(() => {
      idx = (idx + 1) % cycle.length;
      setTimeOfDay(cycle[idx]);
    }, 45000); // 45s per phase
    return () => clearInterval(interval);
  }, []);

  // Weather cycle
  useEffect(() => {
    const weathers: WeatherType2D[] = ['clear', 'clear', 'rain', 'clear', 'fog', 'snow', 'clear'];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % weathers.length;
      setWeather(weathers[idx]);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const conqueredIds = useMemo(() => {
    const completed = state.marches.filter(m => m.result?.victory).map(m => m.expeditionId);
    return [...new Set(completed)];
  }, [state.marches]);

  const nodes: MapNode[] = useMemo(() => [
    { id: 'citadel', x: 400, y: 300, icon: '🏰', label: state.realmName, type: 'city' },
    ...EXPEDITIONS.map((exp, i) => ({
      id: exp.id,
      x: 150 + (i % 4) * 180 + Math.sin(i * 1.5) * 60,
      y: 100 + Math.floor(i / 4) * 200 + Math.cos(i * 2) * 40,
      icon: exp.icon,
      label: t(`expedition.${exp.id}.name`),
      type: (exp.type === 'gather' ? 'gathering' : exp.type === 'defend' ? 'defense' : 'expedition') as MapNode['type'],
      difficulty: exp.difficulty,
    })),
    ...LEGENDARY_CREATURES.map(c => ({
      id: `creature_${c.id}`,
      x: c.x,
      y: c.y,
      icon: c.icon,
      label: t(`creature.${c.id}`),
      type: 'creature' as MapNode['type'],
      difficulty: Math.ceil(c.power / 2000),
    })),
  ], [state.realmName, t]);

  const activeMarches = state.marches.filter(m => !m.result);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    setScale(s => Math.max(0.4, Math.min(3, s * delta)));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const getNodeColor = (type: MapNode['type']) => {
    switch (type) {
      case 'city': return 'from-primary to-primary/70';
      case 'expedition': return 'from-accent to-accent/70';
      case 'gathering': return 'from-secondary to-secondary/70';
      case 'defense': return 'from-gold to-gold/70';
      case 'creature': return 'from-destructive to-destructive/70';
    }
  };

  const getNodeBorderColor = (type: MapNode['type']) => {
    switch (type) {
      case 'city': return 'border-primary/60';
      case 'expedition': return 'border-accent/60';
      case 'gathering': return 'border-secondary/60';
      case 'defense': return 'border-gold/60';
      case 'creature': return 'border-destructive/60';
    }
  };

  if (is3D) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl ink-shadow text-foreground">{t('map.title')}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setIs3D(false)} className="px-3 py-1 bg-muted text-muted-foreground rounded font-display text-sm hover:bg-muted/80 transition-colors">🗺️ 2D</button>
            <button className="px-3 py-1 bg-primary text-primary-foreground rounded font-display text-sm">🌐 3D</button>
          </div>
        </div>
        <Suspense fallback={
          <div className="w-full rounded-lg medieval-border bg-card flex items-center justify-center" style={{ height: '500px' }}>
            <div className="text-center text-muted-foreground">
              <div className="text-4xl mb-2 animate-spin">🌐</div>
              <p className="font-display text-sm">Loading 3D World...</p>
            </div>
          </div>
        }>
          <WorldMap3D />
        </Suspense>
        <p className="text-xs text-muted-foreground text-center">Drag to orbit · Scroll to zoom · Click markers for details</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl ink-shadow text-foreground">{t('map.title')}</h2>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-primary text-primary-foreground rounded font-display text-sm">🗺️ 2D</button>
          <button onClick={() => setIs3D(true)} className="px-3 py-1 bg-muted text-muted-foreground rounded font-display text-sm hover:bg-muted/80 transition-colors">🌐 3D</button>
          <button onClick={() => setScale(s => Math.min(3, s * 1.2))} className="px-3 py-1 bg-muted text-muted-foreground rounded font-display text-sm hover:bg-muted/80 transition-colors">+</button>
          <span className="text-xs text-muted-foreground font-display">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.max(0.4, s * 0.8))} className="px-3 py-1 bg-muted text-muted-foreground rounded font-display text-sm hover:bg-muted/80 transition-colors">−</button>
          <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="px-3 py-1 bg-muted text-muted-foreground rounded font-display text-xs hover:bg-muted/80 transition-colors">{t('map.reset')}</button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative medieval-border rounded-lg overflow-hidden select-none"
        style={{ height: '460px', cursor: isDragging ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <AnimatedMapCanvas width={containerSize.w} height={containerSize.h} scale={scale} offset={offset} />
        <FogOfWar nodes={nodes} conqueredIds={conqueredIds} scale={scale} offset={offset} width={containerSize.w} height={containerSize.h} />
        {/* Day/Night overlay */}
        <div
          className="absolute inset-0 pointer-events-none transition-colors duration-[3000ms]"
          style={{ backgroundColor: getTimeColor(timeOfDay).overlay }}
        />

        {/* Weather particles overlay */}
        {weather === 'rain' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-px bg-blue-300/30"
                style={{
                  left: `${(i * 2.5) % 100}%`,
                  top: '-10px',
                  height: '15px',
                  animation: `rainFall ${0.4 + Math.random() * 0.3}s linear infinite`,
                  animationDelay: `${Math.random() * 0.5}s`,
                }}
              />
            ))}
            <style>{`@keyframes rainFall { 0% { transform: translateY(-10px); opacity: 0.7; } 100% { transform: translateY(470px); opacity: 0; } }`}</style>
          </div>
        )}
        {weather === 'snow' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-foreground/20"
                style={{
                  left: `${(i * 4) % 100}%`,
                  top: '-5px',
                  width: `${2 + Math.random() * 3}px`,
                  height: `${2 + Math.random() * 3}px`,
                  animation: `snowFall ${2 + Math.random() * 2}s linear infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
            <style>{`@keyframes snowFall { 0% { transform: translateY(-5px) translateX(0); opacity: 0.8; } 50% { transform: translateY(230px) translateX(15px); } 100% { transform: translateY(470px) translateX(-5px); opacity: 0; } }`}</style>
          </div>
        )}
        {weather === 'fog' && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-[2000ms]"
            style={{
              background: 'linear-gradient(180deg, hsla(0,0%,60%,0.15) 0%, hsla(0,0%,50%,0.25) 50%, hsla(0,0%,60%,0.1) 100%)',
            }}
          />
        )}

        {/* Map content layer */}
        <div
          className="absolute"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            willChange: 'transform',
          }}
        >
          {/* Territory glow */}
          {nodes.filter(n => n.id !== 'citadel').map(node => (
            <TerritoryGlow
              key={`ter-${node.id}`}
              x={node.x}
              y={node.y}
              conquered={conqueredIds.includes(node.id)}
            />
          ))}

          {/* SVG connection lines */}
          <svg className="absolute inset-0 w-[800px] h-[600px] pointer-events-none">
            <defs>
              <filter id="glow2d">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glowStrong">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="activeRoute2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="conqueredRoute" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.7" />
                <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {nodes.filter(n => n.id !== 'citadel').map(node => {
              const citadel = nodes[0];
              const isActive = activeMarches.some(m => m.expeditionId === node.id);
              const isConquered = conqueredIds.includes(node.id);
              const mx = (citadel.x + node.x) / 2 + (node.y - citadel.y) * 0.14;
              const my = (citadel.y + node.y) / 2 - (node.x - citadel.x) * 0.14;
              return (
                <g key={node.id}>
                  {/* Shadow path */}
                  {(isActive || isConquered) && (
                    <path
                      d={`M ${citadel.x} ${citadel.y} Q ${mx} ${my} ${node.x} ${node.y}`}
                      fill="none"
                      stroke={isActive ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'}
                      strokeWidth={isActive ? 6 : 3}
                      opacity={0.08}
                      filter="url(#glow2d)"
                    />
                  )}
                  <path
                    d={`M ${citadel.x} ${citadel.y} Q ${mx} ${my} ${node.x} ${node.y}`}
                    fill="none"
                    stroke={isActive ? 'url(#activeRoute2)' : isConquered ? 'url(#conqueredRoute)' : 'hsl(var(--border))'}
                    strokeWidth={isActive ? 2.8 : isConquered ? 1.5 : 0.6}
                    strokeDasharray={isActive ? '10 5' : isConquered ? 'none' : '2 4'}
                    opacity={isActive ? 1 : isConquered ? 0.55 : 0.15}
                    filter={isActive ? 'url(#glowStrong)' : 'none'}
                    strokeLinecap="round"
                  >
                    {isActive && (
                      <animate attributeName="stroke-dashoffset" from="30" to="0" dur="1s" repeatCount="indefinite" />
                    )}
                  </path>
                </g>
              );
            })}
          </svg>

          {/* Map nodes */}
          {nodes.map(node => {
            const isActive = activeMarches.some(m => m.expeditionId === node.id);
            const isConquered = conqueredIds.includes(node.id);
            const isCity = node.type === 'city';

            return (
              <div
                key={node.id}
                className={`absolute flex flex-col items-center cursor-pointer transition-transform duration-150 ${
                  selectedNode === node.id ? 'scale-125 z-20' : 'hover:scale-110 z-10'
                }`}
                style={{ left: node.x - (isCity ? 28 : 24), top: node.y - (isCity ? 28 : 24) }}
                onClick={(e) => { e.stopPropagation(); setSelectedNode(selectedNode === node.id ? null : node.id); }}
              >
                {/* Animated pulse ring for active */}
                {isActive && (
                  <div className="absolute rounded-full animate-ping"
                    style={{
                      width: isCity ? 60 : 52,
                      height: isCity ? 60 : 52,
                      left: isCity ? -2 : -2,
                      top: -2,
                      background: 'hsla(var(--primary), 0.15)',
                    }}
                  />
                )}

                {/* Outer glow halo */}
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: isCity ? 64 : 54,
                    height: isCity ? 64 : 54,
                    left: isCity ? -5 : -3,
                    top: isCity ? -5 : -3,
                    background: isActive
                      ? 'radial-gradient(circle, hsla(var(--primary), 0.25), transparent 70%)'
                      : isConquered
                      ? 'radial-gradient(circle, hsla(var(--secondary), 0.15), transparent 70%)'
                      : 'none',
                  }}
                />

                {/* Node circle */}
                <div className={`${isCity ? 'w-14 h-14' : 'w-12 h-12'} rounded-full flex items-center justify-center text-xl border-2 bg-gradient-to-br ${getNodeColor(node.type)} ${getNodeBorderColor(node.type)} transition-shadow duration-200`}
                  style={{
                    boxShadow: isActive
                      ? '0 0 18px hsla(var(--primary), 0.6), 0 0 6px hsla(var(--primary), 0.3), inset 0 0 10px hsla(var(--primary), 0.15)'
                      : isConquered
                      ? '0 0 10px hsla(var(--secondary), 0.35), inset 0 0 4px hsla(var(--secondary), 0.1)'
                      : '0 3px 10px hsla(0, 0%, 0%, 0.35), inset 0 1px 2px hsla(0, 0%, 100%, 0.05)',
                  }}
                >
                  <span className={isCity ? 'text-2xl' : 'text-lg'}>{node.icon}</span>
                </div>

                {/* Label */}
                <span className={`${isCity ? 'text-xs font-bold text-primary' : 'text-[10px] text-foreground'} font-display mt-1 whitespace-nowrap max-w-[90px] truncate text-center`}
                  style={{ textShadow: '0 1px 3px hsla(0,0%,0%,0.6)' }}
                >
                  {node.label}
                </span>

                {/* Difficulty stars */}
                {node.difficulty && (
                  <div className="flex gap-px mt-0.5">
                    {Array.from({ length: node.difficulty }).map((_, i) => (
                      <span key={i} className="text-[7px] text-gold" style={{ textShadow: '0 0 3px hsl(var(--gold))' }}>★</span>
                    ))}
                  </div>
                )}

                {/* Conquered badge */}
                {isConquered && !isCity && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-secondary text-secondary-foreground text-[9px] flex items-center justify-center shadow-md border border-background font-bold">
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Animated march troops */}
        {activeMarches.map(m => {
          const citadel = nodes[0];
          const target = nodes.find(n => n.id === m.expeditionId);
          if (!target) return null;
          return (
            <MarchAnimation
              key={m.id}
              fromX={citadel.x}
              fromY={citadel.y}
              toX={target.x}
              toY={target.y}
              scale={scale}
              offset={offset}
            />
          );
        })}

        {/* Selected node info */}
        {selectedNode && selectedNode !== 'citadel' && (
          <div className="absolute bottom-3 left-3 right-3 bg-card/95 backdrop-blur-md medieval-border rounded-lg p-4 animate-fade-in shadow-xl">
            {(() => {
              const exp = EXPEDITIONS.find(e => e.id === selectedNode);
              if (!exp) return null;
              const isActive = activeMarches.some(m => m.expeditionId === selectedNode);
              const isConquered = conqueredIds.includes(selectedNode);
              return (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-display text-sm text-foreground flex items-center gap-2">
                      {exp.icon} {t(`expedition.${exp.id}.name`)}
                      {isConquered && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/20 text-secondary">Conquered</span>}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">{t(`expedition.${exp.id}.desc`)}</p>
                    <p className="text-xs text-primary mt-1 font-display">
                      {t('exp.power', exp.enemyPower)} · {t('exp.duration', Math.floor(exp.duration / 60))}
                    </p>
                  </div>
                  {isActive && (
                    <span className="px-3 py-1.5 bg-primary/20 rounded-md text-xs font-display text-primary animate-pulse border border-primary/30">
                      {t('map.marchActive')}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Environment HUD */}
        <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-md rounded-lg p-2 text-[10px] border border-border/50 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5">
            <span>{TIME_ICONS[timeOfDay]}</span>
            <span className="text-foreground capitalize font-display">{timeOfDay}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>{WEATHER_ICONS[weather]}</span>
            <span className="text-muted-foreground capitalize">{weather}</span>
          </div>
          <button
            onClick={() => {
              const w: WeatherType2D[] = ['clear', 'rain', 'snow', 'fog'];
              setWeather(w[(w.indexOf(weather) + 1) % w.length]);
            }}
            className="text-[9px] text-primary hover:text-primary/80 font-display"
          >
            Cycle Weather
          </button>
        </div>

        {/* Legend */}
        <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-md rounded-lg p-2.5 text-[10px] space-y-1.5 border border-border/50 shadow-lg">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gradient-to-br from-primary to-primary/70 inline-block shadow-sm" /> {t('map.legendCity')}</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gradient-to-br from-accent to-accent/70 inline-block shadow-sm" /> {t('map.legendCombat')}</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gradient-to-br from-secondary to-secondary/70 inline-block shadow-sm" /> {t('map.legendGather')}</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gradient-to-br from-gold to-gold/70 inline-block shadow-sm" /> {t('map.legendDefense')}</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gradient-to-br from-destructive to-destructive/70 inline-block shadow-sm" /> {t('map.legendCreature')}</div>
        </div>

        {/* Compass */}
        <div className="absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center text-muted-foreground/40 font-display text-[10px]">
          <div className="relative w-full h-full">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 text-foreground/50">N</span>
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2">S</span>
            <span className="absolute left-0 top-1/2 -translate-y-1/2">W</span>
            <span className="absolute right-0 top-1/2 -translate-y-1/2">E</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">{t('map.hint')}</p>
    </div>
  );
}
