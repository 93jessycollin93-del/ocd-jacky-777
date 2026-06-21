import { useEffect, useState } from 'react';
import { Save, Eye, EyeOff, Image as ImageIcon, AlertTriangle, ShieldCheck } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import { isSafeImageUrl } from '@/eru/lib/safeUrl';
import { logAuditEvent } from '@/eru/lib/auditEvents';
import { isAdmin } from '@/eru/lib/permissions';

/**
 * StorefrontCustomizationPanel
 * ----------------------------------------------------------------------------
 * Owner/admin-only panel to configure a storefront's visual layout, layout
 * density, gallery style, featured section, section order, CTA, and policy
 * text. All edits are validated, audit-logged, and saved to the
 * StorefrontCustomization entity.
 *
 * Props:
 *   storeSlug    – unique slug for the storefront record
 *   ownerEmail   – seller/owner email (defaults to current user)
 *   onSaved?     – callback after successful save
 *
 * Real RLS lives on the StorefrontCustomization entity. This panel only
 * renders the UI layer and the optimistic save flow.
 * --------------------------------------------------------------------------*/

const DEFAULTS = {
  store_name: '',
  store_tagline: '',
  store_description: '',
  banner_image_url: '',
  banner_gradient: 'midnight',
  logo_url: '',
  theme_preset: 'midnight',
  card_density: 'comfortable',
  visible_image_count: 3,
  gallery_layout: 'grid',
  featured_section_enabled: true,
  primary_cta_label: 'Browse Items',
  primary_cta_style: 'solid',
  announcement_text: '',
  policy_text: '',
  trust_badges_enabled: true,
  visibility: 'draft',
};

export default function StorefrontCustomizationPanel({ storeSlug, ownerEmail, onSaved }) {
  const { user } = useAuth();
  const effectiveOwner = ownerEmail || user?.email || '';
  const canEdit = !!user?.email && (user.email === effectiveOwner || isAdmin(user));

  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState({ ...DEFAULTS });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!storeSlug) return;
      const rows = await base44.entities.StorefrontCustomization
        .filter({ store_slug: storeSlug })
        .catch(() => []);
      if (cancelled) return;
      const found = rows?.[0];
      if (found) {
        setRecord(found);
        setDraft({ ...DEFAULTS, ...found });
      } else {
        setRecord(null);
        setDraft({ ...DEFAULTS, store_name: storeSlug });
      }
    })();
    return () => { cancelled = true; };
  }, [storeSlug]);

  const setField = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setError('');
  };

  const validate = () => {
    if (!draft.store_name?.trim()) return 'Store name is required.';
    if (draft.banner_image_url && !isSafeImageUrl(draft.banner_image_url)) return 'Banner URL must be a valid https image URL.';
    if (draft.logo_url && !isSafeImageUrl(draft.logo_url)) return 'Logo URL must be a valid https image URL.';
    const count = Number(draft.visible_image_count);
    if (!Number.isFinite(count) || count < 1 || count > 8) return 'Visible image count must be between 1 and 8.';
    return '';
  };

  const save = async () => {
    if (!canEdit) {
      setError('You don’t have permission to edit this storefront.');
      logAuditEvent(user, { action: 'storefront.customize', target_type: 'StorefrontCustomization', target_id: storeSlug, status: 'denied', reason: 'forbidden' });
      return;
    }
    const v = validate();
    if (v) { setError(v); return; }
    setSaving(true);
    try {
      const payload = {
        ...draft,
        store_slug: storeSlug,
        owner_email: effectiveOwner,
      };
      if (record?.id) {
        await base44.entities.StorefrontCustomization.update(record.id, payload);
      } else {
        const created = await base44.entities.StorefrontCustomization.create(payload);
        setRecord(created);
      }
      logAuditEvent(user, {
        action: 'storefront.customize',
        target_type: 'StorefrontCustomization',
        target_id: storeSlug,
        before: record ? { visibility: record.visibility } : null,
        after: { visibility: payload.visibility },
      });
      setDirty(false);
      setSavedAt(new Date());
      onSaved?.(payload);
    } catch (err) {
      setError(err?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-4 text-xs text-yellow-300/90">
        You can view this storefront but only the owner or an admin can edit it.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Section title="Identity">
        <Field label="Store name" required>
          <input className={inputCls} value={draft.store_name} onChange={(e) => setField('store_name', e.target.value)} placeholder="My Atelier" />
        </Field>
        <Field label="Tagline">
          <input className={inputCls} value={draft.store_tagline} onChange={(e) => setField('store_tagline', e.target.value)} placeholder="Hand-crafted jade & rare items" />
        </Field>
        <Field label="Description">
          <textarea rows={3} className={inputCls} value={draft.store_description} onChange={(e) => setField('store_description', e.target.value)} maxLength={600} />
          <p className="mt-1 text-[10px] text-muted-foreground/70">{draft.store_description?.length || 0}/600</p>
        </Field>
      </Section>

      <Section title="Branding" icon={ImageIcon}>
        <Field label="Banner image URL (https)">
          <input className={inputCls} value={draft.banner_image_url} onChange={(e) => setField('banner_image_url', e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Logo URL (https)">
          <input className={inputCls} value={draft.logo_url} onChange={(e) => setField('logo_url', e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Theme preset">
          <select className={inputCls} value={draft.theme_preset} onChange={(e) => setField('theme_preset', e.target.value)}>
            {['midnight', 'phoenix', 'jade', 'neutron', 'minimal'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="Layout">
        <Field label="Card density">
          <select className={inputCls} value={draft.card_density} onChange={(e) => setField('card_density', e.target.value)}>
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
            <option value="spacious">Spacious</option>
          </select>
        </Field>
        <Field label="Gallery layout">
          <select className={inputCls} value={draft.gallery_layout} onChange={(e) => setField('gallery_layout', e.target.value)}>
            <option value="grid">Grid</option>
            <option value="carousel">Carousel</option>
            <option value="stacked">Stacked</option>
          </select>
        </Field>
        <Field label="Visible images per listing">
          <input type="number" min={1} max={8} className={inputCls} value={draft.visible_image_count} onChange={(e) => setField('visible_image_count', Number(e.target.value))} />
        </Field>
      </Section>

      <Section title="Sections">
        <ToggleRow label="Show featured section" checked={draft.featured_section_enabled} onChange={(v) => setField('featured_section_enabled', v)} />
        <ToggleRow label="Show trust / safety badges" checked={draft.trust_badges_enabled} onChange={(v) => setField('trust_badges_enabled', v)} />
        <Field label="Primary CTA label">
          <input className={inputCls} value={draft.primary_cta_label} onChange={(e) => setField('primary_cta_label', e.target.value)} maxLength={32} />
        </Field>
        <Field label="CTA style">
          <select className={inputCls} value={draft.primary_cta_style} onChange={(e) => setField('primary_cta_style', e.target.value)}>
            <option value="solid">Solid</option>
            <option value="outline">Outline</option>
            <option value="ghost">Ghost</option>
          </select>
        </Field>
      </Section>

      <Section title="Communication">
        <Field label="Announcement (top of store)">
          <input className={inputCls} value={draft.announcement_text} onChange={(e) => setField('announcement_text', e.target.value)} maxLength={140} />
        </Field>
        <Field label="Policy / trust info">
          <textarea rows={3} className={inputCls} value={draft.policy_text} onChange={(e) => setField('policy_text', e.target.value)} maxLength={1000} />
        </Field>
      </Section>

      <Section title="Visibility" icon={draft.visibility === 'public' ? Eye : EyeOff}>
        <Field label="Storefront visibility">
          <select className={inputCls} value={draft.visibility} onChange={(e) => setField('visibility', e.target.value)}>
            <option value="draft">Draft (only you)</option>
            <option value="private">Private (link only)</option>
            <option value="public">Public</option>
          </select>
        </Field>
        <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-primary" /> Server-side RLS still enforces who can read/write this record.
        </p>
      </Section>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-background/95 backdrop-blur-sm border-t border-border flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {dirty ? 'Unsaved changes' : savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : 'No changes'}
        </p>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

const inputCls = 'w-full h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 space-y-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-muted-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-secondary border border-border'}`}
        aria-pressed={checked}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}