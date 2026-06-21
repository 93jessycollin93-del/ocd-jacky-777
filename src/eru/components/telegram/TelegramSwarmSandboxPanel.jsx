import { useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { FlaskConical, Loader2, Send, Sparkles } from 'lucide-react';

export default function TelegramSwarmSandboxPanel({ bot, sessions = [] }) {
  const [message, setMessage] = useState('');
  const [userLabel, setUserLabel] = useState('@sandbox_user');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const latestSession = useMemo(() => sessions[0] || null, [sessions]);

  if (!bot?.swarm_enabled) return null;

  const runSimulation = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await base44.functions.invoke('simulateTelegramSwarm', {
        botId: bot.id,
        incomingText: message,
        userLabel,
        sessionContext: latestSession?.context_override || latestSession?.memory_summary || ''
      });
      setResult(response.data || null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <FlaskConical className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Swarm testing sandbox</p>
          <p className="text-[11px] text-muted-foreground mt-1">Simulate incoming Telegram messages and inspect router + specialist behavior without sending live bot messages.</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[200px,1fr]">
        <input
          value={userLabel}
          onChange={(e) => setUserLabel(e.target.value)}
          placeholder="Simulated user"
          className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message to see how the swarm routes it"
          className="min-h-[110px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none resize-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runSimulation}
          disabled={loading || !message.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Run simulation
        </button>
        <button
          type="button"
          onClick={() => {
            setMessage('How would you help a customer who wants pricing, onboarding, and technical support?');
            setUserLabel('@sandbox_user');
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium"
        >
          <Sparkles className="w-4 h-4 text-primary" /> Use example
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Final reply</p>
            <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{result.reply || 'No reply generated.'}</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-semibold">Selected specialists</p>
              <p className="mt-2 text-xs text-muted-foreground">{(result.specialists_used || []).length ? result.specialists_used.join(', ') : 'None selected'}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-semibold">Routing plan</p>
              <pre className="mt-2 text-[11px] text-muted-foreground whitespace-pre-wrap break-words">{JSON.stringify(result.routing_plan || {}, null, 2)}</pre>
            </div>
          </div>

          {!!result.trace?.length && (
            <div className="space-y-2">
              {result.trace.map((item, index) => (
                <div key={`${item.bot_id || item.bot_name}_${index}`} className="rounded-xl border border-border bg-background p-3 space-y-2">
                  <div>
                    <p className="text-xs font-semibold">{item.bot_name || 'Specialist'}</p>
                    <p className="text-[11px] text-muted-foreground">{item.delegated_assignment || 'No delegated assignment'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground mb-1">Contribution</p>
                    <p className="text-xs text-foreground whitespace-pre-wrap break-words">{item.result || 'No result'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}