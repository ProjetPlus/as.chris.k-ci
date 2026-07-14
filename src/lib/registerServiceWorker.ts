import { registerSW } from "virtual:pwa-register";

function isPreviewHost(hostname: string) {
  return hostname.startsWith("id-preview--") || hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" || hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" || hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" || hostname.endsWith(".beta.lovable.dev");
}

async function unregisterAppShellWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js") || r.installing?.scriptURL.endsWith("/sw.js") || r.waiting?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()));
}

export async function registerAppServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const refused = !import.meta.env.PROD || inIframe || isPreviewHost(location.hostname) || new URLSearchParams(location.search).get("sw") === "off";
  if (refused) {
    await unregisterAppShellWorkers().catch(() => {});
    return;
  }
  registerSW({ immediate: true, onRegisteredSW: () => console.info("[pwa] service worker prêt"), onRegisterError: (error) => console.warn("[pwa] service worker échec", error) });
}
