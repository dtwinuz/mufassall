import { defineLesson } from "@mufassall/scene-schema";

/**
 * An online shop sells kettles (SKU KET-200). The story: two buyers take the last unit through a
 * read-modify-write, an atomic conditional decrement fixes it, carts that never pay lock stock
 * forever, a hold with a 15-minute expiry and a sweeper frees it, a mobile retry reserves twice,
 * a failed payment gives the unit back at once, a flash sale queues every checkout on one row,
 * slots spread the lock, and a daily count matches the warehouse. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "inventory-reservation",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "oversold", unit: "/day", better: "down" },
    { id: "stuck", unit: "", better: "down" },
    { id: "doubles", unit: "/day", better: "down" },
    { id: "p99", unit: "ms", better: "down" },
    { id: "drift", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "setup",
      kind: "case",
      nodes: {
        buyer: { kind: "client", at: [0, 2] },
        api: { kind: "service", at: [4, 4] },
        db: { kind: "db", at: [4, 9] },
      },
      edges: {
        order: { from: "buyer", to: "api", rate: 2, mode: "call" },
        write: { from: "api", to: "db", rate: 2 },
      },
      metrics: { oversold: 0, stuck: 0, doubles: 0, p99: 35, drift: 14 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "SELECT sku, on_hand, reserved, available FROM stock WHERE sku = 'KET-200';",
        },
        response: {
          format: "text",
          head: "KET-200 | 1 | 0 | 1",
          body: "-- on_hand: units physically on the warehouse shelf\n-- reserved: promised to orders that are not paid yet\n-- available = on_hand - reserved: what the site may still sell",
        },
        marks: ["on_hand", "reserved", "available"],
      },
    },
    {
      id: "oversell",
      kind: "problem",
      nodes: { buyer2: { kind: "client", at: [0, 6] } },
      edges: {
        order2: { from: "buyer2", to: "api", rate: 2, mode: "call" },
        write: { flow: "dup" },
      },
      metrics: { oversold: 37 },
      focus: ["buyer", "buyer2", "api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "text",
          head: "two buyers, the last kettle, 40 ms apart",
          body: "12:00:00.010  A  SELECT available -> 1          ok, sell\n12:00:00.050  B  SELECT available -> 1          ok, sell\n12:00:00.070  A  UPDATE stock SET available = 0   (1 - 1, computed in the app)\n12:00:00.090  B  UPDATE stock SET available = 0   (1 - 1, computed in the app)\n-- two orders confirmed, one kettle on the shelf",
        },
        marks: ["SELECT available", "UPDATE stock", "computed in the app", "two orders"],
      },
    },
    {
      id: "atomic",
      kind: "fix",
      edges: { write: { flow: "request" } },
      metrics: { oversold: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "UPDATE stock",
          body: "   SET available = available - 1\n WHERE sku = 'KET-200' AND available >= 1;",
        },
        response: {
          format: "text",
          head: "A: UPDATE 1   available 1 -> 0",
          body: "B: waits for A's row lock, re-reads the row: available = 0\nB: UPDATE 0   -> \"sold out\", no order is created",
        },
        marks: ["available - 1", "available >= 1", "UPDATE 1", "row lock", "UPDATE 0"],
      },
    },
    {
      id: "abandoned",
      kind: "problem",
      metrics: { stuck: 28 },
      focus: ["buyer", "api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "SELECT sku, on_hand, available FROM stock WHERE sku = 'KET-200';",
        },
        response: {
          format: "text",
          head: "KET-200 | 40 | 0",
          body: "-- 40 kettles on the shelf, the site says sold out\n-- yesterday: 40 checkouts took a unit, 12 paid, 28 closed the payment page\n-- nothing ever gives those 28 units back",
        },
        marks: ["on_hand", "sold out", "28 closed", "gives those 28 units back"],
      },
    },
    {
      id: "hold",
      kind: "fix",
      nodes: {
        pay: { kind: "external", at: [9, 2] },
        sweeper: { kind: "worker", at: [9, 9] },
      },
      edges: {
        charge: { from: "api", to: "pay", rate: 1, mode: "call" },
        sweep: { from: "sweeper", to: "db", rate: 1 },
      },
      metrics: { stuck: 6 },
      focus: ["api", "db", "sweeper"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "BEGIN;  -- checkout ord_7710",
          body: "UPDATE stock SET available = available - 1, reserved = reserved + 1\n WHERE sku = 'KET-200' AND available >= 1;\nINSERT INTO holds (order_id, sku, qty, status, expires_at)\n  VALUES ('ord_7710', 'KET-200', 1, 'held', now() + interval '15 minutes');\nCOMMIT;\n-- paid:    hold -> 'confirmed', reserved - 1, on_hand - 1\n-- expired: hold -> 'released', reserved - 1, available + 1   (sweeper, every 30 s)",
        },
        marks: ["reserved + 1", "holds", "expires_at", "confirmed", "released", "sweeper"],
      },
    },
    {
      id: "retry",
      kind: "problem",
      edges: { order: { flow: "dup" } },
      metrics: { doubles: 9 },
      focus: ["buyer", "api", "db"],
      exchange: {
        edge: "order",
        request: {
          format: "text",
          head: "POST /v1/checkout  order=ord_7710  -> no answer after 8 s (mobile network)",
          body: "the app retries:  POST /v1/checkout  order=ord_7710\nserver: two holds for ord_7710, available 2 -> 0\n-- the next buyer sees sold out; one kettle is held for nothing for 15 min",
        },
        marks: ["no answer", "retries", "two holds", "sold out"],
      },
    },
    {
      id: "idem",
      kind: "fix",
      edges: { order: { flow: "request" } },
      metrics: { doubles: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "BEGIN;",
          body: "INSERT INTO holds (order_id, sku, qty, status, expires_at)\n  VALUES ('ord_7710', 'KET-200', 1, 'held', now() + interval '15 minutes')\n  ON CONFLICT (order_id, sku) DO NOTHING;   -- 0 rows: a retry, answer with the existing hold\nUPDATE stock SET available = available - 1, reserved = reserved + 1\n WHERE sku = 'KET-200' AND available >= 1;   -- 0 rows: ROLLBACK, sold out\nCOMMIT;",
        },
        marks: ["ON CONFLICT", "0 rows", "existing hold", "ROLLBACK"],
      },
    },
    {
      id: "payfail",
      kind: "fix",
      edges: { hook: { from: "pay", to: "api", flow: "ack", rate: 1, mode: "async" } },
      metrics: { stuck: 1 },
      focus: ["pay", "api", "db"],
      exchange: {
        edge: "hook",
        request: {
          format: "json",
          head: "POST /webhooks/payments HTTP/1.1",
          headers: [["Signature", "***"]],
          body: `{
  "event_id": "evt_40Q1",
  "type": "payment.failed",
  "order_id": "ord_7710",
  "reason": "insufficient_funds"
}`,
        },
        response: {
          format: "text",
          head: "HTTP/1.1 200 OK",
          body: "UPDATE holds SET status = 'released' WHERE order_id = 'ord_7710' AND status = 'held';   -- 1 row\nUPDATE stock SET available = available + 1, reserved = reserved - 1 WHERE sku = 'KET-200';\n-- the kettle is back on sale 40 ms after the failure, not 15 min later",
        },
        marks: ["event_id", "type", "reason", "status = 'held'", "40 ms"],
        masked: ["Signature"],
      },
    },
    {
      id: "hot",
      kind: "problem",
      nodes: { api: { state: "slow", load: 96 }, db: { state: "slow", load: 100 } },
      edges: { order: { flow: "fail" }, order2: { flow: "fail" } },
      metrics: { p99: 4200 },
      focus: ["buyer", "buyer2", "api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "text",
          head: "11:00:00 flash sale: KET-200, 500 units, 20 000 buyers in the first 10 s",
          body: "every checkout: UPDATE stock ... WHERE sku = 'KET-200'   -> one row, one lock\neach transaction holds it ~2 ms (decrement + hold INSERT + COMMIT)\n= at most ~500 reservations/s on that row, 2 000/s arrive\npool: 100/100 connections wait on one row, other SKUs time out too\n-- checkout p99 35 ms -> 4 200 ms",
        },
        marks: ["one lock", "2 ms", "500 reservations/s", "100/100"],
      },
    },
    {
      id: "slots",
      kind: "fix",
      nodes: { api: { state: "ok", load: 55 }, db: { state: "ok", load: 60 } },
      edges: { order: { flow: "request" }, order2: { flow: "request" } },
      metrics: { p99: 40 },
      focus: ["api", "db"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "-- 500 units split into 10 slots of 50",
          body: "UPDATE stock_slots SET available = available - 1\n WHERE sku = 'KET-200' AND slot = 7 AND available >= 1;\n-- slot picked at random; 0 rows: try the next slot; all 10 empty: sold out\n-- 10 rows, 10 locks: about 5 000 reservations/s\n-- sold_out flag in the cache: the 19 500 late buyers get an answer without the DB",
        },
        marks: ["stock_slots", "slot = 7", "next slot", "5 000", "sold_out"],
      },
    },
    {
      id: "count",
      kind: "fix",
      nodes: {
        wh: { kind: "external", at: [12, 5] },
        recon: { kind: "worker", at: [7, 12] },
      },
      edges: {
        fetch: { from: "recon", to: "wh", rate: 1 },
        match: { from: "recon", to: "db", rate: 1 },
      },
      metrics: { drift: 0 },
      focus: ["recon", "wh", "db"],
      exchange: {
        edge: "match",
        request: {
          format: "text",
          head: "06:00  warehouse count 2026-11-18 vs the stock table",
          body: "KET-200   shelf 46    ours on_hand 49    -3   damaged in the returns area: adjust\nTEA-310   shelf 120   ours on_hand 120    0   ok\nMUG-020   shelf 0     ours on_hand 2     -2   2 paid orders hold units that do not exist\n-- every adjustment is a row in stock_movements, never a bare UPDATE of the number\n-- reserved is not touched by the count: holds belong to orders",
        },
        marks: ["shelf", "on_hand", "do not exist", "stock_movements", "reserved"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "late-pay",
      from: "hold",
      steps: [
        {
          id: "late-race",
          kind: "problem",
          edges: { confirm: { from: "pay", to: "api", flow: "fail", rate: 1, mode: "async" } },
          metrics: { oversold: 1 },
          focus: ["pay", "api", "sweeper", "db"],
          exchange: {
            edge: "confirm",
            request: {
              format: "text",
              head: "ord_7710: hold expires_at 12:15:00.000, payment page open for 15 min too",
              body: "12:15:00.000  sweeper: hold released, available 0 -> 1\n12:15:00.400  ord_7741 reserves the kettle, available 1 -> 0\n12:15:01.000  payment.succeeded for ord_7710 (paid at 14:59 of its payment page)\n12:15:01.010  handler: UPDATE holds SET status = 'confirmed' WHERE order_id = 'ord_7710'\n-- money taken for a kettle that now belongs to ord_7741",
            },
            marks: ["expires_at", "sweeper", "ord_7741", "payment.succeeded", "confirmed"],
          },
        },
        {
          id: "late-fix",
          kind: "fix",
          edges: { confirm: { flow: "ack" } },
          metrics: { oversold: 0 },
          focus: ["api", "sweeper", "db"],
          exchange: {
            edge: "write",
            request: {
              format: "sql",
              head: "-- confirm and expire are the same guarded transition",
              body: "UPDATE holds SET status = 'confirmed'\n WHERE order_id = 'ord_7710' AND status = 'held';      -- 0 rows: lost the race\n-- sweeper: ... WHERE status = 'held' AND expires_at < now() - interval '2 minutes'\n-- payment page 10 min < hold 15 min, plus 2 min grace\n-- paid but 0 rows: reserve again atomically; sold out: refund at once and say sorry",
            },
            marks: ["status = 'held'", "lost the race", "grace", "10 min", "refund"],
          },
        },
      ],
    },
  ],
});
