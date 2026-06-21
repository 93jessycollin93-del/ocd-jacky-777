import { useState, useEffect } from 'react';
import { useAuth } from '@/eru/lib/AuthContext';
import { Award, Zap, MessageCircle, ShoppingBag, Shield, Lightbulb } from 'lucide-react';
import ReputationBadge, { BADGES, LEVELS, getLevelInfo } from '../components/ReputationBadge';
import CollectorReputationPill from '@/eru/components/reputation/CollectorReputationPill';
import CollectorBadgeStrip from '@/eru/components/reputation/CollectorBadgeStrip';
import { COLLECTOR_REWARD_BADGES, syncCollectorRewardProfile } from '@/eru/lib/collectorRewards';

// Demo stats for first-time users
const DEMO_STATS = { xp: 340, thinkers_actions: 12, marketplace_sales: 1, reviews_submitted: 2, ideas_listed: 3 };

const EARNED_DEMO = ['curious_mind', 'market_pioneer', 'top_contributor'];

const ACTIVITIES = [
  { icon: MessageCircle, label: 'Message in Thinkers Club', xp: '+5 XP', color: '#7c4dff' },
  { icon: ShoppingBag, label: 'Marketplace sale completed', xp: '+50 XP', color: '#00e676' },
  { icon: Lightbulb, label: 'Idea listed in Creator Hub', xp: '+20 XP', color: '#ffeb3b' },
  { icon: Shield, label: 'App Review submitted', xp: '+30 XP', color: '#ff9800' },
  { icon: Award, label: 'Badge earned', xp: '+100 XP', color: '#e91e63' },
];

export default function Reputation() {
  const { user } = useAuth();
  const [stats] = useState(DEMO_STATS);
  const [tab, setTab] = useState('overview');
  const [rewardProfile, setRewardProfile] = useState(null);

  useEffect(() => {
    if (!user?.email) return;
    syncCollectorRewardProfile(user.email).then(setRewardProfile).catch(() => setRewardProfile(null));
  }, [user?.email]);

  const { current, next } = getLevelInfo(stats.xp);
  const progressPct = next
    ? Math.round(((stats.xp - current.xpMin) / (next.xpMin - current.xpMin)) * 100)
    : 100;

  const earnedSet = new Set(EARNED_DEMO);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" /> Reputation
        </h2>
        <p className="text-xs text-muted-foreground">Earn XP, unlock badges, and rise through the ranks</p>
      </div>

      {/* Profile card */}
      <div className="mx-4 mt-4 bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
            {current.level >= 10 ? '👑' : '🧠'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">{user?.full_name || 'Anonymous'}</p>
            <p className="text-sm text-primary font-medium">Level {current.level} · {current.label}</p>
            <p className="text-xs text-muted-foreground font-mono">{stats.xp} XP</p>
            <div className="mt-2">
              <CollectorReputationPill statusIcon={rewardProfile?.status_icon || 'seed'} />
            </div>
          </div>
          <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-xl px-2 py-1">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">{stats.xp}</span>
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{current.label}</span>
            {next && <span>{next.label} · {next.xpMin - stats.xp} XP away</span>}
          </div>
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{stats.xp} XP</span>
            {next && <span>{next.xpMin} XP</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mt-4">
        {[{ id: 'overview', label: 'Overview' }, { id: 'badges', label: 'Badges' }, { id: 'how', label: 'Earn XP' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === t.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-4">
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Thinkers Club', value: stats.thinkers_actions, icon: MessageCircle, color: '#7c4dff', suffix: 'messages' },
                { label: 'Sales', value: stats.marketplace_sales, icon: ShoppingBag, color: '#00e676', suffix: 'completed' },
                { label: 'Ideas Listed', value: stats.ideas_listed, icon: Lightbulb, color: '#ffeb3b', suffix: 'total' },
                { label: 'Reviews', value: stats.reviews_submitted, icon: Shield, color: '#ff9800', suffix: 'submitted' },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.suffix}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Badges Earned</p>
              <div className="flex gap-3 flex-wrap">
                {EARNED_DEMO.map(id => (
                  <div key={id} className="flex flex-col items-center gap-1">
                    <ReputationBadge badgeId={id} size="lg" />
                    <p className="text-xs text-center text-muted-foreground w-14 leading-tight">{BADGES[id]?.label}</p>
                  </div>
                ))}
                {(rewardProfile?.badge_ids || []).map(id => (
                  <div key={id} className="flex flex-col items-center gap-1">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl bg-primary/10 border border-primary/20">
                      {COLLECTOR_REWARD_BADGES[id]?.emoji}
                    </div>
                    <p className="text-xs text-center text-muted-foreground w-16 leading-tight">{COLLECTOR_REWARD_BADGES[id]?.label}</p>
                  </div>
                ))}
              </div>
              <CollectorBadgeStrip badgeIds={rewardProfile?.badge_ids || []} limit={6} />
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Level Path</p>
              <div className="flex gap-1.5 flex-wrap">
                {LEVELS.map(l => (
                  <div key={l.level}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${l.level <= current.level ? 'bg-primary/20 text-primary border-primary/30' : 'bg-secondary text-muted-foreground border-border'}`}>
                    {l.level}. {l.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Collector Reward Status</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Portfolio Growth</p>
                  <p className="font-semibold">{Number(rewardProfile?.portfolio_growth_pct || 0).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Login Streak</p>
                  <p className="font-semibold">{rewardProfile?.login_streak || 1} days</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Successful Trades</p>
                  <p className="font-semibold">{rewardProfile?.successful_trades || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status Icon</p>
                  <p className="font-semibold">{rewardProfile?.status_icon || 'seed'}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'badges' && (
          <div className="grid grid-cols-1 gap-3">
            {Object.values(BADGES).map(badge => {
              const earned = earnedSet.has(badge.id);
              return (
                <div key={badge.id} className={`bg-card border rounded-xl p-4 flex items-center gap-4 transition-all ${earned ? 'border-border' : 'border-border opacity-60'}`}>
                  <ReputationBadge badgeId={badge.id} size="lg" locked={!earned} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{badge.label}</p>
                      {earned && <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full">Earned</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{badge.desc}</p>
                    <p className="text-xs font-mono text-primary mt-1">{badge.xpReq} XP required</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'how' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Complete actions across the platform to earn XP and unlock badges.</p>
            {ACTIVITIES.map(a => (
              <div key={a.label} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                <a.icon className="w-4 h-4 flex-shrink-0" style={{ color: a.color }} />
                <p className="text-sm flex-1">{a.label}</p>
                <span className="text-xs font-mono font-bold" style={{ color: a.color }}>{a.xp}</span>
              </div>
            ))}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mt-2">
              <p className="text-xs text-primary">💡 <span className="font-semibold">Pro tip:</span> Getting your listing <span className="font-bold">Authorized</span> in Creator Hub gives a 2× XP multiplier on all subsequent sales.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}