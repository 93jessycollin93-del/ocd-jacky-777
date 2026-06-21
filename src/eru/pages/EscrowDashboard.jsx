import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { AlertTriangle, CheckCircle2, Gavel, ShieldCheck, Wallet } from 'lucide-react';
import EscrowStatusTimeline from '@/eru/components/escrow/EscrowStatusTimeline';
import { getEscrowStatusMeta, getNextEscrowPatch } from '@/eru/lib/escrowStateMachine';

function StatCard({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function EscrowDashboard() {
  const [user, setUser] = useState(null);
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    const me = await base44.auth.me();
    const rows = await base44.entities.Escrow.list('-updated_date', 200).catch(() => []);
    setUser(me);
    setEscrows((rows || []).filter((item) => item.buyer_email === me.email || item.seller_email === me.email));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!base44.entities?.Escrow) return;
    const unsubscribe = base44.entities.Escrow.subscribe(() => load());
    return unsubscribe;
  }, []);

  const filteredEscrows = useMemo(() => {
    if (filter === 'all') return escrows;
    if (filter === 'disputed') return escrows.filter((item) => item.status === 'disputed');
    if (filter === 'completed') return escrows.filter((item) => item.status === 'completed');
    return escrows.filter((item) => !['completed', 'cancelled'].includes(item.status));
  }, [escrows, filter]);

  const stats = useMemo(() => ({
    active: escrows.filter((item) => !['completed', 'cancelled'].includes(item.status)).length,
    disputed: escrows.filter((item) => item.status === 'disputed').length,
    released: escrows.filter((item) => item.status === 'completed').reduce((sum, item) => sum + Number(item.price || 0), 0),
  }), [escrows]);

  const updateEscrow = async (escrow, action) => {
    setBusyId(escrow.id);
    await base44.entities.Escrow.update(escrow.id, getNextEscrowPatch(escrow, action, user?.email));
    setBusyId(null);
    load();
  };

  const openDispute = async (escrow) => {
    const reason = window.prompt('What issue should be reviewed?');
    if (!reason) return;
    setBusyId(escrow.id);
    await base44.entities.Escrow.update(escrow.id, {
      dispute_opened_by: user?.email,
      dispute_reason: reason,
      status: 'disputed',
    });
    setBusyId(null);
    load();
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-4 pb-24 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Escrow Dashboard</h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Monitor active trades, verify payment milestones, coordinate transfer, and resolve disputes with clear buyer/seller status.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Active trades" value={stats.active} tone="text-primary" />
        <StatCard label="Disputes" value={stats.disputed} tone="text-red-400" />
        <StatCard label="Released funds" value={stats.released} tone="text-green-400" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'active', label: 'Active' },
          { id: 'completed', label: 'Completed' },
          { id: 'disputed', label: 'Disputed' },
          { id: 'all', label: 'All' },
        ].map((item) => (
          <button key={item.id} onClick={() => setFilter(item.id)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === item.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredEscrows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">No escrow records in this view.</div>
        ) : filteredEscrows.map((escrow) => {
          const isBuyer = escrow.buyer_email === user?.email;
          const statusMeta = getEscrowStatusMeta(escrow.status);
          const canVerifyPayment = escrow.buyer_marked_paid && !escrow.payment_verified_at && escrow.status !== 'disputed' && escrow.status !== 'completed';
          const canTransfer = !escrow.seller_marked_received && escrow.status !== 'disputed' && escrow.status !== 'completed';
          const canRelease = escrow.buyer_marked_paid && (escrow.seller_marked_received || escrow.status === 'asset_transferred') && escrow.status !== 'disputed' && escrow.status !== 'completed';

          return (
            <div key={escrow.id} className="rounded-2xl border border-border bg-card p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{escrow.asset_label || escrow.asset_id}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{isBuyer ? `Seller: ${escrow.seller_email}` : `Buyer: ${escrow.buyer_email}`}</p>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${statusMeta.badge}`}>{statusMeta.label}</span>
                  <p className="mt-2 text-sm font-semibold text-foreground">{escrow.price} {escrow.currency}</p>
                </div>
              </div>

              <EscrowStatusTimeline escrow={escrow} />

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-[11px] text-muted-foreground">
                <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2"><span className="font-medium text-foreground">Buyer</span><p className="mt-1">{escrow.buyer_marked_paid ? 'Payment submitted' : 'Awaiting payment mark'}</p></div>
                <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2"><span className="font-medium text-foreground">Verification</span><p className="mt-1">{escrow.payment_verified_at ? 'Verified by workflow' : 'Awaiting verification'}</p></div>
                <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2"><span className="font-medium text-foreground">Seller</span><p className="mt-1">{escrow.seller_marked_received ? 'Asset marked transferred' : 'Awaiting transfer mark'}</p></div>
                <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2"><span className="font-medium text-foreground">Release</span><p className="mt-1">{escrow.completed_at ? 'Funds released' : 'Awaiting dual release'}</p></div>
              </div>

              {escrow.dispute_reason && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-3 text-xs text-red-300">
                  <div className="flex items-center gap-2 font-medium"><Gavel className="h-3.5 w-3.5" /> Dispute open</div>
                  <p className="mt-1">{escrow.dispute_reason}</p>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {isBuyer && !escrow.buyer_marked_paid && (
                  <button onClick={() => updateEscrow(escrow, 'mark_paid')} disabled={busyId === escrow.id} className="h-10 rounded-xl border border-primary/20 bg-primary/10 px-3 text-xs font-medium text-primary disabled:opacity-50">
                    <Wallet className="mr-1 inline h-3.5 w-3.5" /> Mark payment sent
                  </button>
                )}
                {canVerifyPayment && (
                  <button onClick={() => updateEscrow(escrow, 'verify_payment')} disabled={busyId === escrow.id} className="h-10 rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 text-xs font-medium text-blue-400 disabled:opacity-50">
                    <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> Verify payment
                  </button>
                )}
                {!isBuyer && canTransfer && (
                  <button onClick={() => updateEscrow(escrow, 'mark_asset_transferred')} disabled={busyId === escrow.id} className="h-10 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-3 text-xs font-medium text-yellow-300 disabled:opacity-50">
                    Mark asset transferred
                  </button>
                )}
                {canRelease && (
                  <button onClick={() => updateEscrow(escrow, 'request_release')} disabled={busyId === escrow.id} className="h-10 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground disabled:opacity-50">
                    Request release
                  </button>
                )}
                {escrow.status !== 'completed' && escrow.status !== 'disputed' && (
                  <button onClick={() => openDispute(escrow)} disabled={busyId === escrow.id} className="h-10 rounded-xl border border-red-400/20 bg-red-400/5 px-3 text-xs font-medium text-red-400 disabled:opacity-50">
                    <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Open dispute
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}