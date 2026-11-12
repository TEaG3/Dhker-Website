const CACHE_NAME = "dhker-web-v23";
const MUSHAF_CACHE = "dhker-mushaf-pages-v1";
const CORE = [
  "./", "./index.html", "./quran-reader.html",
  "./styles.css", "./mobile-app.css", "./islamic-identity.css", "./islamic-identity.js",
  "./script.js", "./mushaf-reader.js", "./THIRD-PARTY-NOTICES.md", "./manifest.webmanifest",
  "./licenses/flipbook-core-MPL-2.0.txt", "./licenses/stpageflip-MIT.txt",
  "./data/adhkar.json", "./data/references.json", "./data/cities.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME && key !== MUSHAF_CACHE)
        .filter((key) => key.startsWith("dhker-web-"))
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Cache locally hosted Quran page images on demand. Only pages already opened are stored offline.
  if (url.origin === self.location.origin &&
      url.pathname.includes("/assets/mushaf/hafsTajweed/") &&
      /\/page\d+\.png$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(MUSHAF_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok || response.type === "opaque") {
          try { await cache.put(request, response.clone()); } catch (_) {}
        }
        return response;
      } catch (error) {
        return cached || new Response("", { status: 503, statusText: "Offline page not cached" });
      }
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Navigation is network-first so deployed HTML is not trapped behind a stale app shell.
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || (await cache.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  // Versioned local assets are cache-first; the cache is replaced on each release.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return (await cache.match("./index.html")) || Response.error();
    }
  })());
});