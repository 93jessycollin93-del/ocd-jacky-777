import { useWallet } from '../hooks/useWallet';
import { Wallet, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';

export default function WalletConnectBar() {
  const { status, shortAddress, networkName, connect, disconnect } = useWallet();

  if (status === 'unavailable') {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-secondary border border-border rounded-xl">
        <Wallet className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground flex-1">No Web3 wallet detected</span>
        <a href="https://metamask.io/download/" target="_blank" rel="noreferrer"
          className="flex items-center gap-1 text-[10px] text-primary border border-primary/30 bg-primary/10 px-2 py-1 rounded-lg">
          <ExternalLink className="w-2.5 h-2.5" /> Get MetaMask
        </a>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-secondary border border-border rounded-xl">
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground">Connecting…</span>
      </div>
    );
  }

  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 bg-green-400/5 border border-green-400/20 rounded-xl">
        <CheckCircle2 className="w-4 h-4 text-green-400" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-foreground truncate">{shortAddress}</p>
          {networkName && <p className="text-[9px] text-green-400">{networkName}</p>}
        </div>
        <button onClick={disconnect} className="text-[10px] text-muted-foreground border border-border rounded-lg px-2 py-0.5">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button onClick={connect}
      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold">
      <Wallet className="w-4 h-4" /> Connect Wallet
    </button>
  );
}