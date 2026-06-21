import { useEffect, useRef } from 'react';

interface Props { events?: number; color?: string; className?: string }

/** Rolling pulse timeline — drop-in for security/event panels. */
export default function PulseTimeline({ events = 60, color = 'hsl(0 90% 60%)', className }: Props) {
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
    resize(); window.addEventListener('resize', resize);
    const buf = Array.from({ length: events }, () => Math.random() * 0.4);
    const tick = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // baseline
      ctx.strokeStyle = 'hsl(0 0% 30% / 0.5)';
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      // shift buffer
      if (t % 4 === 0) {
        buf.shift();
        buf.push(Math.random() < 0.1 ? 0.4 + Math.random() * 0.5 : Math.random() * 0.15);
      }
      // draw bars
      const bw = w / buf.length;
      buf.forEach((v, i) => {
        const bh = v * (h * 0.9);
        ctx.fillStyle = v > 0.4 ? color : 'hsl(160 60% 50% / 0.7)';
        ctx.fillRect(i * bw, h / 2 - bh / 2, bw * 0.8, bh);
      });
      t++;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [events, color]);
  return <canvas ref={ref} className={className ?? 'h-full w-full'} />;
}
