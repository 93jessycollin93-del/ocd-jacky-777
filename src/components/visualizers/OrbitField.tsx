import { useEffect, useRef } from 'react';

interface Props { count?: number; speed?: number; color?: string; className?: string }

/** Concentric orbiting points — used for swarm/redteam status visuals. */
export default function OrbitField({ count = 18, speed = 1, color = 'hsl(50 95% 60%)', className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0; let t = 0;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    };
    resize();
    window.addEventListener('resize', resize);
    const tick = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      for (let i = 0; i < count; i++) {
        const ring = 1 + (i % 4);
        const radius = (Math.min(w, h) / 2.8) * (ring / 4);
        const angle = t * 0.002 * speed * (i % 2 ? 1 : -1) + i;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        ctx.strokeStyle = color + '22';
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, 3 * dpr, 0, Math.PI * 2); ctx.fill();
      }
      t += 16;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [count, speed, color]);
  return <canvas ref={ref} className={className ?? 'h-full w-full'} />;
}
