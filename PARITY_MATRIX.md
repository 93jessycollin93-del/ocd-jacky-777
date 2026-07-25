# Parity Matrix — living tracker

The checklist promised by `FLEET_PARITY_PLAN.md` §6. Maps PC's app roster to its
status in each sibling, so "are they the same yet?" has an answer you can read
instead of guess at.

Updated: Wave 1 (engine link + shared design system).

## Status vocabulary

| Status | Means |
|---|---|
| `native` | Implemented in that platform's own primitives, wired to its own backend |
| `via-embed` | Present but running inside Jackie's embedded PC OS iframe, not native TSX |
| `in-progress` | Started, not usable yet |
| `todo` | Not started |
| `n-a` | Doesn't apply on that platform |

## Baseline counts (measured, not estimated)

| | PC | Eru | Jackie |
|---|---|---|---|
| App/page components | 90 (`components/apps/*.tsx`) | 95 (`src/pages/*.jsx`) | 91 Eru pages copied into `src/eru/pages/` + native `src/pages/` |
| Backend data | Firebase + IndexedDB + Express | 143 Base44 entities | Supabase Postgres |
| Backend logic | `server.ts` routes | 68 Base44 functions, 4 agents | 15 Supabase edge functions |
| PC OS embed | — | no | yes (`public/pc-os/`, mounted by `src/pages/PCDesktop.tsx`) |

Jackie's embed is why its parity story differs from Eru's: PC's apps are already
*reachable* there. The work is native integration, not re-cloning.

---

## Wave 1 — shared foundation

| Item | PC | Eru | Jackie | Empath |
|---|---|---|---|---|
| `jackyClient` engine client | `native` `lib/jackyClient.ts` | `native` `src/lib/jackyClient.ts` | `native` `src/lib/jackyClient.ts` | `native` `src/lib/jackyClient.ts` |
| Server-side engine relay | `native` `/api/jacky` in `server.ts` | `native` `base44/functions/jackyProxy` | `native` `supabase/functions/jacky-proxy` | `todo` (platform undecided) |
| Platform bootstrap | `native` `lib/jackyBootstrap.ts` | `native` `src/lib/jackyBootstrap.js` | `native` `src/lib/jackyBootstrap.ts` | `todo` |
| eYe design system | `native` `src/fleet-ui/` | `native` + Tailwind preset | `native` + Tailwind preset | `native` |
| Theme adopted on screen | `todo` | `todo` | `todo` | `n-a` |

All four copies of `jackyClient.ts` and `eye-theme.css` are byte-identical —
verified by checksum, not by inspection.

**Not yet done, and deliberately so:** no panel consumes `jackyClient` yet, and no
app sets `data-eye-theme`. Both are visible changes that want eyes on the result;
the plumbing is in place and inert. That is the honest state of Wave 1 — the link
exists and is tested, but nothing has been re-pointed at it.

---

## Wave 2+ — PC domains → platform targets

Grouped as in the plan §3. One row per domain rather than per app, because the
port unit is a domain (its entities and functions move together).

| PC domain | Representative apps | Eru target | Jackie target |
|---|---|---|---|
| **AI / agents / models** | ModelRouter, OnDeviceModels, ClaudeAssistant, GrokTerminal, Codex, SmallAgentFleet, AgentBuilder, AgentTeamConsole, AgentOrchestrationDashboard, MultiAgentConsensusLab, CrossAiLab, LangChain, Ollama, LlmEnvironment, JackyV3, AgenticVision, AiDataResolver, BotStudio | `in-progress` — 68 fns + 4 agents exist; needs `Model`/`Agent`/`Route` entities and the router UI | `in-progress` — `jackie-orchestrate/chat/groq/ollama/openrouter` exist; needs `agents`/`models`/`routes` tables |
| **Security / vault / secrets** | SecretsVault, SecretsHygiene, SecurityCenter, SecurityEventLog, PermissionBroker, AuditTrail, SelfAuditScanner, DataRedaction, IntegrityMonitor, CyberSecurityRulebook, DependencyCVEChecker, APIKeys, BuildVault | `todo` — entities `Secret`/`AuditEvent`/`Permission` + hygiene-scan fns | `todo` — tables + RLS (roles table + `has_role()`, blueprint in tikkerlive) |
| **Data / knowledge / pods** | DataPods, DataVault, KnowledgeCompressor, TimeMachine, Archiver, MemoryFabric, PodSystem, StorageStats, Qpdb, ChatHistoryShare, CyberneticExport | `todo` — `Pod`/`Snapshot` entities; ECPS via the engine | `todo` — `pods`/`snapshots` + storage buckets; ECPS via the engine |
| **Infra / cost / ops** | MissionControl, FleetAtlas, BudgetGuardian, CostAnalytics, CloudInfrastructure, CloudDeploy, AppHealthMonitor, AnomalyAlert, GitHubSync | `todo` — `Budget`/`SpendEvent`; MissionControl reads `/api/status` | `todo` — tables + realtime; MissionControl reads `/api/status` |
| **System shell** | HomeScreen, SystemSettings, NotificationCenter, ActivityCenter, Automation, VoiceCommands, ClipboardManager, WorkspaceManager, SessionRecorder, FolderView, AppConnector, TermStudio, AiTerm | `todo` — pages + `Notification`/`Automation` entities | `todo` — `notifications`/`automations` + edge fns |
| **Creative / devices / games** | SuperSayen, FlipperZero, Blender, UnrealEngine, ZenithChess, IronMenArcade, LaserTag, SnakeGame, Slides, FlashUi, UniversalAppSimulator, OkseSandbox | `todo` — client-heavy, little backend | `via-embed` today; native ports low priority |
| **Research / tools** | PapersWithCode, SemanticScholar, ResearchRabbit, CodeRabbit, PromptLibrary, PromptToJson, ToolRegistry, FunctionCallKitchen, Notepad, Mail, OpenClaw, Eru | `todo` | `via-embed` today |

Coverage check: all 90 files in `components/apps/` appear above, except
`NeutronStarBackground` (a background renderer, not a windowed app) and
`Cybernetic67`, which is tracked in the best-of-fleet table below. Re-run the
check when adding apps — a stale tracker is worse than no tracker.

---

## Best-of-fleet items still to fold in

From `FEATURE_AUDIT.md`, ranked there and unstarted here:

| Item | Source | Target | Effort |
|---|---|---|---|
| Explainable risk scoring | `fobccc/src/lib/intel/scoring.ts` | PC AnomalyAlert / SelfAuditScanner / BudgetGuardian | S |
| Lineage graph | `tikkerlive/src/components/LineageGraph.tsx` | PC FleetAtlas / AgentTeamConsole | S |
| Router Console as a PC panel | `eru/router-console/` | PC | S/M |
| Media Converter | `eru/media-converter/` + Jackie's Vault UI | Jackie | M |
| Squad console | engine `/api/squads/*` (client method ready) | all three | M |
| ECPS / Condenser suite | engine `/api/ecps/*` (client methods ready) | all three | M/L |
| Reinforcement Journal | `fobccc/src/pages/Journal.tsx` | PC Cybernetic67 | S/M |
| Live on-chain Intel console | `fobccc/src/pages/intel/*` | PC | M/L |
| Supabase auth + RLS blueprint | `tikkerlive/supabase/migrations/*` | Jackie | M |

`jackyClient` already exposes typed methods for the squad and ECPS endpoints
(`squadAsk`, `squadDiscuss`, `ecpsCompress`, `ecpsDecompress`, `ecpsBenchmark`),
so those two rows are UI work, not integration work.

---

## How to update this file

One row per shippable unit; change the status word when a unit lands. Keep the
measured counts measured — re-run the counts rather than adjusting them from
memory, since drift in this table is worse than no table.
