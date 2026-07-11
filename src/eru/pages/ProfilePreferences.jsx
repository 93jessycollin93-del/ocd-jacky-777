import { useEffect, useState } from 'react';
import { User2, Bot, MessageSquare, Sparkles, Bell, Save, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import { useAuth } from '@/eru/lib/AuthContext';
import BadgeShowcase from '@/eru/components/profile/BadgeShowcase';
import ReputationSnapshot from '@/eru/components/profile/ReputationSnapshot';

const DEFAULT_BOT_PREFS = {
  autoReply: true,
  proactiveSuggestions: true,
  telegramBotNotifications: true,
  voiceReplies: false,
  shareContextWithBots: true,
};

function ToggleRow({ icon: Icon, title, description, checked, onChange }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-3">
      <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground leading-snug">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-primary' : 'bg-secondary border border-border'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export default function ProfilePreferences() {
  const { currentUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [botPrefs, setBotPrefs] = useState(DEFAULT_BOT_PREFS);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [rewardProfile, setRewardProfile] = useState(null);
  const [loadingRewards, setLoadingRewards] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setDisplayName(currentUser.display_name || currentUser.full_name || '');
    setBotPrefs({
      ...DEFAULT_BOT_PREFS,
      ...(currentUser.bot_preferences || {}),
    });
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;
    const loadRewards = async () => {
      if (!currentUser?.email) return;
      setLoadingRewards(true);
      const rows = await base44.entities.CollectorRewardProfile
        .filter({ user_email: currentUser.email }, '-updated_date', 1)
        .catch(() => []);
      if (mounted) {
        setRewardProfile(rows?.[0] || null);
        setLoadingRewards(false);
      }
    };
    loadRewards();
    return () => { mounted = false; };
  }, [currentUser?.email]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        display_name: displayName.trim(),
        bot_preferences: botPrefs,
      });
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  };

  const toggleBotPref = (key) => (value) => {
    setBotPrefs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Profile</p>
        <h1 className="text-xl font-semibold text-foreground mt-1">Profile & Bot Preferences</h1>
        <p className="text-sm text-muted-foreground mt-1">Update your display name and control how bots interact with you.</p>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        <ReputationSnapshot profile={rewardProfile} loading={loadingRewards} />

        <BadgeShowcase
          earnedIds={rewardProfile?.badge_ids || []}
          subtitle="Earn badges by trading, logging in daily, and growing your portfolio."
        />

        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Display name</h3>
            <p className="text-xs text-muted-foreground mt-1">Shown to other users and inside bot conversations.</p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Your display name</span>
            <div className="relative">
              <User2 className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex R."
                maxLength={60}
                className="w-full h-11 rounded-xl border border-border bg-card pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </label>
          <p className="text-[11px] text-muted-foreground">Email <span className="text-foreground">{currentUser?.email || '—'}</span> can't be changed here.</p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Bot interaction preferences</h3>
            <p className="text-xs text-muted-foreground mt-1">Fine-tune how AI bots, assistants, and Telegram agents behave for you.</p>
          </div>
          <div className="space-y-2.5">
            <ToggleRow
              icon={MessageSquare}
              title="Auto-reply in chats"
              description="Let bots respond automatically when you message them."
              checked={botPrefs.autoReply}
              onChange={toggleBotPref('autoReply')}
            />
            <ToggleRow
              icon={Sparkles}
              title="Proactive suggestions"
              description="Allow bots to suggest actions, insights, or next steps on their own."
              checked={botPrefs.proactiveSuggestions}
              onChange={toggleBotPref('proactiveSuggestions')}
            />
            <ToggleRow
              icon={Bell}
              title="Telegram bot notifications"
              description="Receive bot-linked updates inside Telegram."
              checked={botPrefs.telegramBotNotifications}
              onChange={toggleBotPref('telegramBotNotifications')}
            />
            <ToggleRow
              icon={Bot}
              title="Share context with bots"
              description="Give bots access to your portfolio and recent activity for better replies."
              checked={botPrefs.shareContextWithBots}
              onChange={toggleBotPref('shareContextWithBots')}
            />
            <ToggleRow
              icon={Bot}
              title="Voice replies"
              description="Where supported, bots will respond with voice as well as text."
              checked={botPrefs.voiceReplies}
              onChange={toggleBotPref('voiceReplies')}
            />
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {savedAt && !saving && (
            <span className="text-xs text-primary inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}