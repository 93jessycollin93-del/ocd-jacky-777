import { Award, Flame, Star, Trophy } from 'lucide-react';

const LEVELS = [
  { level: 1, label: 'Starter', xp: 0 },
  { level: 2, label: 'Learner', xp: 40 },
  { level: 3, label: 'Analyst', xp: 100 },
  { level: 4, label: 'Strategist', xp: 180 },
  { level: 5, label: 'Jackie Pro', xp: 280 }
];

const BADGE_META = {
  first_question: { label: 'First Question', emoji: '💬' },
  curious_investor: { label: 'Curious Investor', emoji: '📘' },
  feedback_helper: { label: 'Feedback Helper', emoji: '🛠️' },
  streak_3: { label: '3-Day Streak', emoji: '🔥' }
};

function getLevelInfo(xp) {
  let current = LEVELS[0];
  let next = null;
  LEVELS.forEach((item, index) => {
    if (xp >= item.xp) {
      current = item;
      next = LEVELS[index + 1] || null;
    }
  });
  return { current, next };
}

export default function JackieGamificationPanel({ progress }) {
  const data = progress || { xp: 0, level: 1, streak_days: 0, badges: [], messages_sent: 0, resources_opened: 0, feedback_sent: 0 };
  const { current, next } = getLevelInfo(data.xp || 0);
  const pct = next ? Math.min(100, Math.round(((data.xp - current.xp) / (next.xp - current.xp)) * 100)) : 100;

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold">Learning Progress</h3>
            <p className="text-xs text-muted-foreground mt-1">Earn XP, keep your streak, and unlock Jackie learning badges.</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-secondary rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-primary">{data.xp || 0}</p>
            <p className="text-[10px] text-muted-foreground">XP</p>
          </div>
          <div className="bg-secondary rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-orange-400">{data.streak_days || 0}</p>
            <p className="text-[10px] text-muted-foreground">Streak</p>
          </div>
          <div className="bg-secondary rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-yellow-400">{current.level}</p>
            <p className="text-[10px] text-muted-foreground">Level</p>
          </div>
        </div>
        <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{current.label}</span>
          <span>{next ? `${next.label} · ${Math.max(0, next.xp - data.xp)} XP left` : 'Max level'}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Badges</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(BADGE_META).map(([id, badge]) => {
            const earned = (data.badges || []).includes(id);
            return (
              <div key={id} className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${earned ? 'bg-primary/10 border-primary/20' : 'bg-secondary border-border opacity-60'}`}>
                <span className="text-base">{badge.emoji}</span>
                <div>
                  <p className="text-xs font-medium">{badge.label}</p>
                  <p className="text-[10px] text-muted-foreground">{earned ? 'Unlocked' : 'Locked'}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-secondary rounded-lg p-2 text-center">
            <Star className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Questions</p>
            <p className="text-xs font-bold">{data.messages_sent || 0}</p>
          </div>
          <div className="bg-secondary rounded-lg p-2 text-center">
            <Flame className="w-3.5 h-3.5 text-orange-400 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Resources</p>
            <p className="text-xs font-bold">{data.resources_opened || 0}</p>
          </div>
          <div className="bg-secondary rounded-lg p-2 text-center">
            <Award className="w-3.5 h-3.5 text-yellow-400 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Feedback</p>
            <p className="text-xs font-bold">{data.feedback_sent || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}