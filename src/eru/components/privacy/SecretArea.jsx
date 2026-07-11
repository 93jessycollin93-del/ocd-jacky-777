import { useEffect, useState } from 'react';
import { Lock, Unlock, ShieldCheck, KeyRound, Eye, EyeOff } from 'lucide-react';
import {
  isPinConfigured,
  setPin as savePin,
  verifyPin,
  clearPin,
  isUnlocked,
  markUnlocked,
  lockNow,
} from '@/eru/lib/secretAreaPin';

/**
 * SecretArea
 * ----------------------------------------------------------------------------
 * A PIN-gated container for sensitive content. First-time use prompts the user
 * to set a PIN. After that, content stays hidden until the PIN is entered for
 * the current session.
 *
 * Props:
 *  - title       string   Heading shown when locked.
 *  - description string   Hint text shown when locked.
 *  - children    node     Sensitive content (rendered only when unlocked).
 */
export default function SecretArea({
  title = 'Secret Area',
  description = 'Sensitive information is hidden behind a PIN for your privacy.',
  children,
}) {
  const [configured, setConfigured] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [mode, setMode] = useState('idle'); // 'idle' | 'set' | 'verify'
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setConfigured(isPinConfigured());
    setUnlocked(isUnlocked());
  }, []);

  const resetForm = () => {
    setPin('');
    setConfirm('');
    setError('');
    setShowPin(false);
  };

  const handleSetPin = async () => {
    setError('');
    if (pin.length < 4) { setError('PIN must be at least 4 characters.'); return; }
    if (pin !== confirm) { setError('PINs do not match.'); return; }
    setBusy(true);
    try {
      await savePin(pin);
      setConfigured(true);
      markUnlocked();
      setUnlocked(true);
      setMode('idle');
      resetForm();
    } catch (err) {
      setError(err?.message || 'Could not save PIN.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setBusy(true);
    try {
      const ok = await verifyPin(pin);
      if (!ok) {
        setError('Incorrect PIN.');
        return;
      }
      markUnlocked();
      setUnlocked(true);
      setMode('idle');
      resetForm();
    } finally {
      setBusy(false);
    }
  };

  const handleLock = () => {
    lockNow();
    setUnlocked(false);
  };

  const handleResetPin = () => {
    if (!window.confirm('Reset your Secret Area PIN? You will need to set a new one.')) return;
    clearPin();
    setConfigured(false);
    setUnlocked(false);
    setMode('set');
    resetForm();
  };

  // -------- Locked / unconfigured states --------
  if (!unlocked) {
    const setting = mode === 'set' || !configured;

    return (
      <div className="eru-theme-card relative overflow-hidden rounded-2xl border border-border p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground sm:text-base">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        {mode === 'idle' && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode(configured ? 'verify' : 'set')}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {configured ? 'Unlock with PIN' : 'Set a PIN'}
            </button>
            {configured && (
              <button
                type="button"
                onClick={handleResetPin}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground"
              >
                Reset PIN
              </button>
            )}
          </div>
        )}

        {(mode === 'set' || mode === 'verify') && (
          <div className="mt-4 space-y-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {setting ? 'Choose a PIN (min 4 chars)' : 'Enter your PIN'}
              </span>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="off"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-border bg-secondary px-3 py-2 pr-10 text-sm outline-none focus:border-primary"
                  placeholder="••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-card"
                >
                  {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </label>

            {setting && (
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Confirm PIN
                </span>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="off"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="••••"
                />
              </label>
            )}

            {error && <p className="text-[11px] text-red-400">{error}</p>}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={setting ? handleSetPin : handleVerify}
                disabled={busy || !pin}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {busy ? 'Working…' : setting ? 'Save PIN & unlock' : 'Unlock'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('idle'); resetForm(); }}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground"
              >
                Cancel
              </button>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Your PIN is hashed and stored only on this device. It locks again automatically when the tab closes.
            </p>
          </div>
        )}
      </div>
    );
  }

  // -------- Unlocked state --------
  return (
    <div className="eru-theme-card relative overflow-hidden rounded-2xl border border-primary/30 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Unlock className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground sm:text-base">{title}</p>
            <p className="mt-0.5 text-[11px] text-primary">Unlocked for this session</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLock}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          <Lock className="h-3 w-3" /> Lock
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}