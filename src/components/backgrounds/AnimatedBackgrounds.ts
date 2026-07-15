import { useRef, useEffect, useCallback } from 'react';

// ── Animated Background Renderers ──
// All renderers use a single canvas with requestAnimationFrame
// Performance-optimized: no allocations in render loop

export type BackgroundTheme =
  | 'matrix' | 'galaxy' | 'jade_zen' | 'fire_magma' | 'aurora'
  | 'neural_mesh' | 'code_stream' | 'black_hole' | 'crystal_vault'
  | 'sacred_geometry' | 'ocean_glow' | 'lightning' | 'ember_field'
  | 'starscape' | 'forest_wind' | 'snow' | 'neutron_star' | 'none'
  | 'matrix_rain_fast' | 'matrix_rain_blue' | 'cyber_grid' | 'synthwave'
  | 'circuit_board' | 'glitch' | 'scanlines' | 'radar_sweep'
  | 'packet_flow' | 'binary_rain' | 'cyberpunk_neon' | 'hud_overlay'
  | 'terminal_green' | 'digital_rain' | 'neon_particles' | 'data_stream'
  | 'quantum_ripple' | 'cyber_hex' | 'retro_crt' | 'cyber_rain';

export const BACKGROUND_THEMES: { id: BackgroundTheme; label: string; icon: string; category: string }[] = [
  { id: 'none', label: 'None', icon: '🚫', category: 'basic' },
  { id: 'matrix', label: 'Matrix Code', icon: '🟢', category: 'tech' },
  { id: 'matrix_rain_fast', label: 'Matrix Rush', icon: '💨', category: 'cyber' },
  { id: 'matrix_rain_blue', label: 'Matrix Blue', icon: '🔵', category: 'cyber' },
  { id: 'cyber_grid', label: 'Cyber Grid', icon: '📊', category: 'cyber' },
  { id: 'synthwave', label: 'Synthwave', icon: '🌆', category: 'cyber' },
  { id: 'circuit_board', label: 'Circuit Board', icon: '🔌', category: 'cyber' },
  { id: 'glitch', label: 'Glitch', icon: '💥', category: 'cyber' },
  { id: 'scanlines', label: 'Scanlines', icon: '📺', category: 'cyber' },
  { id: 'radar_sweep', label: 'Radar', icon: '🎯', category: 'cyber' },
  { id: 'packet_flow', label: 'Packet Flow', icon: '📡', category: 'cyber' },
  { id: 'binary_rain', label: 'Binary Rain', icon: '1️⃣', category: 'cyber' },
  { id: 'cyberpunk_neon', label: 'Neon Cyberpunk', icon: '🌃', category: 'cyber' },
  { id: 'hud_overlay', label: 'HUD Overlay', icon: '🎮', category: 'cyber' },
  { id: 'terminal_green', label: 'Terminal Green', icon: '🟩', category: 'cyber' },
  { id: 'digital_rain', label: 'Digital Rain', icon: '🌧️', category: 'cyber' },
  { id: 'neon_particles', label: 'Neon Particles', icon: '✨', category: 'cyber' },
  { id: 'data_stream', label: 'Data Stream', icon: '💾', category: 'cyber' },
  { id: 'quantum_ripple', label: 'Quantum Ripple', icon: '〰️', category: 'cyber' },
  { id: 'cyber_hex', label: 'Cyber Hex', icon: '⬡', category: 'cyber' },
  { id: 'retro_crt', label: 'Retro CRT', icon: '📻', category: 'cyber' },
  { id: 'cyber_rain', label: 'Cyber Rain', icon: '⛈️', category: 'cyber' },
  { id: 'neural_mesh', label: 'Neural Mesh', icon: '🧠', category: 'tech' },
  { id: 'code_stream', label: 'Code Stream', icon: '💻', category: 'tech' },
  { id: 'galaxy', label: 'Galaxy', icon: '🌌', category: 'cosmic' },
  { id: 'starscape', label: 'Starscape', icon: '⭐', category: 'cosmic' },
  { id: 'black_hole', label: 'Black Hole', icon: '🕳️', category: 'cosmic' },
  { id: 'neutron_star', label: 'Neutron Star', icon: '💫', category: 'cosmic' },
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

// ── Cybernetic Backgrounds ──
function renderMatrixRainFast(ctx: CanvasRenderingContext2D, cols: MatrixCol[], w: number, h: number) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.fillRect(0, 0, w, h);
  ctx.font = 'bold 14px monospace';
  for (const col of cols) {
    for (let i = 0; i < col.chars.length; i++) {
      const cy = col.y + i * 14;
      if (cy < -14 || cy > h + 14) continue;
      const brightness = i === col.chars.length - 1 ? 255 : Math.max(100, 255 - (col.chars.length - i) * 15);
      ctx.fillStyle = `rgba(0, ${brightness}, 0, ${i === col.chars.length - 1 ? 1 : 0.8})`;
      ctx.fillText(col.chars[i], col.x, cy);
    }
    col.y += col.speed * 2; // 2x faster
    if (col.y > h + col.length * 14) {
      col.y = -col.length * 14;
      col.speed = Math.random() * 5 + 2;
    }
  }
}

function renderMatrixRainBlue(ctx: CanvasRenderingContext2D, cols: MatrixCol[], w: number, h: number) {
  ctx.fillStyle = 'rgba(0, 5, 20, 0.06)';
  ctx.fillRect(0, 0, w, h);
  ctx.font = '12px monospace';
  for (const col of cols) {
    for (let i = 0; i < col.chars.length; i++) {
      const cy = col.y + i * 14;
      if (cy < -14 || cy > h + 14) continue;
      const brightness = Math.max(150, 255 - (col.chars.length - i) * 12);
      ctx.fillStyle = `rgba(100, ${brightness}, 255, ${0.6 + (i === col.chars.length - 1 ? 0.4 : 0)})`;
      ctx.fillText(col.chars[i], col.x, cy);
    }
    col.y += col.speed;
    if (col.y > h + col.length * 14) {
      col.y = -col.length * 14;
      col.speed = Math.random() * 3 + 1;
    }
  }
}

function renderCyberGrid(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(0, 10, 20, 0.05)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = `hsla(200, 100%, 50%, ${0.2 + Math.sin(t * 0.002) * 0.1})`;
  ctx.lineWidth = 1;
  const spacing = 40;
  // Vertical lines
  for (let x = 0; x < w; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(t * 0.001 + x * 0.01) * 10, h);
    ctx.stroke();
  }
  // Horizontal lines
  for (let y = 0; y < h; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + Math.cos(t * 0.001 + y * 0.01) * 10);
    ctx.stroke();
  }
  // Glowing nodes at intersections
  ctx.fillStyle = `hsla(200, 100%, 70%, ${0.6})`;
  for (let x = 0; x < w; x += spacing) {
    for (let y = 0; y < h; y += spacing) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.003 + (x + y) * 0.001);
      ctx.beginPath();
      ctx.arc(x, y, 2 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function renderSynthwave(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(20, 0, 40, 0.8)';
  ctx.fillRect(0, 0, w, h);
  // Horizon sunset gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255, 100, 150, 0.3)');
  grad.addColorStop(0.5, 'rgba(100, 50, 200, 0.2)');
  grad.addColorStop(1, 'rgba(20, 0, 40, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Grid lines
  ctx.strokeStyle = 'rgba(200, 50, 255, 0.3)';
  ctx.lineWidth = 2;
  const speedOffset = t * 0.01;
  for (let i = -5; i < h / 40; i++) {
    const y = (i * 40 + speedOffset) % h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // Vertical neon lines
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
  for (let x = 0; x < w; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(t * 0.002 + x * 0.005) * 20, h);
    ctx.stroke();
  }
}

function renderCircuitBoard(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(5, 15, 10, 0.8)';
  ctx.fillRect(0, 0, w, h);
  // Trace lines
  ctx.strokeStyle = `hsla(150, 80%, 60%, ${0.5 + Math.sin(t * 0.002) * 0.3})`;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const startX = (Math.random() * w);
    const startY = (Math.random() * h);
    let x = startX, y = startY;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      ctx.lineTo(Math.max(0, Math.min(w, x)), Math.max(0, Math.min(h, y)));
    }
    ctx.stroke();
  }
  // Pads/nodes
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = `hsla(150, 100%, 70%, ${0.7 + Math.sin(t * 0.003 + i) * 0.3})`;
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderGlitch(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(0, 20, 10, 0.5)';
  ctx.fillRect(0, 0, w, h);
  if (Math.random() > 0.93) {
    // Random glitch rectangle
    const gx = Math.random() * w;
    const gy = Math.random() * h;
    const gw = Math.random() * 100 + 50;
    const gh = Math.random() * 40 + 10;
    const color = Math.random() > 0.5 ? 'rgba(255, 0, 100, 0.6)' : 'rgba(0, 255, 150, 0.6)';
    ctx.fillStyle = color;
    ctx.fillRect(gx, gy, gw, gh);
  }
}

function renderScanlines(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(10, 20, 10, 0.7)';
  ctx.fillRect(0, 0, w, h);
  // Horizontal scanlines
  ctx.strokeStyle = 'rgba(0, 255, 100, 0.15)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 2) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // Flickering overlay
  if (Math.random() > 0.95) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, w, h);
  }
}

function renderRadarSweep(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(0, 10, 5, 0.8)';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const radius = Math.min(w, h) / 2.5;
  // Radar rings
  ctx.strokeStyle = 'rgba(0, 255, 100, 0.3)';
  ctx.lineWidth = 1;
  for (let r = 1; r <= 4; r++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (radius * r) / 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Grid lines
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.stroke();
  }
  // Rotating sweep
  const sweep = (t * 0.005) % (Math.PI * 2);
  ctx.strokeStyle = `rgba(0, 255, 100, ${0.8})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, radius, sweep - 0.3, sweep, false);
  ctx.stroke();
}

function renderPacketFlow(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(0, 5, 15, 0.05)';
  ctx.fillRect(0, 0, w, h);
  // Draw flowing packets
  for (let i = 0; i < 6; i++) {
    const offset = (t * 0.01 + i * 0.3) % 1;
    const x = offset * w;
    const y = (i / 6) * h + 20;
    // Packet
    ctx.fillStyle = `hsla(${180 + i * 20}, 100%, 60%, 0.7)`;
    ctx.fillRect(x - 10, y - 5, 20, 10);
    // Glow
    ctx.strokeStyle = `hsla(${180 + i * 20}, 100%, 60%, 0.3)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 15, y - 10, 30, 20);
  }
}

function renderBinaryRain(ctx: CanvasRenderingContext2D, cols: MatrixCol[], w: number, h: number) {
  ctx.fillStyle = 'rgba(0, 10, 20, 0.06)';
  ctx.fillRect(0, 0, w, h);
  ctx.font = '11px monospace';
  for (const col of cols) {
    for (let i = 0; i < col.chars.length; i++) {
      const cy = col.y + i * 14;
      if (cy < -14 || cy > h + 14) continue;
      const char = Math.random() > 0.5 ? '1' : '0';
      const brightness = Math.max(100, 255 - (col.chars.length - i) * 12);
      ctx.fillStyle = `rgba(50, ${brightness}, 200, ${0.6 + (i === col.chars.length - 1 ? 0.4 : 0)})`;
      ctx.fillText(char, col.x, cy);
    }
    col.y += col.speed;
    if (col.y > h + col.length * 14) {
      col.y = -col.length * 14;
      col.speed = Math.random() * 3 + 1;
    }
  }
}

function renderCyberpunkNeon(ctx: CanvasRenderingContext2D, particles: Particle[], w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(10, 0, 20, 0.06)';
  ctx.fillRect(0, 0, w, h);
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = w;
    if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h;
    if (p.y > h) p.y = 0;
    ctx.fillStyle = `hsla(${p.hue + Math.sin(t * 0.002) * 30}, 100%, 60%, ${p.alpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `hsla(${p.hue}, 100%, 70%, ${p.alpha * 0.3})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function renderHudOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(0, 10, 20, 0.7)';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  ctx.strokeStyle = `rgba(0, 255, 150, ${0.5 + Math.sin(t * 0.002) * 0.3})`;
  ctx.lineWidth = 2;
  // Center reticle
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy);
  ctx.lineTo(cx - 15, cy);
  ctx.moveTo(cx + 15, cy);
  ctx.lineTo(cx + 30, cy);
  ctx.moveTo(cx, cy - 30);
  ctx.lineTo(cx, cy - 15);
  ctx.moveTo(cx, cy + 15);
  ctx.lineTo(cx, cy + 30);
  ctx.stroke();
  // Corner targets
  for (const [ox, oy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
    ctx.strokeStyle = `rgba(255, 100, 100, ${0.4 + Math.sin(t * 0.003) * 0.3})`;
    ctx.beginPath();
    ctx.arc(ox, oy, 15, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function renderTerminalGreen(ctx: CanvasRenderingContext2D, cols: MatrixCol[], w: number, h: number) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(0, 0, w, h);
  ctx.font = '13px "Courier New", monospace';
  for (const col of cols) {
    for (let i = 0; i < col.chars.length; i++) {
      const cy = col.y + i * 14;
      if (cy < -14 || cy > h + 14) continue;
      ctx.fillStyle = `rgba(0, ${220 - (col.chars.length - i) * 15}, 0, ${0.8 + (i === col.chars.length - 1 ? 0.2 : 0)})`;
      ctx.fillText(col.chars[i], col.x, cy);
    }
    col.y += col.speed;
    if (col.y > h + col.length * 14) {
      col.y = -col.length * 14;
      col.speed = Math.random() * 2 + 1;
    }
  }
}

function renderDigitalRain(ctx: CanvasRenderingContext2D, particles: Particle[], w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(0, 15, 10, 0.08)';
  ctx.fillRect(0, 0, w, h);
  for (const p of particles) {
    p.y += 2 + p.vy * 0.5;
    if (p.y > h) { p.y = -5; p.x = Math.random() * w; }
    ctx.fillStyle = `hsla(${100 + Math.sin(p.x * 0.01 + t * 0.001) * 30}, 80%, 60%, ${p.alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderNeonParticles(ctx: CanvasRenderingContext2D, particles: Particle[], w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(5, 0, 15, 0.06)';
  ctx.fillRect(0, 0, w, h);
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = w;
    if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h;
    if (p.y > h) p.y = 0;
    const glow = Math.sin(t * 0.003 + p.x * 0.01) * 0.5 + 0.5;
    ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.alpha * (0.4 + glow * 0.4)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1 + glow * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderDataStream(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(0, 5, 20, 0.04)';
  ctx.fillRect(0, 0, w, h);
  const lines = 8;
  for (let i = 0; i < lines; i++) {
    const offset = (t * 0.008 + i * 0.2) % 1;
    const y = h * offset;
    const gradient = ctx.createLinearGradient(0, y - 20, 0, y + 20);
    gradient.addColorStop(0, 'rgba(100, 200, 255, 0)');
    gradient.addColorStop(0.5, `rgba(100, 200, 255, ${0.6})`);
    gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y - 20, w, 40);
  }
}

function renderQuantumRipple(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(5, 0, 20, 0.8)';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const time = t * 0.002;
  for (let ring = 0; ring < 5; ring++) {
    const ripple = Math.sin(time - ring * 0.3) * 0.5 + 0.5;
    const radius = 50 + ring * 40 + ripple * 20;
    ctx.strokeStyle = `hsla(${220 + ring * 15}, 100%, 60%, ${(1 - ripple) * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function renderCyberHex(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(5, 10, 15, 0.5)';
  ctx.fillRect(0, 0, w, h);
  const hexSize = 30;
  const rows = Math.ceil(h / (hexSize * 1.5)) + 1;
  const cols = Math.ceil(w / (hexSize * 1.2)) + 1;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * hexSize * 1.2 + (row % 2) * hexSize * 0.6;
      const y = row * hexSize * 1.5;
      const hue = (t * 0.1 + row * 15 + col * 20) % 360;
      ctx.strokeStyle = `hsla(${hue}, 80%, 50%, ${0.4 + Math.sin(t * 0.002 + row + col) * 0.2})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const px = x + Math.cos(angle) * hexSize;
        const py = y + Math.sin(angle) * hexSize;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
}

function renderRetroCrt(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
  ctx.fillRect(0, 0, w, h);
  // Scanlines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // Vignette
  const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.5);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function renderCyberRain(ctx: CanvasRenderingContext2D, particles: Particle[], w: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(0, 10, 15, 0.08)';
  ctx.fillRect(0, 0, w, h);
  for (const p of particles) {
    p.x += Math.sin(t * 0.001 + p.y * 0.01) * 1.5;
    p.y += p.vy + 1;
    if (p.y > h) { p.y = -5; p.x = Math.random() * w; }
    if (p.x < 0) p.x = w;
    if (p.x > w) p.x = 0;
    const hue = 180 + Math.sin(t * 0.002 + p.x * 0.01) * 60;
    ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${p.alpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
    ctx.fill();
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

// ── Neutron Star ── epic pulsar: rotating beams, accretion disk, magnetosphere, distorted starfield
interface NSStar { x: number; y: number; r: number; tw: number; hue: number; }
let nsStars: NSStar[] | null = null;
let nsStarCount = 0;
function ensureNSStars(w: number, h: number, count: number) {
  if (nsStars && nsStars.length === count) return nsStars;
  const arr: NSStar[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.3,
      tw: Math.random() * Math.PI * 2,
      hue: 200 + Math.random() * 60,
    });
  }
  nsStars = arr;
  nsStarCount = count;
  return arr;
}

// Glow intensity (0–2) — multiplies pulse, jet, disk, magnetosphere alpha for the neutron star.
let nsGlow = 1;
export function setNeutronStarGlow(g: number) { nsGlow = Math.max(0, Math.min(2, g)); }

function renderNeutronStar(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, quality: number = 1) {
  const glow = nsGlow;
  // Deep space wash with subtle blue bias
  ctx.fillStyle = 'rgba(2, 4, 14, 0.18)';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const minDim = Math.min(w, h);
  const time = t * 0.001;

  // Apply glow multiplier to all luminous elements (background wash above is unaffected).
  ctx.save();
  if (glow <= 1) {
    ctx.globalAlpha = glow;
  } else {
    ctx.globalCompositeOperation = 'lighter';
  }

  // Distorted starfield (gravitational lensing pull toward center)
  const starCount = Math.max(40, Math.round(220 * quality));
  const stars = ensureNSStars(w, h, starCount);
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const dx = s.x - cx;
    const dy = s.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.0001;
    const lensPull = Math.min(1, 80 / dist);
    const lx = s.x - (dx / dist) * lensPull * 6;
    const ly = s.y - (dy / dist) * lensPull * 6;
    const tw = 0.55 + Math.sin(time * 2 + s.tw) * 0.4;
    ctx.fillStyle = `hsla(${s.hue}, 80%, 80%, ${tw})`;
    ctx.beginPath();
    ctx.arc(lx, ly, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Accretion disk (tilted ellipse, multi-band)
  const diskR = minDim * 0.34;
  const tilt = 0.32; // y squash
  const bandCount = Math.max(2, Math.round(5 * quality));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 0.08);
  for (let band = 0; band < bandCount; band++) {
    const r = diskR * (0.55 + band * 0.11);
    const grad = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r);
    const hueShift = 18 + band * 6 + Math.sin(time + band) * 4;
    grad.addColorStop(0, `hsla(${hueShift}, 100%, 65%, 0)`);
    grad.addColorStop(0.55, `hsla(${hueShift + 10}, 100%, 60%, ${0.10 - band * 0.014})`);
    grad.addColorStop(0.85, `hsla(${280 + band * 10}, 90%, 60%, ${0.16 - band * 0.022})`);
    grad.addColorStop(1, `hsla(${300}, 90%, 50%, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * tilt, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bright inner ring
  ctx.strokeStyle = `hsla(35, 100%, 75%, ${0.45 + Math.sin(time * 4) * 0.1})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, diskR * 0.55, diskR * 0.55 * tilt, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Pulsar rotation + spin (fast)
  const spin = time * 1.6;
  // Two opposing relativistic jets
  for (let s = 0; s < 2; s++) {
    const ang = spin + s * Math.PI;
    const len = minDim * 0.95;
    const beamWidth = 0.08 + Math.sin(time * 6 + s) * 0.012;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    // Soft outer cone
    const beamGrad = ctx.createLinearGradient(0, 0, len, 0);
    beamGrad.addColorStop(0, 'hsla(190, 100%, 80%, 0.55)');
    beamGrad.addColorStop(0.25, 'hsla(210, 100%, 70%, 0.22)');
    beamGrad.addColorStop(0.7, 'hsla(260, 90%, 65%, 0.08)');
    beamGrad.addColorStop(1, 'hsla(280, 90%, 60%, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, -len * beamWidth);
    ctx.lineTo(len, len * beamWidth);
    ctx.closePath();
    ctx.fill();
    // Hot core line
    const coreGrad = ctx.createLinearGradient(0, 0, len, 0);
    coreGrad.addColorStop(0, 'hsla(0, 0%, 100%, 0.9)');
    coreGrad.addColorStop(0.4, 'hsla(190, 100%, 85%, 0.5)');
    coreGrad.addColorStop(1, 'hsla(260, 100%, 70%, 0)');
    ctx.strokeStyle = coreGrad;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    ctx.restore();
  }

  // Magnetosphere field lines (subtle rotating loops)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spin * 0.5);
  const loopCount = Math.max(0, Math.round(6 * quality));
  for (let i = 0; i < loopCount; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.strokeStyle = `hsla(${200 + i * 8}, 90%, 70%, 0.08)`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(a) * minDim * 0.04,
      Math.sin(a) * minDim * 0.04,
      minDim * 0.18,
      minDim * 0.06,
      a,
      0, Math.PI * 2
    );
    ctx.stroke();
  }
  ctx.restore();

  // Pulsar pulse (rhythmic flash)
  const pulse = 0.5 + 0.5 * Math.sin(time * 5);
  const pulseR = minDim * (0.18 + pulse * 0.08);
  const pulseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR);
  pulseGrad.addColorStop(0, `hsla(200, 100%, 90%, ${0.35 + pulse * 0.35})`);
  pulseGrad.addColorStop(0.4, `hsla(220, 100%, 75%, ${0.18 + pulse * 0.18})`);
  pulseGrad.addColorStop(1, 'hsla(260, 100%, 60%, 0)');
  ctx.fillStyle = pulseGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
  ctx.fill();

  // Neutron star core (tiny, blinding)
  const coreR = 4 + pulse * 1.5;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 4);
  core.addColorStop(0, 'rgba(255, 255, 255, 1)');
  core.addColorStop(0.3, 'hsla(190, 100%, 90%, 0.9)');
  core.addColorStop(1, 'hsla(220, 100%, 70%, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Main render dispatcher ──
export function createRenderer(theme: BackgroundTheme, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return { destroy: () => {} };

  let w = canvas.width = canvas.offsetWidth;
  let h = canvas.height = canvas.offsetHeight;
  let animId = 0;
  let t = 0;

  // ── Adaptive FPS / CPU throttling ──
  // Tracks rolling frame time; lowers `quality` (1.0 → 0.3) when FPS drops,
  // and skips frames entirely when severely overloaded.
  let lastFrameTs = performance.now();
  let emaFrameMs = 16.67; // start assuming 60fps
  let quality = 1;
  let skipPhase = 0;
  let skipEvery = 0; // 0 = render every frame; N = skip N of every N+1 frames

  const particleCount = theme === 'snow' ? 100 : theme === 'forest_wind' ? 60 : theme === 'cyberpunk_neon' ? 80 : theme === 'digital_rain' ? 100 : theme === 'neon_particles' ? 90 : theme === 'cyber_rain' ? 110 : 120;
  const particles = ['fire_magma', 'aurora', 'ocean_glow', 'jade_zen', 'snow', 'ember_field', 'starscape', 'forest_wind', 'cyberpunk_neon', 'digital_rain', 'neon_particles', 'cyber_rain']
    .includes(theme) ? createParticles(particleCount, w, h, theme) : [];
  const matrixCols = ['matrix', 'code_stream', 'matrix_rain_fast', 'matrix_rain_blue', 'binary_rain', 'terminal_green']
    .includes(theme) ? createMatrixCols(w, h) : [];

  // Initial fill
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  function adapt(now: number) {
    const dt = now - lastFrameTs;
    lastFrameTs = now;
    // Ignore huge gaps (tab was backgrounded)
    if (dt > 0 && dt < 500) {
      emaFrameMs = emaFrameMs * 0.9 + dt * 0.1;
    }
    const fps = 1000 / emaFrameMs;
    // Map FPS → quality with hysteresis
    if (fps < 30 && quality > 0.35) quality = Math.max(0.3, quality - 0.04);
    else if (fps < 45 && quality > 0.6) quality = Math.max(0.55, quality - 0.02);
    else if (fps > 55 && quality < 1) quality = Math.min(1, quality + 0.01);
    // Frame-skip only if extremely slow
    if (fps < 20) skipEvery = 2;
    else if (fps < 28) skipEvery = 1;
    else if (fps > 40) skipEvery = 0;
  }

  function render() {
    const now = performance.now();
    adapt(now);

    if (skipEvery > 0) {
      skipPhase = (skipPhase + 1) % (skipEvery + 1);
      if (skipPhase !== 0) {
        animId = requestAnimationFrame(render);
        return;
      }
    }

    t++;
    switch (theme) {
      case 'matrix':
      case 'code_stream':
        renderMatrix(ctx!, matrixCols, w, h);
        break;
      case 'matrix_rain_fast':
        renderMatrixRainFast(ctx!, matrixCols, w, h);
        break;
      case 'matrix_rain_blue':
        renderMatrixRainBlue(ctx!, matrixCols, w, h);
        break;
      case 'cyber_grid':
        renderCyberGrid(ctx!, w, h, t);
        break;
      case 'synthwave':
        renderSynthwave(ctx!, w, h, t);
        break;
      case 'circuit_board':
        renderCircuitBoard(ctx!, w, h, t);
        break;
      case 'glitch':
        renderGlitch(ctx!, w, h, t);
        break;
      case 'scanlines':
        renderScanlines(ctx!, w, h, t);
        break;
      case 'radar_sweep':
        renderRadarSweep(ctx!, w, h, t);
        break;
      case 'packet_flow':
        renderPacketFlow(ctx!, w, h, t);
        break;
      case 'binary_rain':
        renderBinaryRain(ctx!, matrixCols, w, h);
        break;
      case 'cyberpunk_neon':
        renderCyberpunkNeon(ctx!, particles, w, h, t);
        break;
      case 'hud_overlay':
        renderHudOverlay(ctx!, w, h, t);
        break;
      case 'terminal_green':
        renderTerminalGreen(ctx!, matrixCols, w, h);
        break;
      case 'digital_rain':
        renderDigitalRain(ctx!, particles, w, h, t);
        break;
      case 'neon_particles':
        renderNeonParticles(ctx!, particles, w, h, t);
        break;
      case 'data_stream':
        renderDataStream(ctx!, w, h, t);
        break;
      case 'quantum_ripple':
        renderQuantumRipple(ctx!, w, h, t);
        break;
      case 'cyber_hex':
        renderCyberHex(ctx!, w, h, t);
        break;
      case 'retro_crt':
        renderRetroCrt(ctx!, w, h, t);
        break;
      case 'cyber_rain':
        renderCyberRain(ctx!, particles, w, h, t);
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
      case 'neutron_star':
        renderNeutronStar(ctx!, w, h, t, quality);
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
    nsStars = null; // regenerate distorted starfield for new dims
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
