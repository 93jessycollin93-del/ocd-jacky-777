import { ReactNode } from 'react';
import AnimatedCanvas from '@/components/backgrounds/AnimatedCanvas';

interface Props {
  title?: string;
  badge?: 'REFERENCE' | 'LIVE' | 'EXPERIMENTAL';
  banner?: string;
  children: ReactNode;
}

const badgeColors: Record<NonNullable<Props['badge']>, string> = {
  REFERENCE: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  LIVE: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  EXPERIMENTAL: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
};

/**
 * Wraps every ported Eru page. Jackie owns the theme; the page renders inside
 * an animated neural-mesh field with a small honesty banner so users know what
 * they are looking at.
 */
export default function EruPageShell({ title, badge = 'EXPERIMENTAL', banner, children }: Props) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-30">
        <AnimatedCanvas theme="neural_mesh" opacity={0.3} />
      </div>
      {(title || banner) && (
        <div className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-xs">
            <span className={`rounded border px-2 py-0.5 font-mono uppercase tracking-wider ${badgeColors[badge]}`}>
              {badge}
            </span>
            {title && <span className="font-semibold text-foreground">{title}</span>}
            {banner && <span className="text-muted-foreground">{banner}</span>}
            <span className="ml-auto text-muted-foreground/70">Jackie ⇄ Eru</span>
          </div>
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
