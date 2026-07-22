# Fleet Parity Plan — one soul, three platforms

**Mission.** PC ("Jackie's PC") is the reference — the most complete app. Elevate the
other two into **platform-native supersets of PC**: every feature present, every
aesthetic matched, the best ideas from across the fleet folded in — but each one
idiomatic to the platform it lives on so you can manipulate it there.

| App | Repo | Platform | Backend it must fit |
|---|---|---|---|
| **PC** | `PC` (`jackies-pc`) | Vite/React 19, self-hosted | Express `server.ts` + Firebase + on-device AI + the `jacky` Flask engine |
| **Eru** | `eru` | **base44.com** | Base44 entities + serverless functions + Base44 auth |
| **Jackie** | `ocd-jacky-777` | **lovable.dev** | Supabase (Postgres + RLS + edge functions) + Lovable auth |

**Design tenets.** *Human simplicity on the surface, full depth underneath.* A clean
shell and a single obvious way in (the **App Commander** launcher, already shipped to
all three), with progressive disclosure into the deep tools. Same visual soul — the
eYe / cybernetic dark HUD — everywhere. Not pixel-identical clones; **capability- and
feel-identical** supersets.

---

## 1. Where the three stand today (honest baseline)

- **PC** — ~90 windowed apps, on-device AI, vault/compression subsystem, PWA. The
  reference. Gaps: not wired to the real `jacky` telemetry; missing a few "best of
  fleet" patterns (see `FEATURE_AUDIT.md`).
- **Eru** — a large Base44 super-app already (~90 pages, ~150 entities, ~70 functions:
  bots, trading, TCG, security, media). Rich, but a *different* app; needs PC's app
  set + a shared shell/theme, expressed in Base44 primitives.
- **Jackie (ocd-jacky-777)** — the furthest along structurally: it **already embeds the
  whole PC OS** (`public/pc-os/` via `PCDesktop.tsx` at `/pc`) and **already has all 91
  Eru pages** copied into `src/eru/`, on Supabase with real edge functions
  (`jackie-orchestrate/chat/groq/ollama/openrouter`). Parity here is mostly *native
  integration* (bridge, shared auth/theme, wire the real backend) rather than re-cloning.

**The unlock (from the audit):** none of the three currently talk to the real `jacky`
Flask engine — they simulate telemetry or hit cloud LLMs. The App Commander is the first
that does. A shared **`jackyClient`** shim is therefore Wave 1 for all three.

---

## 2. Shared design system (aesthetics · themes · everything)

One portable identity applied across all three, seeded by the App Commander:

- **Palette / tokens** — the eYe situation-room set: ground `#0a0e14`, panels `#111a26`,
  ink `#cdd9ea`, teal `#00e6c9` (eYe), gold `#e8b552` (rank), semantics nominal/warn/crit.
  Ship as CSS custom-property tokens (`eye-theme.css`) + a Tailwind theme preset so both
  the shadcn (Jackie) and Base44 (Eru) styling layers consume the same variables.
- **Shell language** — the windowed "desktop OS" metaphor from PC (`DraggableWindow`,
  `FloatingNav`, `CommandPalette`, `HomeScreen`) as the common frame; App Commander as the
  home/launcher in each.
- **Motifs & motion** — the eYe radar badge, scanline atmosphere, tabular HUD readouts,
  reduced-motion honored. Type: system-display + monospace data, as in the Commander.
- **Themes** — a theme registry (PC already has `src/pc-themes/*`) exposed in each app's
  settings so a user can switch skins; ship 3–4 presets (eYe Dark, Cyber Neon, Cream Light).

Deliverable: a small shared **`fleet-ui` token/theme kit** (CSS vars + Tailwind preset +
the App Commander components) copied into each repo, each importing the same tokens.

---

## 3. Feature parity matrix (PC domains → each platform)

PC's ~90 apps group into domains. For each, the target implementation per platform:

| PC domain (examples) | Eru — Base44 target | Jackie — Supabase/Lovable target |
|---|---|---|
| **AI / agents / models** (ModelRouter, OnDeviceModels, Claude/Grok/Codex, SmallAgentFleet, KnowledgeCompressor) | Base44 `agents/` + functions calling providers; entities for models/agents/routes | Extend existing edge fns (`jackie-orchestrate/groq/ollama/openrouter`) + tables `agents/models/routes` |
| **Security / vault / secrets** (SecretsVault, SecurityCenter, PermissionBroker, AuditTrail) | Base44 entities `Secret/AuditEvent/Permission` + functions for hygiene scans | Supabase tables + **RLS** (roles table + `has_role()` pattern from tikkerlive) + edge fns |
| **Data / knowledge / pods** (DataPods, KnowledgeCompressor, TimeMachine, Archiver, ECPS) | Base44 entities `Pod/Snapshot` + functions; ECPS via `jacky` API | Supabase `pods/snapshots` + storage buckets; ECPS via `jacky` API |
| **Infra / cost / ops** (BudgetGuardian, CostAnalytics, FleetAtlas, MissionControl) | Base44 entities `Budget/SpendEvent`; MissionControl reads `jacky /api/status` | Supabase tables + realtime; MissionControl reads `jacky /api/status` |
| **Devices / creative / games** (SuperSayen, Flipper, Blender/Unreal, chess/arcade) | Base44 pages (client-heavy; little backend) | Lovable pages (client-heavy) — reuse PC components where possible |
| **System shell** (Home, Settings, Notifications, Automation, Voice, Clipboard) | Base44 pages + `Notification/Automation` entities | Supabase `notifications/automations` + edge fns |

The full per-app checklist lives in **§6 Parity tracker** (kept as a living matrix).

---

## 4. Backend fit per platform (the load-bearing constraint)

Each app's features must be backed by the platform it runs on — plus a shared bridge to
the real `jacky` engine.

**Shared: `jackyClient` shim** (Wave 1, all three).
Generalize the App Commander's fetch layer: configurable base URL + token, offline
fallback, typed wrappers for `/api/status`, `/api/assessment`, `/api/ask`, `/api/control`,
`/api/squads/*`, `/api/ecps/*`. Gives every app real GPU/thermal/routing without
re-implementing it. Files: `PC/lib/jackyClient.ts`, `eru` function
`base44/functions/jackyProxy.js` (server-side to avoid CORS), Jackie edge function
`supabase/functions/jacky-proxy`.

**Eru → Base44.**
- *Data* → Base44 **entities** (`.jsonc` schema): one per PC persisted concept
  (Model, Agent, Route, Secret, Pod, Budget, Notification, Automation…).
- *Logic* → Base44 **serverless functions** (`base44/functions/`): provider calls,
  scans, rebalancing, the `jackyProxy`.
- *Auth* → Base44 auth (already in use).
- *UI* → Base44 React pages under `src/pages/`, using the shared theme kit + PC components
  adapted to `@base44/sdk` data access.

**Jackie → Lovable + Supabase.**
- *Data* → Supabase **Postgres tables** with **RLS** (extend the existing
  `conversations/chat_messages/jackie_*` schema); roles table + `has_role()` security-definer.
- *Logic* → Supabase **edge functions** (extend `jackie-*`; add `jacky-proxy`, `squads`,
  `ecps`).
- *Auth* → Lovable/Supabase auth (already in use).
- *UI* → TS + shadcn pages; reuse the embedded PC OS (`public/pc-os/`) for heavy apps and
  progressively replace iframes with native TSX using the shared kit.

**PC (reference) also levels up:** wire `jackyClient`, then absorb the "best of fleet"
items from `FEATURE_AUDIT.md` (explainable scoring, Intel console, lineage graph, RLS
auth blueprint).

---

## 5. Phased rollout

Each item is independently shippable; waves are sequence, not a single commit.

- **Wave 0 — foundation (now).** App Commander shipped to all 3 ✅. Next: extract the
  shared **theme/token kit** into each repo; stand up the **parity tracker** (§6).
- **Wave 1 — real backend.** `jackyClient` shim in all 3 (+ platform proxy fn to dodge
  CORS). Light up **real System Monitor**, **Ask Jackie w/ fallback chain**, **master
  switch**. This is the biggest single unlock.
- **Wave 2 — core app domains, platform-native.** AI/agents, security/vault, data/pods —
  ported as Base44 entities+functions (Eru) and Supabase tables+edge fns (Jackie), behind
  the shared shell. Jackie leans on its PC embed + Eru pages to move fast.
- **Wave 3 — breadth + best-of-fleet.** Remaining domains (creative/devices/games/system)
  + ECPS compression suite, yt-dlp Media Converter (eru backend + Jackie Vault UI),
  fobccc Intel/scoring/journal, tikkerlive lineage/RLS.
- **Wave 4 — unification & polish.** Theme switcher + presets in all 3, PWA/offline, parity
  QA against the tracker, performance, accessibility.

---

## 6. Parity tracker (living matrix)

A checklist mapping every PC app → status in Eru and Jackie (`todo / in-progress / native /
via-embed / n-a`). Maintained as `PARITY_MATRIX.md` (or a board), updated each wave. Seeded
from the PC app roster in `FEATURE_AUDIT.md`.

---

## 7. Immediate next step

Greenlight **Wave 1**: build the `jackyClient` shim (generalized from the App Commander) in
PC, plus the Base44 `jackyProxy` function and the Supabase `jacky-proxy` edge function — so
all three apps show **real** RTX-3090 telemetry and route real inference. That single unlock
turns the most dashboards from demo into live, and everything else layers on top.

---
*Companion docs: `FEATURE_AUDIT.md` (what to port + rankings), `app-commander.html` (the
shared launcher and design-system seed). Waves are a recommended sequence; each step is
independently shippable and reversible.*
