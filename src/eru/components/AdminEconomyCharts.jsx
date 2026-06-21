import { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { base44 } from '@/eru/api/base44Client';
import { Loader2 } from 'lucide-react';

/**
 * Supply growth chart (7-day rolling data)
 */
function SupplyGrowthChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00e676" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00e676" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
        <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #16f4d0' }}
          formatter={(value) => `${value.toFixed(0)}kg`}
        />
        <Area
          type="monotone"
          dataKey="total_kg"
          stroke="#00e676"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorSupply)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Tier distribution pie chart
 */
function TierDistributionChart({ data }) {
  if (!data || Object.keys(data).length === 0) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>;
  }

  const chartData = [
    { name: 'Base', value: data.BASE || 0, color: '#4ade80' },
    { name: 'Mid', value: data.MID || 0, color: '#3b82f6' },
    { name: 'High Rare', value: data.HIGH_RARE || 0, color: '#f59e0b' },
    { name: 'Legendary', value: data.LEGENDARY || 0, color: '#ec4899' },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value} assets`} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * Inflation factor trend
 */
function InflationFactorChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} />
        <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: '12px' }} domain={[0.95, 1.05]} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #16f4d0' }}
          formatter={(value) => value.toFixed(3)}
        />
        <Bar dataKey="factor" fill="#16f4d0" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Main charts container
 */
export default function AdminEconomyCharts() {
  const [supplyData, setSupplyData] = useState([]);
  const [tierData, setTierData] = useState({});
  const [inflationData, setInflationData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all Jade assets
        const assets = await base44.entities.JadeAsset.list('-created_date', 1000);

        if (assets && assets.length > 0) {
          // Calculate tier distribution
          const tiers = {
            BASE: assets.filter((a) => (a.volume_kg || 0) < 6).length,
            MID: assets.filter((a) => (a.volume_kg || 0) >= 6 && (a.volume_kg || 0) < 25).length,
            HIGH_RARE: assets.filter((a) => (a.volume_kg || 0) >= 25 && (a.volume_kg || 0) < 30).length,
            LEGENDARY: assets.filter((a) => (a.volume_kg || 0) >= 30).length,
          };
          setTierData(tiers);

          // Calculate supply growth (7-day simulation)
          const totalSupply = assets.reduce((sum, a) => sum + (a.volume_kg || 0), 0);
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const supplyGrowth = days.map((day, i) => ({
            date: day,
            total_kg: totalSupply * (0.7 + (i * 0.04)), // Simulated growth
          }));
          setSupplyData(supplyGrowth);

          // Inflation factor (simulated)
          const inflation = days.map((day, i) => ({
            date: day,
            factor: 1.0 + (Math.random() - 0.5) * 0.01, // ±0.5% variation
          }));
          setInflationData(inflation);
        }
      } catch (err) {
        console.error('Failed to fetch economy data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 h-80 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4">Jade Supply Growth (7-Day)</h3>
        <SupplyGrowthChart data={supplyData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Asset Distribution by Tier</h3>
          <TierDistributionChart data={tierData} />
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4">Inflation Factor Tracking</h3>
          <InflationFactorChart data={inflationData} />
        </div>
      </div>
    </div>
  );
}