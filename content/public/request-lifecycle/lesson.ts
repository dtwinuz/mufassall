import { defineLesson } from "@mufassall/scene-schema";

/**
 * One page load, from the address bar to the database and back.
 * Numbers are a model scenario, not measurements; the player says so under the scene.
 */
export default defineLesson({
  slug: "request-lifecycle",
  level: "beginner",
  minutes: 10,
  tier: "public",
  metrics: [
    { id: "elapsed", unit: "ms", better: "down" },
    { id: "trips", unit: "", better: "down" },
    { id: "db-time", unit: "ms", better: "down" },
  ],
  steps: [
    {
      id: "dns",
      kind: "case",
      nodes: {
        client: { kind: "client", at: [0, 4] },
        resolver: { kind: "external", at: [0, 8] },
      },
      edges: {
        lookup: { from: "client", to: "resolver", rate: 2 },
        answer: { from: "resolver", to: "client", flow: "ack", rate: 2 },
      },
      metrics: { elapsed: 38, trips: 1, "db-time": 0 },
      focus: ["client", "resolver"],
      exchange: {
        edge: "lookup",
        request: { format: "text", head: "QUERY shop.example.com IN A" },
        response: {
          format: "text",
          head: "ANSWER shop.example.com",
          body: "A 203.0.113.10\nTTL 300\nquery time: 38 ms",
        },
        marks: ["IN A", "203.0.113.10", "TTL"],
      },
    },
    {
      id: "tcp",
      kind: "case",
      nodes: { lb: { kind: "lb", at: [4, 4] } },
      edges: {
        lookup: { rate: 0 },
        answer: { rate: 0 },
        conn: { from: "client", to: "lb", rate: 2 },
      },
      metrics: { elapsed: 78, trips: 2 },
      focus: ["client", "lb"],
      exchange: {
        edge: "conn",
        request: { format: "text", head: "SYN 198.51.100.7:52114 -> 203.0.113.10:443" },
        response: {
          format: "text",
          head: "SYN-ACK 203.0.113.10:443 -> 198.51.100.7:52114",
          body: "client sends: ACK\nround trip: 40 ms",
        },
        marks: ["SYN", "SYN-ACK", "round trip"],
      },
    },
    {
      id: "tls",
      kind: "case",
      metrics: { elapsed: 118, trips: 3 },
      focus: ["client", "lb"],
      exchange: {
        edge: "conn",
        request: {
          format: "text",
          head: "ClientHello",
          body: "version: TLS 1.3\nsni: shop.example.com\nalpn: h2, http/1.1\nkey_share: x25519",
        },
        response: {
          format: "text",
          head: "ServerHello",
          body: "cipher: TLS_AES_128_GCM_SHA256\ncertificate: CN=shop.example.com\nalpn: h2",
        },
        marks: ["sni", "alpn", "key_share", "certificate"],
      },
    },
    {
      id: "http",
      kind: "case",
      nodes: { app: { kind: "service", at: [7, 4] } },
      edges: { fwd: { from: "lb", to: "app", rate: 2 } },
      metrics: { elapsed: 140 },
      focus: ["lb", "app"],
      exchange: {
        edge: "fwd",
        request: {
          format: "http",
          head: "GET /orders?page=1 HTTP/1.1",
          headers: [
            ["Host", "shop.example.com"],
            ["Cookie", "***"],
            ["X-Forwarded-For", "198.51.100.7"],
            ["X-Request-Id", "req_7f3a"],
          ],
        },
        marks: ["Cookie", "X-Forwarded-For", "X-Request-Id"],
        masked: ["Cookie"],
      },
    },
    {
      id: "slow-query",
      kind: "problem",
      nodes: {
        app: { state: "slow" },
        db: { kind: "db", at: [10, 4], state: "slow" },
      },
      edges: { query: { from: "app", to: "db", rate: 2 } },
      metrics: { elapsed: 432, "db-time": 281 },
      focus: ["app", "db"],
      exchange: {
        edge: "query",
        request: {
          format: "sql",
          head: "SELECT id, status, total FROM orders",
          body: "WHERE user_id = 'u_42'\nORDER BY created_at DESC LIMIT 20;",
        },
        response: {
          format: "text",
          head: "Seq Scan on orders",
          body: "rows scanned: 1840000\nExecution Time: 281 ms",
        },
        marks: ["user_id", "Seq Scan", "Execution Time"],
      },
    },
    {
      id: "index",
      kind: "fix",
      nodes: { app: { state: "ok" }, db: { state: "ok" } },
      metrics: { elapsed: 155, "db-time": 4 },
      focus: ["db"],
      exchange: {
        edge: "query",
        request: {
          format: "sql",
          head: "CREATE INDEX orders_by_user",
          body: "ON orders (user_id, created_at DESC);",
        },
        response: {
          format: "text",
          head: "Index Scan using orders_by_user",
          body: "rows scanned: 20\nExecution Time: 3.9 ms",
        },
        marks: ["CREATE INDEX", "Index Scan", "rows scanned"],
      },
    },
    {
      id: "response",
      kind: "case",
      edges: {
        rows: { from: "db", to: "app", flow: "ack", rate: 2 },
        back: { from: "app", to: "lb", flow: "ack", rate: 2 },
        resp: { from: "lb", to: "client", flow: "ack", rate: 2 },
      },
      metrics: { elapsed: 176, trips: 4 },
      focus: ["lb", "client"],
      exchange: {
        edge: "resp",
        request: {
          format: "json",
          head: "HTTP/2 200",
          headers: [
            ["content-type", "application/json"],
            ["content-encoding", "gzip"],
            ["server-timing", "lb;dur=2, app;dur=11, db;dur=4"],
          ],
          body: `{
  "orders": [
    { "id": 42, "status": "shipped" },
    { "id": 41, "status": "paid" }
  ],
  "next_page": 2
}`,
        },
        marks: ["server-timing", "content-encoding", "next_page"],
      },
    },
    {
      id: "far",
      kind: "problem",
      nodes: { client: { state: "slow" } },
      edges: { lookup: { rate: 2 }, answer: { rate: 2 } },
      metrics: { elapsed: 558, trips: 4 },
      focus: ["client"],
      exchange: {
        edge: "conn",
        request: {
          format: "text",
          head: "GET https://shop.example.com/orders?page=1",
          body: "dns: 90 ms\nconnect: 150 ms\ntls: 150 ms\nwaiting (TTFB): 168 ms\ndownload: 0 ms",
        },
        marks: ["connect", "tls", "TTFB"],
      },
    },
    {
      id: "reuse",
      kind: "fix",
      nodes: { client: { state: "ok" } },
      edges: { lookup: { rate: 0 }, answer: { rate: 0 } },
      metrics: { elapsed: 168, trips: 1 },
      focus: ["client", "lb"],
      exchange: {
        edge: "conn",
        request: {
          format: "text",
          head: "GET https://shop.example.com/orders?page=2",
          body: "dns: 0 ms (cached, TTL 300)\nconnect: 0 ms (reused)\ntls: 0 ms (reused)\nwaiting (TTFB): 168 ms",
        },
        marks: ["cached", "reused", "TTFB"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
