

# Plan: Build All 15 Incomplete Game Pages

## Summary
15 game pages are empty one-line stubs despite GameContext already having the backend methods wired (exchangeResources, giftFaction, pullGacha, unlockSongTier, etc.). Each page needs a functional UI connecting to existing game logic.

## What Gets Built

### Group 1 — Economy Core (4 pages)
**ShopPage** — Grid of purchasable items (speedups, shields, resource packs, teleports) bought with gold/resources. Category tabs, quantity selector, purchase confirmation. Items go to `state.bag`.

**BagPage** — Inventory grid of all owned items from `state.bag` + `state.gachaInventory`. Category tabs (All, Speedups, Boosts, Shields, Equipment, Notes). "Use" button for consumables via `useGachaItem`. Battle Plan notes section using `state.battlePlans`.

**CraftingPage** — Uses existing `craftGear()` and `canAffordMaterials()` from GameContext. Shows `GEAR_CRAFT_RECIPES` with material costs, crafting materials inventory display, and craft button. Also shows `GEAR_UPGRADE_RECIPES` for upgrading existing gear.

**MarketplacePage / TradingPage** — Merge into one: resource exchange using existing `exchangeResources()`. Slider for amount, dynamic exchange rate display, confirm button. Add simulated NPC trader deals with fluctuating rates.

### Group 2 — Social & Competitive (3 pages)
**DiplomacyPage** — Faction relations panel for edain/eldari/khazari. Shows standing bars, alliance levels, gift resources button via `giftFaction()`, trade route activation via `activateTradeRoute()`. Already fully wired in GameContext.

**GuildBankPage** — Uses `state.guildBank` type already defined. Treasury display, deposit/withdraw resources, guild boost activation, member roles, stability beacon progress.

**LeaderboardPage** — Mock leaderboard with player ranking by Power, Kills, Resources, Arena Wins. Current player highlighted. Top 3 with medal icons.

### Group 3 — Engagement (4 pages)
**GachaPage** — Lootcrate pull interface using existing `pullGacha()`, `generateActiveBanners()`, `forgeFragments()`. Banner carousel, single/10-pull buttons, pity counter, pull animation, inventory view.

**ShardsPage** — Light/Dark/Balance shard display from `state.shards`. Shard fusion thresholds, elemental bonuses, visual glow effects.

**EventLogPage** — Scrollable timeline from `state.aiEventLog`. Filter by event type, timestamp display, resource change indicators.

**PremiumStorePage** — Diamond-only cosmetics, profile badges, exclusive skins. Distinct from Jade Store. All purchases use diamond currency with transactionGuard.

### Group 4 — Utility (4 pages)
**AIPage (Oracle)** — Strategic advisor generated from game state analysis. Recommended next builds, threat assessment, resource optimization tips. No AI API calls — pure client-side game state analysis.

**JukeboxPage** — Music collection with 10 languages from `musicData.ts`. Uses existing `unlockSongTier()` and `getUnlockedTier()`. Tier progression (bronze→mythic), unlock cost display, visual tier cards.

**QuestsPage** — Daily (5) + weekly (3) quest system. Quests track real game actions (build, train, research, battle). Progress bars, claim buttons, auto-refresh timers.

**DiagnosticsPanel** — Dev panel: resource production rates, active timers, state integrity check via `verifyStateIntegrity()`, transaction log viewer, localStorage size display.

## Technical Approach
- Each page uses `useGame()` hook for state access
- All diamond transactions use `transactionGuard.ts` (rate limiting, atomic updates, dedup)
- All gold/resource transactions use `canAfford()` + `spendResources()` pattern
- Mobile-first with 44px touch targets, consistent with BattlePassPage/DiamondExchangePage patterns
- Quest system adds a `quests` field to GameState (requires small GameContext addition)
- Shop items add to `state.bag` (type already defined)
- No new database tables needed — all client-side with cloud sync

## Files Changed
- 15 page files replaced (each ~150-350 lines)
- `src/game/GameContext.tsx` — add quest tracking, shop purchase, bag item use methods
- `src/game/types.ts` — add QuestState interface
- `src/game/data.ts` — add SHOP_ITEMS, QUEST_DEFINITIONS constants

## Order of Implementation
1. Types + data definitions
2. GameContext method additions (quests, shop)
3. All 15 pages in parallel groups

