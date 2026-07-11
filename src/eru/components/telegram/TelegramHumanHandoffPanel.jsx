import { LifeBuoy, PauseCircle } from 'lucide-react';

export default function TelegramHumanHandoffPanel({ form, setForm, sessions = [] }) {
  const activeHandoffs = sessions.filter((session) => session.human_handoff_status === 'requested' || session.human_handoff_status === 'active');

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <LifeBuoy className="w-4 h-4 text-amber-400" />
        <p className="text-sm font-semibold text-foreground">Human handoff</p>
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground">
        <input
          type="checkbox"
          checked={!!form.human_handoff_enabled}
          onChange={(e) => setForm((prev) => ({ ...prev, human_handoff_enabled: e.target.checked }))}
          className="accent-primary"
        />
        Enable human handoff detection
      </label>

      {form.human_handoff_enabled && (
        <>
          <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.human_handoff_pause_ai ?? true}
              onChange={(e) => setForm((prev) => ({ ...prev, human_handoff_pause_ai: e.target.checked }))}
              className="accent-primary"
            />
            Pause AI replies when handoff is active
          </label>

          <input
            value={form.human_handoff_admin_chat_id || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, human_handoff_admin_chat_id: e.target.value }))}
            placeholder="Telegram admin chat ID for alerts"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
          />

          <textarea
            value={(form.human_handoff_keywords || []).join(', ')}
            onChange={(e) => setForm((prev) => ({
              ...prev,
              human_handoff_keywords: e.target.value.split(',').map((item) => item.trim()).filter(Boolean)
            }))}
            placeholder="human, support, refund, complaint"
            className="w-full min-h-[82px] rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none resize-none"
          />

          <div className="rounded-xl border border-border bg-background p-3 text-[11px] text-muted-foreground">
            Alerts go to the dashboard and the admin Telegram chat. Users can also trigger handoff by sending one of the keywords above.
          </div>
        </>
      )}

      <div className="rounded-xl border border-border bg-background p-3 space-y-2">
        <div className="flex items-center gap-2">
          <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
          <p className="text-xs font-semibold text-foreground">Active handoffs</p>
        </div>
        {activeHandoffs.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No active handoff sessions.</p>
        ) : (
          <div className="space-y-2">
            {activeHandoffs.slice(0, 5).map((session) => (
              <div key={session.id} className="rounded-lg border border-border bg-card p-2.5">
                <p className="text-xs font-medium text-foreground">{session.telegram_username || session.telegram_chat_id}</p>
                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{session.human_handoff_reason || session.last_user_message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}