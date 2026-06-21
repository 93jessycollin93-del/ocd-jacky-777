/**
 * cardLore.js — narrative layer for the card system.
 *
 * Pure helpers + light entity I/O for the lore system. NEVER touches battle
 * math. Battle code reads `power`, `guard`, `cost`, `ability`, `ability_value`
 * exactly as before. Lore fields are additive metadata.
 *
 * Surfaces:
 *   - Origin (signal source)            → card.lore_origin
 *   - Stability (visible + hidden)      → card.stability_visible / card.stability_hidden
 *   - Historical log                    → card.historical_log[]
 *   - Reality Pressure (per-user meter) → RealityPressure entity
 *   - Excavation Events (packs)         → ExcavationEvent entity
 */

import { base44 } from '@/eru/api/base44Client';

// ---------------------------------------------------------------------------
// Signal origins / lore tags — narrative palette for excavation events.
// ---------------------------------------------------------------------------
export const SIGNAL_ORIGINS = [
  { id: 'echo_drift_7s',     label: 'Echo Drift 7-Σ',       biome: 'drift'    },
  { id: 'monolith_sector_3', label: 'Monolith Sector 3',    biome: 'monolith' },
  { id: 'monolith_sector_12',label: 'Monolith Sector 12',   biome: 'monolith' },
  { id: 'pale_archive',      label: 'Pale Archive',         biome: 'archive'  },
  { id: 'collapsed_array',   label: 'Collapsed Array Δ',    biome: 'array'    },
  { id: 'voidline_2b',       label: 'Voidline 2-β',         biome: 'void'     },
  { id: 'last_resonance',    label: 'Last Resonance Field', biome: 'field'    },
  { id: 'silent_loop',       label: 'Silent Loop',          biome: 'loop'     },
];

export const EXCAVATION_PACKS = [
  {
    id: 'drift_pack',
    name: 'Drift Excavation',
    origin: 'Echo Drift 7-Σ',
    lore_tag: 'drift_signal',
    rarity_bias: 'common',
    description: 'Cheapest dig. Mostly common signal, occasional rare echo.',
    cost_gold: 80,
    pulls: 3,
  },
  {
    id: 'monolith_pack',
    name: 'Monolith Excavation',
    origin: 'Monolith Sector 12',
    lore_tag: 'monolith_core',
    rarity_bias: 'rare',
    description: 'Stable strata. Rare or better, with epic resonance possible.',
    cost_gold: 220,
    pulls: 3,
  },
  {
    id: 'voidline_pack',
    name: 'Voidline Excavation',
    origin: 'Voidline 2-β',
    lore_tag: 'void_breach',
    rarity_bias: 'epic',
    description: 'Unstable. Epic floor, mythic surfacing recorded twice.',
    cost_gold: 600,
    pulls: 3,
  },
];

// ---------------------------------------------------------------------------
// Stability — derived from rarity + a deterministic-ish hash of the card name.
// `hidden` drifts further from `visible` for high-power / high-rarity cards;
// the gap is the *narrative* tension, not a gameplay number.
// ---------------------------------------------------------------------------
const RARITY_STABILITY = {
  common:    { base: 86, jitter: 8 },
  rare:      { base: 74, jitter: 10 },
  epic:      { base: 60, jitter: 14 },
  legendary: { base: 44, jitter: 18 },
  mythic:    { base: 28, jitter: 22 },
};

function hashName(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function deriveStability(card = {}) {
  const def = RARITY_STABILITY[card.rarity] || RARITY_STABILITY.common;
  const h = hashName(card.name || '');
  const visible = Math.max(5, Math.min(100, def.base + ((h % (def.jitter * 2 + 1)) - def.jitter)));
  // Hidden tracks visible but skews lower for high-power cards.
  const powerWeight = Math.min(20, Math.max(0, (card.power || 0) - 4) * 2);
  const hidden = Math.max(2, Math.min(100, visible - powerWeight - ((h % 9))));
  return { stability_visible: visible, stability_hidden: hidden };
}

export function stabilityBand(value) {
  if (value >= 80) return { label: 'Anchored',  tone: 'text-emerald-300', dot: 'bg-emerald-400' };
  if (value >= 60) return { label: 'Coherent',  tone: 'text-cyan-300',    dot: 'bg-cyan-400' };
  if (value >= 40) return { label: 'Drifting',  tone: 'text-amber-300',   dot: 'bg-amber-400' };
  if (value >= 20) return { label: 'Unstable',  tone: 'text-orange-300',  dot: 'bg-orange-400' };
  return            { label: 'Fracturing', tone: 'text-rose-300',    dot: 'bg-rose-400' };
}

export function deriveOrigin(card = {}) {
  const h = hashName((card.name || '') + (card.faction || ''));
  return SIGNAL_ORIGINS[h % SIGNAL_ORIGINS.length].label;
}

// ---------------------------------------------------------------------------
// Ensure a card has a lore profile. Pure function — caller persists if needed.
// ---------------------------------------------------------------------------
export function ensureLoreProfile(card) {
  if (!card) return card;
  const next = { ...card };
  if (!next.lore_origin) next.lore_origin = deriveOrigin(next);
  if (typeof next.stability_visible !== 'number' || typeof next.stability_hidden !== 'number') {
    const s = deriveStability(next);
    if (typeof next.stability_visible !== 'number') next.stability_visible = s.stability_visible;
    if (typeof next.stability_hidden !== 'number') next.stability_hidden = s.stability_hidden;
  }
  if (!Array.isArray(next.historical_log)) next.historical_log = [];
  if (next.historical_log.length === 0) {
    next.historical_log = [{
      event_type: 'origin',
      summary: `Surfaced from ${next.lore_origin}.`,
      timestamp: new Date().toISOString(),
    }];
  }
  return next;
}

export function appendLogEntry(card, entry) {
  const log = Array.isArray(card?.historical_log) ? card.historical_log : [];
  return [
    ...log,
    {
      timestamp: new Date().toISOString(),
      ...entry,
    },
  ].slice(-50); // cap at 50 entries to keep the doc small
}

/**
 * Centralized Card.create wrapper — guarantees every newly created card
 * carries a full lore profile (origin, stability, historical log) regardless
 * of where it was minted (excavation pack, tournament reward, swap accept,
 * future card sets, etc.). This is the ONLY path new cards should take.
 *
 * @param {object} seed     - card data (rarity, name, faction, etc.)
 * @param {object} [opts]   - { source, summary, actor, metadata, origin, lore_tag }
 *                            source: short event_type tag for the seed log entry
 *                                    (defaults to 'origin')
 * @returns {Promise<object|null>} created Card record (or null if create failed)
 */
export async function createCardWithLore(seed, opts = {}) {
  if (!seed) return null;
  const profile = ensureLoreProfile({
    ...seed,
    id: undefined,
    quantity: seed.quantity || 1,
    // Allow caller to override origin/tag (e.g. excavation packs).
    lore_origin: opts.origin || seed.lore_origin,
    lore_tag: opts.lore_tag || seed.lore_tag,
  });
  // Replace the auto-seeded "origin" entry with a richer one when caller gave context.
  if (opts.summary || opts.source) {
    profile.historical_log = appendLogEntry(
      { ...profile, historical_log: [] }, // start clean so we get exactly one creation entry
      {
        event_type: opts.source || 'origin',
        summary: opts.summary || `Surfaced from ${profile.lore_origin}.`,
        actor: opts.actor,
        metadata: opts.metadata,
      },
    );
  }
  return base44.entities.Card.create(profile).catch(() => null);
}

// ---------------------------------------------------------------------------
// Reality Pressure — per-user meter. We keep it per-user (not truly global)
// so RLS works cleanly without a service role; "global" reads as global to
// the player which is what matters for the lore feel.
// ---------------------------------------------------------------------------
export const PRESSURE_PHASES = [
  { id: 'calm',       min: 0,   label: 'Calm',       tone: 'text-emerald-300', glow: 'shadow-emerald-500/20', flavor: 'Signal stable. Reality holds.' },
  { id: 'humming',    min: 25,  label: 'Humming',    tone: 'text-cyan-300',    glow: 'shadow-cyan-500/30',    flavor: 'Background resonance rising.' },
  { id: 'unstable',   min: 50,  label: 'Unstable',   tone: 'text-amber-300',   glow: 'shadow-amber-500/30',   flavor: 'Edges of the field flicker.' },
  { id: 'fracturing', min: 75,  label: 'Fracturing', tone: 'text-orange-300',  glow: 'shadow-orange-500/40',  flavor: 'Memory bleed detected.' },
  { id: 'critical',   min: 92,  label: 'Critical',   tone: 'text-rose-300',    glow: 'shadow-rose-500/50',    flavor: 'Reality is shedding cards.' },
];

export function phaseFor(pressure) {
  const v = Math.max(0, Math.min(100, Number(pressure || 0)));
  let phase = PRESSURE_PHASES[0];
  for (const p of PRESSURE_PHASES) if (v >= p.min) phase = p;
  return phase;
}

// In-memory cache so the meter doesn't refetch on every render.
let pressureCache = null;

export async function fetchPressure(force = false) {
  if (pressureCache && !force) return pressureCache;
  const me = await base44.auth.me().catch(() => null);
  if (!me?.email) return null;
  const rows = await base44.entities.RealityPressure.filter({ user_email: me.email }, '-updated_date', 1).catch(() => []);
  let row = rows?.[0];
  if (!row) {
    row = await base44.entities.RealityPressure.create({ user_email: me.email, pressure: 0, phase: 'calm' }).catch(() => null);
  }
  pressureCache = row;
  return row;
}

/**
 * Bumps the meter when a high-power activation happens. Caller decides what
 * "high power" means; we recommend power >= 6 OR rarity in {epic, legendary, mythic}.
 *
 * @param {{ amount?: number, summary?: string }} opts
 * @returns {Promise<RealityPressure|null>}
 */
export async function bumpPressure({ amount = 4, summary = 'High-power card activated' } = {}) {
  const row = await fetchPressure(true);
  if (!row?.id) return null;
  const next = Math.max(0, Math.min(100, (row.pressure || 0) + amount));
  const phase = phaseFor(next).id;
  const updated = await base44.entities.RealityPressure.update(row.id, {
    pressure: next,
    phase,
    high_power_uses: (row.high_power_uses || 0) + 1,
    last_event_at: new Date().toISOString(),
    last_event_summary: summary,
  }).catch(() => null);
  pressureCache = updated || { ...row, pressure: next, phase };
  return pressureCache;
}

export function isHighPowerCard(card) {
  if (!card) return false;
  if ((card.power || 0) >= 6) return true;
  return ['epic', 'legendary', 'mythic'].includes(card.rarity);
}

// ---------------------------------------------------------------------------
// Drift / signal distortion — a lightweight CSS class set used by the UI.
// ---------------------------------------------------------------------------
export function distortionClassFor(stability) {
  if (stability >= 80) return 'lore-distort-none';
  if (stability >= 60) return 'lore-distort-faint';
  if (stability >= 40) return 'lore-distort-soft';
  if (stability >= 20) return 'lore-distort-strong';
  return 'lore-distort-fracture';
}