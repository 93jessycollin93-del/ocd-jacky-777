import { useState, useEffect } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import { initiateEscrow, holdFundsInEscrow, confirmAndTransferAsset } from '@/eru/lib/economyApi';
import { ShoppingCart, Tag, Lock, AlertCircle, CheckCircle2, X } from 'lucide-react';

export default function MarketplaceTrading() {
  const { currentUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedListing, setSelectedListing] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('GOLD');
  const [creatingListing, setCreatingListing] = useState(false);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setLoading(true);
      const allListings = await base44.entities.StorefrontListing.filter(
        { status: 'active' },
        '-created_date',
        100
      );
      setListings(allListings);

      if (currentUser?.email) {
        const owned = await base44.entities.StorefrontListing.filter(
          { created_by: currentUser.email },
          '-created_date',
          50
        );
        setMyListings(owned);
      }
    } catch (err) {
      console.error('Failed to load listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async (assetType, assetId, title, price) => {
    try {
      setCreatingListing(true);
      const listing = await base44.entities.StorefrontListing.create({
        asset_id: assetId,
        asset_type: assetType,
        title,
        base_price: price,
        currency: 'GOLD',
        status: 'active'
      });
      setMyListings([listing, ...myListings]);
      alert('Listing created successfully!');
    } catch (err) {
      console.error('Failed to create listing:', err);
      alert('Failed to create listing');
    } finally {
      setCreatingListing(false);
    }
  };

  const handleBuyAsset = async (listing) => {
    if (!currentUser?.email) {
      alert('Must be logged in to purchase');
      return;
    }

    try {
      // Step 1: Create escrow
      const escrow = await initiateEscrow(
        listing.id,
        listing.created_by,
        currentUser.email,
        listing.asset_id,
        listing.asset_type,
        listing.base_price,
        paymentMethod
      );

      // Step 2: Hold funds in escrow
      await holdFundsInEscrow(escrow.id, currentUser.email, listing.base_price);

      // Step 3: Confirm and transfer asset
      await confirmAndTransferAsset(escrow.id, escrow);

      // Mark listing as sold
      await base44.entities.StorefrontListing.update(listing.id, { status: 'sold' });

      alert('Purchase completed! Asset transferred to your inventory.');
      setSelectedListing(null);
      loadListings();
    } catch (err) {
      console.error('Purchase failed:', err);
      alert(`Purchase failed: ${err.message}`);
    }
  };

  const handleCancelListing = async (listingId) => {
    try {
      await base44.entities.StorefrontListing.update(listingId, { status: 'cancelled' });
      setMyListings(myListings.filter(l => l.id !== listingId));
    } catch (err) {
      console.error('Failed to cancel listing:', err);
    }
  };

  if (selectedListing) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 pb-20">
        <div className="bg-card border border-border rounded-2xl max-w-md w-full">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold">Purchase Confirmation</h3>
            <button onClick={() => setSelectedListing(null)} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div className="bg-secondary rounded-xl p-3">
              <p className="text-sm font-semibold">{selectedListing.title}</p>
              <p className="text-xs text-muted-foreground mt-1">Type: {selectedListing.asset_type}</p>
            </div>

            <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border border-primary/30 rounded-xl">
              <span className="text-sm font-medium">Price:</span>
              <span className="text-lg font-bold text-primary">{selectedListing.base_price} GOLD</span>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Payment Method</p>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm">
                <option value="GOLD">Gold (In-game)</option>
                <option value="CRYPTO">Cryptocurrency</option>
                <option value="TON">TON Wallet</option>
                <option value="TELEGRAM_STARS">Telegram Stars</option>
              </select>
            </div>

            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-400">Funds will be held in secure escrow until asset transfer is confirmed.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedListing(null)}
                className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={() => handleBuyAsset(selectedListing)}
                className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                <ShoppingCart className="w-4 h-4 inline mr-1" /> Purchase
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" /> Marketplace
        </h2>
        <p className="text-xs text-muted-foreground">P2P Trading with Secure Escrow</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('browse')}
          className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'browse'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground'
          }`}>
          Browse Listings
        </button>
        <button
          onClick={() => setActiveTab('selling')}
          className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'selling'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground'
          }`}>
          My Listings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'browse' ? (
          listings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No listings available</p>
            </div>
          ) : (
            listings.map((listing) => (
              <div
                key={listing.id}
                onClick={() => setSelectedListing(listing)}
                className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-primary/40 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{listing.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{listing.asset_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{listing.base_price}</p>
                    <p className="text-[10px] text-muted-foreground">GOLD</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Lock className="w-3 h-3" /> Escrow Protected
                </div>
              </div>
            ))
          )
        ) : (
          myListings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No active listings</p>
            </div>
          ) : (
            myListings.map((listing) => (
              <div key={listing.id} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{listing.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {listing.status === 'active' && (
                        <span className="flex items-center gap-1 text-[10px] text-green-400">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                      {listing.status === 'sold' && (
                        <span className="text-[10px] text-muted-foreground">Sold</span>
                      )}
                    </div>
                  </div>
                  <p className="text-lg font-bold text-primary">{listing.base_price}</p>
                </div>
                {listing.status === 'active' && (
                  <button
                    onClick={() => handleCancelListing(listing.id)}
                    className="w-full mt-2 px-3 py-2 bg-secondary/50 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                    Remove Listing
                  </button>
                )}
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}