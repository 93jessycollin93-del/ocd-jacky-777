import { useState } from 'react';
import { ArrowUpRight, Loader2 } from 'lucide-react';

export default function EconomyTransferForm({ disabled, symbol, onSubmit, submitting }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipient.trim() || !amount.trim()) return;
    await onSubmit({ recipient: recipient.trim(), amount: amount.trim() });
    setAmount('');
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Send {symbol || 'token'}</p>
        <p className="mt-1 text-xs text-muted-foreground">This submits a real wallet transaction through the user’s connected provider.</p>
      </div>
      <input
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Recipient wallet address"
        className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs text-foreground outline-none font-mono"
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={`Amount in ${symbol || 'token'}`}
        inputMode="decimal"
        className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs text-foreground outline-none"
      />
      <button
        type="submit"
        disabled={disabled || submitting || !recipient.trim() || !amount.trim()}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
        {submitting ? 'Submitting transfer…' : 'Send token'}
      </button>
    </form>
  );
}