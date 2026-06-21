import { useMemo, useState } from 'react';
import { BarChart3, Activity, ShieldAlert, Sigma } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, CartesianGrid, ZAxis } from 'recharts';

const COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#fb7185'];

function buildSeries(asset, index) {
  const base = Number(asset.price || 0);
  const change = Number(asset.change || 0);
  return [0, 1, 2, 3, 4, 5].map((step) => {
    const drift = (change / 24) * step;
    const wave = Math.sin((step + 1) * (index + 1)) * Math.max(Math.abs(change) * 0.18, 0.35);
    const normalized = 100 + drift + wave;
    return {
      step: ['6h', '12h', '1d', '2d', '5d', '1w'][step],
      value: Number(normalized.toFixed(2)),
    };
  });
}

function correlationFromChange(a, b) {
  const spread = Math.abs((a.change || 0) - (b.change || 0));
  return Math.max(-1, Math.min(1, 1 - spread / 20));
}

export default function AssetComparisonDashboard({ prices }) {
  const [selectedSymbols, setSelectedSymbols] = useState(['BTC', 'ETH', 'SOL']);

  const available = prices.slice(0, 10);
  const selectedAssets = useMemo(() => available.filter((item) => selectedSymbols.includes(item.symbol)), [available, selectedSymbols]);

  const comparisonRows = useMemo(() => selectedAssets.map((asset, index) => {
    const volatility = Math.abs(asset.change || 0) * 1.35;
    const drawdownRisk = Math.max(4, volatility * 0.9 + index * 1.8);
    const stability = Math.max(10, 100 - volatility * 8);
    return {
      ...asset,
      volatility: Number(volatility.toFixed(2)),
      drawdownRisk: Number(drawdownRisk.toFixed(2)),
      stability: Number(stability.toFixed(2)),
      performanceScore: Number((100 + (asset.change || 0) * 2).toFixed(2)),
      series: buildSeries(asset, index),
    };
  }), [selectedAssets]);

  const volatilityData = comparisonRows.map((item) => ({
    symbol: item.symbol,
    volatility: item.volatility,
    risk: item.drawdownRisk,
  }));

  const radarData = comparisonRows.map((item) => ({
    asset: item.symbol,
    Performance: item.performanceScore,
    Stability: item.stability,
    Volatility: Math.min(100, item.volatility * 8),
    Risk: Math.min(100, item.drawdownRisk * 6),
  }));

  const correlationData = [];
  comparisonRows.forEach((left, leftIndex) => {
    comparisonRows.forEach((right, rightIndex) => {
      if (leftIndex >= rightIndex) return;
      correlationData.push({
        x: left.symbol,
        y: right.symbol,
        correlation: Number(correlationFromChange(left, right).toFixed(2)),
        size: Math.round(Math.abs(correlationFromChange(left, right)) * 100),
      });
    });
  });

  const toggleAsset = (symbol) => {
    setSelectedSymbols((prev) => prev.includes(symbol)
      ? prev.filter((item) => item !== symbol)
      : prev.length >= 4 ? [...prev.slice(1), symbol] : [...prev, symbol]);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sigma className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Asset Comparison Dashboard</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">Compare up to 4 assets side-by-side across performance, volatility, risk, and correlation.</p>
        </div>
        <div className="text-[10px] text-muted-foreground">Interactive</div>
      </div>

      <div className="flex flex-wrap gap-2">
        {available.map((asset) => {
          const active = selectedSymbols.includes(asset.symbol);
          return (
            <button
              key={asset.symbol}
              onClick={() => toggleAsset(asset.symbol)}
              className={`rounded-full px-3 py-1.5 text-[11px] border transition-all ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'}`}
            >
              {asset.symbol}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {comparisonRows.map((asset, index) => (
          <div key={asset.symbol} className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{asset.symbol}</p>
              <span className={`text-xs font-medium ${asset.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>{asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%</span>
            </div>
            <p className="text-lg font-mono">${asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-background px-2 py-2">
                <p className="text-muted-foreground">Volatility</p>
                <p className="font-semibold">{asset.volatility}%</p>
              </div>
              <div className="rounded-lg bg-background px-2 py-2">
                <p className="text-muted-foreground">Risk</p>
                <p className="font-semibold">{asset.drawdownRisk}</p>
              </div>
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={asset.series}>
                  <Tooltip contentStyle={{ background: 'hsl(230 22% 9%)', border: '1px solid hsl(230 18% 16%)', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="value" fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-secondary/30 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold">Volatility vs Risk</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volatilityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="symbol" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(230 22% 9%)', border: '1px solid hsl(230 18% 16%)', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="volatility" fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="risk" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/30 p-3">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold">Relative profile</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(148,163,184,0.18)" />
                <PolarAngleAxis dataKey="asset" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar name="Score" dataKey="Performance" stroke="#34d399" fill="#34d399" fillOpacity={0.15} />
                <Radar name="Risk" dataKey="Risk" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} />
                <Tooltip contentStyle={{ background: 'hsl(230 22% 9%)', border: '1px solid hsl(230 18% 16%)', borderRadius: 8, fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/30 p-3">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold">Correlation map</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis type="category" dataKey="x" name="Asset A" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis type="category" dataKey="y" name="Asset B" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <ZAxis type="number" dataKey="size" range={[80, 600]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => [value, name === 'correlation' ? 'Correlation' : name]} contentStyle={{ background: 'hsl(230 22% 9%)', border: '1px solid hsl(230 18% 16%)', borderRadius: 8, fontSize: 11 }} />
              <Scatter data={correlationData} fill="#60a5fa" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}