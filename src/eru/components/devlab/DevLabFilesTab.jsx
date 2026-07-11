import { useState } from 'react';
import { FileCode, Plus, Trash2, AlertTriangle } from 'lucide-react';
import ConfirmDialog from '@/eru/components/ConfirmDialog';

const FILE_TYPES = ['page', 'component', 'entity', 'function', 'lib', 'style', 'config', 'other'];
const RISK_LEVELS = ['safe', 'medium', 'high', 'critical'];
const RISK_TONE = {
  safe:     'bg-secondary text-muted-foreground border-border',
  medium:   'bg-amber-500/10 text-amber-300 border-amber-500/30',
  high:     'bg-orange-500/10 text-orange-300 border-orange-500/30',
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
};

/**
 * DevLabFilesTab — manual file references. Honest about not having
 * filesystem access: users add paths/snippets by hand, the inspector then
 * surfaces them as @file context to plans.
 */
export default function DevLabFilesTab({ files = [], onCreate, onUpdate, onDelete, isOwner }) {
  const [draft, setDraft] = useState({ path: '', file_type: 'component', summary: '', risk_level: 'safe' });
  const [pendingDelete, setPendingDelete] = useState(null);

  const handleCreate = async () => {
    if (!draft.path.trim()) return;
    await onCreate({ ...draft, path: draft.path.trim() });
    setDraft({ path: '', file_type: 'component', summary: '', risk_level: 'safe' });
  };

  const missing = files.length === 0;

  return (
    <div className="space-y-3">
      {isOwner && (
        <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">Add a file reference</p>
          <input
            value={draft.path}
            onChange={(e) => setDraft((p) => ({ ...p, path: e.target.value }))}
            placeholder="e.g. pages/Dashboard.jsx"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono text-foreground outline-none"
          />
          <textarea
            value={draft.summary}
            onChange={(e) => setDraft((p) => ({ ...p, summary: e.target.value }))}
            placeholder="What does this file do? (optional)"
            rows={2}
            className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
          />
          <div className="flex gap-2">
            <select
              value={draft.file_type}
              onChange={(e) => setDraft((p) => ({ ...p, file_type: e.target.value }))}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground outline-none"
            >
              {FILE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={draft.risk_level}
              onChange={(e) => setDraft((p) => ({ ...p, risk_level: e.target.value }))}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground outline-none"
            >
              {RISK_LEVELS.map((r) => <option key={r} value={r}>risk: {r}</option>)}
            </select>
            <button
              onClick={handleCreate}
              disabled={!draft.path.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      )}

      {missing ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <FileCode className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium text-foreground">No file references yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add the files relevant to your current change so plans can reference them.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-foreground break-all">{f.path}</p>
                  {f.summary && <p className="mt-1 text-[11px] text-muted-foreground">{f.summary}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                      {f.file_type || 'other'}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wide ${RISK_TONE[f.risk_level] || RISK_TONE.safe}`}>
                      risk: {f.risk_level || 'safe'}
                    </span>
                  </div>
                </div>
                {isOwner && (
                  <button
                    onClick={() => setPendingDelete(f)}
                    className="rounded-lg border border-border bg-secondary px-2 py-1 text-muted-foreground hover:text-destructive"
                    aria-label="Delete file"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200/90">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-400 mt-0.5" />
        File references are descriptive only. Jackie Dev Lab does not read your filesystem.
      </p>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Remove "${pendingDelete?.path}"?`}
        description="This removes the file reference. The file in your project is unaffected."
        confirmLabel="Remove"
        tone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          await onDelete(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}