import { useState, useEffect } from 'react';
import { useAuth } from '@/eru/lib/AuthContext';
import { fetchTransactionHistory } from '@/eru/lib/economyApi';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle, X } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-yellow-400', label: 'Pending' },
  funds_held: { icon: Clock, color: 'text-blue-400', label: 'Funds Held' },
  payment_confirmed: { icon: Clock, color: 'text-blue-400', label: 'Processing' },
  asset_transferred: { icon: CheckCircle2, color: 'text-green-400', label: 'Asset Transferred' },
  completed: { icon: CheckCircle2, color: 'text-green-400', label: 'Completed' },
  cancelled: { icon: AlertCircle, color: 'text-red-400', label: 'Cancelled' },
  disputed: { icon: AlertCircle, color: 'text-orange-400', label: 'Disputed' }
};

export default function TransactionHistory() {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (currentUser?.email) {
      loadTransactions();
    }
  }, [currentUser]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const history = await fetchTransactionHistory(currentUser.email, 100);
      setTransactions(history.combined);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = transactions.filter((tx) => {
    if (activeTab === 'buying') return tx.buyer_email === currentUser?.email;
    if (activeTab === 'selling') return tx.seller_email === currentUser?.email;
    return true;
  });

  const getDirection = (tx) => {
    if (tx.buyer_email === currentUser?.email) return 'out'; // buying
    if (tx.seller_email === currentUser?.email) return 'in'; // selling
    return 'neutral';
  };

  if (selectedTx) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 pb-20">
        <div className="bg-card border border-border rounded-2xl max-w-lg w-full">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold">Transaction Details</h3>
            <button onClick={() => setSelectedTx(null)} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                <div className="flex items-center gap-1">
                  {(() => {
                    const config = STATUS_CONFIG[selectedTx.status];
                    const Icon = config.icon;
                    return (
                      <>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        <span className="text-sm font-semibold">{config.label}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-secondary rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Amount</p>
                <p className="text-lg font-bold text-primary">{selectedTx.price}</p>
              </div>
            </div>

            <div className="bg-secondary rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Parties</p>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Seller:</span> <span className="font-mono text-xs">{selectedTx.seller_email.split('@')[0]}...</span></p>
                <p><span className="text-muted-foreground">Buyer:</span> <span className="font-mono text-xs">{selectedTx.buyer_email.split('@')[0]}...</span></p>
              </div>
            </div>

            <div className="bg-secondary rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Asset</p>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Type:</span> <span className="capitalize font-semibold">{selectedTx.asset_type}</span></p>
                <p><span className="text-muted-foreground">ID:</span> <span className="font-mono text-xs">{selectedTx.asset_id.slice(0, 8)}...</span></p>
              </div>
            </div>

            <div className="bg-secondary rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Timeline</p>
              <div className="space-y-1.5 text-xs">
                {selectedTx.funds_held_at && (
                  <p><span className="text-muted-foreground">Funds Held:</span> <span>{new Date(selectedTx.funds_held_at).toLocaleString()}</span></p>
                )}
                {selectedTx.payment_verified_at && (
                  <p><span className="text-muted-foreground">Payment Confirmed:</span> <span>{new Date(selectedTx.payment_verified_at).toLocaleString()}</span></p>
                )}
                {selectedTx.completed_at && (
                  <p><span className="text-muted-foreground">Completed:</span> <span>{new Date(selectedTx.completed_at).toLocaleString()}</span></p>
                )}
              </div>
            </div>

            {selectedTx.dispute_reason && (
              <div className="bg-red-400/10 border border-red-400/30 rounded-lg p-3">
                <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Dispute</p>
                <p className="text-sm">{selectedTx.dispute_reason}</p>
              </div>
            )}

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold">Transaction History</h2>
        <p className="text-xs text-muted-foreground">Escrow & Marketplace Activity</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[{ id: 'all', label: 'All' }, { id: 'buying', label: 'Buying' }, { id: 'selling', label: 'Selling' }].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === t.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No transactions yet</p>
          </div>
        ) : (
          filtered.map((tx) => {
            const direction = getDirection(tx);
            const Icon = direction === 'in' ? TrendingUp : TrendingDown;
            const color = direction === 'in' ? 'text-green-400' : 'text-red-400';
            const config = STATUS_CONFIG[tx.status];
            const StatusIcon = config.icon;

            return (
              <button
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="w-full text-left px-3 py-3 bg-card border border-border rounded-xl hover:border-primary/40 transition-all flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${direction === 'in' ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold capitalize">{tx.asset_type}</p>
                    <p className="text-[10px] text-muted-foreground">{direction === 'in' ? 'Sold' : 'Purchased'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-sm font-bold ${color}`}>
                      {direction === 'in' ? '+' : '-'}{tx.price}
                    </p>
                    <div className="flex items-center gap-1">
                      <StatusIcon className={`w-3 h-3 ${config.color}`} />
                      <p className="text-[10px] text-muted-foreground">{config.label}</p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}