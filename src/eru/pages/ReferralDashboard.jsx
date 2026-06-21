import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/eru/api/base44Client';
import { Copy, Gift, Link2, Trophy, Users } from 'lucide-react';
import ReferralLeaderboard from '@/eru/components/referrals/ReferralLeaderboard';

const DEFAULT_REWARD = 25;

function makeCode(email = '') {
  return `${email.split('@')[0] || 'user'}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function buildInviteLink(code) {
  return `${window.location.origin}/?ref=${code}`;
}

export default function ReferralDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const me = await base44.auth.me();
    const [profileRows, eventRows] = await Promise.all([
      base44.entities.ReferralProfile.filter({ user_email: me.email }, '-created_date', 1).catch(() => []),
      base44.entities.ReferralEvent.list('-created_date', 200).catch(() => []),
    ]);

    let currentProfile = profileRows?.[0] || null;
    if (!currentProfile) {
      currentProfile = await base44.entities.ReferralProfile.create({
        user_email: me.email,
        invite_code: makeCode(me.email),
        invite_link: buildInviteLink(makeCode(me.email)),
        currency_reward_total: 0,
        reputation_reward_total: 0,
        successful_referrals: 0,
        pending_referrals: 0,
      });
      currentProfile = await base44.entities.ReferralProfile.filter({ user_email: me.email }, '-created_date', 1).then((rows) => rows?.[0] || null);
    }

    const allProfiles = await base44.entities.ReferralProfile.list('-successful_referrals', 200).catch(() => []);

    setUser(me);
    setProfile(currentProfile);
    setEvents((eventRows || []).filter((item) => item.referrer_email === me.email));
    setProfiles(allProfiles || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    successful: events.filter((item) => ['successful', 'rewarded'].includes(item.status)).length,
    pending: events.filter((item) => item.status === 'pending').length,
    rewards: events.filter((item) => ['successful', 'rewarded'].includes(item.status)).reduce((sum, item) => sum + Number(item.reward_amount || 0), 0),
  }), [events]);

  const leaderboard = useMemo(() => [...profiles]
    .sort((a, b) => (b.successful_referrals || 0) - (a.successful_referrals || 0) || (b.reputation_reward_total || 0) - (a.reputation_reward_total || 0))
    .slice(0, 10), [profiles]);

  const copyInviteLink = async () => {
    if (!profile?.invite_link) return;
    await navigator.clipboard.writeText(profile.invite_link);
  };

  const simulateReferral = async () => {
    if (!profile || !user) return;
    const referredEmail = `friend${Date.now()}@example.com`;
    await base44.entities.ReferralEvent.create({
      referrer_email: user.email,
      referred_email: referredEmail,
      invite_code: profile.invite_code,
      status: 'rewarded',
      reward_currency: 'REPUTATION',
      reward_amount: DEFAULT_REWARD,
      signup_date: new Date().toISOString(),
      rewarded_at: new Date().toISOString(),
    });
    await base44.entities.ReferralProfile.update(profile.id, {
      successful_referrals: Number(profile.successful_referrals || 0) + 1,
      reputation_reward_total: Number(profile.reputation_reward_total || 0) + DEFAULT_REWARD,
      pending_referrals: Math.max(0, Number(profile.pending_referrals || 0) - 1),
    });
    load();
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-4 pb-24 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Referral Dashboard</h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Invite new users, track successful signups, and earn platform reputation rewards.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-primary"><Link2 className="h-4 w-4" /><p className="text-sm font-semibold">Your invite link</p></div>
        <div className="rounded-xl border border-border bg-secondary/20 px-3 py-3">
          <p className="text-[11px] text-muted-foreground">Invite code</p>
          <p className="mt-1 text-sm font-mono text-foreground">{profile?.invite_code}</p>
          <p className="mt-2 break-all text-xs text-muted-foreground">{profile?.invite_link}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button onClick={copyInviteLink} className="h-10 rounded-xl border border-primary/20 bg-primary/10 px-3 text-xs font-medium text-primary"><Copy className="mr-1 inline h-3.5 w-3.5" /> Copy invite link</button>
          <button onClick={simulateReferral} className="h-10 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground">Simulate successful signup</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-[11px] text-muted-foreground">Successful signups</p><p className="mt-2 text-2xl font-bold text-primary">{stats.successful}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-[11px] text-muted-foreground">Pending invites</p><p className="mt-2 text-2xl font-bold text-yellow-400">{stats.pending}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-[11px] text-muted-foreground">Reputation earned</p><p className="mt-2 text-2xl font-bold text-green-400">{stats.rewards}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-[11px] text-muted-foreground">Reward type</p><p className="mt-2 text-sm font-semibold text-foreground">Reputation points</p></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2"><Gift className="h-4 w-4 text-primary" /><p className="text-sm font-semibold text-foreground">Referral activity</p></div>
          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">No referrals yet.</div>
          ) : (
            <div className="space-y-2">
              {events.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-secondary/20 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.referred_email}</p>
                    <p className="text-[11px] text-muted-foreground">Status: {item.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">+{item.reward_amount}</p>
                    <p className="text-[10px] text-muted-foreground">{item.reward_currency}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /><p className="text-sm font-semibold text-foreground">How rewards work</p></div>
            <p className="text-xs text-muted-foreground">Each successful signup rewards the referrer with platform-specific reputation points. This can later be extended to platform currency if needed.</p>
          </div>
          <ReferralLeaderboard items={leaderboard} />
        </div>
      </div>
    </div>
  );
}