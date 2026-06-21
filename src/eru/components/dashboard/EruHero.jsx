import { Link } from 'react-router-dom';
import { Sparkles, Zap, Layers, ArrowRight } from 'lucide-react';

/**
 * EruHero — compact dashboard hero. Slimmed down so the dashboard isn't
 * cluttered with About copy; full story now lives on /about.
 * Mobile-first, glass surface, no business logic.
 */
export default function EruHero() {
  return (
    <section
      aria-label="ERU introduction"
      className="eru-neon-foundation eru-neon-scanlines eru-theme-card eru-cta-accent relative overflow-hidden rounded-2xl border border-fuchsia-400/30 p-4 sm:p-5 eru-enter"
    >
      {/* Decorative wet-street perspective grid (behind text). */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-70">
        <div className="eru-neon-grid-bg" />
      </div>
      {/* Soft accent glow — purely decorative */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-fuchsia-500/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-cyan-500/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-fuchsia-300">
            <Sparkles className="h-3 w-3" />
            ERU
          </div>

          <h1 className="eru-neon-glow-text mt-2 text-lg font-bold leading-tight sm:text-xl md:text-2xl">
            Your all-in-one digital toolbox.
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] text-foreground">
              <Layers className="h-3 w-3 text-primary" />
              Modular
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] text-foreground">
              <Zap className="h-3 w-3 text-primary" />
              Real-time
            </span>
          </div>
        </div>

        <Link
          to="/about"
          className="eru-neon-cta inline-flex flex-shrink-0 items-center justify-center gap-1.5 self-start rounded-xl px-3 py-2 text-xs font-semibold sm:self-auto"
        >
          Learn more
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}