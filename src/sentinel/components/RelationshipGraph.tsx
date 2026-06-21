import { useMemo, useRef, useState, useEffect } from "react";
import { INCIDENTS, WALLETS, shortAddr } from "@/sentinel/lib/mockData";

export interface GraphNode {
  id: string;
  label: string;
  type: "incident" | "wallet" | "website" | "social" | "influencer";
  group?: string;
  cluster?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}
export interface GraphEdge {
  source: string;
  target: string;
  kind?: "deploys" | "links" | "promotes" | "hosts" | "owns";
}

export function buildFullGraph(opts?: { cluster?: string; limit?: number }) {
  const limit = opts?.limit ?? 14;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const list = opts?.cluster
    ? INCIDENTS.filter((i) => i.clusterId === opts.cluster)
    : INCIDENTS.slice(0, limit);
  list.forEach((inc) => {
    const incId = "i:" + inc.id;
    nodes.push({ id: incId, label: inc.symbol, type: "incident", group: inc.chain, cluster: inc.clusterId });
    inc.wallets.forEach((w) => {
      const wid = "w:" + w;
      if (!seen.has(wid)) {
        nodes.push({ id: wid, label: shortAddr(w), type: "wallet", group: inc.chain, cluster: inc.clusterId });
        seen.add(wid);
      }
      edges.push({ source: incId, target: wid, kind: "deploys" });
    });
    if (inc.website) {
      const sid = "s:" + inc.id;
      nodes.push({ id: sid, label: inc.website.replace("https://", ""), type: "website", cluster: inc.clusterId });
      edges.push({ source: incId, target: sid, kind: "hosts" });
    }
    inc.socials.forEach((s, idx) => {
      const sid = "soc:" + inc.id + idx;
      nodes.push({ id: sid, label: s.platform, type: "social", cluster: inc.clusterId });
      edges.push({ source: incId, target: sid, kind: "hosts" });
    });
    inc.influencers.forEach((inf, idx) => {
      const id = "inf:" + inc.id + idx;
      nodes.push({ id, label: "@" + inf.handle, type: "influencer", cluster: inc.clusterId });
      edges.push({ source: id, target: incId, kind: "promotes" });
    });
  });
  WALLETS.forEach((w) => {
    w.connected.forEach((c) => {
      if (seen.has("w:" + w.address) && seen.has("w:" + c)) {
        edges.push({ source: "w:" + w.address, target: "w:" + c, kind: "links" });
      }
    });
  });
  return { nodes, edges };
}

const COLORS: Record<GraphNode["type"], string> = {
  incident: "var(--color-danger)",
  wallet: "var(--color-primary)",
  website: "var(--color-info)",
  social: "var(--color-warning)",
  influencer: "var(--color-chart-5)",
};

const CLUSTER_HUES = [150, 220, 80, 300, 25, 195, 340, 110];
function clusterColor(c?: string) {
  if (!c) return "var(--color-grid)";
  const n = parseInt(c.replace(/\D/g, ""), 10) || 0;
  return `oklch(0.72 0.18 ${CLUSTER_HUES[n % CLUSTER_HUES.length]})`;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  height?: number;
  onSelect?: (id: string) => void;
  highlightPath?: string[];
  colorByCluster?: boolean;
}

export function RelationshipGraph({ nodes: inNodes, edges, height = 560, onSelect, highlightPath, colorByCluster }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(900);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.max(320, e.contentRect.width));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const nodes = useMemo<GraphNode[]>(() => {
    const N: GraphNode[] = inNodes.map((n, i) => ({
      ...n,
      x: width / 2 + Math.cos((i / inNodes.length) * Math.PI * 2) * 180,
      y: height / 2 + Math.sin((i / inNodes.length) * Math.PI * 2) * 180,
      vx: 0, vy: 0,
    }));
    const idx = new Map(N.map((n, i) => [n.id, i] as const));
    const E = edges
      .map((e) => ({ s: idx.get(e.source), t: idx.get(e.target) }))
      .filter((e): e is { s: number; t: number } => e.s != null && e.t != null);
    const cx = width / 2, cy = height / 2;
    const linkDist = 70, repulsion = 1400;
    for (let iter = 0; iter < 220; iter++) {
      for (let i = 0; i < N.length; i++) {
        for (let j = i + 1; j < N.length; j++) {
          const a = N[i], b = N[j];
          let dx = a.x! - b.x!, dy = a.y! - b.y!;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) d2 = 1;
          const f = repulsion / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f, fy = (dy / d) * f;
          a.vx! += fx; a.vy! += fy; b.vx! -= fx; b.vy! -= fy;
        }
      }
      for (const e of E) {
        const a = N[e.s], b = N[e.t];
        const dx = b.x! - a.x!, dy = b.y! - a.y!;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - linkDist) * 0.04;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        a.vx! += fx; a.vy! += fy; b.vx! -= fx; b.vy! -= fy;
      }
      for (const n of N) {
        n.vx! += (cx - n.x!) * 0.003; n.vy! += (cy - n.y!) * 0.003;
        n.vx! *= 0.82; n.vy! *= 0.82;
        n.x! += n.vx!; n.y! += n.vy!;
      }
    }
    return N;
  }, [inNodes, edges, width, height]);

  const posMap = new Map(nodes.map((n) => [n.id, n] as const));
  const pathSet = new Set(highlightPath ?? []);
  const pathEdges = new Set<string>();
  if (highlightPath) for (let i = 0; i < highlightPath.length - 1; i++) {
    pathEdges.add(highlightPath[i] + ">" + highlightPath[i + 1]);
    pathEdges.add(highlightPath[i + 1] + ">" + highlightPath[i]);
  }

  return (
    <svg ref={ref} width="100%" height={height} className="rounded-md border border-border bg-surface-1/40 grid-bg">
      {edges.map((e, i) => {
        const a = posMap.get(e.source), b = posMap.get(e.target);
        if (!a || !b) return null;
        const onPath = pathEdges.has(e.source + ">" + e.target);
        const active = onPath || (hover != null && (hover === e.source || hover === e.target));
        const color = onPath ? "var(--color-warning)" : active ? "var(--color-primary)" : "var(--color-border)";
        return (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={color} strokeOpacity={onPath ? 1 : active ? 0.9 : 0.45}
            strokeWidth={onPath ? 2 : active ? 1.5 : 1} />
        );
      })}
      {nodes.map((n) => {
        const r = n.type === "incident" ? 9 : n.type === "wallet" ? 6 : n.type === "influencer" ? 6 : 4;
        const color = colorByCluster ? clusterColor(n.cluster) : COLORS[n.type];
        const onPath = pathSet.has(n.id);
        return (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}
            onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
            onClick={() => onSelect?.(n.id)} style={{ cursor: "pointer" }}>
            <circle r={r + (onPath ? 6 : 4)} fill={color} opacity={onPath ? 0.35 : 0.15} />
            <circle r={r} fill={color} stroke={onPath ? "var(--color-warning)" : "var(--color-background)"} strokeWidth={onPath ? 2 : 1.5}
              style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
            <text y={-r - 6} textAnchor="middle" className="fill-foreground font-mono" fontSize={10}>
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
