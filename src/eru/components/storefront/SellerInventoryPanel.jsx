import { useState } from 'react';
import { Edit2, Pause, Play, Trash2, X } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import ListingEditor from './ListingEditor';

/**
 * SellerInventoryPanel
 * ------------------------------------------------------------------
 * Inline management for the seller's own listings — edit copy/media,
 * pause / reactivate, and remove. Mirrors the controls in
 * ListingManager so the seller dashboard is self-contained instead of
 * forcing a hop into Storefront Hub.
 *
 * Props:
 *   listings — StorefrontListing[] owned by the current user.
 *   onChanged() — optional callback so the parent can refresh stats.
 */
export default function SellerInventoryPanel({ listings = [], onChanged }) {
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const refresh = () => { if (onChanged) onChanged(); };

  const saveEdit = async (values) => {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      await base44.entities.StorefrontListing.update(editing.id, {
        ...values,
        currency: values.crypto_currency,
      });
      setEditing(null);
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  const togglePause = async (listing) => {
    setBusyId(listing.id);
    try {
      await base44.entities.StorefrontListing.update(listing.id, {
        status: listing.status === 'active' ? 'paused' : 'active',
      });
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  const removeListing = async (listing) => {
    if (!confirm(`Remove "${listing.title}"? This cannot be undone.`)) return;
    setBusyId(listing.id);
    try {
      await base44.entities.StorefrontListing.delete(listing.id);
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Inventory</p>
        <p className="text-[11px] text-muted-foreground">Edit, pause, or remove your listings without leaving the dashboard.</p>
      </div>

      {editing && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary">Editing — {editing.title}</p>
            <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ListingEditor initialValue={editing} onSave={saveEdit} submitLabel={busyId === editing.id ? 'Saving…' : 'Update Listing'} />
        </div>
      )}

      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">No inventory listings found.</div>
      ) : (
        <div className="space-y-2">
          {listings.map((listing) => (
            <div key={listing.id} className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{listing.title}</p>
                  <p className="text-[11px] text-muted-foreground">{listing.asset_type} · {listing.sale_mode?.replaceAll('_', ' ')}</p>
                </div>
                <span className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] capitalize ${
                  listing.status === 'active' ? 'bg-green-500/10 text-green-400' :
                  listing.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-secondary text-muted-foreground'
                }`}>{listing.status}</span>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span>{listing.base_price} {listing.currency}</span>
                <span>{listing.view_count || 0} views</span>
                <span>{(listing.external_syndications || []).length} channels</span>
                <span>{(listing.media_urls || []).length} media</span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditing(listing)}
                  disabled={busyId === listing.id}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-secondary py-1.5 text-[11px] font-medium disabled:opacity-50"
                >
                  <Edit2 className="h-3 w-3" /> Edit
                </button>
                <button
                  onClick={() => togglePause(listing)}
                  disabled={busyId === listing.id}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-secondary py-1.5 text-[11px] font-medium disabled:opacity-50"
                >
                  {listing.status === 'active' ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Activate</>}
                </button>
                <button
                  onClick={() => removeListing(listing)}
                  disabled={busyId === listing.id}
                  className="flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 px-3 text-red-400 disabled:opacity-50"
                  aria-label="Remove listing"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}