import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

/**
 * An online bookshop grows from one app and one database to a few services.
 * Every split solves one concrete pain and adds one concrete cost.
 * Numbers are a model scenario, not measurements.
 */
const createPayment: WireMessage = {
  format: "json",
  head: "POST /internal/payments HTTP/1.1",
  headers: [["Host", "payments.internal"]],
  body: `{
  "order_id": 9001,
  "amount": 89000
}`,
};

export default defineLesson({
  slug: "microservices",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "deploys", unit: "/day", better: "up" },
    { id: "p95", unit: "ms", better: "down" },
    { id: "hops", unit: "", better: "down" },
    { id: "failed", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "monolith",
      kind: "case",
      nodes: {
        client: { kind: "client", at: [0, 5] },
        app: { kind: "service", at: [6, 5], load: 45 },
        db: { kind: "db", at: [10, 5] },
      },
      edges: {
        call: { from: "client", to: "app", rate: 4 },
        sql: { from: "app", to: "db", rate: 4 },
      },
      metrics: { deploys: 0.14, p95: 140, hops: 1, failed: 0.3 },
      focus: ["app", "db"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: `UPDATE books SET stock = stock - 1
  WHERE id = 'b_77';
INSERT INTO orders (id, user_id, book_id)
  VALUES (9001, 'u_42', 'b_77');
INSERT INTO payments (order_id, amount)
  VALUES (9001, 89000);
COMMIT;`,
        },
        marks: ["BEGIN", "payments", "COMMIT"],
      },
    },
    {
      id: "crowded",
      kind: "problem",
      nodes: { app: { state: "slow", load: 95 } },
      edges: { call: { rate: 8 } },
      metrics: { deploys: 0.1, p95: 1900, failed: 2 },
      focus: ["client", "app"],
      exchange: {
        edge: "call",
        request: {
          format: "http",
          head: "GET /v1/search?q=dune HTTP/1.1",
          headers: [["Host", "shop.example.com"]],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [["X-Response-Time", "1840ms"]],
          body: `cpu profile: search 71%, checkout 9%
release 2026.11.18 blocked: 3 failing tests in search/`,
        },
        marks: ["X-Response-Time", "search 71%", "blocked"],
      },
    },
    {
      id: "split-search",
      kind: "fix",
      nodes: {
        gw: { kind: "lb", at: [3, 5], load: 30 },
        app: { state: "ok", load: 50 },
        search: { kind: "service", at: [6, 1], load: 60 },
      },
      edges: {
        call: null,
        in: { from: "client", to: "gw", rate: 6 },
        "to-app": { from: "gw", to: "app", rate: 2 },
        "to-search": { from: "gw", to: "search", rate: 4 },
      },
      metrics: { deploys: 1.5, p95: 220, hops: 2, failed: 0.4 },
      focus: ["gw", "search"],
      exchange: {
        edge: "to-search",
        request: {
          format: "http",
          head: "GET /v1/search?q=dune HTTP/1.1",
          headers: [["Host", "search.internal"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "hits": [
    { "id": "b_77", "title": "Dune" }
  ],
  "took_ms": 12
}`,
        },
        marks: ["Host", "hits", "took_ms"],
      },
    },
    {
      id: "gateway",
      kind: "case",
      nodes: {
        gw: { load: 35 },
        search: { load: 40 },
      },
      metrics: { p95: 200 },
      focus: ["client", "gw"],
      exchange: {
        edge: "in",
        request: {
          format: "http",
          head: "GET /api/search?q=dune HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["X-RateLimit-Remaining", "118"],
            ["X-Request-Id", "req_5c20e1"],
          ],
        },
        marks: ["Host", "Authorization", "X-RateLimit-Remaining", "X-Request-Id"],
        masked: ["Authorization"],
      },
    },
    {
      id: "split-pay",
      kind: "fix",
      nodes: {
        pay: { kind: "service", at: [6, 9], load: 30 },
        paydb: { kind: "db", at: [10, 9] },
      },
      edges: {
        charge: { from: "app", to: "pay", rate: 2 },
        "pay-sql": { from: "pay", to: "paydb", rate: 2 },
      },
      metrics: { deploys: 6, p95: 260, hops: 3 },
      focus: ["app", "pay", "paydb"],
      exchange: {
        edge: "charge",
        request: createPayment,
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          body: `{
  "payment_id": "p_311",
  "status": "pending"
}`,
        },
        marks: ["order_id", "payment_id", "status"],
      },
    },
    {
      id: "partial",
      kind: "problem",
      nodes: { pay: { state: "down", load: 0 } },
      edges: { charge: { flow: "fail", cut: true } },
      metrics: { p95: 2100, failed: 8 },
      focus: ["app", "pay"],
      exchange: {
        edge: "charge",
        request: createPayment,
        response: {
          format: "text",
          head: "timeout after 2000ms",
          body: "order 9001 saved in shop DB, payment unknown",
        },
        marks: ["timeout", "payment unknown"],
      },
    },
    {
      id: "shared-db",
      kind: "problem",
      nodes: { pay: { state: "ok", load: 30 } },
      edges: {
        charge: { flow: "request", cut: false },
        peek: { from: "pay", to: "db", flow: "fail", rate: 2 },
      },
      metrics: { p95: 260, failed: 5 },
      focus: ["pay", "db"],
      exchange: {
        edge: "peek",
        request: {
          format: "sql",
          head: "SELECT total FROM orders WHERE id = 9001;",
        },
        response: {
          format: "text",
          head: 'ERROR: column "total" does not exist',
          body: "HINT: renamed to amount_total in release 2026.11.18",
        },
        marks: ["ERROR", "HINT"],
      },
    },
    {
      id: "events",
      kind: "fix",
      nodes: { queue: { kind: "queue", at: [3, 9] } },
      edges: {
        peek: null,
        charge: null,
        publish: { from: "app", to: "queue", rate: 2 },
        consume: { from: "queue", to: "pay", rate: 2 },
      },
      metrics: { failed: 0.4 },
      focus: ["app", "queue", "pay"],
      exchange: {
        edge: "publish",
        request: {
          format: "json",
          head: "produce topic=orders.events key=9001",
          body: `{
  "type": "OrderPlaced",
  "order_id": 9001,
  "amount": 89000,
  "version": 1
}`,
        },
        marks: ["key", "type", "amount"],
      },
    },
    {
      id: "debugging",
      kind: "case",
      metrics: { hops: 4, p95: 280 },
      focus: ["app", "queue", "pay"],
      exchange: {
        edge: "consume",
        request: {
          format: "json",
          head: "consume orders.events partition=2 offset=48211",
          headers: [["traceparent", "00-7d1e0c4a9b3f42e8a5c6d7e8f9a0b1c2-3f2e1d0c9b8a7f6e-01"]],
          body: `{
  "type": "OrderPlaced",
  "order_id": 9001
}`,
        },
        marks: ["offset", "traceparent"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
