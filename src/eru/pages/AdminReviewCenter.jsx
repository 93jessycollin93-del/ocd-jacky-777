import { useEffect, useMemo, useState } from 'react';
import { ShieldAlert, Settings2, Globe, Plus, Trash2, AlertTriangle, History, RefreshCw, Check } from 'lucide-react';
import PermissionGate from '@/eru/components/PermissionGate';
import ConfirmDialog from '@/eru/components/ConfirmDialog';
import { useAuth } from '@/eru/lib/AuthContext';
import { isAdmin } from '@/eru/lib/permissions';
import { isSafeEmbedUrl } from '@/eru/lib/safeUrl';
import { logAuditEvent, readLocalAuditRing } from '@/eru/lib/auditEvents';
import {
  EXTERNAL_PORTALS,
  getCustomPortals,
  saveCustomPortal,
  deleteCustomPortal,
  getPortalUrl,
  setPortalUrlOverride,
} from '@/eru/lib/externalPortals';
import { base44 } from '@/eru/api/base44Client';

/**
 * Admin Review Center
 * ----------------------------------------------------------------------------
 * Single place for owner/admin to:
 *   - Spot integrations / portals that aren't configured
 *   - Manage external embed URLs (built-in + custom)
 *   - Review the recent audit ring (denials, listing edits, portal changes…)
 *   - Find storefronts flagged "needs_owner_review"
 *
 * Read-only audit log + truthful "Not connected" states. No destructive
 * actions are performed without an explicit ConfirmDialog.
 * --------------------------------------------------------------------------*/
export default function AdminReviewCenter() {
  return (
    <PermissionGate allow={isAdmin} deniedTitle="Admin only" deniedMessage="The Admin Review Center is restricted to admins.">
      <ReviewCenterInner />
    </PermissionGate>
  );
}

function ReviewCenterInner() {
  const { user } = useAuth();
  const [customPortals, setCustomPortals] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [flaggedStorefronts, setFlaggedStorefronts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setCustomPortals(getCustomPortals());
    setAuditEvents(readLocalAuditRing().slice(0, 30));
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await base44.entities.StorefrontCustomization
        .filter({ needs_owner_review: true })
        .catch(() => []);
      if (!cancelled) setFlaggedStorefronts(rows || []);
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const builtInPortals = Object.values(EXTERNAL_PORTALS);
  const allPortals = useMemo(
    () => [...builtInPortals, ...customPortals].map((p) => ({ ...p, currentUrl: getPortalUrl(p.id) })),
     
    [customPortals, refreshKey]
  );
  const unconfigured = allPortals.filter((p) => !p.currentUrl);

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteCustomPortal(pendingDelete.id);
    logAuditEvent(user, {
      action: 'external_portal.delete',
      target_type: 'ExternalPortal',
      target_id: pendingDelete.id,
      before: { name: pendingDelete.name, url: pendingDelete.currentUrl || null },
      after: null,
    });
    setPendingDelete(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 flex-shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">Admin Review Center</h1>
            <p className="text-[11px] text-muted-foreground truncate">Setup gaps, embeds, audit, moderation</p>
          </div>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="p-1.5 rounded-lg bg-secondary hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <SummaryCard
          unconfiguredCount={unconfigured.length}
          customCount={customPortals.length}
          flaggedCount={flaggedStorefronts.length}
          auditCount={auditEvents.length}
        />

        <SectionCard
          title="External embed portals"
          icon={Globe}
          actionLabel="Add portal"
          onAction={() => setShowAdd(true)}
        >
          {allPortals.length === 0 && <EmptyRow text="No portals registered." />}
          {allPortals.map((p) => (
            <PortalRow
              key={p.id}
              portal={p}
              isCustom={!EXTERNAL_PORTALS[p.id]}
              onChangeUrl={(value) => {
                const trimmed = value.trim();
                if (trimmed && !isSafeEmbedUrl(trimmed)) return;
                const previous = p.currentUrl;
                setPortalUrlOverride(p.id, trimmed);
                logAuditEvent(user, {
                  action: 'external_portal.update',
                  target_type: 'ExternalPortal',
                  target_id: p.id,
                  before: { url: previous || null },
                  after: { url: trimmed || null },
                });
                setRefreshKey((k) => k + 1);
              }}
              onDelete={() => setPendingDelete(p)}
            />
          ))}
        </SectionCard>

        <SectionCard title="Storefronts flagged for review" icon={AlertTriangle}>
          {flaggedStorefronts.length === 0 && <EmptyRow text="Nothing flagged." />}
          {flaggedStorefronts.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.store_name || s.store_slug}</p>
                <p className="text-[11px] text-muted-foreground truncate">{s.owner_email} · visibility: {s.visibility}</p>
              </div>
              <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[10px] text-yellow-400 flex-shrink-0">Needs review</span>
            </div>
          ))}
        </SectionCard>

        <SectionCard title="Recent audit events" icon={History}>
          {auditEvents.length === 0 && <EmptyRow text="No audit events recorded yet." />}
          {auditEvents.map((evt, idx) => (
            <AuditRow key={idx} event={evt} />
          ))}
          <p className="text-[10px] text-muted-foreground/70 px-1">
            Local ring buffer — server-side audit log lives in EconomyAuditLog and is the source of truth.
          </p>
        </SectionCard>
      </div>

      {showAdd && <AddPortalDialog onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); setRefreshKey((k) => k + 1); }} user={user} />}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove this portal?"
        description={`"${pendingDelete?.name}" will be removed from this browser. Built-in portals can't be removed.`}
        confirmLabel="Remove"
        tone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function SummaryCard({ unconfiguredCount, customCount, flaggedCount, auditCount }) {
  const items = [
    { label: 'Portals not configured', value: unconfiguredCount, tone: unconfiguredCount > 0 ? 'warn' : 'ok' },
    { label: 'Custom portals', value: customCount, tone: 'neutral' },
    { label: 'Storefronts flagged', value: flaggedCount, tone: flaggedCount > 0 ? 'warn' : 'ok' },
    { label: 'Recent audit events', value: auditCount, tone: 'neutral' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((it) => (
        <div key={it.label} className={`rounded-2xl border p-3 ${
          it.tone === 'warn' ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-border bg-card/80'
        }`}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{it.label}</p>
          <p className={`text-2xl font-semibold ${it.tone === 'warn' ? 'text-yellow-400' : 'text-foreground'}`}>{it.value}</p>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, icon: Icon, actionLabel, onAction, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">{title}</p>
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-semibold flex-shrink-0"
          >
            <Plus className="w-3 h-3" /> {actionLabel}
          </button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptyRow({ text }) {
  return <p className="text-xs text-muted-foreground/70 italic px-1">{text}</p>;
}

function PortalRow({ portal, isCustom, onChangeUrl, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(portal.currentUrl || '');
  const [error, setError] = useState('');

  const submit = () => {
    if (draft && !isSafeEmbedUrl(draft)) { setError('https URL required'); return; }
    onChangeUrl(draft);
    setEditing(false);
    setError('');
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
          <Globe className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{portal.name}</p>
            {!portal.currentUrl && (
              <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[10px] text-yellow-400 flex-shrink-0">Setup required</span>
            )}
            {isCustom && (
              <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground flex-shrink-0">Custom</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{portal.description || portal.id}</p>
          {portal.currentUrl && !editing && (
            <p className="text-[11px] font-mono text-foreground/80 truncate mt-1">{portal.currentUrl}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => { setDraft(portal.currentUrl || ''); setEditing((v) => !v); setError(''); }}
            className="p-1.5 rounded-lg bg-secondary hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Configure URL"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          {isCustom && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg bg-secondary hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Delete portal"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {editing && (
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(''); }}
            placeholder="https://your-portal.example.com"
            className="flex-1 h-9 rounded-xl border border-border bg-card px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button onClick={submit} className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1 justify-center">
            <Check className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function AddPortalDialog({ onClose, onSaved, user }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!url.trim() || !isSafeEmbedUrl(url.trim())) { setError('Valid https URL required'); return; }
    const id = `custom_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}_${Date.now().toString(36)}`;
    saveCustomPortal({ id, name: name.trim(), description: description.trim(), defaultUrl: url.trim() });
    logAuditEvent(user, { action: 'external_portal.create', target_type: 'ExternalPortal', target_id: id, after: { name: name.trim(), url: url.trim() } });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card text-foreground shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="p-4 border-b border-border">
          <p className="text-sm font-semibold">Add external portal</p>
          <p className="text-[11px] text-muted-foreground mt-1">External content runs in a sandboxed iframe. If embedding is blocked, users see an "Open externally" fallback.</p>
        </div>
        <div className="p-4 space-y-3">
          <Field label="Portal name *">
            <input className="w-full h-10 rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={name} onChange={(e) => setName(e.target.value)} placeholder="My external store" />
          </Field>
          <Field label="URL (https) *">
            <input className="w-full h-10 rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://my-store.example.com" />
          </Field>
          <Field label="Description (optional)">
            <input className="w-full h-10 rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={140} />
          </Field>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border bg-secondary py-2.5 text-sm font-medium">Cancel</button>
          <button onClick={submit} className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold">Add portal</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

function AuditRow({ event }) {
  const tone = event.status === 'denied' ? 'text-yellow-400'
    : event.status === 'failure' ? 'text-destructive'
    : 'text-primary';
  const time = event.timestamp ? new Date(event.timestamp).toLocaleString() : '';
  return (
    <div className="rounded-xl border border-border bg-card/40 p-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className={`font-mono ${tone} truncate`}>{event.action}</p>
        <p className="text-[10px] text-muted-foreground/70 flex-shrink-0">{time}</p>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        {event.actor_email && <span>by {event.actor_email}</span>}
        {event.target_type && <span>{event.target_type}{event.target_id ? `:${String(event.target_id).slice(0, 8)}` : ''}</span>}
        {event.status && event.status !== 'success' && <span className={tone}>{event.status}{event.reason ? ` · ${event.reason}` : ''}</span>}
      </div>
    </div>
  );
}