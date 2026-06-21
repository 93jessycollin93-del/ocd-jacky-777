import { Coins, Gem } from 'lucide-react';

const ICONS = {
  GOLD: Coins,
  JADEITE: Gem,
  BUNDLE: Coins,
};

const COLORS = {
  GOLD: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400',
  JADEITE: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
  BUNDLE: 'border-primary/20 bg-primary/5 text-primary',
};

export default function BazarProductCard({ product, onBuy, buying }) {
  const Icon = ICONS[product.resource_code] || Coins;
  const tone = COLORS[product.resource_code] || COLORS.GOLD;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        {product.badge ? <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">{product.badge}</span> : null}
      </div>
      <div className="mt-4">
        <p className="text-sm font-semibold text-foreground">{product.tier_label} — {product.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{product.description}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary">+1 bonus card</span>
          {product.rewards?.bonuses?.map((bonus) => (
            <span key={bonus} className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{bonus}</span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xl font-bold text-foreground">{product.amount}</p>
          <p className="text-[11px] text-muted-foreground">{product.tier_label} · {product.display_unit}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-semibold text-primary">${Number(product.price_usd || 0).toFixed(2)}</p>
          <button
            onClick={() => onBuy(product)}
            disabled={buying}
            className="mt-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {buying ? 'Processing…' : 'Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}