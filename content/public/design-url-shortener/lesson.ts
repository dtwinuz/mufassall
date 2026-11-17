import { defineLesson } from "@mufassall/scene-schema";

/**
 * A link shortener built step by step: estimates, short codes, the redirect, then cache,
 * replicas, a click queue, custom aliases and expiry. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "design-url-shortener",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "p99", unit: "ms", better: "down" },
    { id: "primary-reads", unit: "/s", better: "down" },
    { id: "collisions", unit: "/day", better: "down" },
  ],
  steps: [
    {
      id: "estimate",
      kind: "case",
      nodes: {
        user: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 4], load: 10 },
        db: { kind: "db", at: [8, 4], load: 10 },
      },
      edges: {
        create: { from: "user", to: "api", rate: 1 },
        write: { from: "api", to: "db", rate: 1 },
        visit: { from: "user", to: "api", rate: 3 },
        answer: { from: "api", to: "user", flow: "ack", rate: 3 },
        read: { from: "api", to: "db", rate: 3 },
      },
      metrics: { p99: 30, "primary-reads": 300, collisions: 0 },
      focus: ["user", "api"],
      exchange: {
        edge: "create",
        request: {
          format: "json",
          head: "POST /api/links HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Content-Type", "application/json"],
          ],
          body: `{
  "long_url": "https://shop.example.com/sale/42"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          body: `{
  "code": "8sujL",
  "short_url": "https://sho.example/8sujL"
}`,
        },
        marks: ["long_url", "code", "short_url"],
      },
    },
    {
      id: "hash",
      kind: "problem",
      edges: { write: { flow: "fail" } },
      metrics: { collisions: 40 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "INSERT INTO links (code, long_url)",
          body: "VALUES ('q7Bx2Lm', 'https://b.example.org/x');",
        },
        response: {
          format: "text",
          head: "ERROR: duplicate key value",
          body: 'violates unique constraint "links_pkey"',
        },
        marks: ["q7Bx2Lm", "duplicate key"],
      },
    },
    {
      id: "counter",
      kind: "fix",
      edges: { write: { flow: "request" } },
      metrics: { collisions: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "UPDATE id_blocks SET next_id = next_id + 1000",
          body: "WHERE name = 'links'\nRETURNING next_id;",
        },
        response: { format: "text", head: "next_id = 125001000" },
        marks: ["next_id", "RETURNING"],
      },
    },
    {
      id: "redirect",
      kind: "case",
      edges: { visit: { rate: 5 }, answer: { rate: 5 }, read: { rate: 5 } },
      metrics: { "primary-reads": 600 },
      focus: ["user", "api"],
      exchange: {
        edge: "visit",
        request: {
          format: "http",
          head: "GET /8sujL HTTP/1.1",
          headers: [["Host", "sho.example"]],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 302 Found",
          headers: [
            ["Location", "https://shop.example.com/sale/42"],
            ["Cache-Control", "private, max-age=0"],
          ],
        },
        marks: ["302", "Location", "Cache-Control"],
      },
    },
    {
      id: "read-flood",
      kind: "problem",
      nodes: { api: { load: 70 }, db: { state: "slow", load: 96 } },
      edges: { visit: { rate: 10 }, answer: { rate: 10 }, read: { rate: 10 } },
      metrics: { p99: 900, "primary-reads": 4000 },
      focus: ["db"],
      exchange: {
        edge: "read",
        request: {
          format: "sql",
          head: "SELECT long_url, expires_at FROM links",
          body: "WHERE code = '8sujL';",
        },
        response: { format: "text", head: "(1 row)", body: "Time: 870.412 ms" },
        marks: ["code", "Time"],
      },
    },
    {
      id: "cache",
      kind: "fix",
      nodes: {
        cache: { kind: "cache", at: [8, 0], load: 35 },
        api: { load: 45 },
        db: { state: "ok", load: 25 },
      },
      edges: { lookup: { from: "api", to: "cache", rate: 10 }, read: { rate: 2 } },
      metrics: { p99: 15, "primary-reads": 400 },
      focus: ["api", "cache"],
      exchange: {
        edge: "lookup",
        request: { format: "text", head: "GET link:8sujL" },
        response: { format: "text", head: '"https://shop.example.com/sale/42"' },
        marks: ["GET", "link"],
      },
    },
    {
      id: "replicas",
      kind: "fix",
      nodes: { replica: { kind: "db", at: [9, 8], load: 20 }, db: { load: 15 } },
      edges: {
        read: null,
        "replica-read": { from: "api", to: "replica", rate: 2 },
        sync: { from: "db", to: "replica", rate: 2 },
      },
      metrics: { p99: 12, "primary-reads": 20 },
      focus: ["db", "replica"],
      exchange: {
        edge: "sync",
        request: {
          format: "sql",
          head: "SELECT now() - pg_last_xact_replay_timestamp()",
          body: "AS lag;",
        },
        response: { format: "text", head: "lag = 00:00:00.180" },
        marks: ["lag"],
      },
    },
    {
      id: "click-count",
      kind: "problem",
      nodes: { db: { state: "slow", load: 92 } },
      edges: { write: { rate: 10 } },
      metrics: { p99: 320 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "UPDATE links SET clicks = clicks + 1",
          body: "WHERE code = '8sujL';",
        },
        response: { format: "text", head: "UPDATE 1", body: "Time: 312.880 ms (lock wait)" },
        marks: ["clicks", "lock wait"],
      },
    },
    {
      id: "click-queue",
      kind: "fix",
      nodes: {
        queue: { kind: "queue", at: [4, 9], load: 30 },
        worker: { kind: "worker", at: [8, 11], load: 40 },
        stats: { kind: "db", at: [12, 11], load: 20 },
        db: { state: "ok", load: 15 },
      },
      edges: {
        write: { rate: 1 },
        event: { from: "api", to: "queue", rate: 10 },
        consume: { from: "queue", to: "worker", rate: 10 },
        flush: { from: "worker", to: "stats", rate: 2 },
      },
      metrics: { p99: 12 },
      focus: ["queue", "worker", "stats"],
      exchange: {
        edge: "event",
        request: {
          format: "json",
          head: "PRODUCE clicks key=8sujL partition=7",
          body: `{
  "code": "8sujL",
  "ts": 1795400112345,
  "referer": "news.example.net",
  "country": "UZ"
}`,
        },
        response: { format: "text", head: "ack offset=88341201" },
        marks: ["partition", "ts", "country", "offset"],
      },
    },
    {
      id: "alias",
      kind: "case",
      edges: { create: { rate: 2 }, answer: { flow: "fail" } },
      focus: ["user", "api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "INSERT INTO links (code, long_url, expires_at)",
          body: "VALUES ('spring-sale', 'https://shop.example.com/s',\n        '2026-12-31')\nON CONFLICT (code) DO NOTHING\nRETURNING code;",
        },
        response: { format: "text", head: "(0 rows)", body: "-> HTTP 409 alias taken" },
        marks: ["spring-sale", "ON CONFLICT", "409"],
      },
    },
    {
      id: "expiry",
      kind: "fix",
      edges: {
        answer: { flow: "ack" },
        purge: { from: "worker", to: "db", rate: 1 },
      },
      focus: ["cache", "worker"],
      exchange: {
        edge: "lookup",
        request: { format: "text", head: "SET link:spring-sale https://shop.example.com/s EX 3600" },
        response: { format: "text", head: "OK" },
        marks: ["EX"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
