
## Goal

Fuse the Eru (`cybernetic67`, Base44) app into Jackie as a single Lovable codebase. Jackie stays the host shell (auth, theme, Supabase, AnimatedCanvas). Eru pages are imported, JSX → TSX, Base44 SDK calls routed through a thin bridge so existing Eru entities keep working without ripping out Base44 yet.

## Architecture

```text
Jackie shell (React + Vite + Supabase + Tailwind)
├── /src/eru/                       ← imported Eru namespace
│   ├── bridge/base44.ts            ← single client, lazy init, env-driven
│   ├── bridge/entities.ts          ← typed wrappers around Base44 entities
│   ├── bridge/auth.ts              ← maps Jackie user ↔ Eru profile
│   ├── components/…                ← Eru components, .tsx
│   ├── pages/…                     ← Eru pages, .tsx
│   └── ui/FloatingEditorNav.tsx    ← floating quick-nav + inline editor
├── /src/pages/eru/                 ← Jackie route entries that mount Eru pages
└── /src/components/visualizers/    ← shared upgraded visualizers
```

## Bridge (Keep Base44, add bridge)

1. New env vars in `.env.example`: `VITE_BASE44_APP_ID`, `VITE_BASE44_APP_BASE_URL`.
2. `src/eru/bridge/base44.ts` exports a single `base44` client (`@base44/sdk`) created lazily so missing env vars degrade gracefully (returns null + console warn, never crashes Jackie).
3. `src/eru/bridge/entities.ts` re-exports the entities Eru pages actually import (`Bot`, `BotListing`, `SecurityEvent`, `RedteamRun`, `SwarmRun`, …) with TS types and a fallback to Supabase shims where a Jackie table already covers the data.
4. `src/eru/bridge/auth.ts` reads Jackie's `useAuth` session and exposes a `useEruIdentity()` hook so Eru pages stop calling `User.me()` directly.

## First-slice pages (TSX-converted, Jackie-themed)

Import from the zip, run a transform that:
- renames `.jsx` → `.tsx`
- rewrites `@/api/entities` → `@/eru/bridge/entities`
- rewrites `@/api/integrations` → `@/eru/bridge/integrations`
- rewrites `createPageUrl(...)` to Jackie router paths (`/eru/<slug>`)
- wraps each page in `<EruPageShell>` (Jackie sticky banner + `AnimatedCanvas theme="neural_mesh"` background + REFERENCE/LIVE label)

Pages landing in this wave:

| Eru page | Mount at | Notes |
|---|---|---|
| `BotForge` | `/eru/bot-forge` | also linked from Jackie BotFoundry sidebar |
| `BotMarketplace` | `/eru/bot-market` | shares card components with Jackie BotSwarm |
| `SecurityCommandCenter` | `/eru/security` | pairs with VeilOps in the Security cluster |
| `AILab` | `/eru/ai-lab` | uses `jackie-orchestrate` instead of Base44 LLM call |
| `EruRedteamTest` | `/eru/redteam` | wired to `jackie-orchestrate` with red-team system prompt |
| `EruSwarmTest` | `/eru/swarm` | wired to `jackie-orchestrate` with swarm system prompt |

## Floating editor nav

`src/eru/ui/FloatingEditorNav.tsx` — bottom-right floating dock visible on every Eru/Jackie route, ported from Eru's `FloatingQuickActions` + `CollabScratchpad`:
- pill launcher → expands to: jump-to-page, inline Monaco scratchpad, AI ask (calls `jackie-orchestrate`), copy-context, toggle theme.
- Persists scratchpad to `localStorage` under `jackie.floating.scratchpad`.
- Mounted once in `App.tsx` inside `ProtectedRoute` so it follows the user across Jackie and Eru pages.

## Visualizers refresh

Single shared module `src/components/visualizers/` consumed by both Jackie and Eru screens:
- `NeuralMesh.tsx` — upgraded version of the current AnimatedCanvas mesh, framer-motion entry, jade/gold accent line.
- `NodeGraph.tsx` — replaces ad-hoc graphs in Eru AILab + Jackie Architecture views.
- `PulseTimeline.tsx` — used by SecurityCommandCenter and VeilOps.
- `OrbitField.tsx` — used by Swarm/Redteam panels and SphereCommand mini-cards.

Each visualizer accepts `data`, `theme`, `density`, `interactive` props and has a Storybook-style "vibe demo" route at `/eru/visualizers` so both Jackies (Jackie + Eru shell) can preview them.

## Routing + nav

- `src/App.tsx` adds the six new `/eru/*` routes (lazy-loaded) and `/eru/visualizers`.
- Jackie sidebar (`src/pages/Index.tsx`) gets a new "Eru" group listing the six pages and the visualizer lab.

## Out of scope (this wave)

- Remaining 70+ Eru pages — imported in later waves once the bridge is proven.
- Replacing Base44 with Supabase tables — explicit "keep Base44 + bridge" decision.
- Eru auth screens (`Login`, `Register`, `ResetPassword`) — Jackie's auth wins; bridge maps the session.

## Risks

- Base44 SDK is browser-only and needs `VITE_BASE44_APP_ID`. Without it the bridge no-ops; pages render in "offline" mode with empty data and a banner.
- JSX→TSX conversion will surface implicit-any errors; we add `// @ts-expect-error eru-import` only where unavoidable and track in `Jackie/ROADMAP.md`.
- Floating nav must not conflict with Jackie's existing `FloatingQuickActions`; we replace, not stack.
