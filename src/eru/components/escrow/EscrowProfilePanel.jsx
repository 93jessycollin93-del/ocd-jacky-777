import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Clock3, HandCoins, PlusCircle, ShieldAlert, Wallet } from 'lucide-react';
import EscrowStatusTimeline from '@/eru/components/escrow/EscrowStatusTimeline';
import { getEscrowStatusMeta, getNextEscrowPatch } from '@/eru/lib/escrowStateMachine';
import MaskedEmail from '@/eru/components/privacy/MaskedEmail';

const DEFAULT_FORM = {
  listing_id: '',
  seller_email: '',
  buyer_email: '',
  asset_type: 'collectible',
  asset_id: '',
  asset_label: '',
  price: '',
  currency: 'GOLD',
  deal_note: ''
};

function Pill({ children, tone = 'default' }) {
  const toneClass = {
    default: 'bg-secondary text-foreground',
    success: 'bg-primary/10 text-primary',
    warning: 'bg-yellow-400/10 text-yellow-300',
    danger: 'bg-red-400/10 text-red-400'
  }[tone];

  return <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${toneClass}`}>{children}</span>;
}

export default function EscrowProfilePanel({ userEmail = '', compact = false }) {
  const [escrows, setEscrows] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const loadEscrows = async () => {
    const rows = await base44.entities.Escrow.list('-updated_date', 100).catch(() => []);
    setEscrows((rows || []).filter((item) => item.buyer_email === userEmail || item.seller_email === userEmail));
  };

  useEffect(() => {
    if (!userEmail) return;
    loadEscrows();
  }, [userEmail]);

  const summary = useMemo(() => ({
    total: escrows.length,
    active: escrows.filter((item) => !['completed', 'cancelled'].includes(item.status)).length,
    disputed: escrows.filter((item) => item.status === 'disputed').length
  }), [escrows]);

  const createEscrow = async () => {
    if (!form.seller_email || !form.buyer_email || !form.asset_id || !form.price) return;
    setSaving(true);
    await base44.entities.Escrow.create({
      ...form,
      listing_id: form.listing_id || `manual_${Date.now()}`,
      price: Number(form.price)
    });
    setForm(DEFAULT_FORM);
    setShowCreate(false);
    setSaving(false);
    loadEscrows();
  };

  const updateEscrow = async (escrowId, data) => {
    await base44.entities.Escrow.update(escrowId, data);
    loadEscrows();
  };

  const markPaid = (escrow) => updateEscrow(escrow.id, getNextEscrowPatch(escrow, 'mark_paid', userEmail));

  const markReceived = (escrow) => updateEscrow(escrow.id, getNextEscrowPatch(escrow, 'mark_asset_transferred', userEmail));

  const requestRelease = (escrow) => updateEscrow(escrow.id, getNextEscrowPatch(escrow, 'request_release', userEmail));

  const requestCancel = (escrow) => {
    const reason = window.prompt('Reason for cancellation request?');
    if (!reason) return;
    updateEscrow(escrow.id, {
      cancel_requested_by: userEmail,
      cancel_reason: reason,
      status: 'cancelled'
    });
  };

  const openDispute = (escrow) => {
    const reason = window.prompt('What is the issue with this escrow?');
    if (!reason) return;
    updateEscrow(escrow.id, {
      dispute_opened_by: userEmail,
      dispute_reason: reason,
      status: 'disputed'
    });
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Escrow</h3>
          <p className="text-xs text-muted-foreground mt-1">Create deals, track status, and manage release, cancellation, or disputes from your profile.</p>
        </div>
        <button onClick={() => setShowCreate((prev) => !prev)} className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
          <PlusCircle className="w-3.5 h-3.5" /> New
        </button>
      </div>

      <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
        <div className="rounded-xl border border-border bg-secondary/20 p-3"><p className="text-[11px] text-muted-foreground">Total</p><p className="mt-1 text-lg font-semibold text-foreground">{summary.total}</p></div>
        <div className="rounded-xl border border-border bg-secondary/20 p-3"><p className="text-[11px] text-muted-foreground">Active</p><p className="mt-1 text-lg font-semibold text-foreground">{summary.active}</p></div>
        <div className="rounded-xl border border-border bg-secondary/20 p-3"><p className="text-[11px] text-muted-foreground">Disputed</p><p className="mt-1 text-lg font-semibold text-foreground">{summary.disputed}</p></div>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border bg-secondary/10 p-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={form.asset_label} onChange={(e) => setForm((prev) => ({ ...prev, asset_label: e.target.value }))} placeholder="Asset name" className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none" />
            <input value={form.asset_id} onChange={(e) => setForm((prev) => ({ ...prev, asset_id: e.target.value }))} placeholder="Asset ID" className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none" />
            <input value={form.seller_email} onChange={(e) => setForm((prev) => ({ ...prev, seller_email: e.target.value }))} placeholder="Seller email" className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none" />
            <input value={form.buyer_email} onChange={(e) => setForm((prev) => ({ ...prev, buyer_email: e.target.value }))} placeholder="Buyer email" className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none" />
            <input value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} placeholder="Price" className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none" />
            <select value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))} className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none">
              {['GOLD', 'CRYPTO', 'TON', 'TELEGRAM_STARS'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <textarea value={form.deal_note} onChange={(e) => setForm((prev) => ({ ...prev, deal_note: e.target.value }))} placeholder="Deal note" className="min-h-[84px] w-full rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none" />
          <div className="flex gap-2">
            <button onClick={createEscrow} disabled={saving} className="flex-1 h-11 rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? 'Creating…' : 'Create escrow'}</button>
            <button onClick={() => setShowCreate(false)} className="h-11 rounded-xl border border-border px-4 text-sm text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {escrows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-4 text-xs text-muted-foreground">No escrow deals yet.</div>
        ) : escrows.map((escrow) => {
          const isBuyer = escrow.buyer_email === userEmail;
          const statusMeta = getEscrowStatusMeta(escrow.status);
          const statusTone = escrow.status === 'completed' ? 'success' : escrow.status === 'disputed' ? 'danger' : escrow.status === 'cancelled' ? 'warning' : 'default';
          return (
            <div key={escrow.id} className="rounded-xl border border-border bg-secondary/10 p-3 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{escrow.asset_label || escrow.asset_id}</p>
                  <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                    {isBuyer ? 'Seller:' : 'Buyer:'}
                    <MaskedEmail
                      email={isBuyer ? escrow.seller_email : escrow.buyer_email}
                      className="text-xs text-muted-foreground"
                    />
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill tone={statusTone}>{statusMeta.label}</Pill>
                  <Pill>{escrow.price} {escrow.currency}</Pill>
                </div>
              </div>

              <EscrowStatusTimeline escrow={escrow} />

              <div className="grid gap-2 sm:grid-cols-3 text-[11px] text-muted-foreground">
                <div className="rounded-lg border border-border bg-card px-3 py-2 flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-primary" /> {escrow.buyer_marked_paid ? 'Buyer marked paid' : 'Awaiting payment mark'}</div>
                <div className="rounded-lg border border-border bg-card px-3 py-2 flex items-center gap-2"><HandCoins className="w-3.5 h-3.5 text-primary" /> {escrow.seller_marked_received ? 'Seller marked received' : 'Awaiting receipt mark'}</div>
                <div className="rounded-lg border border-border bg-card px-3 py-2 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5 text-primary" /> {escrow.completed_at ? 'Closed' : 'Open workflow'}</div>
              </div>

              {escrow.deal_note && <p className="text-xs text-muted-foreground rounded-lg border border-border bg-card px-3 py-2">{escrow.deal_note}</p>}
              {escrow.dispute_reason && <p className="text-xs text-red-400 rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2">Dispute: {escrow.dispute_reason}</p>}

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {isBuyer && !escrow.buyer_marked_paid && (
                  <button onClick={() => markPaid(escrow)} className="h-10 rounded-xl border border-primary/20 bg-primary/10 px-3 text-xs font-medium text-primary">Mark paid</button>
                )}
                {!isBuyer && !escrow.seller_marked_received && (
                  <button onClick={() => markReceived(escrow)} className="h-10 rounded-xl border border-primary/20 bg-primary/10 px-3 text-xs font-medium text-primary">Mark received</button>
                )}
                {escrow.status !== 'completed' && escrow.status !== 'cancelled' && (
                  <button onClick={() => requestRelease(escrow)} className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground">Release request</button>
                )}
                {escrow.status !== 'completed' && escrow.status !== 'cancelled' && (
                  <button onClick={() => requestCancel(escrow)} className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground">Cancel request</button>
                )}
                {escrow.status !== 'disputed' && escrow.status !== 'completed' && (
                  <button onClick={() => openDispute(escrow)} className="h-10 rounded-xl border border-red-400/20 bg-red-400/5 px-3 text-xs font-medium text-red-400">Open dispute</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-secondary/10 p-3 text-xs text-muted-foreground flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 text-primary shrink-0" />
        <span>This is a user-friendly escrow workspace for coordination and status tracking inside the app. Real-world payment verification and admin dispute review can build on top of this flow.</span>
      </div>
    </section>
  );
}