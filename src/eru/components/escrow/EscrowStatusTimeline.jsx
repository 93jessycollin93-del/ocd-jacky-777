import { CheckCircle2, Circle } from 'lucide-react';
import { getEscrowStepState } from '@/eru/lib/escrowStateMachine';

const STEPS = [
  { key: 'fundsHeld', label: 'Funds held' },
  { key: 'paymentVerified', label: 'Payment verified' },
  { key: 'assetTransferred', label: 'Asset transferred' },
  { key: 'released', label: 'Funds released' },
];

export default function EscrowStatusTimeline({ escrow }) {
  const state = getEscrowStepState(escrow);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEPS.map((step) => {
        const done = state[step.key];
        return (
          <div key={step.key} className={`rounded-xl border px-3 py-2 text-[11px] ${done ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`}>
            <div className="flex items-center gap-2">
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              <span>{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}