import { defineLesson } from "@mufassall/scene-schema";

/**
 * A small shop: an orders service that asks a pricing service for prices and saves to a database.
 * Bugs reach customers until tests are added layer by layer, then wired into CI as a gate.
 * Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "testing",
  level: "beginner",
  minutes: 12,
  tier: "public",
  metrics: [
    { id: "escaped", unit: "", better: "down" },
    { id: "ci-time", unit: "s", better: "down" },
    { id: "flaky", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "no-tests",
      kind: "problem",
      nodes: {
        dev: { kind: "actor", at: [0, 0] },
        shopper: { kind: "actor", at: [0, 6] },
        orders: { kind: "service", at: [4, 6] },
        pricing: { kind: "service", at: [8, 4] },
        db: { kind: "db", at: [8, 8] },
      },
      edges: {
        ship: { from: "dev", to: "orders", rate: 1 },
        buy: { from: "shopper", to: "orders", rate: 3 },
        prices: { from: "orders", to: "pricing", rate: 2 },
        sql: { from: "orders", to: "db", rate: 2 },
      },
      metrics: { escaped: 9, "ci-time": 0, flaky: 0 },
      focus: ["dev", "shopper", "orders"],
      exchange: {
        edge: "buy",
        request: {
          format: "json",
          head: "POST /orders HTTP/1.1",
          body: `{
  "sku": "sku_77",
  "qty": 2,
  "promo": "AUTUMN10"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          body: `{
  "subtotal": 25800,
  "discount": 2580,
  "total": 2580
}`,
        },
        marks: ["promo", "subtotal", "discount", "total"],
      },
    },
    {
      id: "unit",
      kind: "fix",
      nodes: { ci: { kind: "worker", at: [4, 1] } },
      edges: {
        ship: null,
        push: { from: "dev", to: "ci", rate: 2 },
      },
      metrics: { escaped: 6, "ci-time": 20 },
      focus: ["dev", "ci"],
      exchange: {
        edge: "push",
        request: {
          format: "text",
          head: "$ test unit price",
          body: "FAIL  src/price.test.ts\n  x total is subtotal minus discount\n    expected 23220, received 2580\n  ok discount is 10% of subtotal (1 ms)\nTests: 1 failed, 13 passed, 14 total\nTime:  0.9 s",
        },
        marks: ["FAIL", "expected", "Tests", "Time"],
      },
    },
    {
      id: "mock-lies",
      kind: "problem",
      nodes: { orders: { state: "down" } },
      edges: { sql: { flow: "fail" }, buy: { flow: "fail" } },
      metrics: { escaped: 7 },
      focus: ["orders", "db"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "INSERT INTO orders (order_no, user_id, total)",
          body: "VALUES ('A-1042', 'u_42', 23220)\nON CONFLICT (order_no) DO NOTHING;",
        },
        response: {
          format: "text",
          head: "ERROR:  there is no unique or exclusion constraint",
          body: "matching the ON CONFLICT specification",
        },
        marks: ["ON CONFLICT", "ERROR"],
      },
    },
    {
      id: "integration",
      kind: "fix",
      nodes: {
        orders: { state: "ok" },
        testdb: { kind: "db", at: [8, 0] },
      },
      edges: {
        sql: { flow: "request" },
        buy: { flow: "request" },
        itest: { from: "ci", to: "testdb", rate: 2 },
      },
      metrics: { escaped: 4, "ci-time": 95 },
      focus: ["ci", "testdb"],
      exchange: {
        edge: "itest",
        request: {
          format: "text",
          head: "$ test integration",
          body: "start container postgres:16, ready in 1.9 s\napply migrations 001..014\nFAIL  orders repo: same order twice\n  no unique constraint on order_no\n+ migration 015_orders_order_no_unique\nPASS  36 tests (71 s)",
        },
        marks: ["container", "migrations", "FAIL", "PASS"],
      },
    },
    {
      id: "contract-break",
      kind: "problem",
      nodes: { orders: { state: "down" } },
      edges: { prices: { flow: "fail" }, buy: { flow: "fail" } },
      metrics: { escaped: 5 },
      focus: ["orders", "pricing"],
      exchange: {
        edge: "prices",
        request: { format: "http", head: "GET /prices/sku_77 HTTP/1.1" },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "sku": "sku_77",
  "unit_amount": 12900,
  "currency": "UZS"
}`,
        },
        marks: ["unit_amount", "currency"],
      },
    },
    {
      id: "contract",
      kind: "fix",
      nodes: { orders: { state: "ok" } },
      edges: {
        prices: { flow: "request" },
        buy: { flow: "request" },
        verify: { from: "ci", to: "pricing", rate: 1 },
      },
      metrics: { escaped: 2, "ci-time": 110 },
      focus: ["ci", "pricing"],
      exchange: {
        edge: "verify",
        request: {
          format: "text",
          head: "$ contract verify --provider pricing",
          body: "consumer orders expects:\n  GET /prices/sku_77 -> 200\n  body.price is an integer\nprovider pricing@b41e09 returns:\n  body.unit_amount = 12900\nFAILED: field price is missing\ndeploy of pricing@b41e09 blocked",
        },
        marks: ["consumer", "provider", "FAILED", "blocked"],
      },
    },
    {
      id: "e2e",
      kind: "fix",
      nodes: { browser: { kind: "client", at: [0, 3] } },
      edges: {
        drive: { from: "ci", to: "browser", rate: 1 },
        e2e: { from: "browser", to: "orders", rate: 1 },
      },
      metrics: { escaped: 1, "ci-time": 230 },
      focus: ["ci", "browser", "orders"],
      exchange: {
        edge: "drive",
        request: {
          format: "text",
          head: "$ test e2e checkout",
          body: "open  /cart (sku_77 x1, promo AUTUMN10)\nclick 'Pay'\nsee   'Order placed', total 11610 (2.8 s)\nPASS  checkout.spec (6.1 s)",
        },
        marks: ["open", "click", "see", "PASS"],
      },
    },
    {
      id: "flaky",
      kind: "problem",
      edges: { drive: { flow: "retry" }, e2e: { flow: "retry", rate: 2 } },
      metrics: { flaky: 8 },
      focus: ["browser", "orders"],
      exchange: {
        edge: "drive",
        request: {
          format: "text",
          head: "$ test e2e checkout",
          body: "FAIL  checkout.spec\n  TimeoutError: 'Order placed' not seen after 5000 ms\n  cart has sku_77 x3, left by another test\nretry 1/2\nPASS  checkout.spec (6.4 s)",
        },
        marks: ["TimeoutError", "another test", "retry"],
      },
    },
    {
      id: "isolate",
      kind: "fix",
      edges: { drive: { flow: "request" }, e2e: { flow: "request", rate: 1 } },
      metrics: { flaky: 0.5, "ci-time": 190 },
      focus: ["browser", "orders"],
      exchange: {
        edge: "e2e",
        request: {
          format: "json",
          head: "POST /test/seed HTTP/1.1",
          body: `{
  "user": "u_e2e_7f3a",
  "cart": [],
  "expires_in": 600
}`,
        },
        response: { format: "http", head: "HTTP/1.1 201 Created" },
        marks: ["user", "cart", "expires_in"],
      },
    },
    {
      id: "gate",
      kind: "fix",
      edges: { deploy: { from: "ci", to: "orders", rate: 1 } },
      metrics: { "ci-time": 165 },
      focus: ["ci", "orders"],
      exchange: {
        edge: "deploy",
        request: {
          format: "text",
          head: "pipeline orders@a91c2e",
          body: "unit          412 passed   18 s\nintegration    36 passed   71 s\ncontract        5 passed   12 s\ne2e             6 passed   64 s\ndeploy orders@a91c2e: allowed",
        },
        marks: ["unit", "integration", "contract", "e2e", "allowed"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
