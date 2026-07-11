import { Bot, Key, CheckCircle2, Eye, ShieldAlert, Sparkles } from 'lucide-react';

function PreviewCard({ title, icon: IconComponent, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <IconComponent className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function FoundryControlPanel({ preview, onConfirm, onDiscard, busy }) {
  if (!preview) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Jackie Foundry</h3>
        </div>
        <p className="text-xs text-muted-foreground">Jackie can prepare bot and API key changes, but will preview them and wait for your approval before applying anything sensitive.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-4">
      <div className="flex items-start gap-2">
        <Eye className="w-4 h-4 text-primary mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold">Preview before confirm</h3>
          <p className="text-xs text-muted-foreground">Nothing below is applied until you confirm.</p>
        </div>
      </div>

      {preview.bot && (
        <PreviewCard title="Bot draft" icon={Bot}>
          <div className="space-y-1 text-xs">
            <p><span className="text-muted-foreground">Name:</span> {preview.bot.name || 'Untitled bot'}</p>
            <p><span className="text-muted-foreground">Role:</span> {preview.bot.role || 'assistant'}</p>
            <p><span className="text-muted-foreground">Style:</span> {preview.bot.response_style || 'detailed'}</p>
            {preview.bot.description && <p><span className="text-muted-foreground">Description:</span> {preview.bot.description}</p>}
            {preview.bot.instructions && <p className="text-muted-foreground">Instructions preview: {preview.bot.instructions.slice(0, 180)}</p>}
          </div>
        </PreviewCard>
      )}

      {preview.apiKey && (
        <PreviewCard title="API key draft" icon={Key}>
          <div className="space-y-2 text-xs">
            <p><span className="text-muted-foreground">Name:</span> {preview.apiKey.name || 'Untitled key'}</p>
            <p><span className="text-muted-foreground">Linked bot:</span> {preview.apiKey.botName || 'No linked bot'}</p>
            <div>
              <p className="text-muted-foreground mb-1">Permissions</p>
              <div className="flex flex-wrap gap-1">
                {(preview.apiKey.permissions || []).map((item) => (
                  <span key={item} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </PreviewCard>
      )}

      <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-3 flex gap-2">
        <ShieldAlert className="w-4 h-4 text-yellow-400 mt-0.5" />
        <p className="text-[11px] text-yellow-400">Sensitive changes require explicit confirmation unless you tell Jackie to complete the project directly.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-semibold disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" /> Confirm and apply
        </button>
        <button
          onClick={onDiscard}
          disabled={busy}
          className="flex-1 bg-secondary border border-border rounded-xl py-2.5 text-xs text-muted-foreground"
        >
          Discard preview
        </button>
      </div>
    </div>
  );
}