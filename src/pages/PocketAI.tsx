// Pocket AI: a PocketPal-style private assistant that runs entirely on this device. Download a model once
// (Bonsai 1.7B is about 248 MB), then chat with it offline. Nothing typed here is sent anywhere.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { ArrowLeft, Cpu, Download, HardDrive, Loader2, Plus, Send, Square, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { requestPersistentStorage } from "@/pwa/register";
import {
  addCustomModel, allModels, checkModelUrl, formatBytes, removeCustomModel, type PocketModel,
} from "@/lib/pocket/catalog";
import {
  cachedModels, chat, deleteModel, downloadModel, freeSpace, isVerified, loadModel, loadedModel, unloadModel,
  webGpuAvailable, PocketError, type CachedInfo, type LoadedInfo,
} from "@/lib/pocket/engine";
import { PERSONAS, loadChat, loadSettings, saveChat, saveSettings, type PocketMessage, type PocketSettings } from "@/lib/pocket/settings";

type Downloading = { loaded: number; total: number; abort: AbortController };

export default function PocketAI() {
  const [tab, setTab] = useState("chat");
  const [models, setModels] = useState<PocketModel[]>(allModels);
  const [cache, setCache] = useState<Map<string, CachedInfo>>(new Map());
  const [downloads, setDownloads] = useState<Record<string, Downloading>>({});
  const [loaded, setLoaded] = useState<LoadedInfo | null>(loadedModel());
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const [space, setSpace] = useState<number | null>(null);
  const [settings, setSettings] = useState<PocketSettings>(loadSettings);
  const [messages, setMessages] = useState<PocketMessage[]>(loadChat);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const stopRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setModels(allModels());
    try {
      setCache(await cachedModels());
    } catch {
      setCache(new Map());
    }
    setSpace(await freeSpace());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveChat(messages), [messages]);
  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [messages]);

  const downloaded = (m: PocketModel) => cache.get(m.url)?.valid === true;
  const chosen = models.find((m) => m.id === settings.modelId) ?? models.find(downloaded) ?? models[0];

  const startDownload = async (m: PocketModel) => {
    const abort = new AbortController();
    setDownloads((d) => ({ ...d, [m.url]: { loaded: 0, total: m.bytes ?? 0, abort } }));
    void requestPersistentStorage();
    try {
      await downloadModel(m, (done, total) => setDownloads((d) => (d[m.url] ? { ...d, [m.url]: { ...d[m.url], loaded: done, total } } : d)), abort.signal);
      toast.success(`${m.name} is on this device`, { description: "It works offline from now on." });
      setSettings((s) => ({ ...s, modelId: m.id }));
    } catch (e) {
      if (!(e instanceof PocketError && e.code === "aborted")) toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloads((d) => {
        const { [m.url]: _, ...rest } = d;
        return rest;
      });
      void refresh();
    }
  };

  const load = async (m: PocketModel): Promise<LoadedInfo | null> => {
    setLoadingUrl(m.url);
    try {
      const info = await loadModel(m, { preferGpu: settings.preferGpu, nCtx: settings.nCtx });
      setLoaded(info);
      setSettings((s) => ({ ...s, modelId: m.id }));
      return info;
    } catch (e) {
      setLoaded(loadedModel());
      toast.error(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setLoadingUrl(null);
    }
  };

  const remove = async (m: PocketModel) => {
    if (!window.confirm(`Delete ${m.name} from this device?`)) return;
    await deleteModel(m.url);
    if (m.custom) removeCustomModel(m.url);
    setLoaded(loadedModel());
    void refresh();
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (!chosen || !downloaded(chosen)) {
      setTab("models");
      toast("Download a model first", { description: "Bonsai 1.7B is a good start (248 MB)." });
      return;
    }
    setBusy(true);
    setInput("");
    const history: PocketMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    try {
      const info = loaded?.url === chosen.url ? loaded : await load(chosen);
      if (!info) {
        setMessages(history);
        return;
      }
      const abort = new AbortController();
      stopRef.current = abort;
      const persona = PERSONAS.find((p) => p.id === settings.personaId);
      const system = settings.personaId === "custom" ? settings.customSystem : persona?.system ?? "";
      const turns = [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        ...history.map(({ role, content }) => ({ role, content })),
      ];
      const res = await chat(turns, {
        sampling: { ...chosen.sampling, temperature: settings.temperature },
        maxTokens: settings.maxTokens,
        signal: abort.signal,
        onText: (t) => setMessages([...history, { role: "assistant", content: t }]),
      });
      setMessages([...history, { role: "assistant", content: res.text || (res.stopped ? "(stopped)" : "…"), stats: { tps: res.tokensPerSecond, tokens: res.tokens } }]);
    } catch (e) {
      setMessages(history);
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      stopRef.current = null;
      setBusy(false);
    }
  };

  const addByLink = () => {
    const url = customUrl.trim();
    const problem = checkModelUrl(url);
    if (problem) return toast.error(problem);
    const m = addCustomModel(url);
    setCustomUrl("");
    setModels(allModels());
    void startDownload(m);
  };

  const status = loaded
    ? `${models.find((m) => m.url === loaded.url)?.name ?? "Model"} · ${loaded.gpu ? "GPU" : `CPU · ${loaded.threads} thread${loaded.threads === 1 ? "" : "s"}`}`
    : "No model loaded";

  return (
    <div className="flex h-[100dvh] flex-col bg-[radial-gradient(ellipse_at_top,#0f2a1f_0%,#07100c_55%,#000_100%)] text-white">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link to="/" className="text-white/60 hover:text-white" aria-label="Home"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black tracking-tight">📱 Pocket AI</h1>
          <p className="truncate text-[11px] text-white/55">Private AI on this device. Works offline once a model is downloaded.</p>
        </div>
        <Badge variant="outline" className="shrink-0 border-emerald-400/40 text-[10px] text-emerald-200">
          {loaded?.gpu ? <Zap className="mr-1 h-3 w-3" /> : <Cpu className="mr-1 h-3 w-3" />}
          {status}
        </Badge>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 grid w-auto grid-cols-3 bg-white/5">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="mx-auto mt-10 max-w-md space-y-3 text-center text-sm text-white/65">
                <div className="text-5xl">🌱</div>
                <p>
                  {chosen && downloaded(chosen)
                    ? `Say hi to ${chosen.name}. It answers right here on your device, even with no connection.`
                    : "Download a model in the Models tab first. Bonsai 1.7B (248 MB) runs well on most phones."}
                </p>
                {!(chosen && downloaded(chosen)) && <Button onClick={() => setTab("models")} className="bg-emerald-500 text-black hover:bg-emerald-400">Choose a model</Button>}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "bg-emerald-500 text-black" : "border border-white/10 bg-white/[0.06]"}`}>
                  {msg.role === "assistant" ? (
                    msg.content ? (
                      <div className="break-words [&_a]:underline [&_code]:rounded [&_code]:bg-black/40 [&_code]:px-1 [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/50 [&_pre]:p-2 [&_pre_code]:bg-transparent [&_ul]:list-disc [&_ul]:pl-5"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-white/60"><Loader2 className="h-3.5 w-3.5 animate-spin" />{loadingUrl ? "Loading the model…" : "Thinking…"}</span>
                    )
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                  {msg.stats && <div className="mt-1.5 text-[10px] text-white/40">{msg.stats.tps.toFixed(1)} tokens/s · {msg.stats.tokens} tokens</div>}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="border-t border-white/10 p-3">
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              <Button variant="ghost" size="icon" title="New chat" disabled={busy || messages.length === 0} onClick={() => setMessages([])}><Plus className="h-4 w-4" /></Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                placeholder={chosen ? `Message ${chosen.name}…` : "Message…"}
                className="max-h-40 min-h-[42px] resize-none border-white/15 bg-black/40"
              />
              {busy ? (
                <Button size="icon" variant="secondary" title="Stop" onClick={() => stopRef.current?.abort()}><Square className="h-4 w-4" /></Button>
              ) : (
                <Button size="icon" title="Send" disabled={!input.trim()} onClick={() => void send()} className="bg-emerald-500 text-black hover:bg-emerald-400"><Send className="h-4 w-4" /></Button>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="models" className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-4 data-[state=inactive]:hidden">
          <div className="mx-auto max-w-3xl space-y-3">
            <p className="flex items-center gap-2 text-xs text-white/55">
              <HardDrive className="h-3.5 w-3.5" />
              Models are stored in this browser and work offline. {space !== null && `${formatBytes(space)} free for this app.`}
            </p>
            {models.map((m) => {
              const dl = downloads[m.url];
              const info = cache.get(m.url);
              const have = info?.valid === true;
              const isLoaded = loaded?.url === m.url;
              return (
                <div key={m.url} className={`rounded-xl border p-3 ${isLoaded ? "border-emerald-400/50 bg-emerald-400/[0.06]" : "border-white/10 bg-white/[0.04]"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{m.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{m.params}</Badge>
                    {m.bytes && <span className="text-xs text-white/50">{formatBytes(m.bytes)}</span>}
                    {m.recommended && <Badge className="bg-emerald-500 text-[10px] text-black">Recommended</Badge>}
                    {have && isVerified(m) && <Badge variant="outline" className="border-emerald-400/40 text-[10px] text-emerald-200">✓ Verified</Badge>}
                    {isLoaded && <Badge variant="outline" className="text-[10px]">Loaded · {loaded.gpu ? "GPU" : "CPU"}</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-white/60">{m.note}</p>
                  {dl ? (
                    <div className="mt-3 space-y-1.5">
                      <Progress value={dl.total ? (dl.loaded / dl.total) * 100 : 0} className="h-2" />
                      <div className="flex items-center justify-between text-[11px] text-white/55">
                        <span>{formatBytes(dl.loaded)}{dl.total ? ` of ${formatBytes(dl.total)}` : ""}</span>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => dl.abort.abort()}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!have && (
                        <Button size="sm" onClick={() => void startDownload(m)} className="bg-emerald-500 text-black hover:bg-emerald-400">
                          <Download className="mr-1.5 h-3.5 w-3.5" />{info ? "Download again (incomplete)" : "Download"}
                        </Button>
                      )}
                      {have && !isLoaded && (
                        <Button size="sm" disabled={!!loadingUrl} onClick={() => void load(m)}>
                          {loadingUrl === m.url ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}Load
                        </Button>
                      )}
                      {isLoaded && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void unloadModel().then(() => setLoaded(null))}>Unload</Button>}
                      {have && isLoaded && <Button size="sm" variant="ghost" onClick={() => setTab("chat")}>Chat →</Button>}
                      {(info || m.custom) && (
                        <Button size="sm" variant="ghost" className="text-red-300 hover:text-red-200" disabled={busy} onClick={() => void remove(m)}>
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="rounded-xl border border-dashed border-white/15 p-3">
              <div className="text-sm font-semibold">Add a model by link</div>
              <p className="mt-0.5 text-xs text-white/55">Paste a direct link to a .gguf file, such as a Hugging Face “resolve” link. Small models (under 2 GB) work best.</p>
              <div className="mt-2 flex gap-2">
                <Input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://huggingface.co/…/resolve/main/model.gguf" className="border-white/15 bg-black/40 text-xs" />
                <Button size="sm" onClick={addByLink} disabled={!customUrl.trim()}>Add</Button>
              </div>
            </div>
            <p className="pt-2 text-[11px] leading-relaxed text-white/40">
              Bonsai models by PrismML, Apache-2.0. Runs on llama.cpp compiled for the web (wllama). Inspired by the open-source PocketPal app.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-4 data-[state=inactive]:hidden">
          <div className="mx-auto max-w-3xl space-y-5 text-sm">
            <section className="space-y-2">
              <h2 className="font-semibold">Persona</h2>
              <div className="flex flex-wrap gap-1.5">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, personaId: p.id }))}
                    className={`rounded-full px-3 py-1 text-xs ${settings.personaId === p.id ? "bg-emerald-500 text-black" : "bg-white/10 text-white/75 hover:bg-white/15"}`}
                  >
                    {p.emoji} {p.name}
                  </button>
                ))}
              </div>
              {settings.personaId === "custom" && (
                <Textarea
                  value={settings.customSystem}
                  onChange={(e) => setSettings((s) => ({ ...s, customSystem: e.target.value }))}
                  placeholder="Describe how the assistant should behave…"
                  className="border-white/15 bg-black/40"
                />
              )}
            </section>
            <section className="space-y-2">
              <div className="flex justify-between"><h2 className="font-semibold">Creativity</h2><span className="text-white/55">{settings.temperature.toFixed(2)}</span></div>
              <Slider min={0} max={1.5} step={0.05} value={[settings.temperature]} onValueChange={([v]) => setSettings((s) => ({ ...s, temperature: v }))} />
              <p className="text-xs text-white/45">Lower is more focused; 0.5 is what PrismML recommends for Bonsai.</p>
            </section>
            <section className="space-y-2">
              <div className="flex justify-between"><h2 className="font-semibold">Longest reply</h2><span className="text-white/55">{settings.maxTokens} tokens</span></div>
              <Slider min={64} max={2048} step={64} value={[settings.maxTokens]} onValueChange={([v]) => setSettings((s) => ({ ...s, maxTokens: v }))} />
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold">Memory (context)</h2>
              <div className="flex gap-1.5">
                {[2048, 4096, 8192].map((n) => (
                  <button key={n} type="button" onClick={() => setSettings((s) => ({ ...s, nCtx: n }))} className={`rounded-full px-3 py-1 text-xs ${settings.nCtx === n ? "bg-emerald-500 text-black" : "bg-white/10 text-white/75"}`}>
                    {n / 1024}K tokens
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/45">More remembers longer chats but uses more memory. Applies the next time a model loads.</p>
            </section>
            <section className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold">Use the GPU (WebGPU)</h2>
                <p className="text-xs text-white/45">{webGpuAvailable() ? "Much faster where supported. Falls back to the CPU automatically." : "This browser doesn't offer WebGPU, so the CPU is used."}</p>
              </div>
              <Switch checked={settings.preferGpu} onCheckedChange={(v) => setSettings((s) => ({ ...s, preferGpu: v }))} />
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
