import { useState } from 'react';
import { ShieldCheck, ShieldOff, Lock } from 'lucide-react';
import ConfirmDialog from '@/eru/components/ConfirmDialog';
import { getZeroFakeDataMode, setZeroFakeDataMode, TRUST_LABELS } from '@/eru/lib/zeroFakeData';

/**
 * ZeroFakeDataModeToggle — admin-only control. ON by default. Disabling
 * requires explicit confirmation and labels every price as Demo / Test Only.
 */
export default function ZeroFakeDataModeToggle({ user }) {
  const [mode, setMode] = useState(getZeroFakeDataMode);
  const [pending, setPending] = useState(null);
  const isAdmin = user?.role === 'admin';
  const isOn = mode === 'on';

  const requestToggle = () => {
    if (!isAdmin) return;
    setPending(isOn ? 'disable' : 'enable');
  };

  const confirm = () => {
    try {
      const next = setZeroFakeDataMode(isOn ? 'off' : 'on', { actorEmail: user?.email, actorRole: user?.role });
      setMode(next);
    } catch {
      /* ignore — toggle requires admin */
    }
    setPending(null);
  };

  return (
    <section className={`rounded-2xl border p-4 ${isOn ? 'border-primary/30 bg-primary/5' : 'border-destructive/40 bg-destructive/10'}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
          isOn ? 'bg-primary/15 text-primary' : 'bg-destructive/20 text-destructive'
        }`}>
          {isOn ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Pricing trust policy
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            Zero Fake Data Mode — {isOn ? 'ON' : 'OFF'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
            When ON, every price obeys the verified-source rules and refuses to fabricate values.
            When OFF, every price is overlaid with <span className="font-mono">{TRUST_LABELS.DEMO}</span>.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={requestToggle}
              disabled={!isAdmin}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold ${
                isOn
                  ? 'border border-destructive/40 bg-destructive/10 text-destructive'
                  : 'bg-primary text-primary-foreground'
              } disabled:opacity-50`}
            >
              {isOn ? 'Disable (admin only)' : 'Re-enable Zero Fake Data Mode'}
            </button>
            {!isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                <Lock className="h-3 w-3" /> Admin only
              </span>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!pending}
        title={pending === 'disable' ? 'Disable Zero Fake Data Mode?' : 'Re-enable Zero Fake Data Mode?'}
        description={
          pending === 'disable'
            ? 'Every price will be visibly labeled "Demo / Test Only". Production users must never see this state. Continue?'
            : 'All pricing returns to verified-source rules. Confirm to re-enable?'
        }
        tone={pending === 'disable' ? 'danger' : 'default'}
        confirmLabel={pending === 'disable' ? 'Disable' : 'Re-enable'}
        onCancel={() => setPending(null)}
        onConfirm={confirm}
      />
    </section>
  );
}