import { useState, useEffect } from 'react';
import { Gavel, Clock, TrendingUp, Plus } from 'lucide-react';

const INITIAL_BIDS = [
  { id: 1, bidder: 'CryptoWolf', amount: 420, time: '2m ago', avatar: 'CW' },
  { id: 2, bidder: 'NeonTrader', amount: 390, time: '8m ago', avatar: 'NT' },
  { id: 3, bidder: 'PixelNomad', amount: 360, time: '15m ago', avatar: 'PN' },
  { id: 4, bidder: 'StarWeaver', amount: 320, time: '31m ago', avatar: 'SW' },
];

function getTimeLeft(endTime) {
  if (!endTime) return null;
  const diff = endTime - Date.now();
  if (diff <= 0) return 'Ended';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function BiddingHistory({ basePrice, isOwner }) {
  const [bids, setBids] = useState(INITIAL_BIDS);
  const [bidAmount, setBidAmount] = useState('');
  const [auctionEnd, setAuctionEnd] = useState(null);
  const [endInput, setEndInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [pulse, setPulse] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!auctionEnd) return;
    const timer = setInterval(() => setTimeLeft(getTimeLeft(auctionEnd)), 1000);
    return () => clearInterval(timer);
  }, [auctionEnd]);

  // Simulate incoming bids
  useEffect(() => {
    if (!auctionEnd || Date.now() > auctionEnd) return;
    const names = ['GhostBid','VaultKey','LunarApe','DeepNode'];
    const timer = setInterval(() => {
      const top = bids[0]?.amount || basePrice;
      const newBid = {
        id: Date.now(),
        bidder: names[Math.floor(Math.random() * names.length)],
        amount: top + Math.floor(Math.random() * 30 + 10),
        time: 'just now',
        avatar: 'LV',
      };
      setBids(prev => [newBid, ...prev]);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 8000);
    return () => clearInterval(timer);
  }, [auctionEnd, bids]);

  const topBid = bids[0]?.amount || basePrice;

  const placeBid = () => {
    const val = Number(bidAmount);
    if (!val || val <= topBid) return;
    setBids(prev => [{ id: Date.now(), bidder: 'You', amount: val, time: 'just now', avatar: 'YO' }, ...prev]);
    setBidAmount('');
    setPulse(true);
    setTimeout(() => setPulse(false), 600);
  };

  const startAuction = () => {
    const hours = Number(endInput);
    if (!hours || hours <= 0) return;
    setAuctionEnd(Date.now() + hours * 3600000);
    setTimeLeft(getTimeLeft(Date.now() + hours * 3600000));
    setEndInput('');
  };

  const auctionActive = auctionEnd && Date.now() < auctionEnd;
  const auctionEnded = auctionEnd && Date.now() >= auctionEnd;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Live Auction</p>
          {auctionActive && (
            <span className="flex items-center gap-1 text-xs bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
          {auctionEnded && (
            <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">Ended</span>
          )}
        </div>
        {timeLeft && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <Clock className="w-3 h-3" />{timeLeft}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Current top bid */}
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-all duration-300 ${pulse ? 'bg-primary/20 border-primary/50' : 'bg-primary/5 border-primary/20'}`}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Top Bid</span>
          </div>
          <span className="text-xl font-mono font-bold text-primary">${topBid}</span>
        </div>

        {/* Owner: set auction end time */}
        {isOwner && !auctionEnd && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Set Auction Duration</p>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={endInput}
                onChange={e => setEndInput(e.target.value)}
                placeholder="Hours (e.g. 24)"
                className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none"
              />
              <button onClick={startAuction}
                className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap">
                Start Auction
              </button>
            </div>
            <div className="flex gap-2">
              {[1, 6, 12, 24, 48].map(h => (
                <button key={h} onClick={() => setEndInput(String(h))}
                  className="text-xs px-2 py-1 rounded-lg bg-secondary border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  {h}h
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Place a bid */}
        {!isOwner && (
          <div className="flex gap-2">
            <input
              type="number"
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              placeholder={`Bid > $${topBid}`}
              disabled={!auctionActive}
              className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none disabled:opacity-50"
            />
            <button
              onClick={placeBid}
              disabled={!auctionActive || !bidAmount || Number(bidAmount) <= topBid}
              className="flex items-center gap-1 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-40">
              <Plus className="w-3 h-3" /> Bid
            </button>
          </div>
        )}
        {!auctionActive && !auctionEnded && !isOwner && (
          <p className="text-xs text-muted-foreground text-center">Auction not started yet</p>
        )}

        {/* Bid history list */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Bid History</p>
          {bids.map((bid, i) => (
            <div key={bid.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${i === 0 ? 'bg-primary/5 border-primary/20' : 'bg-secondary border-transparent'}`}>
              <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0">
                {bid.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{bid.bidder}</p>
                <p className="text-[10px] text-muted-foreground">{bid.time}</p>
              </div>
              <span className={`text-sm font-mono font-bold ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                ${bid.amount}
              </span>
              {i === 0 && <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full font-medium">TOP</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}