import { useMemo, useState } from "react";
import { SentinelLayout } from "@/sentinel/SentinelLayout";
import { RelationshipGraph, buildFullGraph } from "@/sentinel/components/RelationshipGraph";
import { Network, Circle, Route as RouteIcon, Layers } from "lucide-react";
import { INCIDENTS, CLUSTERS, getIncident, getWallet, tracePath } from "@/sentinel/lib/mockData";

export default function SentinelBoard() {
  const [clusterFilter, setClusterFilter] = useState<string>("All");
  const [colorByCluster, setColorByCluster] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [pathFrom, setPathFrom] = useState<string>("");
  const [pathTo, setPathTo] = useState<string>("");
  const [path, setPath] = useState<string[] | null>(null);

  const { nodes, edges } = useMemo(
    () => buildFullGraph(clusterFilter === "All" ? { limit: 14 } : { cluster: clusterFilter }),
    [clusterFilter],
  );

  const detail = useMemo(() => {
    if (!selected) return null;
    if (selected.startsWith("i:")) {
      const inc = getIncident(selected.slice(2));
      return inc ? { kind: "incident" as const, inc } : null;
    }
    if (selected.startsWith("w:")) {
      const w = getWallet(selected.slice(2));
      return w ? { kind: "wallet" as const, w } : null;
    }
    return { kind: "other" as const, label: selected };
  }, [selected]);

  return (
    <SentinelLayout>
      <div className="px-4 md:px-8 py-6">
        <div className="mb-5 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono">Forensic Module</div>
            <h1 className="font-display text-3xl tracking-tight flex items-center gap-2">
              <Network className="size-6 text-primary" /> Investigation Board
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Map of synthetic scam infrastructure with cluster detection and BFS path tracing — reference dataset only.
            </p>
          </div>
          <Legend />
        </div>

        <div className="rounded-lg border border-border bg-card p-3 mb-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs">
            <Layers className="size-3.5 text-primary" />
            <span className="text-muted-foreground font-mono uppercase tracking-wider">Cluster</span>
            <select value={clusterFilter} onChange={(e) => setClusterFilter(e.target.value)}
              className="h-8 px-2 rounded bg-surface-2 border border-border text-xs font-mono">
              <option>All</option>
              {CLUSTERS.map((c) => <option key={c.id}>{c.id}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={colorByCluster} onChange={(e) => setColorByCluster(e.target.checked)} />
            Color by cluster
          </label>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2 text-xs">
            <RouteIcon className="size-3.5 text-warning" />
            <span className="text-muted-foreground font-mono uppercase tracking-wider">Trace path</span>
            <select value={pathFrom} onChange={(e) => setPathFrom(e.target.value)} className="h-8 px-2 rounded bg-surface-2 border border-border text-xs font-mono max-w-[160px]">
              <option value="">From…</option>
              {nodes.map((n) => <option key={n.id} value={n.id}>{n.type[0].toUpperCase()}·{n.label}</option>)}
            </select>
            <select value={pathTo} onChange={(e) => setPathTo(e.target.value)} className="h-8 px-2 rounded bg-surface-2 border border-border text-xs font-mono max-w-[160px]">
              <option value="">To…</option>
              {nodes.map((n) => <option key={n.id} value={n.id}>{n.type[0].toUpperCase()}·{n.label}</option>)}
            </select>
            <button onClick={() => pathFrom && pathTo && setPath(tracePath(pathFrom, pathTo))} className="h-8 px-3 rounded bg-primary text-xs font-medium">Trace</button>
            {path && <span className="text-[10px] font-mono text-warning">{path.length > 0 ? `${path.length - 1} hops` : "no path"}</span>}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          <RelationshipGraph nodes={nodes} edges={edges} height={620} onSelect={setSelected} highlightPath={path ?? undefined} colorByCluster={colorByCluster} />
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4 min-h-[220px]">
              <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-2">Inspector</div>
              {!detail && <div className="text-sm text-muted-foreground">Click a node on the board to view details.</div>}
              {detail?.kind === "incident" && (
                <div>
                  <div className="font-display text-lg">{detail.inc.project}</div>
                  <div className="text-xs text-muted-foreground font-mono">{detail.inc.symbol} · {detail.inc.chain} · {detail.inc.clusterId}</div>
                  <p className="text-xs mt-2 leading-relaxed text-muted-foreground line-clamp-4">{detail.inc.description}</p>
                </div>
              )}
              {detail?.kind === "wallet" && (
                <div>
                  <div className="text-xs font-mono break-all">{detail.w.address}</div>
                  <div className="text-xs text-muted-foreground mt-2">{detail.w.clusterId} · Rep {detail.w.reputation} · {detail.w.incidents.length} incident(s)</div>
                </div>
              )}
              {detail?.kind === "other" && <div className="text-xs">{detail.label}</div>}
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-2">Network Stats</div>
              <ul className="text-xs space-y-1 font-mono">
                <li>Nodes: <span className="text-primary">{nodes.length}</span></li>
                <li>Edges: <span className="text-primary">{edges.length}</span></li>
                <li>Clusters: <span className="text-primary">{CLUSTERS.length}</span></li>
                <li>Incidents mapped: <span className="text-primary">{clusterFilter === "All" ? Math.min(14, INCIDENTS.length) : CLUSTERS.find((c) => c.id === clusterFilter)?.incidents.length ?? 0}</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SentinelLayout>
  );
}

function Legend() {
  const items = [
    { label: "Incident", color: "var(--color-danger)" },
    { label: "Wallet", color: "var(--color-primary)" },
    { label: "Website", color: "var(--color-info)" },
    { label: "Social", color: "var(--color-warning)" },
    { label: "Influencer", color: "var(--color-chart-5)" },
  ];
  return (
    <div className="flex items-center gap-3 text-xs flex-wrap">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Circle className="size-2.5" style={{ fill: i.color, color: i.color }} /> {i.label}
        </span>
      ))}
    </div>
  );
}
