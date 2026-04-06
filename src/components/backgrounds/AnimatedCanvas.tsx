import { useAnimatedBackground, type BackgroundTheme } from './AnimatedBackgrounds';

interface AnimatedCanvasProps {
  theme: BackgroundTheme;
  className?: string;
}

export default function AnimatedCanvas({ theme, className }: AnimatedCanvasProps) {
  const canvasRef = useAnimatedBackground(theme);

  if (theme === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className ?? ''}`}
      style={{ opacity: 0.7 }}
    />
  );
}
