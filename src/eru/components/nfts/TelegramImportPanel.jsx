import { useEffect, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Bot, Link2, RefreshCw, Upload, CheckCircle2 } from 'lucide-react';

const EXAMPLE_PAYLOAD = `[
  {
    "name": "TON Punk #1337",
    "collection": "TON Punks",
    "token_id": "1337",
    "image_url": "https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=300&h=300&fit=crop",
    "network": "TON",
    "external_id": "ton-punks-1337"
  }
]`;

export default function TelegramImportPanel({ onImported }) {
  const [account, setAccount] = useState(null);
  const [linkCode, setLinkCode] = useState('');
  const [manualJson, setManualJson] = useState(EXAMPLE_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

  const loadAccount = async () => {
    setLoading(true);
    const rows = await base44.entities.TelegramAccount?.list?.('-updated_date', 20).catch(() => []);
    setAccount((rows || [])[0] || null);
    setLoading(false);
  };

  useEffect(() => {
    loadAccount();
  }, []);

  const generateCode = async () => {
    setGenerating(true);
    const response = await base44.functions.invoke('generateTelegramLinkCode', {});
    setLinkCode(response.data?.link_code || '');
    setMessage('Link code ready. Send /link plus the code in your Telegram bot chat.');
    await loadAccount();
    setGenerating(false);
  };

  const importManual = async () => {
    setImporting(true);
    const parsed = JSON.parse(manualJson);
    const response = await base44.functions.invoke('importTelegramNfts', {
      nfts: parsed,
      source: 'manual'
    });
    setMessage(`${response.data?.imported || 0} NFTs imported.`);
    onImported?.();
    await loadAccount();
    setImporting(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Import via Chat</h3>
          <p className="text-xs text-muted-foreground mt-1">Link your Telegram account, send /sync in your existing bot chat, or paste NFT data manually.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">How it works</p>
        <p>1. Generate a link code here.</p>
        <p>2. In Telegram, send <span className="text-primary font-mono">/link YOURCODE</span> to your bot.</p>
        <p>3. Then send <span className="text-primary font-mono">/sync Name | Collection | Token ID | Image URL | Network</span>.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={generateCode} disabled={generating} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          <Link2 className="w-4 h-4" /> {generating ? 'Generating...' : 'Generate link code'}
        </button>
        <button onClick={loadAccount} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {(linkCode || account?.link_code) && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-[11px] text-muted-foreground">Current link code</p>
          <p className="mt-1 text-lg font-mono font-semibold text-primary">{linkCode || account?.link_code}</p>
        </div>
      )}

      {account?.link_status === 'linked' && (
        <div className="flex items-center gap-2 rounded-xl border border-green-400/20 bg-green-400/10 px-3 py-2 text-xs text-green-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Linked as @{account.telegram_username || 'telegram-user'}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">Manual fallback import</p>
        </div>
        <textarea value={manualJson} onChange={(e) => setManualJson(e.target.value)} className="w-full min-h-[180px] rounded-xl border border-border bg-secondary px-3 py-3 text-xs text-foreground outline-none resize-none font-mono" />
        <button onClick={importManual} disabled={importing} className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium text-foreground disabled:opacity-50">
          {importing ? 'Importing...' : 'Import manually'}
        </button>
      </div>

      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}