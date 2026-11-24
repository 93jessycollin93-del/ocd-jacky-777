# Bring the latest Jackie web app work into a local Jacky

**For:** the Claude Code agent running on the owner's PC, inside their local Jacky folder (e.g. `SAS-Jacky-HUB`).
**Goal:** get the work below running locally, with nothing lost from the local copy.
**Source of truth:** GitHub repo `93jessycollin93-del/ocd-jacky-777`, branch **`SAS-JACKY`** (the owner's working branch; `main` has everything except item 4 until PR #26 is merged).

Read this whole file before changing anything. Commit before and after each step, so every change can be undone.

---

## What to bring in

1. **Arcade: 37 original browser games** at `/arcade` and `/arcade/<id>`.
   - Self-contained in `src/arcade/` (a game kit plus one folder per game).
   - Pages: `src/pages/Arcade.tsx`, `src/pages/ArcadeGame.tsx`.
   - Tests: `src/test/arcade/`.
   - Needs only `react` and `react-router-dom`. No new packages.
   - The latest six are Mini Golf, 8-Ball Pool (its AI runs in a Web Worker), Rope Snip, Night Survivors, Balloon Pop TD and Tower Clash.
2. **Pocket AI** at `/pocket`: a private chat model that runs on the device, offline (Bonsai 1.7B, about 248 MB, downloaded once).
   - Files: `src/pages/PocketAI.tsx` and `src/lib/pocket/` (`catalog.ts`, `engine.ts`, `settings.ts`, `text.ts`).
   - Tests: `src/test/pocket-ai.test.ts`.
   - Needs the package `@wllama/wllama` (^3.8.1).
   - Also uses shadcn `badge`, `button`, `input`, `progress`, `slider`, `switch`, `tabs`, `textarea`, plus `react-markdown`, `sonner`, `lucide-react` and `@/pwa/register`.
3. **Safe full-offline cache:** service-worker precache and runtime caching in `vite.config.ts` (VitePWA), plus `src/lib/offline-session.ts`.
   - Tests: `src/test/offline-gate.test.ts`.
   - Notes: `Jackie/knowledge/notes/2026-11-05_offline_by_default.md`.
   - Landed in commit `b001fab`.
4. **Primal Isle is renamed Colin Craft** at `/survival`, in `src/survival/` and `src/pages/Survival.tsx`.
   - Display text and comments only.
   - The storage keys `primal-isle-save-v1` and `primal-isle-muted` are **deliberately unchanged**, so existing saves keep working. Do not rename them.
5. **Sidebar entries** in `src/components/SidebarNav.tsx`:
   - 📱 Pocket AI (`/pocket`)
   - 🕹️ Arcade (`/arcade`)
   - 🦖 Colin Craft (`/survival`)

   **Routes** in `src/App.tsx`: `/survival`, `/arcade`, `/arcade/:id` and `/pocket`, each lazy-loaded and wrapped in `<ProtectedRoute>`.

---

## Step 0: Find out what the local folder is

Run `git remote -v` and `git status` in the local Jacky folder, then follow the matching path:

| What you find | Path |
|---|---|
| A clone of `ocd-jacky-777` (the remote URL contains `ocd-jacky-777`) | **Path A: pull** |
| A different git repo, or no git at all | **Path B: port** |

In either case, if `git status` shows uncommitted local work, commit it first on its own branch (e.g. `git switch -c local-backup && git add -A && git commit -m "Local work before sync"`). Never discard it.

---

## Path A: the local folder is a clone of this repo

```sh
git fetch origin
git switch SAS-JACKY            # or: git switch -c SAS-JACKY --track origin/SAS-JACKY
git pull origin SAS-JACKY
bun install                     # Lovable keeps bun.lock in sync; npm users: npm install --no-package-lock
```

- If the local branch has its own commits, `git pull` merges them in.
  - If there are conflicts, keep both sides wherever possible.
  - Never resolve a conflict by dropping the local work.
  - Regenerate lockfiles with the package manager, never by hand.
- Do **not** run `npm ci`: `package-lock.json` is stale (it lacks `@wllama`), so it fails. `bun.lock` is the real lockfile.
- Then go to **Verify**.

---

## Path B: the local folder is a different project

The goal is to **add these features** to the local app without replacing it. Get the source files by fetching the branch into a separate folder, never by overwriting the local repo:

```sh
git clone --branch SAS-JACKY --depth 1 https://github.com/93jessycollin93-del/ocd-jacky-777.git ../ocd-jacky-src
```

The repo may be private. If the clone asks for credentials, ask the owner to sign in (`gh auth login`) or to download the branch as a ZIP from GitHub. Do not paste tokens into files.

Then port, in this order, checking each one before starting the next:

1. **Arcade (easiest; start here).**
   - Copy `src/arcade/`, `src/pages/Arcade.tsx`, `src/pages/ArcadeGame.tsx` and `src/test/arcade/`.
   - Add the two routes and the sidebar entry.
   - If the local project has no `@` alias pointing to `src`, either add one (vite, vitest and tsconfig) or rewrite the `@/` imports.
   - If the local project has no auth, use the routes without `<ProtectedRoute>`.
2. **Colin Craft.**
   - If the local app already has the survival game, just rename the visible text (search for `Primal Isle`) and keep the storage keys.
   - If it doesn't, copy `src/survival/` and `src/pages/Survival.tsx`. This needs `three`, `@react-three/fiber` and `@react-three/drei`; take their versions from the source `package.json`.
3. **Pocket AI.**
   - Copy `src/pages/PocketAI.tsx` and `src/lib/pocket/`, then add `@wllama/wllama` with the local package manager.
   - Add any missing shadcn components with the shadcn CLI.
   - If `@/pwa/register` doesn't exist locally, copy `src/pwa/` too.
   - It uses `@supabase/supabase-js` only for the signed-in session. If the local app has no Supabase, remove that dependency inside `PocketAI.tsx` rather than adding Supabase.
4. **Offline cache (last, most invasive).**
   - Merge the VitePWA settings from the source `vite.config.ts` into the local config **by hand**. Do not replace the file.
   - Keep any local settings. Keep `navigateFallbackDenylist` covering `/~oauth`, `/api` and `/functions`.
   - Copy `src/lib/offline-session.ts` and its test.

Port only what the owner wants. If one of the four isn't wanted, or clashes with something local, skip it and say so in your report.

---

## Verify (both paths)

Run these from the project root; all must pass before you report success:

```sh
npx tsc --noEmit -p tsconfig.app.json   # or the local tsconfig
npm run lint
npx vitest run src/test/arcade src/test/pocket-ai.test.ts src/test/offline-gate.test.ts src/test/survival-engine.test.ts
npm run build
```

- Known, unrelated failure: if the full suite includes `src/test/jackie-resonance-doctrine.test.ts`, its 23 failures already exist on `main` (it checks doc text that isn't there). Report it; don't "fix" it by editing tests.
- Then run `npm run dev` (port 8080) and open each page:
  - `/arcade`: lists 37 games. Open a few, including `/arcade/tower-clash` and `/arcade/balloon-defense`.
  - `/survival`: the title reads "Colin Craft".
  - `/pocket`: the page loads. Downloading the model is optional; it's about 248 MB.

---

## Rules

- **Never** delete or overwrite the owner's local work, force-push, or rewrite history.
- **Never** put private keys or service-role secrets into `.env` or client code. `.env` holds only public `VITE_SUPABASE_*` values.
- Don't hand-edit `src/integrations/supabase/types.ts` or `client.ts` (they're generated) or anything under `public/pc-os/` (prebuilt bundle).
- Don't rename the `primal-isle-*` storage keys.
- Don't use subagents; the owner wants this done directly and cheaply.
- If something is ambiguous (which folder, which branch, a conflict that would lose behaviour), stop and ask the owner.

## Report back to the owner

When you're done, tell the owner in plain words:
- which path you took;
- what was added, what was skipped, and why;
- the result of each verify command;
- anything they need to do (for example, download the Pocket AI model, or sign in to GitHub).
