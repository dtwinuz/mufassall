import { defineLesson } from "@mufassall/scene-schema";

/**
 * Search suggestions as you type, built step by step: the budget per keystroke, the slow
 * `LIKE 'pre%'`, a trie with precomputed top-k, prefix shards, debounce + CDN, an offline
 * pipeline with an atomic index swap, a small real-time layer for trends, filtering and the
 * price of personalization. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "design-search-autocomplete",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "backend-rps", unit: "/s", better: "down" },
    { id: "staleness", unit: "s", better: "down" },
    { id: "bad", unit: "/day", better: "down" },
  ],
  steps: [
    {
      id: "estimate",
      kind: "case",
      nodes: {
        user: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 4], load: 20 },
        db: { kind: "db", at: [8, 4], load: 30 },
      },
      edges: {
        type: { from: "user", to: "api", rate: 4 },
        reply: { from: "api", to: "user", flow: "ack", rate: 4 },
        read: { from: "api", to: "db", rate: 4 },
      },
      metrics: { p95: 60, "backend-rps": 3500 },
      focus: ["user", "api"],
      exchange: {
        edge: "type",
        request: {
          format: "http",
          head: "GET /suggest?q=ip&lang=en HTTP/1.1",
          headers: [["Host", "api.example.com"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "q": "ip",
  "suggestions": [
    "iphone 15",
    "ipad air",
    "ip address lookup"
  ],
  "took_ms": 38
}`,
        },
        marks: ["q", "suggestions", "took_ms"],
      },
    },
    {
      id: "like",
      kind: "problem",
      nodes: { api: { load: 55 }, db: { state: "slow", load: 97 } },
      edges: { read: { rate: 10 } },
      metrics: { p95: 900 },
      focus: ["api", "db"],
      exchange: {
        edge: "read",
        request: {
          format: "sql",
          head: "EXPLAIN ANALYZE",
          body: "SELECT query FROM search_queries\n WHERE query LIKE 'ip%'\n ORDER BY hits DESC\n LIMIT 10;",
        },
        response: {
          format: "text",
          head: "Limit  (actual time=611.4..611.5 rows=10)",
          body: "  -> Sort  (top-N heapsort)\n    -> Index Scan using queries_prefix_idx\n         rows=1840215\nExecution Time: 612.9 ms",
        },
        marks: ["EXPLAIN", "LIKE", "ORDER BY", "rows", "Execution Time"],
      },
    },
    {
      id: "trie",
      kind: "fix",
      nodes: {
        db: null,
        index: { kind: "cache", at: [8, 1], load: 60 },
        api: { load: 30 },
      },
      edges: { lookup: { from: "api", to: "index", rate: 4 } },
      metrics: { p95: 25, staleness: 86400 },
      focus: ["api", "index"],
      exchange: {
        edge: "lookup",
        request: { format: "text", head: 'lookup prefix="ip"' },
        response: {
          format: "text",
          head: "walk   root -> i -> p   (2 hops)",
          body: "node   p.top_k, built offline, k=10\n  1  iphone 15          98 120\n  2  ipad air           61 002\n  3  ip address lookup  40 877\ntime   0.03 ms",
        },
        marks: ["walk", "top_k", "time"],
      },
    },
    {
      id: "shard",
      kind: "fix",
      nodes: {
        index: { load: 45 },
        index2: { kind: "cache", at: [8, 7], load: 45 },
      },
      edges: { lookup2: { from: "api", to: "index2", rate: 4 } },
      metrics: { p95: 20 },
      focus: ["api", "index", "index2"],
      exchange: {
        edge: "lookup",
        request: { format: "text", head: "shard map v7  (split by traffic, not alphabet)" },
        response: {
          format: "text",
          head: '[a, iq)  -> idx-1   heap 29 GB   49% of traffic',
          body: '[iq, z]  -> idx-2   heap 31 GB   51% of traffic\nevery range: 3 replicas behind the router\nprefix "ip" -> idx-1',
        },
        marks: ["shard map", "heap", "replicas"],
      },
    },
    {
      id: "keystrokes",
      kind: "problem",
      nodes: { api: { state: "slow", load: 92 }, index: { load: 80 }, index2: { load: 80 } },
      edges: { type: { rate: 12 }, reply: { rate: 12 }, lookup: { rate: 8 }, lookup2: { rate: 8 } },
      metrics: { p95: 180, "backend-rps": 14000 },
      focus: ["user", "api"],
      exchange: {
        edge: "type",
        request: {
          format: "text",
          head: "18:14:02.110 GET /suggest?q=i",
          body: "18:14:02.160 GET /suggest?q=ip\n18:14:02.205 GET /suggest?q=iph\n18:14:02.251 GET /suggest?q=ipho\n18:14:02.290 GET /suggest?q=iphon\n18:14:02.334 GET /suggest?q=iphone\n-- 6 requests in 224 ms, the user read one list\n-- the reply for q=iph arrived after q=iphone",
        },
        marks: ["q", "6 requests", "arrived after"],
      },
    },
    {
      id: "edge",
      kind: "fix",
      nodes: {
        cdn: { kind: "cdn", at: [2, 1], load: 40 },
        api: { state: "ok", load: 35 },
        index: { load: 35 },
        index2: { load: 35 },
      },
      edges: {
        type: null,
        reply: null,
        ask: { from: "user", to: "cdn", rate: 6 },
        back: { from: "cdn", to: "user", flow: "ack", rate: 6 },
        origin: { from: "cdn", to: "api", rate: 3 },
        lookup: { rate: 3 },
        lookup2: { rate: 3 },
      },
      metrics: { p95: 30, "backend-rps": 3200 },
      focus: ["user", "cdn", "api"],
      exchange: {
        edge: "ask",
        request: {
          format: "http",
          head: "GET /suggest?q=ip&lang=en HTTP/1.1",
          headers: [["Host", "api.example.com"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Cache-Control", "public, max-age=300"],
            ["Age", "41"],
            ["X-Cache", "HIT"],
          ],
          body: `{
  "q": "ip",
  "suggestions": ["iphone 15", "ipad air"]
}`,
        },
        marks: ["lang", "Cache-Control", "Age", "X-Cache"],
      },
    },
    {
      id: "pipeline",
      kind: "fix",
      nodes: {
        queue: { kind: "queue", at: [4, 8], load: 30 },
        agg: { kind: "worker", at: [7, 11], load: 50 },
        storage: { kind: "storage", at: [12, 8] },
      },
      edges: {
        log: { from: "api", to: "queue", rate: 3, mode: "async" },
        consume: { from: "queue", to: "agg", rate: 3 },
        build: { from: "agg", to: "storage", rate: 1 },
      },
      focus: ["queue", "agg", "storage"],
      exchange: {
        edge: "build",
        request: {
          format: "json",
          head: "agg output  window=2026-11-17T08:00Z/1h",
          body: `{
  "query": "iphone 15 case",
  "lang": "en",
  "hits_1h": 4821,
  "users_1h": 3907,
  "decay": 0.92,
  "score": 18233.6
}`,
        },
        marks: ["query", "users_1h", "decay", "score"],
      },
    },
    {
      id: "swap",
      kind: "fix",
      nodes: { index: { load: 50 }, index2: { load: 50 } },
      edges: {
        load: { from: "storage", to: "index", rate: 1 },
        load2: { from: "storage", to: "index2", rate: 1 },
      },
      metrics: { staleness: 3600 },
      focus: ["storage", "index", "index2"],
      exchange: {
        edge: "load",
        request: {
          format: "text",
          head: "10:05:12 idx-1 loaded snapshot trie-2026-11-17T09 (29.4 GB, 41 s)",
          body: "10:05:12 idx-1 checksum ok, warmed 2 000 hot prefixes\n10:05:13 idx-1 swap pointer T08 -> T09 (atomic)\n10:05:13 idx-1 freed T08 after 0 in-flight reads",
        },
        marks: ["snapshot", "checksum", "atomic", "in-flight"],
      },
    },
    {
      id: "trending",
      kind: "fix",
      nodes: { trend: { kind: "cache", at: [0, 9], load: 25 } },
      edges: {
        stream: { from: "queue", to: "trend", rate: 4 },
        hot: { from: "api", to: "trend", rate: 3 },
      },
      metrics: { staleness: 60, bad: 140 },
      focus: ["queue", "trend", "api"],
      exchange: {
        edge: "hot",
        request: { format: "text", head: 'trend.match prefix="st" window=5m' },
        response: {
          format: "text",
          head: "storm warning    1 812 / 5m   x46 vs usual",
          body: 'stock market       402 / 5m   x1.1\nmerge with idx top_k for "st":\n  storm warning enters at #2',
        },
        marks: ["window", "x46", "merge"],
      },
    },
    {
      id: "filter",
      kind: "fix",
      nodes: { trend: { load: 20 } },
      edges: { stream: { rate: 3 }, build: { rate: 1 } },
      metrics: { bad: 3 },
      focus: ["trend", "agg"],
      exchange: {
        edge: "stream",
        request: { format: "text", head: 'filter  drop "cheap pills now" from trend:en' },
        response: {
          format: "text",
          head: "rule       blocklist match (spam)",
          body: "source     3 accounts, 1 IP range, 9 400 hits\nmin_users  50 distinct users before any query shows\nalso       hate, adult, personal data like phone numbers",
        },
        marks: ["blocklist", "min_users", "distinct", "personal data"],
      },
    },
    {
      id: "personal",
      kind: "case",
      nodes: { api: { load: 40 }, cdn: { load: 35 } },
      edges: { origin: { rate: 4 } },
      metrics: { p95: 35, "backend-rps": 3600 },
      focus: ["user", "cdn", "api"],
      exchange: {
        edge: "ask",
        request: {
          format: "http",
          head: "GET /suggest?q=iph&lang=en HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Cookie", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [["Cache-Control", "private, max-age=60"]],
          body: `{
  "q": "iph",
  "suggestions": [
    "iphone 15 case",
    "iphone 15"
  ],
  "personal": true
}`,
        },
        marks: ["iph", "Cache-Control", "personal"],
        masked: ["Cookie"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
