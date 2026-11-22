# Getting Jackie back after a clean Windows install

Steps for rebuilding after the PC was wiped (trojan, October 2026). Do them in order.

## 1. Before you start

**Change passwords and keys first, from a clean device (your phone is fine).** A trojan
usually steals saved passwords and login sessions, and wiping the PC does not undo that.

- Change passwords: email first, then GitHub, Supabase, Google, any bank/crypto accounts.
  On each, use "sign out of all sessions" and turn on two-factor sign-in.
- Replace every key that was on the old PC: GitHub tokens, the Supabase service key,
  the Hugging Face token, Telegram bot tokens, any Cloudflare tunnel token, and
  `JACKY_API_TOKEN` (Supabase → Edge Functions → Secrets). Create new ones, delete the old.
- On GitHub, check Settings → SSH keys, Applications and Sessions. Remove anything you
  don't recognize.

**Install tools only from their official sites:**

- Git: https://git-scm.com
- Python 3: https://www.python.org (tick **"Add python.exe to PATH"** during setup)
- Node.js LTS: https://nodejs.org (only needed for the web app)

## 2. Clone a fresh copy from GitHub

Don't copy the repo off a backup drive. Clone it, signing in with your new GitHub password:

```
git clone https://github.com/93jessycollin93-del/ocd-jacky-777.git
cd ocd-jacky-777
```

## 3. Start Jackie's offline core

She runs on Python's standard library alone, so there is nothing to install and she needs no network,
model or API key. On Windows the command is `python` (or `py`), not `python3`.

```
cd Jackie
python -m unittest discover -s tests
python jackie_assistant.py
```

The tests should end with `Ran 91 tests ... OK`. Inside Jackie, `/help` lists her commands.

## 4. Bring back her memory (optional)

Her memory database (`Jackie/memory/*.db`) is never committed to Git, on purpose. It lives only
on your backup drives. It's a data file, not a program, so it's low risk: scan the backup
drive first, then copy the `.db` file into `Jackie\memory\`.

## 5. The web app (optional)

From the repo root:

```
npm install
npm run dev
```

Then open http://localhost:8080.

- Use `npm install`, **not** `npm ci`. `package-lock.json` is out of sync with
  `package.json`, so `npm ci` fails.
- If it fails with "permission denied" or `EACCES` on the port, that's Windows reserving
  ports (Hyper-V / WSL / Docker), not malware. Use another port:
  `npm run dev -- --port 14400`

## 6. On-device models

Download them again rather than copying them off the backup drive. The catalog is
`src/data/model-queue.json`; the downloader only talks to huggingface.co:

```
pip install "huggingface_hub>=0.23"
python scripts/download_models.py --check --collection powerhouses    # what it will fetch, and how big
python scripts/download_models.py --collection powerhouses --steady --max-rate 300K --smallest-first
```

`--collection powerhouses` is the curated set of 42 "tiny powerhouses": the strongest small
model for each job. `--collection drones` is the 14 "SANDI drones": micro specialists for one
job each (compress memory, route, extract, read tone, block prompt injections, safety and
moral checks). Use `--phase 1,2,3` for the 49 phased models, or no filter for all 201.

On weak Wi-Fi use `--steady`: one file at a time, and when the connection drops it waits
and resumes from the last byte instead of starting over. `--max-rate 300K` caps it at about
300 KB/s so the rest of the house still has internet. `--smallest-first` gets the small,
useful models done before the big ones. Stop it any time with Ctrl+C; running the same
command again picks up where it left off.

It is safe by default:

- It skips files that can run code when loaded: PyTorch pickle checkpoints (`.bin`, `.pt`,
  `.pth`, `.ckpt`) and a repo's own `.py` files. Models that only ship those show as
  `skipped`. Add `--allow-pickle` or `--allow-code` only for a repo you have decided to trust.
- Each model is pinned to one commit, and every file is checked against the fingerprint
  Hugging Face publishes. A file that doesn't match fails with "fingerprint check failed";
  don't use it.
- Each model's `manifest.json` records those fingerprints. To re-check the files on disk
  later, offline: `python scripts/download_models.py --verify`.

If you do copy models from the backup drive, run the download command afterwards: it
re-checks every file against Hugging Face and replaces what doesn't match.

Gated models need a Hugging Face login with your **new** token (`hf auth login`).
Models go to `%JACKIE_MODELS_DIR%`, or `~/jackie-models` by default.

## 7. Restoring other files from the backup drives

Treat the backups as possibly infected until scanned.

- Plug each drive in and scan it with Microsoft Defender and Malwarebytes **before opening
  anything on it**.
- Restore **data, not programs**: documents, photos, projects, models and notes are fine.
  Don't run old `.exe`, `.msi`, `.bat`, `.cmd`, `.ps1`, `.vbs` or `.js` files from backups.
  Download programs again from their official sites.
- Restore files dated around the infection **last**, after everything else is scanned.

## 7. Clean up duplicates and stray models (optional)

Finds files of 1 GB or more that exist twice, and AI model files sitting outside any app's
model folder (for example in Downloads). It never deletes: it moves extras into a
`jackie-quarantine` folder on the same drive and can put them all back.

```
python scripts/model_cleanup.py                                   # report only, changes nothing
python scripts/model_cleanup.py --roots C:\ D:\ --keep "%USERPROFILE%\Desktop\SAS-Jacky-HUB"
python scripts/model_cleanup.py --quarantine --loose              # move extras and stray models
python scripts/model_cleanup.py --restore                         # undo
```

It never moves anything inside an app's own folder (Ollama, LM Studio, Hugging Face cache,
`jackie-models`, GPT4All, ComfyUI, SAS-Jacky-HUB, Program Files, AppData, ...) or a folder you
name with `--keep`. Of two identical copies it keeps the one an app uses. Use your apps for a
day, then delete the `jackie-quarantine` folder yourself.
