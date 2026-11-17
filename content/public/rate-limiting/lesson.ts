import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

/**
 * A public product API and one script that floods it. Fixed window, sliding window, token bucket,
 * 429 with Retry-After, limits per IP vs per key, and a shared counter in Redis.
 * Limit in the story: 10 requests per second per client. Numbers are a model scenario.
 */
const getProducts: WireMessage = {
  format: "http",
  head: "GET /v1/products?page=8812 HTTP/1.1",
  headers: [
    ["Host", "api.example.com"],
    ["X-Api-Key", "***"],
  ],
};

export default defineLesson({
  slug: "rate-limiting",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "errors", unit: "%", better: "down" },
    { id: "over", unit: "x", better: "down" },
  ],
  steps: [
    {
      id: "noisy",
      kind: "problem",
      nodes: {
        partner: { kind: "client", at: [0, 2] },
        bot: { kind: "client", at: [0, 8] },
        api: { kind: "service", at: [5, 5], state: "slow", load: 100 },
        db: { kind: "db", at: [9, 5], state: "slow", load: 95 },
      },
      edges: {
        "p-api": { from: "partner", to: "api", rate: 2 },
        "b-api": { from: "bot", to: "api", rate: 12 },
        query: { from: "api", to: "db", rate: 12 },
      },
      metrics: { p95: 2400, errors: 9, over: 90 },
      focus: ["bot", "api"],
      exchange: {
        edge: "b-api",
        request: getProducts,
        response: { format: "http", head: "HTTP/1.1 200 OK", headers: [["X-Response-Time", "2380 ms"]] },
        marks: ["X-Api-Key", "page", "X-Response-Time"],
        masked: ["X-Api-Key"],
      },
    },
    {
      id: "fixed-window",
      kind: "fix",
      nodes: { api: { state: "ok", load: 35 }, db: { state: "ok", load: 30 } },
      edges: { reject: { from: "api", to: "bot", flow: "fail", rate: 10 }, query: { rate: 3 } },
      metrics: { p95: 85, errors: 0, over: 1 },
      focus: ["api", "bot"],
      exchange: {
        edge: "b-api",
        request: getProducts,
        response: {
          format: "http",
          head: "HTTP/1.1 429 Too Many Requests",
          headers: [
            ["Retry-After", "1"],
            ["X-RateLimit-Limit", "10"],
            ["X-RateLimit-Remaining", "0"],
          ],
        },
        marks: ["429", "Retry-After", "X-RateLimit-Remaining"],
        masked: ["X-Api-Key"],
      },
    },
    {
      id: "boundary",
      kind: "problem",
      nodes: { api: { load: 60 }, db: { load: 55 } },
      edges: { query: { rate: 6 } },
      metrics: { p95: 300, over: 2 },
      focus: ["api", "db"],
      exchange: {
        edge: "b-api",
        request: {
          format: "text",
          head: "limit 10 per second, fixed window, ip=198.51.100.7",
          body: "12:00:00.900-.999  allowed 10  (window :00)\n12:00:01.000-.099  allowed 10  (window :01)\n= 20 requests in 200 ms",
        },
        marks: ["window", "20 requests"],
      },
    },
    {
      id: "sliding",
      kind: "fix",
      nodes: { api: { load: 35 }, db: { load: 30 } },
      edges: { query: { rate: 3 } },
      metrics: { p95: 85, over: 1 },
      focus: ["api"],
      exchange: {
        edge: "b-api",
        request: {
          format: "text",
          head: "sliding window, ip=198.51.100.7, t=12:00:01.250",
          body: "previous second: 10, current: 3\nweight = 1 - 0.25 = 0.75\nestimate = 10 * 0.75 + 3 = 10.5\n10.5 >= 10 -> reject",
        },
        marks: ["previous second", "estimate", "reject"],
      },
    },
    {
      id: "burst",
      kind: "problem",
      edges: { "p-api": { rate: 8 }, "reject-p": { from: "api", to: "partner", flow: "fail", rate: 5 } },
      metrics: { errors: 4 },
      focus: ["partner", "api"],
      exchange: {
        edge: "p-api",
        request: {
          format: "text",
          head: "partner app opens: 25 requests in 300 ms",
          body: "allowed 10, rejected 15 with 429\nnext 60 s: 0 requests",
        },
        marks: ["rejected", "next 60 s"],
      },
    },
    {
      id: "token-bucket",
      kind: "fix",
      edges: { "reject-p": null, "p-api": { rate: 2 } },
      metrics: { errors: 0 },
      focus: ["partner", "api", "bot"],
      exchange: {
        edge: "p-api",
        request: {
          format: "text",
          head: "token bucket ip=203.0.113.24: capacity=30 refill=10/s",
          body: "12:00:00.000  tokens=30\n12:00:00.300  25 requests -> tokens=5\n12:00:01.300  tokens=15",
        },
        marks: ["capacity", "refill", "tokens"],
      },
    },
    {
      id: "shared-ip",
      kind: "problem",
      nodes: { office: { kind: "client", at: [0, 5] } },
      edges: {
        "o-api": { from: "office", to: "api", rate: 6 },
        "reject-o": { from: "api", to: "office", flow: "fail", rate: 5 },
      },
      metrics: { errors: 12 },
      focus: ["office", "api"],
      exchange: {
        edge: "o-api",
        request: {
          format: "http",
          head: "GET /v1/orders HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["X-Api-Key", "***"],
            ["X-Forwarded-For", "198.51.100.40"],
          ],
        },
        response: { format: "http", head: "HTTP/1.1 429 Too Many Requests", headers: [["Retry-After", "1"]] },
        marks: ["X-Forwarded-For", "429"],
        masked: ["X-Api-Key"],
      },
    },
    {
      id: "per-key",
      kind: "fix",
      edges: { "reject-o": null },
      metrics: { errors: 0 },
      focus: ["office", "api"],
      exchange: {
        edge: "o-api",
        request: {
          format: "http",
          head: "GET /v1/orders HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["X-Api-Key", "***"],
            ["X-Forwarded-For", "198.51.100.40"],
          ],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["X-RateLimit-Scope", "key"],
            ["X-RateLimit-Limit", "10"],
            ["X-RateLimit-Remaining", "7"],
          ],
        },
        marks: ["X-Api-Key", "X-RateLimit-Scope"],
        masked: ["X-Api-Key"],
      },
    },
    {
      id: "scale-out",
      kind: "problem",
      nodes: {
        lb: { kind: "lb", at: [3, 5], load: 20 },
        api2: { kind: "service", at: [5, 2], load: 45 },
        api3: { kind: "service", at: [5, 8], load: 45 },
        api: { load: 45 },
        db: { load: 60 },
      },
      edges: {
        "p-api": null,
        "b-api": null,
        "o-api": null,
        reject: null,
        "p-lb": { from: "partner", to: "lb", rate: 2 },
        "o-lb": { from: "office", to: "lb", rate: 4 },
        "b-lb": { from: "bot", to: "lb", rate: 12 },
        "lb-api": { from: "lb", to: "api", rate: 6 },
        "lb-api2": { from: "lb", to: "api2", rate: 6 },
        "lb-api3": { from: "lb", to: "api3", rate: 6 },
        query: { rate: 4 },
        query2: { from: "api2", to: "db", rate: 4 },
        query3: { from: "api3", to: "db", rate: 4 },
      },
      metrics: { over: 3 },
      focus: ["api", "api2", "api3"],
      exchange: {
        edge: "b-lb",
        request: {
          format: "text",
          head: "local counters, key_id=k_88, limit 10/s",
          body: "api:  10 of 10 allowed\napi2: 10 of 10 allowed\napi3: 10 of 10 allowed\ntotal allowed: 30 per second",
        },
        marks: ["key_id", "total allowed"],
      },
    },
    {
      id: "redis",
      kind: "fix",
      nodes: {
        redis: { kind: "cache", at: [9, 1], load: 20 },
        api: { load: 30 },
        api2: { load: 30 },
        api3: { load: 30 },
        db: { load: 30 },
      },
      edges: {
        rl: { from: "api", to: "redis", rate: 6 },
        rl2: { from: "api2", to: "redis", rate: 6 },
        rl3: { from: "api3", to: "redis", rate: 6 },
        query: { rate: 2 },
        query2: { rate: 2 },
        query3: { rate: 2 },
      },
      metrics: { over: 1, p95: 87 },
      focus: ["redis"],
      exchange: {
        edge: "rl",
        request: { format: "text", head: "EVALSHA 9f2c7a1e4b8d3f60a5c2e7b19d4f8a6c3e1b2d07 1 rl:k_88 30 10" },
        response: { format: "text", head: "1) (integer) 0", body: "2) (integer) 100" },
        marks: ["EVALSHA", "rl:k_88", "(integer) 0", "(integer) 100"],
      },
    },
    {
      id: "redis-down",
      kind: "case",
      nodes: { redis: { state: "down", load: 0 } },
      edges: {
        rl: { flow: "fail", cut: true, rate: 2 },
        rl2: { flow: "fail", cut: true, rate: 2 },
        rl3: { flow: "fail", cut: true, rate: 2 },
      },
      metrics: { over: 1.2 },
      focus: ["redis", "api"],
      exchange: {
        edge: "rl",
        request: {
          format: "text",
          head: "rate limiter: redis timeout after 20 ms",
          body: "mode: fail open, local limit 4/s per instance\nalert: ratelimit_redis_down",
        },
        marks: ["fail open", "local limit", "alert"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
