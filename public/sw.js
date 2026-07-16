// Service Worker — robust offline caching for Vite SPA.
// - Precaches the app shell (index.html, manifest, icons).
// - Runtime stale-while-revalidate for ALL same-origin assets,
//   which captures Vite's hashed JS/CSS chunks (/assets/*-[hash].js)
//   on the first online visit. Subsequent offline loads serve them from cache.
// - Navigation: network-first (3s timeout) then cached index for SPA routing.
const CACHE = "aschrisk-v11";
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function timeout(ms, promise) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Bypass Supabase API — handled by app-level cache
  if (url.hostname.includes("supabase.co") || url.hostname.includes("supabase.in")) return;

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Navigation → network-first with a short timeout, then cached shell.
  if (req.mode === "navigate") {
    const cachedShell = () =>
      caches.match("/index.html").then((r) => r || caches.match("/") || caches.match(req));
    event.respondWith(
      timeout(1200, fetch(req))
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => cachedShell().then((r) => r || new Response(
          "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>AS.CHRIS.K hors ligne</title><body style='font-family:sans-serif;padding:24px;background:#FAF5EE;color:#1F1F1F'><h1>AS.CHRIS.K</h1><p>Application hors ligne. Le cœur de l’application n’est pas encore présent sur cet appareil.</p></body>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        )))
    );
    return;
  }

  // Static assets (incl. Vite hashed /assets/*.js, *.css, images, fonts)
  // → stale-while-revalidate: instant from cache, refresh in background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
