import { useEffect, useRef } from 'react';
import { useTheme, BG_ENVS } from '../context/ThemeContext';

// ─── ANIMATION ENGINES ──────────────────────────────────────────────────────
// Pattern: every engine MUST return a cleanup fn. All use a `cancelled` flag so
// the RAF loop halts immediately on the same tick as cancelAnimationFrame.
const ENGINES = {

  neural_mesh: (canvas, density = 1) => {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    const n = Math.floor(35 * density);
    const pts = Array.from({ length: n }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    }));
    let frame = 0, raf, cancelled = false;
    const draw = () => {
      if (cancelled) return;
      frame++;
      if (frame % 2 === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pts.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
          ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(100,200,255,0.7)'; ctx.fill();
        });
        pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 120) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(100,200,255,${0.2 * (1 - d / 120)})`; ctx.stroke();
          }
        }));
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelled = true; cancelAnimationFrame(raf); ctx.clearRect(0, 0, canvas.width, canvas.height); };
  },

  stars: (canvas, density = 1) => {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    const n = Math.floor(180 * density);
    const stars = Array.from({ length: n }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3, twinkle: Math.random() * Math.PI * 2,
    }));
    let frame = 0, raf, cancelled = false;
    const draw = () => {
      if (cancelled) return;
      frame++;
      if (frame % 2 === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(s => {
          s.twinkle += 0.03;
          const alpha = 0.4 + Math.sin(s.twinkle) * 0.4;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,220,255,${alpha})`; ctx.fill();
        });
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelled = true; cancelAnimationFrame(raf); ctx.clearRect(0, 0, canvas.width, canvas.height); };
  },

  nebula: (canvas) => {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    let t = 0, frame = 0, raf, cancelled = false;
    const draw = () => {
      if (cancelled) return;
      frame++;
      if (frame % 3 === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        t += 0.004;
        for (let i = 0; i < 5; i++) {
          const x = canvas.width / 2 + Math.sin(t + i * 1.2) * canvas.width * 0.3;
          const y = canvas.height / 2 + Math.cos(t * 0.7 + i) * canvas.height * 0.3;
          const g = ctx.createRadialGradient(x, y, 0, x, y, canvas.width * 0.3);
          const colors = ['#00e67628','#7c4dff22','#ff525218','#2196f320','#ffeb3b18'];
          g.addColorStop(0, colors[i]); g.addColorStop(1, 'transparent');
          ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelled = true; cancelAnimationFrame(raf); ctx.clearRect(0, 0, canvas.width, canvas.height); };
  },

  aurora_sky: (canvas) => {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    let t = 0, frame = 0, raf, cancelled = false;
    const draw = () => {
      if (cancelled) return;
      frame++;
      if (frame % 3 === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        t += 0.008;
        for (let band = 0; band < 4; band++) {
          const y = canvas.height * (0.2 + band * 0.18) + Math.sin(t + band) * 30;
          const grad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
          const colors = ['rgba(0,200,150,', 'rgba(100,100,255,', 'rgba(0,200,255,', 'rgba(150,0,255,'];
          grad.addColorStop(0, colors[band] + '0)');
          grad.addColorStop(0.5, colors[band] + `${0.08 + Math.sin(t * 0.5 + band) * 0.04})`);
          grad.addColorStop(1, colors[band] + '0)');
          ctx.fillStyle = grad;
          for (let x = 0; x < canvas.width; x += 6) {
            const wave = Math.sin(t * 2 + x * 0.01 + band) * 20;
            ctx.fillRect(x, y + wave - 40, 6, 80);
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelled = true; cancelAnimationFrame(raf); ctx.clearRect(0, 0, canvas.width, canvas.height); };
  },

  particles: (canvas, density = 1) => {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    const n = Math.floor(50 * density);
    const pts = Array.from({ length: n }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, r: Math.random() * 2 + 0.5,
    }));
    let frame = 0, raf, cancelled = false;
    const draw = () => {
      if (cancelled) return;
      frame++;
      if (frame % 2 === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pts.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,230,118,0.5)'; ctx.fill();
        });
        pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 100) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(0,230,118,${0.15 * (1 - d / 100)})`; ctx.stroke();
          }
        }));
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelled = true; cancelAnimationFrame(raf); ctx.clearRect(0, 0, canvas.width, canvas.height); };
  },

  fire: (canvas, density = 1) => {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    const n = Math.floor(50 * density);
    const embers = Array.from({ length: n }, () => ({
      x: Math.random() * canvas.width, y: canvas.height + 10,
      vx: (Math.random() - 0.5) * 1.5, vy: -(1 + Math.random() * 3),
      life: Math.random(), decay: 0.008 + Math.random() * 0.01, r: 1.5 + Math.random() * 2.5,
    }));
    let frame = 0, raf, cancelled = false;
    const draw = () => {
      if (cancelled) return;
      frame++;
      if (frame % 2 === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        embers.forEach(e => {
          e.x += e.vx; e.y += e.vy; e.life -= e.decay;
          if (e.life <= 0) { e.x = Math.random() * canvas.width; e.y = canvas.height + 10; e.life = 1; e.vy = -(1 + Math.random() * 3); }
          const hue = 20 + e.life * 30;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r * e.life, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue},100%,60%,${e.life * 0.6})`; ctx.fill();
        });
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelled = true; cancelAnimationFrame(raf); ctx.clearRect(0, 0, canvas.width, canvas.height); };
  },

  crystal_lattice: (canvas, density = 1) => {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    const n = Math.floor(20 * density);
    const nodes = Array.from({ length: n }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
    }));
    let frame = 0, raf, cancelled = false;
    const draw = () => {
      if (cancelled) return;
      frame++;
      if (frame % 2 === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        nodes.forEach(nd => {
          nd.x += nd.vx; nd.y += nd.vy;
          if (nd.x < 0 || nd.x > canvas.width) nd.vx *= -1;
          if (nd.y < 0 || nd.y > canvas.height) nd.vy *= -1;
        });
        nodes.forEach((a, i) => nodes.slice(i + 1).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 150) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(150,230,255,${0.3 * (1 - d / 150)})`; ctx.lineWidth = 0.5; ctx.stroke();
            ctx.beginPath(); ctx.arc(a.x, a.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(150,230,255,0.6)'; ctx.fill();
          }
        }));
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelled = true; cancelAnimationFrame(raf); ctx.clearRect(0, 0, canvas.width, canvas.height); };
  },

  neutron_star: (canvas, density = 1) => {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;

    const stars = Array.from({ length: Math.floor(90 * density) }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.1 + 0.15,
      a: 0.08 + Math.random() * 0.28,
      twinkle: Math.random() * Math.PI * 2,
    }));

    let raf;
    let cancelled = false;
    let t = 0;

    const draw = () => {
      if (cancelled) return;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w * 0.5;
      const cy = h * 0.36;
      const pulse = (Math.sin(t * 1.2) + 1) * 0.5;

      ctx.clearRect(0, 0, w, h);

      const vignette = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.85);
      vignette.addColorStop(0, 'rgba(50,90,210,0.08)');
      vignette.addColorStop(0.28, 'rgba(18,28,72,0.1)');
      vignette.addColorStop(0.68, 'rgba(6,10,24,0.06)');
      vignette.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      stars.forEach((star) => {
        star.twinkle += 0.006;
        const alpha = star.a + Math.sin(star.twinkle) * 0.04;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,232,255,${Math.max(0.04, alpha)})`;
        ctx.fill();
      });

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.1);

      const beam = ctx.createLinearGradient(-w * 0.34, 0, w * 0.34, 0);
      beam.addColorStop(0, 'rgba(0,0,0,0)');
      beam.addColorStop(0.22, `rgba(92,146,255,${0.03 + pulse * 0.02})`);
      beam.addColorStop(0.5, `rgba(214,236,255,${0.14 + pulse * 0.08})`);
      beam.addColorStop(0.78, `rgba(92,146,255,${0.03 + pulse * 0.02})`);
      beam.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.42, 5 + pulse * 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(Math.PI / 2);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.22, 2.5 + pulse * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 92 + pulse * 10);
      halo.addColorStop(0, `rgba(240,248,255,${0.34 + pulse * 0.08})`);
      halo.addColorStop(0.18, `rgba(166,210,255,${0.18 + pulse * 0.05})`);
      halo.addColorStop(0.5, 'rgba(84,126,255,0.08)');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, 92 + pulse * 10, 0, Math.PI * 2);
      ctx.fill();

      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 18 + pulse * 2.5);
      core.addColorStop(0, 'rgba(255,255,255,0.98)');
      core.addColorStop(0.42, 'rgba(222,238,255,0.95)');
      core.addColorStop(0.78, 'rgba(110,164,255,0.7)');
      core.addColorStop(1, 'rgba(26,44,112,0.08)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, 18 + pulse * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      t += 0.008;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  },

  matrix_rain: (canvas, density = 1) => {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    const fontSize = 14;
    const cols = Math.floor(canvas.width / fontSize);
    // density tunes how many columns rain at once + speed cadence
    const drops = Array.from({ length: cols }, () => ({
      y: Math.random() * -canvas.height / fontSize,
      speed: 0.4 + Math.random() * 0.9 * density,
      active: Math.random() < 0.6 + 0.3 * density,
    }));
    const glyphs = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789ABCDEF<>=*+-:.';
    let frame = 0, raf, cancelled = false;
    const draw = () => {
      if (cancelled) return;
      frame++;
      if (frame % 2 === 0) {
        // Trail effect: translucent black wash instead of full clear.
        ctx.fillStyle = 'rgba(5,8,14,0.18)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
        ctx.textBaseline = 'top';
        for (let i = 0; i < drops.length; i++) {
          const d = drops[i];
          if (!d.active) continue;
          const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
          const x = i * fontSize;
          const y = d.y * fontSize;
          // Lead glyph bright, trail green.
          ctx.fillStyle = 'rgba(190,255,210,0.95)';
          ctx.fillText(ch, x, y);
          ctx.fillStyle = 'rgba(0,230,118,0.75)';
          ctx.fillText(ch, x, y - fontSize);
          d.y += d.speed;
          if (d.y * fontSize > canvas.height && Math.random() > 0.975) {
            d.y = Math.random() * -20;
            d.speed = 0.4 + Math.random() * 0.9 * density;
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelled = true; cancelAnimationFrame(raf); ctx.clearRect(0, 0, canvas.width, canvas.height); };
  },

  none: () => null,
};

export default function AnimatedBackground({ type, opacity: opacityProp }) {
  const themeCtx = useTheme();
  const resolvedType = type ?? themeCtx?.bg ?? 'none';
  const resolvedOpacity = opacityProp ?? themeCtx?.bgOpacity ?? 0.4;
  const density = themeCtx?.particleDensity ?? 1;
  const lowPower = themeCtx?.lowPowerMode ?? false;
  const canvasRef = useRef(null);
  const effectiveType = lowPower ? 'none' : resolvedType;

  // Check if this bg has a url (still image) — works for any prefix
  const envConfig = BG_ENVS[effectiveType];
  const isStill = !!envConfig?.url;
  const stillUrl = isStill ? envConfig.url : null;

  useEffect(() => {
    if (isStill) return; // still images don't use canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (effectiveType === 'none') return;
    const fn = ENGINES[effectiveType];
    if (!fn) return;
    const cleanup = fn(canvas, density);
    return () => {
      if (cleanup) cleanup();
      const c = canvasRef.current;
      if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    };
  }, [effectiveType, density, isStill]);

  if (effectiveType === 'none') return null;

  if (isStill && stillUrl) {
    return (
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage: `url(${stillUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: resolvedOpacity,
          width: '100vw',
          height: '100vh',
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: resolvedOpacity, width: '100vw', height: '100vh' }}
    />
  );
}