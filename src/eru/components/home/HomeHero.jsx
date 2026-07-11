import { Sparkles, Compass } from 'lucide-react';

/**
 * HomeHero — top welcome banner for the Home tutorial page. Sets the tone:
 * "everything you can do, in one place." Pure presentation.
 */
export default function HomeHero() {
  return (
    <section
      aria-label="Welcome"
      className="eru-neon-foundation eru-neon-scanlines eru-theme-card relative overflow-hidden rounded-2xl border border-fuchsia-400/30 p-5 sm:p-7 eru-enter"
    >
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-70">
        <div className="eru-neon-grid-bg" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative max-w-2xl">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-fuchsia-300">
          <Sparkles className="h-3 w-3" /> Welcome to Cybernetic67
        </div>

        <h1 className="eru-neon-glow-text mt-3 text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
          One platform. Every possibility.
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          From building your audience, to trading and collecting assets, to deploying
          automated bots — this is your guided tour. Follow the pathways below and
          discover everything Cybernetic67 can do for you.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground">
          <Compass className="h-4 w-4 text-primary" />
          <span className="sm:hidden">Swipe down to explore each pathway</span>
          <span className="hidden sm:inline">Scroll down to explore each pathway</span>
        </div>
      </div>
    </section>
  );
}