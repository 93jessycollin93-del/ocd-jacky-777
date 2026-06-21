import { useEffect, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Send, Loader2, CheckCircle2, Copy } from 'lucide-react';

export default function TelegramConnectSection() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [linking, setLinking] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadAccount = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    const rows = await base44.entities.TelegramAccount.filter({ user_email: me.email }, '-updated_date', 1);
    setAccount(rows?.[0] || null);
    setLoading(false);
  };

  useEffect(() => { loadAccount(); }, []);

  const generateLink = async () => {
    setLinking(true);
    const response = await base44.functions.invoke('generateTelegramLinkCode', {});
    setAccount(response.data?.account || null);
    if (response.data?.deep_link_url) {
      window.open(response.data.deep_link_url, '_blank');
    }
    setLinking(false);
  };

  const copyCode = async () => {
    if (!account?.link_code) return;
    await navigator.clipboard.writeText(account.link_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
          <Send className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Telegram connect</p>
          <p className="text-xs text-muted-foreground">Link your Telegram account to your app profile so it feels seamless inside Telegram.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
      ) : (
        <>
          {account?.link_status === 'linked' ? (
            <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5 text-sm text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Linked as {account.telegram_username ? `@${account.telegram_username}` : account.telegram_display_name || 'Telegram user'}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-secondary/40 px-3 py-3 space-y-2">
              <p className="text-xs text-muted-foreground">Open Telegram and finish linking with your one-time code.</p>
              {account?.link_code && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm font-mono text-foreground">{account.link_code}</div>
                  <button onClick={copyCode} className="h-10 w-10 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
              <button onClick={generateLink} disabled={linking} className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Connect Telegram
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}