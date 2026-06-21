import { useState, useEffect } from 'react';
import { useAuth } from '@/eru/lib/AuthContext';
import { Shield, Database, Globe, CheckCircle2, XCircle, AlertTriangle, Save } from 'lucide-react';

const PROVIDERS = [
  { id: 'ethereum', label: 'Ethereum Mainnet', rpc: 'https://mainnet.infura.io/v3/YOUR_KEY', chainId: '0x1' },
  { id: 'polygon', label: 'Polygon', rpc: 'https://polygon-rpc.com', chainId: '0x89' },
  { id: 'base', label: 'Base', rpc: 'https://mainnet.base.org', chainId: '0x2105' },
];

const BLANK_CONFIG = {
  mode: 'setup', // 'live' | 'setup' | 'offline'
  nft_minting_enabled: false,
  blockchain_provider: '',
  rpc_url: '',
  contract_address: '',
  token_contract_address: '',
  token_name: '',
  token_symbol: '',
  token_chain_id: 0,
  token_decimals: 18,
  market_data_source: 'coingecko', // 'coingecko' | 'none'
  token_system_enabled: false,
  admin_notes: '',
};

export default function AdminBlockchain() {
  const { currentUser } = useAuth();
  const [config, setConfig] = useState(BLANK_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('blockchain_config');
    if (stored) { try { setConfig(JSON.parse(stored)); } catch {} }
  }, []);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <Shield className="w-12 h-12 text-muted-foreground/30" />
        <p className="font-semibold text-muted-foreground">Admin Access Required</p>
        <p className="text-xs text-muted-foreground/60">Only admins can configure blockchain integration.</p>
      </div>
    );
  }

  const save = () => {
    localStorage.setItem('blockchain_config', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const set = (k, v) => setConfig(p => ({ ...p, [k]: v }));

  const modeColor = { live: 'text-green-400', setup: 'text-yellow-400', offline: 'text-red-400' };
  const modeBg = { live: 'bg-green-400/10 border-green-400/30', setup: 'bg-yellow-400/10 border-yellow-400/30', offline: 'bg-red-400/10 border-red-400/30' };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Blockchain Admin
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Configure real-world integration layers</p>
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* System Mode */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Mode</p>
          <div className="grid grid-cols-3 gap-2">
            {['live', 'setup', 'offline'].map(m => (
              <button key={m} onClick={() => set('mode', m)}
                className={`py-2.5 rounded-xl border text-xs font-bold capitalize transition-all ${config.mode === m ? modeBg[m] + ' ' + modeColor[m] : 'bg-secondary border-border text-muted-foreground'}`}>
                {m === 'live' ? '🟢' : m === 'setup' ? '🟡' : '🔴'} {m}
              </button>
            ))}
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${modeBg[config.mode]} ${modeColor[config.mode]}`}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {config.mode === 'live' ? 'All systems operational. Real data only.' :
             config.mode === 'setup' ? 'Setup mode — no fake data shown. Real integrations required before going live.' :
             'Offline mode — all blockchain features disabled.'}
          </div>
        </section>

        {/* Blockchain Provider */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blockchain Provider</p>
          <div className="space-y-2">
            {PROVIDERS.map(p => (
              <button key={p.id} onClick={() => { set('blockchain_provider', p.id); set('rpc_url', p.rpc); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${config.blockchain_provider === p.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary'}`}>
                <Globe className={`w-4 h-4 ${config.blockchain_provider === p.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="flex-1">
                  <p className="text-xs font-medium">{p.label}</p>
                  <p className="text-[9px] text-muted-foreground font-mono">{p.rpc}</p>
                </div>
                {config.blockchain_provider === p.id && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Custom RPC URL</label>
            <input value={config.rpc_url} onChange={e => set('rpc_url', e.target.value)}
              placeholder="https://your-rpc-endpoint..."
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs font-mono outline-none text-foreground" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">NFT Contract Address</label>
            <input value={config.contract_address} onChange={e => set('contract_address', e.target.value)}
              placeholder="0x... (deployed contract only)"
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs font-mono outline-none text-foreground" />
          </div>
        </section>

        {/* NFT Minting */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">NFT Minting</p>
          <label className="flex items-center gap-3 px-3 py-3 bg-secondary border border-border rounded-xl cursor-pointer">
            <input type="checkbox" checked={config.nft_minting_enabled}
              onChange={e => set('nft_minting_enabled', e.target.checked)} className="accent-primary" />
            <div className="flex-1">
              <p className="text-xs font-medium">Enable NFT Minting</p>
              <p className="text-[9px] text-muted-foreground">Requires deployed contract + wallet connection. No simulated minting.</p>
            </div>
            {config.nft_minting_enabled
              ? <CheckCircle2 className="w-4 h-4 text-green-400" />
              : <XCircle className="w-4 h-4 text-muted-foreground" />}
          </label>
          {config.nft_minting_enabled && !config.contract_address && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-400/10 border border-red-400/20 rounded-xl text-xs text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" /> Contract address required before minting can be enabled.
            </div>
          )}
        </section>

        {/* Market Data */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Market Data Source</p>
          {['coingecko', 'none'].map(src => (
            <button key={src} onClick={() => set('market_data_source', src)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${config.market_data_source === src ? 'border-primary bg-primary/10' : 'border-border bg-secondary'}`}>
              <Database className={`w-4 h-4 ${config.market_data_source === src ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1">
                <p className="text-xs font-medium">{src === 'coingecko' ? 'CoinGecko (Free)' : 'No Source'}</p>
                <p className="text-[9px] text-muted-foreground">{src === 'coingecko' ? 'Real-time prices via public API — no key needed' : 'All market data shown as unavailable'}</p>
              </div>
              {config.market_data_source === src && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
            </button>
          ))}
        </section>

        {/* Token System */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ERC-20 Token System</p>
          <label className="flex items-center gap-3 px-3 py-3 bg-secondary border border-border rounded-xl cursor-pointer">
            <input type="checkbox" checked={config.token_system_enabled}
              onChange={e => set('token_system_enabled', e.target.checked)} className="accent-primary" />
            <div className="flex-1">
              <p className="text-xs font-medium">Enable Token Architecture</p>
              <p className="text-[9px] text-muted-foreground">Requires actual ERC-20 contract deployment. No fake tokens.</p>
            </div>
          </label>
          {config.token_system_enabled && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded-xl text-xs text-yellow-400">
                <AlertTriangle className="w-3.5 h-3.5" /> Deploy an ERC-20 contract and configure its live details below. No simulated balances or fake activity are used.
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={config.token_name} onChange={e => set('token_name', e.target.value)} placeholder="Token name" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs outline-none text-foreground" />
                <input value={config.token_symbol} onChange={e => set('token_symbol', e.target.value.toUpperCase())} placeholder="Token symbol" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs outline-none text-foreground" />
                <input value={config.token_contract_address} onChange={e => set('token_contract_address', e.target.value)} placeholder="ERC-20 contract address" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs font-mono outline-none text-foreground sm:col-span-2" />
                <input type="number" value={config.token_chain_id} onChange={e => set('token_chain_id', Number(e.target.value))} placeholder="Chain ID" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs outline-none text-foreground" />
                <input type="number" value={config.token_decimals} onChange={e => set('token_decimals', Number(e.target.value))} placeholder="Decimals" className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs outline-none text-foreground" />
              </div>
            </div>
          )}
        </section>

        {/* Admin Notes */}
        <section className="space-y-1">
          <label className="text-xs text-muted-foreground">Admin Notes</label>
          <textarea value={config.admin_notes} onChange={e => set('admin_notes', e.target.value)}
            placeholder="Integration notes, provider credentials location, etc."
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs outline-none resize-none min-h-[70px] text-foreground" />
        </section>

        <button onClick={save}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm">
          {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Configuration</>}
        </button>
      </div>
    </div>
  );
}