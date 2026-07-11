export default function TelegramLogPanel({ logs = [] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-semibold">Recent activity</h3>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No logs yet</p>
      ) : (
        <div className="space-y-2 max-h-[24rem] overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="rounded-xl border border-border bg-secondary/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-wide text-primary">{log.direction}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(log.created_date).toLocaleString()}</span>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap break-words">{log.message_text || log.error_message || 'No content'}</p>
              {log.latency_ms ? <p className="text-[10px] text-muted-foreground mt-1">Latency: {log.latency_ms} ms</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}