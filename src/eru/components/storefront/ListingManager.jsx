import { useEffect, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Edit2, Pause, Play, Trash2 } from 'lucide-react';
import ListingEditor from './ListingEditor';
import ConditionBadge from './ConditionBadge';

function MediaPreview({ urls = [] }) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {urls.slice(0, 3).map((url, index) => (
        <div key={index} className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-secondary flex-shrink-0">
          {url.match(/\.(mp4|webm|mov)$/i)
            ? <video src={url} className="w-full h-full object-cover" muted />
            : <img src={url} alt="listing media" className="w-full h-full object-cover" />}
        </div>
      ))}
    </div>
  );
}

export default function ListingManager({ assetType, title = 'My Listings' }) {
  const [listings, setListings] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const data = await base44.entities.StorefrontListing.filter({ asset_type: assetType }, '-created_date', 50);
    setListings((data || []).filter((listing) => listing.created_by));
  };

  useEffect(() => { load(); }, [assetType]);

  const saveEdit = async (values) => {
    await base44.entities.StorefrontListing.update(editing.id, {
      ...values,
      title: values.title,
      description: values.description,
      sale_mode: values.sale_mode,
      ask_price_fiat: values.ask_price_fiat,
      fiat_currency: values.fiat_currency,
      crypto_currency: values.crypto_currency,
      crypto_value: values.crypto_value,
      base_price: values.base_price,
      trade_preferences: values.trade_preferences,
      condition_score: values.condition_score,
      media_urls: values.media_urls,
      tags: values.tags,
    });
    setEditing(null);
    load();
  };

  const toggleStatus = async (listing) => {
    await base44.entities.StorefrontListing.update(listing.id, { status: listing.status === 'active' ? 'paused' : 'active' });
    load();
  };

  const removeListing = async (id) => {
    await base44.entities.StorefrontListing.delete(id);
    load();
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {editing && <ListingEditor initialValue={editing} onSave={saveEdit} submitLabel="Update Listing" />}
      {listings.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground text-center">No listings yet</div>
      ) : listings.map((listing) => (
        <div key={listing.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{listing.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{listing.sale_mode?.replaceAll('_', ' ')} · {listing.ask_price_fiat || listing.base_price} {listing.fiat_currency || listing.currency}</p>
            </div>
            <ConditionBadge score={listing.condition_score || 10} />
          </div>
          {listing.media_urls?.length > 0 && <MediaPreview urls={listing.media_urls} />}
          {listing.description && <p className="text-xs text-muted-foreground">{listing.description}</p>}
          <div className="flex gap-2">
            <button onClick={() => setEditing(listing)} className="flex-1 bg-secondary border border-border rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
            <button onClick={() => toggleStatus(listing)} className="flex-1 bg-secondary border border-border rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1">{listing.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}{listing.status === 'active' ? 'Pause' : 'Activate'}</button>
            <button onClick={() => removeListing(listing.id)} className="px-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}