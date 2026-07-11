import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';

const MARKET_DATA = [
  { day: 'Mon', views: 120, clicks: 45, conversions: 8 },
  { day: 'Tue', views: 180, clicks: 72, conversions: 14 },
  { day: 'Wed', views: 95,  clicks: 31, conversions: 5  },
  { day: 'Thu', views: 240, clicks: 98, conversions: 22 },
  { day: 'Fri', views: 310, clicks: 134, conversions: 31 },
  { day: 'Sat', views: 280, clicks: 115, conversions: 27 },
  { day: 'Sun', views: 195, clicks: 80, conversions: 18 },
];

const ENGAGEMENT_DATA = [
  { day: 'Mon', mentions: 12, reactions: 34, shares: 5 },
  { day: 'Tue', mentions: 19, reactions: 55, shares: 9 },
  { day: 'Wed', mentions: 8,  reactions: 22, shares: 3 },
  { day: 'Thu', mentions: 27, reactions: 80, shares: 15 },
  { day: 'Fri', mentions: 35, reactions: 110, shares: 22 },
  { day: 'Sat', mentions: 30, reactions: 95, shares: 18 },
  { day: 'Sun', mentions: 21, reactions: 60, shares: 11 },
];

const LISTINGS_TRACTION = [
  { name: 'Decentralized Art Gallery', views: 890, traction: 87 },
  { name: 'Crypto Trading Bot Blueprint', views: 640, traction: 72 },
  { name: 'Web3 Social Network Concept', views: 320, traction: 45 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs space-y-1">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-mono">{p.value}</span></p>
      ))}
    </div>
  );
};

export default function CreatorAnalytics() {
  const totalViews = MARKET_DATA.reduce((s, d) => s + d.views, 0);
  const totalClicks = MARKET_DATA.reduce((s, d) => s + d.clicks, 0);
  const totalConversions = MARKET_DATA.reduce((s, d) => s + d.conversions, 0);
  const convRate = ((totalConversions / totalViews) * 100).toFixed(1);

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Views', value: totalViews.toLocaleString(), color: '#2196f3' },
          { label: 'Clicks', value: totalClicks.toLocaleString(), color: '#00e676' },
          { label: 'Conv. Rate', value: `${convRate}%`, color: '#ffeb3b' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Market Performance Chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-semibold mb-1">Market Performance</p>
        <p className="text-xs text-muted-foreground mb-3">Views, clicks & conversions — last 7 days</p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={MARKET_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2196f3" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2196f3" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00e676" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 18% 16%)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="views" stroke="#2196f3" strokeWidth={2} fill="url(#gViews)" name="Views" />
            <Area type="monotone" dataKey="clicks" stroke="#00e676" strokeWidth={2} fill="url(#gClicks)" name="Clicks" />
            <Line type="monotone" dataKey="conversions" stroke="#ffeb3b" strokeWidth={2} dot={false} name="Conversions" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2">
          {[['#2196f3','Views'],['#00e676','Clicks'],['#ffeb3b','Conversions']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
              <span className="text-xs text-muted-foreground">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement Trends */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-semibold mb-1">Engagement Trends</p>
        <p className="text-xs text-muted-foreground mb-3">Thinkers Club mentions, reactions & shares</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={ENGAGEMENT_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 18% 16%)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#666' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="reactions" fill="#7c4dff" radius={[3,3,0,0]} name="Reactions" />
            <Bar dataKey="mentions" fill="#2196f3" radius={[3,3,0,0]} name="Mentions" />
            <Bar dataKey="shares" fill="#ff9800" radius={[3,3,0,0]} name="Shares" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2">
          {[['#7c4dff','Reactions'],['#2196f3','Mentions'],['#ff9800','Shares']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
              <span className="text-xs text-muted-foreground">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Ideas by Traction */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold">Ideas by Traction</p>
        {LISTINGS_TRACTION.map(item => (
          <div key={item.name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground truncate max-w-[70%]">{item.name}</span>
              <span className="text-muted-foreground font-mono">{item.views} views</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${item.traction}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}