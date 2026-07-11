import { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCcw, Star, Users2 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

const PAIR_COLORS = ['#14b8a6', '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6'];

function dayLabel(value, index) {
  if (!value) return `Run ${index + 1}`;
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function parseDetailBlock(text, startLabel, endLabel) {
  if (!text) return '';
  const start = text.indexOf(startLabel);
  if (start === -1) return '';
  const from = start + startLabel.length;
  const end = endLabel ? text.indexOf(endLabel, from) : -1;
  return (end === -1 ? text.slice(from) : text.slice(from, end)).trim();
}

function parseDelegationPairs(planText) {
  if (!planText) return [];
  return planText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(':')[0]?.trim())
    .filter(Boolean);
}

function parseRecoveryCount(analysisText) {
  if (!analysisText) return 0;
  const matches = analysisText.match(/recovered|retry failed|retry used/gi);
  return matches ? matches.length : 0;
}

export default function SwarmCycleAnalyticsDashboard() {
  const [improvements, setImprovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const rows = await base44.entities.BotImprovement.list('-created_date', 80).catch(() => []);
      setImprovements(rows || []);
      setLoading(false);
    };
    load();
  }, []);

  const analytics = useMemo(() => {
    const swarmCycles = improvements
      .filter((item) => item.plan || item.execution || item.analysis)
      .slice()
      .reverse();

    const scoreTrend = swarmCycles.map((item, index) => ({
      name: dayLabel(item.created_date, index),
      score: Number(item.score || 0),
    }));

    const retryTrend = swarmCycles.map((item, index) => ({
      name: dayLabel(item.created_date, index),
      retries: parseRecoveryCount(item.analysis),
    }));

    const pairMap = {};
    swarmCycles.forEach((item) => {
      const delegationText = parseDetailBlock(item.execution || '', 'Delegations:', 'Findings:') || item.plan || '';
      const specialists = parseDelegationPairs(delegationText);
      for (let i = 0; i < specialists.length; i += 1) {
        for (let j = i + 1; j < specialists.length; j += 1) {
          const pair = [specialists[i], specialists[j]].sort().join(' + ');
          if (!pairMap[pair]) {
            pairMap[pair] = { name: pair, count: 0, totalScore: 0, avgScore: 0 };
          }
          pairMap[pair].count += 1;
          pairMap[pair].totalScore += Number(item.score || 0);
          pairMap[pair].avgScore = Number((pairMap[pair].totalScore / pairMap[pair].count).toFixed(1));
        }
      }
    });

    const pairings = Object.values(pairMap)
      .sort((a, b) => (b.avgScore - a.avgScore) || (b.count - a.count))
      .slice(0, 6);

    const averageScore = scoreTrend.length
      ? Number((scoreTrend.reduce((sum, item) => sum + item.score, 0) / scoreTrend.length).toFixed(1))
      : 0;

    const totalRetries = retryTrend.reduce((sum, item) => sum + item.retries, 0);

    return {
      totalCycles: swarmCycles.length,
      averageScore,
      totalRetries,
      scoreTrend,
      retryTrend,
      pairings,
    };
  }, [improvements]);

  if (loading) {
    return <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Swarm cycle analytics</p>
          <p className="text-[11px] text-muted-foreground">Track average completion scores, self-healing retry behavior, and the specialist pairings producing the best outcomes.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-muted-foreground"><Activity className="h-4 w-4" /><span className="text-[10px] uppercase">Swarm cycles</span></div>
          <p className="mt-2 text-xl font-bold text-foreground">{analytics.totalCycles}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-muted-foreground"><Star className="h-4 w-4" /><span className="text-[10px] uppercase">Avg score</span></div>
          <p className="mt-2 text-xl font-bold text-yellow-400">{analytics.averageScore}/10</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-muted-foreground"><RefreshCcw className="h-4 w-4" /><span className="text-[10px] uppercase">Self-heal retries</span></div>
          <p className="mt-2 text-xl font-bold text-orange-400">{analytics.totalRetries}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-2 text-muted-foreground"><Users2 className="h-4 w-4" /><span className="text-[10px] uppercase">Top pairings</span></div>
          <p className="mt-2 text-xl font-bold text-primary">{analytics.pairings.length}</p>
        </div>
      </div>

      {analytics.totalCycles === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background p-5 text-center text-sm text-muted-foreground">
          No swarm cycle data yet.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="mb-3 text-xs font-semibold text-foreground">Average completion score trend</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analytics.scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--chart-3))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <p className="mb-3 text-xs font-semibold text-foreground">Self-healing retry frequency</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.retryTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="retries" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-background p-4 xl:col-span-2">
            <p className="mb-3 text-xs font-semibold text-foreground">Most effective specialist bot pairings</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analytics.pairings} layout="vertical" margin={{ left: 24, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(value, key, item) => key === 'avgScore' ? [`${value}/10`, 'Avg score'] : [value, 'Runs together']} />
                <Bar dataKey="avgScore" radius={[0, 6, 6, 0]}>
                  {analytics.pairings.map((entry, index) => <Cell key={entry.name} fill={PAIR_COLORS[index % PAIR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {analytics.pairings.map((pair) => (
                <div key={pair.name} className="rounded-xl border border-border bg-card p-3">
                  <p className="text-xs font-semibold text-foreground">{pair.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Avg score {pair.avgScore}/10 · {pair.count} shared runs</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}