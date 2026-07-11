import { Wrench, Signal, Shield, BatteryWarning } from 'lucide-react';
import { getRiskTone, getStatusTone } from './BotFarmUtils';

function Meter({ label, value, tone = 'bg-primary' }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export default function BotFarmBotCard({ bot, onAssign, onRest, onRepair, onQuarantine }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{bot.name}</p>
          <p className="text-[11px] text-muted-foreground">{bot.bot_id} · {bot.specialty.replaceAll('_', ' ')}</p>
        </div>
        <div className="text-right">
          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${getStatusTone(bot.status)}`}>{bot.status}</span>
          <p className={`mt-2 text-[10px] font-semibold uppercase ${getRiskTone(bot.risk_level)}`}>{bot.risk_level} risk</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
        <div>Role <span className="text-foreground">{bot.role}</span></div>
        <div>Group <span className="text-foreground">{bot.farm_group}</span></div>
        <div>Level <span className="text-foreground">{bot.level}</span></div>
        <div>Concurrent <span className="text-foreground">{bot.max_concurrent_tasks}</span></div>
      </div>

      <div className="space-y-2">
        <Meter label="Efficiency" value={bot.efficiency} tone="bg-green-500" />
        <Meter label="Integrity" value={bot.integrity} tone="bg-blue-500" />
        <Meter label="Fatigue" value={bot.fatigue} tone="bg-orange-500" />
        <Meter label="Load" value={bot.load} tone="bg-red-500" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
        <div className="rounded-xl border border-border bg-background px-2 py-2"><Signal className="mb-1 w-3 h-3 text-primary" /> {bot.communication_status}</div>
        <div className="rounded-xl border border-border bg-background px-2 py-2"><Shield className="mb-1 w-3 h-3 text-primary" /> {bot.confidence}% conf.</div>
        <div className="rounded-xl border border-border bg-background px-2 py-2"><BatteryWarning className="mb-1 w-3 h-3 text-primary" /> {bot.output_quality}% quality</div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => onAssign(bot)} className="rounded-xl bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground">Assign Best Task</button>
        <button onClick={() => onRest(bot)} className="rounded-xl border border-border px-3 py-2 text-[11px] text-muted-foreground">Rest</button>
        <button onClick={() => onRepair(bot)} className="rounded-xl border border-border px-3 py-2 text-[11px] text-muted-foreground inline-flex items-center gap-1"><Wrench className="w-3 h-3" /> Repair</button>
        <button onClick={() => onQuarantine(bot)} className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">Quarantine</button>
      </div>
    </div>
  );
}