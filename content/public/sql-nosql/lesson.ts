import { defineLesson } from "@mufassall/scene-schema";

/**
 * One shop, four data stores, each chosen by how the data is read and written.
 * Numbers are a model scenario for the story, not measurements.
 */
export default defineLesson({
  slug: "sql-nosql",
  level: "beginner",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "scanned", unit: "", better: "down" },
    { id: "writes", unit: "/s", better: "up" },
  ],
  steps: [
    {
      id: "tables",
      kind: "case",
      nodes: {
        client: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 4], load: 30 },
        sql: { kind: "db", at: [8, 1], load: 30 },
      },
      edges: {
        open: { from: "client", to: "api", rate: 3 },
        query: { from: "api", to: "sql", rate: 3 },
      },
      metrics: { p95: 28, scanned: 3, writes: 400 },
      focus: ["api", "sql"],
      exchange: {
        edge: "query",
        request: {
          format: "sql",
          head: "SELECT o.id, o.created_at, p.name, i.qty",
          body: "FROM orders o\nJOIN order_items i ON i.order_id = o.id\nJOIN products p ON p.id = i.product_id\nWHERE o.id = 901;",
        },
        response: { format: "text", head: "3 rows in 4 ms" },
        marks: ["JOIN", "ON", "3 rows"],
      },
    },
    {
      id: "transaction",
      kind: "case",
      nodes: { sql: { load: 45 } },
      edges: { query: { rate: 5 } },
      metrics: { p95: 32 },
      focus: ["sql"],
      exchange: {
        edge: "query",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "INSERT INTO orders (id, user_id) VALUES (902, 42);\nUPDATE products SET stock = stock - 2\n  WHERE id = 17 AND stock >= 2;\nCOMMIT;",
        },
        response: { format: "text", head: "COMMIT" },
        marks: ["BEGIN", "stock >= 2", "COMMIT"],
      },
    },
    {
      id: "document",
      kind: "case",
      nodes: { docs: { kind: "db", at: [8, 7], load: 20 } },
      edges: { query: { rate: 2 }, doc: { from: "api", to: "docs", rate: 3 } },
      metrics: { p95: 6, scanned: 1 },
      focus: ["api", "docs"],
      exchange: {
        edge: "doc",
        request: { format: "text", head: 'db.orders.findOne({ _id: "o_901" })' },
        response: {
          format: "json",
          head: "1 document",
          body: `{
  "_id": "o_901",
  "user": { "id": "u_42" },
  "items": [
    { "sku": "p_17", "name": "Lamp", "qty": 2 },
    { "sku": "p_23", "name": "Desk", "qty": 1 }
  ],
  "total": 318000
}`,
        },
        marks: ["_id", "items", "name"],
      },
    },
    {
      id: "new-question",
      kind: "problem",
      nodes: { docs: { load: 96, state: "slow" } },
      edges: { doc: { rate: 6 } },
      metrics: { p95: 3400, scanned: 4800000 },
      focus: ["docs"],
      exchange: {
        edge: "doc",
        request: { format: "text", head: 'db.orders.find({ "items.sku": "p_17" })' },
        response: {
          format: "text",
          head: "stage: COLLSCAN",
          body: "docsExamined: 4800000\nexecutionTimeMillis: 3412",
        },
        marks: ["COLLSCAN", "docsExamined"],
      },
    },
    {
      id: "relational-answer",
      kind: "fix",
      nodes: { docs: { load: 20, state: "ok" } },
      edges: { doc: { rate: 3 }, query: { rate: 3 } },
      metrics: { p95: 30, scanned: 1200 },
      focus: ["api", "sql"],
      exchange: {
        edge: "query",
        request: {
          format: "sql",
          head: "SELECT product_id, SUM(qty)",
          body: "FROM order_items\nWHERE product_id = 17\nGROUP BY product_id;",
        },
        response: {
          format: "text",
          head: "Index Scan using order_items_product_idx",
          body: "Execution Time: 2.1 ms",
        },
        marks: ["GROUP BY", "Index Scan"],
      },
    },
    {
      id: "hot-writes",
      kind: "problem",
      nodes: { sql: { load: 99, state: "slow" }, api: { load: 70 } },
      edges: { open: { rate: 12 }, query: { rate: 12, flow: "fail" } },
      metrics: { p95: 900, writes: 6000 },
      focus: ["sql"],
      exchange: {
        edge: "query",
        request: {
          format: "sql",
          head: "INSERT INTO page_views (user_id, page, ts)",
          body: "VALUES (42, '/orders/901', now());",
        },
        response: { format: "text", head: "ERROR: sorry, too many clients already" },
        marks: ["page_views", "ERROR"],
      },
    },
    {
      id: "wide-column",
      kind: "fix",
      nodes: {
        events: { kind: "db", at: [11, 4], load: 40 },
        sql: { load: 40, state: "ok" },
        api: { load: 45 },
      },
      edges: { query: { rate: 3, flow: "request" }, track: { from: "api", to: "events", rate: 12 } },
      metrics: { p95: 30, writes: 40000 },
      focus: ["api", "events"],
      exchange: {
        edge: "track",
        request: {
          format: "sql",
          head: "INSERT INTO views_by_user (user_id, ts, page)",
          body: "VALUES ('u_42', '2026-11-18T10:02:11Z',\n        '/orders/901')\nUSING TTL 2592000;",
        },
        response: { format: "text", head: "Applied" },
        marks: ["views_by_user", "user_id", "TTL"],
      },
    },
    {
      id: "wrong-key",
      kind: "problem",
      edges: { track: { flow: "fail", rate: 4 } },
      metrics: { p95: 45 },
      focus: ["events"],
      exchange: {
        edge: "track",
        request: {
          format: "sql",
          head: "SELECT user_id FROM views_by_user",
          body: "WHERE page = '/orders/901';",
        },
        response: {
          format: "text",
          head: "InvalidRequest: Cannot execute this query",
          body: "as it might involve data filtering.\nUse ALLOW FILTERING if you really want it.",
        },
        marks: ["InvalidRequest", "ALLOW FILTERING"],
      },
    },
    {
      id: "second-table",
      kind: "fix",
      nodes: { events: { load: 65 } },
      edges: { track: { flow: "request", rate: 12 } },
      metrics: { p95: 30 },
      focus: ["api", "events"],
      exchange: {
        edge: "track",
        request: {
          format: "sql",
          head: "BEGIN BATCH",
          body: "INSERT INTO views_by_user (user_id, ts, page)\n  VALUES ('u_42', ..., '/orders/901');\nINSERT INTO views_by_page (page, ts, user_id)\n  VALUES ('/orders/901', ..., 'u_42');\nAPPLY BATCH;",
        },
        response: { format: "text", head: "Applied" },
        marks: ["views_by_page", "APPLY BATCH"],
      },
    },
    {
      id: "key-value",
      kind: "case",
      nodes: { kv: { kind: "cache", at: [3, 9], load: 15 } },
      edges: { cart: { from: "api", to: "kv", rate: 6 } },
      metrics: { scanned: 1, p95: 4 },
      focus: ["api", "kv"],
      exchange: {
        edge: "cart",
        request: { format: "text", head: "HGETALL cart:u_42" },
        response: {
          format: "text",
          head: '1) "p_17"',
          body: '2) "2"\n3) "p_23"\n4) "1"',
        },
        marks: ["HGETALL", "cart:u_42"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
