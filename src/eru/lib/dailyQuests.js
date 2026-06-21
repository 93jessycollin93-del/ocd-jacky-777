// ----------------------------------------------------------------------------
// Daily Quest Engine
// ----------------------------------------------------------------------------
// Generates 3 daily quests per player (rotating), tracks progress via a simple
// event bus, and grants gold rewards on claim. Pure helpers + a small API.
//
// Events (fire from gameplay sites):
//   reportQuestEvent('pvp_win',        { mode })                  // PvP victory
//   reportQuestEvent('transmutation',  {})                        // forge complete
//   reportQuestEvent('element_play',   { element, count })        // cards played by element
//   reportQuestEvent('match_win',      { mode })                  // any battle win (incl. AI)
//   reportQuestEvent('card_acquired',  { rarity })                // new card obtained
//   reportQuestEvent('level_up',       {})                        // card leveled up
// ----------------------------------------------------------------------------
import { base44 } from '@/eru/api/base44Client';
import { awardGold } from '@/eru/lib/economyApi';

// ─── Templates ───────────────────────────────────────────────────────────────
// Each template is independently selectable. `match` is a pure function that
// receives the event payload and returns true if it counts toward the quest.
export const QUEST_TEMPLATES = [
  {
    id: 'pvp_win_2',
    title: 'Ladder Climber',
    description: 'Win 2 PvP matches.',
    event_type: 'pvp_win',
    target_filter: {},
    goal: 2,
    reward_gold: 200,
    match: (q, payload) => ['pvp_ladder', 'pvp_duo', 'direct_challenge'].includes(payload?.mode),
  },
  {
    id: 'transmute_1',
    title: 'Forge Initiate',
    description: 'Complete 1 transmutation or recipe craft.',
    event_type: 'transmutation',
    target_filter: {},
    goal: 1,
    reward_gold: 150,
    match: () => true,
  },
  {
    id: 'fire_3',
    title: 'Ember Devotee',
    description: 'Play 3 fire-element cards in any battle.',
    event_type: 'element_play',
    target_filter: { element: 'fire' },
    goal: 3,
    reward_gold: 120,
    match: (q, payload) => payload?.element === 'fire',
  },
  {
    id: 'water_3',
    title: 'Tide Caller',
    description: 'Play 3 water-element cards in any battle.',
    event_type: 'element_play',
    target_filter: { element: 'water' },
    goal: 3,
    reward_gold: 120,
    match: (q, payload) => payload?.element === 'water',
  },
  {
    id: 'shadow_3',
    title: 'Shade Walker',
    description: 'Play 3 shadow-element cards in any battle.',
    event_type: 'element_play',
    target_filter: { element: 'shadow' },
    goal: 3,
    reward_gold: 120,
    match: (q, payload) => payload?.element === 'shadow',
  },
  {
    id: 'light_3',
    title: 'Dawn Bearer',
    description: 'Play 3 light-element cards in any battle.',
    event_type: 'element_play',
    target_filter: { element: 'light' },
    goal: 3,
    reward_gold: 120,
    match: (q, payload) => payload?.element === 'light',
  },
  {
    id: 'earth_3',
    title: 'Stone Sworn',
    description: 'Play 3 earth-element cards in any battle.',
    event_type: 'element_play',
    target_filter: { element: 'earth' },
    goal: 3,
    reward_gold: 120,
    match: (q, payload) => payload?.element === 'earth',
  },
  {
    id: 'wind_3',
    title: 'Gale Whisperer',
    description: 'Play 3 wind-element cards in any battle.',
    event_type: 'element_play',
    target_filter: { element: 'wind' },
    goal: 3,
    reward_gold: 120,
    match: (q, payload) => payload?.element === 'wind',
  },
  {
    id: 'match_win_3',
    title: 'Triple Triumph',
    description: 'Win 3 battles in any mode.',
    event_type: 'match_win',
    target_filter: {},
    goal: 3,
    reward_gold: 180,
    match: () => true,
  },
  {
    id: 'level_up_1',
    title: 'Card Sharpener',
    description: 'Level up any card.',
    event_type: 'level_up',
    target_filter: {},
    goal: 1,
    reward_gold: 100,
    match: () => true,
  },
];

const TEMPLATES_BY_ID = new Map(QUEST_TEMPLATES.map((t) => [t.id, t]));

// ─── Daily key + selection ───────────────────────────────────────────────────
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Deterministic shuffle keyed by (email, date) so a player gets the same 3
 * quests for the day even across reloads, but a fresh roster the next day.
 */
function dailySeed(email, dateKey) {
  const str = `${email || 'anon'}::${dateKey}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function pickDailyTemplates(email, dateKey, count = 3) {
  const rand = dailySeed(email, dateKey);
  const pool = [...QUEST_TEMPLATES];
  // Fisher-Yates with seeded RNG
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Ensure today's 3 quests exist in the database for the given user. If a fresh
 * day is detected, generates a new roster. Idempotent — safe to call on mount.
 */
export async function ensureDailyQuests(userEmail) {
  if (!userEmail) return [];
  const dateKey = todayKey();

  const existing = await base44.entities.DailyQuest.filter(
    { user_email: userEmail, quest_date: dateKey },
    '-created_date',
    50,
  ).catch(() => []);

  if (existing && existing.length > 0) return existing;

  const picks = pickDailyTemplates(userEmail, dateKey, 3);
  const created = await Promise.all(
    picks.map((t) =>
      base44.entities.DailyQuest.create({
        user_email: userEmail,
        quest_date: dateKey,
        template_id: t.id,
        title: t.title,
        description: t.description,
        event_type: t.event_type,
        target_filter: t.target_filter || {},
        goal: t.goal,
        progress: 0,
        status: 'active',
        reward_gold: t.reward_gold,
      }).catch(() => null),
    ),
  );
  return created.filter(Boolean);
}

/**
 * Increment progress on all active quests of `eventType` whose template
 * `match` predicate accepts the payload. Marks quests as completed when goal
 * is reached. Reward is granted only on explicit `claimQuest()` call.
 *
 * Fires a `'daily-quests-changed'` window event on update so the UI can react.
 *
 * @param {string} eventType — one of QUEST_TEMPLATES[*].event_type
 * @param {object} payload   — event-specific data (e.g. { element: 'fire' })
 * @param {number} amount    — increment amount (default 1)
 */
export async function reportQuestEvent(eventType, payload = {}, amount = 1) {
  if (!eventType || amount <= 0) return;
  let me;
  try { me = await base44.auth.me(); } catch { return; }
  if (!me?.email) return;

  const dateKey = todayKey();
  const quests = await base44.entities.DailyQuest.filter(
    { user_email: me.email, quest_date: dateKey, event_type: eventType },
    '-created_date',
    20,
  ).catch(() => []);

  if (!quests || quests.length === 0) return;

  const updates = [];
  for (const q of quests) {
    if (q.status !== 'active') continue;
    const tpl = TEMPLATES_BY_ID.get(q.template_id);
    const matches = tpl?.match ? tpl.match(q, payload) : true;
    if (!matches) continue;

    const next = Math.min(q.goal, (q.progress || 0) + amount);
    const completed = next >= q.goal;
    updates.push(
      base44.entities.DailyQuest.update(q.id, {
        progress: next,
        status: completed ? 'completed' : 'active',
        completed_at: completed ? new Date().toISOString() : undefined,
      }).catch(() => null),
    );
  }

  if (updates.length > 0) {
    await Promise.all(updates);
    try { window.dispatchEvent(new CustomEvent('daily-quests-changed')); } catch { /* SSR-safe */ }
  }
}

/**
 * Claim a completed quest's gold reward. Idempotent — already-claimed quests
 * return their existing record without re-awarding.
 */
export async function claimQuest(questId) {
  const all = await base44.entities.DailyQuest.list('-created_date', 50).catch(() => []);
  const quest = all.find((q) => q.id === questId);
  if (!quest) return { ok: false, error: 'Quest not found.' };
  if (quest.status !== 'completed') return { ok: false, error: 'Quest is not complete yet.' };

  // Award gold via the existing economy API (creates audit log entry).
  let newGold;
  try {
    newGold = await awardGold(quest.reward_gold || 0, `Daily quest reward: ${quest.title}`, {
      quest_id: quest.id,
      template_id: quest.template_id,
    });
  } catch (err) {
    return { ok: false, error: 'Reward could not be granted.' };
  }

  await base44.entities.DailyQuest.update(quest.id, {
    status: 'claimed',
    claimed_at: new Date().toISOString(),
  }).catch(() => null);

  try { window.dispatchEvent(new CustomEvent('daily-quests-changed')); } catch { /* SSR-safe */ }
  return { ok: true, gold: quest.reward_gold || 0, newGoldBalance: newGold };
}

/** Convenience for UI: aggregate count by status in a single pass. */
export function summarizeQuests(quests = []) {
  return quests.reduce(
    (acc, q) => {
      if (q.status === 'completed') acc.completed += 1;
      else if (q.status === 'claimed') acc.claimed += 1;
      else acc.active += 1;
      return acc;
    },
    { active: 0, completed: 0, claimed: 0 },
  );
}