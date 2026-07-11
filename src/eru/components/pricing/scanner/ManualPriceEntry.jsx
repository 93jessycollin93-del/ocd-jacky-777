import { useState } from 'react';
import { Pencil } from 'lucide-react';
import PricingTrustBadge from '../PricingTrustBadge';
import { base44 } from '@/eru/api/base44Client';

/**
 * ManualPriceEntry — let owner enter a price, always labeled "Owner Manual
 * Price". Never blended into verified market averages.
 */
export default function ManualPriceEntry({ scanId, candidateId, cardName, userEmail, onSaved }) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('CAD');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (Number.isNaN(num) || num <= 0) return;
    setSaving(true);
    const row = await base44.entities.CardManualPrice.create({
      scan_id: scanId || '',
      candidate_id: candidateId || '',
      card_name: cardName || '',
      amount: num,
      currency,
      note,
      owner_email: userEmail,
    });
    onSaved?.(row);
    setAmount('');
    setNote('');
    setSaving(false);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold text-foreground">Manual price entry</p>
        <PricingTrustBadge kind="manual_entry" />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Your entry will be labeled <span className="font-mono">Owner Manual Price</span> — never mixed into verified market averages.
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          step={0.01}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono text-foreground outline-none"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground outline-none"
        >
          <option value="CAD">CAD</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="JPY">JPY</option>
        </select>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note, e.g. 'eBay purchase receipt'"
        rows={2}
        className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
      />
      <button
        onClick={handleSave}
        disabled={saving || !amount || Number.isNaN(parseFloat(amount))}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save manual price'}
      </button>
    </section>
  );
}