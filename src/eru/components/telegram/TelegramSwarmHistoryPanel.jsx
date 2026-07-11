import { useMemo, useState } from 'react';
import { Eye, Pencil, Trash2, Save, RotateCcw, Network } from 'lucide-react';

function formatName(session) {
  return session.telegram_username ? `@${session.telegram_username}` : session.telegram_user_id || session.telegram_chat_id;
}

export default function TelegramSwarmHistoryPanel({ bot, sessions = [], onSaveContext, onPurgeHistory, savingContext, purgingHistory }) {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [draftContext, setDraftContext] = useState('');
  const [showEditor, setShowEditor] = useState(false);

  const swarmSessions = useMemo(
    () => sessions.filter((session) => (session.swarm_history || []).length > 0 || session.context_override),
    [sessions]
  );

  const selectedSession = swarmSessions.find((session) => session.id === selectedSessionId) || swarmSessions[0] || null;
  const selectedRun = selectedSession?.swarm_history?.[selectedSession.swarm_history.length - 1] || null;

  const openEditor = () => {
    setDraftContext(selectedSession?.context_override || selectedSession?.memory_summary || '');
    setShowEditor(true);
  };

  if (!bot?.swarm_enabled) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Swarm context viewer</p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Inspect the exact router and specialist context used per user, then edit or purge saved history.</p>
        </div>
      </div>

      {swarmSessions.length === 0 ? (
        <div className="rounded-xl border border-border bg-background p-4 text-xs text-muted-foreground">
          No swarm conversation history yet for this bot.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
          <div className="space-y-2 max-h-[28rem] overflow-y-auto">
            {swarmSessions.map((session) => {
              const active = selectedSession?.id === session.id;
              return (
                <button
                  key={session.id}
                  onClick={() => {
                    setSelectedSessionId(session.id);
                    setShowEditor(false);
                  }}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${active ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold truncate">{formatName(session)}</p>
                    <span className="text-[10px] text-muted-foreground">{session.message_count || 0}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{session.last_user_message || 'No recent message'}</p>
                </button>
              );
            })}
          </div>

          {selectedSession && (
            <div className="space-y-3 min-w-0">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">User</p>
                  <p className="mt-1 text-sm font-semibold break-words">{formatName(selectedSession)}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">Last message</p>
                  <p className="mt-1 text-sm font-semibold">{selectedSession.last_message_at ? new Date(selectedSession.last_message_at).toLocaleString() : '—'}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">Swarm runs</p>
                  <p className="mt-1 text-sm font-semibold">{selectedSession.swarm_history?.length || 0}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={openEditor} className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-medium">
                  <Pencil className="w-3.5 h-3.5" /> Edit context
                </button>
                <button onClick={() => onPurgeHistory?.(selectedSession)} disabled={purgingHistory} className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" /> Purge history
                </button>
              </div>

              {showEditor && (
                <div className="rounded-xl border border-border bg-background p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">Context override</p>
                    <button onClick={() => setDraftContext(selectedSession.memory_summary || '')} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                  <textarea
                    value={draftContext}
                    onChange={(e) => setDraftContext(e.target.value)}
                    className="w-full min-h-[120px] rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none resize-none"
                    placeholder="Edit the saved context used for future swarm runs"
                  />
                  <button
                    onClick={() => onSaveContext?.(selectedSession, draftContext)}
                    disabled={savingContext}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" /> Save context
                  </button>
                </div>
              )}

              {selectedSession.context_override && !showEditor && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <p className="text-[10px] uppercase text-primary">Active override</p>
                  <p className="mt-1 text-xs text-foreground whitespace-pre-wrap">{selectedSession.context_override}</p>
                </div>
              )}

              {selectedRun ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs font-semibold">Router context</p>
                    </div>
                    <p className="text-xs text-foreground whitespace-pre-wrap break-words">{selectedRun.router_context || 'No router context saved.'}</p>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-xs font-semibold mb-2">Routing plan</p>
                    <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words">{JSON.stringify(selectedRun.routing_plan || {}, null, 2)}</pre>
                  </div>

                  <div className="space-y-2">
                    {(selectedRun.specialist_contexts || []).map((item, index) => (
                      <div key={`${item.bot_id || item.bot_name}_${index}`} className="rounded-xl border border-border bg-background p-3 space-y-2">
                        <div>
                          <p className="text-xs font-semibold">{item.bot_name || 'Specialist'}</p>
                          <p className="text-[11px] text-muted-foreground">{item.delegated_assignment || 'No delegated assignment saved.'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground mb-1">Prompt context</p>
                          <p className="text-xs text-foreground whitespace-pre-wrap break-words">{item.prompt_context || 'No prompt context saved.'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground mb-1">Result</p>
                          <p className="text-xs text-foreground whitespace-pre-wrap break-words">{item.result || 'No result saved.'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-background p-4 text-xs text-muted-foreground">
                  No saved swarm run details for this user yet.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}