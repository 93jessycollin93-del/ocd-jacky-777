import { useState } from 'react';
import { usePriceMap } from '../hooks/useCryptoPrices';
import { ArrowDown, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/eru/context/LanguageContext';

const ASSETS = ['TON','BTC','ETH','USDT','BNB','SOL'];

export default function Trade() {
  const { t } = useLanguage();
  const prices = usePriceMap();
  const [tab, setTab] = useState('swap');
  const [from, setFrom] = useState('TON');
  const [to, setTo] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [side, setSide] = useState('buy');
  const [limitPrice, setLimitPrice] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const fromPrice = prices[from]?.price || 0;
  const toPrice = prices[to]?.price || 0;
  const received = amount ? ((parseFloat(amount) * fromPrice) / toPrice).toFixed(6) : '';

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="flex border-b border-border">
        {['swap','spot'].map(tName => (
          <button key={tName} onClick={() => setTab(tName)}
            className={`flex-1 py-3 text-sm font-medium ${tab === tName ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            {t(`trade.${tName}`, undefined, tName)}
          </button>
        ))}
      </div>
      <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/5 px-3 py-2">
        <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-yellow-300/90 leading-relaxed">
          {t('trade.notWiredWarning', undefined, 'Swap and order routing is not connected yet. Quotes shown use live reference prices, but no trade is submitted.')}
        </p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {tab === 'swap' ? (
          <>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">{t('trade.from', undefined, 'From')}</p>
              <div className="flex items-center gap-2">
                <select value={from} onChange={e => setFrom(e.target.value)}
                  className="bg-secondary text-foreground text-sm rounded-lg px-2 py-1 border border-border">
                  {ASSETS.map(a => <option key={a}>{a}</option>)}
                </select>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0.00" className="flex-1 bg-transparent text-right text-xl font-mono text-foreground outline-none"/>
              </div>
              <p className="text-xs text-muted-foreground text-right mt-1">≈ ${(parseFloat(amount || 0) * fromPrice).toFixed(2)}</p>
            </div>

            <div className="flex justify-center">
              <button className="bg-secondary border border-border rounded-full p-2 hover:border-primary/50 transition-colors">
                <ArrowDown className="w-4 h-4 text-primary"/>
              </button>
            </div>

            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">{t('trade.to', undefined, 'To')}</p>
              <div className="flex items-center gap-2">
                <select value={to} onChange={e => setTo(e.target.value)}
                  className="bg-secondary text-foreground text-sm rounded-lg px-2 py-1 border border-border">
                  {ASSETS.filter(a => a !== from).map(a => <option key={a}>{a}</option>)}
                </select>
                <span className="flex-1 text-right text-xl font-mono text-muted-foreground">{received || '0.00'}</span>
              </div>
            </div>

            <div className="bg-secondary rounded-xl p-3 text-xs space-y-1 text-muted-foreground">
              <div className="flex justify-between"><span>{t('trade.rate', undefined, 'Rate')}</span><span className="font-mono text-foreground">1 {from} = {(fromPrice/toPrice).toFixed(4)} {to}</span></div>
              <div className="flex justify-between"><span>{t('trade.networkFee', undefined, 'Network Fee')}</span><span className="font-mono text-foreground">~0.05 TON</span></div>
              <div className="flex justify-between"><span>{t('trade.slippage', undefined, 'Slippage')}</span><span className="font-mono text-foreground">0.5%</span></div>
            </div>

            <button onClick={() => setShowConfirm(true)}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm glow-green hover:opacity-90 transition-opacity">
              {t('trade.swapAction', { from, to }, `Swap ${from} → ${to}`)}
            </button>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              {['buy','sell'].map(s => (
                <button key={s} onClick={() => setSide(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${side === s ? (s==='buy'?'bg-green-500/20 text-green-400 border border-green-500/30':'bg-red-500/20 text-red-400 border border-red-500/30') : 'bg-secondary text-muted-foreground'}`}>
                  {t(`trade.${s}`, undefined, s)}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {['market','limit'].map(o => (
                <button key={o} onClick={() => setOrderType(o)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono ${orderType === o ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                  {t(`trade.${o}`, undefined, o)}
                </button>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-3 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('trade.asset', undefined, 'Asset')}</p>
                <select className="w-full bg-secondary text-foreground text-sm rounded-lg px-2 py-2 border border-border">
                  {ASSETS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              {orderType === 'limit' && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('trade.limitPrice', undefined, 'Limit Price (USDT)')}</p>
                  <input type="number" value={limitPrice} onChange={e => setLimitPrice(e.target.value)}
                    className="w-full bg-secondary text-foreground rounded-lg px-2 py-2 border border-border text-sm font-mono"/>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('trade.amount', undefined, 'Amount')}</p>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  className="w-full bg-secondary text-foreground rounded-lg px-2 py-2 border border-border text-sm font-mono"/>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3 h-3 flex-shrink-0"/>
              {t('trade.riskWarning', undefined, 'Trading involves risk. Only trade what you can afford to lose.')}
            </div>

            <button onClick={() => setShowConfirm(true)}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm ${side==='buy' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} hover:opacity-90 transition-opacity`}>
              {side === 'buy' ? t('trade.buyOrder', undefined, 'Buy Order') : t('trade.sellOrder', undefined, 'Sell Order')}
            </button>
          </>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-card border-t border-border w-full rounded-t-2xl p-5 space-y-4">
            <h3 className="text-lg font-semibold">{t('trade.confirm', undefined, 'Confirm Transaction')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('trade.type', undefined, 'Type')}</span><span className="font-mono capitalize">{tab === 'swap' ? t('trade.swap', undefined, 'Swap') : `${side} ${orderType}`}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('trade.amount', undefined, 'Amount')}</span><span className="font-mono">{amount} {from}</span></div>
              {tab==='swap' && <div className="flex justify-between"><span className="text-muted-foreground">{t('trade.receive', undefined, 'Receive')}</span><span className="font-mono text-green-400">{received} {to}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">{t('trade.fee', undefined, 'Fee')}</span><span className="font-mono">~0.05 TON</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-secondary rounded-xl text-sm font-medium">{t('common.cancel', undefined, 'Cancel')}</button>
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold glow-green">{t('common.confirm', undefined, 'Confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}