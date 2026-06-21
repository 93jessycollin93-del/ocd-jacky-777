import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { SlidersHorizontal, Plus, Trash2, ArrowRightLeft, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/eru/components/ui/dialog';
import { Button } from '@/eru/components/ui/button';

const percent = (value, total) => total > 0 ? (value / total) * 100 : 0;
const formatMoney = (value) => `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function TargetAllocationPanel({ holdings }) {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [review, setReview] = useState(null);

  const totalValue = useMemo(() => holdings.reduce((sum, item) => sum + Number(item.value_usd || 0), 0), [holdings]);

  const symbols = useMemo(() => {
    const map = new Map();
    holdings.forEach((item) => {
      if (!map.has(item.symbol)) {
        map.set(item.symbol, {
          symbol: item.symbol,
          current_value: 0,
          current_percentage: 0,
        });
      }
      map.get(item.symbol).current_value += Number(item.value_usd || 0);
    });

    return Array.from(map.values()).map((item) => ({
      ...item,
      current_percentage: percent(item.current_value, totalValue),
    }));
  }, [holdings, totalValue]);

  useEffect(() => {
    loadTargets();
  }, [holdings.length]);

  const loadTargets = async () => {
    setLoading(true);
    const rows = await base44.entities.PortfolioWeighting.list('-updated_date', 100);
    const merged = symbols.map((item) => {
      const saved = rows.find((row) => row.asset_symbol === item.symbol && row.is_active !== false);
      return {
        symbol: item.symbol,
        target: saved?.target_percentage ?? Math.round(item.current_percentage),
      };
    });
    setTargets(merged.length > 0 ? merged : []);
    setLoading(false);
  };

  const addAsset = () => {
    setTargets((prev) => [...prev, { symbol: '', target: 0 }]);
  };

  const updateTarget = (index, key, value) => {
    setTargets((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: key === 'target' ? Number(value || 0) : value.toUpperCase() } : item));
  };

  const removeTarget = (index) => {
    setTargets((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const totalTarget = targets.reduce((sum, item) => sum + Number(item.target || 0), 0);

  const saveTargets = async () => {
    const existing = await base44.entities.PortfolioWeighting.list('-updated_date', 100);
    await Promise.all(existing.map((row) => base44.entities.PortfolioWeighting.update(row.id, { is_active: false })));
    await Promise.all(targets.filter((item) => item.symbol).map((item) => {
      const existingRow = existing.find((row) => row.asset_symbol === item.symbol);
      const payload = {
        user_email: existingRow?.user_email,
        asset_symbol: item.symbol,
        target_percentage: Number(item.target || 0),
        min_threshold: Math.max(0, Number(item.target || 0) - 5),
        max_threshold: Number(item.target || 0) + 5,
        is_active: true,
        rebalance_frequency: 'manual',
      };
      return existingRow
        ? base44.entities.PortfolioWeighting.update(existingRow.id, payload)
        : base44.entities.PortfolioWeighting.create(payload);
    }));
  };

  const generatePlan = async () => {
    setPlanning(true);
    await saveTargets();
    const allocation = Object.fromEntries(targets.filter((item) => item.symbol).map((item) => [item.symbol, Number(item.target || 0)]));
    const response = await base44.functions.invoke('calculatePortfolioRebalance', {
      holdings,
      targetAllocation: allocation,
    });
    setReview(response.data);
    setReviewOpen(true);
    setPlanning(false);
  };

  const markReviewed = async () => {
    if (review?.suggestion_id) {
      await base44.entities.RebalancingSuggestion.update(review.suggestion_id, { status: 'reviewed' });
    }
    setReviewOpen(false);
  };

  if (loading) {
    return <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-sm font-semibold">Target Allocation Automation</h3>
              <p className="text-[11px] text-muted-foreground">Set percentage goals across your combined holdings and generate a rebalance review.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={addAsset} className="gap-1 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>

        <div className="space-y-2">
          {targets.map((item, index) => {
            const current = symbols.find((row) => row.symbol === item.symbol);
            return (
              <div key={`${item.symbol}-${index}`} className="grid grid-cols-[1fr_110px_32px] gap-2 items-center rounded-xl border border-border bg-secondary/60 p-3">
                <div>
                  <input
                    value={item.symbol}
                    onChange={(e) => updateTarget(index, 'symbol', e.target.value)}
                    placeholder="Asset symbol"
                    className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Current {current ? `${current.current_percentage.toFixed(1)}% · ${formatMoney(current.current_value)}` : '0.0% · $0'}
                  </p>
                </div>
                <div>
                  <input
                    type="number"
                    value={item.target}
                    onChange={(e) => updateTarget(index, 'target', e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Target %</p>
                </div>
                <button onClick={() => removeTarget(index)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3">
          <div>
            <p className="text-[11px] text-muted-foreground">Target total</p>
            <p className={`text-lg font-semibold ${totalTarget === 100 ? 'text-primary' : 'text-destructive'}`}>{totalTarget}%</p>
          </div>
          <Button onClick={generatePlan} disabled={planning || totalTarget !== 100 || targets.length === 0} className="gap-2 text-xs">
            {planning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
            Review rebalance
          </Button>
        </div>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Review rebalance plan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border bg-secondary/50 p-3">
                <p className="text-[11px] text-muted-foreground">Portfolio value</p>
                <p className="text-sm font-semibold">{formatMoney(review?.portfolio_value)}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/50 p-3">
                <p className="text-[11px] text-muted-foreground">Sell total</p>
                <p className="text-sm font-semibold">{formatMoney(review?.total_sell_amount)}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/50 p-3">
                <p className="text-[11px] text-muted-foreground">Buy total</p>
                <p className="text-sm font-semibold">{formatMoney(review?.total_buy_amount)}</p>
              </div>
            </div>

            <div className="space-y-2">
              {(review?.recommendations || []).map((item, index) => (
                <div key={`${item.token}-${index}`} className="rounded-xl border border-border bg-secondary/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase">{item.token}</p>
                      <p className="text-[11px] text-muted-foreground">{item.current_percent}% now → {item.target_percent}% target</p>
                    </div>
                    <p className={`text-xs font-semibold ${item.action === 'buy' ? 'text-primary' : 'text-destructive'}`}>
                      {item.action.toUpperCase()} {formatMoney(item.amount_usd)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-primary mb-2">Suggested trade sequence</p>
              <div className="space-y-1">
                {(review?.trade_plan || []).map((step, index) => (
                  <p key={index} className="text-xs text-foreground">{index + 1}. {step}</p>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Close</Button>
            <Button onClick={markReviewed}>Mark reviewed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}