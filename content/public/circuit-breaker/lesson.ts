import { defineLesson } from "@mufassall/scene-schema";

/**
 * A product API builds every product page from two dependencies: a reviews service and a stock
 * service. Reviews gets slow and, even with a 2 s timeout, drains the API's 200 threads, so the
 * pages that never needed reviews fail too. A circuit breaker (50% failures or slow calls over a
 * rolling window of 20 calls, 30 s open, 3 trial calls) stops the cascade; fallbacks keep the page
 * useful; a bulkhead covers the half-sick case the breaker cannot see; then retries, per-instance
 * state and alerts. Numbers are a model scenario: 600 page views/s, 12 API instances.
 */
export default defineLesson({
  slug: "circuit-breaker",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "p99", unit: "ms", better: "down" },
    { id: "err", unit: "%", better: "down" },
    { id: "threads", unit: "%", better: "down" },
    { id: "revcalls", unit: "/s", better: "down" },
    { id: "opens", unit: "/h", better: "down" },
  ],
  steps: [
    {
      id: "setup",
      kind: "case",
      nodes: {
        web: { kind: "client", at: [0, 5] },
        api: { kind: "service", at: [4, 5], load: 25 },
        reviews: { kind: "service", at: [8, 2] },
        stock: { kind: "service", at: [8, 8] },
        rdb: { kind: "db", at: [12, 2] },
        sdb: { kind: "db", at: [12, 8] },
      },
      edges: {
        page: { from: "web", to: "api", rate: 6, mode: "call" },
        rev: { from: "api", to: "reviews", rate: 6, mode: "call" },
        stk: { from: "api", to: "stock", rate: 6, mode: "call" },
        rq: { from: "reviews", to: "rdb", rate: 4 },
        sq: { from: "stock", to: "sdb", rate: 4 },
      },
      metrics: { p99: 180, err: 0.1, threads: 25, revcalls: 600, opens: 0 },
      focus: ["web", "api", "reviews", "stock"],
      exchange: {
        edge: "page",
        request: {
          format: "http",
          head: "GET /v1/products/88 HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [["Server-Timing", "reviews;dur=80, stock;dur=20"]],
          body: `{
  "id": 88,
  "title": "Steel kettle 1.7 l",
  "in_stock": 14,
  "reviews": { "rating": 4.6, "count": 1284 }
}`,
        },
        marks: ["Server-Timing", "in_stock", "reviews"],
        masked: ["Authorization"],
      },
    },
    {
      id: "cascade",
      kind: "problem",
      nodes: {
        reviews: { state: "slow", load: 100 },
        api: { state: "slow", load: 100 },
      },
      edges: { page: { flow: "fail" }, rev: { flow: "fail" } },
      metrics: { p99: 2000, err: 74, threads: 100 },
      focus: ["api", "reviews"],
      exchange: {
        edge: "rev",
        request: {
          format: "text",
          head: "14:02 api-7  worker pool  200/200 busy",
          body: "waiting on reviews   188   (timeout 2 000 ms)\nwaiting on stock       4\nother                  8\nqueue                 1 950 requests, oldest 6.1 s\n-- 600 calls/s x 2 s = 1 200 calls in flight > 200 threads\n-- GET /v1/cart never calls reviews and fails too",
        },
        marks: ["200/200 busy", "timeout", "in flight", "/v1/cart"],
      },
    },
    {
      id: "closed",
      kind: "fix",
      nodes: { breaker: { kind: "worker", at: [0, 1] } },
      edges: { watch: { from: "breaker", to: "api", rate: 1, mode: "async" } },
      focus: ["api", "breaker", "reviews"],
      exchange: {
        edge: "watch",
        request: {
          format: "text",
          head: "breaker reviews  state CLOSED",
          body: "window                   last 20 calls (rolling)\nminimum_calls            20\nfailure_rate_threshold   50%\nslow_call_duration       1 000 ms   (reviews p99 is 250 ms)\nslow_call_threshold      50%\nwait_in_open             30 s\ntrial_calls              3",
        },
        marks: ["CLOSED", "window", "minimum_calls", "failure_rate_threshold", "slow_call_duration", "wait_in_open", "trial_calls"],
      },
    },
    {
      id: "open",
      kind: "fix",
      nodes: { api: { state: "ok", load: 30 } },
      edges: { rev: { flow: "request", rate: 0 }, page: { flow: "request" } },
      metrics: { p99: 190, err: 0.2, threads: 30, revcalls: 0 },
      focus: ["api", "breaker", "reviews"],
      exchange: {
        edge: "watch",
        request: {
          format: "text",
          head: "14:02:00.412  reviews  CLOSED -> OPEN",
          body: "last 20 calls   14 slower than 1 s, 2 errors, 4 ok\nfailure rate    16 / 20 = 80%  >= 50%\n14:02:00.413  call reviews -> not permitted, 0.2 ms\n14:02:00.413  page built without the dependency\n-- threads stop waiting; /v1/cart works again",
        },
        marks: ["OPEN", "slower than 1 s", "failure rate", "not permitted"],
      },
    },
    {
      id: "fallback",
      kind: "fix",
      nodes: { cache: { kind: "cache", at: [4, 1] } },
      edges: { fb: { from: "api", to: "cache", rate: 3, mode: "call" } },
      focus: ["api", "cache"],
      exchange: {
        edge: "page",
        request: {
          format: "http",
          head: "GET /v1/products/88 HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [["X-Degraded", "reviews"]],
          body: `{
  "id": 88,
  "in_stock": 14,
  "reviews": { "rating": 4.6, "count": 1279, "stale": true },
  "reviews_age_s": 540
}`,
        },
        marks: ["X-Degraded", "stale", "reviews_age_s"],
        masked: ["Authorization"],
      },
    },
    {
      id: "half-open",
      kind: "fix",
      nodes: { reviews: { state: "ok", load: 40 } },
      edges: { rev: { rate: 1 } },
      metrics: { revcalls: 3, opens: 1 },
      focus: ["breaker", "api", "reviews"],
      exchange: {
        edge: "rev",
        request: {
          format: "text",
          head: "14:02:30.413  reviews  OPEN -> HALF_OPEN",
          body: "trial 1   GET /reviews/summary?product=88    94 ms   ok\ntrial 2   GET /reviews/summary?product=12   110 ms   ok\ntrial 3   GET /reviews/summary?product=5     87 ms   ok\nother calls during the trials -> fallback\n14:02:30.660  HALF_OPEN -> CLOSED, window reset\n-- 2 of 3 failing would mean OPEN again for 30 s",
        },
        marks: ["HALF_OPEN", "trial 1", "fallback", "CLOSED", "OPEN again"],
      },
    },
    {
      id: "half-sick",
      kind: "problem",
      nodes: { reviews: { state: "slow", load: 90 }, api: { state: "slow", load: 100 } },
      edges: { rev: { rate: 6, flow: "fail" }, page: { flow: "fail" } },
      metrics: { p99: 1900, err: 21, threads: 100, revcalls: 600 },
      focus: ["api", "reviews", "breaker"],
      exchange: {
        edge: "rev",
        request: {
          format: "text",
          head: "15:40 reviews: one of three replicas is sick",
          body: "70% of calls   80 ms\n30% of calls   1 900 ms   (slow, but under the 2 s timeout)\nslow call rate 30% < 50%   -> breaker stays CLOSED\nthreads needed 600 x (0.7 x 0.08 + 0.3 x 1.9) = 376 > 200",
        },
        marks: ["30% of calls", "slow call rate", "CLOSED", "threads needed"],
      },
    },
    {
      id: "bulkhead",
      kind: "fix",
      nodes: { api: { state: "ok", load: 40 } },
      edges: { rev: { rate: 2, flow: "request" }, page: { flow: "request" } },
      metrics: { p99: 210, err: 0.2, threads: 40, revcalls: 96 },
      focus: ["api", "reviews", "stock"],
      exchange: {
        edge: "rev",
        request: {
          format: "text",
          head: "api-7  bulkheads (separate limits per dependency)",
          body: "reviews   max_concurrent 60    in use 60/60   max_wait 0 ms\nstock     max_concurrent 40    in use 12/40\nrest      100 threads never used for outgoing calls\nreviews full -> rejected in 0.1 ms -> cached rating\n-- 96 calls/s get through, the rest show the cached rating",
        },
        marks: ["max_concurrent", "max_wait", "rest", "rejected"],
      },
    },
    {
      id: "retries",
      kind: "fix",
      nodes: { reviews: { state: "ok", load: 45 } },
      edges: { rev: { rate: 6 } },
      metrics: { revcalls: 630 },
      focus: ["api", "breaker", "reviews"],
      exchange: {
        edge: "rev",
        request: {
          format: "text",
          head: "call reviews = retry( breaker( bulkhead( timeout 1 s ( http ) ) ) )",
          body: "attempt 1   timeout after 1 000 ms     breaker records a failure\nattempt 2   after 120 ms + jitter       88 ms ok\nbudget      retries <= 5% of calls (30 of 600/s)\nnot permitted (breaker OPEN)  -> no retry, fallback at once",
        },
        marks: ["retry", "breaker records", "jitter", "budget", "not permitted"],
      },
    },
    {
      id: "instances",
      kind: "case",
      focus: ["api", "breaker"],
      exchange: {
        edge: "watch",
        request: {
          format: "text",
          head: "breaker state per instance (12 API instances, 50 reviews calls/s each)",
          body: "api-1..api-12   each counts only its own calls\nwindow of 20 calls fills in 0.4 s\n14:02:00.41 api-7 OPEN   14:02:00.52 api-3 OPEN   ... all 12 by 14:02:01.3\nshared state in a store: +1 network hop per call, and one more dependency",
        },
        marks: ["each counts only its own calls", "fills in 0.4 s", "all 12", "shared state"],
      },
    },
    {
      id: "alerts",
      kind: "fix",
      nodes: { reviews: { state: "ok", load: 40 } },
      metrics: { p99: 185, err: 0.1, threads: 26, revcalls: 600 },
      focus: ["breaker", "api"],
      exchange: {
        edge: "watch",
        request: {
          format: "text",
          head: "metrics exported by every instance",
          body: "breaker_state{dep=\"reviews\"}                  0 closed, 1 open, 2 half_open\nbreaker_transitions_total{dep=\"reviews\",to=\"open\"}\nbreaker_not_permitted_total{dep=\"reviews\"}\nalert  open for more than 2 min on >= 3 instances  -> page on-call\nalert  more than 4 opens in 15 min                 -> flapping, ticket",
        },
        marks: ["breaker_state", "breaker_transitions_total", "breaker_not_permitted_total", "open for more than 2 min", "flapping"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "flapping",
      from: "alerts",
      steps: [
        {
          id: "flap-open",
          kind: "problem",
          nodes: { breaker: { state: "slow" } },
          edges: { rev: { flow: "fail", rate: 2 } },
          metrics: { opens: 14, err: 0.1, revcalls: 280 },
          focus: ["breaker", "api", "reviews"],
          exchange: {
            edge: "watch",
            request: {
              format: "text",
              head: "config change: failure_rate_threshold 10%, window 10, minimum_calls 5, slow 300 ms",
              body: "10:15:02  reviews deploy, one replica restarts\n10:15:02  2 of 10 calls take 340 ms   -> 20% >= 10%  -> OPEN\n10:15:32  HALF_OPEN, 3 trials ok -> CLOSED\n10:21:47  GC pause 320 ms on one replica -> OPEN\n-- 14 opens an hour, each hides reviews for 30 s; reviews was healthy",
            },
            marks: ["failure_rate_threshold", "OPEN", "HALF_OPEN", "GC pause", "14 opens"],
          },
        },
        {
          id: "flap-fix",
          kind: "fix",
          nodes: { breaker: { state: "ok" } },
          edges: { rev: { flow: "request", rate: 6 } },
          metrics: { opens: 0, revcalls: 600 },
          focus: ["breaker", "reviews"],
          exchange: {
            edge: "watch",
            request: {
              format: "text",
              head: "back to: 50% over 20 calls, minimum_calls 20, slow = 1 000 ms",
              body: "normal blips last week   worst 20-call window 15% failed, p99 410 ms\nreal outage at 14:02      80% failed\n-- the threshold sits between the two: blips pass, outages trip\nflapping alert fired 3 times on the old config, before anyone complained",
            },
            marks: ["minimum_calls", "worst 20-call window", "real outage", "flapping alert"],
          },
        },
      ],
    },
  ],
});
