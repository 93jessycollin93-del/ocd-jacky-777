import { useState } from 'react';
import { Search, Plus, Star, Tag, TrendingUp, Lightbulb, Package, Megaphone, Lock, CheckCircle, Gavel } from 'lucide-react';
import BiddingHistory from '../components/BiddingHistory';
import DemoDataBanner from '../components/marketplace/DemoDataBanner';

const LISTINGS = [
  { id: 1, type: 'idea', title: 'Decentralized Voting Protocol', author: 'CryptoMind', price: 120, stars: 48, tags: ['blockchain', 'governance'], status: 'authorized', preview: 'A trustless on-chain voting system using ZK proofs for privacy...', img: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&h=120&fit=crop' },
  { id: 2, type: 'concept', title: 'AI-Powered NFT Generation Suite', author: 'PixelForge', price: 350, stars: 102, tags: ['AI', 'NFT', 'tools'], status: 'authorized', preview: 'A full pipeline for generating and minting AI art with custom style training...', img: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=200&h=120&fit=crop' },
  { id: 3, type: 'passion', title: 'Retro Game Preservation Archive', author: 'NostalgiaLab', price: 80, stars: 27, tags: ['gaming', 'archive'], status: 'pending', preview: 'A community-curated archive of rare retro games and hardware manuals...', img: 'https://images.unsplash.com/photo-1606318621746-fbe0b7d16e9e?w=200&h=120&fit=crop' },
  { id: 4, type: 'nft', title: 'Cosmic Drift Collection Vol.2', author: 'StarWeaver', price: 500, stars: 215, tags: ['NFT', 'art', 'collection'], status: 'authorized', preview: '10,000 unique generative space-themed NFTs with provenance verification...', img: 'https://images.unsplash.com/photo-1614728423169-3f65fd722b7e?w=200&h=120&fit=crop' },
];

const CATEGORIES = ['All', 'Ideas', 'Concepts', 'Passion Projects', 'NFTs', 'Collectables'];
const TYPE_ICON = { idea: Lightbulb, concept: TrendingUp, passion: Star, nft: Package };
const TYPE_COLOR = { idea: 'text-yellow-400', concept: 'text-blue-400', passion: 'text-pink-400', nft: 'text-purple-400' };

function ListingCard({ item, onClick }) {
  const Icon = TYPE_ICON[item.type] || Tag;
  return (
    <div onClick={() => onClick(item)} className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/40 transition-all group">
      <div className="relative">
        <img src={item.img} className="w-full h-28 object-cover" alt={item.title} />
        <div className="absolute top-2 left-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-black/60 backdrop-blur flex items-center gap-1 ${TYPE_COLOR[item.type]}`}>
            <Icon className="w-3 h-3" />{item.type}
          </span>
        </div>
        {item.status === 'authorized' && (
          <div className="absolute top-2 right-2 bg-green-500/20 border border-green-500/40 rounded-full p-1">
            <CheckCircle className="w-3 h-3 text-green-400" />
          </div>
        )}
        {item.status === 'pending' && (
          <div className="absolute top-2 right-2 bg-yellow-500/20 border border-yellow-500/40 rounded-full p-1">
            <Lock className="w-3 h-3 text-yellow-400" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-semibold line-clamp-1">{item.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{item.preview}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">@{item.author}</span>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-muted-foreground">{item.stars}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {item.tags.slice(0,2).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{t}</span>)}
          </div>
          <span className="text-sm font-mono font-semibold text-primary">${item.price}</span>
        </div>
      </div>
    </div>
  );
}

function DetailView({ item, onBack }) {
  const Icon = TYPE_ICON[item.type] || Tag;
  const isHighTraction = item.status === 'authorized' && item.stars > 50;
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <div className="px-4 py-3 border-b border-border">
        <button onClick={onBack} className="text-muted-foreground text-sm">← Back</button>
      </div>
      <img src={item.img} className="w-full h-48 object-cover" alt={item.title} />
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className={`flex items-center gap-1.5 text-xs font-medium mb-1 ${TYPE_COLOR[item.type]}`}>
              <Icon className="w-3.5 h-3.5" />{item.type}
            </div>
            <h2 className="text-xl font-bold">{item.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">by @{item.author}</p>
          </div>
          <span className="text-2xl font-mono font-bold text-primary">${item.price}</span>
        </div>

        {item.status === 'authorized' ? (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-xs text-green-400">Authorized Product — Reviewed & Verified</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2">
            <Lock className="w-4 h-4 text-yellow-400" />
            <p className="text-xs text-yellow-400">Pending Review — Cannot be purchased until cleared</p>
          </div>
        )}

        <p className="text-sm text-muted-foreground leading-relaxed">{item.preview} Full documentation and source files included upon purchase. Buyers also receive lifetime updates.</p>

        <div className="flex gap-1 flex-wrap">
          {item.tags.map(t => <span key={t} className="text-xs px-2 py-1 rounded-lg bg-secondary text-muted-foreground">{t}</span>)}
        </div>

        <div className="flex gap-3">
          <button disabled={item.status !== 'authorized'}
            className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all ${item.status === 'authorized' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground cursor-not-allowed'}`}>
            {item.status === 'authorized' ? 'Purchase' : 'Under Review'}
          </button>
          <button className="px-4 py-3.5 bg-secondary border border-border rounded-xl">
            <Star className="w-4 h-4" />
          </button>
          <button className="px-4 py-3.5 bg-secondary border border-border rounded-xl">
            <Megaphone className="w-4 h-4" />
          </button>
        </div>

        {/* Auction Section */}
        {isHighTraction && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Gavel className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Auction</p>
              <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">High Traction</span>
            </div>
            <BiddingHistory basePrice={item.price} isOwner={false} />
          </div>
        )}

        {/* Advertise Section */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2"><Megaphone className="w-4 h-4 text-primary" /> Boost This Listing</p>
          <p className="text-xs text-muted-foreground">Pay to advertise this listing and reach more buyers across the platform.</p>
          <div className="grid grid-cols-3 gap-2">
            {['3 days — $5', '7 days — $10', '30 days — $35'].map(plan => (
              <button key={plan} className="py-2 px-1 text-center rounded-lg border border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                {plan}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);
  const [composing, setComposing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [listings, setListings] = useState(LISTINGS);

  if (selected) return <DetailView item={selected} onBack={() => setSelected(null)} />;

  if (composing) return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <button onClick={() => setComposing(false)} className="text-muted-foreground text-sm">Cancel</button>
        <h3 className="font-medium text-sm">New Listing</h3>
        <button onClick={() => {
          setListings(prev => [{ id: Date.now(), type: 'idea', title: newTitle, author: 'You', price: Number(newPrice) || 0, stars: 0, tags: ['new'], status: 'pending', preview: newDesc, img: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&h=120&fit=crop' }, ...prev]);
          setComposing(false);
        }} className="text-primary text-sm font-semibold">Submit</button>
      </div>
      <div className="px-4 py-4 space-y-4">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
          <p className="text-xs text-yellow-400 flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Your listing will go through our Application Review System before it can be sold.</p>
        </div>
        {[['Title', newTitle, setNewTitle], ['Description', newDesc, setNewDesc], ['Price (USD)', newPrice, setNewPrice]].map(([label, val, setter]) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            {label === 'Description' ? (
              <textarea value={val} onChange={e => setter(e.target.value)} placeholder={`Enter ${label.toLowerCase()}...`} className="w-full bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground min-h-[100px] resize-none" />
            ) : (
              <input value={val} onChange={e => setter(e.target.value)} placeholder={`Enter ${label.toLowerCase()}...`} className="w-full bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const filtered = listings.filter(l => {
    const matchCat = category === 'All' || l.type === category.toLowerCase().split(' ')[0];
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) || l.author.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <DemoDataBanner message="Listings shown here are sample placeholders. Prices, authors, and star counts are illustrative only." />
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Marketplace</h2>
          <p className="text-xs text-muted-foreground">Trade ideas, concepts & creations</p>
        </div>
        <button onClick={() => setComposing(true)} className="bg-primary text-primary-foreground rounded-lg p-1.5">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ideas, authors, tags..." className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${category === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {filtered.map(item => <ListingCard key={item.id} item={item} onClick={setSelected} />)}
      </div>
    </div>
  );
}