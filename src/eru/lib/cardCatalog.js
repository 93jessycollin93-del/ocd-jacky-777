// ----------------------------------------------------------------------------
// Card Catalog — global library data source
// ----------------------------------------------------------------------------
// Single source of truth for the Library / Encyclopedia page. Today the
// "known" universe of cards is the union of:
//   1. STARTER_CARDS (hand-curated baseline pool)
//   2. Any Card records that exist across the user's collection
//
// Future-proofing:
//   - When a global "MasterCard" entity is introduced, add a fetch step here
//     and merge its rows into `entries`. Consumers won't change.
//   - Same for pack/expansion catalogs — push their seeds into `entries` and
//     they'll appear automatically with element/rarity/origin filters.
//   - The `discovered` flag is computed against the player's owned cards by
//     matching on `name` (case-insensitive) which works across IDs, snapshots,
//     and transmuted variants without coupling to a specific schema.
//
// Returned shape per entry:
//   {
//     key:        unique stable id for React keys
//     card:       full card object (compatible with CardDisplay)
//     element:    'fire' | 'water' | ...
//     rarity:     'common' | 'rare' | ...
//     origin:     string  (faction or lore_origin — falls back to 'Unknown')
//     discovered: boolean (true if the player owns at least one copy)
//     ownedCount: number  (how many copies the player owns)
//     source:     'starter' | 'collection' | 'master' (extensible)
//   }
// ----------------------------------------------------------------------------
import { base44 } from '@/eru/api/base44Client';
import { STARTER_CARDS } from '@/eru/components/cards/StarterCards';

const norm = (v) => (v ?? '').toString().trim().toLowerCase();

// Build a lookup of cards the current user has at least one of.
function buildOwnedIndex(ownedCards) {
  const counts = new Map();
  ownedCards.forEach((c) => {
    if (!c?.name) return;
    const key = norm(c.name);
    counts.set(key, (counts.get(key) || 0) + (c.quantity || 1));
  });
  return counts;
}

function deriveOrigin(card) {
  return card?.lore_origin || card?.faction || 'Unknown';
}

function toEntry(card, source, ownedIndex) {
  const ownedCount = ownedIndex.get(norm(card.name)) || 0;
  return {
    key: `${source}:${card.id || card.name}`,
    card,
    element: card.element || 'fire',
    rarity: card.rarity || 'common',
    origin: deriveOrigin(card),
    discovered: ownedCount > 0,
    ownedCount,
    source,
  };
}

/**
 * Load the full known-card catalog for the Library page.
 * Returns a de-duplicated list (by lower-cased card name) so the same card
 * doesn't appear twice when both the starter pool and the player's collection
 * contain it. Owned data always wins on tie because it's player-specific.
 */
export async function loadCardCatalog() {
  const ownedCards = await base44.entities.Card.list('-created_date', 500).catch(() => []);
  const ownedIndex = buildOwnedIndex(ownedCards);

  const seen = new Set();
  const entries = [];

  // Owned first (so its richer data — lore_origin, quantity — wins).
  ownedCards.forEach((c) => {
    if (!c?.name) return;
    const k = norm(c.name);
    if (seen.has(k)) return;
    seen.add(k);
    entries.push(toEntry(c, 'collection', ownedIndex));
  });

  // Then the starter baseline.
  STARTER_CARDS.forEach((c) => {
    const k = norm(c.name);
    if (seen.has(k)) return;
    seen.add(k);
    entries.push(toEntry(c, 'starter', ownedIndex));
  });

  // FUTURE: merge MasterCard entity here when introduced.
  // const master = await base44.entities.MasterCard.list().catch(() => []);
  // master.forEach(...) — same dedup pattern.

  return entries;
}

export function summarizeCatalog(entries) {
  const total = entries.length;
  const discovered = entries.filter((e) => e.discovered).length;
  const pct = total > 0 ? Math.round((discovered / total) * 100) : 0;
  return { total, discovered, undiscovered: total - discovered, pct };
}

export function uniqueOrigins(entries) {
  return Array.from(new Set(entries.map((e) => e.origin))).sort();
}