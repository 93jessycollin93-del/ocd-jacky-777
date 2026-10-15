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

Copy them back from the scanned backup drive, or download them again. The catalog is
`src/data/model-queue.json`:

```
pip install "huggingface_hub>=0.23"
python scripts/download_models.py --plan --phase 1
python scripts/download_models.py --phase 1
```

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
