# Offline by default (ONLINE_FEATURES)

Date: 2026-11-05

## Decision

Jackie runs offline unless the owner says otherwise. Every Supabase edge function
that reaches an outside service refuses to run until its group is turned on in the
`ONLINE_FEATURES` secret (Supabase dashboard → Edge Functions → Secrets).

- Empty or unset: fully offline.
- Comma-separated group names turn groups on, e.g. `cloud_ai,pc_bridge`.
- `all` turns everything on.

A blocked call returns `403 { ok: false, error: "offline_mode", group }` with CORS
headers, before any auth, database or outside request.

| Group | Functions |
|---|---|
| `cloud_ai` | `jackie-chat`, `jackie-orchestrate`, `jackie-image`, `jackie-langcheck`, `bot-generate`, `gunit-chat`, `gunit-bot-gen`, `gunit-agent-cycle` (Lovable AI gateway), `jackie-groq` (Groq), `jackie-openrouter` (OpenRouter) |
| `pc_bridge` | `jackie-ollama`, `jacky-proxy` (tunnels to the engine on the owner's PC) |
| `telegram` | `telegram-validate` (Telegram Mini App sign-in check) |

Not gated, because they only touch this project's own database: `api-keys`,
`game-transaction`.

The same switch exists in the Eru app (Base44), with extra groups for email,
WhatsApp, linked accounts, payments and market data.

## Why

After the compromise, the goal is that nothing can send the owner's data out or let
someone in through an outside service unless the owner chose it. A server-side
secret is the switch because nobody can flip it from inside the app.

## Browser side

- Jackie's own web code makes no direct requests to AI providers; it goes through
  the edge functions above.
- The imported Eru pages (`src/eru/`) run on the offline shim in
  `src/eru/api/base44Client.js` while `VITE_BASE44_APP_ID` is unset, which it is.
  Setting it would connect them to Base44.
- The media converter in `src/eru/lib/mediaConverter.js` stays off while
  `VITE_MEDIA_CONVERTER_URL` is unset.

## Not covered

- `public/pc-os/` is a prebuilt bundle; its browser-side AI calls use keys stored
  in that browser and must be changed in the PC repo.

## Guard

`src/test/offline-gate.test.ts` fails if a new edge function reaches outside without
the gate, or if the gate is moved after other work in the handler.
