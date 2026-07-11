import { useEffect, useMemo, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  hue: number;
  alpha: number;
}

export const ParticleField = ({ active = true }: { active?: boolean }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const particles = useMemo<Particle[]>(() => [], []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = 46;
    if (particles.length === 0) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: 1 + Math.random() * 4,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          hue: Math.random() > 0.5 ? 168 : 300,
          alpha: 0.1 + Math.random() * 0.4,
        });
      }
    }

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx * (active ? 2.4 : 1);
        p.y += p.vy * (active ? 2.4 : 1);
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 60%, ${p.alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active, particles]);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
};
