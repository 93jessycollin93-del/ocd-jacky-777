import { useMemo, useState } from 'react';
import { Users, Search, Loader2 } from 'lucide-react';
import { rankFromPoints } from '@/eru/lib/guildSystem';

/**
 * Browseable directory of all active guilds with one-click join.
 */
export default function GuildDirectory({ guilds = [], joining, onJoin }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const active = guilds.filter((g) => !g.is_archived);
    if (!q) return active;
    return active.filter(
      (g) =>
        g.name?.toLowerCase().includes(q) ||
        g.tag?.toLowerCase().includes(q) ||
        g.faction?.toLowerCase().includes(q),
    );
  }, [guilds, query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guilds by name, tag, or faction"
          className="w-full rounded-xl border border-border bg-secondary pl-9 pr-3 py-2 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-4 text-center text-xs text-muted-foreground">
          No guilds yet. Be the first to found one.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((g) => {
            const rank = rankFromPoints(g.rank_points || 0);
            const isFull = (g.member_count || 0) >= (g.max_members || 50);
            const policyLabel = g.join_policy === 'invite_only' ? 'Invite-only' : g.join_policy === 'request' ? 'Request' : 'Open';
            return (
              <li key={g.id} className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center font-bold text-sm">{g.tag}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{g.name}</p>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{rank.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{g.faction || 'Neutral'} · {policyLabel}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                    <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{g.member_count || 0}/{g.max_members || 50}</span>
                    <span>🪙 {Number(g.bank_balance || 0).toLocaleString()}g</span>
                  </div>
                </div>
                <button
                  onClick={() => onJoin?.(g)}
                  disabled={isFull || g.join_policy === 'invite_only' || joining === g.id}
                  className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                >
                  {joining === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isFull ? 'Full' : g.join_policy === 'request' ? 'Request' : g.join_policy === 'invite_only' ? 'Locked' : 'Join'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}