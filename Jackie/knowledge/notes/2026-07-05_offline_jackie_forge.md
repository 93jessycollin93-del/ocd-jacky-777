# Offline Jackie — Forge, Pods, Phone Setup

Reference notes for the PC/phone side of Jackie. **This does not run inside the Lovable web app** — it runs on your machine. Kept here so future sessions have context.

## Architecture

```
┌─────────────────────────┐        ┌─────────────────────────┐
│   Lovable web Jackie    │◄──────►│   PC Jackie (Ollama)    │
│   (this app)            │  HTTPS │   via Cloudflare Tunnel │
│   /providers → ollama   │ tunnel │   OLLAMA_BASE_URL       │
└─────────────────────────┘        └─────────────────────────┘
              ▲                                  ▲
              │ sync pods                        │ SQLite jacket
              ▼                                  ▼
     ┌────────────────┐               ┌────────────────────┐
     │  iPhone Jackie │               │ Datasets + logs    │
     │  LLM Farm 0.5B │               │ zstd compressed    │
     │  Shortcuts     │               └────────────────────┘
     └────────────────┘
```

## 1. Memory model — the "jacket"

Three tiers (from `Jackie/MEMORY_MODEL.md`):
- **Ephemeral** — pruned aggressively
- **Durable** — searchable, keyword + embedding indexed
- **Gold** — never auto-pruned; identity + non-negotiable rules

Storage: SQLite + `@bokuweb/zstd-wasm` compression. 1GB logs → ~150MB.

## 2. Pod compression

A "pod" is one compressed chunk of memory. Shape:
```ts
{
  id: string;
  created_at: number;
  tier: 'ephemeral'|'durable'|'gold';
  tags: string[];
  importance: number; // 0..1
  raw_bytes: Uint8Array; // zstd of text
  summary: string; // uncompressed short summary for cheap keyword recall
  embedding?: Float32Array; // optional — Xenova/all-MiniLM-L6-v2
}
```

Retrieval: keyword filter on `summary` + tags → decompress top N → optional re-rank with local reranker (bge-reranker-base) → assemble context under token budget (LongLLMLingua-style trimming).

## 3. JackieOfflineForge (Node/PC)

```
npm i better-sqlite3 @bokuweb/zstd-wasm @xenova/transformers
```

Core methods:
- `init()` — open DB, load embedder (~50MB one-time download)
- `memorize(text, importance, tier, tags[])` — zstd + insert
- `recall(query, k)` — semantic + keyword search
- `stats()` — pod count, disk usage
- Extended `JackieCoder` — calls local Ollama, self-tests output, retries on failure

## 4. Recommended Ollama models

| Task            | Model                     | RAM   |
|-----------------|---------------------------|-------|
| General         | `llama3.3:70b`            | 40GB  |
| Coder (best)    | `qwen2.5-coder:32b`       | 24GB  |
| Coder (fast)    | `deepseek-coder-v2:16b`   | 12GB  |
| Reasoning       | `deepseek-r1:32b`         | 24GB  |
| Mobile / edge   | `llama3.2:3b`             | 4GB   |
| Vision          | `llama3.2-vision:11b`     | 10GB  |

Launch tuning: `OLLAMA_NUM_GPU=999 OLLAMA_FLASH_ATTENTION=1 ollama serve`

## 5. Exposing PC Jackie to the web app

```bash
# On your PC — after `ollama serve` is running on :11434
cloudflared tunnel --url http://localhost:11434
# Copy the https://*.trycloudflare.com URL
```

In the web app: **Backend → Secrets → OLLAMA_BASE_URL** = that URL. The `/providers` page's Ollama provider now streams from your GPU.

For a stable URL, use a named Cloudflare Tunnel with your own domain. Add `OLLAMA_API_KEY` if you put an auth proxy in front.

## 6. iPhone Jackie (field mode)

- **App**: LLM Farm (free)
- **Model**: `Qwen2.5-0.5B-Instruct Q4_K_M` (350MB) or `Llama-3.2-1B` via Private LLM
- **Memory**: iOS Shortcuts append to `Jackie Memory.note` in iCloud → sync to PC → bulk `forge.memorize()`
- **Money-off toggle**: Shortcut checks `MoneyOff.txt` in iCloud Drive → forces local model, blocks API calls

Reality: iPhone 12 has ~2.5GB app RAM. Ceiling is 3B-Q4. She remembers rules and drafts stubs; PC Jackie does real coding.

## 7. Datasets to preload

Start small, ingest via `forge.memorize()`:
- `teknium/OpenHermes-2.5` (1GB → ~200MB compressed) — instruction tuning
- `OASST2` (120MB) — chat foundation
- `bigcode/the-stack-v2-dedup` (subset) — code training
- `CVEfixes` + `PrimeVul` — security patterns
- Wikipedia + StackExchange dumps for full encyclopedia mode

## 8. "Jackie Switch" — three modes

```
moneyOn = false OR battery <20% OR no wifi → LOCAL (LLM Farm)
moneyOn = true  AND wifi AND charging      → CLOUD (Groq free tier)
default                                    → HYBRID (Ollama tunnel if reachable, else LOCAL)
```

Log every decision to `Jackie Log.note` so pod system has ground truth.

## 9. What the web app provides

The Lovable app is the **control plane + cloud tier**:
- `/providers` — pick and test any provider
- Groq / OpenRouter edge functions for cloud LLMs
- Ollama edge function for tunnel bridge
- Jackie memory table (`jackie_memory`) — durable pods, RLS per user

The web app **does not** run SQLite/Ollama/embedders. Those live on your PC/phone. Sync via the memory table and the tunnel URL.

## References
- Ollama: https://ollama.com
- Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- Xenova Transformers.js: https://huggingface.co/docs/transformers.js
- LLM Farm iOS: https://apps.apple.com/app/llm-farm/id6461209012
- LongLLMLingua paper: https://arxiv.org/abs/2310.06839
