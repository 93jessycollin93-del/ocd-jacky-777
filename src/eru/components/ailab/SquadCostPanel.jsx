import { AlertTriangle, Coins, Gauge, Wallet } from 'lucide-react';

function toneClasses(level) {
  if (level === 'high') {
    return 'border-red-400/30 bg-red-400/10 text-red-300';
  }
  if (level === 'medium') {
    return 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300';
  }
  return 'border-primary/20 bg-primary/5 text-primary';
}

export default function SquadCostPanel({ estimate, compact = false }) {
  if (!estimate) return null;

  const tone = toneClasses(estimate.warningLevel);

  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            <p className="text-xs font-semibold">Squad run budget estimate</p>
          </div>
          <p className="mt-1 text-[10px] opacity-90">{estimate.warningMessage}</p>
        </div>
        {estimate.warningLevel !== 'normal' && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
      </div>

      <div className={`mt-3 grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        <div className="rounded-lg border border-current/20 bg-black/10 px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] opacity-90"><Coins className="w-3 h-3" /> Tokens</div>
          <p className="mt-1 text-sm font-bold">{estimate.totalEstimatedTokens.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-current/20 bg-black/10 px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] opacity-90"><Gauge className="w-3 h-3" /> Cost</div>
          <p className="mt-1 text-sm font-bold">${estimate.estimatedCost.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-current/20 bg-black/10 px-2.5 py-2">
          <p className="text-[10px] opacity-90">Execution calls</p>
          <p className="mt-1 text-sm font-bold">{estimate.executionCount}</p>
        </div>
        <div className="rounded-lg border border-current/20 bg-black/10 px-2.5 py-2">
          <p className="text-[10px] opacity-90">Feedback calls</p>
          <p className="mt-1 text-sm font-bold">{estimate.feedbackCount}</p>
        </div>
      </div>
    </div>
  );
}