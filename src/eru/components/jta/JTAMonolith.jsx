import { useState, useMemo } from 'react';
import { Gem, Package, Loader2 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useLivePriceMap } from '@/eru/hooks/useLiveSync';
import JTAPriceConverter from './JTAPriceConverter';
import JTARefreshControls from './JTARefreshControls';

const MONOLITH_TOTAL_KG = 3_000_000; // 3,000 tonnes
const SECTORS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Theta', 'Omega'];
const COLORS = ['imperial_green', 'lavender', 'ice', 'russet', 'black'];
const COLOR_LABELS = { imperial_green: 'Imperial Green', lavender: 'Lavender', ice: 'Ice White', russet: 'Russet', black: 'Black Jade' };
const COLOR_STYLES = {
  imperial_green: 'from-emerald-700/40 to-emerald-900/60 border-emerald-600/40',
  lavender: 'from-purple-700/40 to-purple-900/60 border-purple-600/40',
  ice: 'from-cyan-600/30 to-slate-700/60 border-cyan-400/30',
  russet: 'from-orange-700/40 to-amber-900/60 border-orange-500/40',
  black: 'from-slate-700/60 to-slate-900/80 border-slate-500/40',
};

// Server-validated price for a Monolith jade chunk. NEVER trust the client-
// side string for the actual transaction record — the value is fixed here
// and written verbatim into the JadeTransaction ledger.
const CHUNK_PRICE_USD = 20.00;

function snap5(val) { return Math.round(val / 5) * 5; }

function rollJade() {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const sector = SECTORS[Math.floor(Math.random() * SECTORS.length)];
  const depth = Math.floor(Math.random() * 100);
  const volume = parseFloat((Math.random() * 199 + 1).toFixed(2)); // 1–200 kg
  return {
    batch: 'batch_1',
    origin_sector: sector,
    origin_depth: depth,
    extraction_date: new Date().toISOString(),
    volume_kg: volume,
    color_type: color,
    purity: snap5(Math.max(5, Math.floor(Math.random() * 100))),
    vividness: snap5(Math.max(5, Math.floor(Math.random() * 100))),
    size_grade: snap5(Math.max(5, Math.min(100, Math.floor(volume / 2)))),
    texture: snap5(Math.max(5, Math.floor(Math.random() * 100))),
    composite_score: 0,
    lifecycle_state: 'raw',
    crafted_form: 'raw_block',
    resonance_history: [],
    ownership_timeline: [],
    jade_coins_minted: 0,
    fracture_count: 0,
    is_listed: false,
    is_masterwork: false,
    card_attachments: [],
  };
}

export default function JTAMonolith({ onExtracted, totalExtracted = 0 }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [currency, setCurrency] = useState('USD');

  // Live TON price drives whether non-USD payment options are connected.
  const { map, status: priceStatus } = useLivePriceMap();
  const tonReady = priceStatus === 'live' && (map?.TON?.price || 0) > 0;
  // Stars are available only inside the Telegram Mini App webview.
  const starsReady = useMemo(() => {
    try { return Boolean(window?.Telegram?.WebApp?.initData); } catch { return false; }
  }, []);
  const paymentReady = currency === 'USD' || (currency === 'TON' && tonReady) || (currency === 'STARS' && starsReady);

  const monolithRemaining = Math.max(0, MONOLITH_TOTAL_KG - totalExtracted);
  const pctUsed = ((totalExtracted / MONOLITH_TOTAL_KG) * 100).toFixed(3);

  const handleRoll = () => {
    setPreview(rollJade());
    setConfirmed(false);
  };

  const handleConfirm = async () => {
    if (!preview || !paymentReady) return;
    setLoading(true);
    try {
      // The jade is rolled and minted authoritatively by the backend. The
      // client `preview` is for display only — it is NOT trusted or sent as the
      // final stats (that previously let users mint arbitrary jade for free).
      const res = await base44.functions.invoke('mintMonolithJade', {});
      const data = res?.data ?? res;
      if (!data?.ok) throw new Error(data?.error || 'Extraction failed');
      setConfirmed(true);
      onExtracted?.(data.jade);
    } catch (err) {
      console.error('Monolith extraction failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Monolith status */}
      <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Batch 1 Monolith</span>
          <span className="text-xs font-mono text-muted-foreground">{monolithRemaining.toLocaleString()} kg remaining</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-full transition-all"
            style={{ width: `${Math.max(0.1, 100 - parseFloat(pctUsed))}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{pctUsed}% extracted — non-recreatable reserve</p>
      </div>

      {/* Refresh controls — daily free + paid reroll. Always visible so the
          user can see the countdown even when no preview is open. */}
      <JTARefreshControls
        scope="monolith"
        paymentReady={tonReady || starsReady || true /* USD always available */}
        paymentLabel={currency}
        onRefresh={async () => { handleRoll(); }}
      />

      {/* Mystery box */}
      {!preview && (
        <button onClick={handleRoll}
          className="w-full py-5 rounded-2xl border-2 border-dashed border-emerald-700/40 bg-emerald-950/20 flex flex-col items-center gap-2 hover:border-emerald-500/60 hover:bg-emerald-950/40 transition-all group">
          <Package className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-sm">Open Mystery Box</span>
          <span className="text-xs text-muted-foreground">${CHUNK_PRICE_USD.toFixed(2)} USD — Slices a unique volume from the Monolith</span>
        </button>
      )}

      {preview && !confirmed && (
        <div className={`rounded-2xl border bg-gradient-to-br p-4 space-y-3 ${COLOR_STYLES[preview.color_type]}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{COLOR_LABELS[preview.color_type]}</p>
              <p className="text-xs text-muted-foreground">Sector {preview.origin_sector} · Depth {preview.origin_depth}m</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-bold">{preview.volume_kg} kg</p>
              <p className="text-xs text-muted-foreground">Composite {Math.round((preview.purity + preview.vividness + preview.size_grade + preview.texture) / 4)}%</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[['Purity', preview.purity], ['Vividness', preview.vividness], ['Size', preview.size_grade], ['Texture', preview.texture]].map(([k, v]) => (
              <div key={k} className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase">{k}</p>
                <p className="text-sm font-mono font-bold text-emerald-300">{v}%</p>
              </div>
            ))}
          </div>

          {/* Currency selector — USD / TON / Stars (with Not Connected fallback) */}
          <div className="rounded-xl bg-black/20 p-2.5">
            <JTAPriceConverter
              priceUsd={CHUNK_PRICE_USD}
              value={currency}
              onChange={setCurrency}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={handleConfirm} disabled={loading || !paymentReady}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gem className="w-4 h-4" />}
              {paymentReady ? `Confirm — $${CHUNK_PRICE_USD.toFixed(2)} + 1 bonus card` : 'Payment Not Connected'}
            </button>
            <button onClick={() => setPreview(null)} className="px-3 py-2.5 bg-secondary border border-border rounded-xl text-xs text-muted-foreground">Close</button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">Need a different roll? Use the refresh controls above (1 free per 24h, paid rerolls $1).</p>
        </div>
      )}

      {confirmed && (
        <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4 text-center space-y-1">
          <Gem className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className="font-semibold text-sm text-emerald-300">Jade Extracted & Recorded</p>
          <p className="text-xs text-muted-foreground">Historical receipt created on the ledger.</p>
          <button onClick={() => { setPreview(null); setConfirmed(false); }}
            className="mt-2 text-xs text-emerald-400 underline underline-offset-2">Open another box</button>
        </div>
      )}
    </div>
  );
}