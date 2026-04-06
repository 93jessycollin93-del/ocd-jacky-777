
# Jade Royal Vault Store + Game State Bridge

## What we'll build now (Phase 1)

### 1. Connect Game State → Jackie Chat
- Wire `getGameStateContext()` into the chat's edge function call so Jackie sees live resources, army, marches
- Already have the extraction logic — just need to pass it through `streamJackieResponse`

### 2. Jade Store Foundation
- **Store data model**: `src/game/jadeStoreData.ts` with 100+ packs across 12 product families
- **Pack scoring system**: attractiveness, margin, prestige, whale appeal, beginner appeal scores
- **Store UI**: `src/components/game/JadeStorePage.tsx` — royal vault boutique aesthetic
  - Hero banner with featured packs
  - Category navigation (12 families)
  - Pack cards with rarity glow, prestige badges, timers
  - Pack detail modal with rewards breakdown
  - "Best Value" / "Most Popular" / "Limited" badges
- **Rarity ladder**: Common → Refined → Gilded → Sovereign → Imperial → Singularity
- **Pity system data**: visible pity meter logic in store context

### 3. Visual Design
- Dark jade/gold/obsidian palette — NOT a mobile cash shop
- Rarity-based glow effects (jade green → gold → platinum → cosmic)
- Premium typography and spacing
- Vault-opening animation feel

## What's deferred (Phase 2+)
- Admin curation dashboard
- Live oracle pricing layer (crypto/FX/metals)
- Sovereign Fund treasury display
- JTA carving flow integration
- Fracture/fractionalization mechanics
- TON payment integration
- Telegram Mini App layout
- Smart contract / marketplace logic
- A/B testing system

## Files to create/modify
| File | Change |
|------|--------|
| `src/game/jadeStoreData.ts` | NEW — 100+ packs, scoring, categories |
| `src/game/jadeTypes.ts` | NEW — Jade economy types |
| `src/components/game/JadeStorePage.tsx` | NEW — Royal vault store UI |
| `src/lib/jackie-stream.ts` | Add game state context injection |
| `src/components/game/GameLayout.tsx` | Add Jade Store tab |
