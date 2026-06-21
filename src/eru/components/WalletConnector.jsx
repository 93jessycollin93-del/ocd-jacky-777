import { useState } from 'react';
import { useAuth } from '@/eru/lib/AuthContext';
import { base44 } from '@/eru/api/base44Client';
import { Wallet, Loader } from 'lucide-react';

export default function WalletConnector({ onConnected }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed. Please install the extension.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const address = accounts[0];
      const chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);

      // Save to database
      const wallet = await base44.entities.ConnectedWallet.create({
        user_email: currentUser.email,
        wallet_address: address,
        chain_id: chainId,
        connector_type: 'metamask',
        label: `MetaMask (${address.slice(0, 6)}...)`,
        is_primary: false,
      });

      setWalletAddress(address);

      // Fetch holdings
      await base44.functions.invoke('fetchWalletHoldings', {
        walletAddress: address,
        chainId,
        walletId: wallet.id,
      });

      onConnected?.(wallet);
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const connectWalletConnect = async () => {
    // WalletConnect implementation would go here
    setError('WalletConnect coming soon');
  };

  if (walletAddress) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
        <p className="text-sm font-semibold text-green-600">Connected</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">{walletAddress}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
          {error}
        </div>
      )}

      <button
        onClick={connectMetaMask}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
        {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
        {loading ? 'Connecting...' : 'Connect MetaMask'}
      </button>

      <button
        onClick={connectWalletConnect}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-foreground rounded-lg font-medium hover:opacity-80 transition-opacity disabled:opacity-50">
        <Wallet className="w-4 h-4" /> Connect WalletConnect
      </button>
    </div>
  );
}