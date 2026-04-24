import { useEffect } from 'react';
import { useAnimatedBackground, setNeutronStarGlow, type BackgroundTheme } from './AnimatedBackgrounds';

interface AnimatedCanvasProps {
  theme: BackgroundTheme;
  className?: string;
  /** Canvas opacity, 0–1. Default 0.7. */
  opacity?: number;
  /** Glow intensity multiplier for neutron-star theme, 0–2. Default 1. */
  glow?: number;
}

export default function AnimatedCanvas({ theme, className, opacity = 0.7, glow = 1 }: AnimatedCanvasProps) {
  const canvasRef = useAnimatedBackground(theme);

  useEffect(() => {
    if (theme === 'neutron_star') setNeutronStarGlow(glow);
  }, [theme, glow]);

  if (theme === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className ?? ''}`}
      style={{ opacity }}
    />
  );
}
