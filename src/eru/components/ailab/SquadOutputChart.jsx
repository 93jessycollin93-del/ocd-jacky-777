import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { BarChart3 } from 'lucide-react';

function parseOutputToChartData(content = '') {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  const points = [];

  lines.forEach((line) => {
    const clean = line.replace(/^[-*•]\s*/, '');
    const colonMatch = clean.match(/^([^:]+):\s*(-?\d+(?:\.\d+)?)(%?)$/);
    if (colonMatch) {
      points.push({ label: colonMatch[1].trim(), value: Number(colonMatch[2]), unit: colonMatch[3] || '' });
      return;
    }

    const pairMatch = clean.match(/^(.+?)\s+(-?\d+(?:\.\d+)?)(%?)$/);
    if (pairMatch) {
      points.push({ label: pairMatch[1].trim(), value: Number(pairMatch[2]), unit: pairMatch[3] || '' });
    }
  });

  return points.slice(0, 12);
}

function pickChartType(data) {
  const labels = data.map((item) => item.label.toLowerCase());
  const looksSequential = labels.every((label, index) => {
    const numeric = Number(label);
    if (!Number.isNaN(numeric)) return true;
    return /day|week|month|q[1-4]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|year|phase|step/.test(label) || index < data.length;
  });
  return looksSequential ? 'line' : 'bar';
}

export default function SquadOutputChart({ content, title = 'Auto chart' }) {
  const parsed = useMemo(() => parseOutputToChartData(content), [content]);

  if (parsed.length < 2) return null;

  const chartType = pickChartType(parsed);
  const unit = parsed[0]?.unit || '';

  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold text-foreground">{title}</p>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={parsed}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <Tooltip formatter={(value) => [`${value}${unit}`, 'Value']} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot />
            </LineChart>
          ) : (
            <BarChart data={parsed}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-15} textAnchor="end" height={46} interval={0} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <Tooltip formatter={(value) => [`${value}${unit}`, 'Value']} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}