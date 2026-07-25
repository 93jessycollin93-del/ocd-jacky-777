/**
 * Jacky Client — the fleet's single link to the real `jacky` Flask engine.
 *
 * Every dashboard in the fleet used to invent its own telemetry: PC's monitors
 * drifted random numbers, Eru and Jackie proxied straight to cloud LLMs. The
 * engine that actually knows the GPU temperature, the routing waterfall and the
 * ECPS codec was never wired up. This module is that wire, generalized from the
 * fetch layer in `public/app-commander.html` so one implementation serves all
 * three front-ends.
 *
 * Portability is deliberate: the same file drops into Eru (Base44) and Jackie
 * (Lovable/Supabase) unchanged. Those platforms cannot call the engine directly
 * — the browser origin differs and the engine ships no CORS headers — so the
 * client supports a `proxy` transport that tunnels the same paths through a
 * platform serverless function (`base44/functions/jackyProxy`,
 * `supabase/functions/jacky-proxy`). Only the transport differs; callers don't
 * change.
 *
 * Honesty rule: when the engine is unreachable the client does NOT quietly
 * invent numbers. It flips `state` to `offline`/`demo` and every telemetry
 * reading it hands back carries `simulated: true`, so a panel is free to keep
 * animating but is obliged to label itself. That distinction is the whole point
 * of the exercise — a demo that admits it beats a dashboard that lies.
 *
 * Endpoint shapes follow `jacky_api.py`. The engine lives outside this repo and
 * its payloads have drifted before, so every field is optional and readers
 * tolerate absence rather than throwing.
 *
 * Zero imports, deliberately. This file is byte-identical in all four repos, and
 * the four have no dependency in common. Link-state changes go out as a raw
 * `jacky-link-changed` CustomEvent on `window` — which is precisely what PC's
 * typed bus dispatches and listens for, so `bus.on('jacky-link-changed', …)`
 * receives these events with full type-checking despite the lack of an import.
 */

/** Channel name for link-state changes. Registered in PC's `lib/bus.ts`. */
export const JACKY_LINK_EVENT = 'jacky-link-changed';

/* ------------------------------------------------------------------ *
 * Configuration
 * ------------------------------------------------------------------ */

/** Transport to reach the engine. */
export type JackyTransport =
  /** Browser calls the engine host directly. Needs CORS on the engine. */
  | 'direct'
  /** Browser calls a same-origin serverless function that relays to the engine. */
  | 'proxy';

export interface JackyConfig {
  /** Engine origin, e.g. `https://jacky.example.trycloudflare.com`. No trailing slash. */
  base: string;
  /** Bearer token; also mirrored onto the query string for engines that read it there. */
  token: string;
  transport: JackyTransport;
  /** Same-origin path that relays to the engine when `transport === 'proxy'`. */
  proxyPath: string;
}

/**
 * localStorage keys. Shared verbatim with `public/app-commander.html` so the
 * Commander's settings drawer and every React panel read one saved link.
 */
const LS_BASE = 'eye_api_base';
const LS_TOKEN = 'eye_api_token';
const LS_TRANSPORT = 'eye_api_transport';
const LS_PROXY_PATH = 'eye_api_proxy_path';

const DEFAULT_PROXY_PATH = '/api/jacky';

function readEnv(key: string): string {
  // Vite inlines `import.meta.env`; Base44/Deno builds may not define it at all.
  try {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    return env?.[key] ?? '';
  } catch {
    return '';
  }
}

function readStored(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return ''; // private mode, SSR, or a sandboxed iframe
  }
}

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

function loadConfig(): JackyConfig {
  const transport = readStored(LS_TRANSPORT) === 'proxy' ? 'proxy' : 'direct';
  return {
    base: stripTrailingSlashes(readStored(LS_BASE) || readEnv('VITE_JACKY_API_BASE')),
    token: readStored(LS_TOKEN) || readEnv('VITE_JACKY_API_TOKEN'),
    transport,
    proxyPath: readStored(LS_PROXY_PATH) || readEnv('VITE_JACKY_PROXY_PATH') || DEFAULT_PROXY_PATH,
  };
}

/* ------------------------------------------------------------------ *
 * Engine payloads (all fields optional — see module note)
 * ------------------------------------------------------------------ */

export interface JackyGpuStatus {
  available?: boolean;
  name?: string;
  temp_c?: number;
  util_pct?: number;
  mem_used_mb?: number;
  mem_total_mb?: number;
}

/** `GET /api/status` */
export interface JackyStatus {
  /** CPU load, percent. */
  cpu?: number;
  /** RAM in use, percent. */
  memory?: number;
  /** Disk in use, percent. */
  disk?: number;
  gpu?: JackyGpuStatus;
  /** Master on/off switch — mirrors `GET /api/control`. */
  enabled?: boolean;
  uptime_s?: number;
  host?: string;
}

/** Routing tier chosen by the engine's situation assessor. */
export type JackyTier = 'local' | 'free' | 'paid' | 'halt';

/** `GET /api/assessment` */
export interface JackyAssessment {
  tier?: JackyTier;
  verdict?: string;
  /** Human-readable justifications for the tier. */
  reasons?: string[];
  /** Engine's own thermal read, when it reports one separately from status. */
  gpu_temp_c?: number;
}

/** `POST /api/ask` */
export interface JackyAskRequest {
  prompt: string;
  /** Steers the router: `general`, `coding`, `security`, … */
  task_type?: string;
  /** Prior turns, when the caller keeps a conversation. */
  history?: { role: 'user' | 'assistant' | 'system'; content: string }[];
}

export interface JackyAskResponse {
  response?: string;
  error?: string;
  /** Tier or provider chain that served the request. */
  route?: string;
  engine?: string;
  model?: string;
  latency_s?: number;
  cost_usd?: number;
  /** Providers tried before the one that answered. */
  fallback_chain?: string[];
}

/** `GET`/`POST /api/control` — the master switch. */
export interface JackyControl {
  enabled?: boolean;
  reason?: string;
}

/** `GET /api/squads` */
export interface JackySquad {
  name?: string;
  role?: string;
  members?: string[];
  lead?: string;
}

export interface JackySquadReply {
  /** Single answer when asking the squad lead. */
  response?: string;
  /** Per-member answers when running a discussion. */
  messages?: { member?: string; content?: string }[];
  squad?: string;
  error?: string;
}

/** `POST /api/ecps/compress` */
export interface JackyEcpsSeed {
  seed?: string;
  /** Compressed size ÷ original size. */
  ratio?: number;
  original_tokens?: number;
  seed_tokens?: number;
  error?: string;
}

export interface JackyEcpsExpansion {
  text?: string;
  error?: string;
}

/* ------------------------------------------------------------------ *
 * Normalized telemetry — what panels actually render
 * ------------------------------------------------------------------ */

export interface JackyTelemetry {
  /** GPU die temperature, °C. */
  gpuTempC: number;
  cpuPct: number;
  ramPct: number;
  vramPct: number;
  /** True when these numbers are drifted placeholders, not engine readings. */
  simulated: boolean;
  /** When the reading was taken. */
  at: number;
  gpuName?: string;
}

export interface JackyRouting {
  tier: JackyTier;
  verdict: string;
  /** DEFCON-style readiness label for the status strip. */
  readiness: string;
  reasons: string[];
}

/** Link state, mirroring the Commander's connection pill. */
export type JackyLinkState =
  /** Last request to a configured engine succeeded. */
  | 'live'
  /** An engine is configured but unreachable. */
  | 'offline'
  /** No engine configured — placeholder data by design. */
  | 'demo';

/* ------------------------------------------------------------------ *
 * Thermal thresholds — one source of truth for the whole fleet
 * ------------------------------------------------------------------ */

/**
 * Mirrors the waterfall in `situation_assessor.py` and the Commander HUD. The
 * 3090 hard-stops at 75 °C; the gated zone starts at 70 °C, where the router
 * prefers free cloud over burning the die.
 */
export const THERMAL = {
  gpuHalt: 75,
  gpuGated: 70,
  cpuOffload: 90,
  ramOffload: 92,
} as const;

/** Classify telemetry into a routing tier. Pure — safe to call per frame. */
export function deriveRouting(t: Pick<JackyTelemetry, 'gpuTempC' | 'cpuPct' | 'ramPct'>): JackyRouting {
  if (t.gpuTempC >= THERMAL.gpuHalt) {
    return {
      tier: 'halt',
      verdict: 'THERMAL HALT',
      readiness: 'DEFCON 2 · THERMAL',
      reasons: [`GPU at ${Math.round(t.gpuTempC)}°C — at or past the ${THERMAL.gpuHalt}°C hard stop.`],
    };
  }
  if (t.gpuTempC >= THERMAL.gpuGated) {
    return {
      tier: 'free',
      verdict: 'FREE CLOUD',
      readiness: 'DEFCON 3 · ELEVATED',
      reasons: [`GPU at ${Math.round(t.gpuTempC)}°C — in the gated zone, favoring free cloud.`],
    };
  }
  if (t.cpuPct >= THERMAL.cpuOffload || t.ramPct >= THERMAL.ramOffload) {
    return {
      tier: 'paid',
      verdict: 'OFFLOAD · PAID',
      readiness: 'DEFCON 4 · SATURATED',
      reasons: [`Host saturated — CPU ${Math.round(t.cpuPct)}%, RAM ${Math.round(t.ramPct)}%.`],
    };
  }
  return {
    tier: 'local',
    verdict: 'LOCAL FIRST',
    readiness: 'DEFCON 5 · NOMINAL',
    reasons: ['Thermals and host load nominal — local models cleared.'],
  };
}

/** Fold a raw `/api/status` payload into normalized telemetry. */
export function normalizeStatus(s: JackyStatus): JackyTelemetry {
  const gpu = s.gpu ?? {};
  const vram =
    gpu.mem_total_mb && gpu.mem_total_mb > 0 && typeof gpu.mem_used_mb === 'number'
      ? Math.round((gpu.mem_used_mb / gpu.mem_total_mb) * 100)
      : 0;
  return {
    gpuTempC: typeof gpu.temp_c === 'number' ? gpu.temp_c : 0,
    cpuPct: typeof s.cpu === 'number' ? s.cpu : 0,
    ramPct: typeof s.memory === 'number' ? s.memory : 0,
    vramPct: vram,
    simulated: false,
    at: Date.now(),
    gpuName: gpu.name,
  };
}

/* ------------------------------------------------------------------ *
 * The client
 * ------------------------------------------------------------------ */

export interface JackyRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Abort after this many ms. Reads default to 4.5 s, inference to 30 s. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Performs one relayed call to the engine via the host platform's own function
 * invoker. Registered by each repo's bootstrap — see `setProxyInvoker`.
 */
export type JackyProxyInvoker = (
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
) => Promise<unknown>;

/** Thrown when the engine cannot be reached or answers non-2xx. */
export class JackyLinkError extends Error {
  constructor(
    message: string,
    /** `no-base` | `timeout` | `network` | `http` */
    readonly kind: 'no-base' | 'timeout' | 'network' | 'http',
    readonly status?: number,
  ) {
    super(message);
    this.name = 'JackyLinkError';
  }
}

const READ_TIMEOUT_MS = 4_500;
const INFERENCE_TIMEOUT_MS = 30_000;

class JackyClient {
  private cfg: JackyConfig = loadConfig();
  private linkState: JackyLinkState = 'demo';
  /**
   * Platform function invoker for proxy transport. Left unset, proxy mode falls
   * back to a plain same-origin fetch against `proxyPath` — which is what PC
   * wants, since its own Express server can host the relay. Eru and Jackie set
   * one so the call goes through `base44.functions.invoke` /
   * `supabase.functions.invoke` and inherits platform auth.
   */
  private proxyInvoker: JackyProxyInvoker | null = null;
  /** Retains the last drift values so demo telemetry moves smoothly. */
  private sim: JackyTelemetry = {
    gpuTempC: 54,
    cpuPct: 32,
    ramPct: 47,
    vramPct: 61,
    simulated: true,
    at: Date.now(),
  };

  constructor() {
    this.linkState = this.isConfigured() ? 'live' : 'demo'; // optimistic; first poll corrects
  }

  /* -------------------- configuration -------------------- */

  /** Current link config. Token included — treat as a secret. */
  getConfig(): JackyConfig {
    return { ...this.cfg };
  }

  /**
   * True when there is somewhere to send requests. In proxy mode a registered
   * platform invoker counts on its own — the SDK knows its function URL, so no
   * `proxyPath` is needed.
   */
  isConfigured(): boolean {
    if (this.cfg.transport === 'proxy') {
      return Boolean(this.proxyInvoker) || Boolean(this.cfg.proxyPath);
    }
    return Boolean(this.cfg.base);
  }

  /**
   * Update and persist the link. Partial — omitted fields keep their value.
   * Emits `jacky-link-changed` so open panels re-poll without a reload.
   */
  configure(next: Partial<JackyConfig>): void {
    if (next.base !== undefined) this.cfg.base = stripTrailingSlashes(next.base);
    if (next.token !== undefined) this.cfg.token = next.token;
    if (next.transport !== undefined) this.cfg.transport = next.transport;
    if (next.proxyPath !== undefined) this.cfg.proxyPath = next.proxyPath;

    try {
      localStorage.setItem(LS_BASE, this.cfg.base);
      localStorage.setItem(LS_TOKEN, this.cfg.token);
      localStorage.setItem(LS_TRANSPORT, this.cfg.transport);
      localStorage.setItem(LS_PROXY_PATH, this.cfg.proxyPath);
    } catch {
      // Non-persistent storage is survivable — the in-memory config still works.
    }

    this.setLinkState(this.isConfigured() ? 'live' : 'demo');
  }

  /** Re-read config from storage — for when another tab or the Commander changed it. */
  reloadConfig(): void {
    this.cfg = loadConfig();
    this.setLinkState(this.isConfigured() ? 'live' : 'demo');
  }

  /* -------------------- link state -------------------- */

  getLinkState(): JackyLinkState {
    return this.linkState;
  }

  /**
   * Subscribe to link-state changes. Returns an unsubscribe function.
   * Equivalent to `bus.on('jacky-link-changed', …)` in PC — same underlying event.
   */
  onLinkChange(handler: (state: JackyLinkState) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ state: JackyLinkState }>).detail;
      if (detail?.state) handler(detail.state);
    };
    window.addEventListener(JACKY_LINK_EVENT, listener);
    return () => window.removeEventListener(JACKY_LINK_EVENT, listener);
  }

  private setLinkState(state: JackyLinkState): void {
    if (state === this.linkState) return;
    this.linkState = state;
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(JACKY_LINK_EVENT, { detail: { state } }));
  }

  /* -------------------- transport -------------------- */

  /**
   * Register the host platform's function invoker and switch to proxy transport.
   * Call once at app startup; see each repo's `jackyBootstrap`.
   */
  setProxyInvoker(invoker: JackyProxyInvoker | null): void {
    this.proxyInvoker = invoker;
    if (invoker) this.cfg.transport = 'proxy';
    this.setLinkState(this.isConfigured() ? 'live' : 'demo');
  }

  private resolveUrl(path: string): string {
    if (this.cfg.transport === 'proxy') {
      // The relay takes the engine path as a query param and holds the engine
      // token server-side, so it never reaches the browser bundle.
      return `${stripTrailingSlashes(this.cfg.proxyPath)}?path=${encodeURIComponent(path)}`;
    }
    const url = this.cfg.base + path;
    if (!this.cfg.token) return url;
    return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(this.cfg.token)}`;
  }

  private headers(hasBody: boolean): Record<string, string> {
    const h: Record<string, string> = {};
    if (hasBody) h['Content-Type'] = 'application/json';
    // In proxy mode the function injects its own credentials.
    if (this.cfg.transport === 'direct' && this.cfg.token) {
      h.Authorization = `Bearer ${this.cfg.token}`;
    }
    return h;
  }

  /**
   * One request to the engine. Marks the link live on success and offline on
   * failure, then rethrows so callers decide how to degrade.
   */
  async request<T>(path: string, opts: JackyRequestOptions = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new JackyLinkError('No Jacky engine configured', 'no-base');
    }

    // Platform-invoker path: the SDK owns auth, CORS and retries, so there is
    // nothing here to time out or abort against — hand the call straight over.
    if (this.cfg.transport === 'proxy' && this.proxyInvoker) {
      try {
        const data = (await this.proxyInvoker(path, {
          method: opts.method ?? 'GET',
          body: opts.body,
        })) as T;
        this.setLinkState('live');
        return data;
      } catch (err) {
        this.setLinkState('offline');
        throw new JackyLinkError(`Engine unreachable via proxy: ${(err as Error).message}`, 'network');
      }
    }

    const hasBody = opts.body !== undefined;
    const controller = new AbortController();
    const timeoutMs = opts.timeoutMs ?? (opts.method === 'POST' ? INFERENCE_TIMEOUT_MS : READ_TIMEOUT_MS);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // Honor a caller-supplied signal alongside our timeout.
    const relay = opts.signal
      ? () => controller.abort()
      : undefined;
    if (opts.signal && relay) opts.signal.addEventListener('abort', relay, { once: true });

    try {
      const res = await fetch(this.resolveUrl(path), {
        method: opts.method ?? 'GET',
        mode: this.cfg.transport === 'proxy' ? 'same-origin' : 'cors',
        cache: 'no-store',
        headers: this.headers(hasBody),
        body: hasBody ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
      if (!res.ok) {
        this.setLinkState('offline');
        throw new JackyLinkError(`Engine returned HTTP ${res.status}`, 'http', res.status);
      }
      const data = (await res.json()) as T;
      this.setLinkState('live');
      return data;
    } catch (err) {
      if (err instanceof JackyLinkError) throw err;
      this.setLinkState('offline');
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      throw new JackyLinkError(
        aborted ? `Engine timed out after ${timeoutMs}ms` : `Engine unreachable: ${(err as Error).message}`,
        aborted ? 'timeout' : 'network',
      );
    } finally {
      clearTimeout(timer);
      if (opts.signal && relay) opts.signal.removeEventListener('abort', relay);
    }
  }

  /* -------------------- typed endpoints -------------------- */

  /** `GET /api/status` — host + GPU telemetry. */
  status(): Promise<JackyStatus> {
    return this.request<JackyStatus>('/api/status');
  }

  /** `GET /api/metrics` — richer counters, when the engine exposes them. */
  metrics(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/api/metrics');
  }

  /** `GET /api/assessment` — the engine's own routing verdict. */
  assessment(): Promise<JackyAssessment> {
    return this.request<JackyAssessment>('/api/assessment');
  }

  /** `POST /api/ask` — route a prompt through the situation-aware waterfall. */
  ask(req: JackyAskRequest): Promise<JackyAskResponse> {
    return this.request<JackyAskResponse>('/api/ask', {
      method: 'POST',
      body: { task_type: 'general', ...req },
      timeoutMs: INFERENCE_TIMEOUT_MS,
    });
  }

  /** `GET /api/control` — read the master switch. */
  getControl(): Promise<JackyControl> {
    return this.request<JackyControl>('/api/control');
  }

  /** `POST /api/control` — flip the master switch. */
  setControl(enabled: boolean, reason?: string): Promise<JackyControl> {
    return this.request<JackyControl>('/api/control', {
      method: 'POST',
      body: { enabled, reason },
    });
  }

  /** `GET /api/squads` — the multi-agent roster. */
  squads(): Promise<JackySquad[]> {
    return this.request<JackySquad[]>('/api/squads');
  }

  /** Ask one squad's lead. */
  squadAsk(squad: string, prompt: string): Promise<JackySquadReply> {
    return this.request<JackySquadReply>(`/api/squads/${encodeURIComponent(squad)}/ask`, {
      method: 'POST',
      body: { prompt },
      timeoutMs: INFERENCE_TIMEOUT_MS,
    });
  }

  /** Run every squad member and collect the transcript. */
  squadDiscuss(squad: string, prompt: string): Promise<JackySquadReply> {
    return this.request<JackySquadReply>(`/api/squads/${encodeURIComponent(squad)}/discuss`, {
      method: 'POST',
      body: { prompt },
      // A full-member round trip runs longer than a single lead answer.
      timeoutMs: INFERENCE_TIMEOUT_MS * 2,
    });
  }

  /** `POST /api/ecps/compress` — text → seed. */
  ecpsCompress(text: string): Promise<JackyEcpsSeed> {
    return this.request<JackyEcpsSeed>('/api/ecps/compress', { method: 'POST', body: { text } });
  }

  /** `POST /api/ecps/decompress` — seed → text. */
  ecpsDecompress(seed: string): Promise<JackyEcpsExpansion> {
    return this.request<JackyEcpsExpansion>('/api/ecps/decompress', { method: 'POST', body: { seed } });
  }

  /** `POST /api/ecps/benchmark` — round-trip fidelity report. */
  ecpsBenchmark(text: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/api/ecps/benchmark', {
      method: 'POST',
      body: { text },
      timeoutMs: INFERENCE_TIMEOUT_MS,
    });
  }

  /* -------------------- telemetry with graceful degradation -------------------- */

  /**
   * Telemetry for a dashboard, guaranteed to resolve.
   *
   * On a live engine you get real readings with `simulated: false`. Otherwise
   * you get smoothly drifting placeholders with `simulated: true` — render them
   * if you like, but label the panel as DEMO/OFFLINE. Never present a reading
   * with `simulated: true` as a measurement.
   */
  async telemetry(): Promise<JackyTelemetry> {
    if (!this.isConfigured()) {
      this.setLinkState('demo');
      return this.driftSim();
    }
    try {
      return normalizeStatus(await this.status());
    } catch {
      return this.driftSim(); // request() already flipped the link state
    }
  }

  /**
   * Routing verdict, preferring the engine's own assessment and falling back to
   * the local classifier so the two never disagree about thresholds.
   */
  async routing(): Promise<JackyRouting> {
    const telemetry = await this.telemetry();
    const local = deriveRouting(telemetry);
    if (!this.isConfigured() || this.linkState !== 'live') return local;
    try {
      const a = await this.assessment();
      if (!a.tier) return local;
      return {
        tier: a.tier,
        verdict: a.verdict ?? local.verdict,
        readiness: local.readiness,
        reasons: a.reasons?.length ? a.reasons : local.reasons,
      };
    } catch {
      return local;
    }
  }

  /**
   * Poll telemetry on an interval. Returns a stop function.
   * Panels should prefer this over their own `setInterval` so every dashboard
   * shares one cadence and one link-state signal.
   */
  pollTelemetry(onData: (t: JackyTelemetry) => void, intervalMs = 3_500): () => void {
    let stopped = false;
    const run = async () => {
      if (stopped) return;
      const t = await this.telemetry();
      if (!stopped) onData(t);
    };
    void run();
    const id = setInterval(run, intervalMs);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }

  /** Random-walk the placeholder readings within believable bounds. */
  private driftSim(): JackyTelemetry {
    const step = (v: number, lo: number, hi: number, amount: number) =>
      Math.max(lo, Math.min(hi, v + (Math.random() - 0.5) * amount));
    this.sim = {
      gpuTempC: step(this.sim.gpuTempC, 42, 78, 3.2),
      cpuPct: step(this.sim.cpuPct, 12, 96, 9),
      ramPct: step(this.sim.ramPct, 30, 90, 5),
      vramPct: step(this.sim.vramPct, 40, 94, 4),
      simulated: true,
      at: Date.now(),
    };
    return { ...this.sim };
  }

  /**
   * One-shot reachability probe for settings screens.
   * Never throws — reports what happened so the UI can explain it.
   */
  async probe(): Promise<{ ok: boolean; state: JackyLinkState; detail: string; gpuName?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, state: 'demo', detail: 'No engine configured — running on placeholder data.' };
    }
    try {
      const s = await this.status();
      const gpu = s.gpu ?? {};
      const detail = gpu.available
        ? `Linked. ${gpu.name ?? 'GPU'} at ${Math.round(gpu.temp_c ?? 0)}°C.`
        : 'Linked. Engine reports no GPU.';
      return { ok: true, state: 'live', detail, gpuName: gpu.name };
    } catch (err) {
      const e = err as JackyLinkError;
      return { ok: false, state: 'offline', detail: e.message };
    }
  }
}

/** Fleet-wide singleton. Import this, not the class. */
export const jackyClient = new JackyClient();
export default jackyClient;
