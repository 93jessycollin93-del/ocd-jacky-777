import { useEffect, useState, useCallback } from 'react';
import { Shield, Users, LogOut, Loader2, Coins, AlertTriangle, ScrollText, Sparkles } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { fetchUserGold } from '@/eru/lib/economyApi';
import {
  loadGuildDetail,
  getMyMembership,
  joinGuild,
  leaveGuild,
} from '@/eru/lib/guildSystem';
import GuildRankBadge from '../components/guilds/GuildRankBadge';
import GuildBankPanel from '../components/guilds/GuildBankPanel';
import GuildCosmeticsPanel from '../components/guilds/GuildCosmeticsPanel';
import GuildDirectory from '../components/guilds/GuildDirectory';
import CreateGuildForm from '../components/guilds/CreateGuildForm';

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: Shield },
  { id: 'members',    label: 'Members',    icon: Users },
  { id: 'bank',       label: 'Bank',       icon: Coins },
  { id: 'cosmetics',  label: 'Cosmetics',  icon: Sparkles },
  { id: 'log',        label: 'Bank Log',   icon: ScrollText },
];

export default function GuildsPage() {
  const [me, setMe] = useState(null);
  const [membership, setMembership] = useState(null);
  const [detail, setDetail] = useState(null);
  const [allGuilds, setAllGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [joining, setJoining] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState(null);
  const [gold, setGold] = useState(0);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const user = await base44.auth.me().catch(() => null);
      setMe(user);
      const [my, list, balance] = await Promise.all([
        getMyMembership(),
        base44.entities.Guild.list('-rank_points', 200).catch(() => []),
        fetchUserGold().catch(() => 0),
      ]);
      setMembership(my);
      setAllGuilds(list || []);
      setGold(balance);
      if (my?.guild_id) {
        const d = await loadGuildDetail(my.guild_id);
        setDetail(d);
      } else {
        setDetail(null);
      }
    } catch (err) {
      setError('Could not load guild data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleJoin = async (guild) => {
    setError(null);
    setJoining(guild.id);
    try {
      await joinGuild(guild.id);
      await refresh();
    } catch (err) {
      setError(err?.message || 'Could not join guild.');
    } finally {
      setJoining(null);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Leave this guild? Your contribution stats will reset.')) return;
    setLeaving(true);
    try {
      await leaveGuild();
      await refresh();
      setTab('overview');
    } catch (err) {
      setError(err?.message || 'Could not leave guild.');
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── No guild yet → directory + create ──
  if (!membership || !detail) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-20">
        <Header gold={gold} subtitle="Found or join a guild to pool your win-rates and unlock cosmetics" />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && <ErrorBanner message={error} />}
          <CreateGuildForm onCreated={refresh} />
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">All Guilds</p>
            <GuildDirectory guilds={allGuilds} joining={joining} onJoin={handleJoin} />
          </div>
        </div>
      </div>
    );
  }

  // ── Member view ──
  const { guild, members, transactions, pooled, rankPoints, rank } = detail;
  const isLeader = guild.leader_email === me?.email;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <Header
        gold={gold}
        subtitle={`${guild.faction || 'Neutral'} · ${guild.tag}`}
        title={guild.name}
      />

      <div className="flex border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2
              ${tab === t.id ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'}`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && <ErrorBanner message={error} />}

        {tab === 'overview' && (
          <>
            <GuildRankBadge rank={rank} rankPoints={rankPoints} />
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Members" value={`${guild.member_count}/${guild.max_members}`} />
              <Stat label="Win-rate" value={`${pooled.winRate.toFixed(0)}%`} />
              <Stat label="Matches" value={pooled.totalMatches.toLocaleString()} />
            </div>
            {guild.description && (
              <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground leading-snug">
                {guild.description}
              </div>
            )}
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 disabled:opacity-40"
            >
              {leaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              Leave Guild
            </button>
          </>
        )}

        {tab === 'members' && <MemberList members={members} leaderEmail={guild.leader_email} />}

        {tab === 'bank' && (
          <GuildBankPanel
            guild={guild}
            isLeader={isLeader}
            onChanged={refresh}
            onGoldChange={setGold}
          />
        )}

        {tab === 'cosmetics' && <GuildCosmeticsPanel unlocked={guild.unlocked_cosmetics || []} />}

        {tab === 'log' && <BankLog transactions={transactions} />}
      </div>
    </div>
  );
}

// ─── Layout helpers ─────────────────────────────────────────────────────────
function Header({ title = 'Guilds', subtitle, gold }) {
  return (
    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> {title}
        </h2>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-3 py-1.5">
        <Coins className="w-3.5 h-3.5 text-yellow-400" />
        <span className="text-sm font-bold text-yellow-400 tabular-nums">{Number(gold || 0).toLocaleString()}</span>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-base font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 inline-flex items-center gap-2">
      <AlertTriangle className="w-3.5 h-3.5" /> {message}
    </div>
  );
}

function MemberList({ members, leaderEmail }) {
  const active = members.filter((m) => !m.status || m.status === 'active');
  const pending = members.filter((m) => m.status === 'pending');
  const sorted = [...active].sort((a, b) => (b.wins_contributed || 0) - (a.wins_contributed || 0));

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {sorted.map((m) => {
          const total = (m.wins_contributed || 0) + (m.losses_contributed || 0);
          const wr = total > 0 ? Math.round(((m.wins_contributed || 0) / total) * 100) : 0;
          const isLeader = m.user_email === leaderEmail;
          return (
            <li key={m.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                {(m.display_name || m.user_email || '?').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold truncate">{m.display_name || m.user_email}</p>
                  {isLeader && <span className="text-[9px] uppercase tracking-widest text-yellow-300">Leader</span>}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {m.wins_contributed || 0}W / {m.losses_contributed || 0}L · {wr}% · {Number(m.gold_donated || 0).toLocaleString()}g donated
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {pending.length > 0 && (
        <div className="rounded-xl border border-dashed border-border p-3 text-[11px] text-muted-foreground">
          {pending.length} pending request{pending.length === 1 ? '' : 's'}.
        </div>
      )}
    </div>
  );
}

function BankLog({ transactions = [] }) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-4 text-center text-xs text-muted-foreground">
        No bank activity yet.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {transactions.map((t) => (
        <li key={t.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            t.type === 'donation' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-orange-500/15 text-orange-300'
          }`}>
            {t.type === 'donation' ? '+' : '-'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{t.display_name || t.user_email}</p>
            <p className="text-[10px] text-muted-foreground">
              {t.type === 'donation' ? 'Donated' : t.type === 'withdrawal' ? 'Withdrew' : 'System'} · balance {Number(t.balance_after || 0).toLocaleString()}g
            </p>
          </div>
          <p className="text-sm font-bold tabular-nums text-yellow-300">{Number(t.amount || 0).toLocaleString()}g</p>
        </li>
      ))}
    </ul>
  );
}