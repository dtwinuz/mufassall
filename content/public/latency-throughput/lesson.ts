import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

const search: WireMessage = {
  format: "http",
  head: "GET /search?q=lamp HTTP/1.1",
  headers: [
    ["Host", "api.example.com"],
    ["X-Request-Id", "req_4410"],
  ],
};

/**
 * A search API under growing traffic. Numbers are a model scenario, not measurements;
 * the player says so under the scene.
 */
export default defineLesson({
  slug: "latency-throughput",
  level: "beginner",
  minutes: 11,
  tier: "public",
  metrics: [
    { id: "rps", unit: "/s", better: "up" },
    { id: "p50", unit: "ms", better: "down" },
    { id: "p99", unit: "ms", better: "down" },
    { id: "errors", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "one",
      kind: "case",
      nodes: {
        users: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 4], load: 5 },
        db: { kind: "db", at: [8, 4] },
      },
      edges: {
        req: { from: "users", to: "api", rate: 1 },
        resp: { from: "api", to: "users", flow: "ack", rate: 1 },
        sql: { from: "api", to: "db", rate: 1 },
      },
      metrics: { rps: 5, p50: 41, p99: 60, errors: 0 },
      focus: ["users", "api"],
      exchange: {
        edge: "req",
        request: search,
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [["Server-Timing", "app;dur=29, db;dur=12"]],
        },
        marks: ["X-Request-Id", "Server-Timing"],
      },
    },
    {
      id: "throughput",
      kind: "case",
      nodes: { api: { load: 40 } },
      edges: { req: { rate: 6 }, resp: { rate: 6 }, sql: { rate: 6 } },
      metrics: { rps: 200 },
      focus: ["api"],
      exchange: {
        edge: "req",
        request: {
          format: "text",
          head: "load test: 60 s",
          body: "requests: 12000\nthroughput: 200/s\nlatency p50: 41 ms\nin flight: 8",
        },
        marks: ["throughput", "in flight"],
      },
    },
    {
      id: "averages",
      kind: "problem",
      metrics: { p99: 1900 },
      focus: ["users", "api"],
      exchange: {
        edge: "req",
        request: {
          format: "text",
          head: "access log, last 10000 requests",
          body: "avg: 62 ms\np50: 41 ms\np95: 120 ms\np99: 1900 ms\nmax: 2300 ms",
        },
        marks: ["avg", "p50", "p95", "p99"],
      },
    },
    {
      id: "hot-row",
      kind: "problem",
      nodes: { db: { state: "slow" } },
      focus: ["api", "db"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "UPDATE search_stats SET hits = hits + 1",
          body: "WHERE q = 'lamp';",
        },
        response: { format: "text", head: "UPDATE 1", body: "lock wait: 1790 ms" },
        marks: ["hits", "lock wait"],
      },
    },
    {
      id: "rush",
      kind: "problem",
      nodes: { api: { load: 93, state: "slow" } },
      edges: { req: { rate: 10 }, resp: { rate: 9 }, sql: { rate: 9 } },
      metrics: { rps: 440, p50: 180, p99: 4200 },
      focus: ["api"],
      exchange: {
        edge: "req",
        request: search,
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [["Server-Timing", "queue;dur=139, app;dur=41"]],
        },
        marks: ["Server-Timing"],
      },
    },
    {
      id: "knee",
      kind: "case",
      focus: ["api"],
    },
    {
      id: "retries",
      kind: "problem",
      nodes: { api: { load: 100 } },
      edges: { req: { flow: "retry", rate: 12 }, resp: { rate: 7 } },
      metrics: { rps: 380, p99: 3000, errors: 7 },
      focus: ["users", "api"],
      exchange: {
        edge: "req",
        request: {
          format: "text",
          head: "GET /search?q=lamp",
          body: "attempt 1: timeout after 3000 ms\nattempt 2: timeout after 3000 ms\nattempt 3: 200 OK in 2410 ms",
        },
        marks: ["timeout", "attempt 3"],
      },
    },
    {
      id: "shed",
      kind: "fix",
      nodes: { api: { load: 85, state: "ok" } },
      edges: { req: { flow: "request", rate: 10 }, resp: { rate: 9 } },
      metrics: { rps: 420, p50: 48, p99: 900, errors: 4 },
      focus: ["api"],
      exchange: {
        edge: "req",
        request: search,
        response: {
          format: "http",
          head: "HTTP/1.1 503 Service Unavailable",
          headers: [
            ["Retry-After", "2"],
            ["Content-Length", "0"],
          ],
        },
        marks: ["503", "Retry-After"],
      },
    },
    {
      id: "off-path",
      kind: "fix",
      nodes: {
        api: { load: 48 },
        db: { state: "ok" },
        counter: { kind: "cache", at: [4, 8] },
      },
      edges: { resp: { rate: 10 }, incr: { from: "api", to: "counter", rate: 10 }, sql: { rate: 10 } },
      metrics: { rps: 450, p50: 22, p99: 85, errors: 0 },
      focus: ["api", "counter"],
      exchange: {
        edge: "incr",
        request: { format: "text", head: "INCR search:lamp:hits" },
        response: { format: "text", head: "(integer) 51207" },
        marks: ["INCR", "integer"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
