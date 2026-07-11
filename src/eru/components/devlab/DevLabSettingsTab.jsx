import { ShieldAlert, Settings, ExternalLink } from 'lucide-react';
import { PROVIDER_KEYS } from '@/eru/lib/devLab';

const PROVIDER_META = {
  openai:     { label: 'OpenAI',     desc: 'Plan & code generation via GPT models.' },
  anthropic:  { label: 'Anthropic',  desc: 'Plan & code generation via Claude models.' },
  gemini:     { label: 'Gemini',     desc: 'Plan & code generation via Gemini models.' },
  github:     { label: 'GitHub',     desc: 'Repository connector for real diff/PR flow.' },
  deployment: { label: 'Deployment', desc: 'Vercel / Netlify / custom deploy connector.' },
};

/**
 * DevLabSettingsTab — provider status. Honest by design: every provider
 * defaults to "Not Connected" until explicitly wired through secure server-
 * side functions. We do NOT accept secret entry on the client.
 */
export default function DevLabSettingsTab({ project, onToggleStatus, isOwner }) {
  const providerStatus = project?.provider_status || {};

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Settings className="h-3.5 w-3.5 text-primary" /> Provider connections
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
          Status mirrors what's actually wired in the platform. To connect a provider, configure it as a server-side secret or app connector. The Lab does not accept API keys in the browser.
        </p>
      </div>

      <ul className="space-y-2">
        {PROVIDER_KEYS.map((key) => {
          const meta = PROVIDER_META[key];
          const status = providerStatus[key] || 'not_connected';
          const connected = status === 'connected';
          return (
            <li key={key} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{meta.label}</p>
                  <p className="text-[11px] text-muted-foreground">{meta.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      connected
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : 'bg-secondary text-muted-foreground border-border'
                    }`}
                  >
                    {connected ? 'Connected' : 'Not Connected'}
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => onToggleStatus(key, connected ? 'not_connected' : 'connected')}
                      className="rounded-lg border border-border bg-secondary px-2.5 py-1 text-[10px] text-muted-foreground"
                      title="Mark this provider's status (does not store secrets)"
                    >
                      Mark {connected ? 'unwired' : 'wired'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-amber-300">
          <ShieldAlert className="h-3.5 w-3.5" /> Setup-required policy
        </p>
        <ul className="mt-2 space-y-1 text-[11px] text-amber-200/90 leading-relaxed">
          <li>• No client-side secret entry. Provider keys must live in platform secrets.</li>
          <li>• "Mark wired" is a project flag, not a real connection. Real connections are detected server-side.</li>
          <li>• When unset, plans run as Templates and patches are manual exports.</li>
        </ul>
        <a
          href="/apikeys"
          className="mt-3 inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-300"
        >
          Open API Keys <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}