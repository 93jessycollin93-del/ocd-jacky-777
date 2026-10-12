// The Arcade: every game in one place, with search and categories. Games under src/arcade/games show up
// here automatically; the two big standalone games are featured at the top.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GAMES } from "@/arcade/registry";
import { CATEGORIES, type Category, type GameMeta } from "@/arcade/types";
import { loadBest } from "@/arcade/kit/storage";
import { formatTime } from "@/arcade/kit/format";

interface Featured {
  title: string;
  emoji: string;
  href: string;
  blurb: string;
  accent: string;
  tags: string[];
}

const FEATURED: Featured[] = [
  {
    title: "Dead Hours", emoji: "🧟", href: "/zombies", accent: "#b91c1c",
    blurb: "Round-based zombie survival in 3D. Board up the windows, buy guns off the walls, turn on the power, drink perks, spin the Mystery Box and upgrade your gun.",
    tags: ["3D shooter", "Waves"],
  },
  {
    title: "Primal Isle", emoji: "🦖", href: "/survival", accent: "#15803d",
    blurb: "Survive an island of dinosaurs in 3D: gather, craft, build with blocks, knock out dinos and tame them to ride.",
    tags: ["3D survival", "Crafting"],
  },
];

/** Games on the way, shown until they arrive in the registry. */
const PLANNED: { id: string; title: string; emoji: string }[] = [
  { id: "kickflip-city", title: "Kickflip City", emoji: "🛹" },
  { id: "arena-zero", title: "Arena Zero", emoji: "⚡" },
  { id: "breach-team", title: "Breach Team", emoji: "💣" },
  { id: "ringworld-strike", title: "Ringworld Strike", emoji: "🛸" },
  { id: "neon-getaway", title: "Neon Getaway", emoji: "🚗" },
  { id: "pitch-kings", title: "Pitch Kings", emoji: "⚽" },
  { id: "crypt-delver", title: "Crypt Delver", emoji: "🗝️" },
  { id: "lab-breach", title: "Lab Breach", emoji: "🧪" },
  { id: "fortress-run", title: "Fortress Run", emoji: "🏰" },
  { id: "worm-wars", title: "Worm Wars", emoji: "🪱" },
  { id: "drop-zone", title: "Drop Zone", emoji: "🪂" },
  { id: "starship-suspect", title: "Starship Suspect", emoji: "🚀" },
  { id: "obby-rush", title: "Obby Rush", emoji: "🧗" },
  { id: "rail-rush", title: "Rail Rush", emoji: "🛤️" },
  { id: "kart-kings", title: "Kart Kings", emoji: "🏎️" },
  { id: "rocket-ball", title: "Rocket Ball", emoji: "🚙" },
];

const ELSEWHERE = {
  title: "Minecraft Classic", emoji: "⛏️", href: "https://classic.minecraft.net/", accent: "#65a30d",
  blurb: "Mojang's own free browser version of the original Minecraft.",
};

function bestText(g: GameMeta): string | null {
  const b = loadBest(g.id);
  if (!b) return null;
  return `${g.scoreLabel ?? "Best"} ${g.scoreFormat === "time" ? formatTime(b) : Math.floor(b).toLocaleString("en-US")}`;
}

function GameCard({ g }: { g: GameMeta }) {
  const best = bestText(g);
  return (
    <Link
      to={`/arcade/${g.id}`}
      className="group flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.07]"
      style={{ boxShadow: `0 10px 30px -18px ${g.accent}` }}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-2xl" style={{ background: `${g.accent}33` }}>
          {g.emoji}
        </span>
        <div className="min-w-0">
          <div className="truncate font-bold">{g.title}</div>
          <div className="truncate text-[11px] text-white/50">{g.category}{g.tags?.length ? ` · ${g.tags.slice(0, 2).join(" · ")}` : ""}</div>
        </div>
      </div>
      <p className="line-clamp-2 text-xs leading-relaxed text-white/65">{g.blurb}</p>
      <div className="mt-auto flex items-center justify-between text-[11px]">
        <span className="font-semibold" style={{ color: g.accent }}>Play →</span>
        {best && <span className="text-white/50">{best}</span>}
      </div>
    </Link>
  );
}

export default function Arcade() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      GAMES.filter(
        (g) =>
          (category === "All" || g.category === category) &&
          (!q || [g.title, g.blurb, g.category, ...(g.tags ?? [])].some((s) => s.toLowerCase().includes(q))),
      ),
    [q, category],
  );
  const present = new Set(GAMES.map((g) => g.id));
  const planned = PLANNED.filter((p) => !present.has(p.id));
  const usedCategories = CATEGORIES.filter((c) => GAMES.some((g) => g.category === c));
  const grouped = category === "All" && !q;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#0b0a14_50%,#000_100%)] p-4 text-white">
      <div className="mx-auto max-w-6xl space-y-7 pt-4">
        <div className="text-xs text-white/60">
          <Link to="/" className="hover:text-white">← Home</Link>
        </div>
        <header className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">🕹️ Arcade</h1>
          <p className="max-w-2xl text-sm text-white/70">
            {GAMES.length + FEATURED.length} games that run right in your browser tab, nothing to install. Keyboard and mouse
            on a computer, touch controls on a phone. Best scores are saved in this browser.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search games…"
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm placeholder:text-white/40 sm:max-w-xs"
            />
            <div className="flex flex-wrap gap-1.5">
              {(["All", ...usedCategories] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs ${category === c ? "bg-white text-black" : "bg-white/10 text-white/75 hover:bg-white/15"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </header>

        {grouped && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/60">Featured 3D games</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURED.map((f) => (
                <Link
                  key={f.href}
                  to={f.href}
                  className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/[0.06] p-4 transition hover:-translate-y-0.5 hover:border-white/35"
                  style={{ boxShadow: `0 0 0 1px ${f.accent}22, 0 14px 36px -14px ${f.accent}` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl text-3xl" style={{ background: `${f.accent}33` }}>{f.emoji}</span>
                    <div>
                      <div className="text-lg font-black">{f.title}</div>
                      <div className="text-[11px] text-white/55">{f.tags.join(" · ")}</div>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-white/70">{f.blurb}</p>
                  <span className="text-xs font-semibold" style={{ color: f.accent }}>Play →</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {grouped ? (
          usedCategories.map((c) => (
            <section key={c} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/60">{c}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {GAMES.filter((g) => g.category === c).map((g) => (
                  <GameCard key={g.id} g={g} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/60">
              {filtered.length} game{filtered.length === 1 ? "" : "s"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((g) => (
                <GameCard key={g.id} g={g} />
              ))}
            </div>
            {filtered.length === 0 && <p className="text-sm text-white/50">No games match.</p>}
          </section>
        )}

        {grouped && planned.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/60">On the way</h2>
            <div className="flex flex-wrap gap-2">
              {planned.map((p) => (
                <span key={p.id} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/55">
                  {p.emoji} {p.title}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3 pb-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/60">Free and official, elsewhere</h2>
          <a
            href={ELSEWHERE.href}
            target="_blank"
            rel="noreferrer noopener"
            className="flex max-w-md items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 hover:border-white/30"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl" style={{ background: `${ELSEWHERE.accent}33` }}>{ELSEWHERE.emoji}</span>
            <div>
              <div className="font-bold">{ELSEWHERE.title} ↗</div>
              <div className="text-xs text-white/60">{ELSEWHERE.blurb}</div>
            </div>
          </a>
        </section>
      </div>
    </div>
  );
}
