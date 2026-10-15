// Guarded PWA registration wrapper. Only registers in production
// on the real published domain; never in preview, dev, or iframes.
import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

function shouldRegister(): boolean {
  if (!import.meta.env.PROD) return false;
  try {
    if (window.self !== window.top) return false;
  } catch { return false; }
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return false;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return false;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return false;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return false;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return false;
  return true;
}

async function unregisterExisting() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
      if (url.endsWith("/sw.js")) await reg.unregister();
    }
  } catch { /* ignore */ }
}

/** Ask the browser not to evict the offline cache and downloaded AI models when space runs low. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * If a page's code fails to load because a newer deploy replaced it (only possible without the service
 * worker, e.g. in Lovable previews), reload once to pick up the new version instead of showing a blank page.
 */
function recoverFromStaleChunks() {
  window.addEventListener("vite:preloadError", (event) => {
    if (!navigator.onLine) return;
    const last = Number(sessionStorage.getItem("eye:chunk-reload") ?? 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem("eye:chunk-reload", String(Date.now()));
    event.preventDefault();
    window.location.reload();
  });
}

export function bootstrapPWA() {
  recoverFromStaleChunks();
  if (!shouldRegister()) {
    void unregisterExisting();
    return;
  }
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast("A new version is ready", {
        description: "Reload when it suits you. Nothing changes until you do.",
        duration: Infinity,
        action: { label: "Reload", onClick: () => void updateSW(true) },
      });
    },
    onOfflineReady() {
      toast.success("Ready to work offline", { description: "Every page and game is now saved on this device." });
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      // Look for a new version every hour while the app stays open.
      window.setInterval(() => {
        if (navigator.onLine) void reg.update().catch(() => undefined);
      }, 60 * 60 * 1000);
    },
  });
  void requestPersistentStorage();
}
