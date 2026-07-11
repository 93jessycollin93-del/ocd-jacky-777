import { useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Sparkles, Loader2, Wand2, CheckCircle2, BadgeDollarSign } from 'lucide-react';

export default function ListingAIAssistant({ form, onApply }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [marketTrend, setMarketTrend] = useState('stable');

  const handleGenerate = async () => {
    setLoading(true);
    const response = await base44.functions.invoke('generateListingCopy', {
      prompt,
      assetType: form.asset_type,
      saleMode: form.sale_mode,
      conditionScore: form.condition_score,
      fiatCurrency: form.fiat_currency,
      cryptoCurrency: form.crypto_currency,
      marketTrend,
      mediaUrls: (form.media_urls || []).filter(Boolean),
      existingTitle: form.title,
      existingDescription: form.description,
      existingTags: form.tags,
    });
    setResult(response.data);
    setLoading(false);
  };

  const applySuggestion = () => {
    if (!result) return;
    onApply({
      title: result.title || '',
      description: result.description || '',
      tags: (result.tags || []).join(', '),
      ask_price_fiat: result.suggested_fiat_price ?? '',
      crypto_value: result.suggested_crypto_value ?? '',
    });
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">AI Listing Writer</p>
          <p className="text-[11px] text-muted-foreground">Generate compliant, buyer-focused copy from a short prompt or media.</p>
        </div>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Example: Vintage Pokémon card in very good condition, great for collectors, emphasize authenticity and gift appeal"
        className="w-full min-h-[88px] bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select value={marketTrend} onChange={(e) => setMarketTrend(e.target.value)} className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none">
          <option value="bearish">Bearish market</option>
          <option value="stable">Stable market</option>
          <option value="bullish">Bullish market</option>
        </select>
        <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-2">
          <BadgeDollarSign className="w-4 h-4 text-primary" /> AI can suggest both {form.fiat_currency} and {form.crypto_currency} pricing.
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || (!prompt.trim() && !(form.media_urls || []).some(Boolean))}
        className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {loading ? 'Generating…' : 'Generate Copy'}
      </button>

      {result && (
        <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Suggested title</p>
            <p className="text-sm font-medium">{result.title}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Suggested description</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{result.description}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Suggested tags</p>
            <div className="flex flex-wrap gap-1.5">
              {(result.tags || []).map((tag) => (
                <span key={tag} className="px-2 py-1 rounded-full bg-card border border-border text-[11px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[11px] text-muted-foreground mb-1">Suggested fiat</p>
              <p className="text-sm font-semibold">{result.suggested_fiat_price} {form.fiat_currency}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[11px] text-muted-foreground mb-1">Suggested crypto</p>
              <p className="text-sm font-semibold">{result.suggested_crypto_value} {form.crypto_currency}</p>
            </div>
          </div>
          {result.pricing_notes && (
            <div className="text-[11px] text-muted-foreground border-t border-border pt-2">
              {result.pricing_notes}
            </div>
          )}
          {result.compliance_notes && (
            <div className="text-[11px] text-muted-foreground border-t border-border pt-2">
              {result.compliance_notes}
            </div>
          )}
          <button
            onClick={applySuggestion}
            className="w-full bg-card border border-border rounded-xl py-2 text-sm font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-primary" /> Apply to listing
          </button>
        </div>
      )}
    </div>
  )
}