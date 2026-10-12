// The Arcade: every game in the app in one place, plus what's being built next.
import { Link } from "react-router-dom";

interface GameCard {
  title: string;
  emoji: string;
  blurb: string;
  href?: string;
  external?: boolean;
  tags: string[];
  accent: string;
}

const PLAYABLE: GameCard[] = [
  {
    title: "Dead Hours", emoji: "🧟", href: "/zombies", accent: "#b91c1c",
    blurb: "Round-based zombie survival. Board up the windows, buy guns off the walls, turn on the power, drink perks, spin the Mystery Box and upgrade your gun.",
    tags: ["First-person shooter", "Waves", "Solo"],
  },
  {
    title: "Primal Isle", emoji: "🦖", href: "/survival", accent: "#15803d",
    blurb: "Survive an island of dinosaurs: gather, craft, build with blocks, knock out dinos and tame them to ride.",
    tags: ["Survival", "Crafting", "Building"],
  },
];

/** Original games in the works, one per style. */
const NEXT: GameCard[] = [
  { title: "Kickflip City", emoji: "🛹", accent: "#0ea5e9", blurb: "Skateboarding: flick-it tricks, grinds and manuals around a city skate spot.", tags: ["Sports"] },
  { title: "Arena Zero", emoji: "⚡", accent: "#f59e0b", blurb: "Fast arena shooter: rocket jumps, armour and pickups against bots.", tags: ["Shooter"] },
  { title: "Breach Team", emoji: "💣", accent: "#64748b", blurb: "Tactical rounds: plant or defuse, buy menu, one life per round.", tags: ["Tactical"] },
  { title: "Ringworld Strike", emoji: "🛸", accent: "#22c55e", blurb: "Sci-fi shooter: shields that recharge, energy weapons and vehicles.", tags: ["Sci-fi"] },
  { title: "Neon Getaway", emoji: "🚗", accent: "#ec4899", blurb: "Open-city driving: jobs, chases and a map to roam.", tags: ["Driving"] },
  { title: "Pitch Kings", emoji: "⚽", accent: "#16a34a", blurb: "Eleven-a-side football with passing, through balls and shots.", tags: ["Sports"] },
  { title: "Crypt Delver", emoji: "🗝️", accent: "#a16207", blurb: "Click-to-move dungeon crawler: loot, skills and a descent into the dark.", tags: ["RPG"] },
  { title: "Lab Breach", emoji: "🧪", accent: "#f97316", blurb: "Story corridor shooter in a research facility gone wrong.", tags: ["Shooter"] },
  { title: "Fortress Run", emoji: "🏰", accent: "#78716c", blurb: "Retro castle shooter: keys, secrets and a boss on every floor.", tags: ["Retro"] },
  { title: "Worm Wars", emoji: "🪱", accent: "#84cc16", blurb: "Turn-based artillery: aim, wind and destructible ground.", tags: ["Party"] },
];

const ELSEWHERE: GameCard[] = [
  {
    title: "Minecraft Classic", emoji: "⛏️", href: "https://classic.minecraft.net/", external: true, accent: "#65a30d",
    blurb: "Mojang's own free browser version of the original Minecraft.", tags: ["Official", "Free"],
  },
];

function Card({ g, dim }: { g: GameCard; dim?: boolean }) {
  const body = (
    <div
      className={`flex h-full flex-col gap-2 rounded-xl border p-4 transition ${dim ? "border-white/10 bg-white/[0.03] opacity-70" : "border-white/15 bg-white/[0.06] hover:-translate-y-0.5 hover:border-white/35"}`}
      style={{ boxShadow: dim ? undefined : `0 0 0 1px ${g.accent}22, 0 10px 30px -12px ${g.accent}66` }}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl" style={{ background: `${g.accent}33` }}>
          {g.emoji}
        </span>
        <div className="min-w-0">
          <div className="truncate font-bold">{g.title}{g.external ? " ↗" : ""}</div>
          <div className="flex flex-wrap gap-1">
            {g.tags.map((t) => (
              <span key={t} className="rounded bg-white/10 px-1.5 text-[10px] text-white/70">{t}</span>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-white/70">{g.blurb}</p>
      {!dim && <span className="mt-auto text-xs font-semibold" style={{ color: g.accent }}>{g.external ? "Open" : "Play"} →</span>}
    </div>
  );
  if (dim || !g.href) return body;
  if (g.external) {
    return (
      <a href={g.href} target="_blank" rel="noreferrer noopener" className="block">
        {body}
      </a>
    );
  }
  return (
    <Link to={g.href} className="block">
      {body}
    </Link>
  );
}

export default function Arcade() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#0b0a14_55%,#000_100%)] p-4 text-white">
      <div className="mx-auto max-w-5xl space-y-8 pt-6">
        <div className="flex items-center justify-between text-xs text-white/60">
          <Link to="/" className="hover:text-white">← Home</Link>
        </div>
        <header>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">🕹️ Arcade</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Full games that run right in your browser tab: nothing to install. Keyboard and mouse on a computer, touch
            controls on a phone.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/60">Play now</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {PLAYABLE.map((g) => (
              <Card key={g.title} g={g} />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/60">Being built next</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NEXT.map((g) => (
              <Card key={g.title} g={g} dim />
            ))}
          </div>
        </section>

        <section className="space-y-3 pb-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/60">Free and official, elsewhere</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {ELSEWHERE.map((g) => (
              <Card key={g.title} g={g} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
