import { Clock, Hammer, Zap, Link, ShoppingBag, RotateCcw, Package } from 'lucide-react';

const EVENT_ICONS = {
  extraction: Package,
  craft: Hammer,
  fracture: Zap,
  socket: Link,
  unsocket: Link,
  trade: ShoppingBag,
  mint_coins: Zap,
  blueprint_reset: RotateCcw,
};

const COLOR_TYPES = {
  imperial_green: 'text-emerald-400',
  lavender: 'text-purple-400',
  ice: 'text-cyan-400',
  russet: 'text-orange-400',
  black: 'text-slate-400',
};

const COLOR_LABELS = {
  imperial_green: 'Imperial Green',
  lavender: 'Lavender',
  ice: 'Ice White',
  russet: 'Russet',
  black: 'Black Jade',
};

export default function JTAResonanceLog({ jade }) {
  if (!jade) return null;

  const history = [...(jade.resonance_history || [])].reverse();
  const colorClass = COLOR_TYPES[jade.color_type] || 'text-emerald-400';
  const colorLabel = COLOR_LABELS[jade.color_type] || jade.color_type;

  return (
    <div className="space-y-4">
      {/* Identity card */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className={`font-semibold text-sm ${colorClass}`}>{colorLabel}</p>
            <p className="text-xs text-muted-foreground">Sector {jade.origin_sector} · Depth {jade.origin_depth}m · {jade.volume_kg}kg</p>
          </div>
          <span className="text-xs bg-secondary border border-border px-2 py-0.5 rounded-full font-mono capitalize">
            {jade.lifecycle_state}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[['Purity', jade.purity], ['Vivid', jade.vividness], ['Size', jade.size_grade], ['Texture', jade.texture]].map(([k, v]) => (
            <div key={k} className="text-center bg-secondary/40 rounded-lg py-1.5">
              <p className="text-[9px] text-muted-foreground">{k}</p>
              <p className="text-xs font-mono font-bold text-foreground">{v}%</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Composite</span>
          <span className="font-mono font-bold text-foreground">{jade.composite_score}%</span>
          <span className="text-muted-foreground ml-2">Resonance</span>
          <span className="font-mono font-bold text-yellow-400">{jade.historical_resonance_score || 0}</span>
          {jade.is_masterwork && <span className="ml-auto text-yellow-400 text-[10px]">✨ Masterwork</span>}
        </div>

        {jade.masterwork_buff && (
          <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-300">{jade.masterwork_buff}</p>
          </div>
        )}

        {jade.jade_coins_minted > 0 && (
          <p className="text-xs text-emerald-400 font-mono">💎 {jade.jade_coins_minted} $JADE minted from this asset</p>
        )}
      </div>

      {/* Ownership timeline */}
      {(jade.ownership_timeline || []).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Lineage</p>
          {jade.ownership_timeline.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b border-border last:border-0">
              <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[9px] text-muted-foreground font-mono">{i + 1}</span>
              <span className="flex-1 truncate text-foreground">{entry.owner}</span>
              <span className="text-muted-foreground">{entry.acquired_at ? new Date(entry.acquired_at).toLocaleDateString() : '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Resonance history */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Resonance Memory</p>
        {history.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No events recorded yet.</p>}
        {history.map((evt, i) => {
          const Icon = EVENT_ICONS[evt.event_type] || Clock;
          return (
            <div key={i} className="flex gap-3 text-xs">
              <div className="w-6 h-6 rounded-lg bg-secondary border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-foreground leading-snug">{evt.description}</p>
                <p className="text-muted-foreground text-[10px] mt-0.5">
                  {evt.actor} · {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : '—'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}