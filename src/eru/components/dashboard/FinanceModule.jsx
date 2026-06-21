import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { DollarSign, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NOW = new Date().getMonth();

const SPEND_DATA = MONTHS.slice(0, NOW + 1).map((m, i) => ({
  month: m,
  spend: Math.round(800 + Math.random() * 1200 + i * 80),
  budget: 2500,
  burn: Math.round(600 + i * 120 + Math.random() * 300),
}));

// AI platform pricing per 1M tokens (input) in USD - approximate 2025 rates
const AI_PLATFORMS = [
  { id: 'claude_opus', name: 'Claude Opus 4', color: '#a78bfa', company: 'Anthropic', input: 15, output: 75, category: 'Premium' },
  { id: 'claude_sonnet', name: 'Claude Sonnet 4', color: '#c4b5fd', company: 'Anthropic', input: 3, output: 15, category: 'Balanced' },
  { id: 'gpt4o', name: 'GPT-4o', color: '#34d399', company: 'OpenAI', input: 5, output: 15, category: 'Premium' },
  { id: 'gpt4o_mini', name: 'GPT-4o Mini', color: '#6ee7b7', company: 'OpenAI', input: 0.15, output: 0.6, category: 'Fast' },
  { id: 'gpt5', name: 'GPT-5', color: '#10b981', company: 'OpenAI', input: 10, output: 40, category: 'Premium' },
  { id: 'grok3', name: 'Grok 3', color: '#f59e0b', company: 'xAI', input: 3, output: 15, category: 'Balanced' },
  { id: 'grok3_mini', name: 'Grok 3 Mini', color: '#fcd34d', company: 'xAI', input: 0.3, output: 0.5, category: 'Fast' },
  { id: 'gemini_pro', name: 'Gemini 2.5 Pro', color: '#60a5fa', company: 'Google', input: 1.25, output: 10, category: 'Balanced' },
  { id: 'gemini_flash', name: 'Gemini 2.5 Flash', color: '#93c5fd', company: 'Google', input: 0.075, output: 0.3, category: 'Fast' },
  { id: 'llama4', name: 'Llama 4 Maverick', color: '#fb7185', company: 'Meta', input: 0.19, output: 0.85, category: 'Open' },
  { id: 'deepseek', name: 'DeepSeek V3', color: '#f97316', company: 'DeepSeek', input: 0.27, output: 1.1, category: 'Open' },
  { id: 'mistral', name: 'Mistral Large', color: '#e879f9', company: 'Mistral', input: 2, output: 6, category: 'Balanced' },
  // Vibe coding tools
  { id: 'cursor', name: 'Cursor Pro', color: '#38bdf8', company: 'Vibe Coding', input: 20, output: 20, category: 'Vibe Coding', monthly: 20 },
  { id: 'base44', name: 'Base44', color: '#00e676', company: 'Vibe Coding', input: 0, output: 0, category: 'Vibe Coding', monthly: 29 },
  { id: 'lovable', name: 'Lovable', color: '#f472b6', company: 'Vibe Coding', input: 0, output: 0, category: 'Vibe Coding', monthly: 25 },
  { id: 'bolt', name: 'Bolt.new', color: '#818cf8', company: 'Vibe Coding', input: 0, output: 0, category: 'Vibe Coding', monthly: 20 },
  { id: 'windsurf', name: 'Windsurf', color: '#22d3ee', company: 'Vibe Coding', input: 0, output: 0, category: 'Vibe Coding', monthly: 15 },
  { id: 'github_copilot', name: 'GitHub Copilot', color: '#94a3b8', company: 'Vibe Coding', input: 0, output: 0, category: 'Vibe Coding', monthly: 10 },
];

// Build token cost comparison chart data (cost for 1M tokens input across platforms, excluding vibe coding)
const TOKEN_CHART_DATA = AI_PLATFORMS
  .filter(p => p.category !== 'Vibe Coding')
  .sort((a, b) => a.input - b.input)
  .map(p => ({ name: p.name.split(' ').slice(-2).join(' '), input: p.input, output: p.output, color: p.color }));

const VIBE_DATA = AI_PLATFORMS
  .filter(p => p.category === 'Vibe Coding')
  .map(p => ({ name: p.name, monthly: p.monthly, color: p.color }));

// Monthly AI spend simulation
const AI_SPEND_DATA = MONTHS.slice(0, NOW + 1).map((m, i) => {
  const base = { month: m };
  AI_PLATFORMS.slice(0, 6).forEach(p => {
    base[p.id] = Math.round(Math.random() * 200 + i * 10);
  });
  return base;
});

const BUDGET = 2500;
const ALERT_THRESHOLD = 0.8;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-2.5 py-2 text-xs shadow-xl max-w-[180px]">
      {label && <p className="text-muted-foreground mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="truncate">
          {p.name}: <span className="font-semibold">${typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

const TABS = ['Overview', 'Burn Rate', 'AI Models', 'Vibe Coding'];

export default function FinanceModule() {
  const [tab, setTab] = useState('Overview');
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const currentSpend = SPEND_DATA[SPEND_DATA.length - 1]?.spend || 0;
  const burnRate = SPEND_DATA[SPEND_DATA.length - 1]?.burn || 0;
  const budgetUsed = (currentSpend / BUDGET) * 100;
  const isAlert = budgetUsed >= ALERT_THRESHOLD * 100;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/60">
        <div className="flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5 text-primary" />
          <p className="text-xs font-semibold text-primary">Finance Module</p>
          {isAlert && !alertDismissed && (
            <span className="flex items-center gap-1 text-[9px] bg-red-400/10 text-red-400 border border-red-400/20 px-1.5 py-0.5 rounded-full animate-pulse">
              <AlertTriangle className="w-2.5 h-2.5" /> Budget Alert
            </span>
          )}
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!expanded && (
        <div className="px-3 py-2 flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Spend: <span className="text-foreground font-semibold">${currentSpend.toLocaleString()}</span></span>
          <span className="text-muted-foreground">Budget: <span className="text-foreground font-semibold">${BUDGET.toLocaleString()}</span></span>
          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(budgetUsed, 100)}%`, background: isAlert ? 'hsl(350,100%,60%)' : 'hsl(160,100%,45%)' }} />
          </div>
          <span style={{ color: isAlert ? 'hsl(350,100%,60%)' : 'hsl(160,100%,45%)' }} className="font-semibold">{budgetUsed.toFixed(0)}%</span>
        </div>
      )}

      {expanded && (
        <>
          {/* Alert banner */}
          {isAlert && !alertDismissed && (
            <div className="mx-3 mt-3 flex items-center gap-2 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400 flex-1">Budget {budgetUsed.toFixed(0)}% used — exceeds {ALERT_THRESHOLD * 100}% threshold!</p>
              <button onClick={() => setAlertDismissed(true)} className="text-red-400/60 hover:text-red-400 text-xs">✕</button>
            </div>
          )}

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2 px-3 pt-3">
            {[
              { label: 'This Month', val: `$${currentSpend.toLocaleString()}`, sub: `of $${BUDGET.toLocaleString()} budget`, color: isAlert ? 'text-red-400' : 'text-primary' },
              { label: 'Burn Rate', val: `$${burnRate}/d`, sub: 'avg daily spend', color: 'text-yellow-400' },
              { label: 'Remaining', val: `$${Math.max(0, BUDGET - currentSpend).toLocaleString()}`, sub: `${(100 - budgetUsed).toFixed(0)}% left`, color: 'text-blue-400' },
            ].map(k => (
              <div key={k.label} className="bg-secondary/60 rounded-xl p-2 text-center">
                <p className={`text-sm font-bold ${k.color}`}>{k.val}</p>
                <p className="text-[9px] text-muted-foreground">{k.label}</p>
                <p className="text-[8px] text-muted-foreground/60 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Budget progress bar */}
          <div className="px-3 mt-2">
            <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
              <span>Budget utilization</span><span>{budgetUsed.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(budgetUsed, 100)}%`, background: budgetUsed >= 80 ? 'hsl(350,100%,60%)' : budgetUsed >= 60 ? 'hsl(45,100%,55%)' : 'hsl(160,100%,45%)' }} />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border mt-3 overflow-x-auto">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-[10px] font-medium whitespace-nowrap transition-colors border-b-2 ${tab === t ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="px-3 py-3">
            {/* OVERVIEW */}
            {tab === 'Overview' && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monthly Expenditure vs Budget</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={SPEND_DATA} barSize={14}>
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(220,12%,50%)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={BUDGET} stroke="hsl(350,100%,60%)" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: 'Budget', position: 'insideTopRight', fontSize: 8, fill: 'hsl(350,100%,60%)' }} />
                    <Bar dataKey="spend" name="Spend" radius={[4, 4, 0, 0]}>
                      {SPEND_DATA.map((d, i) => (
                        <Cell key={i} fill={d.spend >= BUDGET * ALERT_THRESHOLD ? 'hsl(350,100%,60%)' : 'hsl(160,100%,45%)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* BURN RATE */}
            {tab === 'Burn Rate' && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Daily Burn Rate Trend</p>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={SPEND_DATA}>
                    <defs>
                      <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(45,100%,55%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(45,100%,55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(220,12%,50%)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="burn" name="Burn/day" stroke="hsl(45,100%,55%)" fill="url(#burnGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="spend" name="Total Spend" stroke="hsl(160,100%,45%)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl px-3 py-2 text-xs text-yellow-400">
                  💡 At current burn rate of <strong>${burnRate}/day</strong>, projected monthly total: <strong>${Math.round(burnRate * 30).toLocaleString()}</strong>
                </div>
              </div>
            )}

            {/* AI MODELS */}
            {tab === 'AI Models' && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">API Cost per 1M Input Tokens (USD)</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={TOKEN_CHART_DATA} layout="vertical" barSize={8} margin={{ left: 60 }}>
                    <XAxis type="number" tick={{ fontSize: 8, fill: 'hsl(220,12%,50%)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fill: 'hsl(220,12%,50%)' }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="input" name="Input $/1M" radius={[0, 4, 4, 0]}>
                      {TOKEN_CHART_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {AI_PLATFORMS.filter(p => p.category !== 'Vibe Coding').map(p => (
                    <div key={p.id} className="flex items-center justify-between text-[9px] px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                        <span className="text-foreground font-medium">{p.name}</span>
                        <span className="text-muted-foreground">({p.company})</span>
                      </div>
                      <div className="flex gap-3 text-muted-foreground">
                        <span>In: <span style={{ color: p.color }} className="font-semibold">${p.input}</span></span>
                        <span>Out: <span style={{ color: p.color }} className="font-semibold">${p.output}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIBE CODING */}
            {tab === 'Vibe Coding' && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vibe Coding Platform Monthly Cost (USD)</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={VIBE_DATA} barSize={20}>
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(220,12%,50%)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="monthly" name="$/month" radius={[4, 4, 0, 0]}>
                      {VIBE_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {AI_PLATFORMS.filter(p => p.category === 'Vibe Coding').map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-secondary/60 rounded-lg px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                        <span className="text-xs font-medium text-foreground">{p.name}</span>
                        <span className="text-[9px] text-muted-foreground">{p.company}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: p.color }}>${p.monthly}/mo</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}