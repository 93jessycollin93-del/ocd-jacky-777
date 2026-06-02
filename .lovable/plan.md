# Jackie → Claude Code Handoff Bundle

Goal: hand Claude Code everything it needs to reconstruct Jackie on Replit, keeping the existing Supabase backend.

## Deliverables (written to `/mnt/documents/jackie-handoff/`)

1. **`JACKIE_BRIEF.md`** — single-file spec Claude reads first.
2. **`jackie-source.zip`** — full source archive (code + edge functions + memory + Jackie/ docs + schema).
3. **`SUPABASE_SCHEMA.sql`** — pg_dump-style schema export so Claude can recreate tables if needed.
4. **`CLAUDE_PROMPT.md`** — copy-paste kickoff prompt for Claude Code on Replit.

## What goes in `JACKIE_BRIEF.md`

- Identity & persona (from `Jackie/prompts/system_prompt.md`, `CORE_IDENTITY.md`, `BEHAVIOR_RULES.md`).
- Architecture overview (modules, room system, memory tiers).
- Stack: React 18 + Vite + Tailwind + shadcn, Supabase (Auth/DB/RLS/Storage), Lovable AI Gateway, Edge Functions.
- Memory model (`mem://` index + core rules, Jessy's discernment).
- Key features list with file pointers (chat, orchestrator, langcheck, vault, sphere, telegram shell, etc.).
- Supabase config: tables, RLS philosophy, storage buckets (`chat-attachments`), required secrets list.
- Replit-specific setup notes: env vars to set, `bun install`, `bun run dev`, Supabase URL/anon key reuse.
- Known external links (sister projects) and what to keep vs strip.

## What goes in `jackie-source.zip`

- `src/` (all components, pages, lib, game, sphere, vault, telegram, hooks, integrations).
- `supabase/` (config.toml + all `functions/`).
- `Jackie/` (full identity/architecture/security/memory docs).
- `mem://` snapshot exported as `memory/` folder (index + every referenced memory file).
- Root configs: `package.json`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig*.json`, `index.html`, `components.json`, `postcss.config.js`, `eslint.config.js`.
- `.env.example` (placeholders only — no real keys).
- `README_REPLIT.md` (install/run on Replit).

Excluded: `node_modules`, `.git`, build artifacts, real secrets, `src/integrations/supabase/types.ts` (auto-generated note instead).

## What goes in `SUPABASE_SCHEMA.sql`

- All `public.*` table DDL (CREATE TABLE + GRANTs + RLS policies + indexes).
- Functions/triggers (`update_updated_at_column`, `has_role` if present).
- Storage bucket definitions (`chat-attachments`).
- Pulled via `supabase--read_query` against `information_schema` + `pg_policies`.

## What goes in `CLAUDE_PROMPT.md`

A ready-to-paste prompt telling Claude Code:
- Read `JACKIE_BRIEF.md` first.
- Unzip `jackie-source.zip`.
- Install with `bun install` (or `npm install` on Replit).
- Wire `.env` to the existing Supabase project (URL + anon key from user).
- Note that `LOVABLE_API_KEY` is Lovable-only; on Replit replace with direct OpenAI/Google keys or an OpenRouter key, and rewrite the `ai.gateway.lovable.dev` calls accordingly.
- Preserve persona rules ("Jackie here—", discernment, memory tiers).

## Technical steps the build phase will execute

1. `mkdir -p /mnt/documents/jackie-handoff`.
2. Snapshot `mem://index.md` + every referenced `mem://...` file into `/tmp/jackie-export/memory/`.
3. Copy `src/`, `supabase/`, `Jackie/`, root configs into `/tmp/jackie-export/`.
4. Write `.env.example`, `README_REPLIT.md`.
5. Query Supabase for schema + RLS, write `SUPABASE_SCHEMA.sql`.
6. Generate `JACKIE_BRIEF.md` by stitching identity docs + architecture summary + file map.
7. Generate `CLAUDE_PROMPT.md`.
8. Zip `/tmp/jackie-export` → `/mnt/documents/jackie-handoff/jackie-source.zip` (nix run nixpkgs#zip).
9. Emit `<presentation-artifact>` tags for the zip, brief, schema, and prompt so you can download all four.

## Out of scope

- Eru (you'll export from base44 separately).
- Rewriting code for non-Lovable runtimes — Claude Code handles that on Replit using the brief's guidance.
- Migrating data rows (only schema is exported, not user data).
