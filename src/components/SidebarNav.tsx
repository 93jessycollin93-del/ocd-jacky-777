import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Jackie's left-menu navigation, grouped into collapsible sections so the
 * growing tool list stays scannable. Every destination that used to live in
 * the flat list is still here — plus The PC section, which deep-links into
 * the embedded Visual Computer (/pc?app=<pc-app-id>).
 */

interface NavItem {
  label: string;
  href: string;
  title?: string;
  external?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "pc",
    label: "The PC",
    items: [
      { label: "🖥️ The PC · Visual Computer", href: "/pc", title: "The whole PC — 90+ apps, windows, ink gestures — embedded with nothing compromised" },
      { label: "🧭 JACKY v3 (in PC)", href: "/pc?app=jacky", title: "Open the PC with JACKY v3 running" },
      { label: "⌨️ ai-term Console", href: "/pc?app=aiterm", title: "Open the PC with the ai-term console running" },
      { label: "🛡️ PC Security Center", href: "/pc?app=security_center", title: "Open the PC with the Security Center running" },
      { label: "🧬 qpdb Matrix", href: "/pc?app=qpdb", title: "Open the PC with the qpdb Matrix running" },
    ],
  },
  {
    id: "build",
    label: "Build",
    items: [
      { label: "🤖 Bot Foundry", href: "/bots" },
      { label: "🕸️ Bot Swarm", href: "/swarm" },
      { label: "🛰️ Control", href: "/control" },
      { label: "🔑 API Key Vault", href: "/keys" },
      { label: "🧠 AI Providers", href: "/providers", title: "Groq, OpenRouter, Ollama and more" },
    ],
  },
  {
    id: "games",
    label: "Games & Worlds",
    items: [
      { label: "⚔️ Play Game", href: "/play" },
      { label: "🐉 Realm Accord ↗", href: "https://dragon-chaos-wars.lovable.app", title: "Realm Accord — strategy game", external: true },
      { label: "🌐 Horizon Network ↗", href: "https://jadelounge.lovable.app", title: "Horizon Network — social network", external: true },
      { label: "👑 Emperors of the Last Kingdom ↗", href: "https://chaos-dragon-emperor.lovable.app", title: "Emperors of the Last Kingdom — fantasy strategy", external: true },
    ],
  },
  {
    id: "ops",
    label: "Ops & Intel",
    items: [
      { label: "🛡️ VeilOps Threat Intel", href: "/veilops", title: "VeilOps — factual threat intelligence reference (MITRE ATT&CK, CISA KEV, APT profiles)" },
      { label: "🛰️ Sentinel · Crypto Forensics", href: "/sentinel", title: "RugDNA Sentinel — synthetic crypto-forensics reference dashboard" },
      { label: "🏔 Apex Hub (placeholder)", href: "/apex", title: "Apex Intelligence Hub — reserved mount point" },
      { label: "🧊 eYe Pod Station", href: "/pods", title: "eYe Pod Station — 24 compression pods with SHA-256 integrity" },
    ],
  },
  {
    id: "labs",
    label: "Labs",
    items: [
      { label: "🧬 Microscopic Marvels Lab", href: "/marvels", title: "Microscopic Marvels — procedural cell-race simulation (virtual credits only)" },
      { label: "🧬 Visualizer Lab", href: "/eru/visualizers", title: "Shared visualizer primitives — vibe-coding lab" },
      { label: "🧪 Eru · AI Lab", href: "/eru/ailab" },
      { label: "🛰 Eru · Security", href: "/eru/admin/security", title: "Eru Security Command Center" },
      { label: "🤖 Eru · Bot Forge", href: "/eru/bot-forge" },
      { label: "🛍️ Eru · Bot Market", href: "/eru/bot-marketplace" },
      { label: "🐝 Eru · Swarm", href: "/eru/eru-swarm-test", title: "Eru Swarm test harness" },
      { label: "⚔️ Eru · Red Team", href: "/eru/eru-redteam-test", title: "Eru Red-team test harness" },
    ],
  },
];

const STORAGE_KEY = "jackie.sidebar.groups.v1";
const DEFAULT_OPEN: Record<string, boolean> = { pc: true, build: true };

const loadOpenState = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_OPEN, ...JSON.parse(raw) };
  } catch {
    /* corrupt state — use defaults */
  }
  return { ...DEFAULT_OPEN };
};

export function SidebarNav() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(loadOpenState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
    } catch {
      /* state just won't persist */
    }
  }, [openGroups]);

  const toggle = (id: string) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <nav className="space-y-0.5">
      {NAV_GROUPS.map((group) => {
        const open = !!openGroups[group.id];
        return (
          <div key={group.id}>
            <button
              type="button"
              onClick={() => toggle(group.id)}
              aria-expanded={open}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              {group.label}
              <span className="ml-auto text-[9px] text-muted-foreground/50">{group.items.length}</span>
            </button>
            {open && (
              <div className="space-y-0.5 pb-1">
                {group.items.map((item) =>
                  item.external ? (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 pl-5 pr-2 py-1.5 font-mono text-xs text-primary hover:bg-secondary/50 rounded-sm transition-colors"
                      title={item.title}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="flex items-center gap-2 pl-5 pr-2 py-1.5 font-mono text-xs text-primary hover:bg-secondary/50 rounded-sm transition-colors"
                      title={item.title}
                    >
                      {item.label}
                    </Link>
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
