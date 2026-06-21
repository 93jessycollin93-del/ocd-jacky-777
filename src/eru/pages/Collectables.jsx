import { useState } from 'react';
import { Search, Star, ShoppingCart, Plus, X } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import ListingEditor from '../components/storefront/ListingEditor';
import ListingManager from '../components/storefront/ListingManager';
import DemoDataBanner from '../components/marketplace/DemoDataBanner';

const POKEMON = [
  { id: 1, name: 'Charizard', set: 'Base Set', grade: 'PSA 9', price: 450, rarity: 'Holo Rare', img: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=200&h=280&fit=crop' },
  { id: 2, name: 'Mewtwo', set: 'Base Set', grade: 'PSA 8', price: 280, rarity: 'Holo Rare', img: 'https://images.unsplash.com/photo-1605979257913-1704eb7b6246?w=200&h=280&fit=crop' },
  { id: 3, name: 'Pikachu', set: 'Promo', grade: 'PSA 10', price: 890, rarity: 'Promo', img: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=200&h=280&fit=crop' },
  { id: 4, name: 'Blastoise', set: 'Base Set', grade: 'PSA 7', price: 195, rarity: 'Holo Rare', img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=280&fit=crop' },
];

const NOSTALGIC = [
  { id: 10, name: 'Super Mario 64', type: 'Video Game', grade: 'WATA 9.2', price: 1200, img: 'https://images.unsplash.com/photo-1606318621746-fbe0b7d16e9e?w=200&h=200&fit=crop' },
  { id: 11, name: 'Original Game Boy', type: 'Console', grade: 'CIB', price: 350, img: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=200&h=200&fit=crop' },
];

const GRADE_COLOR = { 'PSA 10': 'text-yellow-400', 'PSA 9': 'text-green-400', 'PSA 8': 'text-blue-400', 'PSA 7': 'text-gray-400', 'WATA 9.2': 'text-purple-400', 'CIB': 'text-orange-400' };

export default function Collectables() {
  const [tab, setTab] = useState('pokemon');
  const [selected, setSelected] = useState(null);
  const [cart, setCart] = useState([]);
  const [showListingForm, setShowListingForm] = useState(false);

  const items = tab === 'pokemon' ? POKEMON : NOSTALGIC;

  if (selected) return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="px-4 py-3 border-b border-border">
        <button onClick={() => setSelected(null)} className="text-muted-foreground text-sm">← Back</button>
      </div>
      <img src={selected.img} className="w-full max-h-72 object-contain bg-card"/>
      <div className="px-4 py-4 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">{selected.set || selected.type}</p>
          <h2 className="text-xl font-semibold">{selected.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            {selected.grade && <span className={`text-xs font-mono font-semibold ${GRADE_COLOR[selected.grade] || 'text-foreground'}`}>{selected.grade}</span>}
            {selected.rarity && <span className="text-xs text-muted-foreground">{selected.rarity}</span>}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-3xl font-mono font-semibold text-foreground">${selected.price.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Price in USD · ships within 5–7 business days</p>
        </div>
        <div className="text-xs text-muted-foreground space-y-2">
          <div className="flex justify-between border-b border-border pb-2"><span>Condition</span><span className="text-foreground">{selected.grade}</span></div>
          <div className="flex justify-between border-b border-border pb-2"><span>Authenticity</span><span className="text-muted-foreground/70">Not verified</span></div>
          <div className="flex justify-between"><span>Payment</span><span className="text-muted-foreground/70">Not connected</span></div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setCart(p => [...p, selected]); setSelected(null); }}
            className="flex-1 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold glow-green">
            Add to Cart
          </button>
          <button className="px-4 py-3.5 bg-secondary border border-border rounded-xl"><Star className="w-4 h-4"/></button>
        </div>
      </div>
    </div>
  );

  const createCollectableListing = async (values) => {
    await base44.entities.StorefrontListing.create({
      title: values.title,
      description: values.description,
      asset_type: 'collectible',
      asset_id: 'collectable_' + Date.now(),
      base_price: values.base_price,
      currency: values.crypto_currency,
      ask_price_fiat: values.ask_price_fiat,
      fiat_currency: values.fiat_currency,
      crypto_currency: values.crypto_currency,
      crypto_value: values.crypto_value,
      sale_mode: values.sale_mode,
      trade_preferences: values.trade_preferences,
      condition_score: values.condition_score,
      media_urls: values.media_urls,
      internal_listed: true,
      status: 'active',
      tags: values.tags,
    });
    setShowListingForm(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <DemoDataBanner message="Pokémon and nostalgic items shown here are sample placeholders — grades and prices are not authenticated or live." />
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold">Collectables</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowListingForm((s) => !s)} className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            {showListingForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
          <button className="relative">
            <ShoppingCart className="w-5 h-5 text-muted-foreground"/>
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">{cart.length}</span>}
          </button>
        </div>
      </div>

      <div className="flex border-b border-border">
        {['pokemon','nostalgic'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium capitalize ${tab===t?'text-primary border-b-2 border-primary':'text-muted-foreground'}`}>
            {t === 'pokemon' ? '🎴 Pokémon' : '🕹 Nostalgic'}
          </button>
        ))}
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground"/>
          <input placeholder="Search collectables..." className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"/>
        </div>
        {showListingForm && <ListingEditor initialValue={{ asset_type: 'collectible' }} onSave={createCollectableListing} submitLabel="Publish Collectable Listing" />}
        <ListingManager assetType="collectible" title="Manage Collectable Listings" />
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.id} onClick={() => setSelected(item)} className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/40 transition-colors">
            <img src={item.img} className="w-full aspect-[3/4] object-cover"/>
            <div className="p-2">
              <p className="text-xs text-muted-foreground">{item.set || item.type}</p>
              <p className="text-sm font-medium truncate">{item.name}</p>
              {item.grade && <span className={`text-xs font-mono ${GRADE_COLOR[item.grade]||'text-foreground'}`}>{item.grade}</span>}
              <p className="text-sm font-mono font-semibold text-foreground mt-1">${item.price.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}