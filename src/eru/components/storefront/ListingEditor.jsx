import { useState } from 'react';
import { Save } from 'lucide-react';
import CurrencyConverter from './CurrencyConverter';
import ListingAIAssistant from './ListingAIAssistant';
import MediaUploader from './MediaUploader';

const DEFAULT_FORM = {
  title: '',
  description: '',
  asset_type: 'collectible',
  sale_mode: 'sell',
  status: 'active',
  ask_price_fiat: '',
  fiat_currency: 'USD',
  crypto_currency: 'TON',
  crypto_value: '',
  trade_preferences: '',
  condition_score: 10,
  media_urls: [''],
  tags: '',
};

export default function ListingEditor({ initialValue = {}, onSave, submitLabel = 'Save Listing' }) {
  const [form, setForm] = useState({ ...DEFAULT_FORM, ...initialValue, media_urls: (initialValue.media_urls || []).filter(Boolean) });
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const applyAICopy = (values) => {
    setForm((prev) => ({ ...prev, ...values }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    await onSave({
      ...form,
      base_price: Number(form.crypto_value || 0),
      crypto_value: Number(form.crypto_value || 0),
      ask_price_fiat: Number(form.ask_price_fiat || 0),
      condition_score: Number(form.condition_score || 10),
      media_urls: form.media_urls.filter(Boolean),
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    });
    setSaving(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <ListingAIAssistant form={form} onApply={applyAICopy} />
      <input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Listing title" className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
      <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Description for buyers" className="w-full min-h-[90px] bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none" />

      <div className="grid grid-cols-3 gap-2">
        <select value={form.asset_type} onChange={(e) => setField('asset_type', e.target.value)} className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none">
          {['nft', 'collectible', 'item', 'card', 'jade', 'bot'].map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={form.sale_mode} onChange={(e) => setField('sale_mode', e.target.value)} className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none">
          <option value="sell">For sale</option>
          <option value="trade">For trade</option>
          <option value="sell_or_trade">Sell or trade</option>
        </select>
        <select value={form.status} onChange={(e) => setField('status', e.target.value)} className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" title="Listing visibility">
          <option value="active">Published</option>
          <option value="paused">Paused</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input type="number" value={form.ask_price_fiat} onChange={(e) => setField('ask_price_fiat', e.target.value)} placeholder="Fiat price" className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
        <select value={form.fiat_currency} onChange={(e) => setField('fiat_currency', e.target.value)} className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none">
          {['USD', 'CAD', 'EUR'].map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
        <select value={form.crypto_currency} onChange={(e) => setField('crypto_currency', e.target.value)} className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none">
          {['TON', 'ETH', 'BTC'].map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
      </div>

      <CurrencyConverter
        fiatAmount={form.ask_price_fiat}
        fiatCurrency={form.fiat_currency}
        cryptoCurrency={form.crypto_currency}
        onConverted={(value) => setField('crypto_value', value.toFixed(4))}
      />

      <input value={form.crypto_value} onChange={(e) => setField('crypto_value', e.target.value)} placeholder="Crypto value" className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />

      {(form.sale_mode === 'trade' || form.sale_mode === 'sell_or_trade') && (
        <input value={form.trade_preferences} onChange={(e) => setField('trade_preferences', e.target.value)} placeholder="What would you accept in trade?" className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Condition score</span>
          <span>{form.condition_score}/10</span>
        </div>
        <input type="range" min="1" max="10" value={form.condition_score} onChange={(e) => setField('condition_score', e.target.value)} className="w-full accent-primary" />
      </div>

      <MediaUploader urls={form.media_urls} onChange={(next) => setField('media_urls', next)} max={6} />

      <input value={form.tags} onChange={(e) => setField('tags', e.target.value)} placeholder="Tags (comma separated)" className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none" />

      <button onClick={handleSubmit} disabled={!form.title || !form.crypto_value || saving} className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
        <Save className="w-4 h-4" /> {saving ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}