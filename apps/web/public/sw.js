// Offline support, same-origin GET only.
// Pages: network first, the cached copy when offline. Stored under the URL without its query,
//   so /<lang>/l/x/?step=1..N is one entry, not N.
// Hashed assets (/_astro/*, fonts included): cache first, a name never changes its content.
// Unhashed files (every *.js, *.json, *.webmanifest, *.svg at the root or under /<lang>/:
//   small scripts, search index, review cards): served from cache, refreshed in the background.
// The cache keeps one name; it stays bounded by pruning /_astro/* files no cached page still
// needs (on activate and after "save offline"), so old builds do not pile up.
const CACHE = "mufassall-v1";
const HASHED = /^\/_astro\//;
const FRESH = /^\/(?:[a-z]{2}\/)?[\w.\-]+\.(?:js|json|webmanifest|svg)$/;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => tidy())
      .catch(() => undefined),
  );
});

// a page is any path that is not a file: /uz/, /uz/l/caching/
const isPage = (path) => path.endsWith("/") && !HASHED.test(path);
const pageKey = (url) => new URL(url.pathname, url.origin).href;

async function fromNetwork(request, key) {
  const res = await fetch(request);
  // a redirected response cannot answer a later navigation, so it is not stored
  if (res.ok && res.type === "basic" && !res.redirected) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(key || request, copy));
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const key = pageKey(url);
    event.respondWith(
      fromNetwork(request, key).catch(async () => {
        const cache = await caches.open(CACHE);
        // the same page (any ?step=), then the language home, then nothing
        const page = (await cache.match(key)) || (await cache.match(request, { ignoreSearch: true }));
        if (page) return page;
        const lang = url.pathname.split("/")[1] || "uz";
        return (await cache.match(`/${lang}/`)) || Response.error();
      }),
    );
    return;
  }

  if (HASHED.test(url.pathname)) {
    event.respondWith(caches.match(request).then((hit) => hit || fromNetwork(request)));
  } else if (FRESH.test(url.pathname) && url.pathname !== "/sw.js") {
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

// /_astro/ files a text (HTML, CSS or JS) points to; inside /_astro/ files "./x" is a sibling
function refsOf(text, inAstro) {
  const out = [];
  for (const m of text.matchAll(/\/_astro\/([\w.\-]+)/g)) out.push(m[1]);
  if (inAstro) for (const m of text.matchAll(/["'(]\.\/([\w.\-]+\.(?:js|css|woff2?|svg|png|webp|jpg))/g)) out.push(m[1]);
  return out;
}

// One pass over the cache:
// 1. pages stored with a query (older versions of this worker) move to their bare URL;
// 2. /_astro/* entries that no cached page reaches (directly or through CSS/JS imports) are deleted.
async function tidy() {
  const cache = await caches.open(CACHE);
  const reqs = await cache.keys();
  const pages = [];
  const assets = new Map();
  for (const req of reqs) {
    const url = new URL(req.url);
    if (HASHED.test(url.pathname)) assets.set(url.pathname.slice("/_astro/".length), req);
    else if (isPage(url.pathname)) {
      if (url.search) {
        const bare = pageKey(url);
        if (!(await cache.match(bare))) {
          const res = await cache.match(req);
          if (res) await cache.put(bare, res);
        }
        await cache.delete(req);
        if (!pages.includes(bare)) pages.push(bare);
      } else if (!pages.includes(req.url)) pages.push(req.url);
    }
  }
  if (!pages.length) return; // nothing to measure against: keep everything

  const keep = new Set();
  const todo = [];
  for (const p of pages) {
    const res = await cache.match(p);
    if (res) todo.push(...refsOf(await res.text(), false));
  }
  while (todo.length) {
    const name = todo.pop();
    if (keep.has(name)) continue;
    keep.add(name);
    const req = assets.get(name);
    if (!req || !/\.(?:js|css)$/.test(name)) continue;
    const res = await cache.match(req);
    if (res) todo.push(...refsOf(await res.text(), true));
  }
  await Promise.all([...assets].filter(([name]) => !keep.has(name)).map(([, req]) => cache.delete(req)));
}

// "Save the course offline": the page posts a list of URLs to cache
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "cache-urls" || !Array.isArray(data.urls)) return;
  const urls = data.urls.filter((u) => typeof u === "string" && u.startsWith("/") && !u.startsWith("//")).slice(0, 400);
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        Promise.allSettled(
          urls.map((u) => {
            const url = new URL(u, self.location.origin);
            // pages under their bare URL, the same key the fetch handler uses
            if (!isPage(url.pathname)) return c.add(url.href);
            return fetch(url.href).then((res) => {
              if (!res.ok || res.redirected) throw new Error(String(res.status));
              return c.put(pageKey(url), res);
            });
          }),
        ),
      )
      .then((r) => {
        if (event.source) event.source.postMessage({ type: "cached", ok: r.filter((x) => x.status === "fulfilled").length, total: urls.length });
        return tidy();
      })
      .catch(() => undefined),
  );
});
