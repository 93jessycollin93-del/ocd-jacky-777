import { Image } from 'lucide-react';

export default function MiniAppNftPanel({ nfts }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Recent NFTs</p>
        </div>
        <span className="text-[11px] text-muted-foreground">{nfts.length} shown</span>
      </div>
      {nfts.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {nfts.map((nft) => (
            <div key={nft.id} className="rounded-xl border border-border bg-background p-2 space-y-2">
              <img
                src={nft.image_url || 'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=200&h=200&fit=crop'}
                alt={nft.name}
                className="w-full aspect-square rounded-lg object-cover bg-secondary"
              />
              <div>
                <p className="text-xs font-medium text-foreground truncate">{nft.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{nft.collection || nft.network || 'NFT asset'}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No recent NFT assets yet.</p>
      )}
    </div>
  );
}