import { useEffect, useState } from 'react';
import { Search, Grid, List, AlertTriangle, Plus, X } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useWallet } from '../hooks/useWallet';
import WalletConnectBar from '../components/WalletConnectBar';
import ListingEditor from '../components/storefront/ListingEditor';
import ListingManager from '../components/storefront/ListingManager';
import TelegramImportPanel from '../components/nfts/TelegramImportPanel';
import DemoDataBanner from '../components/marketplace/DemoDataBanner';

const COLLECTIONS = [
  { id: 1, name: 'TON Punks', floor: 12.5, volume: 4820, items: 10000, img: 'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=100&h=100&fit=crop' },
  { id: 2, name: 'Telegram Apes', floor: 8.2, volume: 2100, items: 5000, img: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=100&h=100&fit=crop' },
  { id: 3, name: 'CryptoPixels', floor: 2.1, volume: 930, items: 8888, img: 'https://images.unsplash.com/photo-1641447458839-a6c3e16e6c98?w=100&h=100&fit=crop' },
];

const NFTS = [
  { id: 1, name: 'TON Punk #1337', collection: 'TON Punks', price: 15.5, rarity: 'Rare', likes: 42, img: 'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=300&h=300&fit=crop' },
  { id: 2, name: 'TON Punk #0042', collection: 'TON Punks', price: 22.0, rarity: 'Epic', likes: 87, img: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=300&h=300&fit=crop' },
  { id: 3, name: 'Ape #512', collection: 'Telegram Apes', price: 9.8, rarity: 'Common', likes: 21, img: 'https://images.unsplash.com/photo-1641447458839-a6c3e16e6c98?w=300&h=300&fit=crop' },
  { id: 4, name: 'Pixel #7744', collection: 'CryptoPixels', price: 2.4, rarity: 'Uncommon', likes: 15, img: 'https://images.unsplash.com/photo-1643408065022-8a84cfee3d2a?w=300&h=300&fit=crop' },
];

const RARITY_COLORS = { Common: 'text-gray-400', Uncommon: 'text-green-400', Rare: 'text-blue-400', Epic: 'text-purple-400', Legendary: 'text-yellow-400' };

export default function NFTs() {
  const [tab, setTab] = useState('explore');
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [showBuy, setShowBuy] = useState(false);
  const [showListForm, setShowListForm] = useState(false);
  const [listing, setListing] = useState(false);
  const [listSuccess, setListSuccess] = useState(false);
  const [importedNfts, setImportedNfts] = useState([]);
  const wallet = useWallet();

  const loadImportedNfts = async () => {
    const rows = await base44.entities.NFT?.list?.('-updated_date', 50).catch(() => []);
    setImportedNfts(rows || []);
  };

  useEffect(() => {
    if (tab === 'my_nfts') {
      loadImportedNfts();
    }
  }, [tab]);

  const submitListing = async (values) => {
    setListing(true);
    await base44.entities.StorefrontListing.create({
      title: values.title,
      description: values.description,
      asset_type: 'nft',
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
      asset_id: 'user_nft_' + Date.now(),
      internal_listed: true,
      status: 'active',
      tags: values.tags,
      asset_snapshot: { title: values.title, image_url: values.media_urls?.[0] || '' },
    });
    setListing(false);
    setListSuccess(true);
    setShowListForm(false);
    setTimeout(() => setListSuccess(false), 3000);
  };

  // Load blockchain config
  const blockchainConfig = (() => { try { return JSON.parse(localStorage.getItem('blockchain_config') || '{}'); } catch { return {}; } })();
  const mintingEnabled = blockchainConfig.nft_minting_enabled && blockchainConfig.contract_address;

  if (selected) return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => setSelected(null)} className="text-muted-foreground text-sm">← Back</button>
        <span className="font-medium">{selected.name}</span>
      </div>
      <img src={selected.img} alt={selected.name} className="w-full aspect-square object-cover"/>
      <div className="px-4 py-4 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">{selected.collection}</p>
          <h2 className="text-xl font-semibold">{selected.name}</h2>
          <span className={`text-xs font-mono ${RARITY_COLORS[selected.rarity]}`}>{selected.rarity}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Current Price</p>
            <p className="text-lg font-mono font-semibold text-green-400">{selected.price} TON</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted-foreground">❤ Likes</p>
            <p className="text-lg font-mono font-semibold">{selected.likes}</p>
          </div>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between border-b border-border pb-2"><span>Ownership History</span><span className="text-muted-foreground/70">Not connected</span></div>
          <div className="flex justify-between border-b border-border pb-2"><span>Last Sale</span><span className="text-muted-foreground/70">No data</span></div>
          <div className="flex justify-between"><span>Token ID</span><span className="text-muted-foreground/70">Not connected</span></div>
        </div>
        {/* Wallet gate for purchasing */}
        {wallet.status !== 'connected' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded-xl">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs text-yellow-400">Connect a wallet to buy or make offers</span>
            </div>
            <WalletConnectBar />
          </div>
        ) : !mintingEnabled ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-xl">
            <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Minting not configured — admin must enable blockchain integration</span>
          </div>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => setShowBuy(true)} className="flex-1 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold glow-green">
              Buy Now — {selected.price} TON
            </button>
            <button className="px-4 py-3.5 bg-secondary border border-border rounded-xl text-sm">Offer</button>
          </div>
        )}
      </div>
      {showBuy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-card border-t border-border w-full rounded-t-2xl p-5 space-y-4">
            <h3 className="text-lg font-semibold">Confirm Purchase</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">NFT</span><span>{selected.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-mono text-green-400">{selected.price} TON</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Marketplace Fee (2.5%)</span><span className="font-mono">{(selected.price * 0.025).toFixed(3)} TON</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowBuy(false)} className="flex-1 py-3 bg-secondary rounded-xl text-sm">Cancel</button>
              <button onClick={() => setShowBuy(false)} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold glow-green">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold">NFT Marketplace</h2>
        <div className="flex gap-1">
          <button onClick={() => setView('grid')} className={`p-1.5 rounded ${view==='grid'?'text-primary':'text-muted-foreground'}`}><Grid className="w-4 h-4"/></button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded ${view==='list'?'text-primary':'text-muted-foreground'}`}><List className="w-4 h-4"/></button>
        </div>
      </div>
      <DemoDataBanner message="Explore and Collections lists below are illustrative placeholders. Floor prices, rarity, and collection volume are not live." />

      <div className="flex border-b border-border">
        {['explore','collections','my nfts'].map(t => (
          <button key={t} onClick={() => setTab(t.replace(' ','_'))}
            className={`flex-1 py-2.5 text-xs font-medium capitalize ${tab === t.replace(' ','_') ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground"/>
          <input placeholder="Search NFTs, collections..." className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"/>
        </div>
      </div>

      {tab === 'collections' ? (
        <div className="px-4 space-y-3">
          {COLLECTIONS.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <img src={c.img} className="w-12 h-12 rounded-lg object-cover"/>
              <div className="flex-1">
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.items.toLocaleString()} items</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono text-green-400">{c.floor} TON</p>
                <p className="text-xs text-muted-foreground">floor</p>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'my_nfts' ? (
        <div className="px-4 py-4 space-y-3">
          {listSuccess && (
            <div className="bg-green-400/10 border border-green-400/30 rounded-xl px-3 py-2 text-xs text-green-400 font-medium">
              ✅ NFT listed on the Storefront! View it in the Shop section.
            </div>
          )}

          <button onClick={() => setShowListForm(s => !s)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-primary/30 rounded-xl text-sm font-medium text-primary hover:bg-primary/5 transition-colors">
            <Plus className="w-4 h-4" /> List an NFT for Sale
          </button>

          {showListForm && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">New NFT Listing</p>
                <button onClick={() => setShowListForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <ListingEditor initialValue={{ asset_type: 'nft' }} onSave={submitListing} submitLabel={listing ? 'Publishing…' : 'Publish NFT Listing'} />
            </div>
          )}

          <TelegramImportPanel onImported={loadImportedNfts} />
          <ListingManager assetType="nft" title="Manage NFT Listings" />
          <WalletConnectBar />
          {importedNfts.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Imported to My NFTs</p>
              {importedNfts.map((nft) => (
                <div key={nft.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <img src={nft.image_url || 'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=200&h=200&fit=crop'} alt={nft.name} className="w-14 h-14 rounded-lg object-cover bg-secondary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{nft.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{nft.collection || 'Telegram Import'} · {nft.network || 'TON'}</p>
                    <p className="text-[11px] text-primary mt-1">Imported via {nft.source || 'telegram'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : wallet.status !== 'connected' ? (
            <p className="text-xs text-muted-foreground text-center">Connect your wallet to view on-chain NFTs</p>
          ) : (
            <div className="py-6 text-center">
              <p className="text-4xl mb-3">🖼</p>
              <p className="text-sm text-muted-foreground">No NFTs imported yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Use Import via Chat or manual import to populate your inventory automatically</p>
            </div>
          )}
        </div>
      ) : (
        <div className={`px-4 ${view==='grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}`}>
          {NFTS.map(nft => view === 'grid' ? (
            <div key={nft.id} onClick={() => setSelected(nft)} className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/40 transition-colors">
              <img src={nft.img} alt={nft.name} className="w-full aspect-square object-cover"/>
              <div className="p-2">
                <p className="text-xs text-muted-foreground">{nft.collection}</p>
                <p className="text-sm font-medium truncate">{nft.name}</p>
                <p className="text-sm font-mono text-green-400 mt-0.5">{nft.price} TON</p>
              </div>
            </div>
          ) : (
            <div key={nft.id} onClick={() => setSelected(nft)} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 cursor-pointer">
              <img src={nft.img} className="w-12 h-12 rounded-lg object-cover"/>
              <div className="flex-1">
                <p className="text-sm font-medium">{nft.name}</p>
                <p className="text-xs text-muted-foreground">{nft.collection}</p>
              </div>
              <p className="text-sm font-mono text-green-400">{nft.price} TON</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}