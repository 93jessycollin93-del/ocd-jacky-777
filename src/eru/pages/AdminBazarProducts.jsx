import { useEffect, useState } from 'react';
import { useAuth } from '@/eru/lib/AuthContext';
import { base44 } from '@/eru/api/base44Client';
import { Coins, Gem, Plus, Edit2, Trash2, Pause, Play, X, Save, ShieldAlert } from 'lucide-react';

// Admin-only CRUD UI for the BazarProduct catalog.
// The entity's row-level security (rls) on the server already restricts
// create/update/delete to role=admin, so this page is also admin-gated
// at render to give non-admins a clear message.
//
// Surfaces full CRUD: Create / Edit / Publish (is_active toggle) / Delete.

const RESOURCE_CODES = ['GOLD', 'JADEITE'];

const EMPTY_FORM = {
  title: '',
  description: '',
  resource_code: 'GOLD',
  tier_label: '',
  amount: '',
  display_unit: '',
  price_usd: '',
  is_active: true,
  sort_order: 0,
  badge: '',
};

function ProductForm({ initial, onSave, onCancel, busy }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...(initial || {}) });
  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = () => {
    onSave({
      ...form,
      amount: Number(form.amount || 0),
      price_usd: Number(form.price_usd || 0),
      sort_order: Number(form.sort_order || 0),
    });
  };

  const required = form.title && form.tier_label && form.amount && form.display_unit && form.price_usd;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-primary">{initial?.id ? `Edit — ${initial.title}` : 'New product'}</p>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground" aria-label="Close form">
          <X className="w-4 h-4" />
        </button>
      </div>

      <input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Title" className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
      <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Description (optional)" className="w-full min-h-[60px] bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none" />

      <div className="grid grid-cols-2 gap-2">
        <select value={form.resource_code} onChange={(e) => setField('resource_code', e.target.value)} className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none">
          {RESOURCE_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={form.tier_label} onChange={(e) => setField('tier_label', e.target.value)} placeholder="Tier label (e.g. Starter)" className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input type="number" value={form.amount} onChange={(e) => setField('amount', e.target.value)} placeholder="Amount" className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
        <input value={form.display_unit} onChange={(e) => setField('display_unit', e.target.value)} placeholder="Display unit (g / chunk)" className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
        <input type="number" step="0.01" value={form.price_usd} onChange={(e) => setField('price_usd', e.target.value)} placeholder="Price USD" className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input type="number" value={form.sort_order} onChange={(e) => setField('sort_order', e.target.value)} placeholder="Sort order" className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
        <input value={form.badge} onChange={(e) => setField('badge', e.target.value)} placeholder="Badge text (optional)" className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
        <label className="flex items-center justify-between gap-2 bg-secondary border border-border rounded-xl px-3 py-2 text-sm cursor-pointer">
          <span className="text-muted-foreground">Active</span>
          <input type="checkbox" checked={form.is_active} onChange={(e) => setField('is_active', e.target.checked)} className="accent-primary" />
        </label>
      </div>

      <button onClick={submit} disabled={!required || busy} className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
        <Save className="w-4 h-4" /> {busy ? 'Saving…' : initial?.id ? 'Update product' : 'Create product'}
      </button>
    </div>
  );
}

export default function AdminBazarProducts() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | { id, ...product }
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await base44.entities.BazarProduct.list('sort_order', 200);
      setProducts(data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const handleCreate = async (data) => {
    setBusyId('new');
    try {
      await base44.entities.BazarProduct.create(data);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err?.message || 'Create failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdate = async (data) => {
    if (!editing?.id) return;
    setBusyId(editing.id);
    try {
      await base44.entities.BazarProduct.update(editing.id, data);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err?.message || 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (product) => {
    setBusyId(product.id);
    try {
      await base44.entities.BazarProduct.update(product.id, { is_active: !product.is_active });
      await load();
    } catch (err) {
      setError(err?.message || 'Toggle failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.title}"? This cannot be undone.`)) return;
    setBusyId(product.id);
    try {
      await base44.entities.BazarProduct.delete(product.id);
      await load();
    } catch (err) {
      setError(err?.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl p-4 text-sm text-muted-foreground">Loading account…</div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Admin access required</p>
            <p className="text-xs text-muted-foreground mt-1">The Bazar product catalog is restricted to admin users.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Bazar product catalog</h1>
          <p className="text-xs text-muted-foreground">Create, edit, publish, and remove the products shown on Bazar Stand.</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          disabled={editing === 'new'}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> New product
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>
      )}

      {editing === 'new' && (
        <ProductForm initial={null} onSave={handleCreate} onCancel={() => setEditing(null)} busy={busyId === 'new'} />
      )}
      {editing && editing !== 'new' && (
        <ProductForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} busy={busyId === editing.id} />
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading products…</div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No products yet. Click <span className="font-semibold">New product</span> to add one.
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex items-start gap-2">
                  {p.resource_code === 'JADEITE'
                    ? <Gem className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                    : <Coins className="w-4 h-4 mt-0.5 text-yellow-400 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.tier_label} · {p.amount}{p.display_unit} · ${Number(p.price_usd).toFixed(2)}
                    </p>
                    {p.badge && <span className="inline-block mt-1 rounded-full bg-primary/15 text-primary text-[10px] px-2 py-0.5">{p.badge}</span>}
                  </div>
                </div>
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] capitalize ${
                  p.is_active ? 'bg-green-500/10 text-green-400' : 'bg-secondary text-muted-foreground'
                }`}>
                  {p.is_active ? 'active' : 'paused'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => setEditing(p)}
                  disabled={busyId === p.id}
                  className="flex items-center justify-center gap-1 rounded-lg border border-border bg-secondary py-1.5 text-[11px] font-medium disabled:opacity-50"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => handleToggleActive(p)}
                  disabled={busyId === p.id}
                  className="flex items-center justify-center gap-1 rounded-lg border border-border bg-secondary py-1.5 text-[11px] font-medium disabled:opacity-50"
                  title={p.is_active ? 'Hide from Bazar Stand' : 'Show on Bazar Stand'}
                >
                  {p.is_active
                    ? <><Pause className="w-3 h-3" /> Hide</>
                    : <><Play className="w-3 h-3" /> Publish</>}
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  disabled={busyId === p.id}
                  className="flex items-center justify-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 py-1.5 text-[11px] font-medium text-red-400 disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
