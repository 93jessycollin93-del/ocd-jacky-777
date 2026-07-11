// Guarded PWA registration wrapper. Only registers in production
// on the real published domain; never in preview, dev, or iframes.
import { registerSW } from "virtual:pwa-register";

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

export function bootstrapPWA() {
  if (!shouldRegister()) {
    void unregisterExisting();
    return;
  }
  registerSW({ immediate: true });
}
