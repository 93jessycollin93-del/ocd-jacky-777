# Investigation Report — "trojan.kill.av.exe" PC / Virus Incident

**Prepared:** 2026-10-06
**Analyst:** Claude Code (automated source & metadata forensics)
**Scope:** All repositories reachable for the account `93jessycollin93-del` that relate to the PC / "Jacky" fleet.
**Branch:** `claude/trojan-kill-av-investigation-h2yl1i`
**Classification:** Internal / owner's own assets.

---

## 1. Bottom line up front (BLUF)

**There is no file named `trojan.kill.av.exe`, and no trojan, virus, or Windows
malware of any kind, in any of these repositories — not in any working tree, not
on any branch, and not anywhere in the full commit history.**

The phrase `trojan-kill-av` is only the name of this investigation branch. Every
occurrence of the word "trojan" or "kill AV" in the code is **defensive or
educational content** (a SOC threat-intelligence catalog, a cyber-ethics
rulebook, and a cosmetic fake window title). Details in §4.

What the investigation *did* surface is a real, substantive issue — but it is an
**architecture and configuration exposure, not a virus**: the "Jacky / SAS"
project is *designed* to put a remote PowerShell + filesystem control surface on
the user's Windows PC, reachable over an API and an optional public Cloudflare
tunnel, and that control surface is **unauthenticated by default** (auth only
turns on when an environment token is set). If the PC was ever launched in
"public" mode without that token, a remote shell was briefly exposed to the
internet. That — not a trojan — is the thing worth checking on the actual
machine (§6, §8).

**Verdict: No malware present. One high-severity design/deployment risk and
several hygiene issues identified and documented below.**

---

## 2. What was examined

| # | Repository | Visibility | Tracked files | Commits | Branches reviewed |
|---|------------|-----------|--------------:|--------:|------------------:|
| 1 | `ocd-jacky-777` | public | 1,033 | 275 | 4 |
| 2 | `93jessycollin93-del-PC` | public | 93 | 4 | 3 |
| 3 | `AI-Data-Analist` | public | 18 | 19 | 6 |
| 4 | `bot-squad-dynamics` | public | 85 | 39 | 1 |
| 5 | `apex-intelligence-hub` | public | 81 | 4 | 1 |
| 6 | `pc` | public | 384 | 190 | 2 |
| 7 | `jacky` | public | 177 | 53 | 19 |
| 8 | `my-pc-companion` | private | 80 | 3 | 2 |
| | **Total** | | **~1,951** | **~587** | |

Coverage: working trees, every remote branch (not just the default), and the
full object history — **≈5,283 unique history blobs** scanned for secrets,
executables, and malware strings. Repos 6–8 were added during the investigation
because the five original repos reference them as the engine / PC side of the
system.

**Methods:** filetype census (executables/scripts/archives); malware-string
pickaxe across all refs and all history; secret-pattern scan of working trees
*and* every historical blob; dependency lockfile matching against known
2025 npm supply-chain compromises; author/timestamp/timezone/signature
metadata analysis; and manual review of every shell-execution, file-write, and
network-relay code path.

---

## 3. The malware question, answered directly

| Check | Result |
|-------|--------|
| File named `trojan.kill.av.exe` (any case) | **Not found** — anywhere, ever |
| Any `.exe .dll .scr .msi .vbs .hta .lnk .jar .zip .iso` in any tree or history | **None** |
| Windows malware droppers / loaders (`.bat/.cmd/.ps1` that download+run) | **None** — launch scripts only start Ollama / the local server / a tunnel |
| Obfuscated/packed payloads (base64-exec, `FromBase64String`, `IEX` of remote content, `certutil`/`bitsadmin` fetch) | **None** |
| Code that disables or "kills" antivirus (Defender/Avast tamper, `Set-MpPreference`, exclusions) | **None — the opposite is true (see §4.3)** |
| Known-malicious npm package versions in any lockfile | **0 hits** (§7) |

The only binary artifacts in any repo are two `favicon.ico` files and Bun
lockfile binaries — all benign.

---

## 4. Why the words "trojan" and "AV" appear (all benign)

### 4.1 SOC threat-intelligence catalog — `ocd-jacky-777/src/pages/VeilOps.tsx`
`VeilOps` is a security-operations dashboard. It embeds a **MITRE ATT&CK**
reference dataset (malware *descriptions* such as TrickBot, Dridex, BLINDINGCAN)
and sample "campaign" cards. These are read-only catalog strings used to render
a defensive dashboard — standard threat-intel reference data, not executable
code. (e.g. the Dridex campaign card at ~line 1670 describes a real-world
banking-trojan campaign for analyst context.)

### 4.2 Cyber-ethics rulebook — `93jessycollin93-del-PC/components/apps/CyberSecurityRulebookApp.tsx`
An A–Z educational rulebook. The "**T — Trojan Payload Distribution**" entry
*describes* a malicious technique and then pairs it with its legal consequence
(18 U.S.C. § 1030) and an **ethical alternative**. It is awareness content, not
a tool.

### 4.3 "AV" = Avast, and the code coexists with it — it does not kill it
Every "AV"/antivirus reference is about making the project's outbound HTTPS work
*through* the PC's Avast install, **with TLS verification left ON**:
- `jacky/SECRETS.md` and `jacky/cloud_client.py`: use the `truststore` library to
  trust the Windows cert store (where Avast's interception root lives) — the
  comment states explicitly "no `CERT_NONE` … Avast keeps protecting the machine."
- `jacky/CODING_AGENT_TIER.md`: documents a TLS startup crash *caused by* Avast's
  HTTPS interception, and a fix that still uses the OS cert store.

So "kill AV" is not something this code does or attempts. If anything the code is
written to keep antivirus fully in place.

### 4.4 Cosmetic string
`UniversalAppSimulator.tsx` renders a retro fake window titled "Gemini Prompt.exe"
— a UI label, no executable.

---

## 5. What the project actually is

An AI-assistant / "PC operator" fleet called **Jacky / SAS** (Situation-Aware
System), built largely with **Lovable** and several AI coding agents. The pieces:

- **`jacky`** — a Python **Flask engine that runs on the owner's Windows PC**
  ("GODZILLA", workspace on drive `E:`). Serves a dashboard + REST API, talks to
  a local Ollama model server, and (by design) can run whitelisted PowerShell.
- **`pc` / `93jessycollin93-del-PC`** — a browser "virtual computer" desktop
  (React) with a Node/Express backend (`server.ts`) that can run whitelisted
  shell commands and read/write a sandboxed filesystem on its host container.
- **`ocd-jacky-777`** — the public Lovable web app (Jackie UI) + Supabase edge
  functions that **relay** to the PC engine over a tunnel.
- The rest (`AI-Data-Analist`, `bot-squad-dynamics`, `apex-intelligence-hub`,
  `my-pc-companion`) are front-ends/condensers that point at the same engine URLs.

This is a legitimate self-hosted "run an agent on my own PC" system. The security
weight sits in how that remote-control surface is exposed.

---

## 6. Findings (ranked)

### F1 — HIGH — Remote PowerShell/shell surface is unauthenticated by default
- **`jacky/jacky_api.py`** exposes `POST /api/shell` which runs
  `powershell -NonInteractive -Command <cmd>` via `subprocess.run`
  (whitelist/denylist filtered). Auth is **opt-in**: `REQUIRE_AUTH` is true only
  when `SAS_ACCESS_TOKEN` is set (lines 93–94). The shell route itself contains an
  explicit *"Open SAS — allow"* path (≈line 1517) so that **with no token set the
  endpoint executes commands with no authentication**.
- **`jacky/serve.py`** (the production entry point) defaults `SAS_HOST=0.0.0.0`
  — i.e. binds to all interfaces. `jacky_api.py` has a fail-fast guard for
  "public interface + no token", but `serve.py` is the path actually used for
  internet exposure.
- **`pc/server.ts`** exposes `POST /api/shell/exec`, `/api/term-fs/{read,write,rm}`
  and `/api/build/run`. Its `requireAuth()` **returns `true` (allows) when
  `JACKIE_API_TOKEN` is unset** ("Allow if not configured (dev mode)", line 82),
  and it binds `0.0.0.0` (line 896).
- **Mitigating factors** (real, and worth noting): both servers use an allowlist;
  `pc` uses `execFile` with an argument array (not a shell string), blocks shell
  metacharacters and `..`, enforces a workspace root with symlink-escape checks,
  has a lockdown flag and a rate limiter. An approval-gate / reversible-transaction
  framework (`jacky/approval.py`, `shell_tx.py`, `transactions.py`, "TTT doctrine")
  exists — **but it is not wired into the live `/api/shell` route** (that route has
  zero references to the approval gate).

### F2 — HIGH — A one-command launcher puts the PC on the public internet
- **`jacky/Start_SAS_Public.ps1`** starts Ollama, starts the server, and opens a
  **Cloudflare quick tunnel** (`cloudflared.exe tunnel --url http://localhost:5000`),
  printing a public `*.trycloudflare.com` URL for the dashboard **and** the API.
  If `SAS_ACCESS_TOKEN` is unset it only prints a red WARNING — it does **not**
  refuse to start. Combined with F1, running this script without the token set
  exposes an unauthenticated remote-shell API to anyone with the URL.
- The intended permanent host (`sas.cybernetic67.com`) does not currently resolve,
  and the quick-tunnel URL changes each run, so there is **no evidence of a
  currently-live exposure** — but the capability and the one-click path exist.

### F3 — MEDIUM — Committed Supabase config (anon key) in a non-ignored `.env`
- `ocd-jacky-777/.env` contains `SUPABASE_URL` and the **anon/publishable** JWT
  (`role: anon`, project ref `rkwhhbxgjdpehfuxsult`, exp 2089). It has been tracked
  since 2026-04-12 and appears in ~548 historical blobs.
- Severity is **limited by design** — the anon key is meant to be shippable to
  browsers and is only safe if Supabase **Row-Level Security** is enforced. The
  real defect is hygiene: **`.env` is not in `.gitignore`** in any of the five
  original repos, so a *service-role* key committed later would leak silently.
- **Action:** confirm RLS is on for every table; move secrets to the Supabase
  dashboard; add `.env` to `.gitignore`; rotate the project key if desired.

### F4 — MEDIUM — PC internals disclosed in public repos
Public repos document the PC's drive map (`E:/G:/V:/H:`), hardware (RTX 3090,
128 GB RAM, "GODZILLA"), a Windows user path (`C:\Users\93jes\…`), the intended
domain, and the full tunnel setup (`TUNNEL_SETUP.md`, `WORKSTATION_SETUP.md`,
`docs/superagent_workspace_setup.md`). None of this is a credential, but together
it is useful reconnaissance for anyone targeting the machine. Consider moving the
operational/runbook docs to a private repo.

### F5 — LOW — "Secrets" found that are **not** real credentials (confirmed safe)
These matched secret-detection patterns but are **intentional placeholders / test
fixtures**, not live keys — listed so they are not mistaken for leaks:
- `CodeRabbitApp.tsx`: `AKIAIOSFODNN7EXAMPLE` (the literal AWS *documentation*
  example key) and a sample `sk-proj-…` — demo content for a secret-scanner demo,
  labelled "Low risk placeholder, but flagged".
- `Jackie/tests/test_security.py`, `test_assistant.py`: `sk-live-51H9…` and a dummy
  `BEGIN RSA PRIVATE KEY` — fixtures that test the scanner.
- `jacky/.env.template`: `sk-ant-PASTE_YOUR…` placeholder.
- `jacky/telegram_bots_config.json`: references token **env-var names** and
  `PASTE_YOUR_CHAT_ID_HERE` — no real bot tokens.
- Firebase web config (`firebase-applet-config.json`): a Firebase **web API key**,
  which is public by design (not a secret); it only identifies the project.
- **No real AWS secret, OpenAI/Anthropic key, GitHub token, Telegram bot token, or
  private key was found in any working tree or in full history across all 8 repos.**

### F6 — LOW — Model downloader can fall back to pickled checkpoints
`ocd-jacky-777/scripts/download_models.py` prefers `safetensors` but will fall
back to pickled PyTorch weights (`*.bin/*.pt/*.ckpt`). Loading pickled weights
from an untrusted model repo is a known arbitrary-code-execution vector. The
script already warns about `trust_remote_code`; recommend preferring
`safetensors` only, or `torch.load(..., weights_only=True)`.

### F7 — INFORMATIONAL — Comment-triggered CI workflow with write permission
`jacky/.github/workflows/agent-tasks.yml` runs on `@OmniAgent` issue comments
with `contents: write`. It passes the comment body through an environment variable
into `GITHUB_OUTPUT` (a safe pattern that avoids inline interpolation) and runs on
GitHub-hosted `ubuntu-latest` (no self-hosted runner). Low risk as written; noted
because comment-triggered write workflows warrant periodic review.

### F8 — INFORMATIONAL — Supabase relay is the *correct* pattern (a positive finding)
`ocd-jacky-777/supabase/functions/jacky-proxy/index.ts` relays the browser to the
PC engine but is well-built: a strict **path allowlist**, mandatory Supabase auth,
an admin-role gate on the engine's master switch, and it **deliberately excludes
`/api/shell` from the allowlist** (the code comments call it out as the dangerous
path). `PARITY_MATRIX.md` also openly documents the "auth passes through when the
token is unset" behaviour as a known deployment-config risk. The team is aware of
the issue; the gap is that the *default* is open rather than closed.

---

## 7. Supply-chain / dependency check — clean

- All `package-lock.json` / `bun.lock` files resolve from `registry.npmjs.org`
  (plus Lovable's own GCP npm-cache mirror, expected for Lovable projects).
- **0 matches** against known-compromised 2025 npm releases: the September 2025
  `chalk`/`debug` crypto-clipper set, the "Shai-Hulud" worm packages, the
  `eslint-config-prettier` "Scavenger" set, and the Nx "s1ngularity" versions.
- **No `preinstall`/`install`/`postinstall` lifecycle scripts** in any `package.json`.
- The one third-party tool referenced (`free-claude-code`, pinned to commit
  `478e9665`) was verified against its upstream project: that commit is genuine,
  authored by the maintainer on 2026-06-28, on the real project's main branch. A
  red-flag scan of that snapshot (install script, process handling, outbound hosts)
  found nothing malicious.

---

## 8. Metadata & timeline

- **Human author:** `93jessycollin93-del <93jessycollin93@gmail.com>`; the PC's
  local git identity is `Jacky AI <jacky@cybernetic67.local>`.
- **Automated authors (all legitimate tooling):** `gpt-engineer-app[bot]`
  (Lovable), `Claude`, `copilot-swe-agent[bot]`, `coderabbitai[bot]`,
  `Replit Agent`, `Lovable`, `Vercel`.
- **Date range:** one epoch-placeholder commit dated 2025-01-01; real activity
  2026-04 → 2026-10-05.
- **Timezones:** `-0400`/`-0700` for human commits, `+0000` for bots/CI — a single
  US-based developer plus hosted agents. Commit hours cluster in the evening and
  late night. No anomalous author, no implausible timestamp, no unexpected
  committer identity.
- **When the exposure features landed:** the internet-facing capabilities were
  introduced over **2026-06-28 → 2026-06-29** — "SAS v2 — internet-accessible PWA
  with auth + Cloudflare tunnel," followed by the `/api/shell` endpoint. These are
  the commits to anchor any machine-side timeline to.

---

## 9. Recommendations

**On the PC itself (do this first — this is where real evidence would live):**
1. Review Windows **Event Viewer**, **Avast** detection history, and **Microsoft
   Defender** history for the period from 2026-06-28 onward.
2. Check `jacky`'s runtime artifacts on disk — `sas_serve.log`, `tunnel.log`,
   `CURRENT_PUBLIC_URL.txt` — to see whether a public tunnel was ever actually
   opened, and when.
3. Run `netstat` for current listeners on `:5000`/`:11434`; review Task Scheduler
   (the project's own `JackyAutoSave` task is expected and benign — it just commits
   and pushes snapshots).
4. Confirm whether `SAS_ACCESS_TOKEN` / `JACKIE_API_TOKEN` were ever set when the
   public launcher was run.

**In the code (close the open-by-default gap — addresses F1/F2):**
5. Make auth **fail-closed**: refuse to start the shell/filesystem endpoints, and
   refuse to bind to anything but `127.0.0.1`, unless a token is explicitly set.
6. Wire the existing approval-gate / transaction framework into the live
   `/api/shell` route so commands are gated, not just whitelisted.
7. Default `SAS_HOST` to `127.0.0.1` in `serve.py`.

**Hygiene (F3–F6):**
8. Add `.env` to `.gitignore`; move all real secrets to platform secret stores;
   confirm Supabase RLS; rotate the Supabase key if warranted.
9. Move operational runbooks (drive maps, hardware, tunnel setup) to a private repo.
10. Prefer `safetensors` in the model downloader; avoid pickled-weight fallback.

---

## 10. Conclusion

The "trojan.kill.av.exe" does not exist in any of these repositories or their
history, and no malware, antivirus-killer, or hostile payload was found. The word
"trojan" is defensive/educational catalog content, and "AV"/Avast references show
the code is written to **keep** antivirus running, not disable it.

The genuine risk is architectural: this is a system **designed** to expose the
owner's PC to remote shell and filesystem control, with authentication that is
**off by default** and a one-click public-tunnel launcher. There is no evidence of
a currently-live exposure, but if the public launcher was ever run without a token
set, a remote-control surface was on the internet during that window. The forensic
answer therefore moves from "find the virus" to "check the PC's logs and the
server/tunnel runtime artifacts for the 2026-06-28-onward window, and close the
open-by-default auth gap." Specific, evidence-backed steps are in §9.

*Every claim above is grounded in files and git history in the listed
repositories; no finding is inferred beyond the evidence.*
