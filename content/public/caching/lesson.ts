import { defineLesson } from "@mufassall/scene-schema";

/**
 * A product page API in front of a database gets a Redis cache, then learns its failure modes.
 * Numbers are a model scenario for the story, not measurements.
 */
export default defineLesson({
  slug: "caching",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "hit-ratio", unit: "%", better: "up" },
    { id: "p95", unit: "ms", better: "down" },
    { id: "db-reads", unit: "/s", better: "down" },
    { id: "stale", unit: "s", better: "down" },
  ],
  steps: [
    {
      id: "no-cache",
      kind: "problem",
      nodes: {
        client: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 4], load: 55 },
        db: { kind: "db", at: [9, 6], load: 92, state: "slow" },
      },
      edges: {
        get: { from: "client", to: "api", rate: 8 },
        sql: { from: "api", to: "db", rate: 8 },
      },
      metrics: { "hit-ratio": 0, p95: 850, "db-reads": 2400, stale: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "SELECT p.id, p.name, p.price, s.qty",
          body: "FROM products p\nJOIN stock s ON s.product_id = p.id\nWHERE p.id = 1042;",
        },
        response: { format: "text", head: "1 row in 38 ms" },
        marks: ["JOIN", "38 ms"],
      },
    },
    {
      id: "cache-aside",
      kind: "fix",
      nodes: { cache: { kind: "cache", at: [7, 1], load: 10 } },
      edges: { look: { from: "api", to: "cache", rate: 8 } },
      focus: ["api", "cache"],
      exchange: {
        edge: "look",
        request: { format: "text", head: "GET product:1042" },
        response: { format: "text", head: "(nil)" },
        marks: ["product:1042", "(nil)"],
      },
    },
    {
      id: "fill",
      kind: "fix",
      nodes: { cache: { load: 30 }, db: { load: 35, state: "ok" } },
      edges: { sql: { rate: 2 } },
      metrics: { "hit-ratio": 88, p95: 45, "db-reads": 290 },
      focus: ["api", "cache", "db"],
      exchange: {
        edge: "look",
        request: {
          format: "text",
          head: "SET product:1042 '{...}' EX 300",
        },
        response: { format: "text", head: "OK" },
        marks: ["SET", "EX"],
      },
    },
    {
      id: "hit",
      kind: "case",
      nodes: { db: { load: 20 } },
      edges: { sql: { rate: 1 } },
      metrics: { "hit-ratio": 94, p95: 12, "db-reads": 145 },
      focus: ["api", "cache"],
      exchange: {
        edge: "look",
        request: { format: "text", head: "GET product:1042" },
        response: {
          format: "json",
          head: "(bulk string, 52 bytes)",
          body: `{
  "name": "Sofa",
  "price": 4990000,
  "qty": 7
}`,
        },
        marks: ["GET", "price"],
      },
    },
    {
      id: "stale",
      kind: "problem",
      nodes: { admin: { kind: "actor", at: [0, 8] } },
      edges: { edit: { from: "admin", to: "api", rate: 1 } },
      metrics: { stale: 300 },
      focus: ["admin", "api", "cache"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "UPDATE products SET price = 4490000",
          body: "WHERE id = 1042;\nCOMMIT;",
        },
        response: { format: "text", head: "UPDATE 1" },
        marks: ["price", "COMMIT"],
      },
    },
    {
      id: "invalidate",
      kind: "fix",
      edges: { look: { rate: 9 } },
      metrics: { stale: 0, "hit-ratio": 93 },
      focus: ["api", "cache"],
      exchange: {
        edge: "look",
        request: { format: "text", head: "DEL product:1042" },
        response: { format: "text", head: "(integer) 1" },
        marks: ["DEL", "(integer) 1"],
      },
    },
    {
      id: "stampede",
      kind: "problem",
      nodes: { api: { load: 90 }, db: { load: 100, state: "slow" } },
      edges: { get: { rate: 12 }, sql: { flow: "dup", rate: 12 } },
      metrics: { "hit-ratio": 12, p95: 4200, "db-reads": 3100 },
      focus: ["cache", "db"],
      exchange: {
        edge: "sql",
        request: {
          format: "text",
          head: "08:00:00.000 key product:1042 expired",
          body: "08:00:00.004 MISS product:1042 x2814\n08:00:00.005 2814 x SELECT ... WHERE p.id = 1042",
        },
        marks: ["expired", "MISS"],
      },
    },
    {
      id: "coalesce",
      kind: "fix",
      nodes: { api: { load: 50 }, db: { load: 25, state: "ok" } },
      edges: { sql: { flow: "request", rate: 1 } },
      metrics: { "hit-ratio": 95, p95: 60, "db-reads": 150 },
      focus: ["api", "cache"],
      exchange: {
        edge: "look",
        request: { format: "text", head: "SET lock:product:1042 req_7 NX PX 2000" },
        response: {
          format: "text",
          head: "OK",
          body: "# the other 2813 callers got (nil):\n# wait 20 ms, then GET product:1042",
        },
        marks: ["NX", "PX", "(nil)"],
      },
    },
    {
      id: "jitter",
      kind: "fix",
      nodes: { db: { load: 20 } },
      metrics: { "hit-ratio": 96, p95: 14, "db-reads": 110 },
      focus: ["cache"],
      exchange: {
        edge: "look",
        request: {
          format: "text",
          head: "SET product:1042 '{...}' EX 347",
          body: "# TTL = 300 + random(0..60)",
        },
        response: { format: "text", head: "OK" },
        marks: ["EX", "random"],
      },
    },
    {
      id: "write-modes",
      kind: "case",
      nodes: { worker: { kind: "worker", at: [11, 2] } },
      edges: {
        edit: { rate: 0 },
        pull: { from: "worker", to: "cache", rate: 1 },
        flush: { from: "worker", to: "db", rate: 1 },
      },
      focus: ["cache", "worker"],
      exchange: {
        edge: "look",
        request: { format: "text", head: "INCR views:1042" },
        response: { format: "text", head: "(integer) 58213" },
        marks: ["INCR", "views:1042"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
