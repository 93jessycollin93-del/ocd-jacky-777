import { useMemo, useState } from 'react';
import { Bot, Copy, ExternalLink, KeyRound, Send, ShieldCheck } from 'lucide-react';

const DEFAULT_TEMPLATE = {
  name: 'My Telegram Bot',
  greeting: 'Hi! I am live and ready to help.',
  prompt: 'You are a helpful Telegram assistant. Be clear, fast, friendly, and safe.',
};

export default function TelegramBotSetupPanel({ onOpenManagement }) {
  const [secretValue, setSecretValue] = useState('');
  const [copied, setCopied] = useState('');

  const webhookPath = useMemo(() => `${window.location.origin}/functions/telegramWebhook`, []);

  const copyText = async (value, key) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Send className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Telegram bot setup</h3>
          <p className="text-xs text-muted-foreground">Use Jackie as your central place to prepare, paste, and launch Telegram bot details with a simple copy-paste flow.</p>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center gap-2 text-primary text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" /> Special secret area
        </div>
        <p className="text-[11px] text-muted-foreground">Paste your Telegram bot token here temporarily, then copy it into the app secret area or Telegram bot management when needed.</p>
        <div className="space-y-2">
          <textarea
            value={secretValue}
            onChange={(e) => setSecretValue(e.target.value)}
            placeholder="Paste Telegram bot token here"
            className="w-full min-h-[88px] bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none resize-none text-foreground"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => copyText(secretValue, 'secret')}
              disabled={!secretValue.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Copy className="w-3.5 h-3.5" /> {copied === 'secret' ? 'Copied' : 'Copy token'}
            </button>
            <button
              onClick={() => window.open('https://t.me/BotFather', '_blank')}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open BotFather
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Bot className="w-3.5 h-3.5 text-primary" /> Copy-paste starter config
          </div>
          <div className="space-y-2 text-[11px] text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Bot name</p>
              <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                <span className="truncate">{DEFAULT_TEMPLATE.name}</span>
                <button onClick={() => copyText(DEFAULT_TEMPLATE.name, 'name')} className="text-primary"><Copy className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div>
              <p className="font-medium text-foreground">Welcome message</p>
              <div className="mt-1 flex items-start justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                <span className="text-[11px] leading-relaxed">{DEFAULT_TEMPLATE.greeting}</span>
                <button onClick={() => copyText(DEFAULT_TEMPLATE.greeting, 'greeting')} className="text-primary"><Copy className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div>
              <p className="font-medium text-foreground">System prompt</p>
              <div className="mt-1 flex items-start justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                <span className="text-[11px] leading-relaxed">{DEFAULT_TEMPLATE.prompt}</span>
                <button onClick={() => copyText(DEFAULT_TEMPLATE.prompt, 'prompt')} className="text-primary"><Copy className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <KeyRound className="w-3.5 h-3.5 text-primary" /> Clear instructions
          </div>
          <ol className="space-y-2 pl-4 text-[11px] leading-relaxed text-muted-foreground list-decimal">
            <li>Open BotFather and create a new Telegram bot.</li>
            <li>Paste the Telegram token into the special secret area above.</li>
            <li>Copy your bot name, welcome message, and prompt from this panel.</li>
            <li>Open Telegram Bot Management to create and enable the bot in the app.</li>
            <li>Use this webhook endpoint when needed: <span className="text-foreground">{webhookPath}</span></li>
          </ol>
          <div className="flex gap-2 flex-wrap pt-1">
            <button
              onClick={onOpenManagement}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              <Bot className="w-3.5 h-3.5" /> Open Telegram Bot Management
            </button>
            <button
              onClick={() => copyText(webhookPath, 'webhook')}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground"
            >
              <Copy className="w-3.5 h-3.5" /> {copied === 'webhook' ? 'Webhook copied' : 'Copy webhook URL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}