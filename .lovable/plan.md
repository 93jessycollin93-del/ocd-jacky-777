

# Merge Dragon Veil + Emperors of the Last Kingdom into Jackie

## Vision

Jackie becomes the **hub** — the AI chat companion and stress-relief layer — while the full strategy game (merged from Dragon Veil and Emperors) lives as a playable experience accessible from within Jackie. Players chat with Jackie, design their game world, and then **play** it — all in one app.

## Architecture

```text
┌─────────────────────────────────────────────┐
│                   Jackie App                 │
│                                              │
│  /          → Jackie Chat (AI companion)     │
│  /design    → Game Design Hub                │
│  /play      → THE GAME (merged DVS + ELK)    │
│  /auth      → Login / Demo                   │
│                                              │
│  Sidebar: Chat | Design Hub | Play Game      │
│           FORGE link | Settings              │
└─────────────────────────────────────────────┘
```

## What Gets Merged

### From Emperors of the Last Kingdom (primary game engine)
- **Full game engine**: `GameContext.tsx` (1300 lines) — resource ticking, building upgrades, research, troops, combat, diplomacy, gacha, battle pass, guild bank, AI adaptation
- **All type definitions**: `types.ts` — Resources, Buildings, Troops, Gear, Gacha, Guild, AI Adaptation
- **All game data**: `data.ts` — 45 buildings, 60+ research items, troops, heroes, expeditions, gear crafting, legendary creatures
- **All game pages** (24 tabs): Dashboard, City, Research, Army, Expeditions, Heroes, Crafting, Diplomacy, Gacha, Battle Pass, Guild Bank, Trading, World Map, Bag, Quests, etc.
- **Support systems**: i18n translations, audio/music system, gacha data, AI adaptation

### From Dragon Veil Strategy (UI patterns + data)
- **Mock data types**: Heroes, TroopFormations, Monsters, Factions, Intel Reports, Rallies, City Buildings — merge into unified type system
- **UI components**: HomeDashboard, WorldScreen, IntelScreen, MonstersScreen, VeilPressureGauge — merge unique mechanics into the Emperors layout
- **World data**: Regions, factions, lore — feed into game content

### Jackie (stays as-is, gains game integration)
- Chat AI with streaming, voice, attachments, tags — unchanged
- Design Hub — unchanged, but now pre-populated with merged game data
- **New**: "Play Game" route that launches the merged strategy game
- **New**: Jackie can reference game state in conversations (your resources, army, etc.)

## Implementation Steps

| # | Step | Files | Scope |
|---|------|-------|-------|
| 1 | Copy game engine files from Emperors | `src/game/types.ts`, `data.ts`, `GameContext.tsx`, `gachaData.ts`, `aiAdaptation.ts`, `musicData.ts`, `i18n.tsx`, `translations/` | ~3000 lines |
| 2 | Copy all game UI components from Emperors | `src/components/game/` (24+ component files) | ~8000 lines |
| 3 | Merge Dragon Veil unique mechanics into game data | Extend `types.ts` and `data.ts` with DVS monsters, rallies, intel, veil pressure | ~500 lines |
| 4 | Copy support components (AudioSystem, TonWallet, ResourceBar, WorldMap, etc.) | `src/components/` | ~2000 lines |
| 5 | Create `/play` route with GameLayout | `src/pages/Play.tsx`, update `App.tsx` | New protected route |
| 6 | Add "Play Game" link to Jackie sidebar | `src/pages/Index.tsx` sidebar section | Small edit |
| 7 | Connect Jackie chat to game state | Pass game context summary to AI system prompt when user is in-game | Edge function update |
| 8 | Install missing dependencies | `framer-motion`, any other deps from Emperors | Package update |

## What Jackie Becomes

- **Chat** → Talk to Jackie, get game advice, brainstorm ideas, stress relief
- **Design Hub** → Curate and evolve game systems, lore, mechanics
- **Play** → Full playable strategy game with 24 tabs, 45 buildings, combat, gacha, guilds, diplomacy
- **FORGE** → External link to eru-1.base44.app for additional tools

## Important Notes

- The game uses `localStorage` for save state + cloud sync to the database every 30 seconds
- Demo users get to play but saves are wiped on logout (existing demo behavior)
- All existing Jackie features (tags, security, attachments, voice) remain untouched
- The game engine runs entirely client-side — no new database tables needed for gameplay
- Dragon Veil's mock data becomes real game content within the merged engine

## Estimated Scope

This is a large merge (~15,000 lines of game code to bring over). The implementation will be done in batches:
1. Game engine + types (core)
2. Game UI components (all 24+ pages)
3. Routing + sidebar integration
4. Dragon Veil unique content merge
5. Jackie ↔ Game context bridge

