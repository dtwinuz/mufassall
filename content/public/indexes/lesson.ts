import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

/**
 * An order history page on a 40M-row `orders` table, PostgreSQL-flavoured plans.
 * Numbers are a model scenario for the story, not measurements.
 */
const listPlan = (customer: number): WireMessage => ({
  format: "sql",
  head: "EXPLAIN ANALYZE",
  body: `SELECT id, status, total FROM orders
WHERE customer_id = ${customer}
ORDER BY created_at DESC LIMIT 20;`,
});

const reportPlan: WireMessage = {
  format: "sql",
  head: "EXPLAIN ANALYZE SELECT count(*), sum(total) FROM orders",
  body: "WHERE created_at >= '2026-11-17';",
};

export default defineLesson({
  slug: "indexes",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "scanned", unit: "", better: "down" },
    { id: "insert", unit: "ms", better: "down" },
    { id: "indexes", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "slow",
      kind: "problem",
      nodes: {
        app: { kind: "client", at: [0, 5] },
        api: { kind: "service", at: [3, 4], load: 40 },
        db: { kind: "db", at: [7, 4], state: "slow", load: 95 },
      },
      edges: {
        req: { from: "app", to: "api", rate: 4 },
        query: { from: "api", to: "db", rate: 4 },
      },
      metrics: { p95: 2400, scanned: 40000000, insert: 0.3, indexes: 1 },
      focus: ["api", "db"],
      exchange: {
        edge: "query",
        request: {
          format: "sql",
          head: "SELECT id, status, total FROM orders",
          body: "WHERE customer_id = 42\nORDER BY created_at DESC LIMIT 20;",
        },
        response: { format: "text", head: "(20 rows)", body: "Time: 2391.7 ms" },
        marks: ["customer_id", "LIMIT", "Time"],
      },
    },
    {
      id: "seq-scan",
      kind: "problem",
      nodes: { api: { state: "slow", load: 90 }, db: { load: 100 } },
      edges: { req: { flow: "fail" } },
      focus: ["db"],
      exchange: {
        edge: "query",
        request: listPlan(42),
        response: {
          format: "text",
          head: "Limit  (actual rows=20)",
          body: `  ->  Sort  (actual rows=20)
        Sort Key: created_at DESC
        ->  Seq Scan on orders  (actual rows=1800)
              Filter: (customer_id = 42)
              Rows Removed by Filter: 39998200
Execution Time: 2391.4 ms`,
        },
        marks: ["EXPLAIN", "Seq Scan", "Rows Removed by Filter", "Execution Time"],
      },
    },
    {
      id: "btree",
      kind: "fix",
      nodes: { api: { state: "ok", load: 40 }, db: { state: "ok", load: 30 } },
      edges: { req: { flow: "request" } },
      metrics: { p95: 35, scanned: 1800, insert: 0.4, indexes: 2 },
      focus: ["db"],
      exchange: {
        edge: "query",
        request: {
          format: "sql",
          head: "CREATE INDEX CONCURRENTLY idx_orders_customer",
          body: "ON orders (customer_id);",
        },
        response: { format: "text", head: "CREATE INDEX", body: "Time: 184220.5 ms" },
        marks: ["CONCURRENTLY", "customer_id", "Time"],
      },
    },
    {
      id: "big-customer",
      kind: "problem",
      nodes: { db: { state: "slow", load: 70 } },
      metrics: { p95: 900, scanned: 250000 },
      focus: ["api", "db"],
      exchange: {
        edge: "query",
        request: listPlan(7),
        response: {
          format: "text",
          head: "Limit  (actual rows=20)",
          body: `  ->  Sort  (actual rows=20)
        Sort Method: top-N heapsort
        ->  Index Scan using idx_orders_customer
              Index Cond: (customer_id = 7)
              (actual rows=250000)
Execution Time: 884.0 ms`,
        },
        marks: ["Index Cond", "Sort Method", "Execution Time"],
      },
    },
    {
      id: "composite",
      kind: "fix",
      nodes: { db: { state: "ok", load: 15 } },
      metrics: { p95: 4, scanned: 20, insert: 0.5, indexes: 3 },
      focus: ["db"],
      exchange: {
        edge: "query",
        request: listPlan(7),
        response: {
          format: "text",
          head: "Limit  (actual rows=20)",
          body: `  ->  Index Scan using idx_orders_cust_created
        Index Cond: (customer_id = 7)
        (actual rows=20)
Execution Time: 0.9 ms`,
        },
        marks: ["idx_orders_cust_created", "Index Cond", "Execution Time"],
      },
    },
    {
      id: "column-order",
      kind: "problem",
      nodes: {
        report: { kind: "worker", at: [3, 0] },
        db: { state: "slow", load: 85 },
      },
      edges: { scan: { from: "report", to: "db", rate: 2 } },
      metrics: { p95: 420 },
      focus: ["report", "db"],
      exchange: {
        edge: "scan",
        request: reportPlan,
        response: {
          format: "text",
          head: "Aggregate",
          body: `  ->  Seq Scan on orders
        Filter: (created_at >= '2026-11-17')
Execution Time: 2210.8 ms`,
        },
        marks: ["created_at", "Seq Scan"],
      },
    },
    {
      id: "report-index",
      kind: "fix",
      nodes: { db: { state: "ok", load: 20 } },
      metrics: { p95: 4, insert: 0.6, indexes: 4 },
      focus: ["report", "db"],
      exchange: {
        edge: "scan",
        request: reportPlan,
        response: {
          format: "text",
          head: "Aggregate",
          body: `  ->  Index Scan using idx_orders_created
        Index Cond: (created_at >= '2026-11-17')
Execution Time: 61.3 ms`,
        },
        marks: ["idx_orders_created", "Index Cond"],
      },
    },
    {
      id: "covering",
      kind: "fix",
      metrics: { p95: 2, insert: 0.7 },
      focus: ["api", "db"],
      exchange: {
        edge: "query",
        request: listPlan(7),
        response: {
          format: "text",
          head: "Limit  (actual rows=20)",
          body: `  ->  Index Only Scan using idx_orders_cust_cover
        Index Cond: (customer_id = 7)
        Heap Fetches: 0
Execution Time: 0.2 ms`,
        },
        marks: ["Index Only Scan", "idx_orders_cust_cover", "Heap Fetches"],
      },
    },
    {
      id: "write-cost",
      kind: "problem",
      nodes: {
        import: { kind: "worker", at: [9, 0] },
        db: { state: "slow", load: 90 },
      },
      edges: { load: { from: "import", to: "db", rate: 8 } },
      metrics: { insert: 2.4, indexes: 7 },
      focus: ["import", "db"],
      exchange: {
        edge: "load",
        request: {
          format: "sql",
          head: "INSERT INTO orders (customer_id, created_at, status, total)",
          body: "VALUES (42, now(), 'new', 129000),\n       ... 499 more rows ...;",
        },
        response: { format: "text", head: "INSERT 0 500", body: "Time: 1204.6 ms" },
        marks: ["INSERT 0 500", "Time"],
      },
    },
    {
      id: "trim",
      kind: "fix",
      nodes: { db: { state: "ok", load: 35 } },
      metrics: { insert: 0.5, indexes: 3 },
      focus: ["db"],
      exchange: {
        edge: "query",
        request: {
          format: "sql",
          head: "SELECT indexrelname, idx_scan",
          body: "FROM pg_stat_user_indexes\nWHERE relname = 'orders';",
        },
        response: {
          format: "text",
          head: " indexrelname          | idx_scan",
          body: ` orders_pkey           |   9120044
 idx_orders_cust_cover |  18342911
 idx_orders_created    |       610
 idx_orders_customer   |         0
 idx_orders_status     |         0
 idx_orders_total      |         0
 idx_orders_note       |         0`,
        },
        marks: ["idx_scan", "idx_orders_customer", "idx_orders_status"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
