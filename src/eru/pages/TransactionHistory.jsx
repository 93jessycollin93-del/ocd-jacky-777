import { useState, useEffect } from 'react';
import { useAuth } from '@/eru/lib/AuthContext';
import { base44 } from '@/eru/api/base44Client';
import { ArrowUpRight, ArrowDownLeft, Copy, ExternalLink, Calendar } from 'lucide-react';

// Mock transaction data
const MOCK_TRANSACTIONS = [
  {
    id: 'tx1',
    hash: '0x123abc...789def',
    fullHash: '0x123abc456def789abc123def456789abc123def456',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: 'out',
    token: 'ETH',
    amount: 0.5,
    value: 1475,
    from: '0x1234...5678',
    to: '0x9abc...def0',
    status: 'confirmed',
    chain: 'Ethereum',
  },
  {
    id: 'tx2',
    hash: '0x456def...012ghi',
    fullHash: '0x456def789abc456def789abc456def789abc456d',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    type: 'in',
    token: 'USDC',
    amount: 2500,
    value: 2500,
    from: '0x5678...9012',
    to: '0x1234...5678',
    status: 'confirmed',
    chain: 'Ethereum',
  },
  {
    id: 'tx3',
    hash: '0x789ghi...345jkl',
    fullHash: '0x789ghi012jkl345ghi012jkl345ghi012jkl345',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    type: 'out',
    token: 'DAI',
    amount: 1000,
    value: 1000,
    from: '0x1234...5678',
    to: '0xabcd...ef01',
    status: 'confirmed',
    chain: 'Ethereum',
  },
];

export default function TransactionHistory() {
  const { currentUser } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const w = await base44.entities.ConnectedWallet.filter(
        { user_email: currentUser.email },
        '-created_date',
        100
      );
      setWallets(w || []);
      // In production: fetch real transactions from blockchain API
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = transactions.filter((tx) => filterType === 'all' || tx.type === filterType);

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const copyHash = (hash) => {
    navigator.clipboard.writeText(hash);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Transaction History
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Recent on-chain transactions across {wallets.length} connected wallet{wallets.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filter */}
      <div className="px-4 py-3 border-b border-border flex gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}>
          All
        </button>
        <button
          onClick={() => setFilterType('in')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterType === 'in'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}>
          Received
        </button>
        <button
          onClick={() => setFilterType('out')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterType === 'out'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}>
          Sent
        </button>
      </div>

      {/* Transactions List */}
      <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No transactions found</div>
        ) : (
          filtered.map((tx) => (
            <div key={tx.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'in'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                    {tx.type === 'in' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {tx.type === 'in' ? 'Received' : 'Sent'} {tx.token}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatTime(tx.timestamp)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${tx.type === 'in' ? 'text-green-500' : 'text-foreground'}`}>
                    {tx.type === 'in' ? '+' : '-'}{tx.amount} {tx.token}
                  </p>
                  <p className="text-xs text-muted-foreground">${tx.value.toLocaleString()}</p>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-1 text-xs text-muted-foreground border-t border-border pt-2">
                <div className="flex items-center justify-between">
                  <span>Hash</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs">{tx.hash}</code>
                    <button
                      onClick={() => copyHash(tx.fullHash)}
                      className="p-1 hover:bg-secondary rounded transition-colors">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Chain</span>
                  <span>{tx.chain}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span className="text-green-500 capitalize">{tx.status}</span>
                </div>
              </div>

              {/* View on Explorer */}
              <div className="pt-2 border-t border-border">
                <a
                  href={`https://etherscan.io/tx/${tx.fullHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 w-full py-2 bg-secondary rounded-lg text-xs font-medium hover:opacity-80 transition-opacity">
                  <ExternalLink className="w-3 h-3" /> View on Explorer
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}