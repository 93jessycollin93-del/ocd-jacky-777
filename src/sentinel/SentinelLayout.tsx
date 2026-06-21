import { Link, Outlet, useLocation } from "react-router-dom";
import { ShieldAlert, LayoutDashboard, FileWarning, Wallet, Network, Upload, Search, Radar, ArrowLeft } from "lucide-react";
import { SENTINEL_CSS } from "./ScopedStyles";
import type { ReactNode } from "react";

const NAV = [
  { to: "/sentinel", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/sentinel/board", label: "Investigation Board", icon: Network },
  { to: "/sentinel/incidents", label: "Incidents", icon: FileWarning },
  { to: "/sentinel/wallets", label: "Wallets", icon: Wallet },
  { to: "/sentinel/submit", label: "Submit Report", icon: Upload },
];

export function SentinelLayout({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="cs-scope flex min-h-screen">
      <style>{SENTINEL_CSS}</style>
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-surface-1/50">
        <div className="px-5 py-5 border-b border-border flex items-center gap-2">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /></Link>
          <ShieldAlert className="size-7 text-primary" />
          <div>
            <div className="font-display text-lg tracking-tight leading-none">
              Rug<span className="text-primary">DNA</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">Intelligence Reference</div>
          </div>
        </div>
        <nav className="px-3 py-4 space-y-0.5">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to}
                className={[
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground border border-transparent",
                ].join(" ")}
                style={active ? { background: "color-mix(in oklab, var(--color-primary) 10%, transparent)" } : undefined}
              >
                <Icon className="size-4" /><span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-4 border-t border-border">
          <div className="rounded-md border border-border bg-surface-2/60 p-3 text-xs">
            <div className="flex items-center gap-2 text-primary font-mono">
              <Radar className="size-3.5 animate-pulse" /> REFERENCE FEED
            </div>
            <div className="mt-2 text-muted-foreground">Synthetic dataset · 24 incidents · 6 clusters</div>
          </div>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 border-b border-border" style={{ background: "color-mix(in oklab, var(--color-background) 80%, transparent)", backdropFilter: "blur(8px)" }}>
          <div className="flex items-center gap-4 px-4 md:px-8 h-14">
            <div className="md:hidden flex items-center gap-2">
              <Link to="/" className="text-muted-foreground"><ArrowLeft className="size-4" /></Link>
              <ShieldAlert className="size-5 text-primary" />
              <span className="font-display">Rug<span className="text-primary">DNA</span></span>
            </div>
            <div className="flex-1 max-w-xl mx-auto relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Search wallets, projects, incidents…"
                className="w-full pl-9 pr-3 h-9 rounded-md bg-surface-2/70 border border-border focus:outline-none text-sm font-mono"
                style={{ background: "color-mix(in oklab, var(--color-surface-2) 70%, transparent)" }} />
            </div>
            <span className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-primary animate-pulse" /> REFERENCE · NOMINAL
            </span>
          </div>
        </header>
        <main className="flex-1 min-w-0">{children ?? <Outlet />}</main>
        <footer className="border-t border-border px-8 py-4 text-xs text-muted-foreground flex justify-between">
          <div>RugDNA reference dataset · synthetic, illustrative only</div>
          <div className="font-mono">jackie/sentinel v0.1</div>
        </footer>
      </div>
    </div>
  );
}
