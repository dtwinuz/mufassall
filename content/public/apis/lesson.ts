import { defineLesson } from "@mufassall/scene-schema";

/**
 * One screen of a food-delivery app, "My orders", served three ways: REST, GraphQL and gRPC
 * between services. Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "apis",
  level: "beginner",
  minutes: 12,
  tier: "public",
  metrics: [
    { id: "calls", unit: "", better: "down" },
    { id: "screen", unit: "ms", better: "down" },
    { id: "payload", unit: "MB", better: "down" },
    { id: "double", unit: "/day", better: "down" },
  ],
  steps: [
    {
      id: "rest",
      kind: "case",
      nodes: {
        phone: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 2] },
        db: { kind: "db", at: [9, 4] },
      },
      edges: {
        rest: { from: "phone", to: "api", rate: 2 },
        sql: { from: "api", to: "db", rate: 2 },
      },
      metrics: { calls: 1, screen: 180, payload: 0.12, double: 0 },
      focus: ["phone", "api"],
      exchange: {
        edge: "rest",
        request: { format: "http", head: "GET /v1/orders?limit=20 HTTP/1.1", headers: [["Host", "api.example.com"]] },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "data": [
    {
      "id": "ord_981",
      "status": "delivered",
      "total": 84000,
      "restaurant_id": "r_7",
      "address": { ... },
      "items": [ ... ]
    }
  ]
}`,
        },
        marks: ["GET", "data", "restaurant_id", "items"],
      },
    },
    {
      id: "n-plus-one",
      kind: "problem",
      nodes: { api: { load: 60 } },
      edges: { rest: { rate: 12 } },
      metrics: { calls: 21, screen: 2600, payload: 0.16 },
      focus: ["phone", "api"],
      exchange: {
        edge: "rest",
        request: {
          format: "text",
          head: "phone network log: 21 requests, 2.6 s",
          body: "GET /v1/orders?limit=20        180 ms\nGET /v1/restaurants/r_7        120 ms\nGET /v1/restaurants/r_12       115 ms\n... 17 more, one per order\nGET /v1/restaurants/r_3        130 ms",
        },
        marks: ["21 requests", "r_7", "17 more"],
      },
    },
    {
      id: "expand",
      kind: "fix",
      nodes: { api: { load: 15 } },
      edges: { rest: { rate: 2 } },
      metrics: { calls: 1, screen: 240, payload: 0.02 },
      focus: ["phone", "api"],
      exchange: {
        edge: "rest",
        request: {
          format: "http",
          head: "GET /v1/orders?limit=20&fields=id,status&expand=restaurant HTTP/1.1",
          headers: [["Host", "api.example.com"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "data": [
    {
      "id": "ord_981",
      "status": "delivered",
      "restaurant": { "name": "Green Bowl" }
    }
  ]
}`,
        },
        marks: ["fields", "expand", "restaurant"],
      },
    },
    {
      id: "graphql",
      kind: "case",
      nodes: { gql: { kind: "service", at: [4, 7] } },
      edges: {
        rest: { rate: 1 },
        graph: { from: "phone", to: "gql", rate: 2 },
        gsql: { from: "gql", to: "db", rate: 2 },
      },
      metrics: { screen: 210, payload: 0.01 },
      focus: ["phone", "gql"],
      exchange: {
        edge: "graph",
        request: {
          format: "http",
          head: "POST /graphql HTTP/1.1",
          headers: [["Content-Type", "application/graphql"]],
          body: "query MyOrders {\n  orders(first: 20) {\n    id\n    status\n    restaurant { name }\n  }\n}",
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "data": {
    "orders": [
      {
        "id": "ord_981",
        "status": "delivered",
        "restaurant": { "name": "Green Bowl" }
      }
    ]
  }
}`,
        },
        marks: ["query", "orders", "restaurant"],
      },
    },
    {
      id: "resolver-n1",
      kind: "problem",
      nodes: { gql: { state: "slow", load: 70 }, db: { load: 75 } },
      edges: { gsql: { rate: 12 } },
      metrics: { screen: 950 },
      focus: ["gql", "db"],
      exchange: {
        edge: "gsql",
        request: {
          format: "sql",
          head: "SELECT * FROM orders WHERE user_id = 'u_42' LIMIT 20;",
          body: "SELECT name FROM restaurants WHERE id = 'r_7';\nSELECT name FROM restaurants WHERE id = 'r_12';\n-- ... 18 more, one per order",
        },
        marks: ["LIMIT", "r_7", "18 more"],
      },
    },
    {
      id: "batch",
      kind: "fix",
      nodes: { gql: { state: "ok", load: 20 }, db: { load: 15 } },
      edges: { gsql: { rate: 2 } },
      metrics: { screen: 210 },
      focus: ["gql", "db"],
      exchange: {
        edge: "gsql",
        request: {
          format: "sql",
          head: "SELECT id, name FROM restaurants",
          body: "WHERE id IN ('r_7', 'r_12', 'r_3', 'r_9', ...);",
        },
        response: { format: "text", head: "14 rows", body: "-- 20 orders, 14 different restaurants" },
        marks: ["IN", "14 rows"],
      },
    },
    {
      id: "grpc",
      kind: "case",
      nodes: { pricing: { kind: "service", at: [8, 10] } },
      edges: { rpc: { from: "gql", to: "pricing", rate: 3 } },
      focus: ["gql", "pricing"],
      exchange: {
        edge: "rpc",
        request: {
          format: "http",
          head: "POST /pricing.v1.Pricing/Quote HTTP/2",
          headers: [
            ["content-type", "application/grpc"],
            ["grpc-timeout", "150m"],
          ],
          body: 'QuoteRequest { order_id: "ord_981" zone: 4 }',
        },
        response: {
          format: "http",
          head: "HTTP/2 200",
          headers: [["grpc-status", "0"]],
          body: "QuoteReply { eta_min: 25 fee: 9000 }",
        },
        marks: ["Quote", "grpc-timeout", "QuoteRequest", "grpc-status"],
      },
    },
    {
      id: "offset",
      kind: "problem",
      edges: { rest: { flow: "dup", rate: 2 } },
      focus: ["phone", "api", "db"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "SELECT id, created_at FROM orders",
          body: "WHERE user_id = 'u_42'\nORDER BY created_at DESC\nLIMIT 20 OFFSET 20;",
        },
        response: {
          format: "text",
          head: "ord_962 | 2026-11-17 18:02",
          body: "-- already shown on page 1: a new order\n-- arrived and pushed every row down by one",
        },
        marks: ["OFFSET", "ord_962", "already shown"],
      },
    },
    {
      id: "cursor",
      kind: "fix",
      edges: { rest: { flow: "request" } },
      focus: ["phone", "api"],
      exchange: {
        edge: "rest",
        request: {
          format: "http",
          head: "GET /v2/orders?limit=20&after=c_ord_962 HTTP/1.1",
          headers: [["Host", "api.example.com"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "data": [ { "id": "ord_961" } ],
  "next_cursor": "c_ord_942",
  "has_more": true
}`,
        },
        marks: ["v2", "after", "next_cursor"],
      },
    },
    {
      id: "double-post",
      kind: "problem",
      edges: { rest: { flow: "dup", cut: true } },
      metrics: { double: 3 },
      focus: ["phone", "api"],
      exchange: {
        edge: "rest",
        request: {
          format: "json",
          head: "POST /v1/orders HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: `{
  "cart_id": "c_55",
  "total": 84000
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          body: `{
  "id": "ord_991"
}`,
        },
        marks: ["POST", "cart_id", "id"],
        masked: ["Authorization"],
      },
    },
    {
      id: "idempotency-key",
      kind: "fix",
      edges: { rest: { flow: "request", cut: false } },
      metrics: { double: 0 },
      focus: ["phone", "api", "db"],
      exchange: {
        edge: "rest",
        request: {
          format: "json",
          head: "POST /v1/orders HTTP/1.1",
          headers: [
            ["Authorization", "***"],
            ["Idempotency-Key", "8f14e2c0-7d1a-4b6e-9c3f-5a2b71d0e6aa"],
          ],
          body: `{
  "cart_id": "c_55",
  "total": 84000
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          headers: [["Idempotent-Replayed", "true"]],
          body: `{
  "id": "ord_990"
}`,
        },
        marks: ["Idempotency-Key", "Idempotent-Replayed", "id"],
        masked: ["Authorization"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
