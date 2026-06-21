import { useState } from 'react';
import { Coins, Copy, ExternalLink, Loader2, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { TON_RECEIVING_ADDRESS } from '@/eru/lib/tonConfig';
import { buildTonTransferUrl, buildTonkeeperUniversalUrl, copyToClipboard } from '@/eru/lib/tonPayment';

/**
 * TonPaymentPanel
 * ------------------------------------------------------------------
 * Mobile-first TON payment screen embedded inside BazarCheckoutDialog
 * when the user picks "Pay with TON". Shows the exact amount, the
 * unique payment reference (comment), and provides:
 *   - Open Tonkeeper deep link (works in Telegram + native)
 *   - Copy address / amount / comment
 *   - "I've sent it — verify" button that calls verifyTonPayment
 *
 * Props:
 *   amountTon       — exact TON amount the user must send
 *   paymentRef      — unique comment string to embed in the transfer
 *   transactionId   — Transaction entity id created by parent
 *   onVerified()    — called when on-chain verification succeeds
 */

export default function TonPaymentPanel({ amountTon, paymentRef, transactionId, onVerified }) {
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState(null); // { ok, message }
  const [copied, setCopied] = useState(null);

  const tonUrl = buildTonTransferUrl({ amountTon, comment: paymentRef });
  const universalUrl = buildTonkeeperUniversalUrl({ amountTon, comment: paymentRef });

  const flashCopied = (key) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  };

  const handleCopy = async (key, text) => {
    const ok = await copyToClipboard(text);
    if (ok) flashCopied(key);
  };

  const verify = async () => {
    setVerifying(true);
    setStatus(null);
    try {
      const res = await base44.functions.invoke('verifyTonPayment', {
        transactionId,
        paymentRef,
        expectedTon: Number(amountTon),
      });
      const data = res?.data || {};
      if (data.verified) {
        setStatus({ ok: true, message: 'Payment verified on-chain.' });
        onVerified?.(data);
      } else if (data.ok) {
        setStatus({ ok: false, message: data.reason || 'Not found on-chain yet — wait ~10s and retry.' });
      } else {
        setStatus({ ok: false, message: data.error || 'Verification error.' });
      }
    } catch (err) {
      setStatus({ ok: false, message: err?.message || 'Verification failed.' });
    } finally {
      setVerifying(false);
    }
  };

  // Shorten address for display
  const shortAddr = `${TON_RECEIVING_ADDRESS.slice(0, 6)}…${TON_RECEIVING_ADDRESS.slice(-6)}`;

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-primary" />
        <p className="text-xs font-semibold">Pay with TON (Mainnet)</p>
      </div>

      {/* Amount + comment + address rows */}
      <Row
        label="Amount"
        value={`${Number(amountTon).toFixed(4)} TON`}
        copyKey="amount"
        copyValue={String(amountTon)}
        copied={copied}
        onCopy={handleCopy}
      />
      <Row
        label="Comment (required)"
        value={paymentRef}
        copyKey="ref"
        copyValue={paymentRef}
        copied={copied}
        onCopy={handleCopy}
        warn
      />
      <Row
        label="Wallet"
        value={shortAddr}
        copyKey="addr"
        copyValue={TON_RECEIVING_ADDRESS}
        copied={copied}
        onCopy={handleCopy}
      />

      {/* Open in wallet */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={tonUrl}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open Tonkeeper
        </a>
        <a
          href={universalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-[11px] font-medium"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Web wallet
        </a>
      </div>

      {/* Critical warning */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
        <p className="text-[10px] text-amber-200">
          You <span className="font-semibold">must</span> include the comment <span className="font-mono">{paymentRef}</span> in your transfer, or your payment cannot be matched.
        </p>
      </div>

      {/* Verify button */}
      <button
        onClick={verify}
        disabled={verifying}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50"
      >
        {verifying ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking on-chain…</>
        ) : (
          <><ShieldCheck className="h-3.5 w-3.5" /> I've sent it — verify</>
        )}
      </button>

      {status && (
        <div className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${status.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
          {status.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-destructive" />}
          <p className={`text-[11px] ${status.ok ? 'text-emerald-300' : 'text-destructive'}`}>{status.message}</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, copyKey, copyValue, copied, onCopy, warn }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`truncate font-mono text-[11px] ${warn ? 'text-amber-300' : 'text-foreground'}`}>{value}</p>
      </div>
      <button
        onClick={() => onCopy(copyKey, copyValue)}
        className="flex-shrink-0 rounded-md border border-border bg-secondary px-2 py-1 text-[10px] font-medium hover:border-primary/40"
      >
        {copied === copyKey ? 'Copied' : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}