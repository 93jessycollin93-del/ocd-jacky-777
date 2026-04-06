import { useRef, useEffect, useCallback } from 'react';

// ── Animated Background Renderers ──
// All renderers use a single canvas with requestAnimationFrame
// Performance-optimized: no allocations in render loop

export type BackgroundTheme =
  | 'matrix' | 'galaxy' | 'jade_zen' | 'fire_magma' | 'aurora'
  | 'neural_mesh' | 'code_stream' | 'black_hole' | 'crystal_vault'
  | 'sacred_geometry' | 'ocean_glow' | 'lightning' | 'ember_field'
  | 'starscape' | 'forest_wind' | 'snow' | 'none';

export const BACKGROUND_THEMES: { id: BackgroundTheme; label: string; icon: string; category: string }[] = [
  { id: 'none', label: 'None', icon: '🚫', category: 'basic' },
  { id: 'matrix', label: 'Matrix Code', icon: '🟢', category: 'tech' },
  { id: 'neural_mesh', label: 'Neural Mesh', icon: '🧠', category: 'tech' },
  { id: 'code_stream', label: 'Code Stream', icon: '💻', category: 'tech' },
  { id: 'galaxy', label: 'Galaxy', icon: '🌌', category: 'cosmic' },
  { id: 'starscape', label: 'Starscape', icon: '⭐', category: 'cosmic' },
  { id: 'black_hole', label: 'Black Hole', icon: '🕳️', category: 'cosmic' },
  { id: 'aurora', label: 'Aurora Skies', icon: '🌈', category: 'nature' },
  { id: 'fire_magma', label: 'Fire & Magma', icon: '🔥', category: 'nature' },
  { id: 'ember_field', label: 'Ember Field', icon: '✨', category: 'nature' },
  { id: 'ocean_glow', label: 'Ocean Glow', icon: '🌊', category: 'nature' },
  { id: 'lightning', label: 'Lightning', icon: '⚡', category: 'nature' },
  { id: 'snow', label: 'Snowfall', icon: '❄️', category: 'nature' },
  { id: 'forest_wind', label: 'Forest Wind', icon: '🌲', category: 'nature' },
  { id: 'jade_zen', label: 'Jade Zen Void', icon: '🟩', category: 'luxury' },
  { id: 'crystal_vault', label: 'Crystal Vault', icon: '💎', category: 'luxury' },
  { id: 'sacred_geometry', label: 'Sacred Geometry', icon: '🔷', category: 'luxury' },
];

// Pre-allocated particle arrays for each renderer
interface Particle { x: number; y: number; vx: number; vy: number; size: number; alpha: number; hue: number; life: number; }

function createParticles(count: number, w: number, h: number, theme: BackgroundTheme): Particle[] {
  const p: Particle[] = [];
  for (let i = 0; i < count; i++) {
    p.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2 + (theme === 'snow' ? 0.5 : 0),
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.8 + 0.2,
      hue: theme === 'fire_magma' ? Math.random() * 40 : theme === 'aurora' ? Math.random() * 120 + 100 : Math.random() * 360,
      life: Math.random() * 200 + 100,
    });
  }
  return p;
}

// Matrix rain columns
interface MatrixCol { x: number; y: number; speed: number; chars: string[]; length: number; }

function createMatrixCols(w: number, h: number): MatrixCol[] {
  const cols: MatrixCol[] = [];
  const charSet = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';
  for (let x = 0; x < w; x += 14) {
    const length = Math.floor(Math.random() * 20) + 5;
    cols.push({
      x,
      y: Math.random() * h - h,
      speed: Math.random() * 3 + 1,
      length,
      chars: Array.from({ length }, () => charSet[Math.floor(Math.random() * charSet.length)]),
    });
  }
  return cols;
}

function renderMatrix(ctx: CanvasRenderingContext2D, cols: MatrixCol[], w: number, h: number) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(0, 0, w, h);
  ctx.font = '12px monospace';
  for (const col of cols) {
    for (let i = 0; i < col.chars.length; i++) {
      const cy = col.y + i * 14;
      if (cy < -14 || cy > h + 14) continue;
      const brightness = i === col.chars.length - 1 ? 255 : Math.max(80, 255 - (col.chars.length - i) * 12);
      ctx.fillStyle = `rgba(0, ${brightness}, 0, ${i === col.chars.length - 1 ? 1 : 0.7})`;
      ctx.fillText(col.chars[i], col.x, cy);
    }
    col.y += col.speed;
    if (col.y > h + col.length * 14) {
      col.y = -col.length * 14;
      col.speed = Math.random() * 3 + 1;
    }
  }
}

function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[], w: number, h: number, theme: BackgroundTheme, t: number) {
  ctx.fillStyle = theme === 'fire_magma' ? 'rgba(10, 2, 0, 0.08)' :
                  theme === 'aurora' ? 'rgba(0, 5, 15, 0.06)' :
                  theme === 'ocean_glow' ? 'rgba(0, 5, 20, 0.06)' :
                  theme === 'jade_zen' ? 'rgba(2, 8, 5, 0.04)' :
                  theme === 'snow' ? 'rgba(5, 8, 15, 0.03)' :
                  'rgba(0, 0, 0, 0.06)';
  ctx.fillRect(0, 0, w, h);

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0) p.x = w;
    if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h;
    if (p.y > h) p.y = 0;

    const flicker = theme === 'ember_field' ? Math.sin(t * 0.01 + p.x) * 0.3 + 0.7 : 1;

    if (theme === 'fire_magma') {
      ctx.fillStyle = `hsla(${p.hue}, 100%, ${50 + p.alpha * 30}%, ${p.alpha * flicker})`;
    } else if (theme === 'aurora') {
      ctx.fillStyle = `hsla(${p.hue + Math.sin(t * 0.002 + p.x * 0.01) * 30}, 80%, 60%, ${p.alpha * 0.6})`;
    } else if (theme === 'ocean_glow') {
      ctx.fillStyle = `hsla(${200 + Math.sin(t * 0.001 + p.y * 0.005) * 20}, 70%, 55%, ${p.alpha * 0.5})`;
    } else if (theme === 'jade_zen') {
      ctx.fillStyle = `hsla(${150 + Math.sin(t * 0.0005) * 10}, 50%, 40%, ${p.alpha * 0.3})`;
    } else if (theme === 'snow') {
      ctx.fillStyle = `rgba(200, 210, 230, ${p.alpha * 0.6})`;
    } else if (theme === 'ember_field') {
      ctx.fillStyle = `hsla(${20 + p.hue * 0.1}, 100%, ${50 + flicker * 20}%, ${p.alpha * flicker})`;
    } else {
      ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${p.alpha * 0.5})`;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (theme === 'snow' ? 1.5 : 1), 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderGalaxy(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(0, 0, 5, 0.03)';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  for (let i = 0; i < 200; i++) {
    const angle = (i / 200) * Math.PI * 6 + t * 0.0003;
    const dist = (i / 200) * Math.min(w, h) * 0.45 + Math.sin(t * 0.001 + i) * 5;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist * 0.6;
    const brightness = Math.sin(t * 0.002 + i * 0.1) * 0.3 + 0.5;
    ctx.fillStyle = `hsla(${220 + i * 0.5}, 70%, 70%, ${brightness})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderSacredGeometry(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(5, 2, 10, 0.04)';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const rot = t * 0.0002;
  ctx.strokeStyle = `hsla(${270 + Math.sin(t * 0.001) * 30}, 50%, 45%, 0.15)`;
  ctx.lineWidth = 0.5;
  for (let ring = 0; ring < 6; ring++) {
    const r = 40 + ring * 35;
    const sides = 6;
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2 + rot + ring * 0.1;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

function renderBlackHole(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  for (let i = 0; i < 150; i++) {
    const angle = (i / 150) * Math.PI * 8 + t * 0.001;
    const dist = 20 + (i / 150) * Math.min(w, h) * 0.4;
    const pull = Math.max(0, 1 - dist / (Math.min(w, h) * 0.5));
    const x = cx + Math.cos(angle) * dist * (1 - pull * 0.3);
    const y = cy + Math.sin(angle) * dist * 0.5 * (1 - pull * 0.3);
    ctx.fillStyle = `hsla(${30 + pull * 200}, 80%, ${40 + pull * 30}%, ${0.3 + pull * 0.5})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + pull * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Event horizon
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
}

function renderCrystalVault(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(5, 5, 15, 0.04)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = `hsla(${200 + Math.sin(t * 0.001) * 20}, 40%, 50%, 0.08)`;
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 20; i++) {
    const x = (w / 20) * i + Math.sin(t * 0.001 + i) * 10;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(t * 0.0005 + i) * 30, h);
    ctx.stroke();
  }
  for (let i = 0; i < 15; i++) {
    const y = (h / 15) * i + Math.cos(t * 0.001 + i) * 10;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + Math.cos(t * 0.0005 + i) * 20);
    ctx.stroke();
  }
}

function renderNeuralMesh(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(2, 5, 15, 0.05)';
  ctx.fillRect(0, 0, w, h);
  const nodes: { x: number; y: number }[] = [];
  for (let i = 0; i < 30; i++) {
    nodes.push({
      x: (w * 0.1) + (w * 0.8) * ((i % 6) / 5) + Math.sin(t * 0.001 + i * 2) * 15,
      y: (h * 0.1) + (h * 0.8) * (Math.floor(i / 6) / 4) + Math.cos(t * 0.001 + i * 3) * 15,
    });
  }
  ctx.strokeStyle = 'hsla(200, 60%, 50%, 0.06)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 120) {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
  }
  for (const n of nodes) {
    ctx.fillStyle = 'hsla(200, 70%, 60%, 0.4)';
    ctx.beginPath();
    ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderLightning(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(5, 2, 15, 0.08)';
  ctx.fillRect(0, 0, w, h);
  if (Math.random() > 0.97) {
    ctx.strokeStyle = `hsla(${240 + Math.random() * 40}, 80%, 80%, ${0.3 + Math.random() * 0.5})`;
    ctx.lineWidth = 1 + Math.random();
    let x = Math.random() * w, y = 0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    while (y < h) {
      x += (Math.random() - 0.5) * 40;
      y += Math.random() * 30 + 10;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function renderForestWind(ctx: CanvasRenderingContext2D, particles: Particle[], w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(2, 8, 3, 0.04)';
  ctx.fillRect(0, 0, w, h);
  for (const p of particles) {
    p.x += Math.sin(t * 0.001 + p.y * 0.01) * 1.5 + p.vx * 0.3;
    p.y += p.vy * 0.2 + 0.3;
    if (p.y > h) { p.y = -5; p.x = Math.random() * w; }
    if (p.x < 0) p.x = w;
    if (p.x > w) p.x = 0;
    ctx.fillStyle = `hsla(${100 + Math.random() * 40}, 50%, 35%, ${p.alpha * 0.4})`;
    // Leaf shape
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.size * 2, p.size, Math.sin(t * 0.002 + p.x) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Main render dispatcher ──
export function createRenderer(theme: BackgroundTheme, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return { destroy: () => {} };

  let w = canvas.width = canvas.offsetWidth;
  let h = canvas.height = canvas.offsetHeight;
  let animId = 0;
  let t = 0;

  const particleCount = theme === 'snow' ? 100 : theme === 'forest_wind' ? 60 : 120;
  const particles = ['fire_magma', 'aurora', 'ocean_glow', 'jade_zen', 'snow', 'ember_field', 'starscape', 'forest_wind']
    .includes(theme) ? createParticles(particleCount, w, h, theme) : [];
  const matrixCols = theme === 'matrix' || theme === 'code_stream' ? createMatrixCols(w, h) : [];

  // Initial fill
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  function render() {
    t++;
    switch (theme) {
      case 'matrix':
      case 'code_stream':
        renderMatrix(ctx!, matrixCols, w, h);
        break;
      case 'galaxy':
        renderGalaxy(ctx!, w, h, t);
        break;
      case 'black_hole':
        renderBlackHole(ctx!, w, h, t);
        break;
      case 'sacred_geometry':
        renderSacredGeometry(ctx!, w, h, t);
        break;
      case 'crystal_vault':
        renderCrystalVault(ctx!, w, h, t);
        break;
      case 'neural_mesh':
        renderNeuralMesh(ctx!, w, h, t);
        break;
      case 'lightning':
        renderLightning(ctx!, w, h, t);
        break;
      case 'forest_wind':
        renderForestWind(ctx!, particles, w, h, t);
        break;
      case 'fire_magma':
      case 'aurora':
      case 'ocean_glow':
      case 'jade_zen':
      case 'snow':
      case 'ember_field':
      case 'starscape':
        renderParticles(ctx!, particles, w, h, theme, t);
        break;
      default:
        return; // 'none' — stop loop
    }
    animId = requestAnimationFrame(render);
  }

  animId = requestAnimationFrame(render);

  const onResize = () => {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  };
  window.addEventListener('resize', onResize);

  return {
    destroy: () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    },
  };
}

// ── React Hook ──
export function useAnimatedBackground(theme: BackgroundTheme) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (rendererRef.current) rendererRef.current.destroy();
    if (theme === 'none' || !canvasRef.current) return;
    rendererRef.current = createRenderer(theme, canvasRef.current);
    return () => { rendererRef.current?.destroy(); rendererRef.current = null; };
  }, [theme]);

  return canvasRef;
}
