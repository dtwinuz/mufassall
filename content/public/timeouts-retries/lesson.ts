import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

/**
 * A checkout API asks a rates service for a delivery price on every order.
 * The rates service gets slow, then dies, then comes back. Numbers are a model scenario.
 */
const quote: WireMessage = {
  format: "http",
  head: "GET /v1/quote?city=TAS&kg=2.4 HTTP/1.1",
  headers: [
    ["Host", "rates.internal"],
    ["Accept", "application/json"],
  ],
};

const charge = (key?: string): WireMessage => ({
  format: "json",
  head: "POST /v1/charges HTTP/1.1",
  headers: [
    ["Host", "pay.example.com"],
    ["Authorization", "***"],
    ...(key ? ([["Idempotency-Key", key]] as const) : []),
  ],
  body: `{
  "order_id": "o_9152",
  "amount": 3500000
}`,
});

export default defineLesson({
  slug: "timeouts-retries",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "errors", unit: "%", better: "down" },
    { id: "rates-rps", unit: "/s", better: "down" },
    { id: "double", unit: "/day", better: "down" },
  ],
  steps: [
    {
      id: "normal",
      kind: "case",
      nodes: {
        client: { kind: "client", at: [0, 3] },
        api: { kind: "service", at: [4, 3], load: 30 },
        rates: { kind: "service", at: [8, 1], load: 40 },
        db: { kind: "db", at: [8, 6] },
      },
      edges: {
        call: { from: "client", to: "api", rate: 4 },
        quote: { from: "api", to: "rates", rate: 4 },
        save: { from: "api", to: "db", rate: 3 },
      },
      metrics: { p95: 180, errors: 0.2, "rates-rps": 400, double: 0 },
      focus: ["api", "rates"],
      exchange: {
        edge: "quote",
        request: quote,
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [["X-Response-Time", "85ms"]],
          body: `{
  "price": 32000,
  "currency": "UZS",
  "eta_days": 2
}`,
        },
        marks: ["Host", "X-Response-Time", "price"],
      },
    },
    {
      id: "slow-dep",
      kind: "problem",
      nodes: {
        rates: { state: "slow", load: 100 },
        api: { state: "slow", load: 100 },
      },
      edges: {
        call: { flow: "fail", rate: 2 },
        quote: { rate: 1 },
        save: { rate: 0 },
      },
      metrics: { p95: 30000, errors: 14 },
      focus: ["api", "rates"],
      exchange: {
        edge: "call",
        request: {
          format: "http",
          head: "POST /v1/checkout HTTP/1.1",
          headers: [["Host", "api.example.com"]],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 503 Service Unavailable",
          headers: [["X-Response-Time", "30004ms"]],
          body: "worker pool: 200 of 200 threads busy",
        },
        marks: ["X-Response-Time", "threads busy"],
      },
    },
    {
      id: "timeout",
      kind: "fix",
      nodes: { api: { state: "ok", load: 45 } },
      edges: {
        call: { flow: "request", rate: 4 },
        quote: { flow: "fail", rate: 4 },
        save: { rate: 3 },
      },
      metrics: { p95: 900, errors: 3 },
      focus: ["api", "rates"],
      exchange: {
        edge: "quote",
        request: quote,
        response: {
          format: "text",
          head: "timeout: no answer in 800ms",
          body: "fallback: flat price 35000 for o_9152",
        },
        marks: ["timeout", "fallback"],
      },
    },
    {
      id: "naive-retry",
      kind: "problem",
      nodes: {
        rates: { state: "down", load: 100 },
        api: { state: "slow", load: 80 },
      },
      edges: {
        call: { flow: "retry", rate: 8 },
        quote: { flow: "retry", rate: 12 },
      },
      metrics: { p95: 4100, errors: 22, "rates-rps": 6400 },
      focus: ["client", "api", "rates"],
      exchange: {
        edge: "quote",
        request: {
          format: "text",
          head: "10:42:07.112 GET /v1/quote attempt=1 timeout",
          body: `10:42:07.913 GET /v1/quote attempt=2 timeout
10:42:08.714 GET /v1/quote attempt=3 timeout
10:42:09.515 GET /v1/quote attempt=4 timeout`,
        },
        marks: ["attempt", "10:42:07.913"],
      },
    },
    {
      id: "backoff",
      kind: "fix",
      nodes: {
        rates: { state: "slow", load: 85 },
        api: { state: "ok", load: 50 },
      },
      edges: {
        call: { flow: "request", rate: 4 },
        quote: { rate: 6 },
      },
      metrics: { p95: 1900, errors: 9, "rates-rps": 1100 },
      focus: ["api", "rates"],
      exchange: {
        edge: "quote",
        request: {
          format: "text",
          head: "attempt=1 timeout, sleep 90ms (base 100ms, jitter)",
          body: `attempt=2 timeout, sleep 260ms
attempt=3 ok in 140ms`,
        },
        marks: ["sleep", "base", "jitter"],
      },
    },
    {
      id: "budget",
      kind: "fix",
      nodes: { rates: { load: 70 } },
      edges: { quote: { rate: 5 } },
      metrics: { errors: 7, "rates-rps": 440 },
      focus: ["api", "rates"],
      exchange: {
        edge: "quote",
        request: {
          format: "text",
          head: "retry budget rates: 40 of 400 per s used (10%)",
          body: `o_9188 attempt=2 skipped: budget exhausted
o_9188 fallback: flat price 35000`,
        },
        marks: ["budget", "skipped"],
      },
    },
    {
      id: "breaker-open",
      kind: "fix",
      nodes: {
        rates: { state: "down", load: 0 },
        api: { load: 25 },
      },
      edges: { quote: { flow: "fail", rate: 0 } },
      metrics: { p95: 210, errors: 0.8, "rates-rps": 0 },
      focus: ["api", "rates"],
      exchange: {
        edge: "quote",
        request: {
          format: "text",
          head: "circuit rates: CLOSED -> OPEN",
          body: `failures 31 of last 50 calls (62%) in 10s
next 30s: fail fast, use fallback`,
        },
        marks: ["OPEN", "failures", "fail fast"],
      },
    },
    {
      id: "half-open",
      kind: "case",
      nodes: { rates: { state: "ok", load: 40 } },
      edges: { quote: { flow: "request", rate: 4 } },
      metrics: { p95: 190, errors: 0.2, "rates-rps": 400 },
      focus: ["api", "rates"],
      exchange: {
        edge: "quote",
        request: quote,
        response: {
          format: "text",
          head: "HTTP/1.1 200 OK in 92ms",
          body: `circuit rates: OPEN -> HALF_OPEN (1 probe)
circuit rates: HALF_OPEN -> CLOSED`,
        },
        marks: ["HALF_OPEN", "probe", "CLOSED"],
      },
    },
    {
      id: "double-charge",
      kind: "problem",
      nodes: { pay: { kind: "external", at: [3, 8], state: "slow" } },
      edges: { charge: { from: "api", to: "pay", flow: "dup", rate: 3 } },
      metrics: { double: 6 },
      focus: ["api", "pay"],
      exchange: {
        edge: "charge",
        request: charge(),
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          body: `{
  "charge_id": "ch_2",
  "status": "succeeded"
}`,
        },
        marks: ["order_id", "charge_id"],
        masked: ["Authorization"],
      },
    },
    {
      id: "idem-key",
      kind: "fix",
      nodes: { pay: { state: "ok" } },
      edges: { charge: { flow: "request" } },
      metrics: { double: 0 },
      focus: ["api", "pay"],
      exchange: {
        edge: "charge",
        request: charge("o_9152-charge"),
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          headers: [["Idempotent-Replayed", "true"]],
          body: `{
  "charge_id": "ch_1",
  "status": "succeeded"
}`,
        },
        marks: ["Idempotency-Key", "Idempotent-Replayed", "charge_id"],
        masked: ["Authorization"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
