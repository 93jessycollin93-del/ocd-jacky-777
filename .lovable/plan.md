

# Evolving Jackie into a Game Design Co-Pilot

## What You Have Today

Jackie is a chat assistant with: persistent conversations, model selection, tags, attachments, streaming AI responses, and security scanning. Everything lives in a React frontend talking to a backend edge function that proxies to AI models.

## What You're Asking For

Turn Jackie into a **game design workbench** — not just a chatbot, but a system that:
1. **Remembers project context** across sessions (game lore, mechanics, decisions)
2. **Generates code** for game systems (economy, combat, tech trees)
3. **Provides structured design tools** (not just free-form chat)
4. **Connects to real infrastructure** (database, file storage)
5. **Keeps everything tied to an editable codebase**

## Plan

### Phase 1: Game Design Knowledge System (database + UI)

**New tables:**
- `game_projects` — top-level container (name, genre, description, vision statement)
- `game_design_entries` — structured entries with category enum: `lore`, `mechanic`, `unit`, `building`, `resource`, `tech_tree`, `faction`, `event`, `economy_rule`, `battle_system`, `alliance`, `monetization`, `quest`, `map`, `general`
- Each entry: title, content (markdown), status (draft/approved/implemented), tags, parent_id for hierarchy

**New UI: Game Design Hub page** (`/design`)
- Left panel: category tree browser
- Center: entry editor (markdown with preview)
- Right panel: Jackie chat contextually aware of the selected entry
- Jackie's system prompt gets injected with relevant design entries when chatting

### Phase 2: Contextual Chat Enhancement

**Upgrade the edge function:**
- Accept an optional `context` field containing relevant game design entries
- Jackie's system prompt dynamically includes: current project vision, relevant design entries, and recent decisions
- Add a "game designer" persona mode to the system prompt — Jackie becomes a senior game designer who understands strategy game patterns (Lords Mobile style: resource economies, troop types, alliance mechanics, events, P2W vs F2P balance)

**Conversation-to-design pipeline:**
- Button on any chat message: "Save to Design Hub" — extracts the idea and creates a game_design_entry
- Jackie can suggest which category an idea belongs to

### Phase 3: Code Generation Workspace

**New table:** `game_code_snippets` — generated code tied to design entries (language, framework, description, code content, version)

**UI addition:** Code tab within the Design Hub
- Jackie generates implementation code based on design entries (e.g., "Generate the resource production formula based on the economy rules")
- Code preview with syntax highlighting
- Export/download capability

### Phase 4: Design Analysis Tools

**Jackie gains analytical capabilities:**
- "Analyze my economy" — reviews all economy_rule entries for balance issues
- "Check faction symmetry" — compares faction entries for fairness
- "Gap analysis" — identifies missing design areas (e.g., "You have 5 unit types but no counter system defined")
- These use the AI with full project context injected

---

## Implementation Order

| Step | What | Scope |
|------|------|-------|
| 1 | Create `game_projects` and `game_design_entries` tables with RLS | Migration |
| 2 | Build Design Hub page with category browser and entry editor | New page + components |
| 3 | Upgrade Jackie's system prompt with game designer persona | Edge function update |
| 4 | Add context injection — send relevant entries to Jackie when chatting | Frontend + edge function |
| 5 | Add "Save to Design Hub" action on chat messages | UI component |
| 6 | Add code generation tab with `game_code_snippets` table | Migration + UI |
| 7 | Add analysis commands (economy check, gap analysis) | Edge function + UI |

## Technical Notes

- All new tables get RLS policies scoped to `auth.uid()` 
- Design entries use markdown content for flexibility
- The edge function's system prompt will be dynamically assembled from: base personality + game designer expertise + relevant project context
- Navigation adds a `/design` route alongside the existing chat at `/`
- The existing tag system can be reused for design entry categorization

