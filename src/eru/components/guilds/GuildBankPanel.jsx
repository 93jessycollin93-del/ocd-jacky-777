import { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, ArrowDownToLine, ArrowUpFromLine, Loader2, AlertTriangle } from 'lucide-react';
import { donateToGuildBank, withdrawFromGuildBank } from '@/eru/lib/guildSystem';

/**
 * Shared Guild Bank — donations from any active member, withdrawals from the
 * leader only. All gold movement reuses the central economy API so it remains
 * fully audited.
 */
export default function GuildBankPanel({ guild, isLeader, onChanged, onGoldChange }) {
  const [donateAmount, setDonateAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [busy, setBusy] = useState(null); // 'donate' | 'withdraw'
  const [error, setError] = useState(null);

  const handle = async (kind) => {
    setError(null);
    setBusy(kind);
    try {
      const fn = kind === 'donate' ? donateToGuildBank : withdrawFromGuildBank;
      const value = kind === 'donate' ? donateAmount : withdrawAmount;
      const result = await fn(guild.id, Number(value));
      if (kind === 'donate') setDonateAmount('');
      else setWithdrawAmount('');
      if (result?.newGoldBalance !== undefined) onGoldChange?.(result.newGoldBalance);
      onChanged?.();
    } catch (err) {
      setError(err?.message || `${kind === 'donate' ? 'Donation' : 'Withdrawal'} failed.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-bold text-yellow-200">Guild Bank</h3>
        </div>
        <motion.p
          key={guild.bank_balance}
          initial={{ opacity: 0.4, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-base font-bold text-yellow-300 tabular-nums"
        >
          {Number(guild.bank_balance || 0).toLocaleString()}g
        </motion.p>
      </div>
      <p className="text-[11px] text-muted-foreground">
        All-time donated: {Number(guild.total_donated || 0).toLocaleString()}g · drives Guild Rank prestige.
      </p>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 inline-flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      <div className="grid gap-2">
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="Amount"
            value={donateAmount}
            onChange={(e) => setDonateAmount(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2 text-sm tabular-nums"
          />
          <button
            onClick={() => handle('donate')}
            disabled={busy !== null || !donateAmount}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-yellow-500 px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"
          >
            {busy === 'donate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
            Donate
          </button>
        </div>

        {isLeader && (
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="Withdraw"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2 text-sm tabular-nums"
            />
            <button
              onClick={() => handle('withdraw')}
              disabled={busy !== null || !withdrawAmount}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold disabled:opacity-40"
            >
              {busy === 'withdraw' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpFromLine className="w-3.5 h-3.5" />}
              Withdraw
            </button>
          </div>
        )}
      </div>
    </div>
  );
}