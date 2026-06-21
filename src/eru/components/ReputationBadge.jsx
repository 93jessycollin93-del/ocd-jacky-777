export const BADGES = {
  curious_mind:     { id: 'curious_mind',     label: 'Curious Mind',      emoji: '🔍', desc: 'Sent your first message in the Thinkers Club', color: '#2196f3', xpReq: 0 },
  master_thinker:   { id: 'master_thinker',   label: 'Master Thinker',    emoji: '🧠', desc: 'Engaged deeply in 50+ Thinkers Club discussions', color: '#7c4dff', xpReq: 500 },
  market_pioneer:   { id: 'market_pioneer',   label: 'Market Pioneer',    emoji: '🚀', desc: 'Made your first successful marketplace sale', color: '#00e676', xpReq: 100 },
  top_contributor:  { id: 'top_contributor',  label: 'Top Contributor',   emoji: '⭐', desc: 'Listed 5+ ideas in the Creator Hub', color: '#ffeb3b', xpReq: 250 },
  code_guardian:    { id: 'code_guardian',    label: 'Code Guardian',     emoji: '🛡️', desc: 'Submitted 3+ projects through App Review', color: '#ff9800', xpReq: 300 },
  idea_architect:   { id: 'idea_architect',   label: 'Idea Architect',    emoji: '🏛️', desc: 'Had an authorized listing reach 100+ likes', color: '#e91e63', xpReq: 750 },
  collab_champion:  { id: 'collab_champion',  label: 'Collab Champion',   emoji: '🤝', desc: 'Collaborated on 10+ scratchpad sessions', color: '#00bcd4', xpReq: 400 },
  legend:           { id: 'legend',           label: 'Legend',            emoji: '👑', desc: 'Reached level 10 and earned all badges', color: '#ffd700', xpReq: 2000 },
};

export const LEVELS = [
  { level: 1, label: 'Newcomer',    xpMin: 0 },
  { level: 2, label: 'Explorer',    xpMin: 100 },
  { level: 3, label: 'Thinker',     xpMin: 300 },
  { level: 4, label: 'Analyst',     xpMin: 600 },
  { level: 5, label: 'Strategist',  xpMin: 1000 },
  { level: 6, label: 'Innovator',   xpMin: 1500 },
  { level: 7, label: 'Visionary',   xpMin: 2200 },
  { level: 8, label: 'Architect',   xpMin: 3000 },
  { level: 9, label: 'Pioneer',     xpMin: 4000 },
  { level: 10, label: 'Legend',     xpMin: 5000 },
];

export function getLevelInfo(xp) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xpMin) { current = LEVELS[i]; next = LEVELS[i + 1] || null; }
  }
  return { current, next };
}

export default function ReputationBadge({ badgeId, size = 'md', locked = false }) {
  const badge = BADGES[badgeId];
  if (!badge) return null;
  const sizes = { sm: 'w-8 h-8 text-lg', md: 'w-12 h-12 text-2xl', lg: 'w-16 h-16 text-3xl' };
  return (
    <div className={`${sizes[size]} rounded-xl flex items-center justify-center relative`}
      style={{ background: locked ? '#1a1a2e' : `${badge.color}20`, border: `1px solid ${locked ? '#333' : badge.color + '50'}`, opacity: locked ? 0.4 : 1 }}
      title={badge.label}>
      <span style={{ filter: locked ? 'grayscale(1)' : 'none' }}>{badge.emoji}</span>
    </div>
  );
}