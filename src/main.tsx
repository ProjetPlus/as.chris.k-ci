import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { flushQueue, startAutoSync, onSyncEvent, installSessionHeaderInterceptor } from "@/lib/offline";
import { supabase } from "@/integrations/supabase/client";
import { processPendingPhotos } from "@/lib/photoWorker";
import { toast } from "sonner";
import { registerAppServiceWorker } from "@/lib/registerServiceWorker";

// Toast per synchronized op + summary (we never drop items — offline can last months).
onSyncEvent((e) => {
  if (e.type === "item") {
    const label = `${e.entry.op} · ${e.entry.table}`;
    if (e.entry.status === "success") toast.success(`Synchronisé : ${label}`);
  } else if (e.type === "done" && e.flushed > 0) {
    toast.message(`Sync terminée : ${e.flushed} OK${e.failed ? `, ${e.failed} en attente` : ""}`);
    // Kick the photo worker in background once mutations are flushed.
    setTimeout(() => { processPendingPhotos().catch(() => {}); }, 1500);
  }
});

// Periodic background photo processing (every 2 min) for anything the sync worker missed.
setInterval(() => { processPendingPhotos().catch(() => {}); }, 120_000);

// Request persistent storage so the browser never evicts our offline cache —
// critical for devices that may stay offline for months. Best-effort, silent.
if (typeof navigator !== "undefined" && navigator.storage?.persist) {
  navigator.storage.persisted().then((already) => {
    if (!already) navigator.storage.persist().catch(() => {});
  }).catch(() => {});
}

// Mount the app FIRST — never block render on async work.
try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (e) {
  console.error("[boot] render failed", e);
  const root = document.getElementById("root");
  if (root) root.innerHTML = '<div style="padding:24px;font-family:sans-serif">Erreur de démarrage. Rechargez la page.</div>';
}

// Best-effort cleanup of any previously hardcoded default admin credential
// (the seed has been removed for security; this only purges legacy cache).
Promise.resolve().then(() => seedDefaultAdmin()).catch(() => {});

registerAppServiceWorker().catch(() => {});

// Auto-sync loop: retry failed mutations periodically + on every online event.
startAutoSync(supabase, 15000);
// Also flush immediately on the explicit online event (already handled inside startAutoSync but kept for first run)
if (navigator.onLine) setTimeout(() => { flushQueue(supabase, { force: true }).catch(() => {}); }, 2000);
