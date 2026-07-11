import { AlertTriangle, CheckCircle2, Coins } from 'lucide-react';

export default function EconomyContractStatus({ config }) {
  const configured = Boolean(config?.token_system_enabled && config?.token_contract_address && config?.token_symbol && config?.token_name);

  return (
    <div className={`rounded-2xl border p-4 ${configured ? 'border-primary/20 bg-primary/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-xl p-2 ${configured ? 'bg-primary/10 text-primary' : 'bg-yellow-500/10 text-yellow-400'}`}>
          {configured ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" /> ERC-20 Economy
          </p>
          {configured ? (
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>{config.token_name} ({config.token_symbol})</p>
              <p className="font-mono break-all">{config.token_contract_address}</p>
              <p>Chain {config.token_chain_id || config.chain_id || '—'}</p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">The economy dashboard needs a live ERC-20 contract configured in Blockchain Admin before balances and token activity can be trusted.</p>
          )}
        </div>
      </div>
    </div>
  );
}