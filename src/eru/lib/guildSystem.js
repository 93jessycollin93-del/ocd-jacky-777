// ----------------------------------------------------------------------------
// Guild / Faction system
// ----------------------------------------------------------------------------
// Pure helpers + a thin API around Guild, GuildMembership and
// GuildBankTransaction entities. All gold movement reuses the central
// economyApi so audit logs stay consistent with the rest of the app.
// ----------------------------------------------------------------------------
import { base44 } from '@/eru/api/base44Client';
import { awardGold, deductGold } from '@/eru/lib/economyApi';

// ─── Rank ladder ────────────────────────────────────────────────────────────
// Rank points = pooled member win-rate (0..100) × member-count weight + bank
// prestige (sqrt of total_donated, capped). Tuned so a small active guild can
// hit silver, but mythic requires sustained collective performance.
export const GUILD_RANKS = [
  { id: 'bronze',   label: 'Bronze',   minPoints: 0,    cosmetics: ['banner_bronze'] },
  { id: 'silver',   label: 'Silver',   minPoints: 60,   cosmetics: ['banner_bronze', 'banner_silver', 'card_back_silver'] },
  { id: 'gold',     label: 'Gold',     minPoints: 140,  cosmetics: ['banner_bronze', 'banner_silver', 'banner_gold', 'card_back_silver', 'card_back_gold'] },
  { id: 'platinum', label: 'Platinum', minPoints: 240,  cosmetics: ['banner_bronze', 'banner_silver', 'banner_gold', 'banner_platinum', 'card_back_silver', 'card_back_gold', 'card_back_platinum'] },
  { id: 'diamond',  label: 'Diamond',  minPoints: 360,  cosmetics: ['banner_bronze', 'banner_silver', 'banner_gold', 'banner_platinum', 'banner_diamond', 'card_back_silver', 'card_back_gold', 'card_back_platinum', 'card_back_diamond'] },
  { id: 'mythic',   label: 'Mythic',   minPoints: 520,  cosmetics: ['banner_bronze', 'banner_silver', 'banner_gold', 'banner_platinum', 'banner_diamond', 'banner_mythic', 'card_back_silver', 'card_back_gold', 'card_back_platinum', 'card_back_diamond', 'card_back_mythic'] },
];

export const COSMETIC_CATALOG = {
  banner_bronze:      { id: 'banner_bronze',      kind: 'banner',    label: 'Bronze Banner',      gradient: 'from-amber-700/40 to-orange-800/30' },
  banner_silver:      { id: 'banner_silver',      kind: 'banner',    label: 'Silver Banner',      gradient: 'from-slate-400/40 to-slate-600/30' },
  banner_gold:        { id: 'banner_gold',        kind: 'banner',    label: 'Gold Banner',        gradient: 'from-yellow-400/40 to-amber-600/30' },
  banner_platinum:    { id: 'banner_platinum',    kind: 'banner',    label: 'Platinum Banner',    gradient: 'from-cyan-300/40 to-sky-600/30' },
  banner_diamond:     { id: 'banner_diamond',     kind: 'banner',    label: 'Diamond Banner',     gradient: 'from-indigo-300/40 to-violet-600/30' },
  banner_mythic:      { id: 'banner_mythic',      kind: 'banner',    label: 'Mythic Banner',      gradient: 'from-pink-400/40 via-fuchsia-500/30 to-purple-700/30' },
  card_back_silver:   { id: 'card_back_silver',   kind: 'card_back', label: 'Silver Card Backing',   gradient: 'from-slate-500 to-slate-700' },
  card_back_gold:     { id: 'card_back_gold',     kind: 'card_back', label: 'Gold Card Backing',     gradient: 'from-yellow-500 to-amber-700' },
  card_back_platinum: { id: 'card_back_platinum', kind: 'card_back', label: 'Platinum Card Backing', gradient: 'from-cyan-400 to-sky-700' },
  card_back_diamond:  { id: 'card_back_diamond',  kind: 'card_back', label: 'Diamond Card Backing',  gradient: 'from-indigo-400 to-violet-700' },
  card_back_mythic:   { id: 'card_back_mythic',   kind: 'card_back', label: 'Mythic Card Backing',   gradient: 'from-pink-500 via-fuchsia-600 to-purple-800' },
};

/**
 * Pool the win-rates of all active members. Pure function — caller passes
 * memberships so this is easy to unit-test and call from the UI.
 */
export function calculatePooledWinRate(memberships = []) {
  let wins = 0;
  let losses = 0;
  for (const m of memberships) {
    if (m.status && m.status !== 'active') continue;
    wins += Number(m.wins_contributed || 0);
    losses += Number(m.losses_contributed || 0);
  }
  const total = wins + losses;
  if (total === 0) return { winRate: 0, wins, losses, totalMatches: 0 };
  return { winRate: (wins / total) * 100, wins, losses, totalMatches: total };
}

/**
 * Compute rank points from pooled win-rate, member activity, and bank prestige.
 * Caller passes the guild record + its memberships.
 */
export function calculateRankPoints(guild, memberships = []) {
  const { winRate, totalMatches } = calculatePooledWinRate(memberships);
  const activeCount = memberships.filter((m) => !m.status || m.status === 'active').length;
  // Member weight: 1.0 at 1 member, ~1.5 at 10, capped near 2.0.
  const memberWeight = Math.min(2, 1 + Math.log10(Math.max(1, activeCount)));
  // Match-volume confidence: scales win-rate's weight up to its full value as
  // the guild plays more matches (full credit at 100+ matches).
  const matchConfidence = Math.min(1, totalMatches / 100);
  const winRateScore = winRate * memberWeight * matchConfidence;
  // Bank prestige — sqrt curve so early donations matter, later ones less so.
  const bankPrestige = Math.min(120, Math.sqrt(Number(guild?.total_donated || 0)));
  return Math.round(winRateScore + bankPrestige);
}

export function rankFromPoints(points) {
  let current = GUILD_RANKS[0];
  for (const r of GUILD_RANKS) {
    if (points >= r.minPoints) current = r;
  }
  return current;
}

export function nextRank(currentRankId) {
  const idx = GUILD_RANKS.findIndex((r) => r.id === currentRankId);
  return idx >= 0 && idx < GUILD_RANKS.length - 1 ? GUILD_RANKS[idx + 1] : null;
}

// ─── Validation ─────────────────────────────────────────────────────────────
export function validateGuildName(name) {
  const v = String(name || '').trim();
  if (v.length < 3) return 'Name must be at least 3 characters.';
  if (v.length > 32) return 'Name must be 32 characters or fewer.';
  return null;
}
export function validateGuildTag(tag) {
  const v = String(tag || '').trim().toUpperCase();
  if (v.length < 2 || v.length > 5) return 'Tag must be 2–5 characters.';
  if (!/^[A-Z0-9]+$/.test(v)) return 'Tag must be uppercase letters and digits.';
  return null;
}

// ─── API ────────────────────────────────────────────────────────────────────

/** Get the current user's active guild membership (or null). */
export async function getMyMembership() {
  const me = await base44.auth.me().catch(() => null);
  if (!me?.email) return null;
  const rows = await base44.entities.GuildMembership.filter(
    { user_email: me.email, status: 'active' },
    '-created_date',
    5,
  ).catch(() => []);
  return rows?.[0] || null;
}

/** Hydrate a guild with its memberships, derived stats, and current rank. */
export async function loadGuildDetail(guildId) {
  if (!guildId) return null;
  const [guild, members, transactions] = await Promise.all([
    base44.entities.Guild.list('-created_date', 200).then((all) => all.find((g) => g.id === guildId)).catch(() => null),
    base44.entities.GuildMembership.filter({ guild_id: guildId }, '-created_date', 200).catch(() => []),
    base44.entities.GuildBankTransaction.filter({ guild_id: guildId }, '-created_date', 50).catch(() => []),
  ]);
  if (!guild) return null;
  const pooled = calculatePooledWinRate(members);
  const rankPoints = calculateRankPoints(guild, members);
  const rank = rankFromPoints(rankPoints);
  return { guild, members, transactions, pooled, rankPoints, rank };
}

/** Create a new guild with the current user as founding leader. */
export async function createGuild({ name, tag, description, faction, join_policy }) {
  const me = await base44.auth.me();
  if (!me?.email) throw new Error('You must be signed in to create a guild.');

  const existing = await getMyMembership();
  if (existing) throw new Error('You are already in a guild. Leave it first.');

  const nameErr = validateGuildName(name);
  if (nameErr) throw new Error(nameErr);
  const tagErr = validateGuildTag(tag);
  if (tagErr) throw new Error(tagErr);

  const cleanName = name.trim();
  const cleanTag = tag.trim().toUpperCase();

  // Name + tag uniqueness check (active guilds only).
  const all = await base44.entities.Guild.list('-created_date', 500).catch(() => []);
  if (all.some((g) => !g.is_archived && g.name?.toLowerCase() === cleanName.toLowerCase())) {
    throw new Error('A guild with that name already exists.');
  }
  if (all.some((g) => !g.is_archived && g.tag === cleanTag)) {
    throw new Error('A guild with that tag already exists.');
  }

  const guild = await base44.entities.Guild.create({
    name: cleanName,
    tag: cleanTag,
    description: description?.trim() || '',
    faction: faction || 'Neutral',
    leader_email: me.email,
    join_policy: join_policy || 'open',
    member_count: 1,
    bank_balance: 0,
    total_donated: 0,
    rank_points: 0,
    guild_rank: 'bronze',
    unlocked_cosmetics: ['banner_bronze'],
  });

  await base44.entities.GuildMembership.create({
    guild_id: guild.id,
    guild_name: guild.name,
    user_email: me.email,
    display_name: me.full_name || me.email.split('@')[0],
    role: 'leader',
    status: 'active',
    joined_at: new Date().toISOString(),
  });

  return guild;
}

/** Join an open or request-based guild. */
export async function joinGuild(guildId) {
  const me = await base44.auth.me();
  if (!me?.email) throw new Error('You must be signed in to join a guild.');

  const existing = await getMyMembership();
  if (existing) throw new Error('You are already in a guild. Leave it first.');

  const guild = await base44.entities.Guild.list('-created_date', 500)
    .then((all) => all.find((g) => g.id === guildId))
    .catch(() => null);
  if (!guild || guild.is_archived) throw new Error('Guild not found.');
  if (guild.join_policy === 'invite_only') throw new Error('This guild is invite-only.');
  if ((guild.member_count || 0) >= (guild.max_members || 50)) throw new Error('Guild is full.');

  const status = guild.join_policy === 'request' ? 'pending' : 'active';
  const membership = await base44.entities.GuildMembership.create({
    guild_id: guild.id,
    guild_name: guild.name,
    user_email: me.email,
    display_name: me.full_name || me.email.split('@')[0],
    role: 'member',
    status,
    joined_at: new Date().toISOString(),
  });

  if (status === 'active') {
    await base44.entities.Guild.update(guild.id, {
      member_count: (guild.member_count || 0) + 1,
    }).catch(() => null);
  }
  return membership;
}

/** Leave the current user's guild (leader transfer or guild archive). */
export async function leaveGuild() {
  const me = await base44.auth.me();
  const membership = await getMyMembership();
  if (!membership) throw new Error('You are not in a guild.');

  await base44.entities.GuildMembership.update(membership.id, { status: 'left' }).catch(() => null);

  const guild = await base44.entities.Guild.list('-created_date', 500)
    .then((all) => all.find((g) => g.id === membership.guild_id))
    .catch(() => null);
  if (!guild) return;

  const remaining = (guild.member_count || 1) - 1;

  // If the leader leaves, hand the crown to the next active member, or archive.
  if (guild.leader_email === me.email) {
    const others = await base44.entities.GuildMembership.filter(
      { guild_id: guild.id, status: 'active' },
      'created_date',
      50,
    ).catch(() => []);
    const heir = others.find((m) => m.user_email !== me.email);
    if (heir) {
      await base44.entities.Guild.update(guild.id, {
        leader_email: heir.user_email,
        member_count: Math.max(0, remaining),
      }).catch(() => null);
      await base44.entities.GuildMembership.update(heir.id, { role: 'leader' }).catch(() => null);
    } else {
      await base44.entities.Guild.update(guild.id, {
        is_archived: true,
        member_count: 0,
      }).catch(() => null);
    }
  } else {
    await base44.entities.Guild.update(guild.id, {
      member_count: Math.max(0, remaining),
    }).catch(() => null);
  }
}

/**
 * Donate gold to the guild bank. Reuses deductGold so it goes through the
 * standard audit trail; on success, increments the guild's bank balance and
 * records a bank transaction.
 */
export async function donateToGuildBank(guildId, amount, note = '') {
  const value = Math.floor(Number(amount));
  if (!value || value <= 0) throw new Error('Donation must be a positive amount.');

  const me = await base44.auth.me();
  const membership = await getMyMembership();
  if (!membership || membership.guild_id !== guildId) {
    throw new Error('You can only donate to your own guild.');
  }

  // Deduct from user (validates balance, writes audit log).
  const newGold = await deductGold(value, `Donation to guild bank`, { guild_id: guildId });

  const guild = await base44.entities.Guild.list('-created_date', 500)
    .then((all) => all.find((g) => g.id === guildId))
    .catch(() => null);
  if (!guild) throw new Error('Guild not found.');

  const newBalance = (guild.bank_balance || 0) + value;
  const newTotal = (guild.total_donated || 0) + value;

  await base44.entities.Guild.update(guildId, {
    bank_balance: newBalance,
    total_donated: newTotal,
  }).catch(() => null);

  await base44.entities.GuildMembership.update(membership.id, {
    gold_donated: (membership.gold_donated || 0) + value,
  }).catch(() => null);

  await base44.entities.GuildBankTransaction.create({
    guild_id: guildId,
    user_email: me.email,
    display_name: membership.display_name || me.full_name || me.email,
    type: 'donation',
    amount: value,
    balance_after: newBalance,
    note: note?.trim() || '',
  }).catch(() => null);

  // Recompute rank — pulls fresh data so cosmetics unlock immediately.
  await refreshGuildRank(guildId).catch(() => null);

  return { newGoldBalance: newGold, newBankBalance: newBalance };
}

/**
 * Withdraw from the guild bank — leader only, never below zero. Mirrors the
 * donate flow but in reverse so the audit trail stays intact.
 */
export async function withdrawFromGuildBank(guildId, amount, note = '') {
  const value = Math.floor(Number(amount));
  if (!value || value <= 0) throw new Error('Withdrawal must be a positive amount.');

  const me = await base44.auth.me();
  const guild = await base44.entities.Guild.list('-created_date', 500)
    .then((all) => all.find((g) => g.id === guildId))
    .catch(() => null);
  if (!guild) throw new Error('Guild not found.');
  if (guild.leader_email !== me.email) throw new Error('Only the guild leader can withdraw.');
  if ((guild.bank_balance || 0) < value) throw new Error('Insufficient bank balance.');

  const newBalance = (guild.bank_balance || 0) - value;
  await base44.entities.Guild.update(guildId, { bank_balance: newBalance }).catch(() => null);
  const newGold = await awardGold(value, `Guild bank withdrawal`, { guild_id: guildId });

  await base44.entities.GuildBankTransaction.create({
    guild_id: guildId,
    user_email: me.email,
    display_name: me.full_name || me.email,
    type: 'withdrawal',
    amount: value,
    balance_after: newBalance,
    note: note?.trim() || '',
  }).catch(() => null);

  return { newGoldBalance: newGold, newBankBalance: newBalance };
}

/**
 * Recompute guild rank, persist the new rank/cosmetics, and return the
 * resulting `{ rank, rankPoints, unlocked, newlyUnlocked }`.
 */
export async function refreshGuildRank(guildId) {
  const detail = await loadGuildDetail(guildId);
  if (!detail) return null;
  const { guild, rank, rankPoints } = detail;

  const previousUnlocked = new Set(guild.unlocked_cosmetics || []);
  const unlocked = new Set([...(guild.unlocked_cosmetics || []), ...(rank.cosmetics || [])]);
  const newlyUnlocked = [...unlocked].filter((id) => !previousUnlocked.has(id));

  if (
    guild.guild_rank !== rank.id ||
    guild.rank_points !== rankPoints ||
    newlyUnlocked.length > 0
  ) {
    await base44.entities.Guild.update(guildId, {
      guild_rank: rank.id,
      rank_points: rankPoints,
      unlocked_cosmetics: [...unlocked],
    }).catch(() => null);
  }

  return { rank, rankPoints, unlocked: [...unlocked], newlyUnlocked };
}

/**
 * Track a battle result against the current user's guild membership. Called
 * from gameplay sites (fire-and-forget). Never throws.
 */
export async function recordGuildBattleResult(won) {
  try {
    const membership = await getMyMembership();
    if (!membership) return;
    await base44.entities.GuildMembership.update(membership.id, {
      wins_contributed: (membership.wins_contributed || 0) + (won ? 1 : 0),
      losses_contributed: (membership.losses_contributed || 0) + (won ? 0 : 1),
    });
    // Refresh rank in the background — small guilds will see ranks rise quickly.
    refreshGuildRank(membership.guild_id).catch(() => null);
  } catch (_) { /* non-fatal */ }
}