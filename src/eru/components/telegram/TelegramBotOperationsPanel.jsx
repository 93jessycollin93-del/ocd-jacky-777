import { CheckCircle2, Loader2, Power, Radio } from 'lucide-react';

export default function TelegramBotOperationsPanel({ selectedBot, verification, verifying, registering, toggling, onVerify, onRegisterWebhook, onToggleBotStatus }) {
  if (!selectedBot) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Webhook & token operations</p>
        <p className="text-[11px] text-muted-foreground">Each Telegram bot uses its own token and webhook lifecycle, including group and channel events.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <button onClick={onVerify} disabled={verifying} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium disabled:opacity-50">
          {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Verify token
        </button>
        <button onClick={onRegisterWebhook} disabled={registering} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium disabled:opacity-50">
          {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />} Set webhook
        </button>
        <button onClick={onToggleBotStatus} disabled={toggling} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium disabled:opacity-50">
          {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />} {selectedBot.status === 'active' ? 'Go offline' : 'Go active'}
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Webhook state</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{selectedBot.status || 'draft'}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Bot username</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{selectedBot.bot_username ? `@${selectedBot.bot_username}` : 'Not set'}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Webhook url</p>
          <p className="mt-1 text-[11px] text-muted-foreground break-all">{selectedBot.webhook_url || 'Not registered yet'}</p>
        </div>
      </div>

      {verification?.bot_username && <p className="text-[11px] text-green-400">Connected as @{verification.bot_username}</p>}
      {verification?.error && <p className="text-[11px] text-red-400">{verification.error}</p>}
    </div>
  );
}