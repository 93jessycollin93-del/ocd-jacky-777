import { useState } from 'react';
import { Lightbulb, Megaphone, Star, Lock, CheckCircle, Clock } from 'lucide-react';
import CreatorAnalytics from '../components/CreatorAnalytics';
import { base44 } from '@/eru/api/base44Client';
import ListingEditor from '../components/storefront/ListingEditor';
import ListingManager from '../components/storefront/ListingManager';

const SAMPLE_IDEAS = [
  { id: 1, title: 'Decentralized Art Gallery', desc: 'A community-owned NFT gallery with voting-based curation', price: 0.5, category: 'concept', status: 'authorized', likes: 142, author: 'Visionary_X' },
  { id: 2, title: 'Crypto Trading Bot Blueprint', desc: 'Full source code for a momentum-based trading strategy', price: 1.2, category: 'project', status: 'authorized', likes: 89, author: 'CodeWizard' },
  { id: 3, title: 'Web3 Social Network Concept', desc: 'Ownership-first social media where users earn from content', price: 0.3, category: 'idea', status: 'pending_review', likes: 67, author: 'FutureMind' },
];

const AD_SLOTS = [
  { id: 1, title: 'Boost your listing', desc: 'Featured placement for 7 days', price: 0.1, reach: '10K+' },
  { id: 2, title: 'Community Spotlight', desc: 'Featured in Thinkers Club for 3 days', price: 0.05, reach: '5K+' },
  { id: 3, title: 'Premium Banner', desc: 'Top-of-page banner for 30 days', price: 0.5, reach: '50K+' },
];

const STATUS_CONFIG = {
  authorized: { icon: CheckCircle, color: 'text-green-400', label: 'Authorized', bg: 'bg-green-400/10' },
  pending_review: { icon: Clock, color: 'text-yellow-400', label: 'Pending Review', bg: 'bg-yellow-400/10' },
  rejected: { icon: Lock, color: 'text-red-400', label: 'Rejected', bg: 'bg-red-400/10' },
};

export default function CreatorHub() {
  const [tab, setTab] = useState('browse');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" /> Creator Hub
        </h2>
        <p className="text-xs text-muted-foreground">Trade ideas · Sell concepts · Advertise your passion</p>
      </div>

      <div className="flex border-b border-border overflow-x-auto">
        {[{id:'browse',label:'Marketplace'},{id:'sell',label:'List Idea'},{id:'advertise',label:'Advertise'},{id:'my',label:'My Listings'},{id:'analytics',label:'Analytics'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${tab===t.id?'text-primary border-b-2 border-primary':'text-muted-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {tab === 'browse' && (
          <>
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 mb-4">
              <Star className="w-4 h-4 text-primary" />
              <p className="text-xs text-primary">Only <span className="font-bold">Authorized</span> listings can be traded. Submit your idea for review first.</p>
            </div>
            {SAMPLE_IDEAS.map(idea => {
              const s = STATUS_CONFIG[idea.status];
              return (
                <div key={idea.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{idea.title}</p>
                      <p className="text-xs text-muted-foreground">{idea.author}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
                      <s.icon className="w-3 h-3" />{s.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{idea.desc}</p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3">
                      <span className="text-primary font-mono font-semibold text-sm">{idea.price} TON</span>
                      <span className="text-xs text-muted-foreground">♥ {idea.likes}</span>
                    </div>
                    {idea.status === 'authorized' ? (
                      <button className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-semibold">Buy / Trade</button>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Awaiting auth</span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === 'sell' && !submitted && (
          <div className="space-y-3">
            <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-3">
              <p className="text-xs text-yellow-400">Create editable sale or trade listings with pricing, media, condition, and buyer-facing details.</p>
            </div>
            <ListingEditor
              initialValue={{ asset_type: 'item', sale_mode: 'sell_or_trade' }}
              onSave={async (values) => {
                await base44.entities.StorefrontListing.create({
                  title: values.title,
                  description: values.description,
                  asset_type: 'item',
                  asset_id: 'creator_' + Date.now(),
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
                setSubmitted(true);
              }}
              submitLabel="Publish Creator Listing"
            />
          </div>
        )}

        {tab === 'sell' && submitted && (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold">Submitted for Review</h3>
            <p className="text-sm text-muted-foreground max-w-xs">Your listing is being reviewed for quality and safety. You'll be notified when it receives the Authorized badge.</p>
            <button onClick={() => { setSubmitted(false); }}
              className="text-primary text-sm underline">Submit another</button>
          </div>
        )}

        {tab === 'advertise' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Boost visibility for your listings, ideas, or NFTs across the platform.</p>
            {AD_SLOTS.map(ad => (
              <div key={ad.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-primary" />
                    <p className="font-medium text-sm">{ad.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{ad.desc}</p>
                  <p className="text-xs text-primary mt-1">Est. reach: {ad.reach}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-primary font-mono font-semibold text-sm">{ad.price} TON</p>
                  <button className="mt-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg px-3 py-1 text-xs font-medium hover:bg-primary/20 transition-colors">Boost</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'my' && <ListingManager assetType="item" title="Manage Creator Listings" />}

        {tab === 'analytics' && <CreatorAnalytics />}
      </div>
    </div>
  );
}