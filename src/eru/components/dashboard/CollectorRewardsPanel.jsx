import { useEffect, useState } from 'react';
import { Award, Sparkles } from 'lucide-react';
import { useAuth } from '@/eru/lib/AuthContext';
import { COLLECTOR_REWARD_BADGES, COLLECTOR_STATUS_ICONS, COLLECTOR_STATUS_LABELS, syncCollectorRewardProfile } from '@/eru/lib/collectorRewards';

export default function CollectorRewardsPanel() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user?.email) return;
    syncCollectorRewardProfile(user.email).then(setProfile).catch(() => setProfile({
      user_email: user.email,
      portfolio_growth_pct: 0,
      login_streak: 1,
      successful_trades: 0,
      status_icon: 'seed',
      badge_ids: [],
    }));
  }, [user?.email]);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Collector Rewards</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">Unlock badges and platform status icons through growth, consistency, and successful trades.</p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary">Live rewards</div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/30 p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl border border-primary/20 bg-primary/10 flex items-center justify-center text-2xl">
          {COLLECTOR_STATUS_ICONS[profile?.status_icon || 'seed']}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{COLLECTOR_STATUS_LABELS[profile?.status_icon || 'seed']}</p>
          <p className="text-[11px] text-muted-foreground">Current streak: {profile?.login_streak || 1} days · Successful trades: {profile?.successful_trades || 0}</p>
          <p className="text-[11px] text-primary mt-1">Portfolio growth: {Number(profile?.portfolio_growth_pct || 0).toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-secondary/20 p-3">
          <p className="text-[11px] text-muted-foreground">Growth badge track</p>
          <p className="text-base font-semibold text-foreground mt-1">{Number(profile?.portfolio_growth_pct || 0).toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-3">
          <p className="text-[11px] text-muted-foreground">Daily login streak</p>
          <p className="text-base font-semibold text-foreground mt-1">{profile?.login_streak || 1} days</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-3">
          <p className="text-[11px] text-muted-foreground">Successful trades</p>
          <p className="text-base font-semibold text-foreground mt-1">{profile?.successful_trades || 0}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-3">Unlocked badges</p>
        <div className="grid gap-2 md:grid-cols-2">
          {Object.values(COLLECTOR_REWARD_BADGES).map((badge) => {
            const earned = (profile?.badge_ids || []).includes(badge.id);
            return (
              <div key={badge.id} className={`rounded-xl border p-3 flex items-center gap-3 ${earned ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/10 opacity-60'}`}>
                <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-lg">
                  {badge.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{badge.label}</p>
                    {earned && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Unlocked</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{badge.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold">Status icon ladder</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full border border-border px-2 py-1">🌱 Rising Collector</span>
          <span className="rounded-full border border-border px-2 py-1">✨ Active Collector</span>
          <span className="rounded-full border border-border px-2 py-1">🛡️ Trusted Trader</span>
          <span className="rounded-full border border-border px-2 py-1">🔥 Elite Momentum</span>
          <span className="rounded-full border border-border px-2 py-1">👑 Platform Royalty</span>
        </div>
      </div>
    </div>
  );
}