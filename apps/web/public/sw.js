// Offline support, same-origin GET only.
// Pages: network first, the cached copy when offline.
// Hashed assets (/_astro/*, fonts included): cache first, a name never changes its content.
// Unhashed files (small scripts, search index): served from cache, refreshed in the background.
const CACHE = "mufassall-v1";
const HASHED = /^\/_astro\//;
const FRESH = /\/search\.json$|^\/(?:theme|lang|progress|search|pwa)\.js$|^\/favicon\.svg$|^\/manifest\.webmanifest$/;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function fromNetwork(request) {
  const res = await fetch(request);
  if (res.ok && res.type === "basic") {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(request, copy));
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fromNetwork(request).catch(async () => {
        const cache = await caches.open(CACHE);
        // the same page with any ?step=, then the language home, then nothing
        const page = await cache.match(request, { ignoreSearch: true });
        if (page) return page;
        const lang = url.pathname.split("/")[1] || "uz";
        return (await cache.match(`/${lang}/`)) || Response.error();
      }),
    );
    return;
  }

  if (HASHED.test(url.pathname)) {
    event.respondWith(caches.match(request).then((hit) => hit || fromNetwork(request)));
  } else if (FRESH.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => {
        const update = fromNetwork(request);
        if (!hit) return update;
        event.waitUntil(update.catch(() => undefined));
        return hit;
      }),
    );
  }
});

// "Save this section offline": the page posts a list of URLs to cache
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "cache-urls" || !Array.isArray(data.urls)) return;
  const urls = data.urls.filter((u) => typeof u === "string" && u.startsWith("/")).slice(0, 400);
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled(urls.map((u) => c.add(u))))
      .then((r) => event.source && event.source.postMessage({ type: "cached", ok: r.filter((x) => x.status === "fulfilled").length, total: urls.length })),
  );
});
