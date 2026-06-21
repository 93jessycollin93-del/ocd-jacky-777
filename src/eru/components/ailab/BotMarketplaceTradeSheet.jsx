import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { ALL_MARKET_CURRENCIES, CRYPTO_CURRENCIES } from './botMarketplaceCurrencies';

export default function BotMarketplaceTradeSheet({ bot, myBots, currentUser, onClose, onSubmitted }) {
  const [proposalType, setProposalType] = useState(bot.marketplace_sale_mode === 'trade' ? 'trade' : 'mixed');
  const [selectedBotIds, setSelectedBotIds] = useState([]);
  const [moneyAmount, setMoneyAmount] = useState('');
  const [moneyCurrency, setMoneyCurrency] = useState(bot.marketplace_currency || 'USD');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cryptoCurrency, setCryptoCurrency] = useState('TON');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const offerableBots = useMemo(() => myBots.filter((item) => item.id !== bot.id), [myBots, bot.id]);

  const toggleBot = (botId) => {
    setSelectedBotIds((prev) => prev.includes(botId) ? prev.filter((id) => id !== botId) : [...prev, botId]);
  };

  const submit = async () => {
    setSubmitting(true);
    const offeredBots = offerableBots.filter((item) => selectedBotIds.includes(item.id));
    await base44.entities.BotTradeProposal.create({
      listing_bot_id: bot.id,
      listing_bot_name: bot.name,
      seller_email: bot.created_by,
      buyer_email: currentUser.email,
      proposal_type: proposalType,
      offered_bot_ids: offeredBots.map((item) => item.id),
      offered_bot_names: offeredBots.map((item) => item.name),
      money_amount: moneyAmount ? Number(moneyAmount) : undefined,
      money_currency: moneyAmount ? moneyCurrency : undefined,
      crypto_amount: cryptoAmount ? Number(cryptoAmount) : undefined,
      crypto_currency: cryptoAmount ? cryptoCurrency : undefined,
      telegram_stars_amount: cryptoCurrency === 'TELEGRAM_STARS' && cryptoAmount ? Number(cryptoAmount) : undefined,
      offer_message: message,
    });
    setSubmitting(false);
    onSubmitted?.();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4 md:p-6">
      <div className="mx-auto flex h-full max-w-2xl flex-col rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <p className="text-sm font-semibold">Make an offer for {bot.name}</p>
            <p className="text-xs text-muted-foreground">Mix bots, money, crypto, Telegram Stars, or a custom trade note.</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-border p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {['buy', 'trade', 'mixed', 'open_offer'].map((option) => (
              <button key={option} onClick={() => setProposalType(option)} className={`rounded-xl border px-3 py-2 text-xs font-medium ${proposalType === option ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/40 text-muted-foreground'}`}>
                {option.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Offer your bots</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {offerableBots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground">No other bots in your workspace yet.</div>
              ) : offerableBots.map((item) => (
                <button key={item.id} onClick={() => toggleBot(item.id)} className={`rounded-xl border p-3 text-left ${selectedBotIds.includes(item.id) ? 'border-primary bg-primary/10' : 'border-border bg-secondary/20'}`}>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.role}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3">
              <p className="text-xs font-semibold text-foreground">Money offer</p>
              <input value={moneyAmount} onChange={(e) => setMoneyAmount(e.target.value)} placeholder="Amount" className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none" />
              <select value={moneyCurrency} onChange={(e) => setMoneyCurrency(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none">
                {ALL_MARKET_CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </select>
            </div>
            <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3">
              <p className="text-xs font-semibold text-foreground">Crypto / Stars offer</p>
              <input value={cryptoAmount} onChange={(e) => setCryptoAmount(e.target.value)} placeholder="Amount" className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none" />
              <select value={cryptoCurrency} onChange={(e) => setCryptoCurrency(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none">
                {CRYPTO_CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Trade note</p>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Offer anything for trade: services, revenue share, bundle ideas, custom terms..." className="min-h-[120px] w-full rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none" />
          </div>
        </div>

        <div className="border-t border-border p-4">
          <button onClick={submit} disabled={submitting} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {submitting ? 'Sending offer…' : 'Send offer'}
          </button>
        </div>
      </div>
    </div>
  );
}