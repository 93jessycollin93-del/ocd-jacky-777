import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

/**
 * Reusable metric card for dashboard KPIs
 */
export default function AdminMetricCard({
  label,
  value,
  suffix = '',
  trend,
  trendPercent,
  icon: Icon,
  status = 'normal',
  subtitle,
}) {
  const isUp = trend === 'up';
  const isDown = trend === 'down';

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {Icon && <Icon className="w-4 h-4 text-primary" />}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-foreground">
            {value}
            {suffix && <span className="text-sm text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>

        {trend && (
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
            isUp ? 'bg-green-500/10 text-green-400' : isDown ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
          }`}>
            {isUp && <TrendingUp className="w-3 h-3" />}
            {isDown && <TrendingDown className="w-3 h-3" />}
            {!isUp && !isDown && <AlertCircle className="w-3 h-3" />}
            {trendPercent && `${trendPercent}%`}
          </div>
        )}
      </div>

      {status !== 'normal' && (
        <div className="mt-2 text-[10px] text-yellow-400">
          {status === 'warning' && '⚠️ Inflation threshold approaching'}
          {status === 'alert' && '🔴 Inflation threshold exceeded'}
        </div>
      )}
    </div>
  );
}