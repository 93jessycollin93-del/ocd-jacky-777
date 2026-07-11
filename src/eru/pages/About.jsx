import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Layers,
  Zap,
  Bot,
  Coins,
  Gamepad2,
  Settings2,
  CheckCircle2,
  BookOpen,
  Users,
  Compass,
} from 'lucide-react';

/**
 * About — single source of truth for ERU's product story, capabilities,
 * differentiators, and audience. Mobile-first, scrollable, glass surfaces
 * to match the rest of the app.
 */

const CAPABILITIES = [
  { icon: Bot,          text: 'Use AI to assist, automate, and create' },
  { icon: Coins,        text: 'Manage digital assets and currencies' },
  { icon: Gamepad2,     text: 'Access interactive systems like marketplaces and games' },
  { icon: Settings2,    text: 'Customize your interface, layout, and environment' },
  { icon: CheckCircle2, text: 'Build workflows that adapt to your needs' },
];

const DIFFERENTIATORS = [
  'Everything exists in one place',
  'Fully customizable experience',
  'Modular system that grows over time',
  'Designed for both simplicity and advanced control',
];

const AUDIENCE = [
  'Builders and creators',
  'Traders and collectors',
  'Gamers and system explorers',
  'Anyone who wants more control over their digital environment',
];

const PRINCIPLES = [
  { title: 'Modular',     desc: 'Every feature is a room you can add, remove, or rearrange.' },
  { title: 'Real-time',   desc: 'Live data, live collaboration, instant feedback.' },
  { title: 'Customizable',desc: 'Adjust theme, layout, widgets, and behavior to fit you.' },
  { title: 'Telegram-native', desc: 'Built to feel right inside chat-linked, mobile-first flows.' },
];

export default function About() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 md:pb-10">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card/80 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Back to dashboard"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-foreground sm:text-lg">About ERU</h1>
          <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
            What it is, how it works, and what you can do
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 sm:px-6 max-w-3xl w-full mx-auto space-y-4">
        {/* Hero */}
        <section
          aria-label="ERU introduction"
          className="eru-theme-card eru-cta-accent relative overflow-hidden rounded-2xl border border-border p-5 sm:p-7 eru-enter"
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3 w-3" />
              ERU
            </div>
            <h2 className="mt-3 text-xl font-bold leading-tight text-foreground sm:text-2xl md:text-3xl">
              Your all-in-one digital toolbox.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Build, control, and explore powerful systems from a single environment—no switching apps, no limitations.
              Access AI tools, manage assets, interact with dynamic systems, and customize your entire experience in real time.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Everything in ERU is modular, meaning it grows with you—add tools, expand features, and shape your environment exactly how you want it.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[11px] text-foreground">
                <Layers className="h-3 w-3 text-primary" />
                Modular
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[11px] text-foreground">
                <Zap className="h-3 w-3 text-primary" />
                Real-time
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                One system. Infinite possibilities.
              </span>
            </div>
          </div>
        </section>

        {/* What is ERU */}
        <Section icon={BookOpen} title="What is ERU?">
          ERU is a modular digital platform that combines tools, AI, assets, and interactive systems into one unified space.
          Instead of using multiple apps, ERU brings everything together so you can build, manage, and operate more efficiently.
        </Section>

        {/* How it works */}
        <Section icon={Compass} title="How it works">
          ERU is structured as a collection of connected modules ("rooms"), each designed for a specific purpose—tools, AI systems,
          marketplaces, games, and more. These modules can expand, evolve, and integrate with each other over time.
        </Section>

        {/* Capabilities */}
        <section className="eru-theme-card rounded-2xl border border-border p-4 sm:p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">What you can do</h3>
          <ul className="space-y-2">
            {CAPABILITIES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-sm text-foreground">
                <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-muted-foreground leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Differentiators + Audience */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ListCard icon={Sparkles} title="Why ERU is different" items={DIFFERENTIATORS} />
          <ListCard icon={Users}    title="Who it's for"        items={AUDIENCE} />
        </div>

        {/* Principles grid */}
        <section className="eru-theme-card rounded-2xl border border-border p-4 sm:p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Principles</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="rounded-xl border border-border bg-secondary/30 p-3">
                <p className="text-sm font-semibold text-foreground">{p.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* One-liner */}
        <section className="rounded-2xl border border-primary/30 bg-primary/10 p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary">In one line</p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-foreground sm:text-base">
            ERU is a customizable digital ecosystem designed to help you build, manage, and explore everything in one place.
          </p>
        </section>

        {/* Footer link back */}
        <div className="pt-2 pb-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-primary" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="eru-theme-card rounded-2xl border border-border p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </section>
  );
}

function ListCard({ icon: Icon, title, items }) {
  return (
    <section className="eru-theme-card rounded-2xl border border-border p-4 sm:p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}