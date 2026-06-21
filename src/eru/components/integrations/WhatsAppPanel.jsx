import { useState, useMemo } from 'react';
import { MessageCircle, ShieldAlert, Inbox, Send, FileText, Copy, CheckCircle2, X } from 'lucide-react';
import IntegrationStatusBadge from './IntegrationStatusBadge';
import { STATUS } from '@/eru/lib/integrationRegistry';
import { useRealtimeEntityList } from '@/eru/hooks/useLiveSync';
import { base44 } from '@/eru/api/base44Client';

/**
 * WhatsAppPanel — flagship integration setup. Two paths:
 *   1) Meta Cloud API
 *   2) Twilio WhatsApp
 *
 * Honest behavior:
 *   - Status defaults to Not Connected.
 *   - No secret values are accepted from the browser.
 *   - Outgoing composer + template manager stay disabled until status === connected.
 *   - Webhook URL surfaces the backend function paths so the owner can register them.
 */
export default function WhatsAppPanel({ metaEntry, twilioEntry, onClose, isAdmin, appBaseUrl }) {
  const [provider, setProvider] = useState(metaEntry?.status === STATUS.CONNECTED ? 'meta'
    : twilioEntry?.status === STATUS.CONNECTED ? 'twilio'
    : 'meta');
  const active = provider === 'meta' ? metaEntry : twilioEntry;
  const connected = active?.status === STATUS.CONNECTED;

  const webhookReceiveUrl = useMemo(() => {
    const base = appBaseUrl || '';
    return base ? `${base.replace(/\/$/, '')}/functions/whatsappWebhookReceive` : 'whatsappWebhookReceive (configure APP_BASE_URL secret to see full URL)';
  }, [appBaseUrl]);
  const webhookVerifyUrl = useMemo(() => {
    const base = appBaseUrl || '';
    return base ? `${base.replace(/\/$/, '')}/functions/whatsappWebhookVerify` : 'whatsappWebhookVerify (configure APP_BASE_URL secret to see full URL)';
  }, [appBaseUrl]);

  const { data: events } = useRealtimeEntityList('IntegrationWebhookEvent', {
    sort: '-receivedAt', limit: 25,
    enabled: !!isAdmin,
  });
  const whatsappEvents = (events || []).filter((e) =>
    e.providerKey === 'whatsapp_meta' || e.providerKey === 'whatsapp_twilio'
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-2xl border-t border-border bg-card text-foreground"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Flagship Integration</p>
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <MessageCircle className="h-4 w-4 text-primary" /> WhatsApp Business
            </h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <IntegrationStatusBadge status={active?.status || STATUS.NOT_CONNECTED} />
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {provider === 'meta' ? 'Meta Cloud API' : 'Twilio WhatsApp'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full border border-border bg-secondary p-1.5 text-muted-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Compliance + no-fake banner */}
          <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-yellow-300 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-snug text-foreground">
                <span className="font-semibold">Compliance:</span> only message users who have opted in. Respect WhatsApp Business Policy and the 24-hour customer service window.
                ERU never sends messages until the integration is verified and the recipient has opt-in on file.
              </p>
            </div>
          </div>

          {/* Provider selector */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Choose setup path</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <PathButton
                active={provider === 'meta'}
                title="Meta Cloud API"
                subtitle="Direct from Meta"
                onClick={() => setProvider('meta')}
              />
              <PathButton
                active={provider === 'twilio'}
                title="Twilio WhatsApp"
                subtitle="Via Twilio Messaging"
                onClick={() => setProvider('twilio')}
              />
            </div>
          </section>

          {/* Setup checklist for chosen path */}
          {provider === 'meta' ? (
            <MetaSetupChecklist entry={metaEntry} webhookReceiveUrl={webhookReceiveUrl} webhookVerifyUrl={webhookVerifyUrl} />
          ) : (
            <TwilioSetupChecklist entry={twilioEntry} webhookReceiveUrl={webhookReceiveUrl} />
          )}

          {/* Outgoing composer */}
          <OutgoingComposer disabled={!connected} provider={provider} isAdmin={isAdmin} />

          {/* Templates */}
          <TemplatesPanel disabled={!connected} />

          {/* Incoming log */}
          <IncomingLog events={whatsappEvents} />
        </div>
      </div>
    </div>
  );
}

function PathButton({ active, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-colors ${
        active ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/30'
      }`}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
    </button>
  );
}

function CopyableField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ }
  };
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <button onClick={onCopy} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
          {copied ? <><CheckCircle2 className="h-3 w-3 text-primary" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>
      <p className="mt-1 break-all font-mono text-[11px] text-foreground">{value}</p>
    </div>
  );
}

function MetaSetupChecklist({ entry, webhookReceiveUrl, webhookVerifyUrl }) {
  const required = entry?.requiresSecrets || [];
  return (
    <section className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Meta Cloud API setup</p>
      <ChecklistItem n={1} title="Create a WhatsApp Business app in Meta">
        Create the app at developers.facebook.com → My Apps → WhatsApp.
      </ChecklistItem>
      <ChecklistItem n={2} title="Add server-side secrets">
        <p>Set these in the app secrets — never paste them in this UI:</p>
        <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-foreground/80">
          {required.map((s) => <li key={s}>• {s}</li>)}
        </ul>
      </ChecklistItem>
      <ChecklistItem n={3} title="Register the webhook callback URL">
        <CopyableField label="Webhook callback (POST)" value={webhookReceiveUrl} />
        <CopyableField label="Webhook verify (GET)" value={webhookVerifyUrl} />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Use <span className="font-mono">WHATSAPP_META_VERIFY_TOKEN</span> as the Meta verify token.
        </p>
      </ChecklistItem>
      <ChecklistItem n={4} title="Subscribe to messages event in Meta dashboard" />
      <ChecklistItem n={5} title="Run a verified test message">
        Once Meta sends a verified webhook, ERU flips status to Connected automatically.
      </ChecklistItem>
    </section>
  );
}

function TwilioSetupChecklist({ entry, webhookReceiveUrl }) {
  const required = entry?.requiresSecrets || [];
  return (
    <section className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Twilio WhatsApp setup</p>
      <ChecklistItem n={1} title="Provision a Twilio WhatsApp sender" />
      <ChecklistItem n={2} title="Add server-side secrets">
        <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-foreground/80">
          {required.map((s) => <li key={s}>• {s}</li>)}
        </ul>
      </ChecklistItem>
      <ChecklistItem n={3} title="Point Twilio inbound webhook to ERU">
        <CopyableField label="Inbound webhook" value={webhookReceiveUrl} />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Set the channel "When a message comes in" to a POST request at the URL above.
        </p>
      </ChecklistItem>
      <ChecklistItem n={4} title="Verify a real round-trip">
        Send a test message from a registered sandbox number; once received, ERU flips to Connected.
      </ChecklistItem>
    </section>
  );
}

function ChecklistItem({ n, title, children }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <p className="text-sm font-medium text-foreground">
        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[10px] font-mono text-primary">{n}</span>
        {title}
      </p>
      {children && <div className="mt-1.5 text-[11px] text-muted-foreground space-y-1.5">{children}</div>}
    </div>
  );
}

function OutgoingComposer({ disabled, provider, isAdmin }) {
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const send = async () => {
    if (disabled || !to || !text || !isAdmin) return;
    setSending(true); setResult(null);
    try {
      const res = await base44.functions.invoke('whatsappSendMessage', { provider, to, text });
      setResult(res?.data?.error ? { error: res.data.error } : { ok: true });
      if (!res?.data?.error) setText('');
    } catch (e) {
      setResult({ error: e?.message || 'Failed' });
    }
    setSending(false);
  };

  return (
    <section className={`rounded-2xl border p-3 ${disabled ? 'border-border bg-secondary/20 opacity-60' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-2">
        <Send className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold text-foreground">Send a message</p>
        {disabled && <span className="text-[10px] text-muted-foreground">Disabled until verified</span>}
      </div>
      <div className="mt-2 space-y-2">
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          disabled={disabled}
          placeholder="Recipient (E.164, e.g. +14155550100)"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono text-foreground outline-none disabled:opacity-50"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          rows={3}
          placeholder="Plain text message — only allowed inside the 24h customer service window."
          className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={disabled || sending || !to || !text || !isAdmin}
          className="w-full rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send via verified provider'}
        </button>
        {result?.ok && <p className="text-[11px] text-primary">Sent. Check delivery status in the audit log.</p>}
        {result?.error && <p className="text-[11px] text-destructive">{result.error}</p>}
      </div>
    </section>
  );
}

function TemplatesPanel({ disabled }) {
  return (
    <section className={`rounded-2xl border p-3 ${disabled ? 'border-border bg-secondary/20 opacity-60' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold text-foreground">Template messages</p>
        {disabled && <span className="text-[10px] text-muted-foreground">Disabled until verified</span>}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Templates must be approved in the provider dashboard before ERU can send them.
        Once verified, approved template names will appear here.
      </p>
    </section>
  );
}

function IncomingLog({ events }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Inbox className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold text-foreground">Incoming messages & webhook events</p>
      </div>
      {!events?.length ? (
        <p className="mt-2 rounded-xl border border-dashed border-border bg-secondary/20 p-3 text-center text-[11px] text-muted-foreground">
          No verified WhatsApp messages yet.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {events.map((ev) => (
            <li key={ev.id} className="rounded-xl border border-border bg-secondary/30 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-foreground truncate">{ev.eventType}</p>
                <span className={`text-[10px] uppercase tracking-wide ${
                  ev.verificationStatus === 'verified' ? 'text-primary'
                  : ev.verificationStatus === 'rejected' ? 'text-destructive'
                  : 'text-muted-foreground'
                }`}>
                  {ev.verificationStatus}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground truncate">
                {ev.summary || '—'} · {new Date(ev.receivedAt || ev.created_date).toLocaleString()}
              </p>
              {ev.errorMessage && <p className="mt-0.5 text-[10px] text-destructive truncate">{ev.errorMessage}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}