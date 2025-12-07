// ===== Ayrix Service Worker (update-friendly) =====

const CACHE_NAME = "ayrix-v1"; // <- bump this to v2, v3 when you want a hard refresh

// Files you really want cached for offline
const ASSETS = [
  "/",
  "/index.html",
  "/style.css",      // CHANGE if your CSS file name is different
  "/script.js",      // CHANGE if your JS file name is different
  "/icons/ayrix-icon-192.png",
  "/icons/ayrix-icon-512.png"
];

// Install: pre-cache some core files + take control fast
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting(); // new SW doesn't wait
});

// Activate: delete old caches + control all clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Helper: network-first strategy
async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    return cached || Response.error();
  }
}

// Helper: cache-first strategy (for icons etc.)
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const fresh = await fetch(request);
  cache.put(request, fresh.clone());
  return fresh;
}

// Fetch handler
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // For your own pages / JS / CSS -> network-first (so updates are seen quickly)
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate") {
      event.respondWith(networkFirst(req));
      return;
    }
    if (req.destination === "script" || req.destination === "style") {
      event.respondWith(networkFirst(req));
      return;
    }
  }

  // Everything else -> cache-first
  event.respondWith(cacheFirst(req));
});

