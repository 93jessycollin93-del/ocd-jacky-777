import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import { AlertTriangle, Loader2 } from 'lucide-react';
import EconomyContractStatus from '@/eru/components/economy/EconomyContractStatus';
import EconomyBalanceCard from '@/eru/components/economy/EconomyBalanceCard';
import EconomyTransferForm from '@/eru/components/economy/EconomyTransferForm';
import EconomyTransactionList from '@/eru/components/economy/EconomyTransactionList';

const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  }
];

const EXPLORERS = {
  1: 'https://etherscan.io/tx/',
  137: 'https://polygonscan.com/tx/',
  8453: 'https://basescan.org/tx/'
};

export default function Economy() {
  const { currentUser } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser?.email) return;
    const stored = localStorage.getItem('blockchain_config');
    if (stored) {
      try { setConfig(JSON.parse(stored)); } catch {}
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.email) return;
    loadData();
  }, [currentUser, config?.token_contract_address]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    const connectedWallets = await base44.entities.ConnectedWallet.filter({ user_email: currentUser.email }, '-created_date', 50);
    setWallets(connectedWallets || []);

    if ((connectedWallets || []).length > 0) {
      const primary = (connectedWallets || []).find((wallet) => wallet.is_primary) || connectedWallets[0];
      const tokenRows = await base44.entities.WalletHolding.filter({ wallet_id: primary.id }, '-updated_date', 100);
      setHoldings(tokenRows || []);

      const txRows = await base44.entities.EconomyAuditLog
        ? []
        : [];
      void txRows;
    }

    const txEntities = await base44.entities.Transaction.filter({ buyer_email: currentUser.email }, '-created_date', 50);
    const sellerTx = await base44.entities.Transaction.filter({ seller_email: currentUser.email }, '-created_date', 50);
    const normalized = [...(txEntities || []), ...(sellerTx || [])]
      .filter((item) => item.currency === (config?.token_symbol || item.currency) || item.asset_type === 'currency')
      .map((item) => ({
        ...item,
        from_address: item.metadata?.from_address || item.metadata?.sender || '',
        to_address: item.metadata?.to_address || item.metadata?.recipient || '',
        tx_hash: item.metadata?.tx_hash || item.metadata?.transaction_hash || '',
        symbol: item.currency || config?.token_symbol || 'TOKEN',
        network: config?.token_chain_name || config?.blockchain_provider || '',
        chain_id: config?.token_chain_id || config?.chain_id || 0,
      }))
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setTransactions(normalized);
    setLoading(false);
  };

  const primaryWallet = useMemo(() => wallets.find((wallet) => wallet.is_primary) || wallets[0] || null, [wallets]);
  const tokenHolding = useMemo(() => {
    if (!config?.token_symbol) return null;
    return holdings.find((holding) => holding.token_symbol?.toLowerCase() === config.token_symbol.toLowerCase()) || null;
  }, [holdings, config]);
  const explorerBaseUrl = EXPLORERS[Number(config?.token_chain_id || config?.chain_id)] || '';

  const submitTransfer = async ({ recipient, amount }) => {
    if (!window.ethereum) {
      setError('A supported wallet provider is required to send a real token transfer.');
      return;
    }
    if (!config?.token_contract_address || !primaryWallet) {
      setError('Configure the live token contract and connect a wallet first.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const chainHex = await window.ethereum.request({ method: 'eth_chainId' });
      const activeChainId = parseInt(chainHex, 16);
      const expectedChainId = Number(config.token_chain_id || config.chain_id);
      if (expectedChainId && activeChainId !== expectedChainId) {
        throw new Error(`Please switch your wallet to chain ${expectedChainId} before sending.`);
      }

      const decimalsResult = await window.ethereum.request({
        method: 'eth_call',
        params: [{ to: config.token_contract_address, data: '0x313ce567' }, 'latest']
      });
      const decimals = parseInt(decimalsResult || '0x12', 16);
      const rawAmount = BigInt(Math.round(Number(amount) * Math.pow(10, decimals)));
      const encodedRecipient = recipient.toLowerCase().replace(/^0x/, '').padStart(64, '0');
      const encodedAmount = rawAmount.toString(16).padStart(64, '0');
      const data = `0xa9059cbb${encodedRecipient}${encodedAmount}`;

      const [from] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from, to: config.token_contract_address, data }]
      });

      await base44.entities.Transaction.create({
        order_id: `token-transfer-${Date.now()}`,
        asset_type: 'currency',
        asset_id: config.token_contract_address,
        buyer_email: currentUser.email,
        seller_email: currentUser.email,
        amount: Number(amount),
        expected_amount: Number(amount),
        currency: config.token_symbol,
        status: 'pending_verification',
        payment_method: 'crypto',
        metadata: {
          tx_hash: txHash,
          from_address: from,
          to_address: recipient,
          token_contract_address: config.token_contract_address,
          token_name: config.token_name,
          chain_id: expectedChainId,
        }
      });

      await loadData();
    } catch (err) {
      setError(err.message || 'Transfer failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-4 pb-24 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Economy</h1>
        <p className="mt-1 text-xs text-muted-foreground">Live ERC-20 balances, wallet transfers, and token activity.</p>
      </div>

      <EconomyContractStatus config={config} />

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" /> {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
        <EconomyBalanceCard wallet={primaryWallet} holding={tokenHolding} symbol={config?.token_symbol} />
        <EconomyTransferForm
          disabled={!config?.token_contract_address || !primaryWallet}
          symbol={config?.token_symbol}
          onSubmit={submitTransfer}
          submitting={submitting}
        />
      </div>

      <EconomyTransactionList
        items={transactions}
        currentAddress={primaryWallet?.wallet_address}
        symbol={config?.token_symbol}
        explorerBaseUrl={explorerBaseUrl}
      />
    </div>
  );
}