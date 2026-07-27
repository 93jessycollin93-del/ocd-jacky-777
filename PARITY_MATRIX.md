# Parity Matrix — PC → Eru → Jackie → Empath

Living tracker for the Fleet Parity Plan. PC is the reference; this maps every PC
capability to its status in **Eru** (Base44), **Jackie** (`ocd-jacky-777`,
Lovable/Supabase) and **Empath** (`CYBERNETIC_EMPATH`, greenfield). Update the
cells as each wave lands. Two people/sessions have edited this file in parallel —
if a cell looks wrong, check `git log` before assuming it's stale.

**Legend** — ❌ not present · 🔶 partial / different impl · ✅ native parity ·
🪟 available via the PC embed in Jackie (`public/pc-os/`, not yet native) · — n/a

> Baseline from `FEATURE_AUDIT.md`. Jackie already embeds the whole PC OS and holds
> the Eru pages, so many of its cells start at 🪟/🔶 rather than ❌. Eru is its own
> large Base44 app, so several domains start 🔶 (its own take exists) rather than ❌.
> Empath was an empty repo — see its own row below rather than every domain table.

## Baseline counts (measured, not estimated)

| | PC | Eru | Jackie |
|---|---|---|---|
| App/page components | 90 (`components/apps/*.tsx`) | 95 (`src/pages/*.jsx`) | 91 Eru pages copied into `src/eru/pages/` + native `src/pages/` |
| Backend data | Firebase + IndexedDB + Express | 143 Base44 entities | Supabase Postgres |
| Backend logic | `server.ts` routes | 68 Base44 functions, 4 agents | 15 Supabase edge functions |
| PC OS embed | — | no | yes (`public/pc-os/`, mounted by `src/pages/PCDesktop.tsx`) |

Jackie's embed is why its parity story differs from Eru's: PC's apps are already
*reachable* there. The work is native integration, not re-cloning.

## Wave 1 + 2 — real backend bridge & native live surfaces

| Capability | PC | Eru | Jackie | Empath |
|---|---|---|---|---|
| `jackyClient` engine client | ✅ `lib/jackyClient.ts` | ✅ `src/lib/jackyClient.ts` | ✅ `src/lib/jackyClient.ts` | ✅ `src/lib/jackyClient.ts` (no app yet) |
| Server-side engine relay | ✅ `/api/jacky` in `server.ts` | ✅ `base44/functions/jackyProxy` | ✅ `supabase/functions/jacky-proxy` | ❌ (platform undecided) |
| Live System Monitor (real GPU/CPU/RAM/thermal) | ✅ App Commander proxy mode | ✅ native `/jacky-live` | ✅ native `/jacky-live` | — |
| Ask Jackie w/ situation-aware routing | ✅ App Commander console (proxy) | ✅ `/jacky-live` | ✅ `/jacky-live` | — |
| Squad console (coding/security/archivist) | 🔶 client ready → surface next | 🔶 client ready → surface next | 🔶 client ready → surface next | — |
| ECPS / Condenser suite | 🔶 client ready → surface next | 🔶 client ready → surface next | 🔶 client ready → surface next | — |
| MissionControl (native PC React wiring) | 🔶 next PC piece → `jackyClient` | — | — | — |
| eYe design system | ✅ `src/fleet-ui/` | ✅ + Tailwind preset | ✅ + Tailwind preset | ✅ (no app to adopt it yet) |
| Theme adopted on screen | ❌ | ❌ | ❌ | n/a |

`jackyClient.ts` and `eye-theme.css` are byte-identical across all four repos —
verified by checksum, not by inspection. The client's request allowlist
(`/api/status`, `/api/metrics`, `/api/assessment`, `/api/ask`, `/api/control`,
`/api/models`, `/api/bots`, `/api/squads/*`, `/api/ecps/*`) is likewise identical
across all three relays, but the three don't gate `/api/control` — the engine's
master switch — equally. Only **Eru** adds a real role check beyond plain auth
(`user.role === 'admin'`, which Base44 supplies directly). **PC** applies the
same `requireAuth` to `/api/control` as to every other allowlisted path — no
extra gate, and `requireAuth` passes every caller through when
`JACKIE_API_TOKEN` is unset, same as it does for `/api/shell/exec`. **Jackie**
has the same shape of gap and documents it in the relay rather than faking a
check that wouldn't hold — closing either one needs the RLS `has_role()` work
below.

> **Go live:** set `JACKY_API_BASE` (+ optional `JACKY_API_TOKEN`) in each app's
> env/secrets. PC's App Commander adds a **Same-origin proxy** link mode (⚙,
> top-right) that needs zero client config when the page is served by PC's server.
> **Still true everywhere:** the link has never been exercised against a live
> engine. Building and typechecking prove the code is correct; they don't prove
> the engine answers.

Two independent implementations of this bridge existed briefly on PC's and
Jackie's `main` (and, until it was caught, Eru's) — same idea, different
shapes, from parallel sessions working the same plan. Each was merged as a
union rather than a pick: request shapes from both sides are accepted, the
allowlist (the stricter of the two) always wins, and no caller had to change.

## AI / agents / models

| PC app | PC | Eru | Jackie |
|---|---|---|---|
| ModelRouter (`components/apps/ModelRouterApp.tsx`) | ✅ | 🔶 `AILab`/`invokeExternalModel` | 🔶 `jackie-orchestrate` edge fn |
| OnDeviceModels (`lib/offlineAiCatalog.ts`) | ✅ | ❌ | 🪟 |
| ClaudeAssistant / GrokTerminal / Codex assistants | ✅ | 🔶 `JackieAI` | 🔶 `jackie-chat` |
| SmallAgentFleet / AgentBuilder / AgentOrchestrationDashboard / AgentTeamConsole | ✅ | 🔶 `BotFarm`/`AgentOperations` | 🔶 `gunit-*` loop |
| KnowledgeCompressor (`lib/compression.ts`) | ✅ | ❌ | 🪟 |
| MultiAgentConsensusLab / CrossAiLab | ✅ | ❌ | ❌ |
| PromptLibrary / PromptToJson / FunctionCallKitchen / LangChain / LlmEnvironment | ✅ | ❌ | ❌ |
| Ollama manager | ✅ | ❌ (use jacky bridge) | 🔶 `jackie-ollama` |
| AgenticVision / AiDataResolver / BotStudio / JackyV3 | ✅ | ❌ | ❌ |

## Security / vault / secrets

| PC app | PC | Eru | Jackie |
|---|---|---|---|
| SecretsVault / SecretsHygiene (`lib/secretsVault.ts`) | ✅ | 🔶 `components/security` | 🔶 `Vault.tsx` |
| SecurityCenter / SecurityEventLog / SelfAuditScanner | ✅ | 🔶 `SecurityCommandCenter` | 🔶 `sentinel/` (mock data) |
| PermissionBroker (`lib/permissions.ts`) | ✅ | ❌ | ❌ (adopt tikkerlive RLS `has_role`) |
| AuditTrail (`lib/auditLog.ts`) | ✅ | 🔶 | ❌ |
| DependencyCVEChecker / AnomalyAlert | ✅ | 🔶 `ComplianceCenter` | ❌ |
| App Commander vault (AES-GCM boxes) | ✅ shared `app-commander.html` | ✅ (shared file) | ✅ (shared file) |
| APIKeys / BuildVault / DataRedaction / IntegrityMonitor / CyberSecurityRulebook | ✅ | ❌ | ❌ |

## Data / knowledge / storage

| PC app | PC | Eru | Jackie |
|---|---|---|---|
| DataPods / DataVault / PodSystem (`src/sas-pod-system/`) | ✅ | ❌ | 🔶 `lib/pods/` |
| KnowledgeCompressor / ECPS suite | ✅ | 🔶 client ready | 🔶 client ready |
| TimeMachine snapshots (`lib/timeMachineSnapshots.ts`) | ✅ | ❌ | ❌ |
| Archiver (`lib/compression/ecps-codec.js`) | ✅ | ❌ | ❌ |
| MemoryFabric (`lib/memoryFabric.ts`) | ✅ | 🔶 `indexBotSemanticMemory` fn | 🔶 `jackie_memory` table |
| Research apps (SemanticScholar/PapersWithCode/ResearchRabbit/ToolRegistry) | ✅ | ❌ | ❌ |
| StorageStats / Qpdb / ChatHistoryShare / CyberneticExport | ✅ | ❌ | ❌ |

## Infra / cost / ops

| PC app | PC | Eru | Jackie |
|---|---|---|---|
| MissionControl / FleetAtlas | ✅ | 🔶 `router-console` | 🔶 `SphereCommand`/`SentinelBoard` |
| BudgetGuardian / CostAnalytics (`lib/budgetGuardian.ts`) | ✅ | 🔶 `Economy`/`Portfolio` | ❌ |
| GitHubSync / CodeRabbit | ✅ | ❌ | ❌ |
| CloudDeploy / CloudInfrastructure | ✅ | ❌ | ❌ |
| AppHealthMonitor / ActivityCenter / Automation (`lib/automation.ts`) | ✅ | 🔶 `BotAutomations` | ❌ |
| Media Converter (yt-dlp/ffmpeg) | ❌ (port from eru) | ✅ `media-converter/` (backend) | 🔶 `src/vault/**` (UI, needs backend) |

## System shell / creative / devices / games

| PC app | PC | Eru | Jackie |
|---|---|---|---|
| HomeScreen / SystemSettings / NotificationCenter / Automation / VoiceCommands / ClipboardManager | ✅ | 🔶 (Base44 pages) | 🔶 (shadcn pages) |
| SuperSayen (Web MIDI/audio) / FlipperZero | ✅ | ❌ | 🪟 |
| Blender / UnrealEngine integrations | ✅ | ❌ | ❌ |
| Games (ZenithChess/SnakeGame/LaserTag/IronMenArcade) | ✅ | ❌ | 🔶 `game/` (own 4X/idle) |
| Slides / FlashUi / TermStudio / AiTerm / FolderView / AppConnector | ✅ | ❌ | 🔶 `Sandbox`/`Design` |
| Theme registry (`src/pc-themes/*`) | ✅ | ❌ (adopt shared `fleet-ui` kit) | ❌ (adopt shared `fleet-ui` kit) |
| UniversalAppSimulator / OkseSandbox / OpenClaw | ✅ | ❌ | ❌ |
| WorkspaceManager / SessionRecorder / Mail / Notepad | ✅ | ❌ | ❌ |

Coverage check: every PC app in `components/apps/` maps into exactly one row
across the tables above, except `NeutronStarBackground` (a background renderer,
not a windowed app) and `Cybernetic67` (tracked below). Re-verified after this
merge; re-run the check when adding apps rather than trusting memory — a stale
tracker is worse than no tracker.

## Best-of-fleet to fold into all three (from `FEATURE_AUDIT.md`)

| Feature | Source | PC | Eru | Jackie | Effort |
|---|---|---|---|---|---|
| Explainable risk scoring | `fobccc/src/lib/intel/scoring.ts` | ❌ | ❌ | ❌ | S |
| Lineage graph (SVG relationships) | `tikkerlive/src/components/LineageGraph.tsx` | ❌ | ❌ | ❌ | S |
| Router Console as a PC panel | `eru/router-console/` | ❌ | — | — | S/M |
| Squad console UI | engine `/api/squads/*` (client ready) | 🔶 | 🔶 | 🔶 | M |
| ECPS / Condenser suite UI | engine `/api/ecps/*` (client ready) | 🔶 | 🔶 | 🔶 | M/L |
| Reinforcement Journal (emotion↔outcome) | `fobccc/src/pages/Journal.tsx` | ❌ | ❌ | ❌ | S/M |
| Live on-chain Intel console (DexScreener) | `fobccc/src/pages/intel/*` | ❌ | ❌ | ❌ | M/L |
| Supabase auth + RLS blueprint (`has_role()`) | `tikkerlive/supabase/migrations/*.sql` | — | — | 🔶 (extend existing; also closes the `/api/control` gap) | M |

`jackyClient` already exposes typed methods for the squad and ECPS endpoints
(`squadAsk`, `squadDiscuss`, `ecpsCompress`, `ecpsDecompress`, `ecpsBenchmark`),
plus `models()`/`bots()` for the Ollama roster and named cloud backup bots — so
every row above is UI work, not integration work.

## Empath (`CYBERNETIC_EMPATH`)

Not a domain table like the others — it has no app yet, so most of the rows
above would just read `todo` by definition. Tracked here instead:

| Item | Status |
|---|---|
| Platform | ❌ undecided (self-hosted / Base44 / Lovable / something else) |
| `jackyClient` + `fleet-ui` | ✅ seeded, byte-identical to the other three |
| Server-side relay | ❌ (needs a platform decision first) |
| Relationship to `PC/cybernetic/` monorepo | ❌ unresolved — see `FLEET_PARITY_PLAN.md` and the repo's own `README.md` |

## How to use this tracker

- Flip a cell to ✅ only when the capability is **native** on that platform (not
  just reachable via the PC embed 🪟).
- Prefer wiring to the real backend (`jackyClient` / the platform proxies) over
  re-simulating — see the Wave 1+2 row.
- Pull unique assets from **eru** (`router-console/`, `media-converter/`,
  `components/security/`, `components/botstudio/`); take the Supabase schema from
  **neweru** (`MIGRATION/`).
- Re-run the coverage check (grep every `components/apps/*.tsx` against this
  file) after adding or removing a PC app — don't hand-wave it.

_Companion docs: `FLEET_PARITY_PLAN.md` (strategy), `FEATURE_AUDIT.md` (source catalog)._
