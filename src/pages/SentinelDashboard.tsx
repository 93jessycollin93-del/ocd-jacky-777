import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { SentinelLayout } from "@/sentinel/SentinelLayout";
import { StatusBadge } from "@/sentinel/components/StatusBadge";
import { ConfidenceBar } from "@/sentinel/components/ConfidenceBar";
import {
  INCIDENTS, STATS, chainBreakdown, lossOverTime, shortAddr,
  anomalySignals, trendingInvestigations, CLUSTERS,
} from "@/sentinel/lib/mockData";
import { ActivitySquare, AlertTriangle, DollarSign, Database, Eye, TrendingUp, ArrowUpRight, Zap, Radio, Flame, GitMerge } from "lucide-react";

function fmtUsd(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n}`;
}

function Stat({ icon: Icon, label, value, sub, accent = "primary" }: { icon: any; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="relative rounded-lg border border-border bg-card p-5 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, var(--color-${accent}), transparent)` }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">{label}</div>
          <div className="font-display text-3xl mt-2">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className="p-2 rounded-md border border-border" style={{ color: `var(--color-${accent})` }}><Icon className="size-4" /></div>
      </div>
    </div>
  );
}

export default function SentinelDashboard() {
  const chains = chainBreakdown();
  const series = lossOverTime();
  const topRisk = [...INCIDENTS].sort((a, b) => b.riskScore - a.riskScore).slice(0, 6);
  const trending = trendingInvestigations();
  const anomalies = anomalySignals();
  const topClusters = [...CLUSTERS]
    .map((c) => ({ ...c, loss: c.incidents.reduce((a, b) => a + b.loss, 0) }))
    .sort((a, b) => b.loss - a.loss).slice(0, 5);

  return (
    <SentinelLayout>
      <div className="px-4 md:px-8 py-6 md:py-8">
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface-1 grid-bg p-6 md:p-8 mb-6">
          <div className="absolute inset-0 scanline opacity-30 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-mono mb-3 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" /> Intelligence Reference Console
              </div>
              <h1 className="font-display text-3xl md:text-5xl tracking-tight leading-tight max-w-2xl">
                Transparent forensic intelligence for <span className="text-primary">crypto crime</span>.
              </h1>
              <p className="mt-3 text-muted-foreground max-w-xl text-sm md:text-base">
                Explainable risk scoring, causal reconstruction, wallet clustering and graph-based discovery across 8 chains.
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/sentinel/board" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-sm font-medium">
                Open board <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Stat icon={Database} label="Incidents tracked" value={STATS.totalIncidents.toString()} sub="across 8 chains" />
          <Stat icon={DollarSign} label="Estimated losses" value={fmtUsd(STATS.totalLoss)} sub="cumulative" accent="danger" />
          <Stat icon={AlertTriangle} label="Confirmed scams" value={STATS.confirmedScams.toString()} accent="warning" />
          <Stat icon={Eye} label="Active investigations" value={STATS.underInvestigation.toString()} accent="info" />
          <Stat icon={GitMerge} label="Clusters detected" value={STATS.clusters.toString()} sub={`avg risk ${STATS.avgRisk}`} accent="chart-5" />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Losses Over Time</div>
                <div className="font-display text-xl">Monthly drained capital</div>
              </div>
              <TrendingUp className="size-4 text-primary" />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-danger)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--color-danger)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-grid)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => fmtUsd(v)} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => fmtUsd(v)} />
                <Area type="monotone" dataKey="loss" stroke="var(--color-danger)" strokeWidth={2} fill="url(#lossGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Chain Breakdown</div>
            <div className="font-display text-xl mb-3">Most active chains</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={chains} dataKey="loss" nameKey="chain" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {chains.map((_, i) => (<Cell key={i} fill={`var(--color-chart-${(i % 5) + 1})`} stroke="var(--color-background)" />))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => fmtUsd(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Realtime</div>
              <div className="font-display text-lg flex items-center gap-2">Anomaly Signals <Radio className="size-4 text-danger animate-pulse" /></div>
            </div>
            <ul className="divide-y divide-border">
              {anomalies.map((a, i) => {
                const color = a.sev === "critical" ? "var(--color-danger)" : a.sev === "high" ? "var(--color-warning)" : "var(--color-info)";
                return (
                  <li key={i} className="px-5 py-3 flex items-start gap-3">
                    <span className="size-2 mt-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                    <div className="flex-1">
                      <div className="text-xs leading-relaxed">{a.msg}</div>
                      <div className="text-[10px] font-mono text-muted-foreground mt-0.5 uppercase tracking-wider">{a.sev} · {a.t}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Community</div>
              <div className="font-display text-lg flex items-center gap-2">Trending Investigations <Flame className="size-4 text-warning" /></div>
            </div>
            <ul className="divide-y divide-border">
              {trending.map((inc) => (
                <li key={inc.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm truncate">{inc.project}</div>
                    <div className="text-[11px] font-mono text-success">+{inc.credibility.upvotes - inc.credibility.downvotes}</div>
                  </div>
                  <div className="mt-1"><ConfidenceBar value={inc.overallConfidence} label="CONFIDENCE" /></div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Network</div>
                <div className="font-display text-lg flex items-center gap-2">Top Clusters <GitMerge className="size-4 text-primary" /></div>
              </div>
              <Link to="/sentinel/board" className="text-xs text-primary hover:underline">Open board</Link>
            </div>
            <ul className="divide-y divide-border">
              {topClusters.map((c) => (
                <li key={c.id} className="px-5 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono text-primary">{c.id}</span>
                    <span className="font-mono">{fmtUsd(c.loss)}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{c.incidents.length} incidents · {c.wallets.length} wallets</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Watchlist</div>
                <div className="font-display text-lg flex items-center gap-2">Highest Risk Projects <Zap className="size-4 text-warning" /></div>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {topRisk.map((inc) => (
                <li key={inc.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="font-mono text-xs w-9 h-9 rounded-md grid place-items-center border" style={{
                    color: "var(--color-danger)",
                    borderColor: "color-mix(in oklab, var(--color-danger) 40%, transparent)",
                    background: "color-mix(in oklab, var(--color-danger) 10%, transparent)",
                  }}>{inc.riskScore}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{inc.project} <span className="text-muted-foreground">· {inc.symbol}</span></div>
                    <div className="text-[11px] text-muted-foreground font-mono">{inc.chain} · {fmtUsd(inc.loss)} · {inc.clusterId}</div>
                  </div>
                  <StatusBadge status={inc.status} />
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Feed</div>
                <div className="font-display text-lg flex items-center gap-2">Recent Investigations <ActivitySquare className="size-4 text-primary" /></div>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {[...INCIDENTS].sort((a, b) => b.rugDate.localeCompare(a.rugDate)).slice(0, 8).map((inc) => (
                <li key={inc.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm truncate">{inc.project}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{inc.rugDate}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">{shortAddr(inc.wallets[0])} · {inc.chain} · {fmtUsd(inc.loss)} · {inc.incidentType}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SentinelLayout>
  );
}
