import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';

/**
 * HomeSection — reusable, elegant tutorial section block used by the Home page.
 * Mobile-first glass surface. Pure presentation, no business logic.
 *
 * Props:
 *  - eyebrow:   small uppercase label above the title
 *  - title:     main heading
 *  - subtitle:  one-line supporting description
 *  - Icon:      lucide icon for the section badge
 *  - accent:    'fuchsia' | 'emerald' | 'cyan' | 'amber' — color theme
 *  - steps:     [{ icon, title, desc }] — the guided pathway items
 *  - cta:       { label, to } — primary action (optional)
 *  - comingSoon:boolean — render a "Coming soon" ribbon when not yet available
 *  - half:      boolean — render a more compact half-sized variant
 */
const ACCENTS = {
  fuchsia: { ring: 'border-fuchsia-400/30', badge: 'border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-300', glow: 'bg-fuchsia-500/20', icon: 'text-fuchsia-300' },
  emerald: { ring: 'border-emerald-400/30', badge: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300', glow: 'bg-emerald-500/20', icon: 'text-emerald-300' },
  cyan:    { ring: 'border-cyan-400/30',    badge: 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300',          glow: 'bg-cyan-500/20',    icon: 'text-cyan-300' },
  amber:   { ring: 'border-amber-400/30',   badge: 'border-amber-400/40 bg-amber-500/10 text-amber-300',       glow: 'bg-amber-500/20',   icon: 'text-amber-300' },
};

export default function HomeSection({ eyebrow, title, subtitle, Icon, accent = 'cyan', steps = [], cta, comingSoon = false, half = false }) {
  const a = ACCENTS[accent] || ACCENTS.cyan;

  return (
    <section
      aria-label={title}
      className={`eru-theme-card eru-enter relative overflow-hidden rounded-2xl border ${a.ring} ${half ? 'p-4' : 'p-5 sm:p-6'}`}
    >
      <div aria-hidden="true" className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${a.glow}`} />

      {comingSoon && (
        <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-border bg-secondary/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Clock className="h-3 w-3" /> Coming soon
        </span>
      )}

      <div className="relative">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${a.badge}`}>
            {Icon && <Icon className={`h-5 w-5 ${a.icon}`} />}
          </div>
          <div className="min-w-0">
            {eyebrow && (
              <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${a.badge}`}>
                {eyebrow}
              </span>
            )}
            <h2 className={`mt-1.5 font-bold leading-tight text-foreground ${half ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'}`}>
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        {steps.length > 0 && (
          <div className={`mt-4 grid gap-2.5 ${half ? 'grid-cols-3' : steps.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {steps.map((s, i) => (
              <div key={i} className="rounded-xl border border-border bg-secondary/40 p-3">
                <div className="flex items-center gap-2">
                  {s.icon && <s.icon className={`h-4 w-4 ${a.icon}`} />}
                  <p className="text-xs font-semibold text-foreground">{s.title}</p>
                </div>
                {s.desc && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{s.desc}</p>}
              </div>
            ))}
          </div>
        )}

        {cta && (
          <Link
            to={cta.to}
            className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 sm:inline-flex sm:w-auto sm:py-2 sm:text-xs ${a.ring} bg-secondary/40`}
          >
            {cta.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </section>
  );
}