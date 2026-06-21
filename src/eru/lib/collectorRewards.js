import { base44 } from '@/eru/api/base44Client';

export const COLLECTOR_STATUS_ICONS = {
  seed: '🌱',
  spark: '✨',
  shield: '🛡️',
  flame: '🔥',
  crown: '👑',
};

export const COLLECTOR_STATUS_LABELS = {
  seed: 'Rising Collector',
  spark: 'Active Collector',
  shield: 'Trusted Trader',
  flame: 'Elite Momentum',
  crown: 'Platform Royalty',
};

export const COLLECTOR_REWARD_BADGES = {
  growth_scout: {
    id: 'growth_scout',
    label: 'Growth Scout',
    emoji: '📈',
    description: 'Reach 10% portfolio growth',
  },
  momentum_master: {
    id: 'momentum_master',
    label: 'Momentum Master',
    emoji: '🚀',
    description: 'Reach 25% portfolio growth',
  },
  streak_keeper: {
    id: 'streak_keeper',
    label: 'Streak Keeper',
    emoji: '🗓️',
    description: 'Maintain a 7 day login streak',
  },
  daily_legend: {
    id: 'daily_legend',
    label: 'Daily Legend',
    emoji: '🔥',
    description: 'Maintain a 30 day login streak',
  },
  trade_starter: {
    id: 'trade_starter',
    label: 'Trade Starter',
    emoji: '🤝',
    description: 'Complete 5 successful trades',
  },
  market_operator: {
    id: 'market_operator',
    label: 'Market Operator',
    emoji: '💹',
    description: 'Complete 20 successful trades',
  },
};

function unique(values) {
  return Array.from(new Set(values));
}

function calculatePortfolioValue(jadeAssets, cards, transactions) {
  const jadeValue = jadeAssets.reduce((sum, item) => sum + Number(item.valuation || 0), 0);
  const cardValue = cards.reduce((sum, card) => {
    const quantity = Number(card.quantity || 1);
    const weights = { common: 20, rare: 60, epic: 120, legendary: 220, mythic: 400 };
    return sum + (weights[card.rarity] || 20) * quantity;
  }, 0);
  const verifiedTradeValue = transactions
    .filter((item) => item.status === 'verified')
    .reduce((sum, item) => sum + Number(item.amount || 0) * 0.15, 0);
  return jadeValue + cardValue + verifiedTradeValue;
}

function calculateStatusIcon({ portfolioGrowthPct, loginStreak, successfulTrades }) {
  if (portfolioGrowthPct >= 25 || successfulTrades >= 20 || loginStreak >= 30) return 'crown';
  if (portfolioGrowthPct >= 15 || successfulTrades >= 10 || loginStreak >= 14) return 'flame';
  if (portfolioGrowthPct >= 10 || successfulTrades >= 5 || loginStreak >= 7) return 'shield';
  if (portfolioGrowthPct >= 5 || successfulTrades >= 1 || loginStreak >= 3) return 'spark';
  return 'seed';
}

function calculateBadges({ portfolioGrowthPct, loginStreak, successfulTrades }) {
  const badgeIds = [];
  if (portfolioGrowthPct >= 10) badgeIds.push('growth_scout');
  if (portfolioGrowthPct >= 25) badgeIds.push('momentum_master');
  if (loginStreak >= 7) badgeIds.push('streak_keeper');
  if (loginStreak >= 30) badgeIds.push('daily_legend');
  if (successfulTrades >= 5) badgeIds.push('trade_starter');
  if (successfulTrades >= 20) badgeIds.push('market_operator');
  return badgeIds;
}

function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(previousDateKey, currentDateKey) {
  const previous = new Date(`${previousDateKey}T00:00:00Z`);
  const current = new Date(`${currentDateKey}T00:00:00Z`);
  return Math.round((current - previous) / (1000 * 60 * 60 * 24));
}

export async function syncCollectorRewardProfile(userEmail) {
  if (!userEmail) return null;

  const hasRewardEntity = typeof base44.entities?.CollectorRewardProfile?.filter === 'function';
  if (!hasRewardEntity) {
    return {
      user_email: userEmail,
      current_portfolio_value: 0,
      portfolio_growth_pct: 0,
      successful_trades: 0,
      login_streak: 1,
      last_login_date: getDateKey(),
      status_icon: 'seed',
      badge_ids: [],
    };
  }

  const rewardEntity = base44.entities.CollectorRewardProfile;

  const [existingProfiles, jadeAssets, cards, transactions] = await Promise.all([
    rewardEntity.filter({ user_email: userEmail }, '-updated_date', 1),
    base44.entities.JadeAsset.filter({ created_by: userEmail }, '-updated_date', 200),
    base44.entities.Card.filter({ created_by: userEmail }, '-updated_date', 200),
    base44.entities.Transaction.filter({ buyer_email: userEmail }, '-updated_date', 200),
  ]).catch(() => [null, [], [], []]);

  if (!existingProfiles) {
    return {
      user_email: userEmail,
      current_portfolio_value: calculatePortfolioValue(jadeAssets, cards, transactions),
      portfolio_growth_pct: 0,
      successful_trades: transactions.filter((item) => item.status === 'verified').length,
      login_streak: 1,
      last_login_date: getDateKey(),
      status_icon: 'seed',
      badge_ids: [],
    };
  }

  const existing = existingProfiles[0] || null;
  const currentPortfolioValue = calculatePortfolioValue(jadeAssets, cards, transactions);
  const previousValue = Number(existing?.current_portfolio_value || 0);
  const portfolioGrowthPct = previousValue > 0
    ? Number((((currentPortfolioValue - previousValue) / previousValue) * 100).toFixed(2))
    : 0;
  const successfulTrades = transactions.filter((item) => item.status === 'verified').length;

  const todayKey = getDateKey();
  let loginStreak = Number(existing?.login_streak || 0);

  if (!existing?.last_login_date) {
    loginStreak = 1;
  } else if (existing.last_login_date !== todayKey) {
    const gap = daysBetween(existing.last_login_date, todayKey);
    loginStreak = gap === 1 ? loginStreak + 1 : 1;
  }

  const statusIcon = calculateStatusIcon({ portfolioGrowthPct, loginStreak, successfulTrades });
  const badgeIds = unique([...(existing?.badge_ids || []), ...calculateBadges({ portfolioGrowthPct, loginStreak, successfulTrades })]);

  const payload = {
    user_email: userEmail,
    current_portfolio_value: currentPortfolioValue,
    portfolio_growth_pct: portfolioGrowthPct,
    successful_trades: successfulTrades,
    login_streak: loginStreak,
    last_login_date: todayKey,
    status_icon: statusIcon,
    badge_ids: badgeIds,
  };

  if (existing) {
    try {
      await rewardEntity.update(existing.id, payload);
    } catch {
      // Permission or transient errors should not crash the dashboard.
    }
    return { ...existing, ...payload };
  }

  try {
    return await rewardEntity.create(payload);
  } catch {
    // If create is denied (e.g. RLS), return the computed payload so the UI still renders.
    return payload;
  }
}