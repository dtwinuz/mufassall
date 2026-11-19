import { defineLesson } from "@mufassall/scene-schema";

/**
 * A payments app lists a merchant's transactions, newest first, 50 per page, with OFFSET.
 * A big merchant has 2 041 337 rows: deep pages read and discard millions of rows, new payments
 * shift every page, and a COUNT(*) runs on every first page. Keyset pagination on
 * (created_at, id) with the matching composite index, an opaque signed cursor, prev pages,
 * "has more" instead of an exact total, and a cursor bound to its filters fix it step by step.
 * PostgreSQL-flavoured plans. Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "cursor-pagination",
  level: "intermediate",
  minutes: 13,
  tier: "public",
  metrics: [
    { id: "query", unit: "ms", better: "down" },
    { id: "scanned", unit: "", better: "down" },
    { id: "dup", unit: "/day", better: "down" },
    { id: "lost", unit: "/day", better: "down" },
    { id: "count", unit: "ms", better: "down" },
    { id: "dbcpu", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "setup",
      kind: "case",
      nodes: {
        app: { kind: "client", at: [0, 5] },
        api: { kind: "service", at: [4, 5], load: 30 },
        db: { kind: "db", at: [8, 5], load: 55 },
      },
      edges: {
        list: { from: "app", to: "api", rate: 4, mode: "call" },
        q: { from: "api", to: "db", rate: 4, mode: "call" },
      },
      metrics: { query: 4, scanned: 50, dup: 0, lost: 0, count: 1310, dbcpu: 55 },
      focus: ["app", "api", "db"],
      exchange: {
        edge: "list",
        request: {
          format: "http",
          head: "GET /v1/transactions?page=1&limit=50 HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "page": 1,
  "limit": 50,
  "total": 2041337,
  "items": [
    { "id": 88123, "created_at": "2026-11-18T09:14:03.120Z", "amount": 125000 }
  ]
}`,
        },
        marks: ["page", "limit", "total", "items"],
        masked: ["Authorization"],
      },
    },
    {
      id: "deep-offset",
      kind: "problem",
      nodes: {
        export: { kind: "worker", at: [4, 9] },
        db: { state: "slow", load: 85 },
      },
      edges: { exp: { from: "export", to: "api", rate: 3, mode: "call" } },
      metrics: { query: 4100, scanned: 2000000, dbcpu: 85 },
      focus: ["export", "api", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "sql",
          head: "EXPLAIN ANALYZE  -- page 2 001 of the nightly export",
          body: "SELECT id, created_at, amount FROM transactions\n WHERE merchant_id = 7\n ORDER BY created_at DESC\n LIMIT 50 OFFSET 100000;\n\nLimit  (actual rows=50)\n  ->  Index Scan using tx_merchant_created  (actual rows=100050)\nExecution Time: 212 ms\n-- page 40 000: OFFSET 1999950, 2 000 000 rows read, 4 100 ms",
        },
        marks: ["OFFSET", "actual rows=50", "actual rows=100050", "Execution Time", "page 40 000"],
      },
    },
    {
      id: "shifting",
      kind: "problem",
      edges: { list: { flow: "dup" } },
      metrics: { dup: 3100, lost: 420 },
      focus: ["app", "api"],
      exchange: {
        edge: "list",
        request: {
          format: "text",
          head: "one user scrolls the list, the world keeps moving",
          body: "10:00:00  page=1  OFFSET 0    ids 88123 .. 88074\n10:00:20  3 new payments arrive on top\n10:00:21  page=2  OFFSET 50   starts with 88076, 88075, 88074   (already shown)\n10:05:00  another user: payment 88100 from page 1 is voided and hidden\n10:05:02  page=2  OFFSET 50   starts with 88072: 88073 slid onto page 1, never shown",
        },
        marks: ["page=1", "3 new payments", "already shown", "voided", "never shown"],
      },
    },
    {
      id: "keyset",
      kind: "fix",
      nodes: { db: { state: "ok", load: 45 } },
      edges: { list: { flow: "request" } },
      metrics: { query: 0.4, scanned: 51, dup: 0, lost: 0, dbcpu: 45 },
      focus: ["api", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "sql",
          head: "EXPLAIN ANALYZE  -- any page, page 2 or page 40 000",
          body: "SELECT id, created_at, amount FROM transactions\n WHERE merchant_id = 7\n   AND (created_at, id) < ('2026-11-18 09:02:51.004', 88074)\n ORDER BY created_at DESC, id DESC\n LIMIT 51;\n\nIndex Scan using tx_merchant_created_id  (actual rows=51)\nExecution Time: 0.4 ms",
        },
        marks: ["(created_at, id)", "ORDER BY", "LIMIT 51", "actual rows=51"],
      },
    },
    {
      id: "index",
      kind: "fix",
      focus: ["db"],
      exchange: {
        edge: "q",
        request: {
          format: "sql",
          head: "CREATE INDEX CONCURRENTLY tx_merchant_created_id",
          body: "    ON transactions (merchant_id, created_at DESC, id DESC);\n\n-- equality column first, then the sort columns, in the ORDER BY order\n-- (created_at, id) without merchant_id:\n--   walks every merchant's rows by date, Rows Removed by Filter: 970\n-- (merchant_id, created_at) without id:\n--   ties on created_at need an Incremental Sort",
        },
        marks: ["CONCURRENTLY", "merchant_id", "equality column first", "Rows Removed by Filter", "Incremental Sort"],
      },
    },
    {
      id: "cursor",
      kind: "fix",
      focus: ["app", "api"],
      exchange: {
        edge: "list",
        request: {
          format: "http",
          head: "GET /v1/transactions?limit=50&cursor=eyJ2IjoxLCJ0IjoiMjAyNi0xMS0xOFQwOTowMjo1MS4wMDRaIiwiaWQiOjg4MDc0LCJmIjoiOWMxZSJ9.Hk3f9Qx2 HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "items": [
    { "id": 88073, "created_at": "2026-11-18T09:02:50.611Z", "amount": 48000 }
  ],
  "next_cursor": "eyJ2IjoxLCJ0IjoiMjAyNi0xMS0xOFQwODo0OTozNy41NTJaIiwiaWQiOjg4MDI0LCJmIjoiOWMxZSJ9.p0Lw7aQe",
  "has_more": true
}`,
        },
        marks: ["cursor", "Hk3f9Qx2", "next_cursor", "has_more"],
        masked: ["Authorization"],
      },
    },
    {
      id: "prev",
      kind: "fix",
      focus: ["api", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "sql",
          head: "-- prev page: the first row on screen is (09:02:50.611, 88073)",
          body: "SELECT id, created_at, amount FROM transactions\n WHERE merchant_id = 7\n   AND (created_at, id) > ('2026-11-18 09:02:50.611', 88073)\n ORDER BY created_at ASC, id ASC\n LIMIT 51;\n-- same index, read backwards; the API reverses the 50 rows before answering",
        },
        marks: ["prev page", "> (", "ASC", "reverses"],
      },
    },
    {
      id: "count",
      kind: "problem",
      nodes: { db: { state: "slow", load: 70 } },
      metrics: { dbcpu: 70 },
      focus: ["api", "db"],
      exchange: {
        edge: "q",
        request: {
          format: "sql",
          head: "EXPLAIN ANALYZE  -- runs with every first page",
          body: "SELECT count(*) FROM transactions WHERE merchant_id = 7;\n\nAggregate\n  ->  Index Only Scan using tx_merchant_created_id  (actual rows=2041337)\nExecution Time: 1310 ms\n-- 9 first pages a second x 1.3 s: count takes most of the db's CPU",
        },
        marks: ["count(*)", "actual rows=2041337", "Execution Time", "most of the db's CPU"],
      },
    },
    {
      id: "count-alt",
      kind: "fix",
      nodes: {
        db: { state: "ok", load: 15 },
        cache: { kind: "cache", at: [8, 1] },
      },
      edges: { cnt: { from: "api", to: "cache", rate: 1, mode: "call" } },
      metrics: { count: 0, dbcpu: 15 },
      focus: ["api", "cache", "db"],
      exchange: {
        edge: "list",
        request: {
          format: "http",
          head: "GET /v1/transactions?limit=50 HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "items": [],
  "next_cursor": "eyJ2IjoxLCJ0IjoiMjAyNi0xMS0xOFQwODo0OTozNy41NTJaIiwiaWQiOjg4MDI0LCJmIjoiOWMxZSJ9.p0Lw7aQe",
  "has_more": true,
  "total_estimate": 2040000
}`,
        },
        marks: ["has_more", "total_estimate"],
        masked: ["Authorization"],
      },
    },
    {
      id: "filters",
      kind: "fix",
      edges: { list: { flow: "request" } },
      focus: ["app", "api"],
      exchange: {
        edge: "list",
        request: {
          format: "http",
          head: "GET /v1/transactions?status=refunded&limit=50&cursor=eyJ2IjoxLCJ0IjoiMjAyNi0xMS0xOFQwODo0OTozNy41NTJaIiwiaWQiOjg4MDI0LCJmIjoiOWMxZSJ9.p0Lw7aQe HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 400 Bad Request",
          body: `{
  "error": "cursor_mismatch",
  "detail": "the cursor was made for status=all, sort=created_at_desc",
  "restart": "/v1/transactions?status=refunded&limit=50"
}`,
        },
        marks: ["status", "error", "detail", "restart"],
        masked: ["Authorization"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "no-tiebreak",
      from: "filters",
      steps: [
        {
          id: "tie-lost",
          kind: "problem",
          edges: { list: { flow: "fail" } },
          metrics: { lost: 2600 },
          focus: ["app", "api", "db"],
          exchange: {
            edge: "q",
            request: {
              format: "sql",
              head: "-- new option ?sort=amount, cursor keeps only the amount",
              body: "SELECT id, amount FROM transactions WHERE merchant_id = 7\n AND amount < 50000 ORDER BY amount DESC LIMIT 50;\n-- 180 payments are exactly 50000 (one fixed-price plan)\n-- page 1 ended on the 12th of them: cursor amount = 50000\n-- page 2 starts below 50000: 168 payments never shown\n-- with <= instead: the same 12 rows again, and the order of ties may change",
            },
            marks: ["sort=amount", "amount < 50000", "exactly 50000", "168 payments", "<="],
          },
        },
        {
          id: "tie-fix",
          kind: "fix",
          edges: { list: { flow: "request" } },
          metrics: { lost: 0 },
          focus: ["api", "db"],
          exchange: {
            edge: "q",
            request: {
              format: "sql",
              head: "-- every sort ends with the unique id",
              body: "SELECT id, amount FROM transactions WHERE merchant_id = 7\n AND (amount, id) < (50000, 87410)\n ORDER BY amount DESC, id DESC LIMIT 51;\n\nCREATE INDEX CONCURRENTLY tx_merchant_amount_id\n    ON transactions (merchant_id, amount DESC, id DESC);\n-- page 2 starts with the 13th payment of 50000",
            },
            marks: ["(amount, id)", "id DESC", "tx_merchant_amount_id", "13th payment"],
          },
        },
      ],
    },
  ],
});
