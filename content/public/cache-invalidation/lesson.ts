import { defineLesson } from "@mufassall/scene-schema";

/**
 * An account API caches each account's plan in front of the database (cache-aside, TTL 600 s).
 * A TTL alone leaves a paying customer on the old plan for minutes; delete-after-write fixes the
 * common case but leaves a race (a reader loads the old row, the writer deletes, the reader fills
 * the cache with the old row). Delete twice narrows it, a lease closes it. Writers that bypass the
 * API are caught by invalidation from the database change log (CDC). Then the read side: a hot key
 * served stale while one request revalidates, and negative caching for rows that do not exist.
 * Numbers are a model scenario: 15 000 reads/s, 120 000 active accounts.
 */
export default defineLesson({
  slug: "cache-invalidation",
  level: "advanced",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "stale", unit: "/day", better: "down" },
    { id: "age", unit: "s", better: "down" },
    { id: "dbreads", unit: "/s", better: "down" },
    { id: "hit", unit: "%", better: "up" },
    { id: "p99", unit: "ms", better: "down" },
  ],
  steps: [
    {
      id: "setup",
      kind: "case",
      nodes: {
        app: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 4] },
        cache: { kind: "cache", at: [8, 1] },
        db: { kind: "db", at: [8, 8] },
      },
      edges: {
        req: { from: "app", to: "api", rate: 6, mode: "call" },
        get: { from: "api", to: "cache", rate: 6, mode: "call" },
        query: { from: "api", to: "db", rate: 1, mode: "call" },
      },
      metrics: { stale: 0, age: 0, dbreads: 900, hit: 94, p99: 6 },
      focus: ["api", "cache", "db"],
      exchange: {
        edge: "req",
        request: {
          format: "http",
          head: "GET /v1/accounts/4821/plan HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["X-Cache", "HIT"],
            ["Age", "212"],
          ],
          body: `{
  "account_id": 4821,
  "plan": "free",
  "seats": 3
}`,
        },
        marks: ["X-Cache", "Age", "plan", "seats"],
        masked: ["Authorization"],
      },
    },
    {
      id: "ttl-only",
      kind: "problem",
      nodes: { cache: { state: "slow" } },
      metrics: { stale: 2400, age: 600 },
      focus: ["cache", "db"],
      exchange: {
        edge: "get",
        request: {
          format: "text",
          head: "10:00:00  UPDATE accounts SET plan = 'pro' WHERE id = 4821;  COMMIT",
          body: "10:00:01  GET acct:4821:plan  -> \"free\"   TTL 588 s\n10:04:30  GET acct:4821:plan  -> \"free\"   TTL 318 s\n10:09:48  GET acct:4821:plan  -> (nil)    expired, reload from the db\n10:09:48  SET acct:4821:plan \"pro\" EX 600\n-- paid at 10:00, Pro features from 10:09:48",
        },
        marks: ["COMMIT", "TTL", "expired", "Pro features"],
      },
    },
    {
      id: "delete",
      kind: "fix",
      nodes: { cache: { state: "ok" } },
      metrics: { stale: 0, age: 0 },
      focus: ["api", "db", "cache"],
      exchange: {
        edge: "query",
        request: {
          format: "text",
          head: "PATCH /v1/accounts/4821/plan  {\"plan\": \"pro\"}",
          body: "1  BEGIN\n2  UPDATE accounts SET plan = 'pro', version = 18 WHERE id = 4821\n3  COMMIT                         2 ms\n4  DEL acct:4821:plan             (integer) 1\n-- the next GET misses and reads 'pro' from the db",
        },
        marks: ["version", "COMMIT", "DEL", "misses"],
      },
    },
    {
      id: "race",
      kind: "problem",
      nodes: { cache: { state: "slow" } },
      edges: { get: { flow: "dup" } },
      metrics: { stale: 40, age: 600 },
      focus: ["api", "cache", "db"],
      exchange: {
        edge: "get",
        request: {
          format: "text",
          head: "acct:4821:plan  two requests, one key",
          body: "10:00:00.000  R  GET acct:4821:plan             -> (nil)  miss\n10:00:00.002  R  SELECT plan ... WHERE id = 4821  -> 'free'  (old row)\n10:00:00.004  R  GC pause 180 ms\n10:00:00.050  W  UPDATE ... plan = 'pro'; COMMIT\n10:00:00.051  W  DEL acct:4821:plan             -> (integer) 0\n10:00:00.184  R  SET acct:4821:plan \"free\" EX 600\n-- the cache says free until 10:10, the db says pro",
        },
        marks: ["miss", "old row", "GC pause", "COMMIT", "(integer) 0", "SET"],
      },
    },
    {
      id: "double-delete",
      kind: "fix",
      edges: { get: { flow: "request" } },
      metrics: { stale: 3 },
      focus: ["api", "cache"],
      exchange: {
        edge: "get",
        request: {
          format: "text",
          head: "W  COMMIT; DEL acct:4821:plan; schedule DEL in 500 ms",
          body: "10:00:00.184  R  SET acct:4821:plan \"free\" EX 600\n10:00:00.551  W  DEL acct:4821:plan  -> (integer) 1   removes R's old value\n-- a reader slower than 500 ms (long GC, retry, lagging replica) still wins\n-- stale fills: 40/day -> 3/day",
        },
        marks: ["schedule DEL", "(integer) 1", "slower than 500 ms", "3/day"],
      },
    },
    {
      id: "lease",
      kind: "fix",
      nodes: { cache: { state: "ok" } },
      metrics: { stale: 0, age: 0 },
      focus: ["api", "cache"],
      exchange: {
        edge: "get",
        request: {
          format: "text",
          head: "R  get acct:4821:plan  -> MISS, lease 7731",
          body: "R  SELECT plan  -> 'free'  (old row), GC pause\nW  COMMIT; delete acct:4821:plan  -> lease 7731 invalidated\nR  set acct:4821:plan \"free\" lease=7731  -> NOT_STORED\nnext reader  get  -> MISS, lease 7732  -> 'pro'  -> STORED\n-- a second reader during an open lease: wait 10 ms or take the old value",
        },
        marks: ["lease 7731", "invalidated", "NOT_STORED", "STORED", "wait 10 ms"],
      },
    },
    {
      id: "bypass",
      kind: "problem",
      nodes: { batch: { kind: "worker", at: [4, 10] } },
      edges: { direct: { from: "batch", to: "db", rate: 2 } },
      metrics: { stale: 1900, age: 600 },
      focus: ["batch", "db", "cache"],
      exchange: {
        edge: "direct",
        request: {
          format: "sql",
          head: "-- billing job, 02:00 every night",
          body: "UPDATE accounts SET plan = 'free', version = version + 1\n WHERE plan = 'pro' AND paid_until < now();\n-- UPDATE 1900\n-- no DEL: the job does not know the cache exists",
        },
        marks: ["UPDATE", "paid_until", "UPDATE 1900", "no DEL"],
      },
    },
    {
      id: "cdc",
      kind: "fix",
      nodes: { cdc: { kind: "worker", at: [12, 4] } },
      edges: {
        tail: { from: "cdc", to: "db", rate: 2, mode: "async" },
        evict: { from: "cdc", to: "cache", rate: 2 },
      },
      metrics: { stale: 0, age: 0 },
      focus: ["db", "cdc", "cache"],
      exchange: {
        edge: "tail",
        request: {
          format: "json",
          head: "change  accounts  lsn 0/5B10A2C8",
          body: `{
  "op": "u",
  "table": "accounts",
  "key": { "id": 4821 },
  "after": { "plan": "free", "version": 19 },
  "committed_at": "02:00:04.310"
}`,
        },
        response: {
          format: "text",
          head: "DEL acct:4821:plan acct:4821:limits  -> (integer) 2",
          body: "41 ms after the commit; offset committed after the DEL",
        },
        marks: ["op", "key", "version", "committed_at", "(integer) 2", "41 ms"],
      },
    },
    {
      id: "hot-expire",
      kind: "problem",
      nodes: { api: { state: "slow", load: 95 } },
      edges: { req: { flow: "fail" } },
      metrics: { p99: 140 },
      focus: ["app", "api", "cache"],
      exchange: {
        edge: "get",
        request: {
          format: "text",
          head: "11:00:00.000  config:tariffs  expired  (read 18 000/s by every request)",
          body: "11:00:00.000  SET lock:config:tariffs NX PX 2000  -> OK   one rebuild\n11:00:00.000  other requests: lock taken, wait for the new value\n11:00:00.120  rebuild done: 4 joins, 120 ms\n-- 18 000/s x 0.12 s = 2 160 requests stalled\n-- p99 6 ms -> 140 ms, every 10 minutes",
        },
        marks: ["expired", "NX", "wait", "120 ms", "2 160 requests"],
      },
    },
    {
      id: "swr",
      kind: "fix",
      nodes: { api: { state: "ok", load: 60 } },
      edges: { req: { flow: "request" } },
      metrics: { p99: 6 },
      focus: ["api", "cache"],
      exchange: {
        edge: "get",
        request: {
          format: "json",
          head: "GET config:tariffs   (EX 3600)",
          body: `{
  "fresh_until": "11:00:00",
  "built_at": "10:50:00",
  "value": { "plans": 4, "currency": "UZS" }
}`,
        },
        response: {
          format: "text",
          head: "11:00:00.001  past fresh_until: answer with this value now",
          body: "11:00:00.001  SET lock:config:tariffs NX PX 5000  -> OK  refresh in background\n11:00:00.121  SET config:tariffs {fresh_until 11:10:37 ...} EX 3600\n-- soft TTL 600 s + jitter 0..60 s, hard TTL 3600 s",
        },
        marks: ["fresh_until", "built_at", "answer with this value now", "background", "jitter"],
      },
    },
    {
      id: "negative",
      kind: "fix",
      metrics: { hit: 98, dbreads: 300 },
      focus: ["api", "cache", "db"],
      exchange: {
        edge: "get",
        request: {
          format: "text",
          head: "GET acct:4821:limits  -> (nil)",
          body: "SELECT * FROM custom_limits WHERE account_id = 4821  -> 0 rows\nSET acct:4821:limits \"none\" EX 60\nnext GET  -> \"none\"   no db query\n-- 96% of accounts have no custom limits row\n-- before: 600 of the 900 db reads/s found nothing",
        },
        marks: ["(nil)", "0 rows", "none", "EX 60", "found nothing"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "event-lost",
      from: "cdc",
      steps: [
        {
          id: "lost-drop",
          kind: "problem",
          nodes: { cache: { state: "down" } },
          edges: { evict: { flow: "fail" } },
          metrics: { stale: 260, age: 600 },
          focus: ["cdc", "cache"],
          exchange: {
            edge: "evict",
            request: {
              format: "text",
              head: "14:20:00  cache primary failover, 4 s",
              body: "14:20:01  DEL acct:5110:plan  -> timeout 500 ms\n14:20:01  log.warn(\"evict failed\"); commit offset; next event\n14:20:04  failover done, DELs work again\n-- 260 changes in these 4 s, their old values stay up to 600 s",
            },
            marks: ["timeout", "commit offset", "260 changes"],
          },
        },
        {
          id: "lost-retry",
          kind: "fix",
          nodes: { cache: { state: "ok" } },
          edges: { evict: { flow: "retry" } },
          metrics: { stale: 0, age: 6 },
          focus: ["cdc", "cache"],
          exchange: {
            edge: "evict",
            request: {
              format: "text",
              head: "14:20:01  DEL acct:5110:plan  -> timeout",
              body: "14:20:01  retry in 0.2 s, 0.4 s, 0.8 s ... offset NOT committed\n14:20:04  DEL ok, the 260 queued changes replay in 0.3 s\n14:20:05  commit offset\n-- a repeated DEL is harmless; the longest stale read was 6 s, not 600 s",
            },
            marks: ["retry", "NOT committed", "replay", "commit offset", "harmless"],
          },
        },
      ],
    },
  ],
});
