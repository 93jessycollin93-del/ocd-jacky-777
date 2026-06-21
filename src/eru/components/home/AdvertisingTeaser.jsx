import { Megaphone, Clock } from 'lucide-react';

/**
 * AdvertisingTeaser — small "coming soon" strip introducing the future
 * advertising-coupling service. Slogan: "We help you find what works with you."
 * Pure presentation, no business logic.
 */
export default function AdvertisingTeaser() {
  return (
    <section
      aria-label="Advertising coupling"
      className="eru-theme-card eru-enter relative overflow-hidden rounded-2xl border border-amber-400/30 p-4"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-amber-500/15 blur-3xl" />
      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-border bg-secondary/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Clock className="h-3 w-3" /> Coming soon
      </span>

      <div className="relative flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/10">
          <Megaphone className="h-4.5 w-4.5 text-amber-300" style={{ width: 18, height: 18 }} />
        </div>
        <div className="min-w-0">
          <span className="inline-block rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
            Advertising
          </span>
          <h3 className="mt-1.5 text-base font-bold leading-tight text-foreground">
            Advertising coupling services
          </h3>
          <p className="mt-1 text-sm font-medium text-amber-200/90 italic">
            “We help you find what works with you.”
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Smart pairing of your content, bots, and storefront with the right
            audiences and partners. Full guidance and tools land here soon.
          </p>
        </div>
      </div>
    </section>
  );
}